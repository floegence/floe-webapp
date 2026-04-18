import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function read(relPath: string): string {
  const here = fileURLToPath(import.meta.url);
  const dir = path.dirname(here);
  return fs.readFileSync(path.resolve(dir, relPath), 'utf8');
}

describe('interaction architecture guard', () => {
  it('publishes one shared interaction contract in docs and readme indexes', () => {
    const rootReadme = read('../../../README.md');
    const docsReadme = read('../../../docs/README.md');
    const architectureDoc = read('../../../docs/interaction-architecture.md');

    expect(rootReadme).toContain('docs/interaction-architecture.md');
    expect(docsReadme).toContain('docs/interaction-architecture.md');
    expect(architectureDoc).toContain('data-floe-hot-interaction');
    expect(architectureDoc).toContain('data-floe-geometry-surface');
    expect(architectureDoc).toContain('startHotInteraction()');
    expect(architectureDoc).toContain('useOverlayMask()');
    expect(architectureDoc).toContain('overlay host');
    expect(architectureDoc).toContain('data-floe-dialog-surface-host="true"');
    expect(architectureDoc).toContain('data-floe-dialog-surface-boundary');
    expect(architectureDoc).toContain('data-floe-local-interaction-surface="true"');
    expect(architectureDoc).toContain('局部 dialog');
    expect(architectureDoc).toContain('pointerdown capture');
    expect(architectureDoc).toContain('详细落地 checklist');
  });

  it('defines one shared hot interaction runtime and geometry-surface style guard', () => {
    const runtimeSrc = read('../src/utils/hotInteraction.ts');
    const stylesSrc = read('../src/styles/floe.css');

    expect(runtimeSrc).toContain("FLOE_HOT_INTERACTION_ATTR = 'data-floe-hot-interaction'");
    expect(runtimeSrc).toContain("FLOE_GEOMETRY_SURFACE_ATTR = 'data-floe-geometry-surface'");
    expect(runtimeSrc).toContain('export function startHotInteraction');

    expect(stylesSrc).toContain("[data-floe-hot-interaction~='resize'] [data-floe-geometry-surface='shell-sidebar']");
    expect(stylesSrc).toContain("[data-floe-hot-interaction~='resize'] [data-floe-geometry-surface='sidebar-pane']");
    expect(stylesSrc).toContain("[data-floe-hot-interaction~='drag'] [data-floe-geometry-surface='floating-window']");
    expect(stylesSrc).toContain("[data-floe-geometry-surface='floating-window']");
    expect(stylesSrc).toContain("[data-floe-floating-window-surface='true'][data-floe-floating-window-state='active']");
    expect(stylesSrc).toContain("[data-floe-floating-window-titlebar='true']");
  });

  it('keeps hot geometry surfaces explicit and routes drag/resize through the shared runtime', () => {
    const sidebarSrc = read('../src/components/layout/Sidebar.tsx');
    const sidebarPaneSrc = read('../src/components/layout/SidebarPane.tsx');
    const resizeHandleSrc = read('../src/components/layout/ResizeHandle.tsx');
    const widgetResizeSrc = read('../src/components/deck/WidgetResizeHandle.tsx');
    const deckDragSrc = read('../src/hooks/useDeckDrag.ts');
    const fileDragContextSrc = read('../src/context/FileBrowserDragContext.tsx');
    const floatingWindowSrc = read('../src/components/ui/FloatingWindow.tsx');
    const dialogSrc = read('../src/components/ui/Dialog.tsx');
    const dialogSurfaceScopeSrc = read('../src/components/ui/dialogSurfaceScope.ts');
    const deckCellSrc = read('../src/components/deck/DeckCell.tsx');
    const workbenchWidgetSrc = read('../src/components/workbench/WorkbenchWidget.tsx');
    const notesBoardNoteSrc = read('../src/components/notes/NotesBoardNote.tsx');

    expect(sidebarSrc).toContain('data-floe-geometry-surface="shell-sidebar"');
    expect(sidebarPaneSrc).toContain('data-floe-geometry-surface="sidebar-pane"');

    expect(resizeHandleSrc).toContain('startHotInteraction({');
    expect(widgetResizeSrc).toContain('startHotInteraction({');
    expect(deckDragSrc).toContain('startHotInteraction({');
    expect(fileDragContextSrc).toContain('startHotInteraction({');

    expect(floatingWindowSrc).toContain('data-floe-geometry-surface="floating-window"');
    expect(floatingWindowSrc).toContain('applyWindowRect');
    expect(floatingWindowSrc).toContain('setCommittedRect');
    expect(floatingWindowSrc).toContain('readLiveRectFromDom');
    expect(floatingWindowSrc).toContain('startHotInteraction({');
    expect(floatingWindowSrc).toContain('data-floe-floating-window-state={isActive() ? \'active\' : \'inactive\'}');
    expect(floatingWindowSrc).toContain('tabIndex={-1}');
    expect(floatingWindowSrc).toContain('data-floe-dialog-surface-host="true"');
    expect(floatingWindowSrc).not.toContain('aria-modal="true"');

    expect(dialogSrc).toContain('data-floe-dialog-mode={isSurfaceMode() ? \'surface\' : \'global\'}');
    expect(dialogSrc).toContain('Portal mount={portalMount()}');
    expect(dialogSrc).toContain('closeOnEscape: () => (isSurfaceMode() ? \'inside\' : true)');
    expect(dialogSrc).toContain('data-floe-dialog-backdrop={baseId}');
    expect(dialogSrc).toContain('[LOCAL_INTERACTION_SURFACE_ATTR]: isSurfaceMode() ? \'true\' : undefined');
    expect(dialogSurfaceScopeSrc).toContain("DIALOG_SURFACE_HOST_ATTR = 'data-floe-dialog-surface-host'");
    expect(dialogSurfaceScopeSrc).toContain("DIALOG_SURFACE_BOUNDARY_ATTR = 'data-floe-dialog-surface-boundary'");
    expect(dialogSurfaceScopeSrc).toContain('resolveDialogSurfaceHost');
    expect(deckCellSrc).toContain('data-floe-dialog-surface-host="true"');
    expect(workbenchWidgetSrc).toContain('data-floe-dialog-surface-host="true"');

    expect(notesBoardNoteSrc).toContain('data-floe-geometry-surface="notes-note"');
    expect(notesBoardNoteSrc).toContain('startHotInteraction({ kind: \'drag\', cursor: \'grabbing\' })');
  });

  it('splits preview state from committed sidebar state for shell and file browser', () => {
    const shellSrc = read('../src/components/layout/Shell.tsx');
    const layoutSrc = read('../src/context/LayoutContext.tsx');
    const fileBrowserSrc = read('../src/components/file-browser/FileBrowser.tsx');
    const fileBrowserTypesSrc = read('../src/components/file-browser/types.ts');
    const fileBrowserContextSrc = read('../src/components/file-browser/FileBrowserContext.tsx');

    expect(layoutSrc).toContain('clampSidebarWidth: (width: number) => number;');
    expect(shellSrc).toContain('const [sidebarPreviewWidth, setSidebarPreviewWidth] = createSignal<number | null>(null);');
    expect(shellSrc).toContain('layout.clampSidebarWidth');
    expect(shellSrc).toContain('onResizeStart={beginSidebarResize}');
    expect(shellSrc).toContain('onResizeEnd={commitSidebarResize}');

    expect(fileBrowserTypesSrc).toContain('clampSidebarWidth: (width: number) => number;');
    expect(fileBrowserContextSrc).toContain('const clampSidebarWidth = (widthPx: number) => normalizeSidebarWidthPx(widthPx, sidebarWidth());');
    expect(fileBrowserSrc).toContain('const [sidebarPreviewWidth, setSidebarPreviewWidth] = createSignal<number | null>(null);');
    expect(fileBrowserSrc).toContain('ctx.clampSidebarWidth');
    expect(fileBrowserSrc).toContain('onResizeStart={beginSidebarResize}');
    expect(fileBrowserSrc).toContain('onResizeEnd={commitSidebarResize}');
  });

  it('keeps page-selection interactions synchronous while overlay focus stays centralized', () => {
    const mobileTabBarSrc = read('../src/components/layout/MobileTabBar.tsx');
    const shellSrc = read('../src/components/layout/Shell.tsx');
    const commandPaletteSrc = read('../src/components/ui/CommandPalette.tsx');
    const notesOverlaySrc = read('../src/components/notes/NotesOverlay.tsx');
    const notesModelSrc = read('../src/components/notes/useNotesOverlayModel.ts');

    expect(mobileTabBarSrc).toContain('onSelect(id);');
    expect(mobileTabBarSrc).not.toContain('deferNonBlocking(() => onSelect(id))');
    expect(shellSrc).toContain('useOverlayMask({');
    expect(commandPaletteSrc).toContain("autoFocus: { selector: 'input' }");

    expect(notesOverlaySrc).toContain('useOverlayMask({');
    expect(notesModelSrc).toContain('const [viewportPreview, setViewportPreview] = createSignal<NotesViewport | null>(null);');
    expect(notesModelSrc).toContain('const commitViewport = (viewport: NotesViewport) => {');
    expect(notesModelSrc).toContain('setViewportPreview(viewport);');
    expect(notesModelSrc).toContain('options.controller.setViewport(viewport);');
    expect(notesModelSrc).toContain('options.controller.setViewport(preview);');
  });
});
