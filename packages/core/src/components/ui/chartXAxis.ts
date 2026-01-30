export interface ComputeAutoMaxXAxisLabelsOptions {
  labels: string[];
  /** SVG viewBox width (user units). */
  viewBoxWidth: number;
  /** Actual rendered width (CSS px). Used to account for viewBox scaling on narrow containers. */
  viewportWidthPx?: number;
  /** Chart padding in viewBox units (must match the chart layout). */
  padding: { left: number; right: number };

  /** Axis label font size in px (defaults to 10, matches .chart-axis-label). */
  axisFontSizePx?: number;
  /** Average character width factor relative to font size (defaults to 0.6). */
  avgCharWidthFactor?: number;
  /** Minimum gap between two labels in px (defaults to 6). */
  minGapPx?: number;
}

/**
 * Compute a reasonable max number of x-axis labels to avoid overlap on narrow widths.
 *
 * Returns:
 * - undefined: no need to cull labels (show all), or insufficient info to compute.
 * - number: suggested max label count (2..labels.length).
 */
export function computeAutoMaxXAxisLabels(options: ComputeAutoMaxXAxisLabelsOptions): number | undefined {
  const labels = options.labels;
  const n = labels.length;
  if (n <= 2) return undefined;

  const viewBoxWidth = options.viewBoxWidth;
  if (!Number.isFinite(viewBoxWidth) || viewBoxWidth <= 0) return undefined;

  const paddingLeft = options.padding.left;
  const paddingRight = options.padding.right;
  const innerViewWidth = viewBoxWidth - paddingLeft - paddingRight;
  if (!Number.isFinite(innerViewWidth) || innerViewWidth <= 0) return undefined;

  const viewportWidthPx = options.viewportWidthPx;
  const scale =
    typeof viewportWidthPx === 'number' && Number.isFinite(viewportWidthPx) && viewportWidthPx > 0
      ? Math.min(1, viewportWidthPx / viewBoxWidth)
      : 1;

  const innerPxWidth = innerViewWidth * scale;

  let maxLen = 0;
  for (const label of labels) {
    if (!label) continue;
    if (label.length > maxLen) maxLen = label.length;
  }
  if (maxLen <= 0) return undefined;

  const axisFontSizePx = options.axisFontSizePx ?? 10;
  const avgCharWidthFactor = options.avgCharWidthFactor ?? 0.6;
  const minGapPx = options.minGapPx ?? 6;

  const estimatedLabelWidthPx = maxLen * axisFontSizePx * avgCharWidthFactor;
  const minSpacingPx = estimatedLabelWidthPx + minGapPx;

  // If even spacing between points is enough, keep all labels (preserves previous behavior on wide charts).
  const pointSpacingPx = innerPxWidth / Math.max(1, n - 1);
  if (pointSpacingPx >= minSpacingPx) return undefined;

  // Otherwise, compute a max label count that implies a minimum index step between labels.
  // Using an index step avoids rounding artifacts (e.g. evenly-picked indices collapsing to adjacent ticks).
  const minIndexStep = Math.max(1, Math.ceil(minSpacingPx / Math.max(1, pointSpacingPx)));
  const max = Math.floor((n - 1) / minIndexStep) + 1;
  return Math.max(2, Math.min(n, max));
}
