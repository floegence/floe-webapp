import { Show, createSignal, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';

export interface TooltipProps {
  content: string | JSX.Element;
  children: JSX.Element;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  class?: string;
}

/**
 * Simple tooltip component
 */
export function Tooltip(props: TooltipProps) {
  const [visible, setVisible] = createSignal(false);
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const show = () => {
    if (timeout) clearTimeout(timeout);
    const delay = props.delay ?? 300;
    if (delay <= 0) {
      setVisible(true);
      return;
    }
    timeout = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    setVisible(false);
  };

  const placementStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-popover border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-popover border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-popover border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-popover border-y-transparent border-l-transparent',
  };

  return (
    <div
      class="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusIn={show}
      onFocusOut={hide}
    >
      {props.children}
      <Show when={visible()}>
        <div
          class={cn(
            'absolute z-50 px-2 py-1',
            'bg-popover text-popover-foreground text-xs rounded shadow-md',
            'whitespace-nowrap',
            'animate-in fade-in zoom-in-95',
            placementStyles[props.placement ?? 'top'],
            props.class
          )}
          role="tooltip"
        >
          {props.content}
          {/* Arrow */}
          <div
            class={cn(
              'absolute w-0 h-0 border-4',
              arrowStyles[props.placement ?? 'top']
            )}
          />
        </div>
      </Show>
    </div>
  );
}
