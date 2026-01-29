import { type JSX, type ParentProps, Show, splitProps } from 'solid-js';
import { cn } from '../../utils/cn';
import {
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Sparkles,
} from '../icons';

export type HighlightVariant = 'info' | 'warning' | 'success' | 'error' | 'note' | 'tip';

export interface HighlightBlockProps extends ParentProps {
  /** Highlight variant determines color scheme and default icon */
  variant?: HighlightVariant;
  /** Optional title */
  title?: string;
  /** Custom icon (overrides default variant icon) */
  icon?: JSX.Element;
  /** Hide the icon */
  hideIcon?: boolean;
  /** Collapsible state (undefined = not collapsible, boolean = controlled) */
  collapsed?: boolean;
  /** Callback when collapsed state changes */
  onToggle?: (collapsed: boolean) => void;
  /** Additional class names */
  class?: string;
}

const variantConfig: Record<
  HighlightVariant,
  {
    icon: (props: { class?: string }) => JSX.Element;
    containerClass: string;
    iconClass: string;
    titleClass: string;
  }
> = {
  info: {
    icon: Info,
    containerClass: 'highlight-block-info',
    iconClass: 'highlight-icon-info',
    titleClass: 'highlight-title-info',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'highlight-block-warning',
    iconClass: 'highlight-icon-warning',
    titleClass: 'highlight-title-warning',
  },
  success: {
    icon: CheckCircle,
    containerClass: 'highlight-block-success',
    iconClass: 'highlight-icon-success',
    titleClass: 'highlight-title-success',
  },
  error: {
    icon: XCircle,
    containerClass: 'highlight-block-error',
    iconClass: 'highlight-icon-error',
    titleClass: 'highlight-title-error',
  },
  note: {
    icon: Sparkles,
    containerClass: 'highlight-block-note',
    iconClass: 'highlight-icon-note',
    titleClass: 'highlight-title-note',
  },
  tip: {
    icon: Zap,
    containerClass: 'highlight-block-tip',
    iconClass: 'highlight-icon-tip',
    titleClass: 'highlight-title-tip',
  },
};

const defaultTitles: Record<HighlightVariant, string> = {
  info: 'Info',
  warning: 'Warning',
  success: 'Success',
  error: 'Error',
  note: 'Note',
  tip: 'Tip',
};

/**
 * HighlightBlock - A callout/admonition component for highlighting important content.
 *
 * Features:
 * - Multiple semantic variants (info, warning, success, error, note, tip)
 * - Automatic icons based on variant
 * - Optional custom icons
 * - Optional collapsible functionality
 * - Accessible and responsive design
 *
 * Usage:
 * ```tsx
 * <HighlightBlock variant="info" title="Did you know?">
 *   This is an informational callout.
 * </HighlightBlock>
 *
 * <HighlightBlock variant="warning">
 *   Be careful with this operation.
 * </HighlightBlock>
 * ```
 */
export function HighlightBlock(props: HighlightBlockProps) {
  const [local, rest] = splitProps(props, [
    'variant',
    'title',
    'icon',
    'hideIcon',
    'collapsed',
    'onToggle',
    'class',
    'children',
  ]);

  const variant = () => local.variant ?? 'note';
  const config = () => variantConfig[variant()];
  const isCollapsible = () => local.collapsed !== undefined;
  const isCollapsed = () => local.collapsed ?? false;

  const handleToggle = () => {
    if (isCollapsible() && local.onToggle) {
      local.onToggle(!isCollapsed());
    }
  };

  const renderIcon = () => {
    if (local.icon) return local.icon;
    const IconFn = config().icon;
    return <IconFn class={cn('w-[14px] h-[14px]', config().iconClass)} />;
  };

  const displayTitle = () => local.title ?? defaultTitles[variant()];

  return (
    <div
      class={cn(
        'highlight-block',
        config().containerClass,
        local.class
      )}
      {...rest}
    >
      {/* Header with left accent bar */}
      <div
        class={cn(
          'highlight-block-header',
          isCollapsible() && 'cursor-pointer select-none'
        )}
        onClick={handleToggle}
        role={isCollapsible() ? 'button' : undefined}
        tabIndex={isCollapsible() ? 0 : undefined}
        onKeyDown={(e) => {
          if (isCollapsible() && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        {/* Collapse indicator */}
        <Show when={isCollapsible()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class={cn(
              'w-3 h-3 opacity-50 transition-transform duration-200',
              !isCollapsed() && 'rotate-90'
            )}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Show>

        {/* Icon */}
        <Show when={!local.hideIcon}>
          <div class="highlight-block-icon">
            {renderIcon()}
          </div>
        </Show>

        {/* Title */}
        <span class={cn('highlight-block-title', config().titleClass)}>
          {displayTitle()}
        </span>
      </div>

      {/* Content */}
      <Show when={!isCollapsed()}>
        <div class="highlight-block-content">
          {local.children}
        </div>
      </Show>
    </div>
  );
}

/**
 * InfoBlock - Shorthand for HighlightBlock with info variant
 */
export function InfoBlock(props: Omit<HighlightBlockProps, 'variant'>) {
  return <HighlightBlock variant="info" {...props} />;
}

/**
 * WarningBlock - Shorthand for HighlightBlock with warning variant
 */
export function WarningBlock(props: Omit<HighlightBlockProps, 'variant'>) {
  return <HighlightBlock variant="warning" {...props} />;
}

/**
 * SuccessBlock - Shorthand for HighlightBlock with success variant
 */
export function SuccessBlock(props: Omit<HighlightBlockProps, 'variant'>) {
  return <HighlightBlock variant="success" {...props} />;
}

/**
 * ErrorBlock - Shorthand for HighlightBlock with error variant
 */
export function ErrorBlock(props: Omit<HighlightBlockProps, 'variant'>) {
  return <HighlightBlock variant="error" {...props} />;
}

/**
 * NoteBlock - Shorthand for HighlightBlock with note variant
 */
export function NoteBlock(props: Omit<HighlightBlockProps, 'variant'>) {
  return <HighlightBlock variant="note" {...props} />;
}

/**
 * TipBlock - Shorthand for HighlightBlock with tip variant
 */
export function TipBlock(props: Omit<HighlightBlockProps, 'variant'>) {
  return <HighlightBlock variant="tip" {...props} />;
}

export default HighlightBlock;
