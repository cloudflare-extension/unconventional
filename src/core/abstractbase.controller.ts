import { Context } from "hono";
import { BaseEnvKey, BaseHandler, Env, Query } from "../types/api.types";
import BaseModelClass from "./base.modelclass";
import { ControllerMethodOptions, ControllerOptions, DownloadMethodOptions, I, PI, RequestContext } from "./base.options";
import BaseService from "./base.service";

export default abstract class AbstractBaseController<M extends typeof BaseModelClass, E extends Env = Env> {
  protected _model: M;
  protected _service: BaseService<M>;
  protected _pageLimitDefault: number = 12;
  protected _pageLimitMax: number = 100;
  protected _options: ControllerOptions = {};


  /** A controller providing CRUD endpoints for any BaseModel */
  constructor(model: M, options?: ControllerOptions) {
    this._model = model;
    this._service = new BaseService<M>(model);
    this._options = options || {};
  }

  public create(options?: ControllerMethodOptions<M, E>): BaseHandler<E> { return this._create.bind(this, options); }
  public createMany(options?: ControllerMethodOptions<M, E, PI<M>[], I<M>[]>): BaseHandler<E> { return this._createMany.bind(this, options); }
  public get(options?: ControllerMethodOptions<M, E> & DownloadMethodOptions<M, E>): BaseHandler<E> { return this._get.bind(this, options); }
  public getAll(options?: ControllerMethodOptions<M, E, any, I<M>[]>): BaseHandler<E> { return this._getAll.bind(this, options); }
  public update(options?: ControllerMethodOptions<M, E>): BaseHandler<E> { return this._update.bind(this, options); }
  public updateMany(options?: ControllerMethodOptions<M, E, PI<M>[], I<M>[]>): BaseHandler<E> { return this._updateMany.bind(this, options); }
  public delete(options?: ControllerMethodOptions<M, E>): BaseHandler<E> { return this._delete.bind(this, options); }
  public deleteMany(options?: ControllerMethodOptions<M, E, PI<M>[], I<M>[]>): BaseHandler<E> { return this._deleteMany.bind(this, options); }


  /**
   * Creates and returns a new instance of the model M from the provided data. Request body should be a Partial<InstanceType<M>>.
   * @param req.body - A partial model instance containing all the fields to be modified and their new values.
   */
  private async _create(options: ControllerMethodOptions<M, E> | undefined, ctx: Context<E>): Promise<Response> {
    // Context
    const reqContext = await this.getRequestContext(ctx);

    // Pre-processing
    await this.preventIDOR(reqContext);
    if (options?.before) await options.before(reqContext);

    const isPrivileged = ctx.get(BaseEnvKey.isPrivileged);

    // Avoid overriding owner field if it's privileged user
    if (this._model.ownerField && !(reqContext.body[this._model.ownerField] && isPrivileged)) {
      // Add owner
      const ownerId = ctx.get(BaseEnvKey.ownerId);
      if (ownerId && this._model.ownerField) reqContext.body[this._model.ownerField] = ownerId;
    }

    // Configure service
    const config = {
      cache: this.getCache(ctx, this._options.cache, options?.cache),
      cacheTTL: this._options.cacheTTL ?? options?.cacheTTL,
      upsertContraint: options?.upsertContraint
    };

    // Request
    let response = await this._service.create(reqContext.body, config);

    // Post-processing
    if (options?.after) await options.after(reqContext, response);

    // Response
    return ctx.json(response);
  }

  /**
   * Creates and returns an array of new instances of the model M from the provided data. Request body should be a Partial<InstanceType<M>>[].
   * @param req.body - An array of partial model instances containing all the fields to be modified and their new values.
   */
  private async _createMany(options: ControllerMethodOptions<M, E, PI<M>[], I<M>[]> | undefined, ctx: Context<E>): Promise<Response> {
    // Context
    const reqContext = await this.getRequestContext<PI<M>[]>(ctx);

    // Pre-processing
    await this.preventIDOR(reqContext);
    if (options?.before) await options.before(reqContext);

    const isPrivileged = ctx.get(BaseEnvKey.isPrivileged);

    // Avoid overriding owner field if it's privileged user
    reqContext.body.forEach(x => {
      if (this._model.ownerField && !(x[this._model.ownerField] && isPrivileged)) {
        // Add owner
        const ownerId = ctx.get(BaseEnvKey.ownerId);
        if (ownerId && this._model.ownerField) x[this._model.ownerField] = ownerId;
      }
    });

    // Configure service
    const config = {
      cache: this.getCache(ctx, this._options.cache, options?.cache),
      cacheTTL: this._options.cacheTTL ?? options?.cacheTTL,
      upsertContraint: options?.upsertContraint
    };

    // Request
    let response = await this._service.createMany(reqContext.body, config);

    // Post-processing
    if (options?.after) await options.after(reqContext, response);

    // Response
    return ctx.json(response);
  }

