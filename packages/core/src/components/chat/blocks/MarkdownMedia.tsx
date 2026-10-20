import { createEffect, createMemo, createSignal, Match, on, onCleanup, onMount, Show, Switch, type Component } from 'solid-js';
import { HtmlPreviewCanvas } from './HtmlPreviewCanvas';
import { FloatingWindow } from '../../ui/FloatingWindow';
import { ExternalLink, Eye, FolderOpen, Refresh } from '../../icons';
import { cn } from '../../../utils/cn';
import { safeMarkdownMediaURL, type MarkdownMediaSource } from '../markdown/media';
import { SandboxedHtmlFrame } from '../../html-preview/SandboxedHtmlFrame';

export interface MarkdownMediaLabels {
  generating?: string;
  incomplete?: string;
  showSource?: string;
  showPreview?: string;
  more?: string;
  copyHTML?: string;
  copied?: string;
  copyFailed?: string;
  replay?: string;
  image: string;
  /** Label for opening an image in its preview window. */
  previewImage?: string;
  video: string;
  audio: string;
  html: string;
  /** Label for opening an HTML file in the host's file preview surface. */
  previewHTML?: string;
  /** Label for an independent floating preview of inline HTML. */
  previewHTMLWindow?: string;
  linkUnavailable?: string;
  anchorUnavailable?: string;
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
  /** Open the media in the host's existing preview surface. */
  preview?: { label: string; onSelect: () => void };
  /** Reveal the authorized file in its containing folder. Omit for non-file resources. */
  reveal?: { label: string; onSelect: () => void };
}

export interface MarkdownMediaProps {
  source: MarkdownMediaSource;
  /** Partial HTML remains inspectable but never executes before a closed fence. */
  htmlState?: 'generating' | 'incomplete';
  labels: MarkdownMediaLabels;
  /** Replace this callback when its authorization or resource context changes. Reads inside it do not trigger reloads. */
  resolve?: (source: MarkdownMediaSource, signal: AbortSignal) => Promise<ResolvedMarkdownMedia>;
  /** Positive finite deadline shared by resolution and HTML loading. Omit for no deadline. */
  loadTimeoutMs?: number;
  /** Resolve and authorize a user-activated HTML link using the source's host context. */
  onOpenLink?: (source: MarkdownMediaSource, href: string, signal: AbortSignal) => void | Promise<void>;
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
  let previewContent: HTMLElement | undefined;
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
  const [htmlPreviewOpen, setHtmlPreviewOpen] = createSignal(false);
  const title = () => props.source.title || props.labels[props.source.kind];
  const source = createMemo(() => props.source, undefined, {
    equals: (previous, next) => previous.kind === next.kind && previous.src === next.src
      && previous.html === next.html && previous.title === next.title,
  });
  let failRequest = () => {};
  const closePreview = (setOpen: (open: boolean) => void) => {
    const active = root.ownerDocument.activeElement;
    const restoreFocus = active instanceof Element && previewContent?.closest('[role=dialog]')?.contains(active)
      && previewTrigger?.isConnected;
    setOpen(false);
    if (restoreFocus) previewTrigger?.focus({ preventScroll: true });
  };
  const focusPreview = (element: HTMLElement) => {
    previewContent = element;
    queueMicrotask(() => {
      if (element.isConnected && root.ownerDocument.activeElement === previewTrigger) {
        element.closest<HTMLElement>('[role="dialog"]')?.focus({ preventScroll: true });
      }
    });
  };
  const previewLabel = () => resource()?.preview?.label
    || (props.source.kind === 'image' ? props.labels.previewImage
      : props.labels.previewHTMLWindow ?? 'Open preview window')
    || props.labels.open;
  const previewImage = (event: MouseEvent) => {
    previewTrigger = event.currentTarget as HTMLElement;
    const action = resource()?.preview;
    if (action) action.onSelect();
    else setExpanded(true);
  };
  const previewHTML = (event?: MouseEvent) => {
    previewTrigger = event?.currentTarget as HTMLElement | undefined ?? root.querySelector<HTMLElement>('[aria-haspopup="menu"]') ?? undefined;
    const action = resource()?.preview;
    if (action) action.onSelect();
    else setHtmlPreviewOpen(true);
  };
  const openHtmlLink = () => {
    const handler = props.onOpenLink;
    const request = source();
    return handler ? (href: string, signal: AbortSignal) => handler(request, href, signal) : undefined;
  };
  const htmlLabels = () => ({
    linkUnavailable: props.labels.linkUnavailable ?? 'Opening links is unavailable in this preview.',
    anchorUnavailable: props.labels.anchorUnavailable ?? 'The linked section was not found.',
  });

