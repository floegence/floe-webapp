// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { isMacLikePlatform, isPrimaryModKeyPressed } from '../src/utils/keybind';

const originalUserAgent = window.navigator.userAgent;

function setUserAgent(value: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value,
  });
}

describe('keybind platform modifier helpers', () => {
  afterEach(() => {
    setUserAgent(originalUserAgent);
  });

  it('treats meta as the primary modifier on mac-like platforms', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)');

    expect(isMacLikePlatform()).toBe(true);
    expect(isPrimaryModKeyPressed({ metaKey: true, ctrlKey: false })).toBe(true);
    expect(isPrimaryModKeyPressed({ metaKey: false, ctrlKey: true })).toBe(false);
  });

  it('treats ctrl as the primary modifier on non-mac platforms', () => {
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64)');

    expect(isMacLikePlatform()).toBe(false);
    expect(isPrimaryModKeyPressed({ metaKey: false, ctrlKey: true })).toBe(true);
    expect(isPrimaryModKeyPressed({ metaKey: true, ctrlKey: false })).toBe(false);
  });
});
