import { ConflictResolution, OneOrMany, SqlWhereOperator, SubAction } from "unconventional-pg-queries";
import { prop } from "../decorators/prop.decorator";
import { timestamp } from "../decorators/timestamp.decorator";
import { DB, SqlAction } from "../types/db.types";
import { IndexSummary, PropSummary } from "../types/decorator.types";
import { FilterConfig, PageConfig, UpsertConfig } from "./base.options";
import { getConflict, getExpand, getOrder, getPage, getWhere } from "../utils/db.utils";
import { evaluate, getRelationModel, isUUID } from "../utils";

interface BaseModelSchema {
  indexes: IndexSummary[];
  props: PropSummary;
  timestamp?: {
    createdField: string;
    updatedField: string;
  };
}

export class Document {
  public static schema: BaseModelSchema = { indexes: [], props: {} };
}

export class BaseModel extends Document {
  public static collection: string;
  public static idField: string = 'id';
  public static keyField?: string;
  public static ownerField?: string;
  public static db: DB;

  @prop({ required: true, unique: true })
    id!: number | string;

  public static async create<T extends typeof BaseModel>(this: T, data: Partial<InstanceType<T>>, upsertConfig?: UpsertConfig<T>): Promise<InstanceType<T> | null> {
    const timestamp = this.schema.timestamp ? {
      [this.schema.timestamp.createdField]: new Date(),
      [this.schema.timestamp.updatedField]: new Date()
    } : {};

    const response = await this.db.fetch<T>({
      action: SqlAction.Insert,
      type: OneOrMany.One,
      table: this.collection,
      conflict: getConflict(this, upsertConfig?.action || ConflictResolution.doUpdate, upsertConfig?.constraint),
      data: this.addDefaults({ ...data, ...timestamp })
    });

    if (!response) return null;

    const result = Array.isArray(response) ? response[0] : response;
    return this.fromDatabaseJson(result);
  }

  public static async createMany<T extends typeof BaseModel>(this: T, data: Partial<InstanceType<T>>[], upsertConfig?: UpsertConfig<T>): Promise<InstanceType<T>[] | null> {
    const timestamp = this.schema.timestamp ? {
      [this.schema.timestamp.createdField]: new Date(),
      [this.schema.timestamp.updatedField]: new Date()
    } : {};

    const response = await this.db.fetch<T[]>({
      action: SqlAction.Insert,
      type: OneOrMany.Many,
      table: this.collection,
      conflict: getConflict(this, upsertConfig?.action || ConflictResolution.doUpdate, upsertConfig?.constraint),
      data: data.map(item => this.addDefaults({ ...item, ...timestamp }))
    });

    if (!response) return null;

    return response.map(item => this.fromDatabaseJson(item));
  }

  public static async findById<T extends typeof BaseModel>(this: T, id: string | number, config?: FilterConfig): Promise<InstanceType<T> | null> {
    const response = await this.db.fetch<T>({
      action: SqlAction.Select,
      type: OneOrMany.One,
      table: this.collection,
      expand: getExpand(this, config?.expand),
      where: [{ field: this.idField, operator: SqlWhereOperator.Eq, value: id }]
    });

    return response ? this.fromDatabaseJson(response) : null;
  }

  public static async findOne<T extends typeof BaseModel>(this: T, config: FilterConfig): Promise<InstanceType<T> | null> {
    const response = await this.db.fetch<T>({
      action: SqlAction.Select,
      type: OneOrMany.One,
      table: this.collection,
      expand: getExpand(this, config?.expand),
      where: getWhere(this, config?.filter)
    });

    return response ? this.fromDatabaseJson(response) : null;
  }

  public static async findMany<T extends typeof BaseModel>(this: T, config?: PageConfig & FilterConfig): Promise<Array<InstanceType<T>>> {
    const response = await this.db.fetch<T[]>({
      action: SqlAction.Select,
      type: OneOrMany.Many,
      table: this.collection,
      expand: getExpand(this, config?.expand),
      where: getWhere(this, config?.filter),
      order: getOrder(this, config?.sort),
      page: getPage(this, config?.cursor),
      limit: config?.limit
    });

    return response ? response.map(item => this.fromDatabaseJson(item)) : [];
  }

  public static async update<T extends typeof BaseModel>(this: T, id: string | number, data: Partial<InstanceType<T>>): Promise<InstanceType<T> | null> {
    const timestamp = this.schema.timestamp ? { [this.schema.timestamp.updatedField]: new Date() } : {};
    const targetField = this.getFieldName(id);
    if (!targetField) return null;

    delete data[targetField];

    const response = await this.db.fetch<T>({
      action: SqlAction.Update,
      type: OneOrMany.One,
      table: this.collection,
      where: [{ field: targetField, operator: SqlWhereOperator.Eq, value: id }],
      data: { ...data, ...timestamp }
    });

    if (!response) return null;

    const result = Array.isArray(response) ? response[0] : response;
    return this.fromDatabaseJson(result);
  }

