export interface FitScaleSize {
  width: number;
  height: number;
}

/** Fit local content dimensions without capping enlargement or rounding scale. */
export function calculateFitScale(options: {
  content: FitScaleSize;
  viewport: FitScaleSize;
  mode: 'contain' | 'width';
}): number | null {
  const { content, viewport, mode } = options;
  if (![content.width, content.height, viewport.width, viewport.height]
    .every((value) => Number.isFinite(value) && value > 0)) return null;
  const scale = mode === 'width'
    ? viewport.width / content.width
    : Math.min(viewport.width / content.width, viewport.height / content.height);
  return Number.isFinite(scale) && scale > 0 ? scale : null;
}
