// @vitest-environment jsdom
import { createRoot, createSignal } from 'solid-js';
import { expect, it, vi } from 'vitest';
vi.mock('solid-js', () => import('solid-js/dist/solid.js'));
import { createTextSearch } from '../src/components/ui/textSearch';

it('delegates queries and navigation to the active document engine', () => {
  let dispose!: () => void;
  const [active, setActive] = createSignal(true);
  const [state] = createSignal({ current: 2, total: 4 });
  const engine = { state, search: vi.fn(), clear: vi.fn() };
  const search = createRoot(cleanup => { dispose = cleanup; return createTextSearch({ active, engine }); });
  search.show(); search.setQuery('literal [x]');
  expect(engine.search).toHaveBeenLastCalledWith('literal [x]', 0);
  search.next(); expect(engine.search).toHaveBeenLastCalledWith('literal [x]', 1);
  search.previous(); expect(engine.search).toHaveBeenLastCalledWith('literal [x]', -1);
  expect(search.current()).toBe(2); expect(search.count()).toBe(4);
  setActive(false); engine.search.mockClear(); search.next(); expect(engine.search).not.toHaveBeenCalled();
  expect(engine.clear).toHaveBeenCalled();
  setActive(true); expect(engine.search).toHaveBeenLastCalledWith('literal [x]', 0);
  search.close(); expect(search.open()).toBe(false); dispose();
});
