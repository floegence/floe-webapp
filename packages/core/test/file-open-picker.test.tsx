// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'solid-js/web';
import type { FileItem } from '../src/components/file-browser/types';
import {
  FileOpenPicker,
  normalizeFileOpenSelection,
  updateFileOpenSelection,
} from '../src/components/ui/FileOpenPicker';

const files: FileItem[] = [
  { id: '/compose.yaml', name: 'compose.yaml', path: '/compose.yaml', type: 'file' },
  { id: '/README.md', name: 'README.md', path: '/README.md', type: 'file' },
  { id: '/.env', name: '.env', path: '/.env', type: 'file' },
];

const disposers: Array<() => void> = [];

async function flushDialog(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function mountPicker(props: Partial<Parameters<typeof FileOpenPicker>[0]> = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const onOpenChange = vi.fn();
  const onSelect = vi.fn();
  disposers.push(render(() => (
    <FileOpenPicker
      open
      onOpenChange={onOpenChange}
      files={files}
      onSelect={onSelect}
      {...props}
    />
  ), host));
  return { host, onOpenChange, onSelect };
}

describe('FileOpenPicker', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', ((callback: FrameRequestCallback) => (
      window.setTimeout(() => callback(0), 0)
    )) as typeof requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', ((handle: number) => {
      window.clearTimeout(handle);
    }) as typeof cancelAnimationFrame);
  });

  afterEach(() => {
    while (disposers.length > 0) disposers.pop()?.();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps a unique ordered selection and enforces the configured limit', () => {
    expect(normalizeFileOpenSelection(['/a', '/a/', '/b', '/c'], 2)).toEqual(['/a', '/b']);
    expect(updateFileOpenSelection(['/a'], '/b', 'multiple', 2)).toEqual(['/a', '/b']);
    expect(updateFileOpenSelection(['/a', '/b'], '/c', 'multiple', 2)).toEqual(['/a', '/b']);
    expect(updateFileOpenSelection(['/a', '/b'], '/a', 'multiple', 2)).toEqual(['/b']);
    expect(updateFileOpenSelection(['/a'], '/b', 'single', 1)).toEqual(['/b']);
  });

  it('filters files and confirms multiple selection in click order', async () => {
    const { onOpenChange, onSelect } = mountPicker({
      selectionMode: 'multiple',
      fileFilter: (item) => item.name.endsWith('.yaml') || item.name === '.env',
      confirmText: 'Choose files',
    });
    await flushDialog();

    const options = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    expect(options.map((option) => option.textContent?.trim())).toEqual(['compose.yaml', '.env']);
    options[1]?.click();
    options[0]?.click();
    document.querySelector<HTMLButtonElement>('button:not([role="option"])')?.focus();
    const confirm = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Choose files'));
    confirm?.click();
    await flushDialog();

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSelect).toHaveBeenCalledWith(['/.env', '/compose.yaml']);
  });

  it('supports list keyboard navigation and closes through backdrop or Escape', async () => {
    const { onOpenChange } = mountPicker();
    await flushDialog();

    const options = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    options[0]?.focus();
    options[0]?.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    }));
    expect(document.activeElement).toBe(options[1]);

    document.querySelector<HTMLElement>('[data-floe-dialog-backdrop]')?.click();
    expect(onOpenChange).toHaveBeenCalledWith(false);

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
