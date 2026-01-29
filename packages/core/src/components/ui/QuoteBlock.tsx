import { type ParentProps, Show, splitProps } from 'solid-js';
import { cn } from '../../utils/cn';

export interface QuoteBlockProps extends ParentProps {
  /** Quote variant style */
  variant?: 'default' | 'subtle' | 'bordered' | 'code' | 'inline';
  /** Optional citation/source */
  citation?: string;
  /** Optional author name */
  author?: string;
  /** Additional class names */
  class?: string;
}

/**
 * QuoteBlock - A clean, professional blockquote component for developer tools.
 *
 * Features:
 * - Minimal, functional design matching IDE aesthetics
 * - Multiple variants for different contexts
 * - Optional citation and author attribution
 */
export function QuoteBlock(props: QuoteBlockProps) {
  const [local, rest] = splitProps(props, [
    'variant',
    'citation',
    'author',
    'class',
    'children',
  ]);

  const variant = () => local.variant ?? 'default';

  // Border color using primary with opacity
  const borderStyle = () => {
    if (variant() === 'inline') return {};
    const opacity = variant() === 'subtle' ? 0.5 : 0.7;
    return {
      'border-left-color': `color-mix(in srgb, var(--primary) ${opacity * 100}%, transparent)`,
    };
  };

  return (
    <blockquote
      class={cn(
        'relative my-2',
        // Default variant - Gray background with solid primary left border
        variant() === 'default' && [
          'pl-3 py-2 pr-3',
          'border-l-2',
          'bg-muted/50',
          'rounded-r',
        ],
        // Subtle variant - Lighter background, visible border
        variant() === 'subtle' && [
          'pl-3 py-1.5 pr-3',
          'border-l-2',
          'bg-muted/30',
          'rounded-r',
        ],
        // Bordered variant - Full border for emphasis
        variant() === 'bordered' && [
          'px-3 py-2',
          'border border-border rounded-md',
          'border-l-2',
          'bg-muted/40',
        ],
        // Code variant - Monospace, terminal-like
        variant() === 'code' && [
          'px-3 py-2',
          'bg-muted/50 rounded',
          'font-mono',
          'border-l-2',
        ],
        // Inline variant - Compact, for tight spaces
        variant() === 'inline' && [
          'px-2 py-1',
          'bg-muted/40 rounded',
          'text-muted-foreground',
        ],
        local.class
      )}
      style={borderStyle()}
      {...rest}
    >
      {/* Quote content */}
      <div class={cn(
        'text-xs leading-relaxed text-foreground/80',
        variant() === 'code' && 'text-[11px]',
        variant() === 'inline' && 'text-[11px]',
      )}>
        {local.children}
      </div>

      {/* Citation/Author */}
      <Show when={local.citation || local.author}>
        <footer class={cn(
          'mt-1.5 text-[10px] text-muted-foreground/70 not-italic',
          variant() === 'code' && 'font-mono',
        )}>
          <Show when={local.author}>
            <span>{local.author}</span>
          </Show>
          <Show when={local.author && local.citation}>
            <span class="mx-1 opacity-50">—</span>
          </Show>
          <Show when={local.citation}>
            <cite class="not-italic">{local.citation}</cite>
          </Show>
        </footer>
      </Show>
    </blockquote>
  );
}

export default QuoteBlock;
