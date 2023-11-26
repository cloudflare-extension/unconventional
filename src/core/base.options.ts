import { Env } from "../types/api.types";
import BaseModelClass from "./base.modelclass";

export interface PageConfig {
  limit?: number;
  cursor?: string;
  sort?: string;
}

export interface FilterConfig {
  filter?: string;
  expand?: string;
}

interface DownloadResponse {
  filename: string;
  buffer: ArrayBufferLike;
}

export interface ServiceConfig<M extends typeof BaseModelClass> {
  cache?: KVNamespace;
  cacheTTL?: number;
  upsertContraint?: Array<keyof InstanceType<M>>;
}

/** The configuration for a BaseController */
export interface ControllerOptions {
  cache?: boolean;
  cacheTTL?: number;
}

/** Shorthand for Partial<InstanceType<T>> */
export type PI<T extends abstract new (...args: any[]) => any> = Partial<InstanceType<T>>;

/** Shorthand for Partial<InstanceType<T>> */
export type I<T extends abstract new (...args: any[]) => any> = InstanceType<T>;

/** The configuration for a BaseController method */
export interface ControllerMethodOptions<M extends typeof BaseModelClass, V extends Env, U extends PI<M> | PI<M>[] = PI<M>, W extends I<M> | I<M>[] = I<M>> {
  before?: BodyProcessor<M, V, U>;
  after?: ResponseProcessor<M, V, U, W>;
  cache?: boolean;
  cacheTTL?: number;
  limitOverride?: boolean;
  upsertContraint?: Array<keyof InstanceType<M>>;
};

export interface DownloadMethodOptions<M extends typeof BaseModelClass, V extends Env, U extends PI<M> | PI<M>[] = any, W extends I<M> | I<M>[] = any> {
  download?: DownloadProcessor<M, V, U, W>;
};

/** 
 * The salient context of a hono request.
 * Information is limited so downstream controllers cannot prematurely
 * break the req or res by operating on their streams.
 */
export interface RequestContext<M extends typeof BaseModelClass, V extends Env, U extends PI<M> | PI<M>[] = PI<M>> {
  headers: Headers;
  waitUntil: (promise: Promise<unknown>) => void;
  body: U;
  params: Record<string, string>;
  queries: Record<string, string | string[]>;
  env: V['Bindings'];
  get: <Key extends keyof V['Variables']>(key: Key) => V['Variables'][Key];
}

/** A method that operates on an express request */
export type BodyProcessor<M extends typeof BaseModelClass, V extends Env, U extends PI<M> | PI<M>[] = PI<M>> = (requestContext: RequestContext<M, V, U>) => Promise<void>;

/** A method that operates on an express request and a response Model */
export type ResponseProcessor<M extends typeof BaseModelClass, V extends Env = Env, U extends PI<M> | PI<M>[] = PI<M>, W extends I<M> | I<M>[] = I<M>> = (requestContext: RequestContext<M, V, U>, response: W) => Promise<void>;

/** A method that operates on an express request and a response Model */
export type DownloadProcessor<M extends typeof BaseModelClass, V extends Env = Env, U extends PI<M> | PI<M>[] = any, W = any> = (requestContext: RequestContext<M, V, U>, response: W) => Promise<DownloadResponse>;