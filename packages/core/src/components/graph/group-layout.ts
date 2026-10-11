import type { GraphGroupLayout, GraphLayoutNode, GraphLayoutOptions, GraphPoint } from './types';

/** Pack complete child subtrees in submitted order, without using edges as ranks. */
export function arrangeGroupMembers(
  members: readonly GraphLayoutNode[],
  rule: GraphGroupLayout,
  padding: NonNullable<GraphLayoutOptions['groupPadding']>,
  spacing: number,
  translate: (node: GraphLayoutNode, dx: number, dy: number) => void,
  origin: GraphPoint = { x: 0, y: 0 }
): { width: number; height: number } {
  const row = rule.flow === 'row';
  const limit = rule.maxPerLine ?? Math.max(1, members.length);
  let cross = 0,
    extent = 0;
  for (let start = 0; start < members.length; start += limit) {
    const line = members.slice(start, start + limit);
    let along = 0,
      crossSize = 0;
    for (const member of line) {
      translate(
        member,
        origin.x + padding.left + (row ? along : cross) - member.x,
        origin.y + padding.top + (row ? cross : along) - member.y
      );
      along += (row ? member.width : member.height) + spacing;
      crossSize = Math.max(crossSize, row ? member.height : member.width);
    }
    extent = Math.max(extent, along - spacing);
    cross += crossSize + spacing;
  }
  cross = Math.max(0, cross - spacing);
  return {
    width: padding.left + (row ? extent : cross) + padding.right,
    height: padding.top + (row ? cross : extent) + padding.bottom,
  };
}
