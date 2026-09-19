import { describe, expect, it } from 'vitest';
import { markdownMediaKind, markdownMediaPlaceholder, readMarkdownMediaPlaceholder, safeMarkdownMediaURL, sandboxedMarkdownHtml } from '../src/components/chat/markdown/media';

describe('Markdown media display boundary', () => {
  it('classifies media independently of signed query strings and fragments', () => {
    expect(markdownMediaKind('https://example.com/film.MP4?signature=x#t=3')).toBe('video');
    expect(markdownMediaKind('/project/report.html')).toBe('html');
    expect(markdownMediaKind('/project/voice.m4a')).toBe('audio');
    expect(markdownMediaKind('https://example.com/article')).toBeUndefined();
  });
  it('keeps HTML and attribute injection inert until a trusted component mounts', () => {
    const source = { kind: 'html' as const, title: '" onclick="bad', html: '<script>parent.bad=1</script>' };
    const placeholder = markdownMediaPlaceholder(source);
    expect(placeholder).not.toContain('<script>');
    expect(placeholder).not.toContain('onclick=');
    const encoded = placeholder.match(/data-floe-markdown-media="([^"]+)"/)![1];
    expect(readMarkdownMediaPlaceholder({ getAttribute: () => encoded } as unknown as Element)).toEqual(source);
    expect(readMarkdownMediaPlaceholder({ getAttribute: () => '%ZZ' } as unknown as Element)).toBeUndefined();
  });
  it('rejects ambient application, credentialed, and executable URLs', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,bad', 'file:///secret', '/api/private', '//example.com/a', 'https://user:pass@example.com/a', 'https://example.com/\nimage']) {
      expect(safeMarkdownMediaURL(url), url).toBeUndefined();
    }
    expect(safeMarkdownMediaURL('https://example.com/a.png')).toBe('https://example.com/a.png');
  });
  it('places a restrictive CSP before untrusted markup', () => {
    const html = sandboxedMarkdownHtml('<meta http-equiv="Content-Security-Policy" content="default-src *"><script>1</script>');
    expect(html.indexOf("default-src 'none'")).toBeLessThan(html.indexOf('default-src *'));
    expect(html).toContain("connect-src 'none'");
    expect(html).toContain("frame-src 'none'");
    expect(html).toContain("form-action 'none'");
  });
});
