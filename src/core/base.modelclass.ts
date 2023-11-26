import { ConflictResolution, OneOrMany, SqlWhereOperator } from "unconventional-pg-queries";
import { prop } from "../decorators/prop.decorator";
import { timestamp } from "../decorators/timestamp.decorator";
import { SqlAction } from "../types/db.types";
import { IndexSummary, PropSummary } from "../types/decorator.types";
import { FilterConfig, PageConfig } from "./base.options";
import { getConflict, getExpand, getOrder, getPage, getWhere, dbFetch } from "./postgres.connection";

interface BaseModelSchema {
  indexes: IndexSummary[];
  props: PropSummary;
  timestamped?: boolean;
}

export class Document {
  public static schema: BaseModelSchema = { indexes: [], props: {} };
}

export default class BaseModelClass extends Document {
  public static collection: string;
  public static idField: string = 'id';
  public static keyField?: string;
  public static ownerField?: string;
  public static db?: Fetcher;

  @prop({ required: true, unique: true })
    id!: number;

  public static async create<T extends typeof BaseModelClass>(this: T, data: Partial<InstanceType<T>>, upsertConstraint?: Array<keyof InstanceType<T>>): Promise<InstanceType<T> | null> {
    const timestamp = this.schema.timestamped ? {
      updatedAt: new Date(),
      createdAt: new Date()
    } : {};

    const response = await dbFetch(this.db, {
      action: SqlAction.Insert,
      type: OneOrMany.One,
      table: this.collection,
      conflict: getConflict(this, ConflictResolution.doUpdate, upsertConstraint),
      data: this.addDefaults({ ...data, ...timestamp })
    });

    if (!response.ok) return null;

    const body = await response.json<T>();
    return this.fromDatabaseJson(body);
  }

  public static async createMany<T extends typeof BaseModelClass>(this: T, data: Partial<InstanceType<T>>[], upsertConstraint?: Array<keyof InstanceType<T>>): Promise<InstanceType<T>[] | null> {
    const timestamp = this.schema.timestamped ? {
      updatedAt: new Date(),
      createdAt: new Date()
    } : {};

    const response = await dbFetch(this.db, {
      action: SqlAction.Insert,
      type: OneOrMany.Many,
      table: this.collection,
      conflict: getConflict(this, ConflictResolution.doUpdate, upsertConstraint),
      data: data.map(item => this.addDefaults({ ...item, ...timestamp }))
    });

    if (!response.ok) return null;

    const body = await response.json<InstanceType<T>[]>();
    return body.map(item => this.fromDatabaseJson(item));
  }

  public static async findById<T extends typeof BaseModelClass>(this: T, id: string | number, config?: FilterConfig): Promise<InstanceType<T> | null> {
    const response = await dbFetch(this.db, {
      action: SqlAction.Select,
      type: OneOrMany.One,
      table: this.collection,
      expand: getExpand(this, config?.expand),
      where: [{ field: this.idField, operator: SqlWhereOperator.Eq, value: id }]
    });

    if (!response.ok) return null;

    const data = await response.json<T>();
    return data ? this.fromDatabaseJson(data) : null;
  }

  public static async findOne<T extends typeof BaseModelClass>(this: T, config: FilterConfig): Promise<InstanceType<T> | null> {
    const response = await dbFetch(this.db, {
      action: SqlAction.Select,
      type: OneOrMany.One,
      table: this.collection,
      expand: getExpand(this, config?.expand),
      where: getWhere(this, config?.filter)
    });
    if (!response.ok) return null;

    const data = await response.json<T>();
    return data ? this.fromDatabaseJson(data) : null;
  }

  public static async findMany<T extends typeof BaseModelClass>(this: T, config?: PageConfig & FilterConfig): Promise<Array<InstanceType<T>>> {
    const response = await dbFetch(this.db, {
      action: SqlAction.Select,
      type: OneOrMany.Many,
      table: this.collection,
      expand: getExpand(this, config?.expand),
      where: getWhere(this, config?.filter),
      order: getOrder(this, config?.sort),
      page: getPage(this, config?.cursor),
      limit: config?.limit
    });

    if (!response.ok) return [];

    const data = await response.json<T[]>();
    return data?.length ? data.map(item => this.fromDatabaseJson(item)) : [];
  }

