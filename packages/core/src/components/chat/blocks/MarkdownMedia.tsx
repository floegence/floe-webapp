import { createEffect, createMemo, createSignal, Match, onCleanup, onMount, Show, Switch, type Component } from 'solid-js';
import { FloatingWindow } from '../../ui/FloatingWindow';
import { ExternalLink, Eye, FolderOpen, Maximize, Refresh } from '../../icons';
import { cn } from '../../../utils/cn';
import { safeMarkdownMediaURL, sandboxedMarkdownHtml, type MarkdownMediaSource } from '../markdown/media';

export interface MarkdownMediaLabels {
  image: string;
  /** Label for opening an image in its preview window. */
  previewImage?: string;
  video: string;
  audio: string;
  html: string;
  loading: string;
  unavailable: string;
  retry: string;
  expand: string;
  collapse: string;
  open: string;
  close: string;
}

export interface ResolvedMarkdownMedia {
  /** Host-authorized media URL; HTML uses loadHTML instead. */
  src?: string;
  /** Optional host-authorized source link. */
  openURL?: string;
  loadHTML?: (signal: AbortSignal) => Promise<string>;
  /** Open the image in the host's existing preview surface. */
  preview?: { label: string; onSelect: () => void };
  /** Reveal the authorized file in its containing folder. Omit for non-file resources. */
  reveal?: { label: string; onSelect: () => void };
}

export interface MarkdownMediaProps {
  source: MarkdownMediaSource;
  labels: MarkdownMediaLabels;
  resolve?: (source: MarkdownMediaSource, signal: AbortSignal) => Promise<ResolvedMarkdownMedia>;
  class?: string;
}

async function resolveRemote(source: MarkdownMediaSource): Promise<ResolvedMarkdownMedia> {
  const src = safeMarkdownMediaURL(source.src ?? '');
  if (!src || source.kind === 'html') throw new Error('A host resolver is required');
  return { src, openURL: src };
}

