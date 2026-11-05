import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  untrack,
  type JSX,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { useOverlayMask } from '../../hooks/useOverlayMask';
import { deferAfterPaint } from '../../utils/defer';
import {
  ensureSurfacePortalInteractionTracking,
  readFreshInteractionSnapshot,
} from './dialogSurfaceScope';
import {
  resolveSurfacePortalHost,
  resolveSurfacePortalMount,
  resolveSurfacePortalBoundaryRect,
  resolveSurfacePortalScale,
  projectSurfacePortalPosition,
  isSurfacePortalMode,
} from './surfacePortalScope';
import { cn } from '../../utils/cn';
import { observeViewport, readViewportSnapshot } from '../../viewport';
import { ArrowUp, Paperclip, X } from '../icons';
import { Button } from './Button';
import { Select, type SelectOption } from './Select';
import { createFloatingPresence } from './floatingPresence';

export interface PromptCardProps {
  open: boolean;
  /** Viewport coordinates captured by the host at the contextual action. */
  anchor?: Readonly<{ x: number; y: number }> | null;
  viewportInsets?: Readonly<{ top?: number; right?: number; bottom?: number; left?: number }>;
  /** Defaults to the trigger's surface. Viewport scope is an explicit host choice. */
  portalScope?: 'surface' | 'viewport';
  owner?: HTMLElement;
  title: string;
  icon?: JSX.Element;
  closeLabel: string;
  question: JSX.Element;
  value: string;
  onValueChange: (value: string) => void;
  inputLabel: string;
  placeholder?: string;
  submitLabel: string;
  onSubmit: () => void;
  onClose: () => void;
  busy?: boolean;
  inputDisabled?: boolean;
  submitDisabled?: boolean;
  autoFocus?: boolean;
  references?: JSX.Element;
  /** Optional host-owned files; selection, paste and drop share this callback. */
  attachment?: Readonly<{ label: string; accept?: string; onFiles: (files: File[]) => void }>;
  /** Compact host-owned choice, for example an assistant model. */
  selection?: Readonly<{
    label: string;
    placeholder?: string;
    value: string;
    options: readonly SelectOption[];
    onChange: (value: string) => void;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
  }>;
  /** Host input/scroll ownership attributes for the constrained reading viewport. */
  bodyProps?: JSX.HTMLAttributes<HTMLDivElement>;
  feedback?: JSX.Element;
  /** Additional portalled content that belongs to this interaction. */
  containsTarget?: (target: EventTarget | null) => boolean;
  onActivate?: () => void;
  editorRef?: (element: HTMLTextAreaElement) => void;
  class?: string;
  zIndex?: number;
}

