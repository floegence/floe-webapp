import { isTypingElement } from '../../utils/dom';

export const LOCAL_INTERACTION_SURFACE_ATTR = 'data-floe-local-interaction-surface';
export const DEFAULT_LOCAL_INTERACTION_SURFACE_SELECTOR =
  `[${LOCAL_INTERACTION_SURFACE_ATTR}="true"]`;

export type SurfaceInteractionTargetRole = 'canvas' | 'local_surface' | 'pan_surface';

export interface SurfaceInteractionRoutingOptions {
  target: EventTarget | null;
  interactiveSelector: string;
  panSurfaceSelector: string;
  localInteractionSurfaceSelector?: string;
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
