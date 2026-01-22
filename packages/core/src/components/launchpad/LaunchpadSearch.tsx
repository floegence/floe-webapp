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
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
        <input
          type="text"
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
          placeholder={props.placeholder ?? 'Search'}
          class="w-full h-10 pl-10 pr-4 rounded-lg bg-white/10 backdrop-blur-sm
                 border border-white/20 text-white placeholder:text-white/50
                 outline-none transition-all duration-200
                 focus:bg-white/15 focus:border-white/30 focus:ring-2 focus:ring-white/20"
        />
      </div>
    </div>
  );
}
