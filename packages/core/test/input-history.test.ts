import { describe, expect, it, vi } from 'vitest';
import { createInputHistoryController, type InputHistoryContext } from '../src/components/chat/input/createInputHistoryController';

function harness() {
  let context: InputHistoryContext = {
    scope: 'thread-a', value: '', revision: 0, enabled: true,
    entries: [{ id: 'first', text: '第一行\n第二行 🙂' }, { id: 'second', text: 'latest' }],
  };
  const editor = {
    value: '', selectionStart: 0, selectionEnd: 0, disabled: false, readOnly: false,
    setSelectionRange(start: number, end: number) { this.selectionStart = start; this.selectionEnd = end; },
  };
  const changed = vi.fn();
  const controller = createInputHistoryController({
    read: () => context,
    write: (value) => {
      context = { ...context, value, revision: Number(context.revision) + 1 };
      editor.value = value;
      controller.synchronize();
    },
    onChange: changed,
  });
  const update = (patch: Partial<InputHistoryContext>) => {
    context = { ...context, ...patch };
    editor.value = context.value;
    controller.synchronize();
  };
  const press = (key: string, fields: Partial<KeyboardEvent> = {}) => {
    const event = { key, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...fields };
    const handled = controller.handleKeyDown(event as unknown as KeyboardEvent, editor);
    expect(event.preventDefault).toHaveBeenCalledTimes(handled ? 1 : 0);
    return handled;
  };
  return { controller, editor, press, update, changed, context: () => context };
}

describe('input history', () => {
  it('browses from empty through both ends without wrapping or sending', () => {
    const h = harness();
    expect(h.press('ArrowDown')).toBe(false);
    expect(h.press('ArrowUp')).toBe(true);
    expect(h.context().value).toBe('latest');
    expect(h.editor.selectionStart).toBe(6);
    expect(h.controller.state()).toEqual({ position: 1, total: 2 });
    h.press('ArrowUp');
    expect(h.context().value).toBe('第一行\n第二行 🙂');
    expect(h.editor.selectionStart).toBe(h.context().value.length);
    h.press('ArrowUp');
    expect(h.context().value).toBe('第一行\n第二行 🙂');
    h.press('ArrowDown');
    expect(h.context().value).toBe('latest');
    h.press('ArrowDown');
    expect(h.context().value).toBe('');
    expect(h.controller.state()).toBeNull();
    expect(h.press('ArrowDown')).toBe(false);
  });

  it.each(['draft', ' ', '\n'])('preserves a nonempty draft %j', (value) => {
    const h = harness(); h.update({ value });
    expect(h.press('ArrowUp')).toBe(false);
    expect(h.context().value).toBe(value);
  });

  it('does nothing without usable entries and supports a single entry', () => {
    const h = harness(); h.update({ entries: [] });
    expect(h.press('ArrowUp')).toBe(false);
    h.update({ entries: [{ id: 'empty', text: '' }, { id: 'one', text: 'one' }] });
    h.press('ArrowUp');
    expect(h.controller.state()).toEqual({ position: 1, total: 1 });
    h.press('ArrowDown'); expect(h.context().value).toBe('');
  });

  it('restores empty on Escape only while browsing', () => {
    const h = harness(); h.press('ArrowUp'); h.press('Escape');
    expect(h.context().value).toBe('');
    expect(h.changed).toHaveBeenLastCalledWith(null, 'navigate');
    h.update({ value: 'edited' });
    expect(h.press('Escape')).toBe(false);
    expect(h.context().value).toBe('edited');
  });

  it.each(['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', 'Tab', 'Backspace', 'Delete', 'a'])('ends browsing before %s without consuming it', (key) => {
    const h = harness(); h.press('ArrowUp');
    expect(h.press(key)).toBe(false);
    expect(h.controller.state()).toBeNull();
    expect(h.context().value).toBe('latest');
  });

  it.each([{ isComposing: true }, { keyCode: 229 }, { shiftKey: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { defaultPrevented: true }])('defers to composition, modifiers and handled events %j', (fields) => {
    const h = harness();
    expect(h.press('ArrowUp', fields)).toBe(false);
    expect(h.context().value).toBe('');
  });

  it('respects selections and unavailable editors', () => {
    const h = harness(); h.press('ArrowUp');
    h.editor.selectionStart = 0;
    expect(h.press('ArrowUp')).toBe(false);
    expect(h.controller.state()).toBeNull();
    h.update({ value: '' }); h.editor.setSelectionRange(0, 0);
    h.editor.readOnly = true; expect(h.press('ArrowUp')).toBe(false);
    h.editor.readOnly = false; h.editor.disabled = true; expect(h.press('ArrowUp')).toBe(false);
    h.editor.disabled = false; h.update({ enabled: false }); expect(h.press('ArrowUp')).toBe(false);
  });

  it('freezes candidates for one browsing session and keeps identical texts distinct', () => {
    const h = harness();
    h.update({ entries: [{ id: 'a', text: 'same' }, { id: 'b', text: 'same' }] });
    h.press('ArrowUp');
    h.update({ entries: [...h.context().entries, { id: 'c', text: 'new' }] });
    h.press('ArrowUp'); expect(h.controller.state()).toEqual({ position: 2, total: 2 });
    h.press('ArrowDown'); h.press('ArrowDown'); h.press('ArrowUp');
    expect(h.context().value).toBe('new');
  });

  it.each(['scope', 'revision', 'entries', 'value', 'enabled'] as const)('abandons stale navigation on changed %s without overwriting the draft', (field) => {
    const h = harness(); h.press('ArrowUp');
    const patches = { scope: { scope: 'thread-b' }, revision: { revision: 42 }, entries: { entries: [] }, value: { value: 'external draft' }, enabled: { enabled: false } };
    h.update(patches[field]);
    expect(h.controller.state()).toBeNull();
    expect(h.context().value).toBe(field === 'value' ? 'external draft' : 'latest');
    expect(h.press('ArrowDown')).toBe(false);
  });

  it('resets on host input, blur or hide without discarding recalled text', () => {
    const h = harness(); h.press('ArrowUp'); h.controller.reset();
    expect(h.context().value).toBe('latest');
    expect(h.press('ArrowUp')).toBe(false);
  });
});
