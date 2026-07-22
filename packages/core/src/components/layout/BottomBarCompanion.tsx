import { createEffect, createSignal, onCleanup, Show, untrack, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';

export type BottomBarCompanionPhase = 'collapsed' | 'expanding' | 'expanded' | 'collapsing';

export type BottomBarCompanionDismissReason = 'outside-pointer' | 'escape';

export interface BottomBarCompanionProps {
  retained: boolean;
  visible: boolean;
  open: boolean;
  anchor: HTMLElement | null;
  mount: HTMLElement | null;
  id: string;
  label: string;
  children?: JSX.Element;
  maxWidth?: number;
  maxHeight?: number;
  viewportPadding?: number;
  class?: string;
  contentClass?: string;
  surfaceRef?: (element: HTMLElement | null) => void;
  contentHostRef?: (element: HTMLElement | null) => void;
  isOwnedInteraction?: (event: PointerEvent | KeyboardEvent) => boolean;
  onDismiss?: (reason: BottomBarCompanionDismissReason) => void;
  onPhaseChange?: (phase: BottomBarCompanionPhase) => void;
}

type CompanionFrame = Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
}>;

type CompanionInsets = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

const DEFAULT_MAX_WIDTH = 544;
const DEFAULT_MAX_HEIGHT = 544;
const DEFAULT_VIEWPORT_PADDING = 12;
const SAFE_AREA_PROPERTIES = {
  top: '--floe-bottom-bar-companion-safe-area-top',
  right: '--floe-bottom-bar-companion-safe-area-right',
  bottom: '--floe-bottom-bar-companion-safe-area-bottom',
  left: '--floe-bottom-bar-companion-safe-area-left',
} as const;

