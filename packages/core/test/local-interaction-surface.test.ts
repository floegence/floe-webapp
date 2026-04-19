// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  CANVAS_WHEEL_INTERACTIVE_ATTR,
  LOCAL_INTERACTION_SURFACE_ATTR,
  WORKBENCH_WIDGET_SHELL_ATTR,
  resolveSurfaceWheelRouting,
  resolveWorkbenchWidgetEventOwnership,
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

function resolveWidgetOwnership(target: EventTarget | null, widgetRoot: Element | null) {
  return resolveWorkbenchWidgetEventOwnership({
    target,
    widgetRoot,
    interactiveSelector: INTERACTIVE_SELECTOR,
    panSurfaceSelector: PAN_SURFACE_SELECTOR,
  });
}

function resolveWheel(target: EventTarget | null, disablePanZoom = false) {
  return resolveSurfaceWheelRouting({
    target,
    disablePanZoom,
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
    expect(resolveWheel(input)).toEqual({ kind: 'local_surface', reason: 'typing_element' });
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
    expect(resolveWheel(child)).toEqual({ kind: 'local_surface', reason: 'local_interaction_surface' });
  });

  it('falls back to canvas when no local affordance is present', () => {
    const plain = document.createElement('div');
    expect(resolveRole(plain)).toBe('canvas');
    expect(resolveWheel(plain)).toEqual({ kind: 'canvas_zoom' });
  });

  it('keeps generic interactive zones zoomable unless they explicitly opt into local wheel ownership', () => {
    const interactive = document.createElement('div');
    interactive.setAttribute('data-floe-canvas-interactive', 'true');
    const child = document.createElement('button');
    interactive.appendChild(child);

    expect(resolveRole(child)).toBe('local_surface');
    expect(resolveWheel(child)).toEqual({ kind: 'canvas_zoom' });
  });

  it('treats explicit wheel-interactive zones as local wheel consumers', () => {
    const wheelInteractive = document.createElement('div');
    wheelInteractive.setAttribute(CANVAS_WHEEL_INTERACTIVE_ATTR, 'true');
    const child = document.createElement('button');
    wheelInteractive.appendChild(child);

    expect(resolveWheel(child)).toEqual({ kind: 'local_surface', reason: 'wheel_interactive' });
  });

  it('ignores canvas zoom when pan/zoom is disabled and no local wheel consumer is present', () => {
    const plain = document.createElement('div');
    expect(resolveWheel(plain, true)).toEqual({ kind: 'ignore', reason: 'pan_zoom_disabled' });
  });

  it('treats explicit widget shell surfaces as shell-owned workbench zones', () => {
    const widget = document.createElement('article');
    const header = document.createElement('header');
    header.setAttribute(WORKBENCH_WIDGET_SHELL_ATTR, 'true');
    const title = document.createElement('span');
    header.appendChild(title);
    widget.appendChild(header);

    expect(resolveWidgetOwnership(title, widget)).toBe('widget_shell');
  });

  it('keeps interactive widget body descendants under local ownership', () => {
    const widget = document.createElement('article');
    const body = document.createElement('div');
    body.setAttribute('data-floe-canvas-interactive', 'true');
    const button = document.createElement('button');
    body.appendChild(button);
    widget.appendChild(body);

    expect(resolveWidgetOwnership(button, widget)).toBe('widget_local');
  });

  it('treats targets outside the widget as outside widget ownership', () => {
    const widget = document.createElement('article');
    const outside = document.createElement('div');

    expect(resolveWidgetOwnership(outside, widget)).toBe('outside_widget');
  });
});
