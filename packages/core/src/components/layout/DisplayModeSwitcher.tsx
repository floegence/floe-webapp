import {
  For,
  createEffect,
  createSignal,
  onCleanup,
  type Component,
} from 'solid-js';
import { cn } from '../../utils/cn';
import { Bookmark, Grid3x3, LayoutDashboard } from '../icons';

export type DisplayMode = 'activity' | 'deck' | 'workbench';

const VALID_MODES: ReadonlySet<DisplayMode> = new Set(['activity', 'deck', 'workbench']);

export function sanitizeDisplayMode(
  value: unknown,
  fallback: DisplayMode = 'activity'
): DisplayMode {
  return typeof value === 'string' && VALID_MODES.has(value as DisplayMode)
    ? (value as DisplayMode)
    : fallback;
}

export interface DisplayModeSwitcherProps {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
  class?: string;
}

interface ModeOption {
  id: DisplayMode;
  label: string;
  icon: Component<{ class?: string }>;
}

const MODES: readonly ModeOption[] = [
  { id: 'activity', label: 'Activity', icon: Bookmark },
  { id: 'deck', label: 'Deck', icon: LayoutDashboard },
  { id: 'workbench', label: 'Workbench', icon: Grid3x3 },
];

interface PillGeometry {
  x: number;
  width: number;
  visible: boolean;
}

const HIDDEN_PILL: PillGeometry = { x: 0, width: 0, visible: false };

/* Hosts commonly give each mode its own shell, so the switcher is a fresh
 * instance after every change. Remembering the last mode lets the new instance
 * start the pill under the old option and travel to the new one, which keeps
 * the move continuous across the remount. */
let lastMode: DisplayMode | undefined;

/**
 * Display-mode switcher.
 *
 * The three modes are peer views of the same workspace, so the control is a
 * segmented rail rather than three buttons: one travelling pill marks the
 * current mode and slides to the next one. The pill is the selection — the
 * faces under it stay flat — which keeps a single thing moving and lets the
 * eye follow it across the bar.
 */
export function DisplayModeSwitcher(props: DisplayModeSwitcherProps) {
  let railRef: HTMLDivElement | undefined;
  const optionEls = new Map<DisplayMode, HTMLButtonElement>();

  const [pill, setPill] = createSignal<PillGeometry>(HIDDEN_PILL);
  /* The first measurement paints the pill where it belongs. Transitions only
   * arm after that frame, otherwise the control would slide in from x: 0 on
   * mount instead of simply being there. */
  const [motionArmed, setMotionArmed] = createSignal(false);

  const measure = () => {
    const rail = railRef;
    const el = optionEls.get(props.mode);
    if (!rail || !el) {
      setPill(HIDDEN_PILL);
      return;
    }

    const railRect = rail.getBoundingClientRect();
    if (railRect.width <= 0) {
      // Detached or inside a collapsed pane: leave the pill where it is rather
      // than moving it to a bogus origin.
      return;
    }

    // Prefer layout-space offsets; a scaled host (Workbench canvas) distorts
    // getBoundingClientRect and would drift the pill.
    const box = (option: DisplayMode) => {
      const node = optionEls.get(option);
      if (!node) return undefined;
      const inRail = node.offsetParent === rail && Number.isFinite(node.offsetLeft);
      const x = inRail ? node.offsetLeft : node.getBoundingClientRect().left - railRect.left;
      const width = inRail ? node.offsetWidth : node.getBoundingClientRect().width;
      return { x, width };
    };

    const target = box(props.mode);
    if (!target || target.width <= 0) return;

    const travelled = lastMode !== undefined && lastMode !== props.mode
      ? box(lastMode)
      : undefined;

    if (!motionArmed()) {
      // Seed on the outgoing option's slot, then let the next frame carry it to
      // the new one. Without an outgoing slot there is nothing to travel, so
      // the pill simply paints where it belongs.
      const seed = travelled ?? target;
      setPill({ ...seed, visible: seed.width > 0 });
      /* Two frames: the first commits the seed as a resting value, the second
       * arms the transition, and only then does the pill move. Committing both
       * in one frame would swap the start value and the property together, and
       * the browser would paint the destination without travelling. */
      requestAnimationFrame(() => {
        if (motionArmed()) return;
        setMotionArmed(true);
        requestAnimationFrame(() => {
          if (travelled) setPill({ ...target, visible: target.width > 0 });
        });
      });
    } else {
      setPill({ ...target, visible: target.width > 0 });
    }

    lastMode = props.mode;
  };

  createEffect(() => {
    void props.mode;
    measure();
  });

  /* Measure — never paint — on resize. A ResizeObserver is the only signal that
   * catches font settling, label translation and host reflow. */
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => measure());
    createEffect(() => {
      if (railRef) observer.observe(railRef);
    });
    onCleanup(() => observer.disconnect());
  }

  return (
    <div
      ref={railRef}
      role="tablist"
      aria-label="Display mode"
      data-floe-surface="inset"
      data-floe-surface-part="rail"
      class={cn(
        'display-mode-switcher relative inline-flex items-stretch',
        'h-[var(--floe-control-height-sm)] rounded-control border border-[var(--floe-line)] p-0.5',
        'text-[length:var(--floe-type-caption)] leading-[var(--floe-line-control)]',
        props.class
      )}
    >
      {pill().visible ? (
        <span
          aria-hidden="true"
          data-floe-surface="raised"
          data-floe-surface-part="segment-pill"
          class="display-mode-switcher__pill pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-[calc(var(--floe-radius-control)-2px)]"
          style={{
            transform: `translate3d(${pill().x}px, 0, 0)`,
            width: `${pill().width}px`,
            // Swap the discrete transition off for the seeding frame.
            'transition-property': motionArmed() ? undefined : 'none',
          }}
        />
      ) : null}
      <For each={MODES}>
        {(option) => {
          const Icon = option.icon;
          const isActive = () => props.mode === option.id;
          return (
            <button
              ref={(el) => {
                optionEls.set(option.id, el);
                onCleanup(() => optionEls.delete(option.id));
              }}
              type="button"
              role="tab"
              aria-selected={isActive()}
              tabIndex={isActive() ? 0 : -1}
              onClick={() => props.onChange(option.id)}
              class={cn(
                'display-mode-switcher__option relative z-10 inline-flex cursor-pointer items-center',
                'gap-1.5 rounded-sm px-2',
                'transition-colors duration-[var(--floe-duration-fast)] ease-[var(--floe-ease-out)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--floe-plane)]',
                isActive()
                  ? 'text-foreground'
                  : 'text-[var(--floe-ink-soft)] hover:text-foreground'
              )}
            >
              <Icon class="display-mode-switcher__icon h-3 w-3 shrink-0" />
              <span class="display-mode-switcher__label whitespace-nowrap">{option.label}</span>
            </button>
          );
        }}
      </For>
    </div>
  );
}