function finitePositive(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finiteNonNegative(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function frameFromAnchor(anchor: HTMLElement | null): CompanionFrame | null {
  if (!anchor?.isConnected) return null;
  const rect = anchor.getBoundingClientRect();
  if (
    !Number.isFinite(rect.left) ||
    !Number.isFinite(rect.top) ||
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return null;
  }
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function numericCustomProperty(element: HTMLElement, property: string): number {
  const view = element.ownerDocument.defaultView;
  if (!view) return 0;
  const value = Number.parseFloat(view.getComputedStyle(element).getPropertyValue(property));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function safeAreaInsets(mount: HTMLElement): CompanionInsets {
  return {
    top: numericCustomProperty(mount, SAFE_AREA_PROPERTIES.top),
    right: numericCustomProperty(mount, SAFE_AREA_PROPERTIES.right),
    bottom: numericCustomProperty(mount, SAFE_AREA_PROPERTIES.bottom),
    left: numericCustomProperty(mount, SAFE_AREA_PROPERTIES.left),
  };
}

function expandedFrame(
  anchor: CompanionFrame,
  mount: HTMLElement,
  maxWidth: number,
  maxHeight: number,
  padding: number
): CompanionFrame {
  const view = mount.ownerDocument.defaultView;
  const visualViewport = view?.visualViewport;
  const viewportLeft = visualViewport?.offsetLeft ?? 0;
  const viewportTop = visualViewport?.offsetTop ?? 0;
  const viewportWidth = visualViewport?.width ?? view?.innerWidth ?? anchor.left + anchor.width;
  const viewportHeight = visualViewport?.height ?? view?.innerHeight ?? anchor.top + anchor.height;
  const insets = safeAreaInsets(mount);
  const safeLeft = viewportLeft + insets.left + padding;
  const safeRight = viewportLeft + viewportWidth - insets.right - padding;
  const safeTop = viewportTop + insets.top + padding;
  const safeBottom = viewportTop + viewportHeight - insets.bottom - padding;
  const availableWidth = Math.max(0, safeRight - safeLeft);
  const width = Math.min(anchor.width, maxWidth, availableWidth);
  const desiredLeft = anchor.left + (anchor.width - width) / 2;
  const left = Math.max(safeLeft, Math.min(desiredLeft, safeRight - width));
  const bottom = Math.min(anchor.top + anchor.height, safeBottom);
  const availableHeight = Math.max(anchor.height, bottom - safeTop);
  const height = Math.min(maxHeight, availableHeight);

  return {
    left,
    top: bottom - height,
    width,
    height,
  };
}

function sameFrame(left: CompanionFrame | null, right: CompanionFrame): boolean {
  return Boolean(
    left &&
    left.left === right.left &&
    left.top === right.top &&
    left.width === right.width &&
    left.height === right.height
  );
}

function frameStyle(frame: CompanionFrame | null): JSX.CSSProperties {
  if (!frame) return {};
  return {
    left: `${frame.left}px`,
    top: `${frame.top}px`,
    width: `${frame.width}px`,
    height: `${frame.height}px`,
  };
}

/**
 * A non-modal surface that grows upward from a Bottom Bar anchor.
 *
 * This is intentionally distinct from windows, popovers, and modal drawers:
 * it retains one fixed shell and one content host across collapsed and expanded
 * presentation. Products that also have a full-page placement can Portal their
 * stable product tree into `contentHostRef` without giving this component
 * ownership of that tree.
 */
export function BottomBarCompanion(props: BottomBarCompanionProps) {
  const [portalMount, setPortalMount] = createSignal<HTMLElement | null>(null);
  const [mountConnected, setMountConnected] = createSignal(false);
  const [anchorReady, setAnchorReady] = createSignal(false);
  const [frame, setFrame] = createSignal<CompanionFrame | null>(null);
  const [lastAnchorFrame, setLastAnchorFrame] = createSignal<CompanionFrame | null>(null);
  const [phase, setPhaseSignal] = createSignal<BottomBarCompanionPhase>('collapsed');
  let surface: HTMLElement | null = null;
  let geometryFrame = 0;
  let transitionFrame = 0;
  let geometryView: Window | null = null;
  let transitionView: Window | null = null;
  let transitionProperty: keyof CompanionFrame | null = null;
  let lastVisible = false;
  let lastOpen = false;

  const setPhase = (next: BottomBarCompanionPhase) => {
    if (phase() === next) return;
    setPhaseSignal(next);
    props.onPhaseChange?.(next);
  };

  const ownerView = () =>
    portalMount()?.ownerDocument.defaultView ?? props.anchor?.ownerDocument.defaultView ?? null;

  const reducedMotion = () =>
    ownerView()?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const resolvePortalMount = (currentAnchorFrame: CompanionFrame | null) => {
    const requested = props.mount;
    const anchor = props.anchor;
    const candidateReady = Boolean(
      requested?.isConnected &&
      currentAnchorFrame &&
      anchor?.ownerDocument === requested.ownerDocument
    );
    if (candidateReady) {
      setPortalMount(requested);
    }
    const current = portalMount();
    if (current) {
      setMountConnected(current.isConnected);
      const ready = Boolean(candidateReady && current === requested);
      setAnchorReady(ready);
      return { mount: current, ready } as const;
    }
    setMountConnected(false);
    setAnchorReady(false);
    return { mount: null, ready: false } as const;
  };

  const targetFrame = (open: boolean): CompanionFrame | null => {
    const currentAnchorFrame = frameFromAnchor(props.anchor);
    if (currentAnchorFrame) setLastAnchorFrame(currentAnchorFrame);
    const { mount, ready } = resolvePortalMount(currentAnchorFrame);
    const anchorFrame = currentAnchorFrame ?? lastAnchorFrame();
    if (!anchorFrame || !mount || !ready) return null;
    if (!open) return anchorFrame;
    return expandedFrame(
      anchorFrame,
      mount,
      finitePositive(props.maxWidth, DEFAULT_MAX_WIDTH),
      finitePositive(props.maxHeight, DEFAULT_MAX_HEIGHT),
      finiteNonNegative(props.viewportPadding, DEFAULT_VIEWPORT_PADDING)
    );
  };

  const cancelScheduledGeometry = () => {
    if (geometryFrame && geometryView) geometryView.cancelAnimationFrame(geometryFrame);
    if (transitionFrame && transitionView) transitionView.cancelAnimationFrame(transitionFrame);
    geometryFrame = 0;
    transitionFrame = 0;
    geometryView = null;
    transitionView = null;
    transitionProperty = null;
  };

  const commitTargetFrame = (open: boolean, animate: boolean) => {
    const next = targetFrame(open);
    if (!next) return;
    const current = frame();
    const finalPhase: BottomBarCompanionPhase = open ? 'expanded' : 'collapsed';
    if (!animate || reducedMotion() || sameFrame(current, next)) {
      setFrame(next);
      transitionProperty = null;
      setPhase(finalPhase);
      return;
    }
    transitionProperty =
      (['height', 'width', 'top', 'left'] as const).find(
        (property) => current?.[property] !== next[property]
      ) ?? null;
    setPhase(open ? 'expanding' : 'collapsing');
    const view = ownerView();
    if (!view) {
      setFrame(next);
      setPhase(finalPhase);
      return;
    }
    transitionFrame = view.requestAnimationFrame(() => {
      transitionFrame = 0;
      transitionView = null;
      setFrame(next);
    });
    transitionView = view;
  };

  const scheduleGeometry = (animate: boolean, open: boolean) => {
    const view = ownerView();
    if (!view) {
      commitTargetFrame(open, animate);
      return;
    }
    if (geometryFrame && geometryView) geometryView.cancelAnimationFrame(geometryFrame);
    if (transitionFrame && transitionView) transitionView.cancelAnimationFrame(transitionFrame);
    transitionFrame = 0;
    transitionView = null;
    geometryFrame = view.requestAnimationFrame(() => {
      geometryFrame = 0;
      geometryView = null;
      untrack(() => commitTargetFrame(open, animate));
    });
    geometryView = view;
  };

  createEffect(() => {
    const retained = props.retained;
    const visible = props.visible;
    const open = props.open;
    void props.anchor;
    void props.mount;
    void props.maxWidth;
    void props.maxHeight;
    void props.viewportPadding;

    if (!retained) {
      cancelScheduledGeometry();
      setPortalMount(null);
      setMountConnected(false);
      setAnchorReady(false);
      setFrame(null);
      setLastAnchorFrame(null);
      surface = null;
      props.surfaceRef?.(null);
      props.contentHostRef?.(null);
      lastVisible = false;
      lastOpen = open;
      return;
    }

    const currentAnchorFrame = frameFromAnchor(props.anchor);
    if (currentAnchorFrame) setLastAnchorFrame(currentAnchorFrame);
    resolvePortalMount(currentAnchorFrame);
    if (!visible) {
      lastVisible = false;
      lastOpen = open;
      return;
    }

    const becameVisible = !lastVisible;
    const openChanged = lastOpen !== open;
    lastVisible = true;
    lastOpen = open;
    scheduleGeometry(!becameVisible && openChanged, open);
  });

  createEffect(() => {
    if (!props.retained) return;
    const anchor = props.anchor;
    const mount = portalMount();
    const requestedMount = props.mount;
    const documents = new Set<Document>();
    const views = new Set<Window>();
    for (const element of [anchor, mount, requestedMount]) {
      if (!element) continue;
      documents.add(element.ownerDocument);
      const view = element.ownerDocument.defaultView;
      if (view) views.add(view);
    }
    if (views.size === 0 || documents.size === 0) return;

    const refresh = () =>
      scheduleGeometry(
        false,
        untrack(() => props.open)
      );
    const resizeObservers: ResizeObserver[] = [];
    for (const element of new Set([anchor, mount, requestedMount])) {
      const view = element?.ownerDocument.defaultView;
      if (!element || !view || typeof view.ResizeObserver !== 'function') continue;
      const observer = new view.ResizeObserver(refresh);
      observer.observe(element);
      resizeObservers.push(observer);
    }
    let anchorWasConnected = anchor?.isConnected ?? false;
    let mountWasConnected = mount?.isConnected ?? false;
    let requestedMountWasConnected = requestedMount?.isConnected ?? false;
    const mutationObservers: MutationObserver[] = [];
    for (const document of documents) {
      const view = document.defaultView;
      if (!view || typeof view.MutationObserver !== 'function' || !document.documentElement)
        continue;
      const observer = new view.MutationObserver(() => {
        const anchorIsConnected = anchor?.isConnected ?? false;
        const mountIsConnected = mount?.isConnected ?? false;
        const requestedMountIsConnected = requestedMount?.isConnected ?? false;
        if (
          anchorWasConnected === anchorIsConnected &&
          mountWasConnected === mountIsConnected &&
          requestedMountWasConnected === requestedMountIsConnected
        ) {
          return;
        }
        anchorWasConnected = anchorIsConnected;
        mountWasConnected = mountIsConnected;
        requestedMountWasConnected = requestedMountIsConnected;
        untrack(refresh);
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      mutationObservers.push(observer);
    }
    for (const view of views) {
      view.addEventListener('resize', refresh);
      view.visualViewport?.addEventListener('resize', refresh);
      view.visualViewport?.addEventListener('scroll', refresh);
    }

    onCleanup(() => {
      for (const observer of resizeObservers) observer.disconnect();
      for (const observer of mutationObservers) observer.disconnect();
      for (const view of views) {
        view.removeEventListener('resize', refresh);
        view.visualViewport?.removeEventListener('resize', refresh);
        view.visualViewport?.removeEventListener('scroll', refresh);
      }
    });
  });

  createEffect(() => {
    if (
      !props.retained ||
      !props.visible ||
      !props.open ||
      !mountConnected() ||
      !anchorReady() ||
      !frame()
    )
      return;
    const mount = portalMount();
    const document = mount?.ownerDocument;
    if (!document) return;

    const inside = (event: PointerEvent | KeyboardEvent) => {
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      if (surface && path.includes(surface)) return true;
      if (props.anchor && path.includes(props.anchor)) return true;
      return props.isOwnedInteraction?.(event) ?? false;
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (inside(event)) return;
      props.onDismiss?.('outside-pointer');
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        event.isComposing ||
        event.keyCode === 229
      )
        return;
      const active = document.activeElement;
      if (!surface?.contains(active) && !props.isOwnedInteraction?.(event)) return;
      event.preventDefault();
      props.onDismiss?.('escape');
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    });
  });

  onCleanup(() => {
    cancelScheduledGeometry();
    props.surfaceRef?.(null);
    props.contentHostRef?.(null);
  });

  const setSurface = (element: HTMLElement) => {
    surface = element;
    props.surfaceRef?.(element);
  };

  const setContentHost = (element: HTMLElement) => {
    props.contentHostRef?.(element);
  };

  const finishTransition = (event: TransitionEvent) => {
    if (event.target !== surface || event.propertyName !== transitionProperty) return;
    const expected = props.open ? 'expanding' : 'collapsing';
    if (phase() !== expected) return;
    transitionProperty = null;
    setPhase(props.open ? 'expanded' : 'collapsed');
  };

  return (
    <Show when={props.retained && portalMount()}>
      {(mount) => (
        <Portal mount={mount()}>
          <section
            ref={(element) => setSurface(element)}
            id={props.id}
            role="region"
            aria-label={props.label}
            aria-hidden={
              !props.visible || !mountConnected() || !anchorReady() || !frame() ? 'true' : undefined
            }
            inert={!props.visible || !mountConnected() || !anchorReady() || !frame()}
            class={cn('floe-bottom-bar-companion', props.class)}
            data-floe-bottom-bar-companion="true"
            data-companion-phase={phase()}
            data-companion-visibility={
              props.visible && mountConnected() && anchorReady() ? 'visible' : 'hidden'
            }
            data-companion-frame-ready={frame() ? 'true' : 'false'}
            style={frameStyle(frame())}
            onTransitionEnd={finishTransition}
          >
            <div
              ref={(element) => setContentHost(element)}
              class={cn('floe-bottom-bar-companion__content', props.contentClass)}
              data-floe-bottom-bar-companion-content="true"
            >
              {props.children}
            </div>
          </section>
        </Portal>
      )}
    </Show>
  );
}
