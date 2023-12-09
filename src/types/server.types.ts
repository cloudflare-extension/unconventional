import { MiddlewareHandler } from "hono";
import { DBFactory, DBBinding } from "./db.types";
import { cors } from "hono/cors";

export interface ServerConfig {
  name: string;
  basePath?: string;
  middleware?: MiddlewareHandler[];
  cors?: Parameters<typeof cors>[0];
  getDB: DBFactory;
}