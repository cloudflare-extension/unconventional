import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import type { Env } from "./types/api.types";
import type { ServerConfig } from "./types/server.types";
import { bindDatabase, defaultCors, defaultErrorHandler } from "./utils";

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
    this._app.use(bindDatabase(config.getDB));

    // CORS
    this._app.use(defaultCors);

    // Error handling
    this._app.onError(defaultErrorHandler);

    // Standard middleware
    if (config.standardMiddleware) this._app.use(...config.standardMiddleware);

    this.configured = true;
    return this;
  }

  public start() {
    return handle(this._app);
  }
}