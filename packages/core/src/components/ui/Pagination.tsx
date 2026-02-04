import { splitProps, type JSX, For, Show, Match, Switch, createMemo } from 'solid-js';
import { cn } from '../../utils/cn';

export type PaginationSize = 'sm' | 'md' | 'lg';
export type PaginationVariant = 'default' | 'simple' | 'minimal';

export interface PaginationProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'onChange'> {
  /** Current page (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onChange?: (page: number) => void;
  /** Size variant */
  size?: PaginationSize;
  /** Visual variant */
  variant?: PaginationVariant;
  /** Number of sibling pages to show on each side */
  siblingCount?: number;
  /** Show first/last page buttons */
  showFirstLast?: boolean;
  /** Show page size selector */
  showPageSize?: boolean;
  /** Current page size */
  pageSize?: number;
  /** Available page sizes */
  pageSizes?: number[];
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Show jump to page input */
  showJumpTo?: boolean;
  /** Total items count (for display) */
  totalItems?: number;
  /** Whether the pagination is disabled */
  disabled?: boolean;
}

const sizeStyles: Record<PaginationSize, { button: string; text: string; input: string }> = {
  sm: {
    button: 'h-7 min-w-7 px-2 text-xs',
    text: 'text-xs',
    input: 'h-7 w-14 text-xs',
  },
  md: {
    button: 'h-8 min-w-8 px-2.5 text-xs',
    text: 'text-xs',
    input: 'h-8 w-16 text-xs',
  },
  lg: {
    button: 'h-9 min-w-9 px-3 text-sm',
    text: 'text-sm',
    input: 'h-9 w-18 text-sm',
  },
};

// Icons
function ChevronLeftIcon(props: { class?: string }) {
  return (
    <svg class={props.class} viewBox="0 0 16 16" fill="currentColor">
      <path fill-rule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clip-rule="evenodd" />
    </svg>
  );
}

function ChevronRightIcon(props: { class?: string }) {
  return (
    <svg class={props.class} viewBox="0 0 16 16" fill="currentColor">
      <path fill-rule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z" clip-rule="evenodd" />
    </svg>
  );
}

function ChevronDoubleLeftIcon(props: { class?: string }) {
  return (
    <svg class={props.class} viewBox="0 0 16 16" fill="currentColor">
      <path fill-rule="evenodd" d="M8.78 4.22a.75.75 0 010 1.06L6.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L4.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clip-rule="evenodd" />
      <path fill-rule="evenodd" d="M12.78 4.22a.75.75 0 010 1.06L10.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L8.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clip-rule="evenodd" />
    </svg>
  );
}

function ChevronDoubleRightIcon(props: { class?: string }) {
  return (
    <svg class={props.class} viewBox="0 0 16 16" fill="currentColor">
      <path fill-rule="evenodd" d="M3.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L5.94 8 3.22 5.28a.75.75 0 010-1.06z" clip-rule="evenodd" />
      <path fill-rule="evenodd" d="M7.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L9.94 8 7.22 5.28a.75.75 0 010-1.06z" clip-rule="evenodd" />
    </svg>
  );
}

function MoreIcon(props: { class?: string }) {
  return (
    <svg class={props.class} viewBox="0 0 16 16" fill="currentColor">
      <circle cx="4" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="12" cy="8" r="1.5" />
    </svg>
  );
}

// Generate page numbers with ellipsis
function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | 'ellipsis')[] {
  const totalNumbers = siblingCount * 2 + 5; // siblings + first + last + current + 2 ellipses

  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = Array.from({ length: 3 + 2 * siblingCount }, (_, i) => i + 1);
    return [...leftRange, 'ellipsis', totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = Array.from(
      { length: 3 + 2 * siblingCount },
      (_, i) => totalPages - (3 + 2 * siblingCount) + i + 1
    );
    return [1, 'ellipsis', ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  );
  return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages];
}

