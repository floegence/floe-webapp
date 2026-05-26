// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render as renderSolid } from 'solid-js/web';

import {
  FileBrowserProvider,
  useFileBrowser,
} from '../src/components/file-browser/FileBrowserContext';
import { FileContextMenu } from '../src/components/file-browser/FileContextMenu';
import type { ContextMenuItem, FileItem } from '../src/components/file-browser/types';

const files: FileItem[] = [{ id: 'file-a', name: 'alpha.txt', type: 'file', path: '/alpha.txt' }];

const disposers: Array<() => void> = [];
let rafQueue: Array<{ id: number; callback: FrameRequestCallback }> = [];
let rafIdSeq = 0;

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

function mockRect(
  element: HTMLElement,
  rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  }
): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      ...rect,
      x: rect.left,
      y: rect.top,
      toJSON: () => undefined,
    }),
  });
}

function flushRaf(): void {
  const callbacks = rafQueue.splice(0);
  for (const entry of callbacks) {
    entry.callback(0);
  }
}

function flushDeferredWork(): Promise<void> {
  vi.runAllTimers();
  flushRaf();
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

function LayerScopedMenuHarness(props: {
  onDuplicate: (items: FileItem[]) => void;
  anchor?: { x: number; y: number };
  overrideItems?: ContextMenuItem[];
}) {
  return (
    <FileBrowserProvider files={files} initialPath="/">
      <LayerScopedMenuHarnessBody
        onDuplicate={props.onDuplicate}
        anchor={props.anchor}
        overrideItems={props.overrideItems}
      />
    </FileBrowserProvider>
  );
}

function LayerScopedMenuHarnessBody(props: {
  onDuplicate: (items: FileItem[]) => void;
  anchor?: { x: number; y: number };
  overrideItems?: ContextMenuItem[];
}) {
  const ctx = useFileBrowser();
  const anchor = () => props.anchor ?? { x: 160, y: 140 };

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
              x: anchor().x,
              y: anchor().y,
              items: files,
              targetKind: 'item',
              source: 'list',
              directory: null,
            })
          }
        >
          Open layered file menu
        </button>
        <FileContextMenu
          callbacks={{ onDuplicate: props.onDuplicate }}
          overrideItems={props.overrideItems}
        />
      </div>
    </div>
  );
}

function GlobalMenuHarness() {
  const ctx = useFileBrowser();
  return (
    <>
      <button
        type="button"
        data-testid="open-menu"
        onClick={() =>
          ctx.showContextMenu({
            x: 470,
            y: 340,
            items: files,
            targetKind: 'item',
            source: 'list',
            directory: null,
          })
        }
      >
        Open global menu
      </button>
      <FileContextMenu overrideItems={[{ id: 'duplicate', label: 'Duplicate', type: 'duplicate' }]} />
    </>
  );
}

