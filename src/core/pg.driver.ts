import { Context } from "hono";
import { DBCall, DBFactory } from "../types";

async function PGFn<T>(endpoint: string, binding: Fetcher, query: object) {
  const response = await binding.fetch(new Request(`http://worker/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  }));

  if (!response.ok) return null;

  const body = await response.json<T>();
  return body;
}

/** Produces an object with PostgreSQL proxy methods */
export const PGFactory: DBFactory = (ctx: Context) => {
  return {
    fetch: async <T extends object>(query: DBCall) => {
      return await PGFn<T>('query', ctx.env.DB_PROXY, query);
    },
    raw: async <T extends object>(query: string) => {
      return await PGFn<T>('text', ctx.env.DB_PROXY, { text: query });
    }
  };
};