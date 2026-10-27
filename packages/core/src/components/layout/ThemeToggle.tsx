import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sun } from '../icons';

export interface ThemeToggleProps {
  /** Box class for the button; defaults to the 32px icon control. */
  class?: string;
  /** Box class for the 16px icon frame. */
  glyphClass?: string;
  /** Overrides the accessible name. Defaults to the action the click performs. */
  label?: string;
  disabled?: boolean;
}

/**
 * Light/dark toggle.
 *
 * The two states are one control, so the icon performs the change rather than
 * being swapped between frames: the outgoing glyph rotates a quarter turn and
 * leaves upward while the incoming one arrives from below. Both live in the
 * same 16px frame, so the button never changes size and nothing else on the
 * bar moves. Reduced-motion users get the instant swap.
 */
export function ThemeToggle(props: ThemeToggleProps) {
  const theme = useTheme();
  const isDark = () => theme.resolvedTheme() === 'dark';
  const actionLabel = () => props.label ?? (isDark() ? 'Switch to light theme' : 'Switch to dark theme');

  const glyph = (active: boolean, direction: 'up' | 'down') =>
    cn(
      'absolute inset-0 flex items-center justify-center',
      /* Tailwind's rotate/translate utilities write the individual properties,
       * so the transition list has to name them; `transform` alone would leave
       * the glyphs swapping instead of gliding. */
      'transition-[opacity,rotate,translate] duration-[var(--floe-duration-base)] ease-[var(--floe-ease-out)]',
      'motion-reduce:transition-none',
      active
        ? 'opacity-100 rotate-0 translate-y-0'
        : cn(
            'opacity-0',
            direction === 'up' ? '-translate-y-2 rotate-90' : 'translate-y-2 -rotate-90'
          )
    );

  return (
    <button
      type="button"
      onClick={() => theme.toggleTheme()}
      disabled={props.disabled}
      aria-label={actionLabel()}
      title={actionLabel()}
      data-floe-interactive="icon"
      class={cn(
        'inline-flex h-[var(--floe-control-height-md)] w-[var(--floe-control-height-md)] shrink-0 items-center justify-center rounded-control cursor-pointer',
        'text-[var(--floe-ink-soft)] hover:bg-[var(--floe-state-hover)] hover:text-foreground',
        'transition-colors duration-[var(--floe-duration-fast)] ease-[var(--floe-ease-out)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--floe-plane)]',
        'disabled:pointer-events-none disabled:opacity-50',
        props.class
      )}
    >
      <span
        aria-hidden="true"
        class={cn('relative block h-4 w-4 overflow-hidden', props.glyphClass)}
      >
        <span class={glyph(!isDark(), 'up')}>
          <Sun class="h-full w-full" />
        </span>
        <span class={glyph(isDark(), 'down')}>
          <Moon class="h-full w-full" />
        </span>
      </span>
    </button>
  );
}