describe('FileContextMenu surface scope', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    rafQueue = [];
    rafIdSeq = 0;
    vi.stubGlobal('requestAnimationFrame', ((callback: FrameRequestCallback) => {
      const id = ++rafIdSeq;
      rafQueue.push({ id, callback });
      return id;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', ((id: number) => {
      rafQueue = rafQueue.filter((entry) => entry.id !== id);
    }) as typeof cancelAnimationFrame);
  });

  afterEach(() => {
    while (disposers.length > 0) {
      disposers.pop()?.();
    }
    document.body.innerHTML = '';
    vi.runOnlyPendingTimers();
    rafQueue = [];
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

    mockRect(surfaceLayer!, {
      left: 20,
      top: 30,
      right: 540,
      bottom: 390,
      width: 520,
      height: 360,
    });
    mockRect(surfaceHost!, {
      left: 120,
      top: 80,
      right: 440,
      bottom: 320,
      width: 320,
      height: 240,
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

  it('keeps a surface-layer menu hidden until its first visible frame is the final clamped position', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    mount(() => (
      <LayerScopedMenuHarness
        onDuplicate={vi.fn()}
        anchor={{ x: 430, y: 315 }}
        overrideItems={[{ id: 'duplicate', label: 'Duplicate', type: 'duplicate' }]}
      />
    ), host);

    const surfaceLayer = host.querySelector('[data-testid="surface-layer"]') as HTMLDivElement | null;
    const surfaceHost = host.querySelector('[data-testid="surface-host"]') as HTMLDivElement | null;
    const trigger = host.querySelector('[data-testid="open-menu"]') as HTMLButtonElement | null;

    expect(surfaceLayer).toBeTruthy();
    expect(surfaceHost).toBeTruthy();
    expect(trigger).toBeTruthy();

    mockRect(surfaceLayer!, {
      left: 20,
      top: 30,
      right: 540,
      bottom: 390,
      width: 520,
      height: 360,
    });
    mockRect(surfaceHost!, {
      left: 120,
      top: 80,
      right: 440,
      bottom: 320,
      width: 320,
      height: 240,
    });

    dispatchPointerDown(trigger!);
    trigger!.click();
    await Promise.resolve();

    const menu = surfaceLayer!.querySelector('[data-floe-context-menu]') as HTMLDivElement | null;
    expect(menu).toBeTruthy();
    expect(menu?.style.left).toBe('410px');
    expect(menu?.style.top).toBe('285px');
    expect(menu?.style.visibility).toBe('hidden');
    expect(menu?.style.pointerEvents).toBe('none');
    expect(menu?.getAttribute('aria-hidden')).toBe('true');
    const duplicateButton = menu!.querySelector('button') as HTMLButtonElement | null;
    expect(duplicateButton).toBeTruthy();
    expect(document.activeElement).not.toBe(duplicateButton);

    mockRect(menu!, {
      left: 430,
      top: 315,
      right: 630,
      bottom: 435,
      width: 200,
      height: 120,
    });

    flushRaf();
    await Promise.resolve();

    expect(menu?.style.visibility).toBe('visible');
    expect(menu?.style.pointerEvents).toBe('auto');
    expect(menu?.getAttribute('aria-hidden')).toBeNull();
    expect(menu?.style.left).toBe('212px');
    expect(menu?.style.top).toBe('162px');
    expect(document.activeElement).toBe(duplicateButton);
  });

  it('keeps a global menu hidden until it is clamped against the viewport', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 360 });

    mount(() => (
      <FileBrowserProvider files={files} initialPath="/">
        <GlobalMenuHarness />
      </FileBrowserProvider>
    ), host);

    const trigger = host.querySelector('[data-testid="open-menu"]') as HTMLButtonElement | null;
    expect(trigger).toBeTruthy();

    dispatchPointerDown(trigger!);
    trigger!.click();
    await Promise.resolve();

    const menu = document.body.querySelector('[data-floe-context-menu]') as HTMLDivElement | null;
    expect(menu).toBeTruthy();
    expect(menu?.style.left).toBe('470px');
    expect(menu?.style.top).toBe('340px');
    expect(menu?.style.visibility).toBe('hidden');
    expect(menu?.getAttribute('aria-hidden')).toBe('true');
    const duplicateButton = menu!.querySelector('button') as HTMLButtonElement | null;
    expect(duplicateButton).toBeTruthy();
    expect(document.activeElement).not.toBe(duplicateButton);

    mockRect(menu!, {
      left: 470,
      top: 340,
      right: 650,
      bottom: 430,
      width: 180,
      height: 90,
    });

    flushRaf();
    await Promise.resolve();

    expect(menu?.style.visibility).toBe('visible');
    expect(menu?.getAttribute('aria-hidden')).toBeNull();
    expect(menu?.style.left).toBe('312px');
    expect(menu?.style.top).toBe('262px');
    expect(document.activeElement).toBe(duplicateButton);
  });

  it('keeps surface-layer submenus hidden until their first visible frame is clamped', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const menuItems: ContextMenuItem[] = [
      {
        id: 'new',
        label: 'New',
        type: 'custom',
        children: [
          { id: 'new-file', label: 'New File', type: 'custom' },
          { id: 'new-folder', label: 'New Folder', type: 'custom' },
        ],
      },
    ];

    mount(() => (
      <LayerScopedMenuHarness
        onDuplicate={vi.fn()}
        anchor={{ x: 300, y: 160 }}
        overrideItems={menuItems}
      />
    ), host);

    const surfaceLayer = host.querySelector('[data-testid="surface-layer"]') as HTMLDivElement | null;
    const surfaceHost = host.querySelector('[data-testid="surface-host"]') as HTMLDivElement | null;
    const trigger = host.querySelector('[data-testid="open-menu"]') as HTMLButtonElement | null;

    expect(surfaceLayer).toBeTruthy();
    expect(surfaceHost).toBeTruthy();
    expect(trigger).toBeTruthy();

    mockRect(surfaceLayer!, {
      left: 20,
      top: 30,
      right: 540,
      bottom: 390,
      width: 520,
      height: 360,
    });
    mockRect(surfaceHost!, {
      left: 120,
      top: 80,
      right: 440,
      bottom: 320,
      width: 320,
      height: 240,
    });

    dispatchPointerDown(trigger!);
    trigger!.click();
    await Promise.resolve();

    const rootMenu = surfaceLayer!.querySelector('[data-floe-context-menu]') as HTMLDivElement | null;
    expect(rootMenu).toBeTruthy();
    mockRect(rootMenu!, {
      left: 300,
      top: 160,
      right: 480,
      bottom: 220,
      width: 180,
      height: 60,
    });

    flushRaf();
    await Promise.resolve();

    const newButton = Array.from(rootMenu!.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('New')
    ) as HTMLButtonElement | undefined;
    expect(newButton).toBeTruthy();

    const newItem = newButton!.parentElement as HTMLDivElement;
    mockRect(newItem, {
      left: 350,
      top: 170,
      right: 430,
      bottom: 198,
      width: 80,
      height: 28,
    });

    newButton!.click();
    await Promise.resolve();

    const menus = Array.from(
      surfaceLayer!.querySelectorAll<HTMLDivElement>('[data-floe-context-menu][role="menu"]')
    );
    const submenu = menus.find((menu) => menu.textContent?.includes('New File'));
    expect(submenu).toBeTruthy();
    expect(submenu?.style.left).toBe('410px');
    expect(submenu?.style.top).toBe('140px');
    expect(submenu?.style.visibility).toBe('hidden');
    expect(submenu?.style.pointerEvents).toBe('none');
    expect(submenu?.getAttribute('aria-hidden')).toBe('true');
    const newFileButton = Array.from(submenu!.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('New File')
    ) as HTMLButtonElement | undefined;
    expect(newFileButton).toBeTruthy();
    expect(document.activeElement).not.toBe(newFileButton);

    mockRect(submenu!, {
      left: 430,
      top: 170,
      right: 610,
      bottom: 260,
      width: 180,
      height: 90,
    });

    flushRaf();
    await Promise.resolve();

    expect(submenu?.style.visibility).toBe('visible');
    expect(submenu?.style.pointerEvents).toBe('auto');
    expect(submenu?.getAttribute('aria-hidden')).toBeNull();
    expect(submenu?.style.left).toBe('150px');
    expect(submenu?.style.top).toBe('140px');
    expect(document.activeElement).toBe(newFileButton);
  });
});
