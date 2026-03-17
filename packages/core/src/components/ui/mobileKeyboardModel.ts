export type MobileKeyboardAction =
  | 'escape'
  | 'tab'
  | 'enter'
  | 'backspace'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right';

export type MobileKeyboardLayout = 'letters' | 'symbols';

export interface MobileKeyboardModifierState {
  ctrl: boolean;
  alt: boolean;
}

interface MobileKeyboardActivePress {
  keyId: string;
  didRepeat: boolean;
}

export interface MobileKeyboardPressResolution {
  keyId: string | null;
  shouldActivate: boolean;
}

export const DEFAULT_MOBILE_KEYBOARD_QUICK_INSERTS = ['|', '/', '-', '_', '~'];

export function applyTerminalModifiers(
  text: string,
  modifiers: MobileKeyboardModifierState,
): string {
  if (!text) return '';

  let next = text;

  if (modifiers.ctrl && text.length === 1) {
    const code = text.toLowerCase().charCodeAt(0);
    if (code >= 97 && code <= 122) {
      next = String.fromCharCode(code - 96);
    }
  }

  if (modifiers.alt) {
    next = `\x1b${next}`;
  }

  return next;
}

export function mapTerminalActionToKey(action: MobileKeyboardAction): string {
  switch (action) {
    case 'enter':
      return '\r';
    case 'backspace':
      return '\x7f';
    case 'tab':
      return '\t';
    case 'escape':
      return '\x1b';
    case 'arrow-up':
      return '\x1b[A';
    case 'arrow-down':
      return '\x1b[B';
    case 'arrow-left':
      return '\x1b[D';
    case 'arrow-right':
      return '\x1b[C';
  }
}

export function isRepeatableTerminalAction(action: MobileKeyboardAction): boolean {
  switch (action) {
    case 'tab':
    case 'enter':
    case 'backspace':
    case 'arrow-up':
    case 'arrow-down':
    case 'arrow-left':
    case 'arrow-right':
      return true;
    case 'escape':
      return false;
  }
}

export function createMobileKeyboardPressTracker() {
  const activePresses = new Map<number, MobileKeyboardActivePress>();
  const pressedKeyCounts = new Map<string, number>();

  const incrementPressedKey = (keyId: string) => {
    pressedKeyCounts.set(keyId, (pressedKeyCounts.get(keyId) ?? 0) + 1);
  };

  const decrementPressedKey = (keyId: string) => {
    const nextCount = (pressedKeyCounts.get(keyId) ?? 0) - 1;

    if (nextCount > 0) {
      pressedKeyCounts.set(keyId, nextCount);
      return;
    }

    pressedKeyCounts.delete(keyId);
  };

  return {
    startPress(pointerId: number, keyId: string) {
      const previousPress = activePresses.get(pointerId);
      if (previousPress) {
        decrementPressedKey(previousPress.keyId);
      }

      activePresses.set(pointerId, {
        keyId,
        didRepeat: false,
      });
      incrementPressedKey(keyId);
    },

    markRepeated(pointerId: number) {
      const activePress = activePresses.get(pointerId);
      if (!activePress) return false;

      activePress.didRepeat = true;
      return true;
    },

    finishPress(pointerId: number, keyId: string): MobileKeyboardPressResolution {
      const activePress = activePresses.get(pointerId);
      if (!activePress) {
        return {
          keyId: null,
          shouldActivate: false,
        };
      }

      activePresses.delete(pointerId);
      decrementPressedKey(activePress.keyId);

      return {
        keyId: activePress.keyId,
        shouldActivate: activePress.keyId === keyId && !activePress.didRepeat,
      };
    },

    cancelPress(pointerId: number): string | null {
      const activePress = activePresses.get(pointerId);
      if (!activePress) return null;

      activePresses.delete(pointerId);
      decrementPressedKey(activePress.keyId);
      return activePress.keyId;
    },

    hasPress(pointerId: number, keyId?: string) {
      const activePress = activePresses.get(pointerId);
      if (!activePress) return false;
      return keyId ? activePress.keyId === keyId : true;
    },

    isPressed(keyId: string) {
      return pressedKeyCounts.has(keyId);
    },

    getPressedKeyIds() {
      return [...pressedKeyCounts.keys()];
    },

    reset() {
      activePresses.clear();
      pressedKeyCounts.clear();
    },
  };
}
