import { isTypingElement } from '../../utils/dom';
import {
  DEFAULT_CANVAS_WHEEL_INTERACTIVE_SELECTOR,
  DEFAULT_WORKBENCH_WIDGET_SHELL_SELECTOR,
  resolveSurfaceInteractionTargetRole,
  resolveSurfaceWheelRouting,
  resolveWorkbenchWidgetEventOwnership,
} from '../ui/localInteractionSurface';
import type {
  WorkbenchCanvasOwnerReason,
  WorkbenchInputOwner,
  WorkbenchInteractionAdapter,
  WorkbenchWidgetOwnerReason,
  WorkbenchWheelRoutingDecision,
} from './types';

export const DEFAULT_WORKBENCH_SURFACE_ROOT_ATTR = 'data-floe-workbench-surface-root';
export const DEFAULT_WORKBENCH_WIDGET_ROOT_ATTR = 'data-floe-workbench-widget-root';
export const DEFAULT_WORKBENCH_WIDGET_ID_ATTR = 'data-floe-workbench-widget-id';
export const DEFAULT_WORKBENCH_DIALOG_SURFACE_HOST_ATTR = 'data-floe-dialog-surface-host';

export interface ResolvedWorkbenchInteractionAdapter extends WorkbenchInteractionAdapter {
  surfaceRootAttr: string;
  widgetRootAttr: string;
  widgetIdAttr: string;
  dialogSurfaceHostAttr: string;
  interactiveSelector: string;
  panSurfaceSelector: string;
  wheelInteractiveSelector: string;
  createInitialInputOwner: () => WorkbenchInputOwner;
  createCanvasInputOwner: (reason: WorkbenchCanvasOwnerReason) => WorkbenchInputOwner;
  createWidgetInputOwner: (widgetId: string, reason: WorkbenchWidgetOwnerReason) => WorkbenchInputOwner;
  findWidgetRoot: (target: EventTarget | null) => HTMLElement | null;
  readWidgetId: (element: Element | null) => string | null;
  focusWidgetElement: (root: ParentNode | null | undefined, widgetId: string) => boolean;
  resolveSurfaceTargetRole: NonNullable<WorkbenchInteractionAdapter['resolveSurfaceTargetRole']>;
  resolveWidgetEventOwnership: NonNullable<WorkbenchInteractionAdapter['resolveWidgetEventOwnership']>;
  resolveWheelRouting: NonNullable<WorkbenchInteractionAdapter['resolveWheelRouting']>;
  shouldBypassGlobalHotkeys: NonNullable<WorkbenchInteractionAdapter['shouldBypassGlobalHotkeys']>;
}

function resolveElement(target: EventTarget | null): Element | null {
  if (typeof Element !== 'undefined' && target instanceof Element) {
    return target;
  }
  if (typeof Node !== 'undefined' && target instanceof Node) {
    return target.parentElement;
  }
  return null;
}

