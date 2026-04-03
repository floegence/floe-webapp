import { createRoot, createSignal } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

import { usePickerTree, type PickerEnsurePath, type PickerTreeState } from '../src/components/ui/picker/PickerBase';
import type { FileItem } from '../src/components/file-browser/types';

function folder(path: string, children: FileItem[] = []): FileItem {
  const segments = path.split('/').filter(Boolean);
  return {
    id: path,
    name: segments.at(-1) ?? '/',
    type: 'folder',
    path,
    children,
  };
}

async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function createHarness(args?: {
  initialPath?: string;
  initialFiles?: FileItem[];
  ensurePath?: PickerEnsurePath;
  onExpand?: (path: string) => void | Promise<void>;
}) {
  return createRoot((dispose) => {
    const [open, setOpen] = createSignal(false);
    const [files, setFiles] = createSignal<FileItem[]>(args?.initialFiles ?? []);

    const tree = usePickerTree({
      initialPath: () => args?.initialPath ?? '/',
      open,
      files,
      ensurePath: args?.ensurePath,
      onExpand: args?.onExpand,
    });

    return {
      dispose,
      setOpen,
      setFiles,
      tree,
    };
  }) as {
    dispose: () => void;
    setOpen: (open: boolean) => void;
    setFiles: (files: FileItem[]) => void;
    tree: PickerTreeState;
  };
}

describe('picker navigation state', () => {
  it('hydrates a deep initialPath through open-style async navigation', async () => {
    const ensurePathMock = vi.fn(async (path: string, options: { reason: string }) => {
      expect(options.reason).toBe('open');
      expect(path).toBe('/workspace/src');
      harness.setFiles([
        folder('/workspace', [folder('/workspace/src')]),
      ]);
      return { status: 'ready', resolvedPath: path };
    });
    const ensurePath = ensurePathMock as PickerEnsurePath;

    const harness = createHarness({
      initialPath: '/workspace/src',
      ensurePath,
    });

    try {
      await harness.tree.navigateToPath('/workspace/src', { reason: 'open' });
      await flushAsync();

      expect(ensurePathMock).toHaveBeenCalledTimes(1);
      expect(harness.tree.selectedPath()).toBe('/workspace/src');
      expect(harness.tree.expandedPaths().has('/workspace')).toBe(true);
      expect(harness.tree.pathPending()).toBe(false);
      expect(harness.tree.revealNonce()).toBeGreaterThan(0);
    } finally {
      harness.dispose();
    }
  });

  it('accepts an existing path from the input even when that path was not loaded yet', async () => {
    const ensurePathMock = vi.fn(async (path: string, options: { reason: string }) => {
      expect(options.reason).toBe('path-input');
      harness.setFiles([
        folder('/workspace', [folder('/workspace/src')]),
      ]);
      return { status: 'ready', resolvedPath: path };
    });
    const ensurePath = ensurePathMock as PickerEnsurePath;

    const harness = createHarness({
      initialFiles: [folder('/workspace')],
      ensurePath,
    });

    try {
      harness.setOpen(true);
      await flushAsync();

      harness.tree.setPathInput('/workspace/src');
      harness.tree.handlePathInputGo();
      await flushAsync();

      expect(ensurePathMock).toHaveBeenCalledWith('/workspace/src', { reason: 'path-input' });
      expect(harness.tree.selectedPath()).toBe('/workspace/src');
      expect(harness.tree.pathInputError()).toBe('');
    } finally {
      harness.dispose();
    }
  });

  it('surfaces a missing-path error without corrupting the current selection', async () => {
    const ensurePath = vi.fn(async (path: string) => ({
      status: 'missing',
      resolvedPath: path,
      message: 'Path not found',
    })) as PickerEnsurePath;

    const harness = createHarness({
      ensurePath,
    });

    try {
      harness.setOpen(true);
      await flushAsync();

      harness.tree.setPathInput('/workspace/missing');
      harness.tree.handlePathInputGo();
      await flushAsync();

      expect(harness.tree.selectedPath()).toBe('/');
      expect(harness.tree.pathInputError()).toBe('Path not found');
    } finally {
      harness.dispose();
    }
  });

  it('requests direct children after a tree row is selected for the first time', async () => {
    const onExpand = vi.fn(async () => {});
    const ensurePath = vi.fn(async (path: string) => ({
      status: 'ready',
      resolvedPath: path,
    })) as PickerEnsurePath;

    const workspaceFolder = folder('/workspace');
    const harness = createHarness({
      initialFiles: [workspaceFolder],
      ensurePath,
      onExpand,
    });

    try {
      harness.setOpen(true);
      await flushAsync();

      harness.tree.handleSelectFolder(workspaceFolder);
      await flushAsync();

      expect(harness.tree.selectedPath()).toBe('/workspace');
      expect(onExpand).toHaveBeenCalledWith('/workspace');
    } finally {
      harness.dispose();
    }
  });

  it('keeps pure tree expansion separate from reveal-driven navigation state', async () => {
    const onExpand = vi.fn(async () => {});
    const harness = createHarness({
      initialFiles: [folder('/workspace')],
      onExpand,
    });

    try {
      harness.setOpen(true);
      await flushAsync();

      const revealBeforeExpand = harness.tree.revealNonce();
      harness.tree.toggleExpand('/workspace');
      await flushAsync();

      expect(onExpand).toHaveBeenCalledWith('/workspace');
      expect(harness.tree.revealNonce()).toBe(revealBeforeExpand);
    } finally {
      harness.dispose();
    }
  });
});
