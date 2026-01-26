import { createContext, useContext, untrack, type Accessor, type JSX } from 'solid-js';

/**
 * Widget state context value
 * Provides scoped state management for individual widget instances
 */
export interface WidgetStateContextValue {
  /** Current widget ID */
  widgetId: string;
  /** Get a state value by key */
  get: <T>(key: string) => T | undefined;
  /** Set a state value by key */
  set: <T>(key: string, value: T) => void;
  /** Get all state as a record */
  getAll: () => Record<string, unknown>;
}

const WidgetStateContext = createContext<WidgetStateContextValue>();

export interface WidgetStateProviderProps {
  widgetId: string;
  state: Accessor<Record<string, unknown>>;
  onStateChange: (key: string, value: unknown) => void;
  children: JSX.Element;
}

/**
 * Provider that scopes state to a specific widget instance
 */
export function WidgetStateProvider(props: WidgetStateProviderProps) {
  // Capture widgetId at creation time - it's stable for the widget's lifetime
  // Using untrack to explicitly indicate this is intentionally not reactive
  const widgetId = untrack(() => props.widgetId);

  const value: WidgetStateContextValue = {
    widgetId,
    get: <T,>(key: string) => props.state()[key] as T | undefined,
    set: <T,>(key: string, value: T) => props.onStateChange(key, value),
    getAll: () => props.state(),
  };

  return (
    <WidgetStateContext.Provider value={value}>
      {props.children}
    </WidgetStateContext.Provider>
  );
}

/**
 * Access the current widget's state context
 * Must be used within a WidgetStateProvider
 */
export function useWidgetStateContext(): WidgetStateContextValue {
  const ctx = useContext(WidgetStateContext);
  if (!ctx) {
    throw new Error('useWidgetStateContext must be used within a WidgetStateProvider');
  }
  return ctx;
}

/**
 * Hook to manage a single piece of widget state
 * Automatically scoped to the current widget instance
 *
 * @example
 * ```tsx
 * function FileBrowser() {
 *   const [viewMode, setViewMode] = useWidgetState('viewMode', 'list');
 *   return <div>{viewMode()}</div>;
 * }
 * ```
 */
export function useWidgetState<T>(
  key: string,
  defaultValue: T
): [Accessor<T>, (value: T) => void] {
  const ctx = useWidgetStateContext();

  const getter: Accessor<T> = () => {
    const value = ctx.get<T>(key);
    return value !== undefined ? value : defaultValue;
  };

  const setter = (value: T) => {
    ctx.set(key, value);
  };

  return [getter, setter];
}

/**
 * Hook to access the current widget's ID
 */
export function useCurrentWidgetId(): string {
  return useWidgetStateContext().widgetId;
}
