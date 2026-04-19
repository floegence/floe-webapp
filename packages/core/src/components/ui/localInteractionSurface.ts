import { isTypingElement } from '../../utils/dom';

export const LOCAL_INTERACTION_SURFACE_ATTR = 'data-floe-local-interaction-surface';
export const DEFAULT_LOCAL_INTERACTION_SURFACE_SELECTOR =
  `[${LOCAL_INTERACTION_SURFACE_ATTR}="true"]`;
export const WORKBENCH_WIDGET_SHELL_ATTR = 'data-floe-workbench-widget-shell';
export const DEFAULT_WORKBENCH_WIDGET_SHELL_SELECTOR =
  `[${WORKBENCH_WIDGET_SHELL_ATTR}="true"]`;

export type SurfaceInteractionTargetRole = 'canvas' | 'local_surface' | 'pan_surface';
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