  public static async updateMany<T extends typeof BaseModel>(this: T, data: Partial<InstanceType<T>>[]): Promise<InstanceType<T>[] | null> {
    const timestamp = this.schema.timestamp ? { [this.schema.timestamp.updatedField]: new Date() } : {};

    const response = await this.db.fetch<T[]>({
      action: SqlAction.Update,
      type: OneOrMany.Many,
      table: this.collection,
      data: data.map(item => ({ ...item, ...timestamp }))
    });

    if (!response) return null;

    return response.map(item => this.fromDatabaseJson(item));
  }

  public static async delete<T extends typeof BaseModel>(this: T, id: string | number): Promise<InstanceType<T> | null> {
    const targetField = this.getFieldName(id);
    if (!targetField) return null;

    const response = await this.db.fetch<T>({
      action: SqlAction.Delete,
      type: OneOrMany.One,
      table: this.collection,
      where: [{ field: targetField, operator: SqlWhereOperator.Eq, value: id }]
    });

    if (!response) return null;

    const result = Array.isArray(response) ? response[0] : response;
    return this.fromDatabaseJson(result);
  }

  public static async deleteMany<T extends typeof BaseModel>(this: T, config?: FilterConfig): Promise<InstanceType<T>[] | null> {
    const response = await this.db.fetch<T[]>({
      action: SqlAction.Delete,
      type: OneOrMany.Many,
      table: this.collection,
      where: getWhere(this, config?.filter)
    });

    if (!response) return null;

    return response.map(item => this.fromDatabaseJson(item));
  }

  public static async count<T extends typeof BaseModel>(this: T): Promise<number | null> {
    const response = await this.db.fetch<{ count: number }>({
      action: SqlAction.Select,
      type: OneOrMany.Many,
      table: this.collection,
      subAction: SubAction.Count
    });

    if (!response) return null;

    return response.count;
  }

  public static async increment<T extends typeof BaseModel>(this: T, id: string | number, data: { [key in keyof InstanceType<T>]?: number }): Promise<InstanceType<T> | null> {
    const targetField = this.getFieldName(id);
    if (!targetField) return null;

    const response = await this.db.fetch<T>({
      action: SqlAction.Update,
      type: OneOrMany.One,
      table: this.collection,
      where: [{ field: targetField, operator: SqlWhereOperator.Eq, value: id }],
      subAction: SubAction.Increment,
      data
    });

    if (!response) return null;

    const result = Array.isArray(response) ? response[0] : response;
    return this.fromDatabaseJson(result);
  }

  public static async truncate<T extends typeof BaseModel>(this: T): Promise<void> {
    await this.db.fetch<T>({
      action: SqlAction.Truncate,
      type: OneOrMany.Many,
      table: this.collection
    });
  }

  public static fromDatabaseJson<T extends typeof BaseModel>(this: T, json: object): InstanceType<T> {
    const model = new this();
    Object.assign(model, json);
    return model as InstanceType<T>;
  }

  private static addDefaults<T extends typeof BaseModel>(this: T, data: Partial<InstanceType<T>>) {
    Object.entries(this.schema.props).forEach(([key, options]) => {
      if (data[key] === undefined && options.default != null) {
        const val = options.default;
        data[key] = typeof val === "function" ? val() : val;
      }
    });

    return data;
  }

  /** Gets the field name to use for the provided identifier */
  private static getFieldName<T extends typeof BaseModel>(this: T, identifier: string | number) {
    return !isNaN(+identifier) || isUUID(`${identifier}`)
      ? this.idField
      : this.keyField || undefined;
  }

  /** Masks private fields and in the provided data and its relations */
  public static maskPrivate<T extends typeof BaseModel>(this: T, data: InstanceType<T> | InstanceType<T>[], relationsOnly: boolean = false) {
    if (!data || typeof data !== 'object') return;
    const dataArray = Array.isArray(data) ? data : [data];
    const propSummary = Object.entries(this.schema.props);

    for (let item of dataArray) {
      for (const [key, options] of propSummary) {
        // Mask private fields. Skip 1st level if relationsOnly.
        if (!relationsOnly && key in item && options.private != null) {
          if (Array.isArray(item[key])) {
            item[key] = item[key].filter(rel => rel != null && !evaluate(options.private, item, rel));
            if (item[key].length === 0) continue;
          } else if (evaluate(options.private, item, item[key])) {
            item[key] = undefined;
            continue;
          }
        }

        // Mask private fields in relations
        if (options.relation && item[key]) {
          (getRelationModel(options.relation) as typeof BaseModel).maskPrivate(item[key]);
        }
      }
    }
  }

  public $id() { return this[this.constructor['idField']]; }
  public $key() { return this[this.constructor['keyField']]; }
  public $owner() { return this[this.constructor['ownerField']]; }
}

@timestamp()
export class TimeStamped extends BaseModel {
  @prop()
  public createdAt?: Date;
  @prop()
  public updatedAt?: Date;
}