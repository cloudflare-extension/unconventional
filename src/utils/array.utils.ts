/** Compares two arrays and returns true if they contain the same elements, regardless of order */
export const equalArrays = <T>(a: T[], b: T[]): boolean => {
  if (a.length !== b.length) return false;
  const clone = [...b];

  for (const item of a) {
    const idx = clone.indexOf(item); // Use clone here for checking
    if (idx > -1) {
      clone.splice(idx, 1); // Correctly removes the item from clone
    } else {
      return false; // If an item is not found, arrays are not equal
    }
  }

  return clone.length === 0; // If clone is empty, arrays are equal
};

/** Checks whether an object has no keys and/or the value for every key is undefined */
export function isEmpty(obj: any) {
  for (const key in obj) if (obj[key] !== undefined) return false;
  return true;
}

/** Evaluate a direct or functional value */
export function evaluate<T, F extends (...args: any[]) => T>(
  value: T | F | undefined,
  ...args: Parameters<F>
): T | undefined {
  return value instanceof Function ? value(...args) : value;
}