import { openPdfDocument, PdfDocumentSurface, type PdfPageRenderer } from '../../src/pdf';
import assetsUrl from 'virtual:floe-pdf-assets';
import '../../dist/pdf.css';

document.body.innerHTML = `<button id="highlight">Highlight selection</button><button id="undo">Undo</button><button id="redo">Redo</button><input id="outside" aria-label="Outside input"><div id="host" class="floe-pdf-surface" tabindex="0" style="width:900px;height:800px;overflow:auto;transform-origin:top left"><div id="viewer" class="pdfViewer"></div></div>`;
const host = document.querySelector<HTMLElement>('#host')!;
const viewer = document.querySelector<HTMLElement>('#viewer')!;
let task: ReturnType<typeof openPdfDocument>;
let surface: PdfDocumentSurface;
let renderer: PdfPageRenderer;
let scale = 1;
let dirty = false;
let currentPage = 1;
let searchState: unknown;
async function mount(pageNumber: number) {
  renderer?.dispose();
  viewer.replaceChildren();
  currentPage = pageNumber;
  surface.setCurrentPage(pageNumber);
  const holder = document.createElement('div');
  holder.className = 'floe-pdf-page';
  viewer.append(holder);
  renderer = surface.mountPage(await surface.options.document.getPage(pageNumber), holder);
  await renderer.render(scale);
}
document.querySelector('#highlight')!.addEventListener('mousedown', event => event.preventDefault());
document.querySelector('#highlight')!.addEventListener('click', () => void surface.highlightSelection());
document.querySelector('#undo')!.addEventListener('click', () => surface.undo());
document.querySelector('#redo')!.addEventListener('click', () => surface.redo());
const api = {
  async load(file = 'mixed-embedded.pdf', editable = true) {
    surface?.destroy();
    await task?.destroy();
    viewer.replaceChildren(); scale = 1; dirty = false;
    task = openPdfDocument(new Uint8Array(await (await fetch(`./pdf-fixtures/${file}`)).arrayBuffer()), assetsUrl);
    surface = new PdfDocumentSurface({ document: await task.promise, container: host, viewer, assetsUrl, editable,
      onNavigate: page => void mount(page), onDirty: () => { dirty = true; }, onSearchState: state => { searchState = state; } });
    await mount(1);
  },
  async zoom(value: number) { scale = value; surface.setScale(value); await renderer.render(scale); },
  mount,
  project(value: number) { host.style.transform = `scale(${value})`; },
  search(query: string, again = false) { surface.search(query, false, again); },
  get state() { return { dirty, currentPage, searchState, storage: Array.from(surface.options.document.annotationStorage).map(([id, value]) => ({ id, value: value.value })) }; },
  async saved() {
    const bytes = await surface.save();
    const reopened = openPdfDocument(bytes, assetsUrl);
    const pdf = await reopened.promise;
    const fields = Object.fromEntries(await pdf.getFieldObjects() ?? []);
    const annotations = await (await pdf.getPage(currentPage)).getAnnotations();
    await reopened.destroy();
    return { fields, annotations, bytes: Array.from(bytes) };
  },
};
const ready = api.load();
Object.assign(window, { pdfTest: api, pdfReady: ready });
await ready;
