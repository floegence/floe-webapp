import { Show } from 'solid-js';
import { Motion } from 'solid-motionone';
import { duration, easing } from '../../utils/animations';
import { useOverlayMask } from '../../hooks/useOverlayMask';
import { X } from '../../icons';
import { WorkbenchSurface } from './WorkbenchSurface';
import type { WorkbenchState } from './types';

export interface WorkbenchOverlayProps {
  open: boolean;
  onClose: () => void;
  state: () => WorkbenchState;
  setState: (updater: (prev: WorkbenchState) => WorkbenchState) => void;
  /**
   * Keyboard shortcut key for toggling lock mode.
   * Matches `KeyboardEvent.key`. Defaults to "F1".
   */
  lockShortcut?: string;
}

const WORKBENCH_BOUNDARY_SELECTOR = '[data-floe-workbench-boundary="true"]';

function isWithinWorkbenchBoundary(target: EventTarget | null): boolean {
  if (typeof Element !== 'undefined' && target instanceof Element) {
    return Boolean(target.closest(WORKBENCH_BOUNDARY_SELECTOR));
  }
  if (typeof Node !== 'undefined' && target instanceof Node) {
    return Boolean(target.parentElement?.closest(WORKBENCH_BOUNDARY_SELECTOR));
  }
  return false;
}

/**
 * Modal-mode wrapper around WorkbenchSurface. Use this for transient pop-in
 * usage (a workbench launched as a tool overlay). For permanent display-mode
 * usage, mount WorkbenchSurface directly inside your layout.
 */
export function WorkbenchOverlay(props: WorkbenchOverlayProps) {
  let rootRef: HTMLElement | undefined;

  useOverlayMask({
    open: () => props.open,
    root: () => rootRef,
    onClose: () => props.onClose(),
    containsTarget: isWithinWorkbenchBoundary,
    lockBodyScroll: true,
    trapFocus: true,
    closeOnEscape: true,
    blockHotkeys: true,
    blockWheel: 'outside',
    blockTouchMove: 'outside',
    autoFocus: { selector: '[data-floe-overlay-close="true"]' },
    restoreFocus: true,
  });

  return (
    <Show when={props.open}>
      <Motion.section
        ref={rootRef}
        class="workbench-overlay"
        role="dialog"
        aria-modal={true}
        aria-label="Workbench overlay"
        tabIndex={-1}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: duration.fast }}
      >
        <Motion.div
          class="workbench-overlay__frame"
          data-floe-workbench-boundary="true"
          initial={{ opacity: 0, y: 18, scale: 0.986 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: duration.normal, easing: easing.easeOut }}
        >
          <header class="workbench-overlay__header" data-floe-canvas-interactive="true">
            <div class="workbench-overlay__header-brand">
              <div class="workbench-overlay__header-title">Workbench</div>
            </div>
            <div class="workbench-overlay__header-actions">
              <button
                type="button"
                class="workbench-overlay__close"
                aria-label="Close workbench overlay"
                data-floe-overlay-close="true"
                onClick={() => props.onClose()}
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </header>

          <div class="workbench-overlay__body">
            <WorkbenchSurface
              class="workbench-surface--in-overlay"
              state={props.state}
              setState={props.setState}
              lockShortcut={props.lockShortcut}
            />
          </div>
        </Motion.div>
      </Motion.section>
    </Show>
  );
}
