// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render as renderSolid } from 'solid-js/web';

import {
  FileBrowserProvider,
  useFileBrowser,
} from '../src/components/file-browser/FileBrowserContext';
import { FileContextMenu } from '../src/components/file-browser/FileContextMenu';
import type { FileItem } from '../src/components/file-browser/types';

const files: FileItem[] = [{ id: 'file-a', name: 'alpha.txt', type: 'file', path: '/alpha.txt' }];

const disposers: Array<() => void> = [];

function mount(view: () => unknown, host: HTMLElement): void {
  disposers.push(renderSolid(view, host));
}

function dispatchPointerDown(target: EventTarget): void {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  const event = new EventCtor('pointerdown', {
    bubbles: true,
    cancelable: true,
    button: 0,
  });
  if (!('pointerId' in event)) {
    Object.defineProperty(event, 'pointerId', { configurable: true, value: 1 });
  }
  target.dispatchEvent(event);
}

function flushDeferredWork(): Promise<void> {
  vi.runAllTimers();
  return Promise.resolve();
}

function SurfaceScopedMenuHarness(props: { onDuplicate: (items: FileItem[]) => void }) {
  return (
    <FileBrowserProvider files={files} initialPath="/">
      <SurfaceScopedMenuHarnessBody onDuplicate={props.onDuplicate} />
    </FileBrowserProvider>
  );
}

function SurfaceScopedMenuHarnessBody(props: { onDuplicate: (items: FileItem[]) => void }) {
  const ctx = useFileBrowser();

  return (
    <div
      data-testid="surface-host"
      data-floe-dialog-surface-host="true"
      style={{ position: 'relative', width: '320px', height: '240px' }}
    >
      <button
        type="button"
        data-testid="open-menu"
        onClick={() =>
          ctx.showContextMenu({
            x: 88,
            y: 96,
            items: files,
            targetKind: 'item',
            source: 'list',
            directory: null,
          })
        }
      >
        Open file menu
      </button>
      <FileContextMenu callbacks={{ onDuplicate: props.onDuplicate }} />
    </div>
  );
}

function LayerScopedMenuHarness(props: { onDuplicate: (items: FileItem[]) => void }) {
  return (
    <FileBrowserProvider files={files} initialPath="/">
      <LayerScopedMenuHarnessBody onDuplicate={props.onDuplicate} />
    </FileBrowserProvider>
  );
}

function LayerScopedMenuHarnessBody(props: { onDuplicate: (items: FileItem[]) => void }) {
  const ctx = useFileBrowser();

  return (
    <div
      data-testid="surface-layer"
      data-floe-surface-portal-layer="true"
      style={{ position: 'relative', width: '520px', height: '360px' }}
    >
      <div
        data-testid="surface-host"
        data-floe-dialog-surface-host="true"
        style={{ position: 'absolute', left: '120px', top: '80px', width: '320px', height: '240px' }}
      >
        <button
          type="button"
          data-testid="open-menu"
          onClick={() =>
            ctx.showContextMenu({
              x: 160,
              y: 140,
              items: files,
              targetKind: 'item',
              source: 'list',
              directory: null,
            })
          }
        >
          Open layered file menu
        </button>
        <FileContextMenu callbacks={{ onDuplicate: props.onDuplicate }} />
      </div>
    </div>
  );
}

describe('FileContextMenu surface scope', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    while (disposers.length > 0) {
      disposers.pop()?.();
    }
    document.body.innerHTML = '';
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('mounts the menu into the nearest surface host and keeps actions clickable', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onDuplicate = vi.fn();

    mount(() => <SurfaceScopedMenuHarness onDuplicate={onDuplicate} />, host);

    const surfaceHost = host.querySelector('[data-testid="surface-host"]') as HTMLDivElement | null;
    const trigger = host.querySelector('[data-testid="open-menu"]') as HTMLButtonElement | null;

    expect(surfaceHost).toBeTruthy();
    expect(trigger).toBeTruthy();

    dispatchPointerDown(trigger!);
    trigger!.click();
    await flushDeferredWork();

    const menu = surfaceHost!.querySelector('[data-floe-context-menu]') as HTMLDivElement | null;
    expect(menu).toBeTruthy();
    expect(menu?.getAttribute('data-floe-local-interaction-surface')).toBe('true');

    const duplicateButton = Array.from(menu!.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Duplicate')
    ) as HTMLButtonElement | undefined;
    expect(duplicateButton).toBeTruthy();

    dispatchPointerDown(duplicateButton!);
    duplicateButton!.click();
    await flushDeferredWork();

    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onDuplicate).toHaveBeenCalledWith(files);
  });

  it('mounts transformed-host menus into the portal layer and projects client coordinates against the layer', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onDuplicate = vi.fn();

    mount(() => <LayerScopedMenuHarness onDuplicate={onDuplicate} />, host);

    const surfaceLayer = host.querySelector('[data-testid="surface-layer"]') as HTMLDivElement | null;
    const surfaceHost = host.querySelector('[data-testid="surface-host"]') as HTMLDivElement | null;
    const trigger = host.querySelector('[data-testid="open-menu"]') as HTMLButtonElement | null;

    expect(surfaceLayer).toBeTruthy();
    expect(surfaceHost).toBeTruthy();
    expect(trigger).toBeTruthy();

    Object.defineProperty(surfaceLayer!, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 20,
        top: 30,
        right: 540,
        bottom: 390,
        width: 520,
        height: 360,
        x: 20,
        y: 30,
        toJSON: () => undefined,
      }),
    });
    Object.defineProperty(surfaceHost!, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 120,
        top: 80,
        right: 440,
        bottom: 320,
        width: 320,
        height: 240,
        x: 120,
        y: 80,
        toJSON: () => undefined,
      }),
    });

    dispatchPointerDown(trigger!);
    trigger!.click();
    await flushDeferredWork();

    const menu = surfaceLayer!.querySelector('[data-floe-context-menu]') as HTMLDivElement | null;
    expect(menu).toBeTruthy();
    expect(surfaceLayer?.contains(menu ?? null)).toBe(true);
    expect(surfaceHost?.contains(menu ?? null)).toBe(false);
    expect(menu?.style.left).toBe('140px');
    expect(menu?.style.top).toBe('110px');

    const duplicateButton = Array.from(menu!.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Duplicate')
    ) as HTMLButtonElement | undefined;
    expect(duplicateButton).toBeTruthy();

    dispatchPointerDown(duplicateButton!);
    duplicateButton!.click();
    await flushDeferredWork();

    expect(onDuplicate).toHaveBeenCalledWith(files);
  });
});
