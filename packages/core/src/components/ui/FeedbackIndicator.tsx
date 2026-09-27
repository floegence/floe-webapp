import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  untrack,
  type JSX,
} from 'solid-js';
import { AlertTriangle, Info, X } from '../icons';
import { useOverlayMask } from '../../hooks/useOverlayMask';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cn } from '../../utils/cn';
import { SurfaceFloatingLayer } from './SurfaceFloatingLayer';
import { calculateMenuPosition } from './menuUtils';
import {
  resolveSurfacePortalBoundaryRect,
  resolveSurfacePortalHost,
  resolveSurfacePortalScale,
} from './surfacePortalScope';
import {
  CANVAS_WHEEL_INTERACTIVE_ATTR,
  WORKBENCH_TEXT_SELECTION_SURFACE_ATTR,
} from './localInteractionSurface';

export interface FeedbackIndicatorEntry {
  id: string;
  severity: 'info' | 'warning' | 'error';
  summary: string;
  detail?: JSX.Element;
  actions?: JSX.Element;
}

export interface FeedbackIndicatorProps {
  /** Current feedback, owned by the caller. Closing details never clears these entries. */
  entries: readonly FeedbackIndicatorEntry[];
  label: string;
  closeLabel: string;
  /** Stable destination when feedback resolves while its trigger or details owns focus. */
  restoreFocus: () => HTMLElement | undefined;
  size?: 'sm' | 'md';
  class?: string;
}

