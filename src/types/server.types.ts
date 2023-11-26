import { MiddlewareHandler } from "hono";

export interface ServerConfig {
  name: string;
  basePath?: string;
  standardMiddleware?: MiddlewareHandler[];
}