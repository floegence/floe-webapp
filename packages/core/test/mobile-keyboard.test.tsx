import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { MobileKeyboard } from '../src/components/ui/MobileKeyboard';
import {
  applyTerminalModifiers,
  createMobileKeyboardPressTracker,
  DEFAULT_MOBILE_KEYBOARD_QUICK_INSERTS,
  isRepeatableTerminalAction,
  mapTerminalActionToKey,
} from '../src/components/ui/mobileKeyboardModel';
import {
  buildMobileKeyboardViewportStyle,
  resolveMobileKeyboardViewportMetrics,
} from '../src/components/ui/mobileKeyboardViewport';

describe('mobile keyboard model', () => {
  it('should apply ctrl and alt modifiers to text input', () => {
    expect(applyTerminalModifiers('c', { ctrl: true, alt: false })).toBe('\x03');
    expect(applyTerminalModifiers('x', { ctrl: false, alt: true })).toBe('\x1bx');
    expect(applyTerminalModifiers('hello', { ctrl: true, alt: false })).toBe('hello');
  });

  it('should map terminal actions to terminal key payloads', () => {
    expect(mapTerminalActionToKey('enter')).toBe('\r');
    expect(mapTerminalActionToKey('backspace')).toBe('\x7f');
    expect(mapTerminalActionToKey('arrow-up')).toBe('\x1b[A');
  });

  it('should mark repeatable terminal actions for long-press behavior', () => {
    expect(isRepeatableTerminalAction('backspace')).toBe(true);
    expect(isRepeatableTerminalAction('arrow-left')).toBe(true);
    expect(isRepeatableTerminalAction('escape')).toBe(false);
  });

  it('should expose terminal-friendly quick inserts by default', () => {
    expect(DEFAULT_MOBILE_KEYBOARD_QUICK_INSERTS).toEqual(['|', '/', '-', '_', '~']);
  });

  it('should preserve interleaved multi-touch presses without dropping earlier keys', () => {
    const tracker = createMobileKeyboardPressTracker();

    tracker.startPress(1, 'letter-g');
    tracker.startPress(2, 'letter-i');

    expect(tracker.getPressedKeyIds()).toEqual(['letter-g', 'letter-i']);
    expect(tracker.finishPress(1, 'letter-g')).toEqual({
      keyId: 'letter-g',
      shouldActivate: true,
    });
    expect(tracker.getPressedKeyIds()).toEqual(['letter-i']);
    expect(tracker.finishPress(2, 'letter-i')).toEqual({
      keyId: 'letter-i',
      shouldActivate: true,
    });
    expect(tracker.getPressedKeyIds()).toEqual([]);
  });

  it('should suppress tap activation after a long-press repeat for one pointer only', () => {
    const tracker = createMobileKeyboardPressTracker();

    tracker.startPress(1, 'backspace');
    tracker.startPress(2, 'letter-a');
    tracker.markRepeated(1);

    expect(tracker.finishPress(1, 'backspace')).toEqual({
      keyId: 'backspace',
      shouldActivate: false,
    });
    expect(tracker.finishPress(2, 'letter-a')).toEqual({
      keyId: 'letter-a',
      shouldActivate: true,
    });
  });

  it('should keep a key pressed until the last matching pointer is released', () => {
    const tracker = createMobileKeyboardPressTracker();

    tracker.startPress(1, 'letter-a');
    tracker.startPress(2, 'letter-a');

    expect(tracker.isPressed('letter-a')).toBe(true);
    tracker.finishPress(1, 'letter-a');
    expect(tracker.isPressed('letter-a')).toBe(true);
    tracker.finishPress(2, 'letter-a');
    expect(tracker.isPressed('letter-a')).toBe(false);
  });
});

describe('mobile keyboard viewport', () => {
  it('should follow the visual viewport width and bottom offset when the page is zoomed', () => {
    expect(
      resolveMobileKeyboardViewportMetrics({
        innerWidth: 1024,
        innerHeight: 768,
        visualViewport: {
          width: 480,
          height: 320,
          offsetLeft: 120,
          offsetTop: 180,
        },
      }),
    ).toEqual({
      leftPx: 120,
      bottomPx: 268,
      widthPx: 480,
      heightPx: 320,
    });
  });

  it('should clamp invalid viewport metrics back to the layout viewport', () => {
    expect(
      resolveMobileKeyboardViewportMetrics({
        innerWidth: 390,
        innerHeight: 844,
        visualViewport: {
          width: 999,
          height: 1200,
          offsetLeft: -24,
          offsetTop: -30,
        },
      }),
    ).toEqual({
      leftPx: 0,
      bottomPx: 0,
      widthPx: 390,
      heightPx: 844,
    });
  });

  it('should serialize viewport metrics into css custom properties', () => {
    expect(
      buildMobileKeyboardViewportStyle({
        leftPx: 18.5,
        bottomPx: 24,
        widthPx: 375,
        heightPx: 640,
      }),
    ).toEqual({
      '--mobile-keyboard-viewport-left': '18.5px',
      '--mobile-keyboard-viewport-bottom': '24px',
      '--mobile-keyboard-viewport-width': '375px',
      '--mobile-keyboard-viewport-height': '640px',
    });
  });
});

describe('MobileKeyboard markup', () => {
  it('should render a full terminal keyboard when visible', () => {
    const html = renderToString(() => (
      <MobileKeyboard
        visible
        suggestions={[
          { id: 'git-status', label: 'git status', kind: 'command', detail: 'git' },
          { id: 'git-diff', label: 'git diff', kind: 'command', detail: 'git' },
        ]}
        onKey={() => {}}
        onDismiss={() => {}}
      />
    ));

    expect(html).toContain('mobile-keyboard-root');
    expect(html).toContain('mobile-keyboard-visible');
    expect(html).toContain('data-floe-touch-surface="true"');
    expect(html).toContain('mobile-keyboard-dismiss');
    expect(html).toContain('mobile-keyboard-suggestion-rail');
    expect(html).toContain('mobile-keyboard-top-strip');
    expect(html).toContain('mobile-keyboard-direction-pad');
    expect(html).toContain('mobile-keyboard-key-space');
    expect(html).toContain('Close keyboard');
    expect(html).toContain('Hide');
    expect(html).toContain('git status');
    expect(html).toContain('data-kind="command"');
    expect(html).toContain('Esc');
    expect(html).toContain('Ctrl');
    expect(html).toContain('Shift');
    expect(html).toContain('123');
    expect(html).toContain('Enter');
  });
});
