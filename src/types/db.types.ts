import { OneOrMany, QueryDefinition, SqlDirection, SqlWhereOperator } from "unconventional-pg-queries";

export const ValidSqlOperators = Object.values<string>(SqlWhereOperator);
export const NullSqlOperators: string[] = [SqlWhereOperator.IsNull, SqlWhereOperator.IsNotNull];
export const ValidSortDirections = Object.values<string>(SqlDirection);

export const andOrPattern = /\s(?=AND|OR)/;

export enum SqlAction {
  Select = 'SELECT',
  Insert = 'INSERT',
  Update = 'UPDATE',
  Delete = 'DELETE'
}

export interface DBCall extends QueryDefinition {
  action: SqlAction;
  type: OneOrMany;
}