  /** Gets one instance of the model M.
   * @param req.params.id - The id or key of a model. If type is a valid ObjectId, lookup will be done with the model's idColumn. Otherwise, keyColumn is used.
   */
  private async _get(options: ControllerMethodOptions<M, E> & DownloadMethodOptions<M, E> | undefined, ctx: Context<E>): Promise<Response> {
    // Context
    const reqContext = await this.getRequestContext(ctx, false);

    // Pre-processing
    if (options?.before) await options.before(reqContext);
    const identifier = reqContext.params.id;

    // Configure service
    const config = {
      expand: reqContext.queries[Query.Expand] as string || undefined,
      cache: this.getCache(ctx, this._options.cache, options?.cache),
      cacheTTL: this._options.cacheTTL ?? options?.cacheTTL
    };

    // Request
    let response = await this._service.get(identifier, config);

    // Post-processing
    if (options?.after) await options.after(reqContext, response);

    await this.maskPrivateFields(reqContext, response);

    // Download hook
    if (options?.download) {
      const downloadRes = await options.download(reqContext, response);
      const headers = {
        'Content-Type': 'application/octet-stream',
        'content-disposition': `attachment; filename=${downloadRes.filename}`
      };

      return ctx.body(downloadRes.buffer, 200, headers);
    }
    else
      // Response
      return ctx.json(response);
  }

  /**
   * Gets all instances (paginated) of the model. Supported query params: limit, cursor, sort.
   * Default limit is 12. Max limit is 100.
   */
  private async _getAll(options: ControllerMethodOptions<M, E, any, I<M>[]> | undefined, ctx: Context<E>): Promise<Response> {
    // Context
    const reqContext = await this.getRequestContext(ctx, false);

    // Pre-processing
    if (options?.before) await options.before(reqContext);

    // Configuration
    const queryParams = reqContext.queries;
    let limit = parseInt(<string>queryParams.limit) || this._pageLimitDefault;
    if (limit > this._pageLimitMax && !options?.limitOverride)
      limit = this._pageLimitMax;

    // Request
    let response = await this._service.getAll({
      limit: limit,
      cursor: <string>queryParams.cursor,
      sort: <string>queryParams.orderBy,
      filter: queryParams.filter as string,
      expand: reqContext.queries[Query.Expand] as string || undefined,
      cache: this.getCache(ctx, this._options.cache, options?.cache),
      cacheTTL: this._options.cacheTTL ?? options?.cacheTTL
    });

    // Post-processing
    if (options?.after) await options.after(reqContext, response);

    await this.maskPrivateFields(reqContext, response);

    // Response
    return ctx.json(response);
  }

  /**
   * Patches all fields in an indicated instance of model M. Certain fields may be restricted.
   * @param req.params.id - The id or key of a model. If type is a valid ObjectId, lookup will be done with the model's idColumn. Otherwise, keyColumn is used.
   * @param req.body - A Partial<InstanceType<M>> containing all the fields to be modified and their new values.
   */
  private async _update(options: ControllerMethodOptions<M, E> | undefined, ctx: Context<E>): Promise<Response> {
    // Context
    const reqContext = await this.getRequestContext(ctx);

    // Pre-processing
    await this.preventIDOR(reqContext);
    this.removeSystemFields(reqContext);
    if (options?.before) await options.before(reqContext);

    const identifier = reqContext.params.id;

    // Configure service
    const config = {
      cache: this.getCache(ctx, this._options.cache, options?.cache),
      cacheTTL: this._options.cacheTTL ?? options?.cacheTTL
    };

    // Request
    let response = await this._service.update(identifier, reqContext.body, config);

    // Post-processing
    if (options?.after) await options.after(reqContext, response);

    // Response
    return ctx.json(response);
  }

