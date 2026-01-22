import { For, Show, createSignal } from 'solid-js';
import { cn } from '../../utils/cn';
import { useDeck } from '../../context/DeckContext';
import { useWidgetRegistry, type WidgetDefinition } from '../../context/WidgetRegistry';
import { Plus, X, ChevronRight } from '../icons';
import { Button } from '../ui/Button';

export interface WidgetPaletteProps {
  class?: string;
}

/**
 * Slide-out panel for adding widgets to the deck
 */
export function WidgetPalette(props: WidgetPaletteProps) {
  const deck = useDeck();
  const widgetRegistry = useWidgetRegistry();

  const [isOpen, setIsOpen] = createSignal(false);
  const [expandedCategory, setExpandedCategory] = createSignal<string | null>(null);

  const categories: Array<{ key: WidgetDefinition['category']; label: string }> = [
    { key: 'metrics', label: 'Metrics' },
    { key: 'terminal', label: 'Terminal' },
    { key: 'custom', label: 'Custom' },
  ];

  const handleAddWidget = (type: string) => {
    deck.addWidget(type);
    setIsOpen(false);
  };

  const toggleCategory = (key: string) => {
    setExpandedCategory((prev) => (prev === key ? null : key));
  };

  return (
    <Show when={deck.editMode()}>
      {/* Toggle button */}
      <Show when={!isOpen()}>
        <Button
          variant="outline"
          size="sm"
          class={cn('fixed bottom-4 right-4 z-50 shadow-lg', props.class)}
          onClick={() => setIsOpen(true)}
        >
          <Plus class="w-4 h-4 mr-1" />
          Add Widget
        </Button>
      </Show>

      {/* Palette panel */}
      <div
        class={cn(
          'fixed right-0 top-0 bottom-0 w-72 bg-background border-l border-border shadow-xl z-50',
          'transform transition-transform duration-200',
          isOpen() ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div class="flex items-center justify-between p-3 border-b border-border">
          <h2 class="text-sm font-semibold">Add Widget</h2>
          <button
            class="p-1 rounded hover:bg-muted transition-colors cursor-pointer"
            onClick={() => setIsOpen(false)}
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div class="p-2 overflow-y-auto h-[calc(100%-48px)]">
          <For each={categories}>
            {(category) => {
              const widgets = () => widgetRegistry.getWidgetsByCategory(category.key);
              const isExpanded = () => expandedCategory() === category.key;
              const hasWidgets = () => widgets().length > 0;

              return (
                <Show when={hasWidgets()}>
                  <div class="mb-2">
                    {/* Category header */}
                    <button
                      class="w-full flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors text-left cursor-pointer"
                      onClick={() => toggleCategory(category.key)}
                    >
                      <ChevronRight
                        class={cn(
                          'w-4 h-4 text-muted-foreground transition-transform',
                          isExpanded() && 'rotate-90'
                        )}
                      />
                      <span class="text-sm font-medium">{category.label}</span>
                      <span class="ml-auto text-xs text-muted-foreground">{widgets().length}</span>
                    </button>

                    {/* Widget list */}
                    <Show when={isExpanded()}>
                      <div class="ml-4 mt-1 space-y-1">
                        <For each={widgets()}>
                          {(widget) => (
                            <button
                              class="w-full flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors text-left cursor-pointer"
                              onClick={() => handleAddWidget(widget.type)}
                            >
                              <Show when={widget.icon} fallback={<div class="w-4 h-4" />}>
                                {(Icon) => {
                                  const IconComponent = Icon();
                                  return <IconComponent class="w-4 h-4 text-muted-foreground" />;
                                }}
                              </Show>
                              <span class="text-sm">{widget.name}</span>
                            </button>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </Show>
              );
            }}
          </For>

          {/* Empty state */}
          <Show when={widgetRegistry.widgets().size === 0}>
            <div class="text-center text-muted-foreground text-sm py-8">
              No widgets registered
            </div>
          </Show>
        </div>
      </div>

      {/* Backdrop */}
      <Show when={isOpen()}>
        <div
          class="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      </Show>
    </Show>
  );
}
