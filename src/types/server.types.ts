import { MiddlewareHandler } from "hono";
import { DBFactory, DBBinding } from "./db.types";

export interface ServerConfig {
  name: string;
  basePath?: string;
  standardMiddleware?: MiddlewareHandler[];
  getDB: DBFactory;
}