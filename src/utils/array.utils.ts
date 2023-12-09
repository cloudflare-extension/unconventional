/** Compares two arrays and returns true if they contain the same elements, regardless of order */
export const equalArrays = <T>(a: T[], b: T[]) => {
  if (a.length !== b.length) return false;
  const clone = [...b];

  for (const key of a) {
    const idx = b.indexOf(key);
    if (idx > -1)
      clone.splice(idx, 1);
    else {
      break;
    }
  }

  return clone.length === 0;
};

/** Checks whether an object has no keys and/or the value for every key is undefined */
export function isEmpty(obj: any) {
  for (const key in obj) if (obj[key] !== undefined) return false;
  return true;
}