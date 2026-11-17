export type ImageDimensions = Readonly<{ width: number; height: number }>;
export type ImagePoint = Readonly<{ x: number; y: number }>;
/** Continuous original-image pixels, independent of CSS pixels and device scale. */
export type ImageAnnotation = Readonly<
  { kind: 'point'; x: number; y: number } |
  { kind: 'rectangle'; x: number; y: number; width: number; height: number }
>;

export function validateImageAnnotation(image: ImageDimensions, annotation: ImageAnnotation): boolean {
  if (![image.width, image.height].every(n => Number.isSafeInteger(n) && n > 0 && n <= 16384)) return false;
  if (!annotation || ![annotation.x, annotation.y].every(Number.isFinite)
    || annotation.x < 0 || annotation.y < 0 || annotation.x > image.width || annotation.y > image.height) return false;
  if (annotation.kind === 'point') return true;
  return annotation.kind === 'rectangle' && [annotation.width, annotation.height].every(n => Number.isFinite(n) && n > 0)
    && annotation.x + annotation.width <= image.width && annotation.y + annotation.height <= image.height;
}

/** Pass the image's rendered rectangle, excluding contain letterboxing. */
export function imagePointFromClient(image: ImageDimensions, rect: Readonly<{ left: number; top: number; width: number; height: number }>, client: ImagePoint, clamp = false): ImagePoint | undefined {
  if (rect.width <= 0 || rect.height <= 0) return;
  const x = (client.x - rect.left) * image.width / rect.width;
  const y = (client.y - rect.top) * image.height / rect.height;
  if (![x, y].every(Number.isFinite) || !clamp && (x < 0 || y < 0 || x > image.width || y > image.height)) return;
  return { x: Math.max(0, Math.min(image.width, x)), y: Math.max(0, Math.min(image.height, y)) };
}

/** One deterministic overlay is used by the editor and exported/model-visible PNG. */
export function imageAnnotationMarkup(image: ImageDimensions, annotation: ImageAnnotation, marker = 1): string {
  if (!Number.isSafeInteger(marker) || marker < 1 || marker > 99) throw new Error('Invalid annotation marker');
  if (!validateImageAnnotation(image, annotation)) throw new Error('Invalid image annotation');
  // Scale with the source image so native-DPR captures and exported PNGs share
  // the same restrained stroke and badge proportions. No theme-only overlay.
  const unit = Math.max(1, Math.min(image.width, image.height) / 800);
  const { x, y } = annotation;
  const r = 11 * unit;
  const bx = Math.max(r + unit, Math.min(image.width - r - unit, x + r));
  const by = Math.max(r + unit, Math.min(image.height - r - unit, y - r - 3 * unit));
  const shape = annotation.kind === 'rectangle'
    ? `<rect x="${x}" y="${y}" width="${annotation.width}" height="${annotation.height}"/>`
    : `<path d="M${x - 5 * unit},${y}h${10 * unit}M${x},${y - 5 * unit}v${10 * unit}"/>`;
  const tint = annotation.kind === 'rectangle'
    ? `<rect x="${x}" y="${y}" width="${annotation.width}" height="${annotation.height}" fill="#2563eb" fill-opacity=".035"/>` : '';
  return `<g fill="none" stroke-linejoin="round">${tint}<g stroke="white" stroke-opacity=".9" stroke-width="${3.5 * unit}">${shape}</g><g stroke="#2563eb" stroke-width="${1.5 * unit}">${shape}<path d="M${x},${y}L${bx},${by}"/></g><rect data-annotation-marker="" pointer-events="all" x="${bx - r}" y="${by - r}" width="${2 * r}" height="${2 * r}" rx="${7 * unit}" fill="#2563eb" stroke="white" stroke-width="${1.5 * unit}"/><text data-annotation-marker="" pointer-events="all" x="${bx}" y="${by}" dy=".35em" text-anchor="middle" fill="white" stroke="none" font-family="system-ui, sans-serif" font-size="${11 * unit}" font-weight="600">${marker}</text></g>`;
}

export async function annotateImage(source: Blob, annotation: ImageAnnotation | readonly ImageAnnotation[]): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  let overlayURL: string | undefined;
  try {
    const { width, height } = bitmap;
    if (width * height > 32_000_000) throw new Error('Image exceeds annotation pixel limit');
    const annotations: readonly ImageAnnotation[] = Array.isArray(annotation) ? annotation : [annotation as ImageAnnotation];
    if (!annotations.length || annotations.length > 99) throw new Error('Invalid annotation count');
    const markup = annotations.map((item, index) => imageAnnotationMarkup({ width, height }, item, index + 1)).join('');
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image annotation is unavailable');
    context.drawImage(bitmap, 0, 0);
    overlayURL = URL.createObjectURL(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${markup}</svg>`], { type: 'image/svg+xml' }));
    const overlay = new Image(); overlay.src = overlayURL; await overlay.decode();
    context.drawImage(overlay, 0, 0);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image annotation is unavailable')), 'image/png'));
  } finally { bitmap.close(); if (overlayURL) URL.revokeObjectURL(overlayURL); }
}
