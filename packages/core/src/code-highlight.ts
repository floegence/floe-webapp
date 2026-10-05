import { canHighlightCode, MAX_CODE_TOKENS, type CodeColorRequest, type CodeColorResponse, type CodeColorToken } from './code-highlight/tokens';

interface Job extends CodeColorRequest { resolve: (tokens: CodeColorToken[] | null) => void }
const queue: Job[] = [];
let active: Job | undefined;
let worker: Worker | undefined;
let unavailable = false;
let nextId = 0;
let deadline: ReturnType<typeof setTimeout> | undefined;

function failWorker() {
  unavailable = true;
  clearTimeout(deadline);
  worker?.terminate();
  worker = undefined;
  active?.resolve(null);
  active = undefined;
  for (const job of queue.splice(0)) job.resolve(null);
}

function pump() {
  if (active || unavailable || !queue.length) return;
  try {
    if (!worker) {
      worker = new Worker(new URL('./code-highlight/highlight.worker.ts', import.meta.url), { type: 'module' });
      worker.onerror = failWorker;
      worker.onmessageerror = failWorker;
      worker.onmessage = ({ data }: MessageEvent<CodeColorResponse>) => {
        if (data.id !== active?.id) return;
        clearTimeout(deadline);
        const job = active;
        active = undefined;
        job.resolve(data.tokens);
        // Yield before dispatching the next visible block.
        setTimeout(pump, 0);
      };
    }
    active = queue.shift()!;
    const { id, code, language } = active;
    deadline = setTimeout(failWorker, 15_000);
    worker.postMessage({ id, code, language } satisfies CodeColorRequest);
  } catch { failWorker(); }
}

function request(code: string, language: string, resolve: Job['resolve']): () => void {
  if (unavailable || queue.length >= 128) { resolve(null); return () => {}; }
  const job = { id: ++nextId, code, language, resolve };
  queue.push(job);
  pump();
  return () => {
    const index = queue.indexOf(job);
    if (index >= 0) queue.splice(index, 1);
    // An in-flight worker can finish without retaining its former DOM owner.
    job.resolve = () => {};
  };
}

let observer: IntersectionObserver | undefined;
const visibleCallbacks = new WeakMap<Element, () => void>();
function whenVisible(element: HTMLElement, callback: () => void): () => void {
  if (typeof IntersectionObserver === 'undefined') { callback(); return () => {}; }
  observer ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const notify = visibleCallbacks.get(entry.target);
      visibleCallbacks.delete(entry.target);
      observer!.unobserve(entry.target);
      notify?.();
    }
  });
  visibleCallbacks.set(element, callback);
  observer.observe(element);
  return () => { observer!.unobserve(element); visibleCallbacks.delete(element); };
}

/**
 * Color an existing, immutable plain-text code element when visible. The host
 * keeps its frame, controls and layout. Dispose before replacing/removing it.
 * Parsing runs in a lazy shared worker; unsupported or bounded-out input stays
 * readable. Colors follow the inherited CSS color-scheme without DOM changes.
 * Only call for committed content, never an actively growing streaming tail.
 */
export function enhanceCodeBlock(code: HTMLElement, language: string): () => void {
  const source = code.textContent ?? '';
  const lang = language.trim().toLowerCase();
  if (!canHighlightCode(source, lang) || code.children.length || code.hasAttribute('data-floe-code-highlighted')) return () => {};
  const doc = code.ownerDocument;
  let disposed = false;
  let cancelRequest: (() => void) | undefined;
  let pending: CodeColorToken[] | null = null;
  let listening = false;
  const stopListening = () => {
    if (!listening) return;
    doc.removeEventListener('selectionchange', apply);
    listening = false;
  };
  const apply = () => {
    if (disposed || !pending) return;
    if (!code.isConnected || code.textContent !== source || code.children.length) {
      pending = null;
      stopListening();
      return;
    }
    const selection = doc.getSelection();
    for (let index = 0; selection && index < selection.rangeCount; index++) {
      if (selection.getRangeAt(index).intersectsNode(code)) {
        if (!listening) { doc.addEventListener('selectionchange', apply); listening = true; }
        return;
      }
    }
    stopListening();
    const fragment = doc.createDocumentFragment();
    let offset = 0;
    for (const token of pending) {
      if (token.start < offset || token.end <= token.start || token.end > source.length
        || !/^#[\da-f]{6,8}$/i.test(token.light) || !/^#[\da-f]{6,8}$/i.test(token.dark)) { pending = null; return; }
      fragment.append(source.slice(offset, token.start));
      const span = doc.createElement('span');
      span.style.color = `light-dark(${token.light}, ${token.dark})`;
      span.textContent = source.slice(token.start, token.end);
      fragment.append(span);
      offset = token.end;
    }
    fragment.append(source.slice(offset));
    pending = null;
    code.replaceChildren(fragment);
    code.setAttribute('data-floe-code-highlighted', '');
  };
  const unobserve = whenVisible(code, () => {
    if (disposed || !code.isConnected || code.textContent !== source) return;
    cancelRequest = request(source, lang, (tokens) => {
      if (disposed || !tokens?.length || tokens.length > MAX_CODE_TOKENS) return;
      pending = tokens;
      apply();
    });
  });
  return () => { disposed = true; pending = null; unobserve(); cancelRequest?.(); stopListening(); };
}
