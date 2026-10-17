// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  files: {} as Record<string, unknown>,
  model: {} as Record<string, unknown>,
  destroyed: vi.fn(),
  released: vi.fn(),
}));
vi.mock('@aiden0z/pptx-renderer/browser', () => ({
  RECOMMENDED_ZIP_LIMITS: { maxEntries: 4000 },
  parseZip: vi.fn(async () => mock.files),
  buildPresentation: vi.fn(() => mock.model),
  PptxViewer: class {
    slideCount = 2;
    slideWidth = 1280;
    slideHeight = 720;
    load() {}
    renderSlideToContainer() {
      return {
        element: document.createElement('div'),
        ready: Promise.resolve(),
        dispose: mock.released,
      };
    }
    destroy = mock.destroyed;
  },
}));
import { PptxDocumentSurface } from '../src/pptx';
const bytes = new Uint8Array([1, 2, 3]);
function fixture() {
  mock.released.mockClear();
  mock.destroyed.mockClear();
  mock.files = {
    presentationRels: '<Relationships/>',
    slideRels: new Map(),
    slideLayoutRels: new Map(),
    slideMasterRels: new Map(),
    media: new Map(),
  };
  mock.model = { slides: [{}, {}], width: 1280, height: 720 };
}
describe('presentation surface', () => {
  it('removes external relationships before building the model', async () => {
    fixture();
    const relationships = new Map([
      [
        'slide1.xml.rels',
        '<Relationships><Relationship Id="internal" Target="../media/image.png"/><Relationship Id="external" Target="https://example.com/x" TargetMode="External"/><Relationship Id="script" Target="javascript:alert(1)"/></Relationships>',
      ],
    ]);
    mock.files.slideRels = relationships;
    const surface = await PptxDocumentSurface.open(bytes);
    expect(surface.hasExternalLinks).toBe(true);
    expect(relationships.get('slide1.xml.rels')).toContain('internal');
    expect(relationships.get('slide1.xml.rels')).not.toMatch(/external|script|example/);
    surface.dispose();
  });
  it('sanitizes embedded SVG scripts and remote styles', async () => {
    fixture();
    const media = new Map([
      [
        'ppt/media/image.svg',
        new TextEncoder().encode(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><image href="https://example.com/x"/><path style="fill:url(https://example.com/y)"/><use href="#shape"/></svg>'
        ),
      ],
    ]);
    mock.files.media = media;
    const surface = await PptxDocumentSurface.open(bytes);
    const svg = new TextDecoder().decode(media.get('ppt/media/image.svg'));
    expect(svg).not.toMatch(/script|https:/);
    expect(svg).toContain('#shape');
    surface.dispose();
  });
  it('owns page handles and closes each exactly once', async () => {
    fixture();
    const surface = await PptxDocumentSurface.open(bytes);
    const page = surface.renderPage(0, document.createElement('div'));
    surface.dispose();
    page.dispose();
    page.dispose();
    surface.dispose();
    expect(mock.released).toHaveBeenCalledTimes(1);
    expect(mock.destroyed).toHaveBeenCalledTimes(1);
    expect(() => surface.renderPage(0, document.createElement('div'))).toThrow('closed');
  });
  it('rejects aborted work invalid dimensions page indexes and oversized inputs', async () => {
    fixture();
    const controller = new AbortController();
    controller.abort();
    await expect(PptxDocumentSurface.open(bytes, { signal: controller.signal })).rejects.toThrow();
    await expect(PptxDocumentSurface.open(new Uint8Array(20 * 1024 * 1024 + 1))).rejects.toThrow(
      '20 MiB'
    );
    mock.model.width = NaN;
    await expect(PptxDocumentSurface.open(bytes)).rejects.toThrow('dimensions');
    fixture();
    const surface = await PptxDocumentSurface.open(bytes);
    expect(() => surface.renderPage(-1, document.createElement('div'))).toThrow(RangeError);
    surface.dispose();
  });
});
