/*
 * A dialog whose content is chosen rather than typed — a wizard step, a tab of
 * settings, a field that reveals help — changes height the instant the choice
 * lands. The jump reads as the whole surface being replaced. This keeps the new
 * height and animates the old one into it.
 *
 * CSS alone cannot express it: the panel is content-sized, so both the first
 * and the last height are `auto`, and no transition interpolates between two
 * indefinite lengths. The box is measured around the change instead, which is
 * also why the observer rather than a render hook drives it — the panel resizes
 * for reasons the component never hears about (a body reflow, a font swap, a
 * lazy child mounting).
 */

const HEIGHT_TRANSITION_MS = 220;

function prefersReducedMotion(): boolean {
  const matchMedia = globalThis.matchMedia;
  if (typeof matchMedia !== 'function') return false;
  return matchMedia.call(globalThis, '(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animate the panel from its previous height to whatever its content now needs.
 * Returns a disposer. A panel that is entering, exiting, suspended, or hidden
 * is left alone: its own opening motion already owns the box, and animating a
 * height nobody can see only queues late frames.
 */
export function observeDialogHeight(
  element: HTMLElement,
  options: { isSettled?: () => boolean } = {}
): () => void {
  const ResizeObserverCtor = globalThis.ResizeObserver;
  if (typeof ResizeObserverCtor !== 'function') return () => {};

  // Border-box is what the user sees, and what the panel's `max-height` is
  // resolved against. `offsetHeight` reports the layout box; the rect would
  // report it through the panel's own enter scale instead.
  const measure = () => element.offsetHeight;
  // A panel that is still entering is being scaled and faded by its own motion,
  // and the layout it settles into reaches the observer as a few small steps
  // before the transition ends. Those are not the content changing.
  const ownsMotion = () =>
    typeof element.getAnimations === 'function' &&
    element.getAnimations().some((animation) => animation !== running && animation.playState === 'running');
  let previous = measure();
  let running: Animation | null = null;
  let disposed = false;
  let observer: ResizeObserver | null = null;

  const release = () => {
    running = null;
    element.style.willChange = '';
    // The panel is still again, so what remains to report is a real content
    // change rather than one of the animation's own frames.
    if (!disposed && observer) observer.observe(element, { box: 'border-box' });
  };

  const animateTo = (to: number) => {
    const from = previous;
    previous = to;
    if (!Number.isFinite(from) || Math.abs(from - to) < 0.5) return;
    if (prefersReducedMotion()) return;

    // Starting an animation from inside the observer callback mutates the box it
    // has just measured, and WebKit reports that as "ResizeObserver loop completed
    // with undelivered notifications" — a page error the overlay checks treat as a
    // failure. Stop observing for the duration instead: every size the animation
    // reports would only be its own interpolation, so there is nothing to hear
    // until it lands, and `release` measures the content's real height again.
    observer?.unobserve(element);
    const animation = element.animate(
      [{ height: `${from}px` }, { height: `${to}px` }],
      {
        duration: HEIGHT_TRANSITION_MS,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'none',
      }
    );
    running = animation;
    element.style.willChange = 'height';
    animation.addEventListener('finish', () => {
      if (disposed) return;
      release();
      // With `fill: none` the box hands itself back to its content the moment
      // the transition ends, so what it measures now is what the content needs.
      // A change that landed while the panel was in flight only surfaces here.
      const natural = measure();
      if (Math.abs(natural - previous) >= 0.5) animateTo(natural);
    });
    animation.oncancel = () => {
      if (!disposed) release();
    };
  };

  observer = new ResizeObserverCtor((entries) => {
    const entry = entries[entries.length - 1];
    if (!entry) return;
    // While a height animation runs, every reported size is one of that
    // animation's own frames rather than the height the content needs.
    // Retargeting from those makes the panel chase its own interpolation and
    // never settle; the finish handler measures the real height instead.
    if (running) return;
    // `borderBoxSize` is the untransformed border box, which is the size the
    // panel holds once it is still; `contentRect` omits the border around it.
    const size = Array.isArray(entry.borderBoxSize)
      ? entry.borderBoxSize[0]
      : entry.borderBoxSize;
    const reported = size ? size.blockSize : entry.contentRect.height;
    if ((options.isSettled && !options.isSettled()) || ownsMotion()) {
      previous = reported;
      return;
    }
    animateTo(reported);
  });
  observer.observe(element, { box: 'border-box' });

  return () => {
    disposed = true;
    observer.disconnect();
    running?.cancel();
    running = null;
    element.style.willChange = '';
  };
}
