import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  type Component,
} from 'solid-js';
import { useResolvedFloeConfig } from '../context/FloeConfigContext';
import type { WidgetProps } from '../context/WidgetRegistry';
import { MobileKeyboard } from '../components/ui/MobileKeyboard';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { cn } from '../utils/cn';
import {
  floeTouchSurfaceAttrs,
  preventTouchSurfacePointerDown,
} from '../utils/touchSurfaceGuard';
import {
  applyTerminalSessionSuggestion,
  createTerminalSessionState,
  dispatchTerminalSessionKey,
  getTerminalPromptPreview,
  getTerminalSessionSuggestions,
  normalizeTerminalWorkspaceProfile,
  runTerminalMockCommand,
  setTerminalSessionInputValue,
  submitTerminalSession,
  type TerminalCommandResult,
  type TerminalRuntimeAdapter,
  type TerminalSessionEffect,
  type TerminalSessionTransition,
  type TerminalSuggestionProvider,
  type TerminalWorkspaceProfile,
} from '../terminal';

export interface TerminalWidgetLine {
  id: number;
  type: 'input' | 'output' | 'error';
  content: string;
}

export interface TerminalWidgetProps extends WidgetProps {
  profile?: Partial<TerminalWorkspaceProfile>;
  runtime?: TerminalRuntimeAdapter;
  resolveNow?: () => string;
  suggestionProviders?: readonly TerminalSuggestionProvider[];
  quickInserts?: readonly string[];
}

export type CreateTerminalWidgetOptions =
  Omit<TerminalWidgetProps, 'widgetId' | 'config' | 'isEditMode'>;

export function createTerminalWidget(
  options: CreateTerminalWidgetOptions = {},
): Component<WidgetProps> {
  return (props) => <TerminalWidget {...props} {...options} />;
}

/**
 * Terminal widget
 */
export function TerminalWidget(props: TerminalWidgetProps) {
  const floe = useResolvedFloeConfig();
  const isMobile = useMediaQuery(floe.config.layout.mobileQuery);
  const [lines, setLines] = createSignal<TerminalWidgetLine[]>([
    { id: 1, type: 'output', content: 'Welcome to Floe Terminal' },
    { id: 2, type: 'output', content: 'Type "help" for available commands' },
  ]);
  const [session, setSession] = createSignal(createTerminalSessionState());
  const [mobileKeyboardVisible, setMobileKeyboardVisible] = createSignal(false);
  let inputRef: HTMLInputElement | undefined;
  let outputRef: HTMLDivElement | undefined;
  let nextId = 3;

  const inputValue = () => session().editor.value;
  const terminalProfile = createMemo(() =>
    normalizeTerminalWorkspaceProfile(props.profile),
  );
  const terminalRuntime = () => props.runtime ?? runTerminalMockCommand;
  const promptPreview = createMemo(() => getTerminalPromptPreview(session().editor));
  const suggestionItems = createMemo(() =>
    getTerminalSessionSuggestions(session(), {
      profile: terminalProfile(),
      providers: props.suggestionProviders,
    }),
  );

  const setEditorValue = (value: string) => {
    setSession((current) => setTerminalSessionInputValue(current, value));
  };

  const handleSubmit = (event: Event) => {
    event.preventDefault();
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

  const appendLines = (newLines: TerminalWidgetLine[]) => {
    if (!newLines.length) return;
    setLines((prev) => [...prev, ...newLines]);
  };

  const appendCommandResult = (
    command: string,
    result: TerminalCommandResult,
  ) => {
    const inputLine: TerminalWidgetLine = {
      id: nextId++,
      type: 'input',
      content: `$ ${command}`,
    };
    const outputLines = result.lines.map((line) => ({
      id: nextId++,
      type: line.type,
      content: line.content,
    }));

    if (result.clear) {
      setLines([]);
      return;
    }

    appendLines([inputLine, ...outputLines]);
  };

  const applySessionEffect = (effect: TerminalSessionEffect) => {
    if (effect.type === 'none') return;

    if (effect.type === 'submit') {
      appendCommandResult(
        effect.command,
        terminalRuntime()(effect.command, {
          profile: terminalProfile(),
          resolveNow: props.resolveNow,
        }),
      );
      return;
    }

    if (effect.type === 'interrupt') {
      if (effect.command) {
        appendLines([
          { id: nextId++, type: 'input', content: `$ ${effect.command}` },
          { id: nextId++, type: 'error', content: '^C' },
        ]);
      } else {
        appendLines([{ id: nextId++, type: 'error', content: '^C' }]);
      }
      return;
    }

    setLines([]);
  };

  const applySessionTransition = (transition: TerminalSessionTransition) => {
    setSession(transition.state);
    applySessionEffect(transition.effect);
  };

  const submitCurrentInput = () => {
    applySessionTransition(submitTerminalSession(session()));
  };

  const handleMobilePayload = (payload: string) => {
    if (!payload || props.isEditMode) return;
    applySessionTransition(
      dispatchTerminalSessionKey(session(), payload, {
        profile: terminalProfile(),
        providers: props.suggestionProviders,
      }),
    );
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
          quickInserts={props.quickInserts}
          suggestions={suggestionItems()}
          onKey={handleMobilePayload}
          onDismiss={() => setMobileKeyboardVisible(false)}
          onSuggestionSelect={(suggestion) =>
            setSession((current) => applyTerminalSessionSuggestion(current, suggestion))}
        />
      </Show>
    </div>
  );
}
