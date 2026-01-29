import { For, Show, createMemo, createSignal, onMount, onCleanup } from 'solid-js';
import { cn } from '../../utils/cn';
import { useFileBrowser } from './FileBrowserContext';
import { ChevronRight } from '../icons';
import { Dropdown, type DropdownItem } from '../ui/Dropdown';

export interface BreadcrumbProps {
  class?: string;
}

interface BreadcrumbSegment {
  name: string;
  path: string;
}

// Width estimation constants
const SEPARATOR_WIDTH = 16; // Separator icon w-3 (12px) + gap (4px)
const ELLIPSIS_WIDTH = 28; // Ellipsis button width
const SEGMENT_PADDING = 12; // px-1.5 * 2 = 12px
const CHAR_WIDTH = 7; // Approx. 7px per character (text-xs)
const MAX_SEGMENT_WIDTH = 120; // max-w-[120px]
const MIN_CONTAINER_WIDTH = 100; // Minimum container width

/**
 * Estimate the display width of a path segment.
 */
function estimateSegmentWidth(name: string): number {
  const textWidth = name.length * CHAR_WIDTH;
  return Math.min(textWidth + SEGMENT_PADDING, MAX_SEGMENT_WIDTH + SEGMENT_PADDING);
}

/**
 * Breadcrumb navigation showing current path
 * Responsive collapsing based on container width: show as many segments as possible,
 * and collapse middle segments when space is limited.
 */
