import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { useResolvedFloeConfig } from '../context/FloeConfigContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { MobileKeyboard } from '../components/ui/MobileKeyboard';
import type { WidgetProps } from '../context/WidgetRegistry';
import { cn } from '../utils/cn';
import {
  floeTouchSurfaceAttrs,
  preventTouchSurfacePointerDown,
} from '../utils/touchSurfaceGuard';
import {
  autocompleteTerminalCommand,
  createTerminalEditorState,
  DEFAULT_TERMINAL_SUGGESTIONS,
  deleteTerminalTextBackward,
  getTerminalSuggestions,
  insertTerminalText,
  moveTerminalCursor,
  navigateTerminalHistory,
  runTerminalCommand,
  type TerminalEditorState,
} from './terminalWidgetModel';

interface TerminalLine {
  id: number;
  type: 'input' | 'output' | 'error';
  content: string;
}

/**
 * Terminal widget
 */
export function TerminalWidget(props: WidgetProps) {
  const floe = useResolvedFloeConfig();
  const isMobile = useMediaQuery(floe.config.layout.mobileQuery);
  const [lines, setLines] = createSignal<TerminalLine[]>([
    { id: 1, type: 'output', content: 'Welcome to Floe Terminal' },
    { id: 2, type: 'output', content: 'Type "help" for available commands' },
  ]);
  const [editor, setEditor] = createSignal<TerminalEditorState>(
    createTerminalEditorState(),
  );
  const [history, setHistory] = createSignal<string[]>([]);
  const [mobileKeyboardVisible, setMobileKeyboardVisible] = createSignal(false);
  let inputRef: HTMLInputElement | undefined;
  let outputRef: HTMLDivElement | undefined;
  let nextId = 3;

  const inputValue = () => editor().value;
  const cursorIndex = () => editor().cursor;
  const promptPreview = createMemo(() => {
    const value = inputValue();
    const cursor = Math.max(0, Math.min(cursorIndex(), value.length));

    return {
      before: value.slice(0, cursor),
      cursor: cursor < value.length ? value[cursor] ?? ' ' : ' ',
      after: cursor < value.length ? value.slice(cursor + 1) : '',
    };
  });
  const suggestionItems = createMemo(() =>
    getTerminalSuggestions(inputValue(), history(), DEFAULT_TERMINAL_SUGGESTIONS),
  );

  const resetEditor = () => {
    setEditor(createTerminalEditorState());
  };

  const setEditorValue = (value: string) => {
    setEditor(createTerminalEditorState(value));
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    submitCurrentInput();
  };

  const focusInput = () => {
    if (props.isEditMode) return;

    if (isMobile()) {
      setMobileKeyboardVisible(true);
      return;
    }

    inputRef?.focus();
  };

  const appendLines = (newLines: TerminalLine[]) => {
    if (!newLines.length) return;
    setLines((prev) => [...prev, ...newLines]);
  };

  const submitCurrentInput = () => {
    const rawValue = inputValue();
    const command = rawValue.trim();
    if (!command) return;

    setHistory((prev) => [...prev, rawValue]);

    const result = runTerminalCommand(rawValue);
    const inputLine: TerminalLine = {
      id: nextId++,
      type: 'input',
      content: `$ ${rawValue}`,
    };
    const outputLines = result.lines.map((line) => ({
      id: nextId++,
      type: line.type,
      content: line.content,
    }));

    if (result.clear) {
      setLines([]);
    } else {
      appendLines([inputLine, ...outputLines]);
    }

    resetEditor();
  };

  const handleMobilePayload = (payload: string) => {
    if (!payload || props.isEditMode) return;

    if (payload === '\r') {
      submitCurrentInput();
      return;
    }

    if (payload === '\x7f') {
      setEditor((current) => deleteTerminalTextBackward(current));
      return;
    }

    if (payload === '\t') {
      setEditor((current) => {
        const nextValue = autocompleteTerminalCommand(
          current.value,
          history(),
          DEFAULT_TERMINAL_SUGGESTIONS,
        );
        return createTerminalEditorState(nextValue);
      });
      return;
    }

    if (payload === '\x1b[A') {
      setEditor((current) =>
        navigateTerminalHistory(current, history(), 'up'),
      );
      return;
    }

    if (payload === '\x1b[B') {
      setEditor((current) =>
        navigateTerminalHistory(current, history(), 'down'),
      );
      return;
    }

    if (payload === '\x1b[D') {
      setEditor((current) => moveTerminalCursor(current, 'left'));
      return;
    }

    if (payload === '\x1b[C') {
      setEditor((current) => moveTerminalCursor(current, 'right'));
      return;
    }

    if (payload === '\x03') {
      if (inputValue()) {
        appendLines([
          { id: nextId++, type: 'input', content: `$ ${inputValue()}` },
          { id: nextId++, type: 'error', content: '^C' },
        ]);
      } else {
        appendLines([{ id: nextId++, type: 'error', content: '^C' }]);
      }
      resetEditor();
      return;
    }

    if (payload === '\x0c') {
      setLines([]);
      resetEditor();
      return;
    }

    if (payload.startsWith('\x1b')) {
      return;
    }

    setEditor((current) => insertTerminalText(current, payload));
  };

  createEffect(() => {
    lines();
    inputValue();
    mobileKeyboardVisible();

    if (!outputRef) return;
    outputRef.scrollTop = outputRef.scrollHeight;
  });

  createEffect(() => {
    if (!isMobile() || props.isEditMode) {
      setMobileKeyboardVisible(false);
    }
  });

  return (
    <div
      class={cn(
        'relative h-full overflow-hidden rounded-[inherit] bg-terminal-background text-terminal-foreground font-mono text-xs',
        props.isEditMode && 'pointer-events-none',
      )}
      onClick={focusInput}
    >
      <div class="flex h-full min-h-0 flex-col">
        <div
          class="flex items-center justify-between border-b px-3 py-2 text-[11px]"
          style={{
            'border-color': 'color-mix(in srgb, var(--terminal-foreground) 10%, transparent)',
            color: 'color-mix(in srgb, var(--terminal-foreground) 72%, transparent)',
          }}
        >
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full bg-rose-400/80" />
              <span class="h-2 w-2 rounded-full bg-amber-300/80" />
              <span class="h-2 w-2 rounded-full bg-emerald-400/80" />
            </div>
            <span>Terminal Session</span>
          </div>

          <Show when={isMobile() && !props.isEditMode}>
            <button
              type="button"
              class="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors"
              style={{
                background: 'color-mix(in srgb, var(--terminal-foreground) 8%, transparent)',
                color: 'color-mix(in srgb, var(--terminal-foreground) 82%, transparent)',
              }}
              onClick={(event) => {
                event.stopPropagation();
                setMobileKeyboardVisible((visible) => !visible);
              }}
            >
              {mobileKeyboardVisible() ? 'Hide Keys' : 'Show Keys'}
            </button>
          </Show>
        </div>

        <div
          ref={outputRef}
          class="flex-1 overflow-y-auto px-3 py-3 transition-[padding] duration-200"
          style={{
            'padding-bottom':
              isMobile() && mobileKeyboardVisible()
                ? `calc(${suggestionItems().length > 0 ? '16.5rem' : '15rem'} + env(safe-area-inset-bottom))`
                : undefined,
          }}
        >
          <For each={lines()}>
          {(line) => (
            <div
              class={cn(
                'whitespace-pre-wrap break-all leading-6',
                line.type === 'error' && 'text-rose-300',
                line.type === 'input' && 'text-emerald-300',
              )}
            >
              {line.content}
            </div>
          )}
        </For>

          <div
            class="mt-2 rounded-xl px-3 py-2"
            style={{
              background:
                'color-mix(in srgb, var(--terminal-foreground) 5%, transparent)',
              'box-shadow':
                'inset 0 0 0 1px color-mix(in srgb, var(--terminal-foreground) 8%, transparent)',
            }}
          >
            <div class="flex items-start gap-2">
              <span class="pt-0.5 text-emerald-300">$</span>

              <Show
                when={!isMobile()}
                fallback={
                  <button
                    {...floeTouchSurfaceAttrs}
                    type="button"
                    class="min-h-[1.5rem] flex-1 bg-transparent text-left outline-none"
                    aria-label="Terminal input surface"
                    onPointerDown={(event) => {
                      preventTouchSurfacePointerDown(event);
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMobileKeyboardVisible(true);
                    }}
                  >
                    <span class="whitespace-pre-wrap break-all text-terminal-foreground">
                      {promptPreview().before}
                      <span class="mx-[1px] inline-block min-w-[0.65ch] rounded-[2px] bg-terminal-foreground text-terminal-background">
                        {promptPreview().cursor}
                      </span>
                      {promptPreview().after}
                    </span>
                  </button>
                }
              >
                <form onSubmit={handleSubmit} class="flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    class="w-full bg-transparent text-terminal-foreground outline-none"
                    value={inputValue()}
                    onInput={(event) => setEditorValue(event.currentTarget.value)}
                    disabled={props.isEditMode}
                  />
                </form>
              </Show>
            </div>
          </div>
        </div>
      </div>

      <Show when={isMobile() && !props.isEditMode}>
        <MobileKeyboard
          visible={mobileKeyboardVisible()}
          quickInserts={['|', '/', '-', '_', '.', '$']}
          suggestions={suggestionItems()}
          onKey={handleMobilePayload}
          onDismiss={() => setMobileKeyboardVisible(false)}
          onSuggestionSelect={(suggestion) => setEditor(createTerminalEditorState(suggestion))}
        />
      </Show>
    </div>
  );
}
