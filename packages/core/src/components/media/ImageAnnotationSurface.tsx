import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { imageAnnotationMarkup, imagePointFromClient, validateImageAnnotation, type ImageAnnotation, type ImageDimensions, type ImagePoint } from './imageAnnotation';

export type ImageAnnotationSurfaceProps = ImageDimensions & {
  src: string;
  label: string;
  annotation?: ImageAnnotation;
  onChange?: (annotation: ImageAnnotation) => void;
  disabled?: boolean;
  zoom?: number;
  /** Drag the zoomed viewport without changing its annotation. */
  panning?: boolean;
  showAnnotation?: boolean;
  class?: string;
};

/** A contained immutable image. Click selects a point; drag selects a rectangle.
 * Scroll pans at host-controlled zoom. No iframe access or capture is performed.
 */
export function ImageAnnotationSurface(props: ImageAnnotationSurfaceProps) {
  let host!: HTMLDivElement, svg!: SVGSVGElement;
  const [size, setSize] = createSignal({ width: 1, height: 1 });
  const [draft, setDraft] = createSignal<ImageAnnotation>();
  let gesture: { id: number; start: ImagePoint; client: ImagePoint; original?: ImageAnnotation; corner?: number; src: string } | undefined;
  let pan: { id: number; x: number; y: number; left: number; top: number } | undefined;
  const shown = () => draft() ?? props.annotation;
  const scale = createMemo(() => Math.min(size().width / props.width, size().height / props.height) * Math.max(1, props.zoom ?? 1));
  const markup = () => props.showAnnotation !== false && shown() && validateImageAnnotation(props, shown()!) ? imageAnnotationMarkup(props, shown()!) : '';
  onMount(() => {
    let pending = 0;
    const measure = () => {
      pending = 0;
      const width = host.clientWidth, height = host.clientHeight;
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    // Scrollbars change the usable viewport. Measure in the next frame rather
    // than changing scroll extents inside ResizeObserver delivery.
    const observer = new ResizeObserver(() => { if (!pending) pending = requestAnimationFrame(measure); });
    observer.observe(host); measure();
    onCleanup(() => { observer.disconnect(); cancelAnimationFrame(pending); });
  });
  const point = (event: PointerEvent, clamp = false) => imagePointFromClient(props, svg.getBoundingClientRect(), { x: event.clientX, y: event.clientY }, clamp);
  const editable = () => Boolean(props.onChange) && !props.disabled && !props.panning;
  const move = (event: PointerEvent) => {
    if (pan?.id === event.pointerId) {
      host.scrollLeft = pan.left + pan.x - event.clientX;
      host.scrollTop = pan.top + pan.y - event.clientY;
      return;
    }
    const current = gesture;
    if (!current || current.id !== event.pointerId || current.src !== props.src || !editable()) return;
    const end = point(event, true); if (!end) return;
    const original = current.original;
    if (original && current.corner === undefined) {
      const width = original.kind === 'rectangle' ? original.width : 0;
      const height = original.kind === 'rectangle' ? original.height : 0;
      setDraft({ ...original, x: Math.max(0, Math.min(props.width - width, original.x + end.x - current.start.x)), y: Math.max(0, Math.min(props.height - height, original.y + end.y - current.start.y)) });
    } else {
      const start = original?.kind === 'rectangle' && current.corner !== undefined
        ? { x: original.x + (current.corner % 2 ? 0 : original.width), y: original.y + (current.corner < 2 ? original.height : 0) } : current.start;
      const width = Math.abs(end.x - start.x), height = Math.abs(end.y - start.y);
      if (Math.hypot(event.clientX - current.client.x, event.clientY - current.client.y) < 5 && !original) setDraft({ kind: 'point', ...start });
      else if (width > 0 && height > 0) setDraft({ kind: 'rectangle', x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width, height });
    }
  };
  const finish = (event: PointerEvent, cancelled = false) => {
    if (pan?.id === event.pointerId) {
      pan = undefined;
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      return;
    }
    const current = gesture; if (!current || current.id !== event.pointerId) return;
    if (!cancelled) move(event);
    const annotation = draft(); gesture = undefined; setDraft(undefined);
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    if (!cancelled && current.src === props.src && editable() && annotation && validateImageAnnotation(props, annotation)) props.onChange?.(annotation);
  };
  const corners = () => { const value = shown(); return value?.kind === 'rectangle' ? [
    { x: value.x, y: value.y }, { x: value.x + value.width, y: value.y },
    { x: value.x, y: value.y + value.height }, { x: value.x + value.width, y: value.y + value.height },
  ] : []; };
  return <div ref={host} class={props.class} data-floe-image-annotation style={{ width: '100%', height: '100%', overflow: 'auto', 'scrollbar-gutter': 'stable', 'overscroll-behavior': 'contain' }}>
    <div style={{ width: `${Math.max(size().width, props.width * scale())}px`, height: `${Math.max(size().height, props.height * scale())}px`, display: 'grid', 'place-items': 'center' }}>
      <svg ref={svg} xmlns="http://www.w3.org/2000/svg" width={props.width * scale()} height={props.height * scale()} viewBox={`0 0 ${props.width} ${props.height}`}
        role="img" aria-label={props.label} tabindex={editable() ? 0 : undefined}
        style={{ display: 'block', 'touch-action': editable() || props.panning ? 'none' : 'auto', 'user-select': 'none', cursor: props.panning ? 'grab' : editable() ? 'crosshair' : 'default', flex: 'none' }}
        onPointerDown={event => {
          if (props.panning && event.button === 0 && !pan) {
            pan = { id: event.pointerId, x: event.clientX, y: event.clientY, left: host.scrollLeft, top: host.scrollTop };
            svg.setPointerCapture(event.pointerId); event.preventDefault(); return;
          }
          if (!editable() || event.button !== 0 || gesture) return;
          const start = point(event); if (!start) return;
          const target = event.target as Element;
          const corner = target.getAttribute('data-corner');
          gesture = { id: event.pointerId, start, client: { x: event.clientX, y: event.clientY }, src: props.src,
            ...(target.closest('[data-annotation-target]') ? { original: props.annotation } : {}), ...(corner !== null ? { corner: Number(corner) } : {}) };
          setDraft(gesture.original ?? { kind: 'point', ...start });
          svg.setPointerCapture(event.pointerId); svg.focus({ preventScroll: true }); event.preventDefault();
        }} onPointerMove={move} onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)} onLostPointerCapture={event => finish(event, true)}
        onKeyDown={event => {
          if (!editable()) return;
          if (event.key === 'Escape') { gesture = undefined; setDraft(undefined); return; }
          const delta = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>)[event.key];
          if (!delta && event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          const original = props.annotation ?? { kind: 'point' as const, x: props.width / 2, y: props.height / 2 };
          const step = event.shiftKey ? 10 : 1;
          props.onChange?.({ ...original, x: Math.max(0, Math.min(props.width - (original.kind === 'rectangle' ? original.width : 0), original.x + (delta?.[0] ?? 0) * step)), y: Math.max(0, Math.min(props.height - (original.kind === 'rectangle' ? original.height : 0), original.y + (delta?.[1] ?? 0) * step)) });
        }}>
        <image href={props.src} width={props.width} height={props.height} />
        {/* Only validated numeric geometry and fixed markup enter this overlay. */}
        {/* eslint-disable-next-line solid/no-innerhtml */}
        <g data-annotation-target innerHTML={markup()} />
        <Show when={editable() && props.showAnnotation !== false}>
          <For each={corners()}>{(corner, index) => <rect data-annotation-target data-corner={index()} x={corner.x - 5 / scale()} y={corner.y - 5 / scale()} width={10 / scale()} height={10 / scale()} fill="white" stroke="#111827" stroke-width={1 / scale()} style={{ cursor: index() === 0 || index() === 3 ? 'nwse-resize' : 'nesw-resize' }} />}</For>
        </Show>
      </svg>
    </div>
  </div>;
}
