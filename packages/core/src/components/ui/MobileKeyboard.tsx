import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  Show,
  splitProps,
  type JSX,
} from 'solid-js';
import { cn } from '../../utils/cn';
import {
  applyTerminalModifiers,
  createMobileKeyboardPressTracker,
  DEFAULT_MOBILE_KEYBOARD_QUICK_INSERTS,
  isRepeatableTerminalAction,
  mapTerminalActionToKey,
  type MobileKeyboardAction,
  type MobileKeyboardLayout,
} from './mobileKeyboardModel';
import {
  floeTouchSurfaceAttrs,
  preventTouchSurfacePointerDown,
} from '../../utils/touchSurfaceGuard';
import {
  buildMobileKeyboardViewportStyle,
  resolveMobileKeyboardViewportMetrics,
} from './mobileKeyboardViewport';

export interface MobileKeyboardSuggestionItem {
  id: string;
  label: string;
  detail?: string;
  kind?: string;
}

export interface MobileKeyboardProps<
  TSuggestion extends MobileKeyboardSuggestionItem = MobileKeyboardSuggestionItem,
> extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Whether the keyboard is visible */
  visible: boolean;
  /** Called whenever a key resolves to a terminal payload */
  onKey?: (key: string) => void;
  /** Called when the user dismisses the keyboard from the built-in control */
  onDismiss?: () => void;
  /** Additional terminal-friendly quick insert keys shown in the utility strip */
  quickInserts?: readonly string[];
  /** Optional terminal suggestions shown in a dedicated candidate rail */
  suggestions?: readonly TSuggestion[];
  /** Called when the user picks one of the terminal suggestions */
  onSuggestionSelect?: (suggestion: TSuggestion) => void;
}

type ModifierKey = 'ctrl' | 'alt' | 'shift';
type KeyWidth = 'normal' | 'wide' | 'space';
type DirectionPadPosition = 'up' | 'left' | 'down' | 'right';

interface KeyboardKeySpec {
  keyId: string;
  label: string;
  repeatable: boolean;
  activate: () => void;
  width?: KeyWidth;
  active?: boolean;
  kind?: 'text' | 'terminal' | 'modifier' | 'mode';
  class?: string;
}

interface KeyPopupState {
  pointerId: number;
  label: string;
  left: number;
  top: number;
  visible: boolean;
}

function mergeInlineStyle(
  base: Record<string, string>,
  style: JSX.CSSProperties | string | undefined,
): JSX.CSSProperties | string | undefined {
  if (typeof style === 'string') {
    const baseEntries = Object.entries(base)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
    return baseEntries ? `${style}; ${baseEntries}` : style;
  }

  return {
    ...(style ?? {}),
    ...base,
  };
}

const LETTER_ROW_ONE = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'] as const;
const LETTER_ROW_TWO = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'] as const;
const LETTER_ROW_THREE = ['z', 'x', 'c', 'v', 'b', 'n', 'm'] as const;

const SYMBOL_ROW_ONE = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;
const SYMBOL_ROW_TWO = ['@', '#', '$', '%', '&', '*', '(', ')', '[', ']'] as const;
const SYMBOL_ROW_THREE = ['+', '=', '{', '}', '.', ',', '?', '!', "'"] as const;

const TOP_ACTIONS: ReadonlyArray<{ action: MobileKeyboardAction; label: string }> = [
  { action: 'escape', label: 'Esc' },
  { action: 'tab', label: 'Tab' },
];

const DIRECTION_PAD_ACTIONS: ReadonlyArray<{
  action: MobileKeyboardAction;
  label: string;
  position: DirectionPadPosition;
}> = [
  { action: 'arrow-up', label: '↑', position: 'up' },
  { action: 'arrow-left', label: '←', position: 'left' },
  { action: 'arrow-down', label: '↓', position: 'down' },
  { action: 'arrow-right', label: '→', position: 'right' },
];

const HOLD_REPEAT_DELAY_MS = 320;
const HOLD_REPEAT_INTERVAL_MS = 68;

export function MobileKeyboard<
  TSuggestion extends MobileKeyboardSuggestionItem = MobileKeyboardSuggestionItem,
