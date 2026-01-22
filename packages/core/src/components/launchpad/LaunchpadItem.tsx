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
             cursor-pointer transition-all duration-200 ease-out select-none outline-none
             hover:bg-white/10 focus-visible:bg-white/10 focus-visible:ring-2
             focus-visible:ring-white/30 active:scale-95"
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
        class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg
               transition-transform duration-200 group-hover:scale-105"
        style={{
          background: props.item.color ?? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <props.item.icon class="w-7 h-7 text-white" />
      </div>
      <span class="text-xs text-white/90 font-medium truncate max-w-[80px] text-center">
        {props.item.name}
      </span>
    </button>
  );
}
