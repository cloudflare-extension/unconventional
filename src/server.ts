import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { APIError } from "./core/api-error";
import BaseModelClass from "./core/base.modelclass";
import { Env } from "./types/api.types";
import { ServerConfig, defaultCors } from "./types/server.types";

export class BackendServer {
  private _app: Hono<Env, any, any>;
  private _config: ServerConfig = {
    name: "default"
  };
  public configured: boolean = false;

  constructor(config?: ServerConfig) {
    this._app = new Hono();

    if (config)
      this.configure(config);

    this._app.use(defaultCors);
  }

  public get app() {
    return this._app;
  }

  public configure(config: ServerConfig) {
    this._config = config;

    // Base path
    if (config.basePath) this._app = this._app.basePath(config.basePath);

    // Database binding
    this._app.use(async (ctx, next) => {
      if (!BaseModelClass.db)
        BaseModelClass.db = ctx.env.DB_PROXY;

      await next();
    });

    // Error handling
    this._app.onError((err, ctx) => {
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
    });

    this.configured = true;
    return this;
  }

  public start() {
    return handle(this._app);
  }
}