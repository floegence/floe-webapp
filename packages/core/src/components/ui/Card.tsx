import { splitProps, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';

export type CardVariant = 'default' | 'interactive' | 'well';

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * `default` is a filled content plane on the canvas. `interactive` adds the
   * language's hover lift and first elevation step for clickable cards.
   * `well` recesses the card into its host, for grouped secondary content.
   */
  variant?: CardVariant;
}

/**
 * Card — a plane, not a box.
 *
 * Separation comes from the fill step against the canvas and from the gutter
 * around it; the card itself carries no contour and no resting shadow. That is
 * what keeps a page of cards calm instead of drawing a grid of rectangles.
 */
export function Card(props: CardProps) {
  const [local, rest] = splitProps(props, ['variant', 'class', 'children']);

  const variant = () => local.variant ?? 'default';

  return (
    <div
      data-floe-surface={variant() === 'well' ? 'inset' : undefined}
      data-floe-card-variant={variant()}
      data-floe-interactive={variant() === 'interactive' ? 'lift' : undefined}
      class={cn(
        'rounded-card',
        'bg-card text-card-foreground',
        'duration-[var(--floe-duration-base)] ease-[var(--floe-ease-out)]',
        variant() === 'default' && 'border border-transparent',
        variant() === 'well' && 'bg-[var(--floe-well)] border border-transparent',
        /* The rise and its shadow live in the interaction contract
         * (`data-floe-interactive='lift'` in language.css), so every clickable
         * plane in the app travels the same pixel through the same token. The
         * class string keeps only what is specific to this card. */
        variant() === 'interactive' && 'border border-transparent cursor-pointer',
        local.class
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export type CardHeaderProps = JSX.HTMLAttributes<HTMLDivElement>;

export function CardHeader(props: CardHeaderProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div class={cn('flex flex-col gap-1 p-[var(--floe-pad-card)] pb-0', local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export type CardTitleProps = JSX.HTMLAttributes<HTMLHeadingElement>;

export function CardTitle(props: CardTitleProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <h3
      class={cn(
        'text-[length:var(--floe-type-body)] font-semibold leading-[var(--floe-line-heading)] tracking-[var(--floe-tracking-tight)]',
        local.class
      )}
      {...rest}
    >
      {local.children}
    </h3>
  );
}

export type CardDescriptionProps = JSX.HTMLAttributes<HTMLParagraphElement>;

export function CardDescription(props: CardDescriptionProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <p
      class={cn(
        'text-[length:var(--floe-type-supporting)] leading-[var(--floe-line-body)] text-[var(--floe-ink-soft)]',
        local.class
      )}
      {...rest}
    >
      {local.children}
    </p>
  );
}

export type CardContentProps = JSX.HTMLAttributes<HTMLDivElement>;

export function CardContent(props: CardContentProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div class={cn('p-[var(--floe-pad-card)]', local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export type CardFooterProps = JSX.HTMLAttributes<HTMLDivElement>;

export function CardFooter(props: CardFooterProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div class={cn('flex items-center gap-[var(--floe-gap-control)] p-[var(--floe-pad-card)] pt-0', local.class)} {...rest}>
      {local.children}
    </div>
  );
}
