import { createEffect, createMemo, createSignal, on, onCleanup, onMount, Show, type Component } from 'solid-js';
import { Dialog } from '../components/ui/Dialog';
import { renderDiagram, sanitizeDiagramSvg, type DiagramRenderOptions, type DiagramRenderResult } from './render';

export interface DiagramLabels {
  diagram: string; loading: string; unavailable: string; retry: string;
  source: string; preview: string; copy: string; copied: string; copyFailed: string;
  expand: string; close: string; zoomIn: string; zoomOut: string; fit: string;
}
export const diagramLabelsEnUS: DiagramLabels = {
  diagram: 'Diagram', loading: 'Rendering diagram…', unavailable: 'Diagram unavailable', retry: 'Retry',
  source: 'Source', preview: 'Preview', copy: 'Copy source', copied: 'Copied', copyFailed: 'Could not copy',
  expand: 'Expand diagram', close: 'Close', zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'Fit',
};
export interface DiagramProps {
  source: string;
  labels: DiagramLabels;
  class?: string;
  onCopy?: (source: string) => Promise<void>;
  onOpenLink?: (href: string) => void | Promise<void>;
  /** Explicit renderer injection for existing hosts; never an error fallback. */
  render?: (source: string, options: DiagramRenderOptions) => Promise<DiagramRenderResult>;
}

const DiagramView: Component<DiagramProps & { expanded?: boolean; scale?: number; revision: number; onStatus?: (status: 'loading' | 'ready' | 'error') => void }> = props => {
  let root!: HTMLDivElement;
  const [visible, setVisible] = createSignal(false);
  const [width, setWidth] = createSignal(0);
  const [fontRevision, setFontRevision] = createSignal(0);
  const [status, setStatus] = createSignal<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = createSignal('');
  const source = createMemo(() => props.source);
  createEffect(() => props.onStatus?.(status()));
  onMount(() => {
    const resize = new ResizeObserver(entries => {
      const next = Math.round(entries[0]?.contentRect.width ?? root.clientWidth);
      if (next > 0) setWidth(next);
    });
    resize.observe(root);
    const visibility = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); visibility.disconnect(); }
    }, { rootMargin: '200px' });
    visibility.observe(root);
    const fonts = root.ownerDocument.fonts;
    const loaded = () => setFontRevision(n => n + 1);
    fonts?.addEventListener('loadingdone', loaded);
    onCleanup(() => { resize.disconnect(); visibility.disconnect(); fonts?.removeEventListener('loadingdone', loaded); });
  });
  createEffect(on([source, width, visible, fontRevision, () => props.revision], ([text, available, shown]) => {
    if (!shown || !available) return;
    const controller = new AbortController();
    const doc = root.ownerDocument;
    const style = getComputedStyle(root);
    setStatus('loading');
    setError('');
    const apply = (result: DiagramRenderResult) => {
      if (controller.signal.aborted || !root.isConnected) return;
      const selected = doc.getSelection();
      for (let i = 0; selected && i < selected.rangeCount; i++) {
        if (selected.getRangeAt(i).intersectsNode(root)) {
          const retry = () => { doc.removeEventListener('selectionchange', retry); apply(result); };
          doc.addEventListener('selectionchange', retry, { once: true, signal: controller.signal });
          return;
        }
      }
      // renderDiagram already sanitizes; explicit renderer injection crosses the
      // same final sanitizer through the legacy renderer adapter.
      const template = doc.createElement('template');
      template.innerHTML = sanitizeDiagramSvg(result.svg, doc);
      const svg = template.content.querySelector('svg');
      if (svg && props.expanded) svg.style.maxWidth = 'none';
      root.replaceChildren(template.content);
      setStatus('ready');
    };
    void (props.render ?? renderDiagram)(text, {
      signal: controller.signal, maxWidth: available, document: doc,
      fontFamily: style.fontFamily, fontFamilyMono: style.getPropertyValue('--font-mono').trim() || 'monospace',
      fontSize: parseFloat(style.fontSize) || 16, links: !!props.onOpenLink,
    }).then(apply).catch((failure: unknown) => {
      if (controller.signal.aborted) return;
      root.replaceChildren();
      setError(failure instanceof Error ? failure.message : String(failure));
      setStatus('error');
    });
    onCleanup(() => controller.abort());
  }));
  const openLink = (event: MouseEvent) => {
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (!link) return;
    event.preventDefault();
    const href = link.getAttribute('href');
    if (!href || !/^(?:https?:\/\/|mailto:)/i.test(href) || !props.onOpenLink) return;
    void Promise.resolve(props.onOpenLink(href)).catch(() => { setError(props.labels.unavailable); setStatus('error'); });
  };
  return <>
    <div class="floe-diagram-viewport" data-floe-local-interaction-surface={props.expanded ? 'true' : undefined}
      data-floe-workbench-text-selection-surface="true" style={{ overflow: props.expanded ? 'auto' : 'hidden' }}>
      <div ref={root} class="floe-diagram-svg" classList={{ 'floe-diagram-zoomed': props.expanded }} onClick={openLink} aria-busy={status() === 'loading'}
        style={{ '--floe-diagram-scale': props.scale ?? 1 }} />
    </div>
    <Show when={status() === 'loading'}><div class="floe-diagram-status" role="status">{props.labels.loading}</div></Show>
    <Show when={status() === 'error'}><div class="floe-diagram-error" role="alert">
      <strong>{props.labels.unavailable}</strong><pre>{error()}</pre><pre><code>{props.source}</code></pre>
    </div></Show>
  </>;
};

