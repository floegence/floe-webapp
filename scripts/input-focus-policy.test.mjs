import assert from 'node:assert/strict';
import { test } from 'vitest';
import { inspectInputClasses, inspectInputCSS } from './input-focus-policy.mjs';

test('rejects extra rings on inputs and their declared boundaries', () => {
  for (const source of [
    '<input class="focus:ring-2"/>',
    '<Input class="focus-visible:outline-2"/>',
    '<div data-floe-input-surface class="focus-within:shadow-lg"><input/></div>',
  ]) {
    assert.equal(inspectInputClasses(source).violations.length, 1);
  }
});
test('preserves independent button rings and permits suppression and border color', () => {
  assert.deepEqual(
    inspectInputClasses(
      '<><button class="focus:ring-2"/><input class="focus:ring-0 focus:outline-none focus:border-ring"/></>'
    ).violations,
    []
  );
});
test('recognizes CSS input ownership without banning unrelated buttons', () => {
  const { inputClasses } = inspectInputClasses(
    '<><input class="field"/><button class="action"/></>'
  );
  assert.equal(
    inspectInputCSS(
      '.field:focus {box-shadow:0 0 0 2px blue;} .action:focus{outline:2px solid blue;}',
      inputClasses
    ).length,
    1
  );
  assert.deepEqual(
    inspectInputCSS('.field:focus {border-color:var(--ring);outline:none;}', inputClasses),
    []
  );
});
