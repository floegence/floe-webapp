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

// 宽度估算常量
const SEPARATOR_WIDTH = 16; // 分隔符 w-3 (12px) + gap (4px)
const ELLIPSIS_WIDTH = 28; // 省略号按钮宽度
const SEGMENT_PADDING = 12; // px-1.5 * 2 = 12px
const CHAR_WIDTH = 7; // 每个字符约 7px (text-xs)
const MAX_SEGMENT_WIDTH = 120; // max-w-[120px]
const MIN_CONTAINER_WIDTH = 100; // 最小容器宽度

/**
 * 估算路径段的显示宽度
 */
function estimateSegmentWidth(name: string): number {
  const textWidth = name.length * CHAR_WIDTH;
  return Math.min(textWidth + SEGMENT_PADDING, MAX_SEGMENT_WIDTH + SEGMENT_PADDING);
}

/**
 * Breadcrumb navigation showing current path
 * 基于容器宽度自适应折叠：尽量显示更多路径段，宽度不足时折叠中间部分
 */
export function Breadcrumb(props: BreadcrumbProps) {
  const ctx = useFileBrowser();
  let containerRef: HTMLElement | undefined;
  const [containerWidth, setContainerWidth] = createSignal(0);

  // 监听容器宽度变化
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

  // 解析路径为段落
  const segments = createMemo<BreadcrumbSegment[]>(() => {
    const path = ctx.currentPath();
    if (path === '/' || path === '') {
      return [{ name: 'Root', path: '/' }];
    }

    const parts = path.split('/').filter(Boolean);
    const result: BreadcrumbSegment[] = [{ name: 'Root', path: '/' }];

    let currentPath = '';
    for (const part of parts) {
      currentPath += '/' + part;
      result.push({ name: part, path: currentPath });
    }

    return result;
  });

  // 根据容器宽度计算可见和折叠的段落
  const collapsedInfo = createMemo(() => {
    const all = segments();
    const width = containerWidth();

    // 宽度未知或只有一个段落时，显示全部
    if (width < MIN_CONTAINER_WIDTH || all.length <= 2) {
      return { collapsed: [], visible: all, shouldCollapse: false };
    }

    // 计算每个段落的宽度
    const segmentWidths = all.map((seg) => estimateSegmentWidth(seg.name));

    // 始终保留第一个（Root）和最后一个段落
    const firstWidth = segmentWidths[0];
    const lastWidth = segmentWidths[all.length - 1];
    const firstSeparator = SEPARATOR_WIDTH;
    const lastSeparator = all.length > 1 ? SEPARATOR_WIDTH : 0;

    // 基础宽度：Root + 最后一个 + 它们的分隔符
    const usedWidth = firstWidth + lastWidth + firstSeparator + lastSeparator;

    // 如果基础宽度已经超出，只显示 Root 和最后一个
    if (usedWidth > width && all.length > 2) {
      return {
        collapsed: all.slice(1, -1),
        visible: [all[0], all[all.length - 1]],
        shouldCollapse: true,
      };
    }

    // 尝试从尾部向前添加更多段落
    // 策略：优先显示靠近当前位置的路径
    const middleSegments = all.slice(1, -1);
    const visibleMiddle: BreadcrumbSegment[] = [];
    let remainingWidth = width - usedWidth;

    // 预留省略号的空间（如果有中间段落需要折叠）
    const ellipsisReserve = middleSegments.length > 0 ? ELLIPSIS_WIDTH + SEPARATOR_WIDTH : 0;

    // 从后往前尝试添加中间段落
    for (let i = middleSegments.length - 1; i >= 0; i--) {
      const segWidth = segmentWidths[i + 1]; // +1 因为跳过了 Root
      const separatorWidth = SEPARATOR_WIDTH;
      const neededWidth = segWidth + separatorWidth;

      // 检查是否还有剩余段落需要折叠
      const hasMoreToCollapse = i > 0;
      const reserveForEllipsis = hasMoreToCollapse ? ellipsisReserve : 0;

      if (remainingWidth - reserveForEllipsis >= neededWidth) {
        visibleMiddle.unshift(middleSegments[i]);
        remainingWidth -= neededWidth;
      } else {
        // 宽度不够，剩余的都要折叠
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
            {/* 在 Root 后面插入折叠的省略号下拉 */}
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
 * 折叠的路径段下拉菜单
 * 点击 "…" 展开显示被折叠的中间路径
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
