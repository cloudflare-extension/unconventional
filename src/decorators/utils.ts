/**
 * Returns the target name
 * if target.constructor.name is "Function", return "target.name", otherwise "target.constructor.name"
 * @param target The target to determine
 */
export function getName(target: any): any {
  return target.constructor?.name === 'Function' ? target.name : target.constructor.name;
}