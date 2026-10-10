import { For, createMemo } from 'solid-js';
import { fitGraphViewport, graphSectionPath } from './geometry';
import type { GraphLayout, GraphLayoutNode, GraphViewport } from './types';

export interface GraphMinimapNodeStyle {
  /** CSS colors, including theme variables. Omitted colors retain the defaults. */
  fill?: string;
  stroke?: string;
}

export interface GraphMinimapProps {
  layout: GraphLayout;
  viewport: GraphViewport;
  size: { width: number; height: number };
  onViewportChange: (viewport: GraphViewport) => void;
  onInteractionStart?: () => void;
  ariaLabel: string;
  /** Host appearance over the exact layout. Equal styles share one SVG path. */
  nodeStyle?: (node: GraphLayoutNode) => GraphMinimapNodeStyle | undefined;
}

/** A lightweight navigator over the exact main-canvas geometry. No second layout. */
export function GraphMinimap(props: GraphMinimapProps) {
  let svg: SVGSVGElement | undefined;
  let drag: { id: number; x: number; y: number; viewport: GraphViewport } | undefined;
  const bounds = createMemo(() => {
    const { x, y, width, height } = props.layout.bounds;
    const padding = Math.max(width, height, 1) * 0.04;
    return {
      x: x - padding,
      y: y - padding,
      width: width + padding * 2,
      height: height + padding * 2,
    };
  });
  const shapes = createMemo(() => {
    const groups = new Map<string, GraphMinimapNodeStyle & { paths: string[] }>();
    const nodes = new Map<string, GraphMinimapNodeStyle & { paths: string[] }>();
    for (const node of props.layout.nodes) {
      const style = props.nodeStyle?.(node) ?? {};
      const batches = node.kind === 'group' ? groups : nodes;
      const key = JSON.stringify([style.fill ?? null, style.stroke ?? null]);
      let batch = batches.get(key);
      if (!batch) {
        batch = { ...style, paths: [] };
        batches.set(key, batch);
      }
      batch.paths.push(`M${node.x},${node.y}h${node.width}v${node.height}h${-node.width}Z`);
    }
    const paths = (batches: typeof groups) =>
      [...batches.values()].map(({ paths, ...style }) => ({ ...style, path: paths.join('') }));
    return { groups: paths(groups), nodes: paths(nodes) };
  });
  const paint = (style: GraphMinimapNodeStyle) => ({
    '--graph-minimap-fill': style.fill,
    '--graph-minimap-stroke': style.stroke,
    '--graph-minimap-opacity': style.fill || style.stroke ? '1' : undefined,
  });
  const edges = createMemo(() =>
    props.layout.edges.flatMap((edge) => edge.sections.map(graphSectionPath)).join(' ')
  );
  const worldPoint = (event: PointerEvent) => {
    const matrix = svg?.getScreenCTM();
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      : undefined;
  };
  const stop = (event: PointerEvent) => {
    if (drag?.id !== event.pointerId) return;
    drag = undefined;
    if (svg?.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  };
  return (
    <svg
      ref={svg}
      class="floe-graph__minimap"
      role="region"
      tabindex="0"
      aria-label={props.ariaLabel}
      viewBox={`${bounds().x} ${bounds().y} ${bounds().width} ${bounds().height}`}
      preserveAspectRatio="xMidYMid meet"
      data-floe-canvas-interactive="true"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const point = worldPoint(event);
        if (!point) return;
        event.preventDefault();
        event.stopPropagation();
        props.onInteractionStart?.();
        svg!.focus({ preventScroll: true });
        if (!(event.target as Element).matches('.floe-graph__minimap-viewport'))
          props.onViewportChange({
            ...props.viewport,
            x: props.size.width / 2 - point.x * props.viewport.scale,
            y: props.size.height / 2 - point.y * props.viewport.scale,
          });
        drag = { id: event.pointerId, x: point.x, y: point.y, viewport: { ...props.viewport } };
        svg!.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (drag?.id !== event.pointerId) return;
        const point = worldPoint(event);
        if (!point) return;
        props.onViewportChange({
          ...drag.viewport,
          x: drag.viewport.x - (point.x - drag.x) * drag.viewport.scale,
          y: drag.viewport.y - (point.y - drag.y) * drag.viewport.scale,
        });
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={() => {
        drag = undefined;
      }}
      onKeyDown={(event) => {
        const steps: Record<string, [number, number]> = {
          ArrowLeft: [1, 0],
          ArrowRight: [-1, 0],
          ArrowUp: [0, 1],
          ArrowDown: [0, -1],
        };
        const step = steps[event.key];
        if (!step && event.key !== 'Home') return;
        event.preventDefault();
        event.stopPropagation();
        props.onInteractionStart?.();
        props.onViewportChange(
          step
            ? {
                ...props.viewport,
                x: props.viewport.x + step[0] * props.size.width * 0.2,
                y: props.viewport.y + step[1] * props.size.height * 0.2,
              }
            : fitGraphViewport(props.layout.bounds, props.size, 24)
        );
      }}
    >
      <For each={shapes().groups}>
        {(shape) => <path class="floe-graph__minimap-groups" d={shape.path} style={paint(shape)} />}
      </For>
      <path class="floe-graph__minimap-edges" d={edges()} />
      <For each={shapes().nodes}>
        {(shape) => <path class="floe-graph__minimap-nodes" d={shape.path} style={paint(shape)} />}
      </For>
      <rect
        class="floe-graph__minimap-viewport"
        x={-props.viewport.x / props.viewport.scale}
        y={-props.viewport.y / props.viewport.scale}
        width={props.size.width / props.viewport.scale}
        height={props.size.height / props.viewport.scale}
      />
    </svg>
  );
}
