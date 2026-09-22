import { GenericL10n } from 'pdfjs-dist/web/pdf_viewer.mjs';

export interface PdfLocalizedMessage {
  text?: string;
  attributes?: Partial<Record<'title' | 'aria-label' | 'alt' | 'placeholder', string>>;
}
export type PdfLocalize = (id: string, args: Record<string, unknown>) => PdfLocalizedMessage;

/** Bridge PDF.js generated layer labels to the host's existing localization
 * catalog. Observes one stable viewer root, never detached virtualized pages. */
export class PdfLocalization extends GenericL10n {
  readonly #observer: MutationObserver;
  constructor(readonly root: HTMLElement, readonly localize: PdfLocalize, language = 'en-US') {
    super(language);
    this.#observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') this.apply(record.target as Element);
        else for (const node of record.addedNodes) if (node instanceof Element) this.translateOnce(node);
      }
    });
    this.#observer.observe(root, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['data-l10n-id', 'data-l10n-args'] });
  }
  private apply(element: Element) {
    const id = element.getAttribute('data-l10n-id');
    if (!id) return;
    let args: Record<string, unknown> = {};
    try { args = JSON.parse(element.getAttribute('data-l10n-args') ?? '{}'); } catch { /* Ignore malformed document metadata. */ }
    const message = this.localize(id, args);
    if (message.text !== undefined && element.textContent !== message.text) element.textContent = message.text;
    for (const [name, value] of Object.entries(message.attributes ?? {})) {
      if (value !== undefined && element.getAttribute(name) !== value) element.setAttribute(name, value);
    }
  }
  override async get(ids: string | string[], args?: Record<string, unknown> | null, _fallback?: string) {
    const localize = (id: string) => this.localize(id, args ?? {}).text ?? '';
    return Array.isArray(ids) ? ids.map(localize) : localize(ids);
  }
  override async translate(element: Element) { await this.translateOnce(element); }
  override async translateOnce(element: Element) {
    this.apply(element);
    for (const child of element.querySelectorAll('[data-l10n-id]')) this.apply(child);
  }
  override pause() {}
  override resume() {}
  override async destroy() { this.#observer.disconnect(); await super.destroy(); }
}
