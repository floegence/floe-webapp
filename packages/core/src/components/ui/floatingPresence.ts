import { createEffect, createSignal, onCleanup, untrack, type Accessor } from 'solid-js';

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
  const [mounted, setMounted] = createSignal(options.open());
  const [state, setState] = createSignal<FloatingPresenceState>(
    options.open() ? 'entering' : 'exiting',
  );
  let enterFrame: number | null = null;
  let exitTimer: number | null = null;

  const clearEnterFrame = () => {
    if (enterFrame === null) return;
    cancelPresenceFrame(enterFrame);
    enterFrame = null;
  };

  const clearExitTimer = () => {
    if (exitTimer === null) return;
    globalThis.clearTimeout(exitTimer);
    exitTimer = null;
  };

  createEffect(() => {
    if (options.open()) {
      clearExitTimer();
      clearEnterFrame();
      setMounted(true);
      setState('entering');
      enterFrame = requestPresenceFrame(() => {
        enterFrame = null;
        if (untrack(options.open)) {
          setState('open');
        }
      });
      return;
    }

    clearEnterFrame();
    if (!untrack(mounted)) {
      setState('exiting');
      return;
    }

    setState('exiting');
    const exitDuration = resolveExitDuration(options);
    exitTimer = globalThis.setTimeout(() => {
      exitTimer = null;
      if (!untrack(options.open)) {
        setMounted(false);
      }
    }, exitDuration) as unknown as number;
  });

  onCleanup(() => {
    clearEnterFrame();
    clearExitTimer();
  });

  return {
    mounted,
    state,
    exiting: () => state() === 'exiting',
  };
}
