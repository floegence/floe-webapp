import { onMount, type Component } from 'solid-js';
import {
  DeckGrid,
  DeckTopBar,
  useDeckDrag,
  useWidgetRegistry,
  type WidgetDefinition,
  MetricsWidget,
  TerminalWidget,
  Terminal,
  LayoutDashboard,
} from '@floegence/floe-webapp-core';

/**
 * Demo deck page showing the Grafana-style layout editor
 */
export const DeckPage: Component = () => {
  const widgetRegistry = useWidgetRegistry();

  // Initialize drag handling
  useDeckDrag();

  // Register built-in widgets on mount
  onMount(() => {
    const widgets: WidgetDefinition[] = [
      {
        type: 'metrics',
        name: 'Metrics',
        icon: LayoutDashboard,
        category: 'metrics',
        component: MetricsWidget,
        minColSpan: 6,
        minRowSpan: 4,
        defaultColSpan: 12,
        defaultRowSpan: 6,
      },
      {
        type: 'terminal',
        name: 'Terminal',
        icon: Terminal,
        category: 'terminal',
        component: TerminalWidget,
        minColSpan: 8,
        minRowSpan: 4,
        defaultColSpan: 12,
        defaultRowSpan: 8,
      },
    ];

    widgetRegistry.registerAll(widgets);
  });

  return (
    <div class="h-full flex flex-col bg-background">
      <DeckTopBar />
      <div class="flex-1 min-h-0 overflow-hidden">
        <DeckGrid />
      </div>
    </div>
  );
};
