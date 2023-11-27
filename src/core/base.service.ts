import { SqlWhereOperator } from "unconventional-pg-queries";
import { APIError } from "./api-error";
import BaseCache from "./base.cache";
import BaseModelClass from "./base.modelclass";
import { FilterConfig, PageConfig, ServiceConfig } from "./base.options";
import { buildFilter } from "../utils/db.utils";

export default class BaseService<M extends typeof BaseModelClass> {
  private model: M;

  /** A service providing CRUD methods for any Model */
  constructor(model: M) {
    this.model = model;
  }

  /** Creates a service providing CRUD methods for any Model */
  static for<M extends typeof BaseModelClass>(model: M) {
    return new this<M>(model);
  }

  /**
   * Creates a new instance of M from the provided data
   * @param data - A new object to be persisted.
   * @returns The newly created document.
   */
  public async create(data: Partial<InstanceType<M>>, config?: ServiceConfig<M>): Promise<InstanceType<M>> {
    const response = await this.model.create(data, config?.upsertContraint);

    if (!response) {
      throw APIError.errResourceCreationFailed(`Failed to create ${this.model.name}`);
    } else if (config?.cache) {
      await BaseCache.clearPage(config.cache, this.model);
      await BaseCache.setModel(config.cache, response, undefined, config.cacheTTL);
    }

    return response;
  }

  /**
   * Creates a new instance of M for each item in the provided data array
   * @param data - An array of new objects to be persisted.
   * @returns The newly created documents.
   */
  public async createMany(data: Partial<InstanceType<M>>[], config?: ServiceConfig<M>): Promise<InstanceType<M>[]> {
    const response = await this.model.createMany(data, config?.upsertContraint);

    if (!response) {
      throw APIError.errResourceCreationFailed(`Failed to create ${this.model.name}s`);
    } else if (config?.cache) {
      const cache = config.cache;

      await BaseCache.clearPage(cache, this.model);
      await Promise.all(response.map(item => BaseCache.setModel(cache, item, undefined, config.cacheTTL)));
    }

    return response;
  }

  /**
   * Gets one instance of the document
   * @param identifier - The id or key of a model. If type is number, lookup will be done with the model's idColumn. Otherwise, keyColumn is used.
   * @returns A document.
   */
  public async get(identifier: string | number, config?: FilterConfig & ServiceConfig<M>): Promise<InstanceType<M>> {
    const { cache, cacheTTL, ...modifiers } = config || {};

    let entity: InstanceType<M> | null = null;
    if (cache) {
      entity = await BaseCache.getModel(cache, this.model, identifier, modifiers);
    }

    if (!entity) {
      if (!isNaN(+identifier)) {
        entity = await this.model.findById(identifier, modifiers);
      } else {
        const keyFilter = buildFilter<M>(this.model.keyField as keyof M, SqlWhereOperator.Eq, identifier);
        const filter = modifiers.filter ? `${modifiers.filter} AND ${keyFilter}` : keyFilter;
        entity = await this.model.findOne({ ...modifiers, filter });
      }

      if (!entity) throw APIError.errNotFound(`No ${this.model.name} found with id ${identifier}`);

      if (cache) {
        await BaseCache.setModel(cache, entity, modifiers, cacheTTL);
      }
    }

    return entity;
  }

  /**
   * Gets all instances of the document
   * @param config - An object containing pagination and sorting options.
   * @param config.limit - The maximum number of documents to return.
   * @param config.cursor - The id of the document to start the query from.
   * @param config.sort - An object containing the fields to sort by and their sort order.
   * @param config.filters - A string containing the fields to filter by and their values.
   * @returns An array of documents.
   */
  public async getAll(config?: PageConfig & FilterConfig & ServiceConfig<M>): Promise<Array<InstanceType<M>>> {
    const { cache, cacheTTL, ...modifiers } = config || {};

    let page: InstanceType<M>[] | null = null;
    if (cache) {
      page = await BaseCache.getPage(cache, this.model, modifiers);
    }

    if (!page) {
      const limit = modifiers.limit || 12;

      page = await this.model.findMany({ limit, ...modifiers });

      if (cache) {
        await BaseCache.setPage(cache, page, modifiers, cacheTTL);
      }
    }

    return page;
  }

  /**
   * Patches all fields provided in data on the document identified by the identifier. Certain fields may be restricted.
   * @param identifier - The id or key of a model. If type is number, lookup will be done with the model's idColumn. Otherwise, keyColumn is used.
   * @param data - An object containing all the fields to be modified and their new values.
   * @returns The updated document.
   */
  public async update(identifier: string, data: Partial<InstanceType<M>>, config?: ServiceConfig<M>): Promise<InstanceType<M>> {
    const response = await this.model.update(identifier, data);

    if (!response) {
      throw APIError.errNotFound(`No ${this.model.name} found with id ${identifier}`);
    } else if (config?.cache) {
      await BaseCache.clearModel(config.cache, response);
      await BaseCache.setModel(config.cache, response, undefined, config.cacheTTL);
    }

    return response;
  }

  /**
   * Patches all fields provided in the array of documents. Certain fields may be restricted.
   * @param data - An array of objects containing all the fields to be modified and their new values.
   * @returns An array of updated documents.
   */
  public async updateMany(data: Partial<InstanceType<M>>[], config?: ServiceConfig<M>): Promise<InstanceType<M>[]> {
    const response = await this.model.updateMany(data);

    if (!response) {
      throw APIError.errResourceUpdateFailed(`Failed to update ${this.model.name}s`);
    } else if (config?.cache) {
      const cache = config.cache;

      await Promise.all(response.map(item => BaseCache.clearModel(cache, item)));
      await Promise.all(response.map(item => BaseCache.setModel(cache, item, undefined, config.cacheTTL)));
    }

    return response;
  }

  /**
   * Deletes the document with the given identifier.
   * @param identifier - The id or key of a document. If type is a valid MongoDB ObjectID, lookup will be done with the model's idColumn. Otherwise, keyColumn is used.
   * @returns The deleted document.
   */
  public async delete(identifier: string, config?: ServiceConfig<M>): Promise<InstanceType<M>> {
    const response = await this.model.delete(identifier);

    if (!response) {
      throw APIError.errNotFound(`No ${this.model.name} found with id ${identifier}`);
    } else if (config?.cache) {
      await BaseCache.clearModel(config.cache, response);
      await BaseCache.clearPage(config.cache, this.model);
    }

    return response;
  }

  /**
   * Deletes the documents identified by config.filter.
   * @returns An array of the deleted documents.
   */
  public async deleteMany(config?: FilterConfig & ServiceConfig<M>): Promise<InstanceType<M>[]> {
    if (!config?.filter) throw APIError.errBadRequest("No filter provided");

    const response = await this.model.deleteMany(config);

    if (!response) {
      throw APIError.errResourceDeletionFailed(`Failed to delete ${this.model.name}s`);
    } else if (config?.cache) {
      const cache = config.cache;

      await BaseCache.clearPage(config.cache, this.model);
      await Promise.all(response.map(item => BaseCache.clearModel(cache, item)));
    }

    return response;
  }
}