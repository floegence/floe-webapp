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
      class="launchpad-item group flex flex-col items-center gap-2 p-3 rounded-xl
             cursor-pointer border border-border/50 bg-card/30 backdrop-blur-sm
             transition-all duration-200 ease-out select-none outline-none shadow-sm
             hover:scale-[1.02] active:scale-95"
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
        class="w-14 h-14 rounded-2xl flex items-center justify-center border border-border/40 shadow-lg
               transition-transform duration-200 group-hover:scale-105"
        style={{
          background: background(),
          color: props.item.color ? 'white' : 'var(--primary-foreground)',
          'box-shadow': '0 16px 32px -20px color-mix(in srgb, var(--foreground) 55%, transparent)',
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