  public static async update<T extends typeof BaseModelClass>(this: T, id: string | number, data: Partial<InstanceType<T>>): Promise<InstanceType<T> | null> {
    const timestamp = this.schema.timestamped ? { updatedAt: new Date() } : {};
    delete data[this.idField];

    const response = await dbFetch(this.db, {
      action: SqlAction.Update,
      type: OneOrMany.One,
      table: this.collection,
      where: [{ field: this.idField, operator: SqlWhereOperator.Eq, value: id }],
      data: { ...data, ...timestamp }
    });

    if (!response.ok) return null;

    const body = await response.json<InstanceType<T> | InstanceType<T>[]>();
    const result = Array.isArray(body) ? body[0] : body;

    return result ? this.fromDatabaseJson(result) : null;
  }

  public static async updateMany<T extends typeof BaseModelClass>(this: T, data: Partial<InstanceType<T>>[]): Promise<InstanceType<T>[] | null> {
    const timestamp = this.schema.timestamped ? { updatedAt: new Date() } : {};

    const response = await dbFetch(this.db, {
      action: SqlAction.Update,
      type: OneOrMany.Many,
      table: this.collection,
      data: data.map(item => ({ ...item, ...timestamp }))
    });

    if (!response.ok) return null;

    const body = await response.json<InstanceType<T>[]>();
    return body.map(item => this.fromDatabaseJson(item));
  }

  public static async delete<T extends typeof BaseModelClass>(this: T, id: string): Promise<InstanceType<T> | null> {
    const response = await dbFetch(this.db, {
      action: SqlAction.Delete,
      type: OneOrMany.One,
      table: this.collection,
      where: [{ field: this.idField, operator: SqlWhereOperator.Eq, value: id }]
    });

    if (!response.ok) return null;

    const body = await response.json<InstanceType<T> | InstanceType<T>[]>();
    const result = Array.isArray(body) ? body[0] : body;

    return result ? this.fromDatabaseJson(result) : null;
  }

  public static async deleteMany<T extends typeof BaseModelClass>(this: T, config?: FilterConfig): Promise<InstanceType<T>[] | null> {
    const response = await dbFetch(this.db, {
      action: SqlAction.Delete,
      type: OneOrMany.Many,
      table: this.collection,
      where: getWhere(this, config?.filter)
    });

    if (!response.ok) return null;

    const body = await response.json<InstanceType<T> | InstanceType<T>[]>();
    const result = Array.isArray(body) ? body : [body];

    return result ? result.map(item => this.fromDatabaseJson(item)) : null;
  }

  public static async count<T extends typeof BaseModelClass>(this: T): Promise<number | null> {
    const response = await dbFetch(this.db, {
      action: SqlAction.Select,
      type: OneOrMany.Many,
      table: this.collection,
      count: true
    });

    if (!response.ok) return null;

    const body = await response.json<{ count: number }>();
    return body.count;
  }

  public static fromDatabaseJson<T extends typeof BaseModelClass>(this: T, json: object): InstanceType<T> {
    const model = new this();
    Object.assign(model, json);
    return model as InstanceType<T>;
  }

  private static addDefaults<T extends typeof BaseModelClass>(this: T, data: Partial<InstanceType<T>>) {
    Object.entries(this.schema.props).forEach(([key, options]) => {
      if (data[key] === undefined && options.default != null) {
        const val = options.default;
        data[key] = typeof val === "function" ? val() : val;
      }
    });

    return data;
  }

  public $id() { return this[this.constructor['idField']]; }
  public $key() { return this[this.constructor['keyField']]; }
  public $owner() { return this[this.constructor['ownerField']]; }
}

@timestamp()
export abstract class TimeStamped extends BaseModelClass {
  @prop()
  public createdAt?: Date;
  @prop()
  public updatedAt?: Date;
}