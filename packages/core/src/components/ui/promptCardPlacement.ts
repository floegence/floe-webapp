export type PromptCardRegion = Readonly<{ x: number; y: number; width: number; height: number }>;

/** Keep a contextual editor near its anchor while avoiding the content it edits.
 * All inputs and results are viewport pixels; portal projection happens afterward.
 */
export function avoidPromptCardRegions(
  preferred: { x: number; y: number },
  { width, height }: { width: number; height: number },
  { left, top, right, bottom }: { left: number; top: number; right: number; bottom: number },
  regions: readonly PromptCardRegion[],
): { x: number; y: number } {
  const candidates = [[preferred.x, preferred.y], ...regions.flatMap(r => [
    [r.x + r.width + 12, r.y], [r.x - width - 12, r.y],
    [r.x, r.y + r.height + 12], [r.x, r.y - height - 12],
  ])].map(([x, y]) => ({ x: Math.max(left, Math.min(x, right - width)), y: Math.max(top, Math.min(y, bottom - height)) }));
  const overlap = (p: { x: number; y: number }) => regions.reduce((area, r) => area +
    Math.max(0, Math.min(p.x + width, r.x + r.width + 8) - Math.max(p.x, r.x - 8)) *
    Math.max(0, Math.min(p.y + height, r.y + r.height + 8) - Math.max(p.y, r.y - 8)), 0);
  // Stable order prefers the anchor, then the right/left/bottom/top edges.
  return candidates.sort((a, b) => overlap(a) - overlap(b))[0];
}