export function Breadcrumb(props: BreadcrumbProps) {
  const ctx = useFileBrowser();
  let containerRef: HTMLElement | undefined;
  const [containerWidth, setContainerWidth] = createSignal(0);

  // Observe container width changes
  onMount(() => {
    if (!containerRef) return;

    const updateWidth = () => {
      if (containerRef) {
        setContainerWidth(containerRef.offsetWidth);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef);

    onCleanup(() => resizeObserver.disconnect());
  });

  // Parse path into segments
  const segments = createMemo<BreadcrumbSegment[]>(() => {
    const path = ctx.currentPath();
    const rootLabel = ctx.homeLabel();
    if (path === '/' || path === '') {
      return [{ name: rootLabel, path: '/' }];
    }

    const parts = path.split('/').filter(Boolean);
    const result: BreadcrumbSegment[] = [{ name: rootLabel, path: '/' }];

    let currentPath = '';
    for (const part of parts) {
      currentPath += '/' + part;
      result.push({ name: part, path: currentPath });
    }

    return result;
  });

  // Compute visible/collapsed segments based on container width
  const collapsedInfo = createMemo(() => {
    const all = segments();
    const width = containerWidth();

    // If width is unknown or there are too few segments, show all.
    if (width < MIN_CONTAINER_WIDTH || all.length <= 2) {
      return { collapsed: [], visible: all, shouldCollapse: false };
    }

    // Estimate widths for each segment.
    const segmentWidths = all.map((seg) => estimateSegmentWidth(seg.name));

    // Always keep the first (Root) and the last segment.
    const firstWidth = segmentWidths[0];
    const lastWidth = segmentWidths[all.length - 1];
    const firstSeparator = SEPARATOR_WIDTH;
    const lastSeparator = all.length > 1 ? SEPARATOR_WIDTH : 0;

    // Base width: Root + last segment + separators.
    const usedWidth = firstWidth + lastWidth + firstSeparator + lastSeparator;

    // If base width already overflows, show only Root and the last segment.
    if (usedWidth > width && all.length > 2) {
      return {
        collapsed: all.slice(1, -1),
        visible: [all[0], all[all.length - 1]],
        shouldCollapse: true,
      };
    }

    // Try to add more segments from the end.
    // Strategy: prefer segments closer to the current path.
    const middleSegments = all.slice(1, -1);
    const visibleMiddle: BreadcrumbSegment[] = [];
    let remainingWidth = width - usedWidth;

    // Reserve space for the ellipsis if we need to collapse middle segments.
    const ellipsisReserve = middleSegments.length > 0 ? ELLIPSIS_WIDTH + SEPARATOR_WIDTH : 0;

    // Try to add middle segments from the end.
    for (let i = middleSegments.length - 1; i >= 0; i--) {
      const segWidth = segmentWidths[i + 1]; // +1 because we skip Root
      const separatorWidth = SEPARATOR_WIDTH;
      const neededWidth = segWidth + separatorWidth;

      // Check if there are still segments left to collapse.
      const hasMoreToCollapse = i > 0;
      const reserveForEllipsis = hasMoreToCollapse ? ellipsisReserve : 0;

      if (remainingWidth - reserveForEllipsis >= neededWidth) {
        visibleMiddle.unshift(middleSegments[i]);
        remainingWidth -= neededWidth;
      } else {
        // Not enough width; collapse the remaining segments.
        break;
      }
    }

    const collapsedMiddle = middleSegments.slice(0, middleSegments.length - visibleMiddle.length);

    return {
      collapsed: collapsedMiddle,
      visible: [all[0], ...visibleMiddle, all[all.length - 1]],
      shouldCollapse: collapsedMiddle.length > 0,
    };
  });

  const handleClick = (segment: BreadcrumbSegment) => {
    ctx.setCurrentPath(segment.path);
  };

  return (
    <nav
      ref={containerRef}
      class={cn('flex items-center gap-1 min-w-0 overflow-hidden', props.class)}
      aria-label="Breadcrumb"
    >
      <For each={collapsedInfo().visible}>
        {(segment, index) => (
          <>
            <Show when={index() > 0}>
              <ChevronRight class="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            </Show>
            {/* Insert the collapsed ellipsis dropdown after Root */}
            <Show when={collapsedInfo().shouldCollapse && index() === 1}>
              <CollapsedSegments
                segments={collapsedInfo().collapsed}
                onSelect={handleClick}
              />
              <ChevronRight class="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            </Show>
            <BreadcrumbItem
              segment={segment}
              isLast={index() === collapsedInfo().visible.length - 1}
              onClick={() => handleClick(segment)}
            />
          </>
        )}
      </For>
    </nav>
  );
}

interface CollapsedSegmentsProps {
  segments: BreadcrumbSegment[];
  onSelect: (segment: BreadcrumbSegment) => void;
}

/**
 * Dropdown for collapsed path segments.
 * Click "…" to reveal the hidden middle segments.
 */
function CollapsedSegments(props: CollapsedSegmentsProps) {
  const items = (): DropdownItem[] =>
    props.segments.map((seg) => ({
      id: seg.path,
      label: seg.name,
    }));

  const handleSelect = (path: string) => {
    const segment = props.segments.find((s) => s.path === path);
    if (segment) {
      props.onSelect(segment);
    }
  };

  return (
    <Dropdown
      trigger={
        <button
          type="button"
          class={cn(
            'text-xs px-1.5 py-0.5 rounded cursor-pointer flex-shrink-0',
            'transition-all duration-100',
            'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
          )}
          title="Show hidden path segments"
        >
          …
        </button>
      }
      items={items()}
      onSelect={handleSelect}
      align="start"
    />
  );
}

interface BreadcrumbItemProps {
  segment: BreadcrumbSegment;
  isLast: boolean;
  onClick: () => void;
}

function BreadcrumbItem(props: BreadcrumbItemProps) {
  return (
    <button
      type="button"
      onClick={() => props.onClick()}
      disabled={props.isLast}
      class={cn(
        'text-xs px-1.5 py-0.5 rounded cursor-pointer flex-shrink-0',
        'transition-all duration-100',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        props.isLast
          ? 'font-medium text-foreground cursor-default'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      <span class="truncate max-w-[120px] block">{props.segment.name}</span>
    </button>
  );
}
