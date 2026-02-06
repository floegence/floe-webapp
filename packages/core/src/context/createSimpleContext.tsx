import { createContext, useContext, type JSX } from 'solid-js';

/**
 * Factory for creating simple context providers
 * Follows the pattern from opencode implementation
 */
export function createSimpleContext<T>(options: { name: string; init: () => T }) {
  const Context = createContext<T>();

  function Provider(props: { children: JSX.Element }) {
    const value = options.init();
    return <Context.Provider value={value}>{props.children}</Context.Provider>;
  }

  function useOptional(): T | undefined {
    return useContext(Context);
  }

  function use(): T {
    const ctx = useOptional();
    if (!ctx) {
      throw new Error(`${options.name}Context not found. Make sure to wrap your component with ${options.name}Provider.`);
    }
    return ctx;
  }

  function has(): boolean {
    return useOptional() !== undefined;
  }

  return { Provider, use, useOptional, has, Context };
}
