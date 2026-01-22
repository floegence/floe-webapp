import { createSignal, type Accessor, type Component } from 'solid-js';
import { createSimpleContext } from './createSimpleContext';

/**
 * Widget type definition for the dashboard
 */
export interface WidgetDefinition {
  type: string;
  name: string;
  icon?: Component<{ class?: string }>;
  category: 'sidebar' | 'metrics' | 'terminal' | 'custom';
  component: Component<WidgetProps>;
  minColSpan?: number; // default: 2
  minRowSpan?: number; // default: 2
  defaultColSpan?: number; // default: 4
  defaultRowSpan?: number; // default: 3
}

/**
 * Props passed to widget components
 */
export interface WidgetProps {
  widgetId: string;
  config?: Record<string, unknown>;
  isEditMode?: boolean;
}

export interface WidgetRegistryValue {
  register: (widget: WidgetDefinition) => void;
  registerAll: (widgets: WidgetDefinition[]) => void;
  unregister: (type: string) => void;
  widgets: Accessor<Map<string, WidgetDefinition>>;
  getWidget: (type: string) => WidgetDefinition | undefined;
  getWidgetsByCategory: (category: WidgetDefinition['category']) => WidgetDefinition[];
}

export const { Provider: WidgetRegistryProvider, use: useWidgetRegistry } =
  createSimpleContext<WidgetRegistryValue>({
    name: 'WidgetRegistry',
    init: createWidgetRegistry,
  });

export function createWidgetRegistry(): WidgetRegistryValue {
  const [widgets, setWidgets] = createSignal<Map<string, WidgetDefinition>>(new Map());

  const register = (widget: WidgetDefinition) => {
    setWidgets((prev) => new Map(prev).set(widget.type, widget));
  };

  const registerAll = (widgetList: WidgetDefinition[]) => {
    setWidgets((prev) => {
      const next = new Map(prev);
      widgetList.forEach((w) => next.set(w.type, w));
      return next;
    });
  };

  const unregister = (type: string) => {
    setWidgets((prev) => {
      const next = new Map(prev);
      next.delete(type);
      return next;
    });
  };

  const getWidget = (type: string) => widgets().get(type);

  const getWidgetsByCategory = (category: WidgetDefinition['category']) => {
    const result: WidgetDefinition[] = [];
    for (const widget of widgets().values()) {
      if (widget.category === category) {
        result.push(widget);
      }
    }
    return result;
  };

  return {
    register,
    registerAll,
    unregister,
    widgets,
    getWidget,
    getWidgetsByCategory,
  };
}
