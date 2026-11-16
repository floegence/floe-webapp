import {
  For,
  Show,
  createMemo,
  createEffect,
  untrack,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
  type JSX,
} from 'solid-js';
import { createStore, reconcile, unwrap } from 'solid-js/store';
import { createGraphLayoutTransition, type MotionLayout, type MotionNode } from './layout-motion';
import { InfiniteCanvas } from '../ui/InfiniteCanvas';
import { resolveSurfaceInteractionTargetRole } from '../ui/localInteractionSurface';
import { graphEdgeLabelPosition, graphRelatedEdges, graphSectionPath } from './geometry';
import { GraphMinimap, type GraphMinimapProps } from './GraphMinimap';
import type {
  GraphLayout,
  GraphLayoutNode,
  GraphObjectEvent,
  GraphObjectRef,
  GraphViewport,
} from './types';

export interface GraphNodeRenderContext {
  selected: () => boolean;
  /** Use on a touch-accessible menu trigger; floating UI remains host-owned. */
  openMenu: (event: MouseEvent) => void;
}

export interface GraphCanvasProps {
  layout: GraphLayout;
  /** Animate layout changes with one geometry clock. Reduced motion settles immediately. */
  animateLayout?: boolean;
  viewport: GraphViewport;
  onViewportChange: (viewport: GraphViewport) => void;
  ariaLabel: string;
  renderNode: (node: GraphLayoutNode, context: GraphNodeRenderContext) => JSX.Element;
  renderGroup?: (node: GraphLayoutNode, context: GraphNodeRenderContext) => JSX.Element;
  selected?: GraphObjectRef | null;
  /** Undefined follows pointer/focus. Null explicitly clears highlighting. */
  highlight?: GraphObjectRef | null;
  onActivate?: (event: GraphObjectEvent) => void;
  onContextMenu?: (event: GraphObjectEvent) => void;
  onHover?: (object: GraphObjectRef | null) => void;
  onInteractionStart?: () => void;
  /** Overlay content should use shared SurfaceFloatingLayer for point placement. */
  overlay?: JSX.Element;
  /** Optional interactive overview. Its geometry follows the same visible layout. */
  minimap?: Pick<GraphMinimapProps, 'ariaLabel' | 'nodeStyle' | 'edges'>;
  class?: string;
}