/** Stable inline media with host-owned resource resolution and an isolated HTML document. */
export const MarkdownMedia: Component<MarkdownMediaProps> = (props) => {
  let root!: HTMLSpanElement;
  let previewTrigger: HTMLElement | undefined;
  const [visible, setVisible] = createSignal(false);
  onMount(() => {
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '400px' });
    observer.observe(root);
    onCleanup(() => observer.disconnect());
  });
  const [resource, setResource] = createSignal<ResolvedMarkdownMedia>();
  const [document, setDocument] = createSignal<string>();
  const [status, setStatus] = createSignal<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = createSignal(0);
  const [expanded, setExpanded] = createSignal(false);
  const title = () => props.source.title || props.labels[props.source.kind];
  const source = createMemo(() => props.source);
  const previewLabel = () => resource()?.preview?.label || props.labels.previewImage || props.labels.expand;
  const previewImage = (event: MouseEvent) => {
    previewTrigger = event.currentTarget as HTMLElement;
    const action = resource()?.preview;
    if (action) action.onSelect();
    else setExpanded(true);
  };

  createEffect(() => {
    if (!visible()) return;
    const request = source();
    const resolver = props.resolve ?? resolveRemote;
    retry();
    const controller = new AbortController();
    onCleanup(() => controller.abort());
    setResource(undefined);
    setDocument(undefined);
    setStatus('loading');
    setExpanded(false);
    void (async () => {
      if (request.kind === 'html' && request.html !== undefined) {
        if (request.html.length > 1_000_000) throw new Error('HTML preview is too large');
        if (!controller.signal.aborted) setDocument(sandboxedMarkdownHtml(request.html));
      } else {
        const resolved = await resolver(request, controller.signal);
        if (controller.signal.aborted) return;
        if (request.kind === 'html') {
          if (!resolved.loadHTML) throw new Error('HTML loader is required');
          const html = await resolved.loadHTML(controller.signal);
          if (controller.signal.aborted) return;
          if (html.length > 1_000_000) throw new Error('HTML preview is too large');
          setDocument(sandboxedMarkdownHtml(html));
        } else if (!resolved.src) throw new Error('Media URL is required');
        setResource(resolved);
      }
      if (!controller.signal.aborted) setStatus('ready');
    })().catch(() => { if (!controller.signal.aborted) setStatus('error'); });
  });

  return (
    <span ref={root} class={cn('chat-media', expanded() && props.source.kind === 'html' && 'chat-media-expanded', props.class)} data-media-kind={props.source.kind}>
      <Switch>
        <Match when={status() === 'loading'}><span class="chat-media-placeholder" role="status">{props.labels.loading}</span></Match>
        <Match when={status() === 'error'}><span class="chat-media-placeholder" role="status"><span>{props.labels.unavailable}</span><button type="button" class="chat-media-retry" onClick={() => setRetry(value => value + 1)}><Refresh />{props.labels.retry}</button></span></Match>
        <Match when={status() === 'ready'}>
          <Switch>
            <Match when={props.source.kind === 'image'}>
              <button type="button" class="chat-media-image-button" aria-label={`${previewLabel()}: ${title()}`} onClick={previewImage}><img class="chat-media-image" src={resource()?.src} alt={title()} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setStatus('error')} /></button>
            </Match>
            <Match when={props.source.kind === 'video'}><video class="chat-media-video" src={resource()?.src} controls playsinline preload="metadata" aria-label={title()} onError={() => setStatus('error')} /></Match>
            <Match when={props.source.kind === 'audio'}><audio class="chat-media-audio" src={resource()?.src} controls preload="metadata" aria-label={title()} onError={() => setStatus('error')} /></Match>
            <Match when={props.source.kind === 'html'}><iframe class="chat-media-html" title={title()} srcdoc={document()} sandbox="allow-scripts" referrerPolicy="no-referrer" /></Match>
          </Switch>
        </Match>
      </Switch>
      <span class="chat-media-header">
        <span class="chat-media-heading"><span class="chat-media-kind">{props.labels[props.source.kind]}</span><span class="chat-media-title" title={title()}>{title()}</span></span>
        <span class="chat-media-actions">
          <Show when={status() === 'ready' && resource()?.reveal}>{action => (
            <button type="button" class="chat-media-action" aria-label={action().label} title={action().label} onClick={() => action().onSelect()}><FolderOpen /></button>
          )}</Show>
          <Show when={status() === 'ready' && props.source.kind === 'image'}>
            <button type="button" class="chat-media-action" aria-label={previewLabel()} title={previewLabel()} onClick={previewImage}><Eye /></button>
          </Show>
          <Show when={status() === 'ready' && props.source.kind === 'html'}>
            <button type="button" class="chat-media-action" aria-label={expanded() ? props.labels.collapse : props.labels.expand} title={expanded() ? props.labels.collapse : props.labels.expand} aria-expanded={expanded()} onClick={() => setExpanded(!expanded())}><Maximize /></button>
          </Show>
          <Show when={props.source.kind !== 'image' && !resource()?.reveal && resource()?.openURL}>{url => <a class="chat-media-action" href={url()} target="_blank" rel="noopener noreferrer" aria-label={props.labels.open} title={props.labels.open}><ExternalLink /></a>}</Show>
        </span>
      </span>
      <Show when={props.source.kind === 'image'}>
        <FloatingWindow open={expanded()} onOpenChange={open => { setExpanded(open); if (!open) previewTrigger?.focus({ preventScroll: true }); }} title={title()}
          labels={{ close: props.labels.close, maximize: props.labels.expand, restore: props.labels.collapse }}
          defaultSize={{ width: 960, height: 680 }} minSize={{ width: 280, height: 240 }} compactBelow={640}
          class="chat-media-preview-window">
          <div class="chat-media-preview-content" ref={element => queueMicrotask(() => element.closest<HTMLElement>('[role="dialog"]')?.focus({ preventScroll: true }))}><img src={resource()?.src} alt={title()} referrerPolicy="no-referrer" class="chat-media-full-image" /></div>
        </FloatingWindow>
      </Show>
    </span>
  );
};