/** Shared diagram controls. The host owns source identity, localization and navigation. */
export const Diagram: Component<DiagramProps> = props => {
  const [showSource, setShowSource] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);
  const [scale, setScale] = createSignal(1);
  const [revision, setRevision] = createSignal(0);
  const [status, setStatus] = createSignal<'loading' | 'ready' | 'error'>('loading');
  const [copyState, setCopyState] = createSignal<'idle' | 'copied' | 'error'>('idle');
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let expandTrigger: HTMLButtonElement | undefined;
  onCleanup(() => { disposed = true; clearTimeout(copyTimer); });
  const copy = async () => {
    try { await (props.onCopy ? props.onCopy(props.source) : navigator.clipboard.writeText(props.source)); if (!disposed) setCopyState('copied'); }
    catch { if (!disposed) setCopyState('error'); }
    if (!disposed) { clearTimeout(copyTimer); copyTimer = setTimeout(() => setCopyState('idle'), 1600); }
  };
  const close = (open: boolean) => {
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const restore = active instanceof Element && !!active.closest('[role="dialog"]');
    setExpanded(open);
    if (!open && restore && expandTrigger?.isConnected) expandTrigger.focus({ preventScroll: true });
  };
  return <section class={'floe-diagram ' + (props.class ?? '')}>
    <div class="floe-diagram-toolbar">
      <button type="button" onClick={() => setShowSource(value => !value)} aria-pressed={showSource()}>{showSource() ? props.labels.preview : props.labels.source}</button>
      <button type="button" onClick={() => void copy()}>{props.labels.copy}</button>
      <span class="floe-diagram-feedback" role="status">{copyState() === 'copied' ? props.labels.copied : copyState() === 'error' ? props.labels.copyFailed : ''}</span>
      <Show when={status() === 'error'}><button type="button" onClick={() => setRevision(n => n + 1)}>{props.labels.retry}</button></Show>
      <button ref={expandTrigger} type="button" disabled={status() !== 'ready'} onClick={() => { setScale(1); setExpanded(true); }} aria-label={props.labels.expand}>⤢</button>
    </div>
    <div hidden={showSource()}><DiagramView {...props} revision={revision()} onStatus={setStatus} /></div>
    <Show when={showSource()}><pre class="floe-diagram-source" data-floe-workbench-text-selection-surface="true"><code>{props.source}</code></pre></Show>
    <Dialog open={expanded()} onOpenChange={close} title={props.labels.diagram} closeLabel={props.labels.close} class="floe-diagram-dialog">
      <div class="floe-diagram" onKeyDown={event => {
        if (event.target instanceof Element && event.target.closest('button,input,textarea')) return;
        if (event.key === '+' || event.key === '=') { event.preventDefault(); setScale(n => Math.min(4, n + .25)); }
        if (event.key === '-') { event.preventDefault(); setScale(n => Math.max(.5, n - .25)); }
        if (event.key === '0') { event.preventDefault(); setScale(1); }
      }}>
        <div class="floe-diagram-toolbar">
          <button type="button" onClick={() => setScale(n => Math.max(.5, n - .25))} aria-label={props.labels.zoomOut}>−</button>
          <button type="button" onClick={() => setScale(1)}>{props.labels.fit}</button>
          <button type="button" onClick={() => setScale(n => Math.min(4, n + .25))} aria-label={props.labels.zoomIn}>+</button>
        </div>
        <Show when={expanded()}><DiagramView {...props} expanded scale={scale()} revision={revision()} /></Show>
      </div>
    </Dialog>
  </section>;
};
