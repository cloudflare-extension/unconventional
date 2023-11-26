import { Input, MiddlewareHandler } from "hono";
import { BaseHandler, Env } from "../types/api.types";

/** 
 * Combines any number of RequestHandlers into one function that performs
 * the logical OR of their results.
 */
export function Or<E extends Env = Env, P extends string = any, I extends Input = Input, O = {}, T extends BaseHandler<E, P, I, O> | MiddlewareHandler<E, P, I> = MiddlewareHandler<E, P, I>>(...methods: Array<T>): MiddlewareHandler<E, P, I> {

  return async (ctx, next) => {
    const halt = async () => { };

    const promises = methods.map(x => x(ctx, halt));
    const values = await Promise.allSettled(promises);

    if (!values.some(x => x.status === "fulfilled"))
      throw (<PromiseRejectedResult>values[0]).reason;

    await next();
  };
}