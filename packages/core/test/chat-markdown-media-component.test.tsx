// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'solid-js/web';
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

afterEach(() => {
  while (disposers.length) disposers.pop()!();
  document.body.innerHTML = '';
});

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('MarkdownMedia HTML controls', () => {
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
    const preview = host.querySelector<HTMLButtonElement>('[data-chat-media-action="preview"]');
    const expand = host.querySelector<HTMLButtonElement>('[data-chat-media-action="expand"]');
    expect(preview?.getAttribute('aria-label')).toBe(labels.previewHTML);
    expect(expand?.getAttribute('aria-label')).toBe(labels.expand);

    preview?.click();
    expect(openPreview).toHaveBeenCalledOnce();

    expand?.click();
    const collapse = host.querySelector<HTMLButtonElement>('[data-chat-media-action="collapse"]');
    expect(collapse?.getAttribute('aria-label')).toBe(labels.collapse);
    expect(collapse?.querySelector('svg path')).not.toBeNull();
  });
});
