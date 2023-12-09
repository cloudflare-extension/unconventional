import BaseModel from '../core/base.model';
import { IndexDefinition, IndexOptions, TypedClassDecorator } from '../types/decorator.types';

/**
 * Defines a index for this Class which will then be added to the collection.
 * @param fields Which fields to index (if multiple fields are set, it will be a compound index)
 * @param options Options to pass to MongoDB when creating the index
 * @example Example:
 * ```ts
 * ‎@index({ article: 1, user: 1 }, { unique: true })
 * class ClassName {}
 * ```
 */
export function index<T extends typeof BaseModel>(fields: IndexDefinition<InstanceType<T>>, options?: IndexOptions): TypedClassDecorator<T> {
  return (target: T) => {
    target.schema.indexes.push({ definition: fields, options });
  };
}

export { index as Index };
