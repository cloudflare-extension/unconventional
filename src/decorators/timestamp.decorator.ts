import { BaseModel } from '../core/base.model';
import { TimestampOptions, TypedClassDecorator } from '../types/decorator.types';

/**
 * Adds createdAt and updatedAt fields to the class and updates them on create/update calls.
 * @example Example:
 * ```ts
 * ‎@timestamp()
 * class ClassName {}
 * ```
 */
export function timestamp<T extends typeof BaseModel>(options?: TimestampOptions): TypedClassDecorator<T> {
  return (target: T) => {        // Ensure the target has its own schema object
    if (!target.hasOwnProperty('schema'))
      target.schema = Object.create(target.schema || {});

    target.schema.timestamp = {
      createdField: options?.createdField || 'createdAt',
      updatedField: options?.updatedField || 'updatedAt'
    };
  };
}

export { timestamp as Timestamp };
