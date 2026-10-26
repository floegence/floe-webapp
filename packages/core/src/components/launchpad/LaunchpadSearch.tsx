import { Search } from '../icons';

export interface LaunchpadSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LaunchpadSearch(props: LaunchpadSearchProps) {
  return (
    <div class="launchpad-search w-full max-w-md mx-auto">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--floe-ink-soft)]" />
        <input
          type="text"
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
          placeholder={props.placeholder ?? 'Search'}
          class="w-full h-10 pl-10 pr-4 rounded-control bg-card/80 backdrop-blur-sm
                 border border-[var(--floe-line)] text-foreground placeholder:text-[var(--floe-ink-quiet)]
                 outline-none transition-[border-color,box-shadow,background-color] duration-[var(--floe-duration-base)] shadow-[var(--floe-elevation-raised)]"
        />
      </div>
    </div>
  );
}
