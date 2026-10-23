// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import type { MarkdownMediaSource } from '../src/components/chat/markdown/media';
import { MarkdownMedia } from '../src/components/chat/blocks/MarkdownMedia';

const labels = {
  image: 'Image',
  previewImage: 'Preview image',
  video: 'Video',
  audio: 'Audio',
  html: 'Interactive preview',
  previewHTML: 'Open file preview',
  loading: 'Loading preview',
  unavailable: 'Preview unavailable',
  retry: 'Retry',
  expand: 'Expand preview',
  collapse: 'Collapse preview',
  open: 'Open source',
  close: 'Close preview',
};

const disposers: Array<() => void> = [];

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn((media: string) => ({
    matches: false, media, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
});

afterEach(() => {
  while (disposers.length) disposers.pop()!();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('MarkdownMedia HTML controls', () => {
  it('bounds generating HTML without executing partial scripts and retains source view at completion', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const [source, setSource] = createSignal({ kind: 'html' as const, html: '<script>partial', title: 'Report' });
    const [htmlState, setHtmlState] = createSignal<'generating' | 'incomplete' | undefined>('generating');
    disposers.push(render(() => <MarkdownMedia source={source()} htmlState={htmlState()} labels={labels} />, host));
    await flush();
    expect(host.querySelector('.chat-html-canvas')?.getAttribute('data-state')).toBe('generating');
    expect(host.querySelector('iframe')).toBeNull();
    expect(host.querySelector<HTMLButtonElement>('[data-chat-media-action=preview]')?.disabled).toBe(true);
    expect(host.querySelector('.chat-html-skeleton')).toBeNull();
    expect(host.querySelector('[role=status] [data-floe-progress-shimmer=text]')?.textContent).toBe(labels.loading);
    host.querySelector<HTMLButtonElement>('[data-chat-media-action=source]')!.click();
    expect(host.querySelector('pre')?.textContent).toBe('<script>partial');
    setHtmlState('incomplete');
    await flush();
    expect(host.querySelector('.chat-html-canvas')?.getAttribute('data-state')).toBe('incomplete');
    expect(host.querySelector('iframe')).toBeNull();
    host.querySelector<HTMLButtonElement>('[data-chat-media-action=source]')!.click();
    expect(host.querySelector('[role=status]')?.textContent).toContain('Generation interrupted');
    expect(host.querySelector('[data-floe-progress-shimmer]')).toBeNull();
    host.querySelector<HTMLButtonElement>('[data-chat-media-action=source]')!.click();
    setSource({ kind: 'html', html: '<main>Complete</main>', title: 'Report' });
    setHtmlState(undefined);
    await flush();
    expect(host.querySelector('pre')?.textContent).toBe('<main>Complete</main>');
    expect(host.querySelector('[data-chat-media-action=source]')?.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('iframe')?.getAttribute('sandbox')).toBe('allow-scripts');
  });
  it.each(['button', 'menu'])('opens an inline HTML snapshot from the %s without replacing the inline frame', async (trigger) => {
    const host = document.createElement('div');
    document.body.append(host);
    disposers.push(render(() => <MarkdownMedia
      source={{ kind: 'html', html: '<main>Inline report</main>', title: 'Report' }}
      labels={labels}
    />, host));
    await flush();
    const frame = host.querySelector('iframe');
    if (trigger === 'menu') {
      host.querySelector<HTMLElement>('[aria-label="More actions"]')!.click();
      await flush();
    }
    const preview = trigger === 'button'
      ? host.querySelector<HTMLButtonElement>('[data-chat-media-action=preview]')
      : Array.from(document.querySelectorAll<HTMLElement>('[role=menuitem]')).find(item => item.textContent?.includes('Open preview window'));
    expect(preview).toBeTruthy();
    preview!.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    await flush();
    expect(document.querySelector('.chat-media-preview-window iframe')?.getAttribute('srcdoc')).toContain('Inline report');
    expect(host.querySelector('iframe')).toBe(frame);
    expect(host.querySelector('[data-chat-media-action="expand"]')).not.toBeNull();
  });

  it('exposes a host preview action and distinct expand/collapse controls', async () => {
    const openPreview = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    disposers.push(
      render(
        () => (
          <MarkdownMedia
            source={{ kind: 'html', src: '/workspace/demo.html', title: 'Demo' }}
            labels={labels}
            resolve={() => Promise.resolve({
              loadHTML: () => Promise.resolve('<main>Demo</main>'),
              preview: { label: labels.previewHTML, onSelect: openPreview },
            })}
          />
        ),
        host
      )
    );

    await flush();
    const preview = host.querySelector<HTMLButtonElement>('[data-chat-media-action=preview]');
    const expand = host.querySelector<HTMLButtonElement>('[data-chat-media-action="expand"]');
    expect(preview?.getAttribute('aria-label')).toBe(labels.previewHTML);
    expect(expand?.getAttribute('aria-label')).toBe(labels.expand);

    preview?.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(openPreview).toHaveBeenCalledOnce();

    expand?.click();
    const collapse = host.querySelector<HTMLButtonElement>('[data-chat-media-action="collapse"]');
    expect(collapse?.getAttribute('aria-label')).toBe(labels.collapse);
    expect(collapse?.querySelector('svg path')).not.toBeNull();
  });
});


describe('MarkdownMedia request lifecycle', () => {
  it('retains an equal complete source and invalidates every changed source field', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const initial: MarkdownMediaSource = { kind: 'image', src: '/one.png', title: 'One', html: 'metadata' };
    const [source, setSource] = createSignal(initial);
    const signals: AbortSignal[] = [];
    const resolve = vi.fn(async (_source: MarkdownMediaSource, signal: AbortSignal) => { signals.push(signal); return { src: '/resolved.png' }; });
    const [resolver, setResolver] = createSignal(resolve);
    disposers.push(render(() => <MarkdownMedia source={source()} labels={labels} resolve={resolver()} />, host));
    await flush();
    const image = host.querySelector('img');
    for (let index = 0; index < 300; index++) { setSource({ ...initial }); await flush(); }
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(host.querySelector('img')).toBe(image);
    for (const change of [{ title: 'Two' }, { html: 'changed' }, { src: '/two.png' }, { kind: 'video' as const }]) {
      setSource(previous => ({ ...previous, ...change }));
      await flush();
    }
    expect(resolve).toHaveBeenCalledTimes(5);
    setResolver(() => async (source, signal) => resolve(source, signal));
    await flush();
    expect(resolve).toHaveBeenCalledTimes(6);
    expect(signals.slice(0, -1).every(signal => signal.aborted)).toBe(true);
  });

  it.each([0, -1, NaN, Infinity])('rejects invalid timeout %s without invoking the resolver', async loadTimeoutMs => {
    const host = document.createElement('div');
    document.body.append(host);
    const resolve = vi.fn(async () => ({ src: '/resolved.png' }));
    disposers.push(render(() => <MarkdownMedia source={{ kind: 'image', src: '/one.png', title: 'One' }} labels={labels} resolve={resolve} loadTimeoutMs={loadTimeoutMs} />, host));
    await flush();
    expect(resolve).not.toHaveBeenCalled();
    expect(host.querySelector('.chat-media-retry')).not.toBeNull();
  });

  it('times out ignoring cancellation, retries once, and rejects late results', async () => {
    vi.useFakeTimers();
    try {
      const host = document.createElement('div');
      document.body.append(host);
      const requests: Array<{ signal: AbortSignal; accept: (value: { src: string }) => void }> = [];
      const resolve = (_source: MarkdownMediaSource, signal: AbortSignal) => new Promise<{ src: string }>(accept => requests.push({ signal, accept }));
      const dispose = render(() => <MarkdownMedia source={{ kind: 'image', src: '/one.png', title: 'One' }} labels={labels} resolve={resolve} loadTimeoutMs={100} />, host);
      disposers.push(dispose);
      await flush();
      await vi.advanceTimersByTimeAsync(100);
      expect(requests[0].signal.aborted).toBe(true);
      expect(host.querySelector('.chat-media-retry')).not.toBeNull();
      host.querySelector<HTMLButtonElement>('.chat-media-retry')!.click();
      await flush();
      expect(requests).toHaveLength(2);
      requests[1].accept({ src: '/current.png' });
      await flush();
      requests[0].accept({ src: '/late.png' });
      await flush();
      expect(host.querySelector('img')?.getAttribute('src')).toBe('/current.png');
      host.querySelector('img')!.dispatchEvent(new Event('error'));
      expect(host.querySelector('.chat-media-retry')).not.toBeNull();
      expect(requests[1].signal.aborted).toBe(true);
      dispose();
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it('uses one deadline for resolution and HTML loading', async () => {
    vi.useFakeTimers();
    try {
      const host = document.createElement('div');
      document.body.append(host);
      let signal: AbortSignal | undefined;
      const loadHTML = vi.fn((requestSignal: AbortSignal) => { signal = requestSignal; return new Promise<string>(() => {}); });
      const resolve = async () => ({ loadHTML });
      disposers.push(render(() => <MarkdownMedia source={{ kind: 'html', src: '/one.html', title: 'One' }} labels={labels} resolve={resolve} loadTimeoutMs={100} />, host));
      await flush();
      await vi.advanceTimersByTimeAsync(100);
      expect(loadHTML).toHaveBeenCalledOnce();
      expect(signal?.aborted).toBe(true);
      expect(host.querySelector('.chat-media-retry')).not.toBeNull();
    } finally { vi.useRealTimers(); }
  });
});
