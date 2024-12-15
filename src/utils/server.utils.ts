import { cors } from "hono/cors";
import { BaseModel } from "../core/base.model";
import { APIError } from "../core";
import { DBFactory } from "../types";
import { Context } from "hono";
import { HTTPResponseError } from "hono/types";

/** Default CORS middleware permitting all origins and methods */
export const defaultCors = cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
});

/** Binds the database proxy to the BaseModel */
export const bindDatabase = (getDB: DBFactory) => {
  return async (ctx, next) => {
    if (!BaseModel.db)
      BaseModel.db = getDB(ctx);
  
    await next();
  };
};

/** Catches and formats errors in a standard way */
export const defaultErrorHandler = (err: Error | HTTPResponseError, ctx: Context) => {
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