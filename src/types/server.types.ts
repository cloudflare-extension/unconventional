import { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";

export interface ServerConfig {
  name: string;
  basePath?: string;
  standardMiddleware?: MiddlewareHandler[];
}

export const defaultCors = cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
});