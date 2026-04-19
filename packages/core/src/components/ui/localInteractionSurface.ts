import { isTypingElement } from '../../utils/dom';

export const LOCAL_INTERACTION_SURFACE_ATTR = 'data-floe-local-interaction-surface';
export const DEFAULT_LOCAL_INTERACTION_SURFACE_SELECTOR =
  `[${LOCAL_INTERACTION_SURFACE_ATTR}="true"]`;
export const CANVAS_WHEEL_INTERACTIVE_ATTR = 'data-floe-canvas-wheel-interactive';
export const DEFAULT_CANVAS_WHEEL_INTERACTIVE_SELECTOR =
  `[${CANVAS_WHEEL_INTERACTIVE_ATTR}="true"]`;
export const WORKBENCH_WIDGET_SHELL_ATTR = 'data-floe-workbench-widget-shell';
export const DEFAULT_WORKBENCH_WIDGET_SHELL_SELECTOR =
  `[${WORKBENCH_WIDGET_SHELL_ATTR}="true"]`;

export type SurfaceInteractionTargetRole = 'canvas' | 'local_surface' | 'pan_surface';
export type SurfaceWheelLocalReason =
  | 'typing_element'
  | 'local_interaction_surface'
  | 'wheel_interactive';
export type SurfaceWheelRoutingDecision =
  | { kind: 'canvas_zoom' }
  | { kind: 'local_surface'; reason: SurfaceWheelLocalReason }
  | { kind: 'ignore'; reason: 'pan_zoom_disabled' };
export type WorkbenchWidgetEventOwnership =
  | 'outside_widget'
  | 'widget_local'
  | 'widget_shell';

export interface SurfaceInteractionRoutingOptions {
  target: EventTarget | null;
  interactiveSelector: string;
  panSurfaceSelector: string;
  localInteractionSurfaceSelector?: string;
}

export interface WorkbenchWidgetEventOwnershipOptions extends SurfaceInteractionRoutingOptions {
  widgetRoot: Element | EventTarget | null;
  shellSelector?: string;
}

export interface SurfaceWheelRoutingOptions {
  target: EventTarget | null;
  disablePanZoom: boolean;
  localInteractionSurfaceSelector?: string;
  wheelInteractiveSelector?: string;
}

function resolveElement(target: Element | EventTarget | null): Element | null {
  if (typeof Element !== 'undefined' && target instanceof Element) {
    return target;
  }
  if (typeof Node !== 'undefined' && target instanceof Node) {
    return target.parentElement;
  }
  return null;
}

export function resolveSurfaceInteractionTargetRole(
  options: SurfaceInteractionRoutingOptions,
): SurfaceInteractionTargetRole {
  const {
    target,
    interactiveSelector,
    panSurfaceSelector,
    localInteractionSurfaceSelector = DEFAULT_LOCAL_INTERACTION_SURFACE_SELECTOR,
  } = options;

  const element = target instanceof Element ? target : null;
  if (!element) return 'canvas';

  if (element.closest(panSurfaceSelector) !== null) {
    return 'pan_surface';
  }

  if (
    isTypingElement(element) ||
    element.closest(interactiveSelector) !== null ||
    element.closest(localInteractionSurfaceSelector) !== null
  ) {
    return 'local_surface';
  }

  return 'canvas';
}

function resolveSurfaceWheelLocalReason(
  options: SurfaceWheelRoutingOptions,
): SurfaceWheelLocalReason | null {
  const {
    target,
    localInteractionSurfaceSelector = DEFAULT_LOCAL_INTERACTION_SURFACE_SELECTOR,
    wheelInteractiveSelector = DEFAULT_CANVAS_WHEEL_INTERACTIVE_SELECTOR,
  } = options;

  const element = resolveElement(target);
  if (!element) return null;

  if (isTypingElement(element)) {
    return 'typing_element';
  }

  if (element.closest(localInteractionSurfaceSelector) !== null) {
    return 'local_interaction_surface';
  }

  if (element.closest(wheelInteractiveSelector) !== null) {
    return 'wheel_interactive';
  }

  return null;
}

export function resolveSurfaceWheelRouting(
  options: SurfaceWheelRoutingOptions,
): SurfaceWheelRoutingDecision {
  const localReason = resolveSurfaceWheelLocalReason(options);
  if (localReason) {
    return { kind: 'local_surface', reason: localReason };
  }

  if (options.disablePanZoom) {
    return { kind: 'ignore', reason: 'pan_zoom_disabled' };
  }

  return { kind: 'canvas_zoom' };
}

export function isLocalInteractionSurfaceTarget(
  options: SurfaceInteractionRoutingOptions,
): boolean {
  return resolveSurfaceInteractionTargetRole(options) !== 'canvas';
}

export function resolveWorkbenchWidgetEventOwnership(
  options: WorkbenchWidgetEventOwnershipOptions,
): WorkbenchWidgetEventOwnership {
  const {
    widgetRoot,
    shellSelector = DEFAULT_WORKBENCH_WIDGET_SHELL_SELECTOR,
  } = options;

  const widgetElement = resolveElement(widgetRoot);
  const targetElement = resolveElement(options.target);
  if (!widgetElement || !targetElement || !widgetElement.contains(targetElement)) {
    return 'outside_widget';
  }

  if (resolveSurfaceInteractionTargetRole(options) !== 'canvas') {
    return 'widget_local';
  }

  if (targetElement === widgetElement || targetElement.closest(shellSelector) !== null) {
    return 'widget_shell';
  }

  return 'widget_local';
}
