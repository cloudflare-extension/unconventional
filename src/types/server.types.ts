import { MiddlewareHandler } from "hono";
import { DBFactory } from "./db.types";
import { cors } from "hono/cors";

export interface ServerConfig {
  /** Name of the server. */
  name: string;
  /** Base path for all routes. */
  basePath?: string;
  /** Middleware to apply to all routes. */
  middleware?: MiddlewareHandler[];
  /** 
   * Options for CORS middleware.
   * If not provided, all origins and methods are permitted by default.
   */
  cors?: Parameters<typeof cors>[0];
  /** 
   * Factory producing a database driver.
   * Required to communicate with a database via BaseModel's methods.
   */
  getDB: DBFactory;
}