import { AndOr, ConflictResolution, Expansion, OneOrMany, SqlConflict, SqlDirection, SqlOrder, SqlPaginate, SqlWhere, SqlWhereOperator } from "unconventional-pg-queries";
import { NullSqlOperators, ValidSortDirections, ValidSqlOperators, andOrPattern } from "../types/db.types";
import { RelationType } from "../types/decorator.types";
import { getRelationModel, parseExpandString, splitExpandUnit } from "./api.utils";
import { equalArrays } from "./array.utils";
import { APIError } from "../core/api-error";
import { BaseModel } from "../core/base.model";

/** Converts a stringified list of relational fields to an array of data needed to expand those fields in a SQL environment  */
export function getExpand<T extends typeof BaseModel>(model: T, expand?: string): Record<string, Expansion> {
  if (!expand) return {};

  const propSummary = model.schema.props;
  const expansions: Record<string, Expansion> = {};

  const parts = parseExpandString(expand);

  parts.forEach((field) => {
    const { parent, children } = splitExpandUnit(field);
    const relation = propSummary[parent]?.relation;
    if (!relation) throw APIError.errInvalidQueryParameter(`Invalid expansion: ${parent}`);

    const relationModel = getRelationModel(relation);
    expansions[parent] = {
      type: [RelationType.HasOne, RelationType.BelongsTo].includes(relation.type) ? OneOrMany.One : OneOrMany.Many,
      fromTable: model.collection,
      fromField: relation.from.toString(),
      toTable: relationModel.collection,
      toField: relation.to.toString(),
      throughTable: relation.through?.model.collection,
      throughFromField: relation.through?.from.toString(),
      throughToField: relation.through?.to.toString(),
      expand: children ? getExpand(relationModel, children) : undefined
    };
  });


  return expansions;
}

/** Parses a single filter condition into a SqlWhere object */
function parseSingleFilter<T extends typeof BaseModel>(model: T, filter: string, andOr?: AndOr): SqlWhere {
  const propSummary = model.schema.props;
  
  const singleQuoteIndex = filter.indexOf("'");
  
  const matchingOperators = singleQuoteIndex === -1 ?
    ValidSqlOperators.filter(op => filter.includes(` ${op}`)) :
    ValidSqlOperators.filter(op => filter.includes(` ${op}`) && filter.indexOf(` ${op}`) < singleQuoteIndex);
  
  if (!matchingOperators.length) throw APIError.errInvalidQueryParameter(`No valid operator in filter: '${filter}'`);
  
  // Handle when multiple operators are present in the filter (e.g. LIKE and NOT LIKE)
  let operator = matchingOperators.sort((a, b) => b.length - a.length)[0];

  let field = filter.substring(0, filter.indexOf(operator)).trim();
  let value: string | null = filter.substring(filter.indexOf(operator) + operator.length).trim();
  let jsonPath: string[] = [];
  let relationPath: string | undefined = undefined;

  // Handle IS NULL and IS NOT NULL, which don't have values
  if (operator.startsWith('IS')) {
    value = null;
  }

  // Handle JSON path
  if (field.includes('.')) {
    jsonPath = field.split('.');
    const target = jsonPath.shift() as string;

    // Split relational fields into relation and field. e.g. 'user.name' -> 'user' and 'name'
    // Otherwise, assume json
    const relation = propSummary[target]?.relation;
    if (relation) {
      if (jsonPath.length !== 1) throw APIError.errInvalidQueryParameter(`Invalid filter: '${field}'. Relation filters must be in the format: 'relation.field'`);

      const relationModel = getRelationModel(relation);
      if (!relationModel.schema.props[jsonPath[0]]) throw APIError.errInvalidQueryParameter(`Invalid filter: '${field}'.`);

      relationPath = target;
      field = jsonPath.shift() as string;
    } else {
      field = target;
    }
  }

  if (!relationPath && !propSummary[field]) throw APIError.errInvalidQueryParameter(`Invalid filter: '${field}'`);
  if (!value && !NullSqlOperators.includes(operator)) throw APIError.errInvalidQueryParameter(`Invalid value in filter: '${value}'`);

  return { field, jsonPath, relationPath, operator: operator as SqlWhereOperator, value, andOr };
}

/** Extracts content within parentheses and returns it along with the position after the closing paren */
function extractParenthesesContent(str: string, startIndex: number): { content: string, endIndex: number } {
  let depth = 1;
  let i = startIndex + 1;
  
  while (i < str.length && depth > 0) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') depth--;
    i++;
  }
  
  if (depth !== 0) throw APIError.errInvalidQueryParameter(`Unmatched parentheses in filter`);
  
  return {
    content: str.substring(startIndex + 1, i - 1),
    endIndex: i
  };
}

/** Checks if a parenthesis is part of an operator value (e.g., IN (...)) or a compound clause */
function isOperatorValueParen(str: string, parenIndex: number): boolean {
  // Look backwards to see if there's an operator that uses parentheses for values
  const beforeParen = str.substring(0, parenIndex).trimEnd();
  
  // Check for operators that use parentheses: IN, NOT IN
  return beforeParen.endsWith(' IN') || beforeParen.endsWith(' NOT IN');
}

