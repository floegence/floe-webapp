// @vitest-environment jsdom
import { createSignal, onCleanup } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, expect, it, vi } from 'vitest';
import { useOverlayMask } from '../src/hooks';
import { KeyedFor } from '../src/components/ui/KeyedFor';
import { Stepper, type StepItem } from '../src/components/ui/Stepper';
import { Tabs } from '../src/components/ui/Tabs';
it('retains the selected tab node and focus across fresh observations', () => {
  const [items, setItems] = createSignal([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]);
  dispose = render(() => <Tabs items={items()} activeId="b" />, document.body);
  const tab = document.querySelectorAll<HTMLElement>('[role="tab"]')[1]!; tab.focus();
  setItems([{ id: 'a', label: 'new A' }, { id: 'b', label: 'new B' }]);
  expect(document.querySelectorAll('[role="tab"]')[1]).toBe(tab);
  expect(tab.textContent).toContain('new B'); expect(document.activeElement).toBe(tab);
  expect(tab.getAttribute('aria-selected')).toBe('true');
});
it('exports overlay ownership through the public hooks barrel', () => { expect(useOverlayMask).toBeTypeOf('function'); });
let dispose: (() => void) | undefined;
afterEach(() => { dispose?.(); document.body.replaceChildren(); });
it('keeps the last item readable during removed owner cleanup', () => {
  const [items, setItems] = createSignal([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]);
  const cleaned = vi.fn();
  dispose = render(() => <KeyedFor each={items()} by={item => item.id}>{item => {
    onCleanup(() => cleaned(item().id));
    return <button>{item().label}</button>;
  }}</KeyedFor>, document.body);
  expect(() => setItems([{ id: 'b', label: 'new B' }])).not.toThrow();
  expect(cleaned).toHaveBeenCalledExactlyOnceWith('a');
});
it('retains controlled selection after a user choice and equivalent item updates', async () => {
  const [items, setItems] = createSignal([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]);
  const [active, setActive] = createSignal('a');
  dispose = render(() => <Tabs items={items()} activeId={active()} onChange={setActive} />, document.body);
  const tab = document.querySelectorAll<HTMLElement>('[role=tab]')[1]!; tab.click();
  await new Promise(resolve => setTimeout(resolve, 50));
  // eslint-disable-next-line solid/reactivity -- assertion reads the committed result.
  expect(active()).toBe('b'); tab.focus();
  setItems([{ id: 'a', label: 'new A' }, { id: 'b', label: 'new B' }]);
  expect(tab.getAttribute('aria-selected')).toBe('true'); expect(document.activeElement).toBe(tab);
});
it('retains focused steps while replacing observations and invokes the current action', () => {
  const [steps, setSteps] = createSignal<StepItem[]>([{ id: 'connect', label: 'Connect' }, { id: 'confirm', label: 'Confirm' }]);
  const clicked = vi.fn();
  dispose = render(() => <Stepper steps={steps()} currentStep={1} onStepClick={clicked} />, document.body);
  const original = document.querySelector<HTMLElement>('[role="button"]')!;
  original.focus();
  setSteps([{ id: 'connect', label: 'Reconnect' }, { id: 'confirm', label: 'Confirm' }]);
  expect(document.querySelector('[role="button"]')).toBe(original);
  expect(document.activeElement).toBe(original);
  original.click();
  expect(clicked).toHaveBeenLastCalledWith(0, { id: 'connect', label: 'Reconnect' });
  setSteps([{ id: 'connect', label: 'Unavailable', disabled: true }, { id: 'confirm', label: 'Confirm' }]);
  original.click();
  expect(clicked).toHaveBeenCalledTimes(1);
});

it('retains editable nodes across replacement and reordering while disposing removed keys', () => {
  const [items, setItems] = createSignal([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]);
  dispose = render(() => <KeyedFor each={items()} by={item => item.id}>{(item, index) =>
    <label data-id={item().id}><span>{index()}:{item().label}</span><input /></label>
  }</KeyedFor>, document.body);
  const a = document.querySelector('label')!;
  const input = a.querySelector('input')!;
  input.value = 'draft'; input.focus(); input.setSelectionRange(1, 3);
  setItems([{ id: 'b', label: 'new B' }, { id: 'a', label: 'new A' }]);
  expect(document.querySelectorAll('label')[1]).toBe(a);
  expect(a.textContent).toBe('1:new A');
  expect(input.value).toBe('draft');
  expect([input.selectionStart, input.selectionEnd]).toEqual([1, 3]);
  setItems([{ id: 'a', label: 'A' }]);
  expect(document.querySelectorAll('label')).toHaveLength(1);
  expect(document.querySelector('label')).toBe(a);
});
