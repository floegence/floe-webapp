import { createSignal, createMemo, createEffect, onMount, onCleanup, Show, type JSX } from 'solid-js';
import { LaunchpadGrid } from './LaunchpadGrid';
import { LaunchpadSearch } from './LaunchpadSearch';
import { LaunchpadPagination } from './LaunchpadPagination';
import type { LaunchpadItemData } from './LaunchpadItem';
import { deferAfterPaint } from '../../utils/defer';
import { shouldIgnoreHotkeys } from '../../utils/dom';
import { useViewActivation } from '../../context/ViewActivationContext';

export interface LaunchpadProps {
  items: LaunchpadItemData[];
  additionalItems?: LaunchpadItemData[];
  onItemClick?: (item: LaunchpadItemData) => void;
  onClose?: () => void;
  itemsPerPage?: number;
  columns?: number;
  showSearch?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}

export function Launchpad(props: LaunchpadProps) {
  let container: HTMLDivElement | undefined;
  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchQueryApplied, setSearchQueryApplied] = createSignal('');
  const [currentPage, setCurrentPage] = createSignal(0);
  const [isAnimating, setIsAnimating] = createSignal(true);
  const [touchStart, setTouchStart] = createSignal<{ x: number; y: number } | null>(null);
  let animationRestoreTimer: ReturnType<typeof setTimeout> | null = null;

  const itemsPerPage = () => props.itemsPerPage ?? 20;
  const columns = () => props.columns ?? 5;
  const showSearch = () => props.showSearch !== false;

  const viewActivation = (() => {
    try {
      return useViewActivation();
    } catch {
      return null;
    }
  })();

  const isActive = () => (viewActivation ? viewActivation.active() : true);

  // Combine items and additionalItems
  const allItems = createMemo(() => {
    const base = props.items ?? [];
    const additional = props.additionalItems ?? [];
    return [...base, ...additional];
  });

  // UI-first search: apply the query after a paint so typing never blocks the input event.
  // Coalesce rapid updates and only apply the latest query.
  let applyJob = 0;
  createEffect(() => {
    const next = searchQuery().trim();
    applyJob += 1;
    const jobId = applyJob;

    if (!next) {
      setSearchQueryApplied('');
      return;
    }

    deferAfterPaint(() => {
      if (jobId !== applyJob) return;
      setSearchQueryApplied(next);
    });
  });

  // Precompute lowercase fields once per item list to avoid repeated work during filtering.
  const searchIndex = createMemo(() => {
    return allItems().map((item) => ({
      item,
      nameLower: item.name.toLowerCase(),
      descLower: item.description?.toLowerCase() ?? '',
    }));
  });

  // Filter items based on applied search query
  const filteredItems = createMemo(() => {
    const query = searchQueryApplied().toLowerCase().trim();
    if (!query) return allItems();
    return searchIndex()
      .filter((entry) => entry.nameLower.includes(query) || entry.descLower.includes(query))
      .map((entry) => entry.item);
  });

  // Calculate pagination
  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(filteredItems().length / itemsPerPage()))
  );

  const currentPageItems = createMemo(() => {
    const start = currentPage() * itemsPerPage();
    return filteredItems().slice(start, start + itemsPerPage());
  });

  // Reset page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(0);
  };

  // Page navigation
  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages()) {
      setIsAnimating(false);
      setCurrentPage(page);
      // Re-enable animation after a short delay
      if (animationRestoreTimer !== null) clearTimeout(animationRestoreTimer);
      animationRestoreTimer = setTimeout(() => setIsAnimating(true), 50);
    }
  };

  const goToPrevPage = () => goToPage(currentPage() - 1);
  const goToNextPage = () => goToPage(currentPage() + 1);

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't hijack arrow keys from typing elements (search input), but keep Escape working.
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && shouldIgnoreHotkeys(e, { ignoreWhenTyping: true })) {
      return;
    }
    switch (e.key) {
      case 'Escape':
        props.onClose?.();
        break;
      case 'ArrowLeft':
        goToPrevPage();
        break;
      case 'ArrowRight':
        goToNextPage();
        break;
    }
  };

  // Mouse wheel navigation
  const handleWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // Horizontal scroll
      if (e.deltaX > 30) goToNextPage();
      else if (e.deltaX < -30) goToPrevPage();
    } else {
      // Vertical scroll for page navigation
      if (e.deltaY > 50) goToNextPage();
      else if (e.deltaY < -50) goToPrevPage();
    }
  };

  // Touch gesture handling
  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      setTouchStart({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const start = touchStart();
    if (!start) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    // Swipe detection (minimum 50px)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) goToPrevPage();
      else goToNextPage();
    } else if (Math.abs(deltaY) > 100) {
      // Vertical swipe to close
      props.onClose?.();
    }

    setTouchStart(null);
  };

  // Background click to close - check if click is on empty area
  const handleBackgroundClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Close if clicking on background areas (not on interactive elements)
    const isInteractive = target.closest('button, input, a, [role="button"]');
    if (!isInteractive) {
      props.onClose?.();
    }
  };

  // Setup event listeners
  createEffect(() => {
    if (!isActive()) return;
    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown);
    });
  });

  onMount(() => {
    // `handleWheel` does not call preventDefault, so we can keep it passive for smoother scrolling.
    container?.addEventListener('wheel', handleWheel, { passive: true });
  });

  onCleanup(() => {
    container?.removeEventListener('wheel', handleWheel);
    if (animationRestoreTimer !== null) clearTimeout(animationRestoreTimer);
  });

  return (
    <div
      ref={container}
      class={`launchpad fixed inset-0 z-50 flex flex-col select-none
              bg-black/70 backdrop-blur-xl ${props.class ?? ''}`}
      style={props.style}
      onClick={handleBackgroundClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* CSS Animations */}
      <style>{`
        @keyframes launchpad-item-enter {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes launchpad-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes launchpad-search-enter {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .launchpad {
          animation: launchpad-fade-in 0.3s ease-out;
        }

        .launchpad-search {
          animation: launchpad-search-enter 0.4s ease-out;
        }
      `}</style>

      {/* Search Bar */}
      <Show when={showSearch()}>
        <div class="pt-8 pb-4 px-8">
          <LaunchpadSearch
            value={searchQuery()}
            onChange={handleSearchChange}
            placeholder="Search apps..."
          />
        </div>
      </Show>

      {/* Grid */}
      <div class="flex-1 min-h-0 overflow-hidden">
        <LaunchpadGrid
          items={currentPageItems()}
          onItemClick={props.onItemClick}
          columns={columns()}
          animating={isAnimating()}
        />
      </div>

      {/* Pagination */}
      <Show when={totalPages() > 1 && !searchQuery()}>
        <div class="pb-8">
          <LaunchpadPagination
            totalPages={totalPages()}
            currentPage={currentPage()}
            onPageChange={goToPage}
          />
        </div>
      </Show>

      {/* Keyboard hints */}
      <div class="absolute bottom-4 right-4 text-white/30 text-xs hidden md:block">
        <kbd class="px-1.5 py-0.5 rounded bg-white/10 mr-1">ESC</kbd> to close
        <span class="mx-2">|</span>
        <kbd class="px-1.5 py-0.5 rounded bg-white/10 mr-1">\u2190</kbd>
        <kbd class="px-1.5 py-0.5 rounded bg-white/10">→</kbd> to navigate
      </div>
    </div>
  );
}

export type { LaunchpadItemData } from './LaunchpadItem';