  createEffect(on([visible, source, () => props.resolve, retry, () => props.htmlState, () => props.loadTimeoutMs], ([isVisible, request, resolve, , , timeout]) => {
    if (!isVisible) return;
    const resolver = resolve ?? resolveRemote;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clearTimer = () => { if (timer !== undefined) { clearTimeout(timer); timer = undefined; } };
    onCleanup(() => { clearTimer(); controller.abort(); });
    failRequest = () => {
      if (controller.signal.aborted) return;
      clearTimer();
      setStatus('error');
      setExpanded(false);
      setHtmlPreviewOpen(false);
      setResource(undefined);
      setDocument(undefined);
      controller.abort();
    };
    const fail = failRequest;
    setResource(undefined);
    setDocument(undefined);
    setStatus('loading');
    setHtmlPreviewOpen(false);
    if (request.kind !== 'html') setExpanded(false);
    if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) { fail(); return; }
    if (request.kind === 'html' && props.htmlState) { setDocument(request.html); return; }
    if (timeout !== undefined) timer = setTimeout(fail, timeout);
    void (async () => {
      if (request.kind === 'html' && request.html !== undefined) {
        if (request.html.length > 1_000_000) throw new Error('HTML preview is too large');
        if (!controller.signal.aborted) setDocument(request.html);
      } else {
        const resolved = await resolver(request, controller.signal);
        if (controller.signal.aborted) return;
        if (request.kind === 'html') {
          if (!resolved.loadHTML) throw new Error('HTML loader is required');
          const html = await resolved.loadHTML(controller.signal);
          if (controller.signal.aborted) return;
          if (html.length > 1_000_000) throw new Error('HTML preview is too large');
          setDocument(html);
        } else if (!resolved.src) throw new Error('Media URL is required');
        setResource(resolved);
      }
      if (!controller.signal.aborted) setStatus('ready');
    })().catch(fail).finally(clearTimer);
  }));

  return (
    <span ref={root} class={cn('chat-media', expanded() && props.source.kind === 'html' && 'chat-media-expanded', props.class)} data-media-kind={props.source.kind}>
      <Show when={props.source.kind === 'html'} fallback={<>
      <span class="chat-media-viewport">
      <Switch>
        <Match when={status() === 'loading'}><span class="chat-media-placeholder" role="status">{props.labels.loading}</span></Match>
        <Match when={status() === 'error'}><span class="chat-media-placeholder" role="status"><span>{props.labels.unavailable}</span><button type="button" class="chat-media-retry" onClick={() => setRetry(value => value + 1)}><Refresh />{props.labels.retry}</button></span></Match>
        <Match when={status() === 'ready'}>
          <Switch>
            <Match when={props.source.kind === 'image'}>
              <button type="button" class="chat-media-image-button" aria-label={`${previewLabel()}: ${title()}`} onClick={previewImage}><img class="chat-media-image" src={resource()?.src} alt={title()} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => failRequest()} /></button>
            </Match>
            <Match when={props.source.kind === 'video'}><video class="chat-media-video" src={resource()?.src} controls playsinline preload="metadata" aria-label={title()} onError={() => failRequest()} /></Match>
            <Match when={props.source.kind === 'audio'}><audio class="chat-media-audio" src={resource()?.src} controls preload="metadata" aria-label={title()} onError={() => failRequest()} /></Match>
          </Switch>
        </Match>
      </Switch>
      </span>
      <span class="chat-media-header">
        <span class="chat-media-heading"><span class="chat-media-kind">{props.labels[props.source.kind]}</span><span class="chat-media-title" title={title()}>{title()}</span></span>
        <span class="chat-media-actions">
          <Show when={status() === 'ready' && resource()?.reveal}>{action => (
            <button type="button" class="chat-media-action" aria-label={action().label} title={action().label} onClick={() => action().onSelect()}><FolderOpen /></button>
          )}</Show>
          <Show when={status() === 'ready' && props.source.kind === 'image'}>
            <button type="button" class="chat-media-action" aria-label={previewLabel()} title={previewLabel()} onClick={previewImage}><Eye /></button>
          </Show>
          <Show when={status() === 'ready' && props.source.kind !== 'image' && resource()?.preview}>
            <button type="button" class="chat-media-action" data-chat-media-action="preview" aria-label={previewLabel()} title={previewLabel()} onClick={previewHTML}><Eye /></button>
          </Show>
          <Show when={props.source.kind !== 'image' && !resource()?.reveal && resource()?.openURL}>{url => <a class="chat-media-action" href={url()} target="_blank" rel="noopener noreferrer" aria-label={props.labels.open} title={props.labels.open}><ExternalLink /></a>}</Show>
        </span>
      </span>
      </>}>
        <HtmlPreviewCanvas state={props.htmlState ?? status()} html={document() ?? props.source.html ?? ''} labels={props.labels} expanded={expanded()}
          onExpand={() => setExpanded(value => !value)} onRetry={() => setRetry(value => value + 1)} onPreview={() => previewHTML()} previewLabel={previewLabel()} resource={resource()}>
          <Show when={status() === 'ready' && !props.htmlState}><SandboxedHtmlFrame class="chat-media-html" title={title()} html={document() ?? ''} labels={htmlLabels()} onOpenLink={openHtmlLink()} /></Show>
        </HtmlPreviewCanvas>
      </Show>
      <Show when={props.source.kind === 'image'}>
        <FloatingWindow open={expanded()} onOpenChange={open => open ? setExpanded(true) : closePreview(setExpanded)} title={title()}
          labels={{ close: props.labels.close, maximize: props.labels.expand, restore: props.labels.collapse }}
          defaultSize={{ width: 960, height: 680 }} minSize={{ width: 280, height: 240 }} compactBelow={640}
          class="chat-media-preview-window">
          <div class="chat-media-preview-content" ref={focusPreview}><img src={resource()?.src} alt={title()} referrerPolicy="no-referrer" class="chat-media-full-image" /></div>
        </FloatingWindow>
      </Show>
      <Show when={props.source.kind === 'html'}>
        <FloatingWindow open={htmlPreviewOpen()} onOpenChange={open => open ? setHtmlPreviewOpen(true) : closePreview(setHtmlPreviewOpen)} title={title()}
          labels={{ close: props.labels.close, maximize: props.labels.expand, restore: props.labels.collapse }}
          defaultSize={{ width: 960, height: 680 }} minSize={{ width: 280, height: 240 }} compactBelow={640}
          class="chat-media-preview-window">
          <div class="chat-media-preview-content" ref={focusPreview}>
            <SandboxedHtmlFrame class="chat-media-html" title={title()} html={document() ?? ''} labels={htmlLabels()} onOpenLink={openHtmlLink()} />
          </div>
        </FloatingWindow>
      </Show>
    </span>
  );
};
