export type PromptCardRegion = Readonly<{ x: number; y: number; width: number; height: number }>;

/** Keep a contextual editor near its anchor while avoiding the content it edits.
 * All inputs and results are viewport pixels; portal projection happens afterward.
 */
export function avoidPromptCardRegions(
  preferred: { x: number; y: number },
  size: { width: number; height: number },
  boundary: { left: number; top: number; right: number; bottom: number },
  regions: readonly PromptCardRegion[],
): { x: number; y: number } {
  const valid = regions.filter(r => [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.width >= 0 && r.height >= 0);
  if (!valid.length) return preferred;
  const clamp = (p: { x: number; y: number }) => ({
    x: Math.max(boundary.left, Math.min(p.x, boundary.right - size.width)),
    y: Math.max(boundary.top, Math.min(p.y, boundary.bottom - size.height)),
  });
  const candidates = [preferred, ...valid.flatMap(r => [
    { x: r.x + r.width + 12, y: r.y },
    { x: r.x - size.width - 12, y: r.y },
    { x: r.x, y: r.y + r.height + 12 },
    { x: r.x, y: r.y - size.height - 12 },
  ]), ...[boundary.left, boundary.right - size.width].flatMap(x =>
    [boundary.top, boundary.bottom - size.height].map(y => ({ x, y })))].map(clamp);
  const overlap = (p: { x: number; y: number }) => valid.reduce((area, r) => area +
    Math.max(0, Math.min(p.x + size.width, r.x + r.width + 8) - Math.max(p.x, r.x - 8)) *
    Math.max(0, Math.min(p.y + size.height, r.y + r.height + 8) - Math.max(p.y, r.y - 8)), 0);
  return candidates.sort((a, b) => overlap(a) - overlap(b) ||
    Math.hypot(a.x - preferred.x, a.y - preferred.y) - Math.hypot(b.x - preferred.x, b.y - preferred.y))[0];
}
