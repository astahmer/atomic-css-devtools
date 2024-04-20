export type AnyFunction = (...args: any[]) => any;
export type AnyElementFunction = (element: HTMLElement, ...args: any[]) => any;
export type WithoutFirst<T extends AnyFunction> =
  Parameters<T> extends [any, ...infer R] ? R : never;
