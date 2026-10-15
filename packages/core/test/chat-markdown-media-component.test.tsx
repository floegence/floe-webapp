// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
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
  it('opens an inline HTML snapshot in a floating window without replacing the inline frame', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    disposers.push(render(() => <MarkdownMedia
      source={{ kind: 'html', html: '<main>Inline report</main>', title: 'Report' }}
      labels={labels}
    />, host));
    await flush();
    const frame = host.querySelector('iframe');
    host.querySelector<HTMLElement>('[aria-label="More actions"]')!.click();
    await flush();
    const preview = Array.from(document.querySelectorAll<HTMLElement>('[role=menuitem]')).find(item => item.textContent?.includes('Open preview window'));
    expect(preview).not.toBeNull();
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
    host.querySelector<HTMLElement>('[aria-label="More actions"]')!.click();
    await flush();
    const preview = Array.from(document.querySelectorAll<HTMLElement>('[role=menuitem]')).find(item => item.textContent?.includes(labels.previewHTML));
    const expand = host.querySelector<HTMLButtonElement>('[data-chat-media-action="expand"]');
    expect(preview?.textContent).toContain(labels.previewHTML);
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
