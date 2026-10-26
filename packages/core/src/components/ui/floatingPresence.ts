import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
  type Accessor,
} from 'solid-js';

export type FloatingPresenceState = 'entering' | 'open' | 'exiting';

export interface FloatingPresenceOptions {
  open: Accessor<boolean>;
  /**
   * The element carrying the surface's motion classes. When present, the exit
   * follows that element's own transitions, so the DOM outlives the motion CSS
   * declared for it instead of a duration duplicated in JavaScript.
   */
  element?: Accessor<HTMLElement | undefined>;
  /** Fallback for elements with no observable transition, as in SSR and unit tests. */
  exitDurationMs?: number;
  reducedMotionExitDurationMs?: number;
}

export interface FloatingPresence {
  mounted: Accessor<boolean>;
  state: Accessor<FloatingPresenceState>;
  exiting: Accessor<boolean>;
}

/*
 * Transition events are the only trustworthy signal that a surface finished
 * leaving: timing it in JavaScript needs the declared duration plus the frames
 * it starts and ends on, and any of those drifting detaches the element while
 * its motion is still running.
 */
const EXIT_BACKSTOP_MS = 120;

function prefersReducedMotion(): boolean {
  const matchMedia = globalThis.matchMedia;
  if (typeof matchMedia !== 'function') return false;
  return matchMedia.call(globalThis, '(prefers-reduced-motion: reduce)').matches;
}

function requestPresenceFrame(callback: () => void): number {
  const requestFrame = globalThis.requestAnimationFrame;
  if (typeof requestFrame === 'function') return requestFrame.call(globalThis, callback);
  return globalThis.setTimeout(callback, 16) as unknown as number;
}

function cancelPresenceFrame(handle: number): void {
  const cancelFrame = globalThis.cancelAnimationFrame;
  if (typeof cancelFrame === 'function') {
    cancelFrame.call(globalThis, handle);
    return;
  }
  globalThis.clearTimeout(handle);
}

/** A CSS time may be written in seconds or milliseconds; both are accepted. */
function parseCssTime(value: string): number | null {
  const match = /^\s*(-?\d*\.?\d+)(ms|s)\s*$/.exec(value);
  if (!match) return null;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return null;
  return match[2] === 's' ? amount * 1000 : amount;
}

interface ExitTransitionPlan {
  properties: Set<string>;
  longestMs: number;
}

/**
 * What the exiting style will actually animate. Reading it back from the
 * element keeps per-surface motion classes authoritative; a property the
 * element does not move is not awaited, because it never fires an end event.
 */
function planExitTransition(element: HTMLElement | undefined): ExitTransitionPlan | null {
  const readStyle: typeof getComputedStyle | undefined = globalThis.getComputedStyle;
  if (!element || typeof readStyle !== 'function') return null;
  const style = readStyle.call(globalThis, element);
  const durations = style.transitionDuration.split(',');
  const plan: ExitTransitionPlan = { properties: new Set(), longestMs: 0 };
  style.transitionProperty.split(',').forEach((raw, index) => {
    const property = raw.trim();
    if (property === '' || property === 'none') return;
    const duration = parseCssTime(durations[index % durations.length] ?? '0s');
    if (duration === null || duration <= 1) return;
    plan.properties.add(property);
    plan.longestMs = Math.max(plan.longestMs, duration);
  });
  return plan.properties.size > 0 ? plan : null;
}

export function createFloatingPresence(options: FloatingPresenceOptions): FloatingPresence {
  const open = createMemo(() => options.open());
  const initiallyOpen = untrack(open);
  const [mounted, setMounted] = createSignal(initiallyOpen);
  const [state, setState] = createSignal<FloatingPresenceState>(initiallyOpen ? 'entering' : 'exiting');
  let presenceFrame: number | null = null;
  let exitTimer: number | null = null;
  let detachExitWatch: (() => void) | null = null;

  const clearPresenceFrame = () => {
    if (presenceFrame === null) return;
    cancelPresenceFrame(presenceFrame);
    presenceFrame = null;
  };

  const clearExitWatch = () => {
    if (exitTimer !== null) {
      globalThis.clearTimeout(exitTimer);
      exitTimer = null;
    }
    detachExitWatch?.();
    detachExitWatch = null;
  };

  createEffect(() => {
    if (open()) {
      clearPresenceFrame();
      clearExitWatch();
      // Reverse an in-flight exit from its current painted position.
      if (untrack(mounted) && untrack(state) === 'exiting') {
        setState('open');
        return;
      }
      setMounted(true);
      setState('entering');
      presenceFrame = requestPresenceFrame(() => {
        presenceFrame = null;
        if (untrack(open)) {
          setState('open');
        }
      });
      return;
    }

    clearPresenceFrame();
    if (!untrack(mounted)) {
      setState('exiting');
      return;
    }

    setState('exiting');
    const finishExit = () => {
      presenceFrame = null;
      clearExitWatch();
      if (!untrack(open)) setMounted(false);
    };

    const element = options.element?.();
    const plan = prefersReducedMotion() ? null : planExitTransition(element);

    // Hold the surface until every property it moved has settled. The watch is
    // attached in the same task that set the state, before the first frame on
    // which the transition can run.
    if (element && plan) {
      const started = new Set<string>();
      const settled = new Set<string>();
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        finishExit();
      };
      const matches = (event: TransitionEvent) =>
        event.target === element && plan.properties.has(event.propertyName);
      const onTransitionRun = (event: TransitionEvent) => {
        if (!matches(event)) return;
        started.add(event.propertyName);
      };
      const onTransitionSettled = (event: TransitionEvent) => {
        if (!matches(event)) return;
        started.add(event.propertyName);
        settled.add(event.propertyName);
        for (const property of started) {
          if (!settled.has(property)) return;
        }
        finish();
      };
      element.addEventListener('transitionrun', onTransitionRun);
      element.addEventListener('transitionend', onTransitionSettled);
      element.addEventListener('transitioncancel', onTransitionSettled);
      detachExitWatch = () => {
        element.removeEventListener('transitionrun', onTransitionRun);
        element.removeEventListener('transitionend', onTransitionSettled);
        element.removeEventListener('transitioncancel', onTransitionSettled);
      };
      // A transition that never starts, or is cancelled without reporting,
      // must not strand the surface on screen.
      const backstop = Math.max(plan.longestMs, options.exitDurationMs ?? 0) + EXIT_BACKSTOP_MS;
      exitTimer = globalThis.setTimeout(finish, backstop) as unknown as number;
      return;
    }

    const exitDuration = prefersReducedMotion()
      ? Math.max(0, options.reducedMotionExitDurationMs ?? 1)
      : Math.max(0, options.exitDurationMs ?? 160);
    const startExitTimer = () => {
      presenceFrame = null;
      exitTimer = globalThis.setTimeout(() => {
        exitTimer = null;
        if (exitDuration <= 1) finishExit();
        else presenceFrame = requestPresenceFrame(finishExit);
      }, exitDuration) as unknown as number;
    };
    // Nothing to observe: let the exiting style paint, then allow its final
    // frame before removing the DOM. Reduced motion has no extra latency.
    if (exitDuration <= 1) startExitTimer();
    else
      presenceFrame = requestPresenceFrame(() => {
        presenceFrame = requestPresenceFrame(startExitTimer);
      });
  });

  onCleanup(() => {
    clearPresenceFrame();
    clearExitWatch();
  });

  return {
    mounted,
    state,
    exiting: () => state() === 'exiting',
  };
}
