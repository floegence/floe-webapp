import { createMemo } from 'solid-js';
import { fitGraphViewport, graphSectionPath } from './geometry';
import type { GraphLayout, GraphViewport } from './types';

export interface GraphMinimapProps {
  layout: GraphLayout;
  viewport: GraphViewport;
  size: { width: number; height: number };
  onViewportChange: (viewport: GraphViewport) => void;
  onInteractionStart?: () => void;
  ariaLabel: string;
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
  const shape = (kind: 'node' | 'group') =>
    props.layout.nodes
      .filter((node) => (node.kind === 'group' ? 'group' : 'node') === kind)
      .map((node) => `M${node.x},${node.y}h${node.width}v${node.height}h${-node.width}Z`)
      .join('');
  const nodes = createMemo(() => shape('node'));
  const groups = createMemo(() => shape('group'));
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
      <path class="floe-graph__minimap-groups" d={groups()} />
      <path class="floe-graph__minimap-edges" d={edges()} />
      <path class="floe-graph__minimap-nodes" d={nodes()} />
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
