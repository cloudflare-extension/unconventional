import { AndOr } from "unconventional-pg-queries";
import { andOrPattern } from "../types/db.types";

const defaultTarget = ',';
const openBracket = '[';
const closeBracket = ']';

/**
 * Decompose an expand-formatted string into an array of its parts.
 * @example
 * parseExpandString('a,b,c') // ['a', 'b', 'c']
 * parseExpandString('a[b,c],d[e,f],g') // ['a[b,c]', 'd[e,f]', 'g']
 */
export function parseExpandString(expand: string): string[] {
  const text = expand.trim();
  if (!text) return [];

  const result: string[] = [];
  let word = '';
  let bracketCount = 0;

  for (const char of text) {
    // If we encounter a comma and we're not inside brackets, push the word
    if (bracketCount === 0 && char === defaultTarget) {
      result.push(`${word}`);
      word = '';

      // Otherwise, add the character to the word
    } else {
      word += char;

      // If we encounter a bracket, increment or decrement the bracket count
      if (char === openBracket) bracketCount++;
      else if (char === closeBracket) bracketCount--;
    }
  }

  // Push the last word
  result.push(`${word}`);

  return result;
}

/**
 * Split an expand-formatted into its parent and child parts.
 * @example
 * splitExpandUnit('a') // { parent: 'a', children: '' }
 * splitExpandUnit('a[b,c]') // { parent: 'a', children: 'b,c' }
 * splitExpandUnit('a[b,c[d,e]]') // { parent: 'a', children: 'b,c[d,e]' }
 */
export function splitExpandUnit(input: string) {
  const index = input.indexOf(openBracket);

  if (index === -1) return { parent: input, children: '' };
  return { parent: input.slice(0, index), children: input.slice(index + 1, -1) };
}


/** Parse a filter string and replace clauses that reference the target field with the provided replacement. */
export function replaceFilter(filter: string | string[] | undefined, target: string, replacement: string, andOr: AndOr = AndOr.And) {
  if (!filter) return replacement;

  const otherFilters = (filter as string).split(andOrPattern).flatMap(x => x.includes(target) ? [] : x);
  otherFilters.push(`${otherFilters.length ? `${andOr} ` : ''}${replacement}`);
  return otherFilters.join(' ');
}

/** Check whether the filter has the specified target field. */
export function hasFilter(filter: string | string[] | undefined, target: string) {
  if (!filter) return false;

  return (filter as string).split(andOrPattern).some(x => x.startsWith(target));
}

/** Check whether a string is UUID */
export function isUUID(str: string): boolean {
  if (str.length !== 36) return false;
  
  for (let i = 0; i < str.length; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      if (str[i] !== '-') return false;
    } else {
      const charCode = str.charCodeAt(i);
      const isDigit = charCode >= 48 && charCode <= 57; // 0-9
      const isLowerHex = charCode >= 97 && charCode <= 102; // a-f
      const isUpperHex = charCode >= 65 && charCode <= 70; // A-F
      if (!isDigit && !isLowerHex && !isUpperHex) return false;
    }
  }
  
  return true;
}