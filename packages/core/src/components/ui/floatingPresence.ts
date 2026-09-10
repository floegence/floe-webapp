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
  exitDurationMs?: number;
  reducedMotionExitDurationMs?: number;
}

export interface FloatingPresence {
  mounted: Accessor<boolean>;
  state: Accessor<FloatingPresenceState>;
  exiting: Accessor<boolean>;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function requestPresenceFrame(callback: () => void): number {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout(callback, 16) as unknown as number;
}

function cancelPresenceFrame(handle: number): void {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(handle);
    return;
  }
  globalThis.clearTimeout(handle);
}

function resolveExitDuration(options: FloatingPresenceOptions): number {
  if (prefersReducedMotion()) {
    return Math.max(0, options.reducedMotionExitDurationMs ?? 1);
  }
  return Math.max(0, options.exitDurationMs ?? 120);
}

export function createFloatingPresence(options: FloatingPresenceOptions): FloatingPresence {
  const open = createMemo(() => options.open());
  const initiallyOpen = untrack(open);
  const [mounted, setMounted] = createSignal(initiallyOpen);
  const [state, setState] = createSignal<FloatingPresenceState>(initiallyOpen ? 'entering' : 'exiting');
  let presenceFrame: number | null = null;
  let exitTimer: number | null = null;

  const clearPresenceFrame = () => {
    if (presenceFrame === null) return;
    cancelPresenceFrame(presenceFrame);
    presenceFrame = null;
  };

  const clearExitTimer = () => {
    if (exitTimer === null) return;
    globalThis.clearTimeout(exitTimer);
    exitTimer = null;
  };

  createEffect(() => {
    if (open()) {
      clearExitTimer();
      clearPresenceFrame();
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
    const exitDuration = resolveExitDuration(options);
    const finishExit = () => {
      presenceFrame = null;
      if (!untrack(open)) setMounted(false);
    };
    const startExitTimer = () => {
      presenceFrame = null;
      exitTimer = globalThis.setTimeout(() => {
        exitTimer = null;
        if (exitDuration <= 1) finishExit();
        else presenceFrame = requestPresenceFrame(finishExit);
      }, exitDuration) as unknown as number;
    };
    // CSS starts after frame callbacks. Let the exiting style paint before
    // starting its duration, then allow its final frame before removing the DOM.
    // This is bounded work; reduced motion has no extra frame latency.
    if (exitDuration <= 1) startExitTimer();
    else presenceFrame = requestPresenceFrame(() => {
      presenceFrame = requestPresenceFrame(startExitTimer);
    });
  });

  onCleanup(() => {
    clearPresenceFrame();
    clearExitTimer();
  });

  return {
    mounted,
    state,
    exiting: () => state() === 'exiting',
  };
}
