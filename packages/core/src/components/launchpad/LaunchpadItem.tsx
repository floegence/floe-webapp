import type { Component, JSX } from 'solid-js';

export interface LaunchpadItemData {
  id: string;
  name: string;
  icon: Component<{ class?: string }>;
  description?: string;
  color?: string;
  onClick?: () => void;
}

export interface LaunchpadItemProps {
  item: LaunchpadItemData;
  index: number;
  onClick?: (item: LaunchpadItemData) => void;
  style?: JSX.CSSProperties;
}

export function LaunchpadItem(props: LaunchpadItemProps) {
  const background = () =>
    props.item.color
      ?? 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 78%, var(--info) 22%), color-mix(in srgb, var(--primary) 58%, var(--accent) 42%))';

  const handleClick = () => {
    props.item.onClick?.();
    props.onClick?.(props.item);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      class="launchpad-item group flex flex-col items-center gap-2 rounded-panel p-3
             cursor-pointer bg-transparent select-none outline-none
             transition-[transform,background-color] duration-[var(--floe-duration-base)] ease-out
             hover:-translate-y-[var(--floe-hover-lift)] hover:bg-card/20 focus-visible:bg-card/30 active:scale-[var(--floe-press-scale)]"
      style={{
        '--item-index': props.index,
        'animation-delay': `${props.index * 30}ms`,
        ...props.style,
      } as JSX.CSSProperties}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      title={props.item.description ?? props.item.name}
    >
      <div
        class="w-14 h-14 rounded-panel flex items-center justify-center shadow-[var(--floe-elevation-float)]
               transition-transform duration-[var(--floe-duration-base)] group-hover:-translate-y-[var(--floe-hover-lift)]"
        /* No inline shadow: the class above already asks for the float step,
         * and the old override was a fourth elevation recipe that existed only
         * here. The tile is a coloured chip on the canvas, not a window. */
        style={{
          background: background(),
          color: props.item.color ? 'white' : 'var(--primary-foreground)',
        }}
      >
        <props.item.icon class="w-7 h-7" />
      </div>
      <span class="text-xs text-foreground/80 font-medium truncate max-w-[80px] text-center">
        {props.item.name}
      </span>
    </button>
  );
}
