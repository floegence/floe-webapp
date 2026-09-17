// @vitest-environment jsdom
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, expect, it, vi } from 'vitest';
import { CodeBlock } from '../src/components/chat/blocks/CodeBlock';

vi.mock('../src/components/chat/hooks/useCodeHighlight', () => ({
  highlightCode: async () => null,
}));
let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

it('copies literal code and exposes localized success without losing source text', async () => {
  const write = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: write },
  });
  const source = '  await inspect();\n';
  dispose = render(
    () => (
      <CodeBlock
        content={source}
        language="javascript"
        copyLabel="Copy script"
        copiedLabel="Script copied"
        copyErrorLabel="Copy failed"
      />
    ),
    document.body
  );
  const button = document.querySelector('button')!;
  expect(button.getAttribute('aria-label')).toBe('Copy script');
  button.click();
  await vi.waitFor(() => expect(button.getAttribute('aria-label')).toBe('Script copied'));
  expect(write).toHaveBeenCalledWith(source);
  expect(document.querySelector('[role="status"]')?.textContent).toBe('Script copied');
  expect(document.querySelector('code')?.textContent).toBe(source);
});

it('reports clipboard failure and clears stale feedback when content changes', async () => {
  const write = vi.fn().mockRejectedValue(new Error('clipboard denied'));
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: write },
  });
  const [source, setSource] = createSignal('first');
  dispose = render(
    () => (
      <CodeBlock
        content={source()}
        language="text"
        copyLabel="Copy output"
        copiedLabel="Output copied"
        copyErrorLabel="Could not copy output"
      />
    ),
    document.body
  );
  const button = document.querySelector('button')!;
  button.click();
  await vi.waitFor(() =>
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Could not copy output')
  );
  expect(button.getAttribute('aria-label')).toBe('Could not copy output');
  setSource('second');
  expect(button.getAttribute('aria-label')).toBe('Copy output');
  expect(document.querySelector('[role="status"]')?.textContent).toBe('');
});

it('ignores an old clipboard completion after switching the displayed code', async () => {
  let resolve!: () => void;
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    },
  });
  const [source, setSource] = createSignal('first');
  dispose = render(() => <CodeBlock content={source()} language="text" />, document.body);
  document.querySelector('button')!.click();
  setSource('second');
  resolve();
  await Promise.resolve();
  expect(document.querySelector('button')?.getAttribute('aria-label')).toBe('Copy code');
});
