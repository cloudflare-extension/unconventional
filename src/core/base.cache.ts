import { CachePrefix, DefaultCacheTTL } from "../types/api.types";
import { isEmpty } from "../utils/array.utils";
import { sha256 } from "../utils/crypto.utils";
import { BaseModel } from "./base.model";

export class BaseCache {
  // https://developers.cloudflare.com/kv/platform/limits
  private static kvKeySizeLimit = 512; // in bytes
  private static kvValueSizeLimit = 26214400; // in bytes (25MB)

  public static async get<T>(cache: KVNamespace, key: string): Promise<T | null> {
    if (key.length > this.kvKeySizeLimit) return null;
    const response = await cache.get(key);

    if (!response) return null;

    return JSON.parse(response) as T;
  }

  public static async set<T>(cache: KVNamespace, key: string, value: T, ttl: number = DefaultCacheTTL): Promise<void> {
    const keySize = this.getStringSizeInBytes(key);

    const serializedValue = JSON.stringify(value);
    const valueSize = this.getStringSizeInBytes(serializedValue);

    keySize <= this.kvKeySizeLimit && valueSize <= this.kvValueSizeLimit &&
      await cache.put(key, serializedValue, { expirationTtl: ttl });
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

    // Delete by ID
    const idList = await cache.list({ prefix: `${CachePrefix.Record}${model.constructor.name}:${identifier.toString()}` });
    const idPromises = idList.keys.map(async key => {
      await this.delete(cache, key.name);
    });

    // Delete by Key
    let keyPromises: Promise<void>[] = [];
    if (model.$key()) {
      const keyList = await cache.list({ prefix: `${CachePrefix.Record}${model.constructor.name}:${model.$key()}` });

      keyPromises = keyList.keys.map(async key => {
        await this.delete(cache, key.name);
      });
    }

    // Execute
    await Promise.all([...idPromises, ...keyPromises]);
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

    Promise.all(list.keys.map(async key => {
      await this.delete(cache, key.name);
    }));
  }
  //#endregion


  //#region Helpers
  private static async getModifier(modifier: object | undefined) {
    return modifier && !isEmpty(modifier) ? await sha256(JSON.stringify(modifier)) : "";
  }

  private static getStringSizeInBytes(value: string): number {
    return new TextEncoder().encode(value).length;
  }
} ``