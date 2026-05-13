import { createEffect, createSignal, onCleanup, type Accessor } from 'solid-js';

import type { WorkbenchWidgetMotionIntent } from './types';

const WORKBENCH_WIDGET_ENTER_MOTION_MS = 140;

function compact(value: unknown): string {
  return String(value ?? '').trim();
}

export function createWorkbenchWidgetEnterMotionTracker(
  widgetIds: Accessor<readonly string[]>,
): Accessor<Record<string, WorkbenchWidgetMotionIntent | null>> {
  const [motionById, setMotionById] = createSignal<Record<string, WorkbenchWidgetMotionIntent | null>>({});
  const enterTimers = new Map<string, ReturnType<typeof globalThis.setTimeout>>();
  let previousWidgetIds = new Set<string>();
  let hydrated = false;

  const clearEnterTimer = (widgetId: string) => {
    const timer = enterTimers.get(widgetId);
    if (!timer) {
      return;
    }
    globalThis.clearTimeout(timer);
    enterTimers.delete(widgetId);
  };

  const clearMotion = (widgetId: string) => {
    setMotionById((previous) => {
      if (!previous[widgetId]) {
        return previous;
      }

      const next = { ...previous };
      delete next[widgetId];
      return next;
    });
  };

  createEffect(() => {
    const currentWidgetIds = new Set(
      widgetIds()
        .map(compact)
        .filter(Boolean),
    );

    if (!hydrated) {
      hydrated = true;
      previousWidgetIds = currentWidgetIds;
      return;
    }

    setMotionById((previous) => {
      let changed = false;
      const next = { ...previous };

      for (const widgetId of Object.keys(previous)) {
        if (currentWidgetIds.has(widgetId)) {
          continue;
        }
        clearEnterTimer(widgetId);
        delete next[widgetId];
        changed = true;
      }

      return changed ? next : previous;
    });

    for (const widgetId of currentWidgetIds) {
      if (previousWidgetIds.has(widgetId) || enterTimers.has(widgetId)) {
        continue;
      }

      setMotionById((previous) => {
        if (previous[widgetId]?.phase === 'enter') {
          return previous;
        }
        return {
          ...previous,
          [widgetId]: {
            widgetId,
            phase: 'enter',
            reason: 'widget_add',
          },
        };
      });

      const timer = globalThis.setTimeout(() => {
        enterTimers.delete(widgetId);
        clearMotion(widgetId);
      }, WORKBENCH_WIDGET_ENTER_MOTION_MS);
      enterTimers.set(widgetId, timer);
    }

    previousWidgetIds = currentWidgetIds;
  });

  onCleanup(() => {
    for (const timer of enterTimers.values()) {
      globalThis.clearTimeout(timer);
    }
    enterTimers.clear();
  });

  return motionById;
}
