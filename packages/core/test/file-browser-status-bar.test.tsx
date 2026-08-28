// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onMount } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';

import { FloeConfigProvider } from '../src/context/FloeConfigContext';
import {
  FileBrowserProvider,
  useFileBrowser,
} from '../src/components/file-browser/FileBrowserContext';
import { FileBrowserStatusBar } from '../src/components/file-browser/FileBrowserStatusBar';
import type { FileBrowserContextValue, FileItem } from '../src/components/file-browser/types';

const files: FileItem[] = [
  { id: 'alpha', name: 'alpha.txt', type: 'file', path: '/alpha.txt' },
  { id: 'beta', name: 'beta.txt', type: 'file', path: '/beta.txt' },
];

const disposers: Array<() => void> = [];

function mount(view: () => unknown, host: HTMLElement): void {
  disposers.push(renderSolid(view, host));
}

function StatusHarness(props: {
  onContext?: (context: FileBrowserContextValue) => void;
  localized?: boolean;
}) {
  const browser = useFileBrowser();
  onMount(() => props.onContext?.(browser));

  return (
    <FileBrowserStatusBar
      class="product-status"
      pathClass="product-path"
      formatItemCount={props.localized ? (count) => `${count} 个项目` : undefined}
      filteredLabel={props.localized ? '已筛选' : undefined}
      formatSelectedCount={props.localized ? (count) => `已选择 ${count} 个` : undefined}
    />
  );
}

describe('FileBrowserStatusBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    while (disposers.length > 0) disposers.pop()?.();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('renders singular and plural default item counts with the current path', () => {
    const host = document.createElement('div');
    document.body.append(host);

    mount(() => (
      <FloeConfigProvider config={{ storage: { enabled: false } }}>
        <FileBrowserProvider files={files.slice(0, 1)} initialPath="/">
          <StatusHarness />
        </FileBrowserProvider>
      </FloeConfigProvider>
    ), host);

    expect(host.textContent).toContain('1 item');
    expect(host.textContent).not.toContain('1 items');
    expect(host.textContent).toContain('/');
    expect(host.querySelector('[data-file-browser-status-bar="true"]')?.className).toContain('product-status');
    expect(host.querySelector('[title="/"]')?.className).toContain('product-path');

    disposers.pop()?.();
    host.innerHTML = '';

    mount(() => (
      <FloeConfigProvider config={{ storage: { enabled: false } }}>
        <FileBrowserProvider files={files} initialPath="/">
          <StatusHarness />
        </FileBrowserProvider>
      </FloeConfigProvider>
    ), host);

    expect(host.textContent).toContain('2 items');
  });

  it('renders localized filter and selection status from the shared browser context', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    let browser: FileBrowserContextValue | undefined;

    mount(() => (
      <FloeConfigProvider config={{ storage: { enabled: false } }}>
        <FileBrowserProvider files={files} initialPath="/">
          <StatusHarness localized onContext={(context) => { browser = context; }} />
        </FileBrowserProvider>
      </FloeConfigProvider>
    ), host);

    expect(host.textContent).toContain('2 个项目');

    browser?.setFilterQuery('alpha');
    vi.runAllTimers();
    await Promise.resolve();
    expect(host.textContent).toContain('1 个项目');
    expect(host.textContent).toContain('已筛选');

    browser?.selectItem('alpha');
    expect(host.textContent).toContain('已选择 1 个');
  });
});
