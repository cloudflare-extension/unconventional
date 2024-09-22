import { Context } from "hono";
import { OneOrMany, QueryDefinition, SqlDirection, SqlWhereOperator } from "unconventional-pg-queries";

export const ValidSqlOperators = Object.values<string>(SqlWhereOperator);
export const NullSqlOperators: string[] = [SqlWhereOperator.IsNull, SqlWhereOperator.IsNotNull];
export const ValidSortDirections = Object.values<string>(SqlDirection);

export const andOrPattern = /\s(?=AND|OR)/;

export enum SqlAction {
  Select = 'SELECT',
  Insert = 'INSERT',
  Update = 'UPDATE',
  Delete = 'DELETE',
  Truncate = 'TRUNCATE'
}

export interface DBCall extends QueryDefinition {
  action: SqlAction;
  type: OneOrMany;
}

export type DBProxy<I extends string | DBCall> = <R extends object>(query: I) => Promise<R | null>;

export interface DB {
  fetch: DBProxy<DBCall>;
  raw: DBProxy<string>;
}

export type DBBinding = Fetcher | D1Database | KVNamespace;
export type DBFactory = (ctx: Context) => DB;