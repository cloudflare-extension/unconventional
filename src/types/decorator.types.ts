import { BaseModel } from "../core/base.model";

//#region General
export declare type TypedClassDecorator<T> = (target: T) => T | void;
//#endregion


//#region Index
/** Definition of a sortable index. 1=ascending, -1=descending */
export type IndexDefinition<T> = {
  [P in keyof T]?: 1 | -1;
}

/** Options to pass to MongoDB when creating an Index */
export interface IndexOptions {
  unique?: boolean;
}

/**
 * Type for the Values stored in the Reflection for Indexes
 * @example
 * ```ts
 * const indices: IIndexArray[] = Reflect.getMetadata(DecoratorKeys.Index, target) || []);
 * ```
 */
export interface IndexSummary<T = any> {
  definition: IndexDefinition<T>;
  options?: IndexOptions;
}
//#endregion


//#region Relation
/** Type of relational field between two models */
export enum RelationType {
  HasOne = 0,
  HasMany = 1,
  ManyToMany = 2,
  BelongsTo = 3
}

/** Details of the pivot table connecting two models */
export interface RelationPivot<T extends typeof BaseModel = any> {
  /** The model to use for the pivot table */
  model: T;
  /** The field on this model related to the source */
  from: keyof InstanceType<T>;
  /** The field on this model related to the target */
  to: keyof InstanceType<T>;
}

export interface Relation<Target extends typeof BaseModel = any, Source extends typeof BaseModel = any, Pivot extends typeof BaseModel = any> {
  /** The type of relation */
  type: RelationType;
  /** The model to relate to */
  model: Target | (() => Target);
  /** The field on this model to use for the relation */
  from: keyof InstanceType<Source>;
  /** The field on the related model to use for the relation */
  to: keyof InstanceType<Target>;
  /** Details of the pivot table connecting this model to the related model */
  through?: RelationPivot<Pivot>;
}
//#endregion


//#region Prop

/** Options to pass to the DB when creating or validating a property */
export interface PropOptions<T = any, S extends typeof BaseModel = any, P extends typeof BaseModel = any> {
  /**
   * Is this value required?
   * @default false
   */
  required?: boolean;
  /** Is this Property unique?
   * @default false
   */
  unique?: boolean;
  /** Only accept Values from the Enum(|Array) */
  enum?: any;
  /** Give the Property a default Value */
  default?: T | (() => T);
  /** Protect field from edits by non-privileged users */
  system?: boolean;
  /** Hide field in responses to non-privileged users */
  private?: boolean;
  /** Relational field data */
  relation?: T extends typeof BaseModel ? Relation<T, S, P> : never;
}

/** Type for the Values stored in the Reflection for Properties */
export type PropSummary<Target = any, Source extends typeof BaseModel = any> = Record<keyof Source, PropOptions<Target, Source>>
//#endregion


//#region Timestamp

/** Options to guide the timestamping of a model on create/update */
export interface TimestampOptions {
  /** The field to store the created date in */
  createdField: string;
  /** The field to store the updated date in */
  updatedField: string;
}
//#endregion