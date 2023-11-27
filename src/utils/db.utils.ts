import { AndOr, ConflictResolution, Expansion, OneOrMany, SqlConflict, SqlDirection, SqlOrder, SqlPaginate, SqlWhere, SqlWhereOperator } from "unconventional-pg-queries";
import { NullSqlOperators, ValidSortDirections, ValidSqlOperators, andOrPattern } from "../types/db.types";
import { RelationType } from "../types/decorator.types";
import { parseExpandString, splitExpandUnit } from "./api.utils";
import { equalArrays } from "./array.utils";
import { APIError } from "../core/api-error";
import BaseModelClass from "../core/base.modelclass";

/** Converts a stringified list of relational fields to an array of data needed to expand those fields in a SQL environment  */
export function getExpand<T extends typeof BaseModelClass>(model: T, expand?: string): Record<string, Expansion> {
  if (!expand) return {};

  const propSummary = model.schema.props;
  const expansions: Record<string, Expansion> = {};

  const parts = parseExpandString(expand);

  parts.forEach((field) => {
    const { parent, children } = splitExpandUnit(field);
    const relation = propSummary[parent]?.relation;
    if (!relation) throw APIError.errInvalidQueryParameter(`Invalid expansion: ${parent}`);

    expansions[parent] = {
      type: [RelationType.HasOne, RelationType.BelongsTo].includes(relation.type) ? OneOrMany.One : OneOrMany.Many,
      fromTable: model.collection,
      fromField: relation.from.toString(),
      toTable: relation.model.collection,
      toField: relation.to.toString(),
      throughTable: relation.through?.model.collection,
      throughFromField: relation.through?.from.toString(),
      throughToField: relation.through?.to.toString(),
      expand: children ? getExpand(relation.model, children) : undefined
    };
  });


  return expansions;
}

/** Converts a string of filters to an array of 'where' clause outlines for a SQL environment */
export function getWhere<T extends typeof BaseModelClass>(model: T, filterString?: string): SqlWhere[] {
  if (!filterString) return [];

  const propSummary = model.schema.props;
  const wheres: SqlWhere[] = [];

  if (filterString) {
    filterString.split(andOrPattern).forEach((filter) => {
      // Handle logically combined clauses
      let andOr: AndOr | undefined = undefined;
      if (filter.startsWith(AndOr.And)) {
        filter = filter.substring(AndOr.And.length + 1);
        andOr = AndOr.And;
      } else if (filter.startsWith(AndOr.Or)) {
        filter = filter.substring(AndOr.Or.length + 1);
        andOr = AndOr.Or;
      }

      let field = filter.substring(0, filter.indexOf(' '));
      let value: string | null = filter.substring(filter.lastIndexOf(' ') + 1);
      let operator = filter.substring(filter.indexOf(' ') + 1, filter.lastIndexOf(' '));
      let jsonPath: string[] = [];

      // Handle IS NULL and IS NOT NULL, which don't have values
      if (operator.startsWith('IS')) {
        operator = `${operator} ${value}`;
        value = null;
      }

      // Handle JSON path
      if (field.includes('.')) {
        jsonPath = field.split('.');
        field = jsonPath.shift() as string;
      }

      if (!propSummary[field]) throw APIError.errInvalidQueryParameter(`Invalid filter: '${field}'`);
      if (!ValidSqlOperators.includes(operator)) throw APIError.errInvalidQueryParameter(`Invalid operator in filter: '${operator}'`);
      if (!value && !NullSqlOperators.includes(operator)) throw APIError.errInvalidQueryParameter(`Invalid value in filter: '${value}'`);

      wheres.push({ field, jsonPath, operator: operator as SqlWhereOperator, value, andOr });
    });
  }

  return wheres;
}

/** Converts a stringified list of fields to order ascending or descending to an array of order data for a SQL environment */
export function getOrder<T extends typeof BaseModelClass>(model: T, sort?: string): SqlOrder[] {
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

export function getPage<T extends typeof BaseModelClass>(model: T, cursor?: string | number): SqlPaginate | undefined {
  if (!cursor) return undefined;

  const pagination = { field: model.idField, cursor };
  return pagination;
}

/** Retrieves all non-relational fields from a model for the 'returning' clause of a SQL call */
export function getReturn<T extends typeof BaseModelClass>(model: T): string[] {
  const propSummary = model.schema.props;
  const fields: string[] = [];

  Object.entries(propSummary).forEach(([field, summary]) => {
    if (!summary.relation) fields.push(field);
  });

  return fields;
}

export function getConflict<T extends typeof BaseModelClass>(model: T, action: ConflictResolution, constraint?: Array<keyof InstanceType<T>>): SqlConflict | undefined {
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