/** Converts a string of filters to an array of 'where' clause outlines for a SQL environment */
export function getWhere<T extends typeof BaseModel>(model: T, filterString?: string): SqlWhere[] {
  if (!filterString) return [];

  const wheres: SqlWhere[] = [];
  let i = 0;
  let currentFilter = '';
  let currentAndOr: AndOr | undefined = undefined;

  while (i < filterString.length) {
    const char = filterString[i];
    
    // Check for closing parenthesis without matching opening (error case)
    if (char === ')' && !currentFilter.includes('(')) {
      throw APIError.errInvalidQueryParameter('Unmatched closing parenthesis in filter');
    }
    
    // Check for opening parenthesis (but distinguish compound clauses from operator values)
    if (char === '(' && !isOperatorValueParen(filterString, i)) {
      const { content, endIndex } = extractParenthesesContent(filterString, i);
      
      // Recursively parse the compound clause
      const nestedClauses = getWhere(model, content);
      
      if (nestedClauses.length > 0) {
        // Create a wrapper clause using the first nested clause's properties
        // and add the rest as sub-clauses
        const [firstClause, ...restClauses] = nestedClauses;
        const compoundClause: SqlWhere = {
          ...firstClause,
          andOr: currentAndOr,
          clauses: restClauses.length > 0 ? restClauses : undefined
        };
        wheres.push(compoundClause);
      }
      
      i = endIndex;
      currentFilter = '';
      currentAndOr = undefined;
      continue;
    }
    
    // Check for AND/OR keywords
    if (i === 0 || filterString[i - 1] === ' ' || filterString[i - 1] === ')') {
      if (filterString.substring(i, i + 4) === 'AND ') {
        if (currentFilter.trim()) {
          wheres.push(parseSingleFilter(model, currentFilter.trim(), currentAndOr));
          currentFilter = '';
        }
        currentAndOr = AndOr.And;
        i += 4;
        continue;
      } else if (filterString.substring(i, i + 3) === 'OR ') {
        if (currentFilter.trim()) {
          wheres.push(parseSingleFilter(model, currentFilter.trim(), currentAndOr));
          currentFilter = '';
        }
        currentAndOr = AndOr.Or;
        i += 3;
        continue;
      }
    }
    
    currentFilter += char;
    i++;
  }
  
  // Process any remaining filter
  if (currentFilter.trim()) {
    wheres.push(parseSingleFilter(model, currentFilter.trim(), currentAndOr));
  }

  return wheres;
}

/** Converts a stringified list of fields to order ascending or descending to an array of order data for a SQL environment */
export function getOrder<T extends typeof BaseModel>(model: T, sort?: string): SqlOrder[] {
  if (!sort) return [{ field: model.idField, direction: SqlDirection.Asc }];

  const propSummary = model.schema.props;
  const orders: SqlOrder[] = [];

  sort.split(',').forEach((item) => {
    let [field, direction] = item.split(' ');
    let jsonPath: string[] = [];
    direction ||= SqlDirection.Asc;

    // Handle JSON path
    if (field.includes('.')) {
      jsonPath = field.split('.');
      field = jsonPath.shift() as string;
    }

    if (!propSummary[field]) throw APIError.errInvalidQueryParameter(`Invalid orderBy field: '${field}'`);
    if (!ValidSortDirections.includes(direction.toUpperCase())) throw APIError.errInvalidQueryParameter(`Invalid orderBy direction: '${direction}'`);

    orders.push({ field, jsonPath, direction: direction.toUpperCase() as SqlDirection });
  });

  return orders;
}

export function getPage<T extends typeof BaseModel>(model: T, cursor?: string | number): SqlPaginate | undefined {
  if (!cursor) return undefined;

  const pagination = { field: model.idField, cursor };
  return pagination;
}

/** Retrieves all non-relational fields from a model for the 'returning' clause of a SQL call */
export function getReturn<T extends typeof BaseModel>(model: T): string[] {
  const propSummary = model.schema.props;
  const fields: string[] = [];

  Object.entries(propSummary).forEach(([field, summary]) => {
    if (!summary.relation) fields.push(field);
  });

  return fields;
}

export function getConflict<T extends typeof BaseModel>(model: T, action: ConflictResolution, constraint?: Array<keyof InstanceType<T>>): SqlConflict | undefined {
  if (!constraint) return undefined;
  const indexes = model.schema.indexes;

  for (const index of indexes) {
    const keys = Object.keys(index.definition);
    if (equalArrays(keys, constraint as string[])) return { action, constraint: keys };
  }

  return undefined;
}

/** A type-safe way to build filter strings */
export function buildFilter<T>(field: keyof T, operator: SqlWhereOperator, value?: any) {
  let formatted = `${value}`;

  if (typeof value === 'string')
    formatted = `'${value}'`;
  else if (Array.isArray(value))
    formatted = (typeof value[0] === 'string') ? `('${value.join("','")}')` : `(${value.join()})`;
  else if (value == null || NullSqlOperators.includes(operator))
    formatted = '';

  return `${field as string} ${operator} ${formatted}`;
}

/** Creates expansions for relational filters */
export function expandRelationalFilters<T extends typeof BaseModel>(model: T, wheres: SqlWhere[], expand: Record<string, Expansion>): Record<string, Expansion> {
  const missingExpansions = wheres.flatMap(where => (where.relationPath && !expand[where.relationPath]) ? [where.relationPath] : []);

  const addedExpansions = getExpand(model, missingExpansions.join(','));
  return { ...expand, ...addedExpansions };
}