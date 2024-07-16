
import { Handler, Input, Env as HonoEnv } from "hono";

export enum Query {
  Expand = 'expand'
}

export enum CachePrefix {
  Record = 'rec_',
  Page = 'page_',
}

export const DefaultCacheTTL = 900;     // 15 minutes
export const MaxCacheTTL = 2147483647;  // 68 years

export type Bindings = {
  CACHE: KVNamespace;
  STORAGE: KVNamespace;
  DB_PROXY: Fetcher;
}

export enum BaseEnvKey {
  ownerId = 'ownerId',
  isPrivileged = 'isPrivileged'
};

export type Variables = {
  [BaseEnvKey.ownerId]?: number;
  [BaseEnvKey.isPrivileged]?: boolean;
}

export type Env<V extends object = {}, B extends object = {}> = HonoEnv & {
  Bindings: Bindings & B;
  Variables: Variables & V;
}

export interface BaseHandler<E extends Env = Env, P extends string = any, I extends Input = Input> extends Handler<E, P, I> { }