import { cors } from "hono/cors";
import BaseModelClass from "../core/base.modelclass";
import { APIError } from "../core";
import { DBFactory } from "../types";

/** Default CORS middleware permitting all origins and methods */
export const defaultCors = cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
});

/** Binds the database proxy to the BaseModel */
export const bindDatabase = (getDB: DBFactory) => {
  return async (ctx, next) => {
    if (!BaseModelClass.db)
      BaseModelClass.db = getDB(ctx);
  
    await next();
  };
};

/** Catches and formats errors in a standard way */
export const defaultErrorHandler = (err, ctx) => {
  if (err instanceof APIError) {
    ctx.status(err.statusCode || 500);

    return ctx.json({
      error_code: err.name,
      error: err.message,
      data: err.data
    });
  }

  console.error(err);
  ctx.status(500);
  return ctx.json({ error: err.message });
};