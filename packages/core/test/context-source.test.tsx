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
