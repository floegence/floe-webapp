import { createMemo, createSignal, onCleanup, Show, type Component, type JSX } from 'solid-js';
import { Check, Code, Copy, ExternalLink, Eye, FolderOpen, Maximize, Minus, MoreHorizontal, Refresh } from '../../icons';
import { Dropdown, type DropdownItem } from '../../ui/Dropdown';
import type { MarkdownMediaLabels, ResolvedMarkdownMedia } from './MarkdownMedia';

export interface HtmlPreviewCanvasProps {
  state: 'loading' | 'generating' | 'incomplete' | 'ready' | 'error';
  html: string;
  labels: MarkdownMediaLabels;
  expanded: boolean;
  onExpand: () => void;
  onRetry: () => void;
  onPreview: () => void;
  previewLabel: string;
  resource?: ResolvedMarkdownMedia;
  children: JSX.Element;
}

/** One bounded surface owns generation, source inspection, and the isolated preview. */
export const HtmlPreviewCanvas: Component<HtmlPreviewCanvasProps> = (props) => {
  const [sourceVisible, setSourceVisible] = createSignal(false);
  const [feedback, setFeedback] = createSignal('');
  let source!: HTMLPreElement;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const notify = (message: string) => {
    clearTimeout(timer);
    setFeedback(message);
    timer = setTimeout(() => setFeedback(''), 2400);
  };
  onCleanup(() => { disposed = true; clearTimeout(timer); });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.html);
      if (disposed) return;
      notify(props.labels.copied ?? 'Copied');
    } catch {
      if (disposed) return;
      const message = props.labels.copyFailed ?? 'Select and copy the source.';
      setSourceVisible(true);
      queueMicrotask(() => {
        if (disposed) return;
        source.focus({ preventScroll: true });
        const range = document.createRange();
        range.selectNodeContents(source);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        notify(message);
      });
    }
  };
  const items = createMemo<DropdownItem[]>(() => [
    { id: 'copy', label: props.labels.copyHTML ?? 'Copy HTML', icon: () => <Copy />, disabled: !props.html },
    ...(props.state === 'ready' ? [
      { id: 'preview', label: props.previewLabel, icon: () => <Eye /> },
      { id: 'replay', label: props.labels.replay ?? 'Reload preview', icon: () => <Refresh /> },
    ] : []),
    ...(props.resource?.openURL && !props.resource.reveal ? [{ id: 'open', label: props.labels.open, icon: () => <ExternalLink /> }] : []),
    ...(props.resource?.reveal ? [{ id: 'reveal', label: props.resource.reveal.label, icon: () => <FolderOpen /> }] : []),
  ]);
  const statusLabel = () => props.state === 'generating' ? props.labels.generating ?? props.labels.loading
    : props.state === 'incomplete' ? props.labels.incomplete ?? 'Generation interrupted. Source is available.'
    : props.state === 'error' ? props.labels.unavailable : props.labels.loading;
  return <span class="chat-html-canvas" data-state={props.state} data-view={sourceVisible() ? 'source' : 'preview'} aria-busy={props.state === 'generating' || props.state === 'loading'}
    onKeyDown={event => { if (event.key === 'Escape' && props.expanded && !event.defaultPrevented) { event.preventDefault(); props.onExpand(); } }}>
    <span class="chat-html-dots" aria-hidden="true" />
    <span class="chat-html-sheen" aria-hidden="true" />
    <span class="chat-html-sheet" classList={{ 'chat-html-sheet-hidden': sourceVisible() || props.state !== 'ready' }} inert={sourceVisible() || props.state !== 'ready'}>{props.children}</span>
    <Show when={sourceVisible()}><pre ref={source} class="chat-html-source" tabIndex={0} aria-label={props.labels.showSource ?? 'HTML source'}><code>{props.html}</code></pre></Show>
    <Show when={!sourceVisible() && props.state !== 'ready'}>
      <span class="chat-html-loading" role="status">
        <span data-floe-progress-shimmer={props.state === 'loading' || props.state === 'generating' ? 'text' : undefined}>{statusLabel()}</span>
        <Show when={props.state === 'error'}><button type="button" class="chat-media-retry" onClick={() => props.onRetry()}><Refresh />{props.labels.retry}</button></Show>
      </span>
    </Show>
    <button type="button" class="chat-html-orb chat-html-expand" data-chat-media-action={props.expanded ? 'collapse' : 'expand'}
      aria-expanded={props.expanded} aria-label={props.expanded ? props.labels.collapse : props.labels.expand} title={props.expanded ? props.labels.collapse : props.labels.expand} onClick={() => props.onExpand()}>
      <Show when={props.expanded} fallback={<Maximize />}><Minus /></Show>
    </button>
    <span class="chat-html-controls">
      <button type="button" class="chat-html-orb" data-chat-media-action="source" aria-pressed={sourceVisible()}
        aria-label={sourceVisible() ? props.labels.showPreview ?? 'Show preview' : props.labels.showSource ?? 'Show HTML source'} title={sourceVisible() ? props.labels.showPreview ?? 'Show preview' : props.labels.showSource ?? 'Show HTML source'} onClick={() => setSourceVisible(value => !value)}>
        <Show when={sourceVisible()} fallback={<Code />}><Eye /></Show>
      </button>
      <Dropdown trigger={<MoreHorizontal />} triggerClass="chat-html-orb" triggerAriaLabel={props.labels.more ?? 'More actions'} items={items} align="start"
        onSelect={id => { if (id === 'copy') void copy(); else if (id === 'preview') props.onPreview(); else if (id === 'replay') props.onRetry(); else if (id === 'reveal') props.resource?.reveal?.onSelect(); else if (id === 'open' && props.resource?.openURL) window.open(props.resource.openURL, '_blank', 'noopener,noreferrer'); }} />
    </span>
    <Show when={feedback()}><span class="chat-html-feedback" role="status"><Check />{feedback()}</span></Show>
  </span>;
};