>(props: MobileKeyboardProps<TSuggestion>) {
  const [local, rest] = splitProps(props, [
    'visible',
    'onKey',
    'onDismiss',
    'quickInserts',
    'suggestions',
    'onSuggestionSelect',
    'class',
    'style',
  ]);

  const [layout, setLayout] = createSignal<MobileKeyboardLayout>('letters');
  const [ctrlActive, setCtrlActive] = createSignal(false);
  const [altActive, setAltActive] = createSignal(false);
  const [shiftActive, setShiftActive] = createSignal(false);
  const [pressedKeyIds, setPressedKeyIds] = createSignal<string[]>([]);
  const [popupState, setPopupState] = createSignal<KeyPopupState | null>(null);
  const [viewportStyle, setViewportStyle] = createSignal<Record<string, string>>({});
  const pressedKeySet = createMemo(() => new Set(pressedKeyIds()));

  let panelRef: HTMLDivElement | undefined;
  let popupHideTimer: ReturnType<typeof setTimeout> | undefined;
  const pressTracker = createMobileKeyboardPressTracker();
  const repeatPressTimers = new Map<
    number,
    {
      delayTimer?: ReturnType<typeof setTimeout>;
      intervalTimer?: ReturnType<typeof setInterval>;
    }
  >();

  const quickInsertItems = () => local.quickInserts ?? DEFAULT_MOBILE_KEYBOARD_QUICK_INSERTS;
  const suggestionItems = createMemo(() => local.suggestions ?? []);
  const rootStyle = createMemo(() => mergeInlineStyle(viewportStyle(), local.style));

  const clearOneShotModifiers = () => {
    setCtrlActive(false);
    setAltActive(false);
    setShiftActive(false);
  };

  const clearPopupHideTimer = () => {
    if (!popupHideTimer) return;
    clearTimeout(popupHideTimer);
    popupHideTimer = undefined;
  };

  const syncPressedKeys = () => {
    setPressedKeyIds(pressTracker.getPressedKeyIds());
  };

  const clearRepeatPress = (pointerId: number) => {
    const repeatTimers = repeatPressTimers.get(pointerId);
    if (!repeatTimers) return;

    if (repeatTimers.delayTimer) {
      clearTimeout(repeatTimers.delayTimer);
    }
    if (repeatTimers.intervalTimer) {
      clearInterval(repeatTimers.intervalTimer);
    }

    repeatPressTimers.delete(pointerId);
  };

  const clearAllRepeatPresses = () => {
    for (const pointerId of repeatPressTimers.keys()) {
      clearRepeatPress(pointerId);
    }
  };

  const resetKeyboardState = () => {
    setLayout('letters');
    clearOneShotModifiers();
    pressTracker.reset();
    setPressedKeyIds([]);
    setPopupState(null);
    clearPopupHideTimer();
    clearAllRepeatPresses();
  };

  const emitKey = (value: string) => {
    if (!value) return;
    local.onKey?.(value);
  };

  const dispatchText = (value: string) => {
    emitKey(
      applyTerminalModifiers(value, {
        ctrl: ctrlActive(),
        alt: altActive(),
      }),
    );
    clearOneShotModifiers();
  };

  const dispatchAction = (action: MobileKeyboardAction) => {
    emitKey(mapTerminalActionToKey(action));
    setCtrlActive(false);
    setAltActive(false);
  };

  const resolveLetterLabel = (value: string) => {
    if (layout() !== 'letters') return value;
    return shiftActive() ? value.toUpperCase() : value;
  };

  const activateModifier = (modifier: ModifierKey) => {
    switch (modifier) {
      case 'ctrl':
        setCtrlActive((value) => !value);
        return;
      case 'alt':
        setAltActive((value) => !value);
        return;
      case 'shift':
        setShiftActive((value) => !value);
    }
  };

  const activateLayout = (nextLayout: MobileKeyboardLayout) => {
    setLayout(nextLayout);
    setShiftActive(false);
  };

  const showKeyPopup = (
    pointerId: number,
    label: string,
    target: HTMLElement,
  ) => {
    const panelRect = panelRef?.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    clearPopupHideTimer();

    if (!panelRect) return;

    setPopupState({
      pointerId,
      label,
      left: targetRect.left - panelRect.left + targetRect.width / 2,
      top: targetRect.top - panelRect.top,
      visible: true,
    });
  };

  const hideKeyPopup = (pointerId: number) => {
    if (popupState()?.pointerId !== pointerId) return;

    clearPopupHideTimer();
    popupHideTimer = setTimeout(() => {
      setPopupState((current) =>
        current?.pointerId === pointerId ? { ...current, visible: false } : current,
      );
      popupHideTimer = undefined;
    }, 100);
  };

  const startRepeatPress = (
    pointerId: number,
    keyId: string,
    repeatable: boolean,
    activate: () => void,
  ) => {
    clearRepeatPress(pointerId);

    if (!repeatable || typeof window === 'undefined') return;

    const repeatTimers: {
      delayTimer?: ReturnType<typeof setTimeout>;
      intervalTimer?: ReturnType<typeof setInterval>;
    } = {};
    repeatPressTimers.set(pointerId, repeatTimers);

    repeatTimers.delayTimer = setTimeout(() => {
      repeatTimers.delayTimer = undefined;
      if (!pressTracker.hasPress(pointerId, keyId)) return;

      pressTracker.markRepeated(pointerId);
      activate();

      repeatTimers.intervalTimer = setInterval(() => {
        if (!pressTracker.hasPress(pointerId, keyId)) {
          clearRepeatPress(pointerId);
          return;
        }

        activate();
      }, HOLD_REPEAT_INTERVAL_MS);
    }, HOLD_REPEAT_DELAY_MS);
  };

  const handleKeyPointerDown = (
    key: KeyboardKeySpec,
    event: PointerEvent & { currentTarget: HTMLButtonElement }
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pressTracker.startPress(event.pointerId, key.keyId);
    syncPressedKeys();
    showKeyPopup(event.pointerId, key.label, event.currentTarget);
    startRepeatPress(event.pointerId, key.keyId, key.repeatable, key.activate);
  };

  const handleKeyPointerUp = (
    key: KeyboardKeySpec,
    event: PointerEvent & { currentTarget: HTMLButtonElement },
  ) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    clearRepeatPress(event.pointerId);
    const resolution = pressTracker.finishPress(event.pointerId, key.keyId);
    syncPressedKeys();
    hideKeyPopup(event.pointerId);

    if (resolution.shouldActivate) {
      key.activate();
    }
  };

  const handleKeyPointerCancel = (event: PointerEvent & { currentTarget: HTMLButtonElement }) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    clearRepeatPress(event.pointerId);
    pressTracker.cancelPress(event.pointerId);
    syncPressedKeys();
    hideKeyPopup(event.pointerId);
  };

  const handleKeyClick = (
    key: KeyboardKeySpec,
    event: MouseEvent & { currentTarget: HTMLButtonElement }
  ) => {
    if (event.detail !== 0) return;
    key.activate();
  };

  const createTextKey = (value: string, options?: Partial<KeyboardKeySpec>): KeyboardKeySpec => ({
    keyId: options?.keyId ?? `text-${value}`,
    label: options?.label ?? value,
    repeatable: false,
    activate: () => dispatchText(value),
    width: options?.width,
    class: options?.class,
    kind: 'text',
  });

  const createActionKey = (
    action: MobileKeyboardAction,
    label: string,
    options?: Partial<KeyboardKeySpec>,
  ): KeyboardKeySpec => ({
    keyId: options?.keyId ?? `action-${action}`,
    label,
    repeatable: options?.repeatable ?? isRepeatableTerminalAction(action),
    activate: () => dispatchAction(action),
    width: options?.width,
    class: options?.class,
    kind: 'terminal',
  });

  const createModifierKey = (
    modifier: ModifierKey,
    label: string,
    options?: Partial<KeyboardKeySpec>,
  ): KeyboardKeySpec => ({
    keyId: `modifier-${modifier}`,
    label,
    repeatable: false,
    activate: () => activateModifier(modifier),
    width: modifier === 'shift' ? 'wide' : 'normal',
    active:
      modifier === 'ctrl'
        ? ctrlActive()
        : modifier === 'alt'
          ? altActive()
          : shiftActive(),
    kind: 'modifier',
    class: options?.class,
  });

  const utilityStripKeys = createMemo<KeyboardKeySpec[]>(() => [
    ...TOP_ACTIONS.map((item) =>
      createActionKey(item.action, item.label, {
        class: 'mobile-keyboard-key-compact',
      }),
    ),
    createModifierKey('ctrl', 'Ctrl', {
      class: 'mobile-keyboard-key-compact',
    }),
    createModifierKey('alt', 'Alt', {
      class: 'mobile-keyboard-key-compact',
    }),
    ...quickInsertItems().map((item) =>
      createTextKey(item, {
        keyId: `quick-${item}`,
        class: 'mobile-keyboard-key-compact mobile-keyboard-key-utility',
      }),
    ),
  ]);

  const mainRows = createMemo<KeyboardKeySpec[][]>(() => {
    if (layout() === 'symbols') {
      return [
        SYMBOL_ROW_ONE.map((item) => createTextKey(item)),
        SYMBOL_ROW_TWO.map((item) => createTextKey(item)),
        [
          ...SYMBOL_ROW_THREE.map((item) => createTextKey(item)),
          createActionKey('backspace', '⌫', {
            width: 'wide',
            class: 'mobile-keyboard-key-backspace',
          }),
        ],
      ];
    }

    return [
      LETTER_ROW_ONE.map((item) => createTextKey(resolveLetterLabel(item), { keyId: `letter-${item}` })),
      LETTER_ROW_TWO.map((item) => createTextKey(resolveLetterLabel(item), { keyId: `letter-${item}` })),
      [
        createModifierKey('shift', 'Shift'),
        ...LETTER_ROW_THREE.map((item) => createTextKey(resolveLetterLabel(item), { keyId: `letter-${item}` })),
        createActionKey('backspace', '⌫', {
          width: 'wide',
          class: 'mobile-keyboard-key-backspace',
        }),
      ],
    ];
  });

  const bottomRowKeys = createMemo<KeyboardKeySpec[]>(() => [
    {
      keyId: 'mode-switch',
      label: layout() === 'letters' ? '123' : 'ABC',
      repeatable: false,
      activate: () => activateLayout(layout() === 'letters' ? 'symbols' : 'letters'),
      width: 'wide',
      kind: 'mode',
      class: 'mobile-keyboard-key-bottom-mode',
    },
    createTextKey(' ', {
      keyId: 'space',
      label: 'Space',
      width: 'space',
      class: 'mobile-keyboard-key-bottom-space',
    }),
    createActionKey('enter', 'Enter', {
      width: 'wide',
      class: 'mobile-keyboard-key-bottom-enter',
    }),
  ]);

  const directionPadKeys = createMemo<KeyboardKeySpec[]>(() =>
    DIRECTION_PAD_ACTIONS.map((item) =>
      createActionKey(item.action, item.label, {
        class: `mobile-keyboard-direction-key mobile-keyboard-direction-key-${item.position}`,
      }),
    ),
  );

  const renderKey = (key: KeyboardKeySpec) => (
    <button
      type="button"
      class={cn(
        'mobile-keyboard-key',
        key.kind === 'terminal' && 'mobile-keyboard-key-terminal',
        key.kind === 'modifier' && 'mobile-keyboard-key-modifier',
        key.kind === 'mode' && 'mobile-keyboard-key-mode',
        key.width === 'wide' && 'mobile-keyboard-key-wide',
        key.width === 'space' && 'mobile-keyboard-key-space',
        key.active && 'mobile-keyboard-key-active',
        pressedKeySet().has(key.keyId) && 'mobile-keyboard-key-pressed',
        key.class,
      )}
      aria-pressed={key.active}
      onPointerDown={(event) => handleKeyPointerDown(key, event)}
      onPointerUp={(event) => handleKeyPointerUp(key, event)}
      onPointerCancel={handleKeyPointerCancel}
      onClick={(event) => handleKeyClick(key, event)}
    >
      {key.label}
    </button>
  );

  const renderDismissButton = () => (
    <Show when={local.onDismiss}>
      <button
        {...floeTouchSurfaceAttrs}
        type="button"
        class="mobile-keyboard-dismiss"
        aria-label="Close keyboard"
        onPointerDown={(event) => {
          preventTouchSurfacePointerDown(event);
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          local.onDismiss?.();
        }}
      >
        Hide
      </button>
    </Show>
  );

  createEffect(() => {
    if (local.visible) return;
    resetKeyboardState();
  });

  createEffect(() => {
    if (typeof window === 'undefined' || !local.visible) {
      setViewportStyle({});
      return;
    }

    const syncViewportStyle = () => {
      setViewportStyle(
        buildMobileKeyboardViewportStyle(
          resolveMobileKeyboardViewportMetrics({
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            visualViewport: window.visualViewport,
          }),
        ),
      );
    };

    syncViewportStyle();

    const visualViewport = window.visualViewport;
    window.addEventListener('resize', syncViewportStyle);
    window.addEventListener('orientationchange', syncViewportStyle);
    visualViewport?.addEventListener('resize', syncViewportStyle);
    visualViewport?.addEventListener('scroll', syncViewportStyle);

    onCleanup(() => {
      window.removeEventListener('resize', syncViewportStyle);
      window.removeEventListener('orientationchange', syncViewportStyle);
      visualViewport?.removeEventListener('resize', syncViewportStyle);
      visualViewport?.removeEventListener('scroll', syncViewportStyle);
    });
  });

  onCleanup(() => {
    clearPopupHideTimer();
    clearAllRepeatPresses();
  });

  return (
    <div
      {...floeTouchSurfaceAttrs}
      class={cn('mobile-keyboard-root', local.visible && 'mobile-keyboard-visible', local.class)}
      style={rootStyle()}
      aria-hidden={!local.visible}
      role="group"
      aria-label="Mobile terminal keyboard"
      {...rest}
    >
      <div ref={panelRef} class="mobile-keyboard-panel">
        <div
          class={cn(
            'mobile-keyboard-popup',
            popupState()?.visible && 'mobile-keyboard-popup-visible',
          )}
          style={{
            left: `${popupState()?.left ?? 0}px`,
            top: `${popupState()?.top ?? 0}px`,
          }}
        >
          {popupState()?.label ?? ''}
        </div>

        <div class="mobile-keyboard-scroll">
          <Show when={suggestionItems().length > 0}>
            <div class="mobile-keyboard-rail-shell">
              <div
                class="mobile-keyboard-suggestion-rail"
                role="list"
                aria-label="Terminal suggestions"
              >
                <For each={suggestionItems()}>
                  {(suggestion) => (
                    <button
                      {...floeTouchSurfaceAttrs}
                      type="button"
                      class="mobile-keyboard-suggestion"
                      data-kind={suggestion.kind}
                      title={suggestion.detail ?? suggestion.label}
                      aria-label={suggestion.detail
                        ? `${suggestion.label} (${suggestion.detail})`
                        : suggestion.label}
                      onPointerDown={preventTouchSurfacePointerDown}
                      onClick={() => local.onSuggestionSelect?.(suggestion)}
                    >
                      {suggestion.label}
                    </button>
                  )}
                </For>
              </div>
              {renderDismissButton()}
            </div>
          </Show>

          <div class="mobile-keyboard-rail-shell">
            <div class="mobile-keyboard-top-strip">
              <For each={utilityStripKeys()}>{(key) => renderKey(key)}</For>
            </div>
            <Show when={local.onDismiss && suggestionItems().length === 0}>
              {renderDismissButton()}
            </Show>
          </div>

          <div class="mobile-keyboard-main">
            <For each={mainRows()}>
              {(row) => (
                <div class="mobile-keyboard-row">
                  <For each={row}>{(key) => renderKey(key)}</For>
                </div>
              )}
            </For>
          </div>

          <div class="mobile-keyboard-bottom-zone">
            {renderKey(bottomRowKeys()[0]!)}
            {renderKey(bottomRowKeys()[1]!)}

            <div class="mobile-keyboard-direction-pad" role="group" aria-label="Arrow keys">
              <For each={directionPadKeys()}>{(key) => renderKey(key)}</For>
            </div>

            {renderKey(bottomRowKeys()[2]!)}
          </div>
        </div>
      </div>
    </div>
  );
}
