import { BaseModel } from '../core/base.model';
import type { PropOptions } from '../types/decorator.types';

/**
 * Set Property Options for the property below
 * @param options The Mongo options to Set
 * @example
 * ```ts
 * class ClassName {
 *   @prop()
 *   public someProp?: string;
 *
 *   @prop({ type: String[] })
 *   public someArrayProp?: string[];
 * }
 * ```
 */
function prop<Target = any, Source extends typeof BaseModel = any, Pivot extends typeof BaseModel = any>(options?: PropOptions<Target, Source, Pivot>): PropertyDecorator {
  return (target: any, key: string | symbol) => {
    const parent = Object.getPrototypeOf(target.constructor);
    const child = target.constructor;

    if (child.schema === parent.schema) {
      child.schema = parent.schema
        ? { indexes: [...parent.schema.indexes], props: {...parent.schema.props}, ...(parent.schema?.timestamp ? { timestamp: { ...parent.schema.timestamp } } : {}) }
        : { indexes: [], props: {} };
    }

    child.schema.props[key] = options || {};
  };
}

export { prop as Prop, prop };
