import { Show, type JSX, type ParentProps } from 'solid-js';

/* The showcase's layout system.
 *
 * Thirty-plus pages were each written with their own container, label and
 * spacing strings, so no two pages shared a rhythm. These four pieces carry
 * the whole visual language instead: one page frame, one section rhythm, one
 * demo surface, one label. Pages describe *what* to show; these decide *how*
 * it is spaced, sized and aligned. */

/** Page frame shared by every showcase page: one measure, one gutter. */
export function ShowcaseFrame(props: ParentProps<{ class?: string }>) {
  return (
    <div
      class={
        'mx-auto w-full max-w-[var(--floe-measure-page,68rem)] px-4 py-4 sm:px-6 ' +
        (props.class ?? '')
      }
    >
      {props.children}
    </div>
  );
}

/**
 * A page section. The header is always the same shape — title, optional
 * description on a readable measure, optional actions right-aligned on the
 * title's baseline — and the body keeps one vertical rhythm.
 */
export function ShowcaseSection(
  props: ParentProps<{
    id: string;
    title: string;
    description?: string;
    actions?: JSX.Element;
    class?: string;
  }>
) {
  return (
    <section id={props.id} class={'scroll-mt-4 space-y-4 ' + (props.class ?? '')}>
      <header class="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-[var(--floe-line-quiet)] pb-3">
        <div class="min-w-0 space-y-1">
          <h2 class="text-lg font-semibold leading-tight tracking-[var(--floe-tracking-tight)]">
            {props.title}
          </h2>
          <Show when={props.description}>
            <p class="max-w-[68ch] text-caption leading-[var(--floe-line-caption)] text-[var(--floe-ink-soft)]">
              {props.description}
            </p>
          </Show>
        </div>
        <Show when={props.actions}>
          <div class="flex shrink-0 items-center gap-2">{props.actions}</div>
        </Show>
      </header>
      <div class="space-y-4">{props.children}</div>
    </section>
  );
}

/**
 * The surface every demo sits on. One border, one radius, one padding — the
 * demo inside it supplies only its own layout.
 */
export function DemoSurface(
  props: ParentProps<{
    /** Optional label rendered as the surface's eyebrow, inside the same fill. */
    label?: string;
    /** Layout classes for the padded body. */
    contentClass?: string;
    class?: string;
  }>
) {
  return (
    <div
      class={
        'overflow-hidden rounded-card border border-[var(--floe-line)] bg-card ' +
        (props.class ?? '')
      }
    >
      <Show when={props.label}>
        <div class="border-b border-[var(--floe-line-quiet)] px-4 pt-3 pb-2">
          <DemoLabel>{props.label}</DemoLabel>
        </div>
      </Show>
      <div class={'p-4 ' + (props.contentClass ?? 'space-y-4')}>{props.children}</div>
    </div>
  );
}

/** Sub-heading inside a demo surface. */
export function DemoLabel(props: ParentProps<{ class?: string }>) {
  return (
    <div
      class={
        'text-caption font-medium tracking-[0.04em] uppercase text-[var(--floe-ink-quiet)] ' +
        (props.class ?? '')
      }
    >
      {props.children}
    </div>
  );
}

/** A responsive row of demo surfaces; `sm` starts the second column. */
export function DemoGrid(props: ParentProps<{ min?: 'sm' | 'md' | 'lg'; class?: string }>) {
  const cols = () =>
    props.min === 'lg'
      ? 'grid-cols-1 lg:grid-cols-3'
      : props.min === 'md'
        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2';
  return <div class={'grid gap-3 ' + cols() + ' ' + (props.class ?? '')}>{props.children}</div>;
}

/**
 * The docs tail every page ends with: guidance, source, props. Keeping it in
 * one component is what stops pages from spacing it differently.
 */
export function DocsStack(props: ParentProps<{ class?: string }>) {
  return (
    <div class={'space-y-4 border-t border-[var(--floe-line-quiet)] pt-4 ' + (props.class ?? '')}>
      {props.children}
    </div>
  );
}