  /**
   * Patches all fields in the array of instances of model M. Certain fields may be restricted.
   * @param req.body - An array of Partial<InstanceType<M>> containing all the fields to be modified and their new values.
   */
  private async _updateMany(options: ControllerMethodOptions<M, E, PI<M>[], I<M>[]> | undefined, ctx: Context<E>): Promise<Response> {
    // Context
    const reqContext = await this.getRequestContext<PI<M>[]>(ctx);

    // Pre-processing
    await this.preventIDOR(reqContext);
    this.removeSystemFields(reqContext);
    if (options?.before) await options.before(reqContext);

    // Configure service
    const config = {
      cache: this.getCache(ctx, this._options.cache, options?.cache),
      cacheTTL: this._options.cacheTTL ?? options?.cacheTTL
    };

    // Request
    let response = await this._service.updateMany(reqContext.body, config);

    // Post-processing
    if (options?.after) await options.after(reqContext, response);

    // Response
    return ctx.json(response);
  }

  /**
   * Deletes the model with the given identifier.
   * @param req.params.id - The id or key of a model. If type is a valid ObjectId, lookup will be done with the model's idColumn. Otherwise, keyColumn is used.
   */
  private async _delete(options: ControllerMethodOptions<M, E> | undefined, ctx: Context<E>): Promise<Response> {
    // Context
    const reqContext = await this.getRequestContext(ctx);

    // Pre-processing
    if (options?.before) await options.before(reqContext);

    const identifier = reqContext.params.id;

    // Configure service
    const config = {
      cache: this.getCache(ctx, this._options.cache, options?.cache),
      cacheTTL: this._options.cacheTTL ?? options?.cacheTTL
    };

    // Request
    let response = await this._service.delete(identifier, config);

    // Post-processing
    if (options?.after) await options.after(reqContext, response);

    // Response
    return ctx.json({ success: !!response });
  }

  /** Deletes models matching the provided filter. */
  private async _deleteMany(options: ControllerMethodOptions<M, E, PI<M>[], I<M>[]> | undefined, ctx: Context<E>): Promise<Response> {
    // Context
    const reqContext = await this.getRequestContext<PI<M>[]>(ctx);

    // Pre-processing
    if (options?.before) await options.before(reqContext);

    // Configure service
    const config = {
      filter: reqContext.queries.filter as string,
      cache: this.getCache(ctx, this._options.cache, options?.cache),
      cacheTTL: this._options.cacheTTL ?? options?.cacheTTL
    };

    // Request
    let response = await this._service.deleteMany(config);

    // Post-processing
    if (options?.after) await options.after(reqContext, response);

    // Response
    return ctx.json({ success: !!response });
  }


  //#region Helpers
  protected async getRequestContext<T extends PI<M> | PI<M>[] = PI<M>>(ctx: Context<E>, hasBody: boolean = true): Promise<RequestContext<M, E, T>> {
    let body = {} as T;

    if (hasBody) {
      try { body = await ctx.req.json<T>(); }
      catch (e) { }
    }

    return {
      headers: ctx.req.raw.headers,
      waitUntil: ctx.executionCtx.waitUntil,
      body: body,
      params: ctx.req.param(),
      queries: ctx.req.query(),
      env: ctx.env,
      get: <Key extends keyof E["Variables"]>(key: Key) => { return ctx.get(key); }
    };
  }

  /** Gets the cache namespace for the given request. Route-level cache flags take precedence over controller-level. */
  protected getCache(ctx: Context, controllerLevel: boolean | undefined, routeLevel: boolean | undefined): KVNamespace | undefined {
    const useCache = routeLevel ?? controllerLevel;
    return useCache ? ctx.env.CACHE : undefined;
  }

  /** Removes the model's private fields from the given response object */
  protected abstract maskPrivateFields(req: RequestContext<M, E>, response: InstanceType<M> | InstanceType<M>[]): Promise<void>

  /** Removes the model's uneditable fields from the given request body */
  protected abstract removeSystemFields<T extends PI<M> | PI<M>[] = PI<M>>(req: RequestContext<M, E, T>): void

  /** Prevents insecure direct object references (IDOR) */
  protected abstract preventIDOR<T extends PI<M> | PI<M>[] = PI<M>>(req: RequestContext<M, E, T>): Promise<void>
  //#endregion
}