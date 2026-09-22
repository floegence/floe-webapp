import { AnnotationEditorUIManager, AnnotationMode, GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { EventBus, GenericL10n, PDFFindController, PDFLinkService, PDFPageView } from 'pdfjs-dist/web/pdf_viewer.mjs';

export interface PdfEditorState { canUndo: boolean; canRedo: boolean; hasSelectedAnnotation: boolean }
export interface PdfSearchState { current: number; total: number; pending: boolean }
export interface PdfSurfaceOptions {
  document: PDFDocumentProxy;
  container: HTMLElement;
  viewer: HTMLElement;
  assetsUrl: string;
  editable?: boolean;
  onNavigate: (pageNumber: number) => void;
  onDirty?: () => void;
  onEditorState?: (state: PdfEditorState) => void;
  onSearchState?: (state: PdfSearchState) => void;
  /** Hosts may supply a PDF.js localization service for generated annotation UI. */
  l10n?: ConstructorParameters<typeof PDFPageView>[0]['l10n'];
}
export interface PdfPageRenderer {
  render: (scale: number) => Promise<void>;
  dispose: () => void;
}

/** All resources are served by the host; PDF JavaScript and XFA are not enabled. */
export function openPdfDocument(bytes: Uint8Array<ArrayBuffer>, assetsUrl: string) {
  const base = new URL(assetsUrl, document.baseURI).href.replace(/\/?$/, '/');
  GlobalWorkerOptions.workerSrc = `${base}pdf.worker.min.mjs`;
  return getDocument({ data: bytes.slice(), cMapUrl: `${base}cmaps/`, cMapPacked: true,
    standardFontDataUrl: `${base}standard_fonts/`, wasmUrl: `${base}wasm/`, iccUrl: `${base}iccs/`,
    enableXfa: false });
}

/** PDF.js defaults to a single viewer per document. Scope its public input handlers
 * so multiple embedded readers cannot consume each other's shortcuts or clipboard. */
class EmbeddedEditorManager extends AnnotationEditorUIManager {
  inputRoot?: HTMLElement;
  owns(event: Event) {
    return event.target instanceof Node && !!this.inputRoot?.contains(event.target);
  }
  override keydown(event: KeyboardEvent) { if (this.owns(event)) super.keydown(event); }
  override keyup(event: KeyboardEvent) { if (this.owns(event)) super.keyup(event); }
  override copy(event: ClipboardEvent) { if (this.owns(event) && this.hasSelection) super.copy(event); }
  override cut(event: ClipboardEvent) { if (this.owns(event) && this.hasSelection) super.cut(event); }
  // This surface supports highlights and forms only. Image/file paste and drop
  // belong to the host, even while an annotation happens to be selected.
  override paste() { return Promise.resolve(); }
  override dragOver() {}
  override drop() {}
}

/** Host-neutral layered pages, search and PDF-native edits. Hosts own layout,
 * virtualization, zoom policy, permissions, dirty confirmation and persistence. */
export class PdfDocumentSurface {
  readonly eventBus = new EventBus();
  readonly linkService = new PDFLinkService({ eventBus: this.eventBus, externalLinkTarget: 2,
    externalLinkRel: 'noopener noreferrer', ignoreDestinationZoom: true });
  readonly findController = new PDFFindController({ eventBus: this.eventBus, linkService: this.linkService });
  readonly editor: EmbeddedEditorManager | null;
  readonly #abort = new AbortController();
  readonly #pages = new Map<number, PDFPageView>();
  readonly #renderers = new Set<PdfPageRenderer>();
  readonly #l10n;
  readonly #fieldObjects: ReturnType<PDFDocumentProxy['getFieldObjects']> | undefined;
  #pageNumber = 1;
  #disposed = false;
  #searchState: PdfSearchState = { current: 0, total: 0, pending: false };
  #editorState: PdfEditorState = { canUndo: false, canRedo: false, hasSelectedAnnotation: false };

  constructor(readonly options: PdfSurfaceOptions) {
    const { document: pdf, container, viewer } = options;
    this.#l10n = options.l10n ?? new GenericL10n('en-US');
    void this.#l10n.translate(viewer);
    this.#fieldObjects = options.editable ? pdf.getFieldObjects() : undefined;
    const getPageNumber = () => this.#pageNumber;
    const navigate = (page: number) => this.navigate(page);
    this.linkService.setDocument(pdf);
    this.linkService.setViewer({
      get currentPageNumber() { return getPageNumber(); },
      set currentPageNumber(page: number) { navigate(page); },
      pagesRotation: 0, isInPresentationMode: false,
      scrollPageIntoView: ({ pageNumber }: { pageNumber: number }) => this.navigate(pageNumber),
      nextPage: () => this.navigate(this.#pageNumber + 1), previousPage: () => this.navigate(this.#pageNumber - 1),
      pageLabelToPageNumber: (label: string) => Number(label),
    });
    this.findController.onIsPageVisible = (page: number) => this.#pages.has(page);
    this.findController.setDocument(pdf);
    const eventOptions = { signal: this.#abort.signal };
    this.eventBus.on('updatefindmatchescount', ({ matchesCount }: { matchesCount: { current: number; total: number } }) => {
      this.#searchState = { ...this.#searchState, ...matchesCount };
      options.onSearchState?.(this.#searchState);
    }, eventOptions);
    this.eventBus.on('updatefindcontrolstate', ({ state, matchesCount }: { state: number; matchesCount: { current: number; total: number } }) => {
      this.#searchState = { ...matchesCount, pending: state === 3 };
      options.onSearchState?.(this.#searchState);
    }, eventOptions);
    this.editor = options.editable ? new EmbeddedEditorManager(container, viewer, null, null, null, null,
      this.eventBus, pdf, null, 'yellow=#fff066', false, false, false, null, null, false) : null;
    if (this.editor) {
      this.editor.inputRoot = container;
      container.addEventListener('input', event => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
        const id = target.dataset.elementId;
        if (!id || !target.closest('.textWidgetAnnotation')) return;
        // Preserve the edited display value when PDF.js recreates a form layer.
        // Otherwise 6.3 uses text from the original appearance stream as its
        // formatted value even though AnnotationStorage contains the new value.
        pdf.annotationStorage.setValue(id, { formattedValue: target.value });
        options.onDirty?.();
      }, { signal: this.#abort.signal });
      // AnnotationStorage intentionally reports the first modification. Keep dirty
      // latched until the host acknowledges the persisted bytes, including failures.
      pdf.annotationStorage.onSetModified = (() => options.onDirty?.()) as never;
      this.eventBus.on('editingstateschanged', ({ details }: { details: {
        hasSomethingToUndo: boolean; hasSomethingToRedo: boolean; hasSelectedEditor: boolean;
      } }) => {
        this.#editorState = { canUndo: !!details.hasSomethingToUndo,
          canRedo: !!details.hasSomethingToRedo, hasSelectedAnnotation: !!details.hasSelectedEditor };
        options.onEditorState?.(this.#editorState);
      }, eventOptions);
      this.eventBus.on('switchannotationeditormode', ({ mode }: { mode: number }) => {
        void this.editor?.updateMode(mode);
      }, eventOptions);
    }
  }

  navigate(page: number) {
    if (!Number.isInteger(page) || page < 1 || page > this.options.document.numPages || this.#disposed) return;
    this.setCurrentPage(page);
    this.options.onNavigate(page);
  }
  setCurrentPage(page: number) {
    this.#pageNumber = page;
    this.eventBus.dispatch('pagechanging', { pageNumber: page });
  }
  setScale(scale: number) { this.eventBus.dispatch('scalechanging', { scale: scale * 0.75 }); }
  search(query: string, previous = false, again = false) {
    this.eventBus.dispatch('find', { source: this, type: again ? 'again' : '', query,
      caseSensitive: false, entireWord: false, highlightAll: true, findPrevious: previous, matchDiacritics: false });
  }
  clearSearch() { this.eventBus.dispatch('findbarclose', { source: this }); }
  async highlightSelection() {
    const selection = this.options.container.ownerDocument.getSelection();
    if (!this.editor || !selection?.rangeCount || selection.isCollapsed) return false;
    const range = selection.getRangeAt(0);
    if (!this.options.viewer.contains(range.startContainer) || !this.options.viewer.contains(range.endContainer)) return false;
    // A highlight belongs to one PDF page; cross-page text remains copyable.
    const element = (node: Node) => node instanceof Element ? node : node.parentElement;
    const layer = element(range.startContainer)?.closest('.textLayer');
    if (!layer || layer !== element(range.endContainer)?.closest('.textLayer')) return false;
    const page = Number(layer.closest('[data-page-number]')?.getAttribute('data-page-number'));
    this.setCurrentPage(page);
    await this.editor.updateMode(9);
    this.editor.highlightSelection('main_toolbar');
    await this.editor.updateMode(0);
    this.options.onDirty?.();
    return true;
  }
  undo() { if (this.#editorState.canUndo) { this.editor?.undo(); this.options.onDirty?.(); } }
  redo() { if (this.#editorState.canRedo) { this.editor?.redo(); this.options.onDirty?.(); } }
  deleteSelection() { if (this.#editorState.hasSelectedAnnotation) { this.editor?.delete(); this.options.onDirty?.(); } }
  async save() {
    if (!this.options.editable || this.#disposed) throw new Error('This PDF surface is not editable.');
    this.editor?.endCurrentEditing();
    return this.options.document.saveDocument();
  }

  /** Each mounted page has exactly one serialized render owner. Superseded
   * requests settle without exposing cancellation as a document error. */
  mountPage(page: PDFPageProxy, container: HTMLDivElement): PdfPageRenderer {
    let view: PDFPageView | null = null;
    let disposed = false;
    let revision = 0;
    let running: Promise<void> = Promise.resolve();
    const renderer: PdfPageRenderer = {
      render: (scale) => {
        const request = ++revision;
        view?.cancelRendering({ keepAnnotationLayer: true, keepAnnotationEditorLayer: true,
          keepTextLayer: true, keepXfaLayer: true });
        running = running.catch(() => {}).then(async () => {
          if (disposed || this.#disposed || request !== revision) return;
          if (view) {
            view.update({ scale: scale * 0.75 });
          } else {
            container.classList.add('floe-pdf-page');
            view = new PDFPageView({ container, id: page.pageNumber, eventBus: this.eventBus,
            scale: scale * 0.75, defaultViewport: page.getViewport({ scale }),
            maxCanvasPixels: 6_000_000, maxCanvasDim: 16_384, capCanvasAreaFactor: -1,
            enableDetailCanvas: false, enableSelectionRendering: false, imagesRightClickMinSize: -1,
            textLayerMode: 1, annotationMode: this.options.editable ? AnnotationMode.ENABLE_FORMS : AnnotationMode.ENABLE,
            imageResourcesPath: `${this.options.assetsUrl}images/`, enableAutoLinking: false,
            l10n: this.#l10n, abortSignal: this.#abort.signal,
            layerProperties: { annotationEditorUIManager: this.editor, annotationStorage: this.options.document.annotationStorage,
              linkService: this.linkService, findController: this.findController, enableScripting: false,
              fieldObjectsPromise: this.#fieldObjects, hasJSActionsPromise: Promise.resolve(false) },
            });
            this.#pages.set(page.pageNumber, view);
            view.setPdfPage(page);
          }
          try { if (view.renderingState !== 3) await view.draw(); }
          catch (error) {
            if (!disposed && request === revision && (error as Error).name !== 'RenderingCancelledException') throw error;
          }
        });
        return running;
      },
      dispose: () => {
        if (disposed) return;
        disposed = true; revision++; view?.cancelRendering();
        this.#pages.delete(page.pageNumber);
        this.#renderers.delete(renderer);
        void running.catch(() => {}).finally(() => { view?.destroy(); container.replaceChildren(); });
      },
    };
    this.#renderers.add(renderer);
    return renderer;
  }
  destroy() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#abort.abort();
    for (const renderer of this.#renderers) renderer.dispose();
    this.findController.setDocument(null as unknown as PDFDocumentProxy);
    this.editor?.destroy();
    this.options.document.annotationStorage.onSetModified = null;
    if (!this.options.l10n) void this.#l10n?.destroy();
  }
}
