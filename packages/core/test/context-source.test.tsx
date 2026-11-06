// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContextSourceRegistry } from '../src/components/ui/contextSource';
afterEach(() => document.body.replaceChildren());
function surface() {
  const element = document.createElement('section');
  element.tabIndex = 0;
  element.getBoundingClientRect = () => ({ x: 12, y: 24, width: 300, height: 200 }) as DOMRect;
  document.body.append(element);
  return element;
}
describe('context source ownership', () => {
  it('keeps the exact instance across menu focus and reads only on capture', () => {
    const registry = createContextSourceRegistry(document);
    const first = surface();
    const second = surface();
    const menu = document.createElement('button');
    document.body.append(menu);
    const read = vi.fn(() => ({ directory: '/second' }));
    registry.register({ id: 'one', element: first, read: () => ({ directory: '/first' }) });
    registry.register({ id: 'two', element: second, read });
    second.focus();
    menu.focus();
    expect(read).not.toHaveBeenCalled();
    expect(registry.capture()?.value).toEqual({ directory: '/second' });
    expect(registry.capture(first)?.id).toBe('one');
    second.remove();
    expect(registry.capture()).toBeUndefined();
    registry.dispose();
  });
  it('retains selected input text through an outside trigger without reading passwords', () => {
    const registry = createContextSourceRegistry(document);
    const root = surface();
    const input = document.createElement('textarea');
    input.value = 'selected text';
    root.append(input);
    registry.register({ id: 'editor', element: root, read: () => null });
    input.focus();
    input.setSelectionRange(0, 8);
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    trigger.focus();
    expect(registry.capture()?.selection).toBe('selected');
    const password = document.createElement('input');
    password.type = 'password';
    password.value = 'secret';
    root.append(password);
    password.focus();
    password.select();
    expect(registry.capture()?.selection).toBe('');
    registry.dispose();
  });
  it('retains reading selection when body owns focus and rejects hidden sources', () => {
    const registry = createContextSourceRegistry(document);
    const root = surface();
    root.removeAttribute('tabindex');
    root.textContent = 'Read this selected paragraph';
    registry.register({ id: 'reading', element: root, read: () => null });
    root.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    const range = document.createRange();
    range.selectNodeContents(root);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    selection.removeAllRanges();
    trigger.focus();
    expect(registry.capture()?.selection).toBe('Read this selected paragraph');
    root.setAttribute('inert', '');
    expect(registry.capture()).toBeUndefined();
    registry.dispose();
  });
  it('uses the innermost source and cannot retire its replacement', () => {
    const registry = createContextSourceRegistry(document);
    const parent = surface();
    const child = surface();
    parent.append(child);
    registry.register({ id: 'parent', element: parent, read: () => 'parent' });
    const remove = registry.register({ id: 'child', element: child, read: () => 'old' });
    registry.register({ id: 'child', element: child, read: () => 'new' });
    remove();
    child.focus();
    expect(registry.capture()?.value).toBe('new');
    registry.dispose();
  });
});

describe('explicit context targets', () => {
  it('does not substitute active content for an outside target or a disabled inner owner', () => {
    const registry = createContextSourceRegistry(document);
    const parent = surface();
    const child = surface();
    parent.append(child);
    registry.register({ id: 'parent', element: parent, read: () => 'parent' });
    registry.register({ id: 'child', element: child, enabled: () => false, read: () => 'child' });
    parent.focus();
    expect(registry.captureTarget(child)).toBeUndefined();
    expect(registry.captureTarget(document.body)).toBeUndefined();
    registry.dispose();
  });
  it('passes the concrete target and excludes cached selection from explicit capture', () => {
    const registry = createContextSourceRegistry(document);
    const root = surface();
    const input = document.createElement('textarea');
    root.append(input);
    input.value = 'old selection';
    const read = vi.fn((target) => ({ target }));
    registry.register({ id: 'surface', element: root, read });
    input.focus();
    input.select();
    expect(registry.captureTarget(root)?.selection).toBe('');
    expect(read).toHaveBeenLastCalledWith(root);
    expect(registry.captureTarget(input, 'owned selection')?.selection).toBe('owned selection');
    registry.dispose();
  });
  it('resolves navigation without making it the active reading source', () => {
    const registry = createContextSourceRegistry(document);
    const page = surface();
    const nav = surface();
    registry.register({ id: 'page', element: page, read: () => 'page' });
    registry.register({
      id: 'nav',
      element: nav,
      read: () => 'navigation',
      activateOnInteraction: false,
    });
    page.focus();
    nav.focus();
    expect(registry.capture()?.value).toBe('page');
    expect(registry.captureTarget(nav)?.value).toBe('navigation');
    registry.dispose();
  });
  it('rejects a native selection crossing independently registered owners', () => {
    const registry = createContextSourceRegistry(document);
    const first = surface();
    first.textContent = 'first';
    const second = surface();
    second.textContent = 'second';
    registry.register({ id: 'first', element: first, read: () => 'first' });
    registry.register({ id: 'second', element: second, read: () => 'second' });
    const range = document.createRange();
    range.setStart(first.firstChild!, 0);
    range.setEnd(second.firstChild!, 6);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    expect(registry.captureTarget(first, selection.toString())?.selection).toBe('');
    range.selectNodeContents(first);
    selection.removeAllRanges();
    selection.addRange(range);
    expect(registry.captureTarget(first, selection.toString())?.selection).toBe('first');
    registry.dispose();
  });
});
