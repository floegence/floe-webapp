// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { capturePromptCardAnchor } from '../src/components/ui/PromptCard';
import {
  __resetDialogSurfaceScopeForTests,
  ensureSurfacePortalInteractionTracking,
} from '../src/components/ui/dialogSurfaceScope';

afterEach(() => {
  document.body.replaceChildren();
  __resetDialogSurfaceScopeForTests();
});

function control() {
  const button = document.createElement('button');
  button.getBoundingClientRect = () =>
    ({ left: 850, top: 640, right: 890, bottom: 672, width: 40, height: 32 }) as DOMRect;
  document.body.append(button);
  return button;
}

describe('prompt card contextual anchor', () => {
  it('captures viewport coordinates before the initiating control disappears', () => {
    const button = control();
    const anchor = capturePromptCardAnchor(button);
    button.remove();
    expect(anchor).toEqual({ x: 850, y: 672 });
  });

  it('uses the initiating pointer or keyboard control when no explicit anchor is supplied', () => {
    ensureSurfacePortalInteractionTracking();
    const button = control();
    button.focus();
    expect(capturePromptCardAnchor()).toEqual({ x: 850, y: 672 });
    button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(capturePromptCardAnchor()).toEqual({ x: 850, y: 672 });
  });

  it('does not turn the page, a detached control or an empty box into an anchor', () => {
    expect(capturePromptCardAnchor(document.body)).toBeNull();
    const button = control();
    button.remove();
    expect(capturePromptCardAnchor(button)).toBeNull();
    const empty = document.createElement('span');
    document.body.append(empty);
    expect(capturePromptCardAnchor(empty)).toBeNull();
  });
});