export function readWorkbenchWidgetId(
  element: Element | null,
  widgetIdAttr = DEFAULT_WORKBENCH_WIDGET_ID_ATTR,
): string | null {
  const widgetId = element?.getAttribute(widgetIdAttr) ?? '';
  const trimmed = widgetId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function findWorkbenchWidgetRoot(
  target: EventTarget | null,
  widgetRootAttr = DEFAULT_WORKBENCH_WIDGET_ROOT_ATTR,
): HTMLElement | null {
  if (!(target instanceof Element)) return null;

  const widgetRoot = target.closest(`[${widgetRootAttr}="true"]`);
  return widgetRoot instanceof HTMLElement ? widgetRoot : null;
}

export function findWorkbenchWidgetElement(args: {
  root: ParentNode | null | undefined;
  widgetId: string;
  widgetRootAttr?: string;
  readWidgetId?: (element: Element | null) => string | null;
}): HTMLElement | null {
  const {
    root,
    widgetId,
    widgetRootAttr = DEFAULT_WORKBENCH_WIDGET_ROOT_ATTR,
    readWidgetId: readId = (element) => readWorkbenchWidgetId(element, DEFAULT_WORKBENCH_WIDGET_ID_ATTR),
  } = args;
  if (!root || typeof root.querySelectorAll !== 'function') return null;

  const widgetRoots = root.querySelectorAll(`[${widgetRootAttr}="true"]`);
  for (const widgetRoot of widgetRoots) {
    if (!(widgetRoot instanceof HTMLElement)) continue;
    if (readId(widgetRoot) === widgetId) {
      return widgetRoot;
    }
  }
  return null;
}

export function focusWorkbenchWidgetElement(args: {
  root: ParentNode | null | undefined;
  widgetId: string;
  widgetRootAttr?: string;
  readWidgetId?: (element: Element | null) => string | null;
}): boolean {
  const widgetRoot = findWorkbenchWidgetElement(args);
  if (!widgetRoot) return false;

  widgetRoot.focus({ preventScroll: true });
  return true;
}

function createCanvasInputOwner(reason: WorkbenchCanvasOwnerReason): WorkbenchInputOwner {
  return { kind: 'canvas', reason };
}

function createWidgetInputOwner(
  widgetId: string,
  reason: WorkbenchWidgetOwnerReason,
): WorkbenchInputOwner {
  return { kind: 'widget', widgetId, reason };
}

function resolveDefaultWheelRouting(args: {
  target: EventTarget | null;
  disablePanZoom: boolean;
  wheelInteractiveSelector: string;
}): WorkbenchWheelRoutingDecision {
  const routing = resolveSurfaceWheelRouting({
    target: args.target,
    disablePanZoom: args.disablePanZoom,
    wheelInteractiveSelector: args.wheelInteractiveSelector,
  });
  if (routing.kind === 'canvas_zoom') {
    return routing;
  }
  if (routing.kind === 'local_surface') {
    return { kind: 'local_surface', reason: routing.reason };
  }
  return { kind: 'ignore', reason: routing.reason };
}

export function resolveWorkbenchInteractionAdapter(
  adapter?: WorkbenchInteractionAdapter,
): ResolvedWorkbenchInteractionAdapter {
  const surfaceRootAttr = adapter?.surfaceRootAttr ?? DEFAULT_WORKBENCH_SURFACE_ROOT_ATTR;
  const widgetRootAttr = adapter?.widgetRootAttr ?? DEFAULT_WORKBENCH_WIDGET_ROOT_ATTR;
  const widgetIdAttr = adapter?.widgetIdAttr ?? DEFAULT_WORKBENCH_WIDGET_ID_ATTR;
  const dialogSurfaceHostAttr =
    adapter?.dialogSurfaceHostAttr ?? DEFAULT_WORKBENCH_DIALOG_SURFACE_HOST_ATTR;
  const interactiveSelector = adapter?.interactiveSelector ?? '[data-floe-canvas-interactive="true"]';
  const panSurfaceSelector = adapter?.panSurfaceSelector ?? '[data-floe-canvas-pan-surface="true"]';
  const wheelInteractiveSelector =
    adapter?.wheelInteractiveSelector ?? DEFAULT_CANVAS_WHEEL_INTERACTIVE_SELECTOR;
  const readWidgetId = adapter?.readWidgetId ?? ((element: Element | null) =>
    readWorkbenchWidgetId(element, widgetIdAttr));
  const findWidgetRoot = adapter?.findWidgetRoot ?? ((target: EventTarget | null) =>
    findWorkbenchWidgetRoot(target, widgetRootAttr));
  const focusWidgetElement = adapter?.focusWidgetElement ?? ((root, widgetId) =>
    focusWorkbenchWidgetElement({
      root,
      widgetId,
      widgetRootAttr,
      readWidgetId,
    }));

  return {
    ...adapter,
    surfaceRootAttr,
    widgetRootAttr,
    widgetIdAttr,
    dialogSurfaceHostAttr,
    interactiveSelector,
    panSurfaceSelector,
    wheelInteractiveSelector,
    createInitialInputOwner: adapter?.createInitialInputOwner ?? (() => createCanvasInputOwner('initial')),
    createCanvasInputOwner: adapter?.createCanvasInputOwner ?? createCanvasInputOwner,
    createWidgetInputOwner: adapter?.createWidgetInputOwner ?? createWidgetInputOwner,
    readWidgetId,
    findWidgetRoot,
    focusWidgetElement,
    resolveSurfaceTargetRole:
      adapter?.resolveSurfaceTargetRole
      ?? ((args) => resolveSurfaceInteractionTargetRole({
        target: args.target,
        interactiveSelector: args.interactiveSelector,
        panSurfaceSelector: args.panSurfaceSelector,
      })),
    resolveWidgetEventOwnership:
      adapter?.resolveWidgetEventOwnership
      ?? ((args) => resolveWorkbenchWidgetEventOwnership({
        target: args.target,
        widgetRoot: args.widgetRoot,
        interactiveSelector: args.interactiveSelector,
        panSurfaceSelector: args.panSurfaceSelector,
        shellSelector: DEFAULT_WORKBENCH_WIDGET_SHELL_SELECTOR,
      })),
    resolveWheelRouting:
      adapter?.resolveWheelRouting
      ?? ((args) => resolveDefaultWheelRouting({
        target: args.target,
        disablePanZoom: args.disablePanZoom,
        wheelInteractiveSelector: args.wheelInteractiveSelector,
      })),
    shouldBypassGlobalHotkeys:
      adapter?.shouldBypassGlobalHotkeys
      ?? ((args) => {
        const element = resolveElement(args.target);
        return isTypingElement(element);
      }),
  };
}
