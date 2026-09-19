import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  splitProps,
  untrack,
  type JSX,
} from 'solid-js';
import { cn } from '../../utils/cn';
import { LOCAL_INTERACTION_SURFACE_ATTR } from './localInteractionSurface';

export interface PersistentHorizontalScrollbarProps extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'children' | 'onScroll' | 'onKeyDown' | 'onPointerDown'
> {
  /** The real, constrained left-to-right scroll viewport. Native scrolling remains authoritative. */
  viewport: HTMLElement | undefined;
  'aria-label': string;
}

type ScrollMetrics = {
  clientWidth: number;
  trackWidth: number;
  scrollLeft: number;
  scrollWidth: number;
};

const EMPTY_SCROLL_METRICS: ScrollMetrics = {
  clientWidth: 0,
  trackWidth: 0,
  scrollLeft: 0,
  scrollWidth: 0,
};

/** A persistent overflow affordance independent of OS overlay-scrollbar settings.
 * Place beside the viewport in a flex column. This control owns pointer and keyboard
 * interaction only; the host retains wheel and Workbench activation ownership.
 */
export function PersistentHorizontalScrollbar(allProps: PersistentHorizontalScrollbarProps) {
  const [props, rest] = splitProps(allProps, ['viewport', 'class']);
  const [scrollMetrics, setScrollMetrics] = createSignal<ScrollMetrics>(EMPTY_SCROLL_METRICS);
  const viewportId = createUniqueId();
  let scrollbarTrack: HTMLDivElement | undefined;
  let resizeObserverRef: ResizeObserver | undefined;
  let metricsFrame: number | undefined;
  const syncScrollMetrics = () => {
    const viewport = props.viewport;
    if (!viewport) {
      setScrollMetrics(EMPTY_SCROLL_METRICS);
      return;
    }
    setScrollMetrics({
      clientWidth: viewport.clientWidth,
      trackWidth: scrollbarTrack?.clientWidth ?? viewport.clientWidth,
      scrollLeft: viewport.scrollLeft,
      scrollWidth: viewport.scrollWidth,
    });
  };

  const scheduleScrollMetrics = () => {
    if (metricsFrame !== undefined) return;
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      syncScrollMetrics();
      return;
    }
    metricsFrame = window.requestAnimationFrame(() => {
      metricsFrame = undefined;
      untrack(syncScrollMetrics);
    });
  };

  const setScrollLeft = (nextScrollLeft: number) => {
    const viewport = props.viewport;
    if (!viewport) return;
    const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    viewport.scrollLeft = Math.max(0, Math.min(maximum, nextScrollLeft));
    syncScrollMetrics();
  };

  const horizontalScrollMaximum = createMemo(() => {
    const metrics = scrollMetrics();
    return Math.max(0, metrics.scrollWidth - metrics.clientWidth);
  });
  const horizontalScrollbarVisible = createMemo(() => horizontalScrollMaximum() > 1);
  const horizontalThumbSize = createMemo(() => {
    const metrics = scrollMetrics();
    if (metrics.scrollWidth <= 0) return 100;
    return Math.min(
      100,
      Math.max(28 / Math.max(1, metrics.trackWidth), metrics.clientWidth / metrics.scrollWidth) *
        100
    );
  });
  const horizontalThumbStart = createMemo(() => {
    const maximum = horizontalScrollMaximum();
    if (maximum <= 0) return 0;
    return (
      Math.max(0, Math.min(1, scrollMetrics().scrollLeft / maximum)) * (100 - horizontalThumbSize())
    );
  });

  const handleScrollbarTrackPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !scrollbarTrack) return;
    event.preventDefault();
    scrollbarTrack.focus({ preventScroll: true });
    const trackBounds = scrollbarTrack.getBoundingClientRect();
    const thumb = scrollbarTrack.querySelector<HTMLElement>(
      '[data-floe-horizontal-scrollbar-thumb]'
    );
    const thumbWidth =
      thumb?.getBoundingClientRect().width ?? trackBounds.width * (horizontalThumbSize() / 100);
    const trackTravel = Math.max(1, trackBounds.width - thumbWidth);
    const target = Math.max(
      0,
      Math.min(trackTravel, event.clientX - trackBounds.left - thumbWidth / 2)
    );
    setScrollLeft((target / trackTravel) * horizontalScrollMaximum());
  };

  let thumbDragStartX = 0;
  let thumbDragStartScrollLeft = 0;

  const handleScrollbarThumbPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !scrollbarTrack) return;
    const thumb = event.currentTarget as HTMLDivElement;
    scrollbarTrack.focus({ preventScroll: true });
    thumbDragStartX = event.clientX;
    thumbDragStartScrollLeft = scrollMetrics().scrollLeft;
    thumb.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleScrollbarThumbPointerMove = (event: PointerEvent) => {
    const thumb = event.currentTarget as HTMLDivElement;
    if (!thumb.hasPointerCapture(event.pointerId) || !scrollbarTrack) return;
    const trackTravel = Math.max(
      1,
      scrollbarTrack.getBoundingClientRect().width - thumb.getBoundingClientRect().width
    );
    const scrollDelta =
      ((event.clientX - thumbDragStartX) / trackTravel) * horizontalScrollMaximum();
    setScrollLeft(thumbDragStartScrollLeft + scrollDelta);
  };

  const handleScrollbarThumbPointerUp = (event: PointerEvent) => {
    const thumb = event.currentTarget as HTMLDivElement;
    if (thumb.hasPointerCapture(event.pointerId)) thumb.releasePointerCapture(event.pointerId);
  };

  const handleScrollbarKeyDown = (event: KeyboardEvent) => {
    const metrics = scrollMetrics();
    const step = 48;
    let nextScrollLeft: number | undefined;
    switch (event.key) {
      case 'ArrowLeft':
        nextScrollLeft = metrics.scrollLeft - step;
        break;
      case 'ArrowRight':
        nextScrollLeft = metrics.scrollLeft + step;
        break;
      case 'Home':
        nextScrollLeft = 0;
        break;
      case 'End':
        nextScrollLeft = horizontalScrollMaximum();
        break;
      case 'PageUp':
        nextScrollLeft = metrics.scrollLeft - metrics.clientWidth;
        break;
      case 'PageDown':
        nextScrollLeft = metrics.scrollLeft + metrics.clientWidth;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    setScrollLeft(nextScrollLeft);
  };

  createEffect(() => {
    const viewport = props.viewport;
    if (!viewport) {
      setScrollMetrics(EMPTY_SCROLL_METRICS);
      return;
    }
    const generatedId = !viewport.id;
    if (generatedId) viewport.id = viewportId;
    const previousMarker = viewport.getAttribute('data-floe-horizontal-scroll-viewport');
    viewport.setAttribute('data-floe-horizontal-scroll-viewport', 'true');
    const resizeObserver = new ResizeObserver(scheduleScrollMetrics);
    resizeObserverRef = resizeObserver;
    const observeContent = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(viewport);
      for (const child of viewport.children) resizeObserver.observe(child);
      if (scrollbarTrack?.isConnected) resizeObserver.observe(scrollbarTrack);
      scheduleScrollMetrics();
    };
    const mutationObserver = new MutationObserver(observeContent);
    mutationObserver.observe(viewport, { childList: true, subtree: true, characterData: true });
    viewport.addEventListener('scroll', scheduleScrollMetrics, { passive: true });
    observeContent();
    onCleanup(() => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      viewport.removeEventListener('scroll', scheduleScrollMetrics);
      if (generatedId && viewport.id === viewportId) viewport.removeAttribute('id');
      if (previousMarker === null) viewport.removeAttribute('data-floe-horizontal-scroll-viewport');
      else viewport.setAttribute('data-floe-horizontal-scroll-viewport', previousMarker);
    });
  });
  onCleanup(() => {
    if (metricsFrame !== undefined) window.cancelAnimationFrame(metricsFrame);
  });
  return (
    <Show when={horizontalScrollbarVisible()}>
      <div
        ref={(node) => {
          scrollbarTrack = node;
          resizeObserverRef?.observe(node);
          scheduleScrollMetrics();
        }}
        {...{ [LOCAL_INTERACTION_SURFACE_ATTR]: 'true' }}
        {...rest}
        aria-controls={props.viewport?.id || viewportId}
        aria-orientation="horizontal"
        aria-valuemax={Math.round(horizontalScrollMaximum())}
        aria-valuemin="0"
        aria-valuenow={Math.round(scrollMetrics().scrollLeft)}
        data-floe-horizontal-scrollbar="true"
        role="scrollbar"
        tabIndex={0}
        class={cn('floe-horizontal-scrollbar', props.class)}
        onKeyDown={handleScrollbarKeyDown}
        onPointerDown={handleScrollbarTrackPointerDown}
      >
        <div
          aria-hidden="true"
          data-floe-horizontal-scrollbar-thumb="true"
          class="floe-horizontal-scrollbar-thumb"
          onPointerDown={handleScrollbarThumbPointerDown}
          onPointerMove={handleScrollbarThumbPointerMove}
          onPointerUp={handleScrollbarThumbPointerUp}
          onPointerCancel={handleScrollbarThumbPointerUp}
          style={{
            left: `${horizontalThumbStart()}%`,
            width: `${horizontalThumbSize()}%`,
          }}
        />
      </div>
    </Show>
  );
}