/** A short contextual input. The host owns the draft and asynchronous result. */
export function PromptCard(props: PromptCardProps) {
  ensureSurfacePortalInteractionTracking();
  const titleID = createUniqueId();
  const [queued, setQueued] = createSignal(false);
  const [selectionOpen, setSelectionOpen] = createSignal(false);
  const busy = () => props.busy || queued();
  let disposed = false;
  onCleanup(() => {
    disposed = true;
  });
  const [viewport, setViewport] = createSignal(readViewportSnapshot(window));
  const [card, setCard] = createSignal<HTMLDivElement>();
  const [size, setSize] = createSignal({ width: 0, height: 0 });
  const anchor = createMemo<PromptCardProps['anchor']>((previous) =>
    props.open ? props.anchor : previous
  );
  const presence = createFloatingPresence({ open: () => props.open, element: card });
  let editor: HTMLTextAreaElement | undefined;
  let returnFocus: HTMLElement | undefined;
  let composing = false;
  let fileInput: HTMLInputElement | undefined;
  let selectionControl: HTMLButtonElement | HTMLInputElement | undefined;
  const receiveFiles = (files: File[]) => {
    if (props.open && !busy() && !props.inputDisabled && files.length)
      props.attachment?.onFiles(files);
  };
  createEffect(() => {
    if (!props.open || busy() || props.inputDisabled) setSelectionOpen(false);
  });
  const scope = createMemo(() => {
    if (!presence.mounted() || props.portalScope === 'viewport')
      return { host: null, boundaryHost: null, mountHost: null, mode: 'global' as const };
    return resolveSurfacePortalHost({ owner: props.owner });
  });
  const local = () => isSurfacePortalMode(scope());
  const scale = createMemo(() => {
    void viewport();
    void size();
    return local()
      ? resolveSurfacePortalScale(scope())
      : { x: viewport().fixedScale, y: viewport().fixedScale };
  });

  createEffect(() => {
    if (presence.mounted()) onCleanup(observeViewport(window, setViewport));
  });
  createEffect(() => {
    const staticElement = card();
    if (!presence.mounted() || !staticElement) return;
    const measure = () =>
      setSize((previous) => {
        const width = staticElement.offsetWidth,
          height = staticElement.offsetHeight;
        return previous.width === width && previous.height === height
          ? previous
          : { width, height };
      });
    const observer = new ResizeObserver(measure);
    observer.observe(staticElement);
    measure();
    onCleanup(() => observer.disconnect());
  });
  const geometry = createMemo(() => {
    const view = viewport();
    const boundary = local() ? resolveSurfacePortalBoundaryRect(scope()) : view.visible;
    const margin = view.visible.width < 640 ? 8 : 12;
    const insets = props.viewportInsets;
    const left =
      Math.max(view.visible.left, boundary.left) +
      Math.max(view.safeArea.left, insets?.left ?? 0) +
      margin;
    const top =
      Math.max(view.visible.top, boundary.top) +
      Math.max(view.safeArea.top, insets?.top ?? 0) +
      margin;
    const right =
      Math.min(view.visible.right, boundary.right) -
      Math.max(view.safeArea.right, insets?.right ?? 0) -
      margin;
    const bottom =
      Math.min(view.visible.bottom, boundary.bottom) -
      Math.max(view.safeArea.bottom, insets?.bottom ?? 0) -
      margin;
    const availableWidth = Math.max(0, right - left);
    const width = Math.min(size().width * scale().x, availableWidth);
    const maxHeight = Math.max(0, bottom - top);
    const height = Math.min(size().height * scale().y, maxHeight);
    const point = anchor();
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
    const x = clamp(point ? point.x + 8 : left + (availableWidth - width) / 2, left, right - width);
    const below = !point || point.y + 8 + height <= bottom;
    const desiredY = point
      ? below
        ? point.y + 8
        : point.y - height - 8
      : top + Math.max(0, (maxHeight - height) * 0.32);
    const y = clamp(desiredY, top, bottom - height);
    const side = !point || y !== desiredY ? 'edge' : below ? 'bottom' : 'top';
    return {
      x,
      y,
      availableWidth,
      maxHeight,
      side,
      originX: point ? clamp(point.x - x, 16, width - 16) : width / 2,
    };
  });
  const position = createMemo(() =>
    local()
      ? projectSurfacePortalPosition(geometry(), scope())
      : {
          x: (geometry().x + viewport().fixedOffset.left) / viewport().fixedScale,
          y: (geometry().y + viewport().fixedOffset.top) / viewport().fixedScale,
        }
  );
  const close = (restoreFocus: boolean) => {
    if (busy() || !props.open || composing) return;
    props.onClose();
    if (restoreFocus)
      deferAfterPaint(() =>
        untrack(() => {
          if (!props.open && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
        })
      );
  };
  createEffect(() => {
    if (!props.open) return;
    const active = document.activeElement;
    const trigger =
      props.owner ??
      readFreshInteractionSnapshot()?.target?.closest<HTMLElement>(
        'button, a[href], input, [tabindex]'
      );
    const candidate =
      trigger ?? (active instanceof HTMLElement && active !== document.body ? active : undefined);
    if (candidate && !untrack(card)?.contains(candidate) && !props.containsTarget?.(candidate))
      returnFocus = candidate;
    queueMicrotask(() => {
      if (!props.open || props.autoFocus === false || !editor?.isConnected) return;
      editor.focus({ preventScroll: true });
      editor.setSelectionRange(editor.value.length, editor.value.length);
    });
  });
  useOverlayMask({
    open: () => props.open,
    root: card,
    containsTarget: (target) =>
      Boolean(target instanceof Node && card()?.contains(target)) ||
      Boolean(props.containsTarget?.(target)) ||
      Boolean(
        target instanceof Node &&
        document
          .getElementById(selectionControl?.getAttribute('aria-controls') ?? '')
          ?.parentElement?.contains(target)
      ),
    onClose: () => close(true),
    onInteractOutside: (event) => {
      if (event.type === 'pointerdown') close(false);
    },
    // Related previews belong to pointer ownership, but own their Escape command.
    closeOnEscape: 'none',
    escapeKeyPhase: 'bubble',
    lockBodyScroll: false,
    trapFocus: false,
    autoFocus: false,
    restoreFocus: false,
    blockHotkeys: false,
  });
  const submit = () => {
    if (!props.open || busy() || props.submitDisabled) return;
    // Paint acknowledgement before the host performs admission or network work.
    setQueued(true);
    deferAfterPaint(() =>
      untrack(() => {
        if (disposed) return;
        try {
          if (props.open) props.onSubmit();
        } finally {
          setQueued(false);
        }
      })
    );
  };
  return (
    <Show when={presence.mounted()}>
      <Portal mount={resolveSurfacePortalMount(scope())}>
        <div
          class="floe-prompt-card-positioner"
          style={{
            position: local() ? 'absolute' : 'fixed',
            left: `${position().x}px`,
            top: `${position().y}px`,
            '--floe-prompt-max-width': `${geometry().availableWidth / scale().x}px`,
            '--floe-prompt-max-height': `${geometry().maxHeight / scale().y}px`,
            '--floe-prompt-origin-x': `${geometry().originX / scale().x}px`,
            'z-index': props.zIndex ?? 100,
          }}
        >
          <div
            ref={setCard}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleID}
            tabIndex={-1}
            class={cn('floe-prompt-card floe-floating-presence', props.class)}
            data-floe-prompt-card
            data-floe-input-surface
            data-floe-surface="floating"
            data-floating-side={geometry().side}
            data-floating-presence={presence.state()}
            data-floe-local-interaction-surface="true"
            inert={presence.exiting()}
            aria-hidden={presence.exiting() ? 'true' : undefined}
            onPointerDown={() => props.onActivate?.()}
            onFocusIn={() => props.onActivate?.()}
            onKeyDown={(event) => {
              if (
                event.key !== 'Escape' ||
                event.defaultPrevented ||
                event.isComposing ||
                composing
              )
                return;
              if (
                selectionControl?.getAttribute('aria-expanded') === 'true' &&
                selectionControl.contains(event.target as Node)
              )
                return;
              event.preventDefault();
              event.stopPropagation();
              close(true);
            }}
          >
            <header class="floe-prompt-card-header">
              <Show when={props.icon}>
                <span class="floe-prompt-card-icon" aria-hidden="true">
                  {props.icon}
                </span>
              </Show>
              <h2 id={titleID}>{props.title}</h2>
              <Button
                variant="ghost"
                size="icon"
                icon={X}
                class="floe-prompt-card-close"
                disabled={busy()}
                title={props.closeLabel}
                aria-label={props.closeLabel}
                onClick={() => close(true)}
              />
            </header>
            <div {...props.bodyProps} class={cn('floe-prompt-card-body', props.bodyProps?.class)}>
              <div class="floe-prompt-card-question">{props.question}</div>
              <div
                class="floe-prompt-card-composer"
                onDragOver={(event) => {
                  if (
                    props.attachment &&
                    !busy() &&
                    !props.inputDisabled &&
                    event.dataTransfer?.types.includes('Files')
                  )
                    event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!props.attachment || !event.dataTransfer?.files.length) return;
                  event.preventDefault();
                  receiveFiles(Array.from(event.dataTransfer.files));
                }}
              >
                <div class="floe-prompt-card-field">
                  <textarea
                    ref={(element) => {
                      editor = element;
                      props.editorRef?.(element);
                    }}
                    class="floe-prompt-card-input"
                    rows={2}
                    aria-label={props.inputLabel}
                    value={props.value}
                    placeholder={props.placeholder}
                    disabled={busy() || props.inputDisabled}
                    onPaste={(event) => {
                      if (!props.attachment || !event.clipboardData?.files.length) return;
                      event.preventDefault();
                      receiveFiles(Array.from(event.clipboardData.files));
                    }}
                    onInput={(event) => props.onValueChange(event.currentTarget.value)}
                    onCompositionStart={() => {
                      composing = true;
                    }}
                    onCompositionUpdate={(event) => props.onValueChange(event.currentTarget.value)}
                    onCompositionEnd={(event) => {
                      composing = false;
                      props.onValueChange(event.currentTarget.value);
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        !event.shiftKey &&
                        !event.isComposing &&
                        !composing
                      ) {
                        event.preventDefault();
                        submit();
                      }
                    }}
                  />
                </div>
                <Show when={props.references}>
                  <div class="floe-prompt-card-references" inert={Boolean(busy())}>
                    {props.references}
                  </div>
                </Show>
                <div class="floe-prompt-card-actions">
                  <div class="floe-prompt-card-tools">
                    <Show when={props.attachment}>
                      <input
                        ref={fileInput}
                        type="file"
                        multiple
                        hidden
                        tabIndex={-1}
                        accept={props.attachment?.accept}
                        disabled={busy() || props.inputDisabled}
                        onChange={(event) => {
                          receiveFiles(Array.from(event.currentTarget.files ?? []));
                          event.currentTarget.value = '';
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        icon={Paperclip}
                        class="floe-prompt-card-attach"
                        disabled={busy() || props.inputDisabled}
                        aria-label={props.attachment?.label}
                        title={props.attachment?.label}
                        onClick={() => fileInput?.click()}
                      />
                    </Show>
                    <Show when={props.selection}>
                      <Select
                        ref={(element) => {
                          selectionControl = element;
                        }}
                        class="floe-prompt-card-selection"
                        open={selectionOpen()}
                        onOpenChange={setSelectionOpen}
                        zIndex={(props.zIndex ?? 100) + 1}
                        ariaLabel={props.selection!.label}
                        placeholder={props.selection!.placeholder}
                        value={props.selection!.value}
                        options={props.selection!.options}
                        onChange={(value) => props.selection!.onChange(value)}
                        disabled={busy() || props.inputDisabled}
                        loading={props.selection!.loading}
                        error={props.selection!.error}
                        onRetry={props.selection!.onRetry}
                      />
                    </Show>
                  </div>
                  <Button
                    variant="primary"
                    size="icon"
                    icon={ArrowUp}
                    class="floe-prompt-card-submit"
                    disabled={props.submitDisabled}
                    loading={busy()}
                    aria-busy={busy() ? 'true' : 'false'}
                    title={props.submitLabel}
                    aria-label={props.submitLabel}
                    onClick={submit}
                  />
                </div>
              </div>
              <Show when={props.feedback}>
                <div class="floe-prompt-card-feedback">{props.feedback}</div>
              </Show>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
