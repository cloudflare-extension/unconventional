import { TimeStamped } from '../core/base.modelclass';
import { TypedClassDecorator } from '../types/decorator.types';

/**
 * Adds createdAt and updatedAt fields to the class and updates them on create/update calls.
 * @example Example:
 * ```ts
 * ‎@timestamp()
 * class ClassName {}
 * ```
 */
export function timestamp<T extends typeof TimeStamped>(): TypedClassDecorator<T> {
  return (target: T) => {
    target.schema.timestamped = true;
  };
}

export { timestamp as Timestamp };
