// @vitest-environment jsdom
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, expect, it } from 'vitest';
import { RadioGroup, RadioOption } from '../src/components/ui/Radio';
import { Checkbox } from '../src/components/ui/Checkbox';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  document.body.innerHTML = '';
});

it('assigns one stable native name per generated radio group', () => {
  const [value, setValue] = createSignal('a');
  dispose = render(
    () => (
      <>
        <RadioGroup value={value()} onChange={setValue}>
          <RadioOption value="a" />
          <RadioOption value="b" />
        </RadioGroup>
        <RadioGroup value="c">
          <RadioOption value="c" />
        </RadioGroup>
      </>
    ),
    document.body
  );
  const inputs = [...document.querySelectorAll('input')];
  expect(inputs[0].name).toBe(inputs[1].name);
  expect(inputs[0].name).not.toBe(inputs[2].name);
  const names = inputs.map((input) => input.name);
  setValue('b');
  expect(inputs.map((input) => input.name)).toEqual(names);
  expect(inputs[1].checked).toBe(true);
  expect(inputs[0].checked).toBe(false);
});

it('preserves a supplied form name and stable option IDs', () => {
  const [name, setName] = createSignal('environment');
  dispose = render(
    () => (
      <RadioGroup name={name()} value="a">
        <RadioOption value="a" id="local-env" />
        <RadioOption value="b" />
      </RadioGroup>
    ),
    document.body
  );
  const inputs = [...document.querySelectorAll('input')];
  const ids = inputs.map((input) => input.id);
  expect(inputs.map((input) => input.name)).toEqual(['environment', 'environment']);
  setName('target');
  expect(inputs.map((input) => input.name)).toEqual(['target', 'target']);
  expect(inputs.map((input) => input.id)).toEqual(ids);
  expect(ids[0]).toBe('local-env');
});

it('keeps mixed visuals, native state, ARIA and consumer refs in agreement', () => {
  const [mixed, setMixed] = createSignal(true);
  const refs: HTMLInputElement[] = [];
  dispose = render(
    () => (
      <Checkbox
        indeterminate={mixed()}
        checked={false}
        ref={(el) => {
          refs.push(el);
        }}
      />
    ),
    document.body
  );
  const input = document.querySelector('input')!;
  expect(refs).toEqual([input]);
  expect(input.indeterminate).toBe(true);
  expect(input.getAttribute('aria-checked')).toBe('mixed');
  setMixed(false);
  expect(input.indeterminate).toBe(false);
  expect(input.getAttribute('aria-checked')).toBe('false');
});

it('keeps one native checkbox and indicator while requesting each controlled change once', () => {
  const [checked, setChecked] = createSignal(false);
  const changes: boolean[] = [];
  dispose = render(() => <Checkbox id="stable-choice" label="Choice" checked={checked()}
    onChange={value => { changes.push(value); setChecked(value); }} />, document.body);
  const input = document.querySelector('input')!;
  const face = document.querySelector('[data-floe-choice-kind="checkbox"]')!;
  const label = document.querySelector('label')!;
  expect(label.hasAttribute('data-floe-checkbox-target')).toBe(true);
  expect(face.getAttribute('data-floe-selected')).toBeNull();
  label.click();
  expect(changes).toEqual([true]);
  expect(input.checked).toBe(true);
  expect(face.getAttribute('data-floe-selected')).toBe('true');
  label.click();
  expect(changes).toEqual([true, false]);
  expect(input.checked).toBe(false);
  expect(face.querySelector('svg')).toBeNull();
  expect(document.querySelector('input')).toBe(input);
  expect(document.querySelector('[data-floe-choice-kind="checkbox"]')).toBe(face);
});

it.each(['disabled', 'readOnly'] as const)('retains the unchecked state for %s choices', state => {
  const changes: boolean[] = [];
  dispose = render(() => <Checkbox {...{ [state]: true }} checked={false} label="Unavailable choice"
    onChange={value => changes.push(value)} />, document.body);
  document.querySelector('label')!.click();
  expect(changes).toEqual([]);
  expect(document.querySelector('input')!.checked).toBe(false);
  expect(document.querySelector('[data-floe-choice-kind="checkbox"]')!.querySelector('svg')).toBeNull();
});
