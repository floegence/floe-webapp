export type MarkdownMediaKind = 'image' | 'video' | 'audio' | 'html';

/** A display request, never an authorization or filesystem capability. */
export interface MarkdownMediaSource {
  kind: MarkdownMediaKind;
  title: string;
  src?: string;
  html?: string;
}

export function markdownMediaKind(source: string): MarkdownMediaKind | undefined {
  const path = source.split(/[?#]/, 1)[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(path)) return 'image';
  if (/\.(mp4|webm|ogv|mov)$/.test(path)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(path)) return 'audio';
  if (/\.html?$/.test(path)) return 'html';
  return undefined;
}

function validSource(source: unknown): source is MarkdownMediaSource {
  if (!source || typeof source !== 'object') return false;
  const value = source as MarkdownMediaSource;
  return ['image', 'video', 'audio', 'html'].includes(value.kind)
    && typeof value.title === 'string'
    && ((typeof value.src === 'string' && value.src.length > 0 && value.src.length <= 8192 && value.html === undefined)
      || (value.kind === 'html' && typeof value.html === 'string' && value.html.length <= 1_000_000 && value.src === undefined));
}

/** Inert placeholder: mount trusted components only after Markdown has been rendered. */
export function markdownMediaPlaceholder(source: MarkdownMediaSource): string {
  if (!validSource(source)) return '';
  return `<span data-floe-markdown-media="${encodeURIComponent(JSON.stringify(source)).replace(/'/g, '%27')}"></span>`;
}

export function readMarkdownMediaPlaceholder(element: Element): MarkdownMediaSource | undefined {
  try {
    const value: unknown = JSON.parse(decodeURIComponent(element.getAttribute('data-floe-markdown-media') ?? ''));
    return validSource(value) ? value : undefined;
  } catch { return undefined; }
}

/** Remote display URLs only. Hosts resolve opaque/local references through their own authority. */
export function safeMarkdownMediaURL(raw: string): string | undefined {
  if ([...raw].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === '\\')) return undefined;
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return undefined;
    return url.href;
  } catch { return undefined; }
}

/** The CSP precedes supplied markup; the opaque sandbox also denies shell/storage access. */
export function sandboxedMarkdownHtml(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html{color-scheme:light}body{margin:16px;font:14px/1.5 system-ui,sans-serif;overflow-wrap:anywhere}img,video,svg,canvas{max-width:100%}button,a,input,select{touch-action:manipulation}</style></head><body>${html}</body></html>`;
}
