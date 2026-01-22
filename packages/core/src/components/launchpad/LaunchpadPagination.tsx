import { For } from 'solid-js';

export interface LaunchpadPaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function LaunchpadPagination(props: LaunchpadPaginationProps) {
  return (
    <div class="launchpad-pagination flex items-center justify-center gap-2">
      <For each={Array.from({ length: props.totalPages }, (_, i) => i)}>
        {(page) => (
          <button
            type="button"
            class="w-2 h-2 rounded-full cursor-pointer transition-all duration-300 outline-none
                   focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2
                   focus-visible:ring-offset-transparent"
            classList={{
              'bg-white scale-125': props.currentPage === page,
              'bg-white/40 hover:bg-white/60': props.currentPage !== page,
            }}
            onClick={() => props.onPageChange(page)}
            aria-label={`Go to page ${page + 1}`}
            aria-current={props.currentPage === page ? 'page' : undefined}
          />
        )}
      </For>
    </div>
  );
}
