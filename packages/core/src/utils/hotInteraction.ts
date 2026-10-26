import { lockBodyStyle } from './bodyStyleLock';

export const FLOE_HOT_INTERACTION_ATTR = 'data-floe-hot-interaction';
export const FLOE_GEOMETRY_SURFACE_ATTR = 'data-floe-geometry-surface';

export type HotInteractionKind = 'drag' | 'resize';

export interface StartHotInteractionOptions {
  kind: HotInteractionKind;
  cursor: string;
  lockUserSelect?: boolean;
  /**
   * `cursor` and `user-select` inherit, so writing them on `document.body`
   * recalculates styles for the whole document. A surface that keeps the pointer
   * inside its own bounds can declare the cursor itself and opt out; the
   * hot-interaction attribute still suppresses animations for the gesture.
   */
  lockDocumentStyles?: boolean;
}

const activeCounts = new Map<HotInteractionKind, number>();

function getRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.documentElement;
}

function syncRootAttribute(): void {
  const root = getRoot();
  if (!root) return;

  const activeKinds = [...activeCounts.entries()]
    .filter(([, count]) => count > 0)
    .map(([kind]) => kind)
    .sort();

  if (activeKinds.length === 0) {
    root.removeAttribute(FLOE_HOT_INTERACTION_ATTR);
    return;
  }

  root.setAttribute(FLOE_HOT_INTERACTION_ATTR, activeKinds.join(' '));
}

export function startHotInteraction(options: StartHotInteractionOptions): () => void {
  const nextCount = (activeCounts.get(options.kind) ?? 0) + 1;
  activeCounts.set(options.kind, nextCount);
  syncRootAttribute();

  const unlockBody = options.lockDocumentStyles === false
    ? null
    : lockBodyStyle({
      cursor: options.cursor,
      ...(options.lockUserSelect === false ? {} : { 'user-select': 'none' }),
    });

  let active = true;

  return () => {
    if (!active) return;
    active = false;

    unlockBody?.();

    const currentCount = activeCounts.get(options.kind) ?? 0;
    if (currentCount <= 1) {
      activeCounts.delete(options.kind);
    } else {
      activeCounts.set(options.kind, currentCount - 1);
    }

    syncRootAttribute();
  };
}
