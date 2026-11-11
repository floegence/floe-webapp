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
export function imageAnnotationMarkup(image: ImageDimensions, annotation: ImageAnnotation): string {
  if (!validateImageAnnotation(image, annotation)) throw new Error('Invalid image annotation');
  const unit = Math.max(1, Math.min(image.width, image.height) / 500);
  const { x, y } = annotation;
  const r = 9 * unit;
  const bx = Math.max(r + unit, Math.min(image.width - r - unit, x + 17 * unit));
  const by = Math.max(r + unit, Math.min(image.height - r - unit, y - 17 * unit));
  const shape = annotation.kind === 'rectangle'
    ? `<rect x="${x}" y="${y}" width="${annotation.width}" height="${annotation.height}" fill="#f59e0b" fill-opacity=".08"/>`
    : `<path d="M${x - 6 * unit},${y}h${12 * unit}M${x},${y - 6 * unit}v${12 * unit}"/><circle cx="${x}" cy="${y}" r="${2 * unit}" fill="#f59e0b"/>`;
  return `<g fill="none" stroke-linejoin="round"><g stroke="#111827" stroke-width="${4 * unit}">${shape}</g><g stroke="#fbbf24" stroke-width="${2 * unit}">${shape}<path d="M${x},${y}L${bx},${by}"/></g><circle cx="${bx}" cy="${by}" r="${r}" fill="#fbbf24" stroke="#111827" stroke-width="${unit}"/><text x="${bx}" y="${by}" dy=".35em" text-anchor="middle" fill="#111827" stroke="none" font-family="sans-serif" font-size="${12 * unit}" font-weight="700">1</text></g>`;
}

export async function annotateImage(source: Blob, annotation: ImageAnnotation): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  let overlayURL: string | undefined;
  try {
    const { width, height } = bitmap;
    if (width * height > 32_000_000) throw new Error('Image exceeds annotation pixel limit');
    const markup = imageAnnotationMarkup({ width, height }, annotation);
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
