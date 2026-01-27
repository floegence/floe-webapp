import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { WidgetRegistryProvider } from '../src/context/WidgetRegistry';
import { DeckProvider, useDeck } from '../src/context/DeckContext';

describe('DeckContext.duplicateLayout', () => {
  it('should deep-clone widget state so layouts do not share references', () => {
    function Harness() {
      const deck = useDeck();

      const original = deck.createLayout('Original', [
        {
          id: 'w1',
          type: 'custom',
          position: { col: 0, row: 0, colSpan: 4, rowSpan: 4 },
          state: { a: 1 },
        },
      ]);

      const copy = deck.duplicateLayout(original.id, 'Copy');
      expect(copy).toBeDefined();

      const copiedWidgetId = copy!.widgets[0]!.id;
      deck.updateWidgetState(copiedWidgetId, 'a', 2);

      const originalWidget = deck.layouts().find((l) => l.id === original.id)!.widgets.find((w) => w.id === 'w1')!;
      const copiedWidget = deck.layouts().find((l) => l.id === copy!.id)!.widgets.find((w) => w.id === copiedWidgetId)!;

      expect(originalWidget.state).not.toBe(copiedWidget.state);
      expect(originalWidget.state?.a).toBe(1);
      expect(copiedWidget.state?.a).toBe(2);

      return null;
    }

    renderToString(() => (
      <WidgetRegistryProvider>
        <DeckProvider>
          <Harness />
        </DeckProvider>
      </WidgetRegistryProvider>
    ));
  });
});