/** Compact feedback in an existing action row; no empty vertical status lane. */
export function FeedbackIndicator(props: FeedbackIndicatorProps) {
  const id = createUniqueId();
  const touch = useMediaQuery('(pointer: coarse)');
  const controlSize = () => (touch() ? '2.75rem' : props.size === 'md' ? '2rem' : '1.75rem');
  const [open, setOpen] = createSignal(false);
  const [panel, setPanel] = createSignal<HTMLDivElement>();
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [bounds, setBounds] = createSignal({ width: 360, height: 384 });
  const [positioned, setPositioned] = createSignal(false);
  let trigger: HTMLButtonElement | undefined;
  let ownsFocus = false;
  const active = () => props.entries.length > 0;
  const severity = createMemo(() =>
    props.entries.some((item) => item.severity === 'error')
      ? 'error'
      : props.entries.some((item) => item.severity === 'warning')
        ? 'warning'
        : 'info'
  );
  const announcements = (error: boolean) =>
    props.entries
      .filter((item) => (item.severity === 'error') === error)
      .map((item) => item.summary)
      .join('. ');
  const restore = () => (active() ? trigger : props.restoreFocus())?.focus({ preventScroll: true });
  const close = (restoreFocus: boolean) => {
    setOpen(false);
    ownsFocus = false;
    if (restoreFocus) restore();
  };
  const contains = (target: EventTarget | null) =>
    target instanceof Node && Boolean(trigger?.contains(target) || panel()?.contains(target));

  useOverlayMask({
    open,
    root: panel,
    containsTarget: contains,
    onClose: () => close(true),
    lockBodyScroll: false,
    trapFocus: false,
    autoFocus: false,
    restoreFocus: false,
    closeOnEscape: 'inside',
    escapeKeyPhase: 'capture',
    blockHotkeys: false,
  });

  createEffect(() => {
    if (active()) {
      if (open())
        queueMicrotask(() =>
          untrack(() => {
            if (open() && ownsFocus && document.activeElement === document.body)
              panel()?.focus({ preventScroll: true });
          })
        );
      return;
    }
    const focused =
      ownsFocus || (typeof document !== 'undefined' && contains(document.activeElement));
    setOpen(false);
    ownsFocus = false;
    if (focused) props.restoreFocus()?.focus({ preventScroll: true });
  });

  createEffect(() => {
    const element = panel();
    if (!open() || !element || !trigger) return;
    const owner = trigger;
    let frame = 0;
    let initial = true;
    const measure = () => {
      frame = 0;
      if (!owner.isConnected) {
        close(false);
        return;
      }
      const surface = resolveSurfacePortalHost({ owner });
      const boundary = resolveSurfacePortalBoundaryRect(surface);
      const scale = resolveSurfacePortalScale(surface);
      setBounds({
        width: Math.max(0, Math.min(360, boundary.right - boundary.left - 16)) / scale.x,
        height: Math.max(0, Math.min(384, boundary.bottom - boundary.top - 16)) / scale.y,
      });
      setPosition(
        calculateMenuPosition(
          owner.getBoundingClientRect(),
          element.getBoundingClientRect(),
          'end',
          boundary
        )
      );
      setPositioned(true);
      if (initial) {
        initial = false;
        element.focus({ preventScroll: true });
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(owner);
    resize.observe(element);
    const transforms = new MutationObserver(schedule);
    for (let ancestor = owner.parentElement; ancestor; ancestor = ancestor.parentElement)
      transforms.observe(ancestor, { attributes: true, attributeFilter: ['style', 'class'] });
    const focusChanged = (event: FocusEvent) => {
      ownsFocus = contains(event.target);
    };
    document.addEventListener('focusin', focusChanged);
    const outside = (event: PointerEvent) => {
      if (!contains(event.target)) close(false);
    };
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    document.addEventListener('pointerdown', outside, true);
    schedule();
    onCleanup(() => {
      cancelAnimationFrame(frame);
      document.removeEventListener('focusin', focusChanged);
      resize.disconnect();
      transforms.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      document.removeEventListener('pointerdown', outside, true);
    });
  });

  return (
    <span
      data-floe-status-indicator
      class={cn('inline-flex shrink-0 items-center justify-center align-middle', props.class)}
      style={{
        width: controlSize(),
        height: controlSize(),
      }}
    >
      <button
        ref={trigger}
        type="button"
        class="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          visibility: active() ? 'visible' : 'hidden',
          color:
            severity() === 'error'
              ? 'var(--error)'
              : severity() === 'warning'
                ? 'var(--warning)'
                : 'var(--muted-foreground)',
        }}
        tabindex={active() ? 0 : -1}
        aria-hidden={!active() || undefined}
        aria-label={`${props.label}${active() ? `: ${props.entries.map((item) => item.summary).join('; ')}` : ''}`}
        onFocus={() => {
          ownsFocus = true;
        }}
        onBlur={(event) => {
          if (event.relatedTarget) ownsFocus = contains(event.relatedTarget);
        }}
        title={props.label}
        aria-haspopup="dialog"
        aria-expanded={open()}
        aria-controls={open() ? id : undefined}
        onClick={() => {
          if (active()) {
            setPositioned(false);
            setOpen((value) => !value);
          }
        }}
      >
        <Show when={severity() !== 'info'} fallback={<Info class="h-4 w-4" aria-hidden="true" />}>
          <AlertTriangle class="h-4 w-4" aria-hidden="true" />
        </Show>
      </button>
      <span class="sr-only" role="alert" aria-atomic="true">
        {announcements(true)}
      </span>
      <span class="sr-only" role="status" aria-atomic="true">
        {announcements(false)}
      </span>
      <Show when={open() && active()}>
        <SurfaceFloatingLayer
          owner={trigger}
          position={position()}
          layerRef={setPanel}
          id={id}
          role="dialog"
          aria-label={props.label}
          tabindex={-1}
          data-floe-surface="floating"
          class="flex flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
          style={{
            width: `${bounds().width}px`,
            'max-height': `${bounds().height}px`,
            visibility: positioned() ? 'visible' : 'hidden',
          }}
        >
          <div class="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
            <span class="min-w-0 truncate text-xs font-medium">{props.label}</span>
            <button
              type="button"
              aria-label={props.closeLabel}
              style={{ width: controlSize(), height: controlSize() }}
              class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-accent"
              onClick={() => close(true)}
            >
              <X class="h-4 w-4" />
            </button>
          </div>
          <div
            data-floe-status-details
            {...{
              [CANVAS_WHEEL_INTERACTIVE_ATTR]: 'true',
              [WORKBENCH_TEXT_SELECTION_SURFACE_ATTR]: 'true',
            }}
            class="min-h-0 overflow-auto overscroll-contain p-3 text-xs"
            style={{ 'overflow-wrap': 'anywhere' }}
          >
            <For each={props.entries}>
              {(entry) => (
                <section class="space-y-2 border-b border-border pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                  <p class="font-medium">{entry.summary}</p>
                  <Show when={entry.detail}>
                    <div>{entry.detail}</div>
                  </Show>
                  <Show when={entry.actions}>
                    <div class="flex flex-wrap items-center gap-2">{entry.actions}</div>
                  </Show>
                </section>
              )}
            </For>
          </div>
        </SurfaceFloatingLayer>
      </Show>
    </span>
  );
}