/** Controlled graph surface. Hosts own documents and selection; Floe owns geometry and input. */
export function GraphCanvas(props: GraphCanvasProps) {
  const arrowId = `graph-arrow-${createUniqueId()}`;
  let root: HTMLDivElement | undefined;
  const [hovered, setHovered] = createSignal<GraphObjectRef | null>(null);
  const [size, setSize] = createSignal({ width: 0, height: 0 });
  const highlight = () => (props.highlight === undefined ? hovered() : props.highlight);
  const [painted, setPainted] = createStore<MotionLayout>({
    nodes: [],
    edges: [],
    bounds: { x: 0, y: 0, width: 0, height: 0 },
  });
  const [moving, setMoving] = createSignal(false);
  const [reducedMotion, setReducedMotion] = createSignal(false);
  let frame = 0;
  let lastNodes: GraphLayout['nodes'] | undefined;
  let deadline = 0;
  onMount(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    onCleanup(() => media.removeEventListener('change', update));
  });
  createEffect(() => {
    const target = props.layout;
    const reduce =
      reducedMotion() ||
      (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const geometryChanged = lastNodes !== target.nodes;
    lastNodes = target.nodes;
    cancelAnimationFrame(frame);
    if (!props.animateLayout) {
      setMoving(false);
      return;
    }
    const previous = untrack(() => structuredClone(unwrap(painted)));
    if (reduce || !previous.nodes.length || (!geometryChanged && !untrack(moving))) {
      setPainted(reconcile(structuredClone(target)));
      setMoving(false);
      return;
    }
    const sample = createGraphLayoutTransition(previous, structuredClone(target));
    const start = performance.now();
    if (geometryChanged) deadline = start + 280;
    const duration = Math.max(1, deadline - start);
    setMoving(true);
    setPainted(reconcile(sample(0)));
    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - start) / duration);
      // A calm, quick departure and soft landing, without spring overshoot.
      setPainted(reconcile(sample(1 - Math.pow(1 - elapsed, 3))));
      if (elapsed < 1) frame = requestAnimationFrame(tick);
      else setMoving(false);
    };
    frame = requestAnimationFrame(tick);
  });
  onCleanup(() => cancelAnimationFrame(frame));
  const scene = () => (props.animateLayout ? painted : props.layout);
  const nodes = createMemo(() => scene().nodes);
  const nodeMap = createMemo(() => new Map(nodes().map((node) => [node.id, node])));
  const highlightedEdges = createMemo(() => {
    const current = highlight();
    return current?.kind === 'node'
      ? graphRelatedEdges(scene(), current.id)
      : new Set(current ? [current.id] : []);
  });
  const isolatedEdges = createMemo(() => {
    const current = highlight();
    if (current?.kind !== 'node') return null;
    const node = nodeMap().get(current.id);
    const groupId = node?.kind === 'group' ? node.id : node?.parentId;
    return groupId ? graphRelatedEdges(scene(), groupId) : null;
  });
  const isSelected = (object: GraphObjectRef) =>
    props.selected?.kind === object.kind && props.selected.id === object.id;
  const visibleBounds = (viewport: GraphViewport) => {
    const { width, height } = size();
    if (!width || !height) return undefined;
    const left = -viewport.x / viewport.scale - 240,
      top = -viewport.y / viewport.scale - 240;
    const right = left + width / viewport.scale + 480,
      bottom = top + height / viewport.scale + 480;
    return { left, top, right, bottom };
  };
  const visibleNodes = (viewport: GraphViewport) => {
    const bounds = visibleBounds(viewport);
    if (!bounds) return nodes();
    const { left, top, right, bottom } = bounds;
    return nodes().filter(
      (node) =>
        node.id === props.selected?.id ||
        (node.x + node.width >= left &&
          node.x <= right &&
          node.y + node.height >= top &&
          node.y <= bottom)
    );
  };
  const edgeGeometry = createMemo(() =>
    scene().edges.map((edge) => ({
      edge,
      path: edge.sections.map(graphSectionPath).join(' '),
      label: graphEdgeLabelPosition(edge.sections),
      segments: edge.sections.flatMap((section) =>
        section.slice(1).map((point, index) => ({
          left: Math.min(point.x, section[index]!.x),
          right: Math.max(point.x, section[index]!.x),
          top: Math.min(point.y, section[index]!.y),
          bottom: Math.max(point.y, section[index]!.y),
        }))
      ),
    }))
  );
  const edgeMap = createMemo(
    () => new Map(edgeGeometry().map((geometry) => [geometry.edge.id, geometry]))
  );
  const visibleEdges = (viewport: GraphViewport) => {
    const bounds = visibleBounds(viewport);
    if (!bounds) return edgeGeometry();
    return edgeGeometry().filter(
      ({ edge, segments }) =>
        edge.id === props.selected?.id ||
        segments.some(
          (segment) =>
            segment.left <= bounds.right &&
            segment.right >= bounds.left &&
            segment.top <= bounds.bottom &&
            segment.bottom >= bounds.top
        )
    );
  };
  const hover = (object: GraphObjectRef | null) => {
    setHovered(object);
    props.onHover?.(object);
  };
  const eventAt = (
    object: GraphObjectRef | null,
    owner: Element,
    event?: MouseEvent
  ): GraphObjectEvent => {
    const rect = owner.getBoundingClientRect();
    return {
      object,
      owner,
      position:
        event && (event.clientX !== 0 || event.clientY !== 0)
          ? { x: event.clientX, y: event.clientY }
          : { x: rect.left + rect.width / 2, y: rect.top + Math.min(32, rect.height / 2) },
    };
  };
  const menu = (object: GraphObjectRef | null, event: MouseEvent) => {
    if (!props.onContextMenu) return;
    event.preventDefault();
    event.stopPropagation();
    props.onContextMenu(eventAt(object, event.currentTarget as Element, event));
  };
  const key = (object: GraphObjectRef | null, event: KeyboardEvent) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      event.stopPropagation();
      props.onContextMenu?.(eventAt(object, event.currentTarget as Element));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      props.onActivate?.(eventAt(object, event.currentTarget as Element));
    } else if (event.key === 'Escape') {
      hover(null);
      props.onActivate?.(eventAt(null, root!));
    }
  };
  onMount(() => {
    if (!root) return;
    const measure = () => setSize({ width: root!.clientWidth, height: root!.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    onCleanup(() => observer.disconnect());
  });
  const render = (node: GraphLayoutNode) => {
    const object: GraphObjectRef = { kind: 'node', id: node.id };
    const context: GraphNodeRenderContext = {
      selected: () => isSelected(object),
      openMenu: (event) => menu(object, event),
    };
    const renderer = createMemo(() =>
      node.kind === 'group' && props.renderGroup ? props.renderGroup : props.renderNode
    );
    return (
      <div
        class={node.kind === 'group' ? 'floe-graph__group' : 'floe-graph__node'}
        data-graph-object={node.id}
        data-selected={isSelected(object)}
        data-floe-canvas-pan-surface="true"
        style={{
          left: `${node.x}px`,
          top: `${node.y}px`,
          width: `${node.width}px`,
          height: `${node.height}px`,
          opacity: (node as MotionNode).opacity ?? 1,
        }}
        inert={(node as MotionNode).exiting || undefined}
        aria-hidden={(node as MotionNode).exiting || undefined}
        role="group"
        tabindex="0"
        aria-label={node.label}
        onPointerEnter={() => hover(object)}
        onPointerLeave={() => hover(null)}
        onFocusIn={() => hover(object)}
        onFocusOut={() => hover(null)}
        onClick={(event) => {
          if (
            (event.target as Element).closest(
              'button, a, input, select, textarea, [data-floe-canvas-interactive]'
            )
          )
            return;
          event.stopPropagation();
          props.onActivate?.(eventAt(object, event.currentTarget, event));
        }}
        onContextMenu={(event) => menu(object, event)}
        onKeyDown={(event) => key(object, event)}
      >
        {renderer()(node, context)}
      </div>
    );
  };
  return (
    <div
      ref={root}
      class={`floe-graph ${props.class ?? ''}`}
      data-layout-moving={moving() || undefined}
      data-animate-layout={props.animateLayout || undefined}
      role="region"
      aria-label={props.ariaLabel}
      tabindex="0"
      onKeyDown={(event) => key(null, event)}
    >
      <InfiniteCanvas
        viewport={props.viewport}
        minScale={0.1}
        maxScale={3}
        ariaLabel={props.ariaLabel}
        onViewportChange={props.onViewportChange}
        onViewportInteractionStart={() => props.onInteractionStart?.()}
        resolveTargetRole={(args) => {
          const element = args.target instanceof Element ? args.target : null;
          if (
            element?.closest(
              'button, a, input, select, textarea, [data-floe-canvas-interactive="true"]'
            )
          )
            return 'local_surface';
          return resolveSurfaceInteractionTargetRole(args);
        }}
        onCanvasPointerDown={(event) => {
          if (!(event.target instanceof Element) || event.target.closest('[data-graph-object]'))
            return;
          props.onActivate?.(eventAt(null, root!, event));
        }}
        onCanvasContextMenu={(event) =>
          props.onContextMenu?.({
            object: null,
            owner: root!,
            position: { x: event.clientX, y: event.clientY },
          })
        }
      >
        {(liveViewport) => {
          const paintBounds = createMemo(() => {
            const bounds = visibleBounds(liveViewport());
            if (bounds) return bounds;
            const { x, y, width, height } = scene().bounds;
            return {
              left: x - 240,
              top: y - 240,
              right: x + width + 240,
              bottom: y + height + 240,
            };
          });
          const visible = createMemo(() => visibleNodes(liveViewport()));
          const edges = createMemo(() =>
            visibleEdges(liveViewport()).map((geometry) => geometry.edge.id)
          );
          return (
            <>
              <svg
                class="floe-graph__edges"
                width={paintBounds().right - paintBounds().left}
                height={paintBounds().bottom - paintBounds().top}
                viewBox={`${paintBounds().left} ${paintBounds().top} ${paintBounds().right - paintBounds().left} ${paintBounds().bottom - paintBounds().top}`}
                style={{ left: `${paintBounds().left}px`, top: `${paintBounds().top}px` }}
                aria-label={props.ariaLabel}
              >
                <defs>
                  <marker
                    id={arrowId}
                    viewBox="0 0 8 8"
                    refX="7"
                    refY="4"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path
                      d="M1 1 L7 4 L1 7"
                      fill="none"
                      stroke="context-stroke"
                      stroke-width="1.2"
                    />
                  </marker>
                </defs>
                <For each={edges()}>
                  {(id) => {
                    const geometry = () => edgeMap().get(id)!;
                    const edge = () => geometry().edge;
                    const object: GraphObjectRef = { kind: 'edge', id };
                    const path = () => geometry().path;
                    const label = () => geometry().label;
                    return (
                      <Show when={!isolatedEdges() || isolatedEdges()!.has(id)}>
                        <g
                          data-graph-object={id}
                          data-emphasized={highlightedEdges().has(id)}
                          data-selected={isSelected(object)}
                        >
                          <path
                            class="floe-graph__edge"
                            d={path()}
                            marker-end={`url(#${arrowId})`}
                          />
                          <Show when={label()}>
                            {(position) => (
                              <text
                                class="floe-graph__edge-label"
                                data-count={/^\d+$/.test(edge().label)}
                                x={position().x}
                                y={position().y - 6}
                                aria-hidden="true"
                              >
                                {edge().label}
                              </text>
                            )}
                          </Show>
                          <path
                            class="floe-graph__edge-target"
                            d={path()}
                            tabindex="0"
                            role="button"
                            aria-label={edge().label}
                            data-floe-canvas-pan-surface="true"
                            onPointerEnter={() => hover(object)}
                            onPointerLeave={() => hover(null)}
                            onFocus={() => hover(object)}
                            onBlur={() => hover(null)}
                            onClick={(event) => {
                              event.stopPropagation();
                              props.onActivate?.(eventAt(object, event.currentTarget, event));
                            }}
                            onContextMenu={(event) => menu(object, event)}
                            onKeyDown={(event) => key(object, event)}
                          />
                        </g>
                      </Show>
                    );
                  }}
                </For>
              </svg>
              <For each={visible()}>{render}</For>
            </>
          );
        }}
      </InfiniteCanvas>
      <Show when={props.minimap}>
        {(minimap) => (
          <GraphMinimap
            layout={scene()}
            viewport={props.viewport}
            size={size()}
            onViewportChange={props.onViewportChange}
            onInteractionStart={props.onInteractionStart}
            ariaLabel={minimap().ariaLabel}
            nodeStyle={minimap().nodeStyle}
            edges={moving() ? scene().edges : minimap().edges}
          />
        )}
      </Show>
      {props.overlay}
    </div>
  );
}