export function Pagination(props: PaginationProps) {
  const [local, rest] = splitProps(props, [
    'page',
    'totalPages',
    'onChange',
    'size',
    'variant',
    'siblingCount',
    'showFirstLast',
    'showPageSize',
    'pageSize',
    'pageSizes',
    'onPageSizeChange',
    'showJumpTo',
    'totalItems',
    'disabled',
    'class',
  ]);

  const size = () => local.size ?? 'md';
  const variant = () => local.variant ?? 'default';
  const siblingCount = () => local.siblingCount ?? 1;
  const styles = () => sizeStyles[size()];

  const pageNumbers = createMemo(() =>
    generatePageNumbers(local.page, local.totalPages, siblingCount())
  );

  const canGoPrev = () => local.page > 1;
  const canGoNext = () => local.page < local.totalPages;

  const goToPage = (page: number) => {
    if (local.disabled) return;
    const validPage = Math.max(1, Math.min(page, local.totalPages));
    if (validPage !== local.page) {
      local.onChange?.(validPage);
    }
  };

  const handleJumpTo = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    if (!isNaN(value)) {
      goToPage(value);
    }
    input.value = '';
  };

  // Page button component
  const PageButton = (buttonProps: {
    page?: number;
    isActive?: boolean;
    disabled?: boolean;
    children: JSX.Element;
    onClick?: () => void;
    title?: string;
  }) => {
    const handleClick = () => buttonProps.onClick?.();

    return (
      <button
        type="button"
        disabled={buttonProps.disabled || local.disabled}
        onClick={handleClick}
        title={buttonProps.title}
        class={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 cursor-pointer',
          styles().button,
          buttonProps.isActive
            ? 'bg-primary text-primary-foreground'
            : 'bg-background text-foreground hover:bg-muted border border-border',
          (buttonProps.disabled || local.disabled) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {buttonProps.children}
      </button>
    );
  };

  return (
    <Switch>
      {/* Simple variant - just prev/next with current page */}
      <Match when={variant() === 'simple'}>
        <nav
          aria-label="Pagination"
          class={cn('flex items-center gap-2', local.class)}
          {...rest}
        >
          <PageButton
            disabled={!canGoPrev()}
            onClick={() => goToPage(local.page - 1)}
            title="Previous page"
          >
            <ChevronLeftIcon class="w-4 h-4" />
          </PageButton>
          <span class={cn('text-muted-foreground px-2', styles().text)}>
            Page {local.page} of {local.totalPages}
          </span>
          <PageButton
            disabled={!canGoNext()}
            onClick={() => goToPage(local.page + 1)}
            title="Next page"
          >
            <ChevronRightIcon class="w-4 h-4" />
          </PageButton>
        </nav>
      </Match>

      {/* Minimal variant - arrows only */}
      <Match when={variant() === 'minimal'}>
        <nav
          aria-label="Pagination"
          class={cn('flex items-center gap-1', local.class)}
          {...rest}
        >
          <Show when={local.showFirstLast}>
            <PageButton
              disabled={!canGoPrev()}
              onClick={() => goToPage(1)}
              title="First page"
            >
              <ChevronDoubleLeftIcon class="w-4 h-4" />
            </PageButton>
          </Show>
          <PageButton
            disabled={!canGoPrev()}
            onClick={() => goToPage(local.page - 1)}
            title="Previous page"
          >
            <ChevronLeftIcon class="w-4 h-4" />
          </PageButton>
          <span class={cn('text-muted-foreground px-3 tabular-nums', styles().text)}>
            {local.page} / {local.totalPages}
          </span>
          <PageButton
            disabled={!canGoNext()}
            onClick={() => goToPage(local.page + 1)}
            title="Next page"
          >
            <ChevronRightIcon class="w-4 h-4" />
          </PageButton>
          <Show when={local.showFirstLast}>
            <PageButton
              disabled={!canGoNext()}
              onClick={() => goToPage(local.totalPages)}
              title="Last page"
            >
              <ChevronDoubleRightIcon class="w-4 h-4" />
            </PageButton>
          </Show>
        </nav>
      </Match>

      {/* Default variant - full pagination with page numbers */}
      <Match when={variant() === 'default'}>
        <nav
          aria-label="Pagination"
          class={cn('flex items-center gap-4', local.class)}
          {...rest}
        >
          {/* Items count */}
          <Show when={local.totalItems !== undefined}>
            <span class={cn('text-muted-foreground', styles().text)}>
              {local.totalItems} items
            </span>
          </Show>

          {/* Page size selector */}
          <Show when={local.showPageSize && local.pageSizes}>
            <div class="flex items-center gap-2">
              <span class={cn('text-muted-foreground', styles().text)}>Show</span>
              <select
                value={local.pageSize}
                onChange={(e) => local.onPageSizeChange?.(parseInt(e.target.value, 10))}
                disabled={local.disabled}
                class={cn(
                  'rounded-md border border-border bg-background px-2 focus:outline-none focus:ring-2 focus:ring-ring',
                  styles().input,
                  local.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <For each={local.pageSizes}>
                  {(size) => <option value={size}>{size}</option>}
                </For>
              </select>
            </div>
          </Show>

          {/* Main pagination controls */}
          <div class="flex items-center gap-1">
            {/* First page button */}
            <Show when={local.showFirstLast}>
              <PageButton
                disabled={!canGoPrev()}
                onClick={() => goToPage(1)}
                title="First page"
              >
                <ChevronDoubleLeftIcon class="w-4 h-4" />
              </PageButton>
            </Show>

            {/* Previous button */}
            <PageButton
              disabled={!canGoPrev()}
              onClick={() => goToPage(local.page - 1)}
              title="Previous page"
            >
              <ChevronLeftIcon class="w-4 h-4" />
            </PageButton>

            {/* Page numbers */}
            <For each={pageNumbers()}>
              {(item) => (
                <>
                  {item === 'ellipsis' ? (
                    <span class={cn('px-2 text-muted-foreground', styles().text)}>
                      <MoreIcon class="w-4 h-4" />
                    </span>
                  ) : (
                    <PageButton
                      page={item}
                      isActive={item === local.page}
                      onClick={() => goToPage(item)}
                    >
                      {item}
                    </PageButton>
                  )}
                </>
              )}
            </For>

            {/* Next button */}
            <PageButton
              disabled={!canGoNext()}
              onClick={() => goToPage(local.page + 1)}
              title="Next page"
            >
              <ChevronRightIcon class="w-4 h-4" />
            </PageButton>

            {/* Last page button */}
            <Show when={local.showFirstLast}>
              <PageButton
                disabled={!canGoNext()}
                onClick={() => goToPage(local.totalPages)}
                title="Last page"
              >
                <ChevronDoubleRightIcon class="w-4 h-4" />
              </PageButton>
            </Show>
          </div>

          {/* Jump to page */}
          <Show when={local.showJumpTo}>
            <div class="flex items-center gap-2">
              <span class={cn('text-muted-foreground', styles().text)}>Go to</span>
              <input
                type="number"
                min={1}
                max={local.totalPages}
                placeholder={String(local.page)}
                disabled={local.disabled}
                onKeyDown={(e) => e.key === 'Enter' && handleJumpTo(e)}
                onBlur={handleJumpTo}
                class={cn(
                  'rounded-md border border-border bg-background px-2 text-center',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                  styles().input,
                  local.disabled && 'opacity-50 cursor-not-allowed'
                )}
              />
            </div>
          </Show>
        </nav>
      </Match>
    </Switch>
  );
}
