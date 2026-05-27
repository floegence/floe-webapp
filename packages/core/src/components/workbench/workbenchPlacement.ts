import type {
  WorkbenchBackgroundLayerDefaults,
  WorkbenchDockToolId,
  WorkbenchTextAnnotationDefaults,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetType,
} from './types';
import { createWorkbenchWidgetFrame } from './workbenchHelpers';
import { getWidgetEntry } from './widgets/widgetRegistry';

export type WorkbenchPlacementPreviewKind = 'widget' | 'sticky-note' | 'text' | 'background-region';

export type WorkbenchPlacementPreviewFrame = Readonly<{
  kind: WorkbenchPlacementPreviewKind;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dropAllowed?: boolean;
}>;

export function positiveFinite(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value! > 0 ? value! : fallback;
}

export function resolveStickyNoteDefaultSize(): Readonly<{ width: number; height: number }> {
  return { width: 260, height: 184 };
}

export function resolveTextAnnotationDefaultSize(
  defaults: WorkbenchTextAnnotationDefaults | undefined
): Readonly<{ width: number; height: number }> {
  return {
    width: positiveFinite(defaults?.width, 360),
    height: positiveFinite(defaults?.height, 96),
  };
}

export function resolveBackgroundLayerDefaultSize(
  defaults: WorkbenchBackgroundLayerDefaults | undefined
): Readonly<{ width: number; height: number }> {
  return {
    width: positiveFinite(defaults?.width, 560),
    height: positiveFinite(defaults?.height, 360),
  };
}

function centerFrame(input: {
  kind: WorkbenchPlacementPreviewKind;
  label: string;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  dropAllowed?: boolean;
}): WorkbenchPlacementPreviewFrame {
  return {
    kind: input.kind,
    label: input.label,
    x: input.worldX - input.width / 2,
    y: input.worldY - input.height / 2,
    width: input.width,
    height: input.height,
    dropAllowed: input.dropAllowed,
  };
}

export function resolveWorkbenchWidgetPlacementPreview(input: {
  type: WorkbenchWidgetType;
  widgetDefinitions: readonly WorkbenchWidgetDefinition[];
  worldX: number;
  worldY: number;
  dropAllowed?: boolean;
}): WorkbenchPlacementPreviewFrame {
  const entry = getWidgetEntry(input.type, input.widgetDefinitions);
  const frame = createWorkbenchWidgetFrame(entry, {
    anchor: 'center',
    worldX: input.worldX,
    worldY: input.worldY,
  });
  return {
    kind: 'widget',
    label: entry.label,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    dropAllowed: input.dropAllowed,
  };
}

export function resolveWorkbenchToolPlacementPreview(input: {
  tool: WorkbenchDockToolId;
  label: string;
  worldX: number;
  worldY: number;
  dropAllowed?: boolean;
  textDefaults?: WorkbenchTextAnnotationDefaults;
  backgroundDefaults?: WorkbenchBackgroundLayerDefaults;
}): WorkbenchPlacementPreviewFrame {
  if (input.tool === 'sticky-note') {
    const size = resolveStickyNoteDefaultSize();
    return centerFrame({
      kind: 'sticky-note',
      label: input.label,
      worldX: input.worldX,
      worldY: input.worldY,
      dropAllowed: input.dropAllowed,
      ...size,
    });
  }
  if (input.tool === 'text') {
    const size = resolveTextAnnotationDefaultSize(input.textDefaults);
    return centerFrame({
      kind: 'text',
      label: input.label,
      worldX: input.worldX,
      worldY: input.worldY,
      dropAllowed: input.dropAllowed,
      ...size,
    });
  }

  const size = resolveBackgroundLayerDefaultSize(input.backgroundDefaults);
  return centerFrame({
    kind: 'background-region',
    label: input.label,
    worldX: input.worldX,
    worldY: input.worldY,
    dropAllowed: input.dropAllowed,
    ...size,
  });
}
