// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { Tabs } from '../src/components/ui/Tabs';

let dispose: (() => void) | undefined;
afterEach(() => { dispose?.(); document.body.innerHTML = ''; vi.restoreAllMocks(); });
function setup() {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  const host = document.createElement('div'); document.body.append(host);
  const [items, setItems] = createSignal(['a', 'b', 'c'].map(id => ({ id, label: id })));
  const changed = vi.fn(); const ordered = vi.fn((ids: string[]) => setItems(current => ids.map(id => current.find(item => item.id === id)!)));
  dispose = render(() => <Tabs items={items()} activeId="b" onChange={changed} onReorder={ordered} />, host);
  const tabs = [...host.querySelectorAll<HTMLElement>('[role="tab"]')];
  tabs.forEach((tab, index) => { tab.getBoundingClientRect = () => ({ left: index * 100, width: 100, right: index * 100 + 100, top: 0, height: 24, bottom: 24, x: index * 100, y: 0, toJSON() {} }); });
  return { host, tabs, items, setItems, changed, ordered };
}
function pointer(target: EventTarget, type: string, x: number, buttons = 1) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, buttons, clientX: x, clientY: 12 });
  Object.defineProperties(event, { pointerId: { value: 21 }, pointerType: { value: 'mouse' } });
  target.dispatchEvent(event);
}
it('commits pointer sorting once while retaining node identity and active selection', () => {
  const view = setup();
  pointer(view.tabs[0], 'pointerdown', 20);
  pointer(document, 'pointermove', 290);
  expect(view.ordered).not.toHaveBeenCalled();
  expect(view.tabs[0].dataset.floeTabDragging).toBe('true');
  pointer(document, 'pointerup', 290, 0);
  expect(view.items().map(item => item.id)).toEqual(['b', 'c', 'a']);
  expect(view.host.querySelectorAll('[role="tab"]')[2]).toBe(view.tabs[0]);
  view.tabs[0].click();
  expect(view.changed).not.toHaveBeenCalled();
  expect(view.tabs[1].getAttribute('aria-selected')).toBe('true');
  expect(view.tabs[0].style.userSelect).toBe('none');
});
it.each(['pointercancel', 'escape', 'blur', 'removed'])('cancels sorting on %s without leaking pointer ownership', reason => {
  const view = setup();
  pointer(view.tabs[0], 'pointerdown', 20); pointer(document, 'pointermove', 290);
  if (reason === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  else if (reason === 'blur') window.dispatchEvent(new Event('blur'));
  else if (reason === 'removed') view.setItems(current => current.slice(1));
  else pointer(document, 'pointercancel', 290, 0);
  pointer(document, 'pointerup', 290, 0);
  expect(view.ordered).not.toHaveBeenCalled();
  expect(view.host.querySelector('[data-floe-tab-dragging]')).toBeNull();
});
it('offers keyboard sorting while preserving focus and active selection', () => {
  const view = setup(); view.tabs[1].focus();
  view.tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, shiftKey: true, bubbles: true }));
  expect(view.items().map(item => item.id)).toEqual(['a', 'c', 'b']);
  expect(document.activeElement).toBe(view.tabs[1]);
  expect(view.changed).not.toHaveBeenCalled();
});

it('moves the held face with the pointer and shifts neighbors before committing', async () => {
  const view = setup();
  pointer(view.tabs[0], 'pointerdown', 20);
  pointer(document, 'pointermove', 190);
  await vi.waitFor(() => expect(view.tabs[0].style.getPropertyValue('--floe-tab-offset')).toBe('170px'));
  expect(view.tabs[1].style.getPropertyValue('--floe-tab-offset')).toBe('-100px');
  expect(view.tabs[0].dataset.floeTabMotion).toBe('dragging');
  expect(view.items().map(item => item.id)).toEqual(['a', 'b', 'c']);
  pointer(document, 'pointercancel', 190, 0);
  expect(view.ordered).not.toHaveBeenCalled();
  await vi.waitFor(() => expect(view.tabs[0].hasAttribute('data-floe-tab-motion')).toBe(false));
  expect(view.tabs[0].style.getPropertyValue('--floe-tab-offset')).toBe('');
});

it('allows a wide first tab to settle after a narrower last tab', () => {
  const view = setup();
  const widths = [180, 100, 80]; let left = 0;
  view.tabs.forEach((tab, index) => {
    const x = left; const width = widths[index]; left += width;
    tab.getBoundingClientRect = () => ({ left: x, width, right: x + width, top: 0, height: 24, bottom: 24, x, y: 0, toJSON() {} });
  });
  pointer(view.tabs[0], 'pointerdown', 20); pointer(document, 'pointermove', 350);
  pointer(document, 'pointerup', 350, 0);
  expect(view.items().map(item => item.id)).toEqual(['b', 'c', 'a']);
});

it('lets a host own activation timing for pointer and keyboard requests', () => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  const host = document.createElement('div'); document.body.append(host);
  const [active, setActive] = createSignal('a');
  const changed = vi.fn((id: string) => setActive(id));
  dispose = render(() => <Tabs items={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C', disabled: true }]}
    activeId={active()} onChange={changed} activationTiming="immediate" features={{ indicator: { mode: 'slider' } }} />, host);
  const tabs = [...host.querySelectorAll<HTMLElement>('[role="tab"]')];
  tabs[1].click();
  expect(changed).toHaveBeenLastCalledWith('b');
  expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  tabs[2].click();
  expect(changed).toHaveBeenCalledTimes(1);
  tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  expect(changed).toHaveBeenLastCalledWith('a');
  expect(document.activeElement).toBe(tabs[0]);
  expect(tabs[0].getAttribute('aria-selected')).toBe('true');
});
