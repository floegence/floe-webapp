import DOMPurify from 'dompurify';
import {
  PptxViewer,
  buildPresentation,
  parseZip,
  RECOMMENDED_ZIP_LIMITS,
  type SlideHandle,
} from '@aiden0z/pptx-renderer/browser';

export interface PptxSurfaceOptions {
  signal?: AbortSignal;
  onNodeError?: (nodeId: string, error: unknown) => void;
}

/** A read-only presentation. External relationships never acquire network authority. */
export class PptxDocumentSurface {
  private readonly handles = new Set<SlideHandle>();
  private disposed = false;
  private constructor(
    private readonly viewer: PptxViewer,
    readonly hasExternalLinks: boolean
  ) {}
  get pageCount(): number {
    return this.viewer.slideCount;
  }
  get pageWidth(): number {
    return this.viewer.slideWidth;
  }
  get pageHeight(): number {
    return this.viewer.slideHeight;
  }

  static async open(
    bytes: Uint8Array<ArrayBuffer>,
    options: PptxSurfaceOptions = {}
  ): Promise<PptxDocumentSurface> {
    options.signal?.throwIfAborted();
    if (bytes.byteLength > 20 * 1024 * 1024)
      throw new Error('Presentation exceeds the 20 MiB preview limit.');
    const files = await parseZip(bytes.slice().buffer, RECOMMENDED_ZIP_LIMITS);
    options.signal?.throwIfAborted();
    let hasExternalLinks = false;
    const cleanRelationships = (xml: string): string => {
      const document = new DOMParser().parseFromString(xml, 'application/xml');
      if (document.doctype || document.querySelector('parsererror'))
        throw new Error('Invalid presentation relationships.');
      for (const relation of [...document.getElementsByTagNameNS('*', 'Relationship')]) {
        const target = relation.getAttribute('Target') ?? '';
        if (
          (relation.getAttribute('TargetMode') ?? '').toLowerCase() === 'external' ||
          /^(?:[a-z][a-z0-9+.-]*:|[/\\]{2})/i.test(target.trim())
        ) {
          relation.remove();
          hasExternalLinks = true;
        }
      }
      return new XMLSerializer().serializeToString(document);
    };
    files.presentationRels = cleanRelationships(files.presentationRels);
    for (const map of [
      files.slideRels,
      files.slideLayoutRels,
      files.slideMasterRels,
      files.chartRels,
    ]) {
      if (map) for (const [key, value] of map) map.set(key, cleanRelationships(value));
    }
    for (const [key, value] of files.media) {
      if (!key.toLowerCase().endsWith('.svg')) continue;
      const clean = DOMPurify.sanitize(new TextDecoder().decode(value), {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['use'],
        FORBID_TAGS: ['style', 'foreignObject'],
        FORBID_ATTR: ['style'],
      });
      const document = new DOMParser().parseFromString(clean, 'image/svg+xml');
      if (document.querySelector('parsererror')) throw new Error('Invalid SVG in presentation.');
      for (const element of [...document.querySelectorAll('*')]) {
        for (const attribute of [...element.attributes]) {
          if (
            (attribute.localName === 'href' && !attribute.value.startsWith('#')) ||
            [...attribute.value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)].some(
              (match) => !match[2].startsWith('#')
            )
          )
            element.removeAttributeNode(attribute);
        }
      }
      files.media.set(
        key,
        new TextEncoder().encode(new XMLSerializer().serializeToString(document))
      );
    }
    const presentation = buildPresentation(files, { lazySlides: true });
    if (
      !presentation.slides.length ||
      presentation.slides.length > 1000 ||
      !Number.isFinite(presentation.width) ||
      !Number.isFinite(presentation.height) ||
      presentation.width <= 0 ||
      presentation.height <= 0 ||
      presentation.width > 20000 ||
      presentation.height > 20000
    )
      throw new Error('Invalid presentation dimensions or page count.');
    options.signal?.throwIfAborted();
    const viewer = new PptxViewer(document.createElement('div'), {
      pdfjs: false,
      onNodeError: options.onNodeError,
    });
    viewer.load(presentation);
    return new PptxDocumentSurface(viewer, hasExternalLinks);
  }

  renderPage(index: number, container: HTMLElement): SlideHandle {
    if (this.disposed) throw new Error('Presentation is closed.');
    if (!Number.isInteger(index) || index < 0 || index >= this.pageCount)
      throw new RangeError('Invalid presentation page.');
    const handle = this.viewer.renderSlideToContainer(index, container, 1);
    if (!handle) throw new Error('Presentation page could not be rendered.');
    let closed = false;
    const dispose = () => {
      if (closed) return;
      closed = true;
      this.handles.delete(owned);
      handle.dispose();
    };
    const owned = {
      element: handle.element,
      ready: handle.ready,
      dispose,
      [Symbol.dispose]: dispose,
    };
    this.handles.add(owned);
    return owned;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const handle of this.handles) handle.dispose();
    this.handles.clear();
    this.viewer.destroy();
  }
}
