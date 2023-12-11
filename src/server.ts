import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import type { Env } from "./types/api.types";
import type { ServerConfig } from "./types/server.types";
import { bindDatabase, defaultCors, defaultErrorHandler } from "./utils";
import { cors } from "hono/cors";

/**
 * A wrapper around Hono that provides some default configuration
 * and a simple interface for starting the server.
 * 
 * @example
 * const server = new BackendServer({
 *  name: "My Server",
 *  basePath: "/api",
 *  getDB: ctx => new DBProxy(ctx)
 * });
 */
export class BackendServer {
  private _app: Hono<Env, any, any>;
  public configured: boolean = false;

  constructor(config?: ServerConfig) {
    this._app = new Hono();

    if (config)
      this.configure(config);
  }

  public get app() {
    return this._app;
  }

  public configure(config: ServerConfig) {
    if (this.configured) throw new Error("Cannot reconfigure server");

    // Base path
    if (config.basePath) this._app = this._app.basePath(config.basePath);

    // Database binding
    this._app.use('*', bindDatabase(config.getDB));

    // CORS
    this._app.use('*', config.cors ? cors(config.cors) : defaultCors);

    // Error handling
    this._app.onError(defaultErrorHandler);

    // Standard middleware
    if (config.middleware) this._app.use('*', ...config.middleware);

    this.configured = true;
    return this;
  }

  public start() {
    return handle(this._app);
  }
}