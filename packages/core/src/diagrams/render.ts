import DOMPurify from 'dompurify';
import type { MathResolver, RenderResult } from 'pele';
import { secureRandomUUID } from '../utils/secureRandom';

export type DiagramErrorCode = 'syntax' | 'semantic' | 'limit' | 'unsupported-diagram' | 'unavailable';
export class DiagramError extends Error {
  constructor(public readonly code: DiagramErrorCode, message: string, public readonly line = 0, public readonly column = 0) {
    super(message);
    this.name = 'DiagramError';
  }
}

export interface DiagramRenderOptions {
  signal?: AbortSignal;
  /** The owner supplies actual local CSS width, never transformed screen width. */
  maxWidth?: number;
  fontFamily?: string;
  fontFamilyMono?: string;
  fontSize?: number;
  document?: Document;
  /** Links remain inert unless the host explicitly owns navigation. */
  links?: boolean;
}
export interface DiagramRenderResult { svg: string; width: number; height: number; type: string }

// A render cannot be preempted by a Promise. Yield between bounded jobs and
// measure the actual synchronous work in production browser acceptance.
let tail: Promise<unknown> = Promise.resolve();
let queued = 0;
const abort = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException('Aborted', 'AbortError'); };

export function sanitizeDiagramSvg(svg: string, doc: Document = document): string {
  const Parser = doc.defaultView?.DOMParser ?? DOMParser;
  const input = new Parser().parseFromString(svg, 'image/svg+xml');
  const formulas: Element[] = [];
  for (const foreign of Array.from(input.querySelectorAll('foreignObject'))) {
    const expression = foreign.querySelector('math');
    if (!expression) { foreign.remove(); continue; }
    const template = doc.createElement('template');
    template.innerHTML = DOMPurify.sanitize(expression.outerHTML, { USE_PROFILES: { mathMl: true }, FORBID_TAGS: ['annotation-xml'], FORBID_ATTR: ['href', 'style'] });
    const math = template.content.querySelector('math');
    if (!math) { foreign.remove(); continue; }
    foreign.replaceChildren();
    foreign.setAttribute('data-floe-formula', String(formulas.length));
    formulas.push(math);
  }
  const clean = DOMPurify.sanitize(new XMLSerializer().serializeToString(input.documentElement), {
    USE_PROFILES: { svg: true, svgFilters: true, mathMl: true },
    ADD_TAGS: ['foreignObject'],
    ADD_ATTR: ['role'],
    FORBID_TAGS: ['script', 'style', 'image', 'iframe', 'object', 'embed', 'animate', 'set'],
  });
  const parsed = new Parser().parseFromString(clean, 'image/svg+xml');
  const root = parsed.documentElement;
  if (root.localName !== 'svg' || parsed.querySelector('parsererror')) throw new DiagramError('unavailable', 'Invalid diagram SVG.');
  for (const node of [root, ...Array.from(root.querySelectorAll('*'))]) {
    for (const attribute of Array.from(node.attributes)) {
      if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
      if (attribute.localName === 'href' && !/^(?:#|https?:\/\/|mailto:)/i.test(attribute.value.trim())) node.removeAttribute(attribute.name);
      if (/url\s*\(/i.test(attribute.value) && !/^url\(#[\w-]+\)$/.test(attribute.value.trim())) node.removeAttribute(attribute.name);
    }
  }
  for (const foreign of Array.from(root.querySelectorAll('foreignObject'))) {
    const formula = formulas[Number(foreign.getAttribute('data-floe-formula'))];
    foreign.removeAttribute('data-floe-formula');
    if (formula) foreign.append(parsed.importNode(formula, true));
    else foreign.remove();
  }
  return new XMLSerializer().serializeToString(root);
}

async function mathResolver(source: string, doc: Document, fontSize: number): Promise<{ math?: MathResolver; dispose: () => void }> {
  if (!source.includes('$$')) return { dispose() {} };
  const { default: katex } = await import('katex');
  const probe = doc.createElement('span');
  probe.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;display:inline-block;white-space:nowrap;';
  probe.style.fontSize = fontSize + 'px';
  doc.body.append(probe);
  return {
    dispose: () => probe.remove(),
    math(tex, size) {
      probe.style.fontSize = size + 'px';
      probe.innerHTML = DOMPurify.sanitize(katex.renderToString(tex, { output: 'mathml', throwOnError: true, trust: false, strict: 'error' }), { USE_PROFILES: { html: true, mathMl: true } });
      const expression = probe.querySelector('math');
      if (!expression) throw new DiagramError('semantic', 'The diagram formula could not be typeset.');
      const { width, height } = expression.getBoundingClientRect();
      return { html: expression.outerHTML, width, height };
    },
  };
}

/** One lazy renderer for all Mermaid syntax surfaces. Never retries another engine. */
export function renderDiagram(source: string, options: DiagramRenderOptions = {}): Promise<DiagramRenderResult> {
  if (source.length > 50_000 || queued >= 128) return Promise.reject(new DiagramError('limit', 'Diagram rendering limit exceeded.'));
  queued++;
  const task = tail.then(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    abort(options.signal);
    const doc = options.document ?? document;
    const { renderAsync } = await import('pele/lazy');
    abort(options.signal);
    const formulas = await mathResolver(source, doc, options.fontSize ?? 16);
    try {
      abort(options.signal);
      const result: RenderResult = await renderAsync(source, {
        idPrefix: 'floe-diagram-' + secureRandomUUID(),
        autoDirection: false,
        maxWidth: options.maxWidth,
        fontFamily: options.fontFamily ?? 'Inter, system-ui, sans-serif',
        fontFamilyMono: options.fontFamilyMono ?? 'monospace',
        fontSize: options.fontSize ?? 16,
        links: options.links === true,
        images: false,
        linkSchemes: ['https', 'http', 'mailto'],
        linkRel: 'noopener noreferrer',
        limit: 50_000,
        maxEdges: 500,
        outputLimit: 4_000_000,
        math: formulas.math,
      });
      abort(options.signal);
      return { svg: sanitizeDiagramSvg(result.svg, doc), width: result.width, height: result.height, type: result.type };
    } finally { formulas.dispose(); }
  }).catch((error: unknown) => {
    if (error instanceof DiagramError || error instanceof DOMException && error.name === 'AbortError') throw error;
    const failure = error as { code?: DiagramErrorCode; message?: string; line?: number; column?: number };
    throw new DiagramError(failure.code ?? 'unavailable', failure.message ?? 'Diagram rendering failed.', failure.line, failure.column);
  });
  tail = task.catch(() => {}).finally(() => { queued--; });
  return task;
}
