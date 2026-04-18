// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  LOCAL_INTERACTION_SURFACE_ATTR,
  resolveSurfaceInteractionTargetRole,
} from '../src/components/ui/localInteractionSurface';

const INTERACTIVE_SELECTOR = '[data-floe-canvas-interactive="true"]';
const PAN_SURFACE_SELECTOR = '[data-floe-canvas-pan-surface="true"]';

function resolveRole(target: EventTarget | null) {
  return resolveSurfaceInteractionTargetRole({
    target,
    interactiveSelector: INTERACTIVE_SELECTOR,
    panSurfaceSelector: PAN_SURFACE_SELECTOR,
  });
}

describe('local interaction surface routing', () => {
  it('treats explicit pan surfaces as pan ownership even when nested inside local surfaces', () => {
    const localSurface = document.createElement('div');
    localSurface.setAttribute(LOCAL_INTERACTION_SURFACE_ATTR, 'true');
    const panButton = document.createElement('button');
    panButton.setAttribute('data-floe-canvas-pan-surface', 'true');
    localSurface.appendChild(panButton);

    expect(resolveRole(panButton)).toBe('pan_surface');
  });

  it('treats typing elements as local surfaces', () => {
    const input = document.createElement('input');
    expect(resolveRole(input)).toBe('local_surface');
  });

  it('treats explicit interactive surfaces as local surfaces', () => {
    const interactive = document.createElement('div');
    interactive.setAttribute('data-floe-canvas-interactive', 'true');
    const child = document.createElement('button');
    interactive.appendChild(child);

    expect(resolveRole(child)).toBe('local_surface');
  });

  it('treats local overlay surfaces as local surfaces', () => {
    const localSurface = document.createElement('div');
    localSurface.setAttribute(LOCAL_INTERACTION_SURFACE_ATTR, 'true');
    const child = document.createElement('button');
    localSurface.appendChild(child);

    expect(resolveRole(child)).toBe('local_surface');
  });

  it('falls back to canvas when no local affordance is present', () => {
    const plain = document.createElement('div');
    expect(resolveRole(plain)).toBe('canvas');
  });
});
