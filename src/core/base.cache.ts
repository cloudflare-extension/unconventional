import { CachePrefix, DefaultCacheTTL } from "../types/api.types";
import { isEmpty } from "../utils/array.utils";
import { CloudflareKV, CloudflareKVAPI } from "../utils/cloudflare.utils";
import { sha256 } from "../utils/crypto.utils";
import { BaseModel } from "./base.model";

export class BaseCache {
  private static kvKeySizeLimit = 512;
  private static kvApi: CloudflareKV;

  public static async setKVApi(config: CloudflareKVAPI) {
    this.kvApi = new CloudflareKV(config);
  }

  public static async get<T>(cache: KVNamespace, key: string): Promise<T | null> {
    if (key.length > this.kvKeySizeLimit) return null;
    const response = await cache.get(key);

    if (!response) return null;

    return JSON.parse(response) as T;
  }

  public static async set<T>(cache: KVNamespace, key: string, value: T, ttl: number = DefaultCacheTTL): Promise<void> {
    key.length <= this.kvKeySizeLimit && await cache.put(key, JSON.stringify(value), { expirationTtl: ttl });
  }

  public static async delete(cache: KVNamespace, key: string): Promise<void> {
    key.length <= this.kvKeySizeLimit && await cache.delete(key);
  }

  //#region Model Methods

  /**  Sets a model in the cache. Use @param modifier for non-standard responses. */
  public static async setModel<T extends BaseModel>(cache: KVNamespace, model: T, modifier?: object, ttl?: number): Promise<void> {
    const identifier = model?.$id();
    if (!identifier) return;

    const modifierTag = await this.getModifier(modifier);

    await this.set(cache, `${CachePrefix.Record}${model.constructor.name}:${identifier.toString()}:${modifierTag}`, model, ttl);

    if (model.$key()) {
      await this.set(cache, `${CachePrefix.Record}${model.constructor.name}:${model.$key()}:${modifierTag}`, model, ttl);
    }
  }

  /** Gets a model from the cache. Use @param modifier for non-standard lookups. */
  public static async getModel<U extends typeof BaseModel>(cache: KVNamespace, model: U, identifier: string | number, modifier?: object): Promise<InstanceType<U> | null> {
    const modifierTag = await this.getModifier(modifier);

    return await this.get(cache, `${CachePrefix.Record}${model.name}:${identifier.toString()}:${modifierTag}`);
  }

  /** Deletes a model from the cache. Deletes all modified versions too. */
  public static async clearModel<T extends BaseModel>(cache: KVNamespace, model: T | undefined): Promise<void> {
    if (!model) return;

    const identifier = model?.$id();
    if (!identifier) return;

    // Get keys by ID
    const idList = await cache.list({ prefix: `${CachePrefix.Record}${model.constructor.name}:${identifier.toString()}` });
    const keysToDelete = idList.keys.map(key => key.name);

    // Get keys by Key
    if (model.$key()) {
      const keyList = await cache.list({ prefix: `${CachePrefix.Record}${model.constructor.name}:${model.$key()}` });
      keysToDelete.push(...keyList.keys.map(key => key.name));
    }
    
    if (this.kvApi) {
      // Use bulk delete if KV API is available
      await this.kvApi.deleteKeys(keysToDelete);
    } else {
      // Fallback to parallel individual deletes
      await Promise.all(
        keysToDelete.map(key => this.delete(cache, key))
      );
    }
  }
  //#endregion


  //#region Page Methods

  /**  Sets a page in the cache. Use @param modifier for non-standard responses. */
  public static async setPage<T extends BaseModel>(cache: KVNamespace, page: T[], modifier?: object, ttl?: number): Promise<void> {
    if (!page.length) return;

    const modifierTag = await this.getModifier(modifier);

    await this.set(cache, `${CachePrefix.Page}${page[0].constructor.name}:${modifierTag}`, page, ttl);
  }

  /** Gets a page from the cache. Use @param modifier for non-standard lookups. */
  public static async getPage<U extends typeof BaseModel>(cache: KVNamespace, model: U, modifier?: object): Promise<InstanceType<U>[] | null> {
    const modifierTag = await this.getModifier(modifier);

    return await this.get(cache, `${CachePrefix.Page}${model.name}:${modifierTag}`);
  }

  /** Deletes a page from the cache. Deletes all modified versions too. */
  public static async clearPage<T extends typeof BaseModel>(cache: KVNamespace, model: T): Promise<void> {
    const list = await cache.list({ prefix: `${CachePrefix.Page}${model.name}` });
    const keys = list.keys.map(key => key.name);

    if (this.kvApi) {
      // Use bulk delete if KV API is available
      await this.kvApi.deleteKeys(keys);
    } else {
      // Fallback to parallel individual deletes
      await Promise.all(
        keys.map(key => this.delete(cache, key))
      );
    }
  }
  //#endregion


  //#region Helpers
  private static async getModifier(modifier: object | undefined) {
    return modifier && !isEmpty(modifier) ? await sha256(JSON.stringify(modifier)) : "";
  }
}