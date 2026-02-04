import { diffLines, type Change } from 'diff';
import type { CodeDiffRenderModel, SplitDiffLine, UnifiedDiffLine } from '../types';

function splitLines(value: string): string[] {
  const lines = value.split('\n');
  // Drop the trailing empty line produced by a final newline.
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function changeType(change: Change): UnifiedDiffLine['type'] {
  if (change.added) return 'added';
  if (change.removed) return 'removed';
  return 'context';
}

export function computeCodeDiffModel(oldCode: string, newCode: string): CodeDiffRenderModel {
  const changes = diffLines(oldCode, newCode);

  const unifiedLines: UnifiedDiffLine[] = [];
  const splitLeft: SplitDiffLine[] = [];
  const splitRight: SplitDiffLine[] = [];

  let unifiedLineNumber = 0;
  let oldLineNumber = 0;
  let newLineNumber = 0;

  let added = 0;
  let removed = 0;

  for (const change of changes) {
    const type = changeType(change);
    const lines = splitLines(change.value);

    if (type === 'added') added += lines.length;
    if (type === 'removed') removed += lines.length;

    for (const line of lines) {
      // Unified
      if (type === 'context') unifiedLineNumber += 1;
      unifiedLines.push({
        type,
        sign: type === 'added' ? '+' : type === 'removed' ? '-' : ' ',
        lineNumber: type === 'context' ? unifiedLineNumber : null,
        content: line || ' ',
      });

      // Split
      if (type === 'added') {
        newLineNumber += 1;
        splitLeft.push({ type: 'empty', content: '', lineNumber: null });
        splitRight.push({ type: 'added', content: line || ' ', lineNumber: newLineNumber });
        continue;
      }
      if (type === 'removed') {
        oldLineNumber += 1;
        splitLeft.push({ type: 'removed', content: line || ' ', lineNumber: oldLineNumber });
        splitRight.push({ type: 'empty', content: '', lineNumber: null });
        continue;
      }

      // context
      oldLineNumber += 1;
      newLineNumber += 1;
      splitLeft.push({ type: 'context', content: line || ' ', lineNumber: oldLineNumber });
      splitRight.push({ type: 'context', content: line || ' ', lineNumber: newLineNumber });
    }
  }

  return {
    unifiedLines,
    split: { left: splitLeft, right: splitRight },
    stats: { added, removed },
  };
}

