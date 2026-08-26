import type { WorkbenchSelection } from './types';

export type WorkbenchDockFocusCandidate = Readonly<{
  kind: WorkbenchSelection['kind'];
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAtUnixMs: number;
}>;

export type WorkbenchDockFocusCycleSession = Readonly<{
  dockItemKey: string;
  candidateSignature: string;
  targetKey: string;
}>;

export type WorkbenchDockFocusCycleResolution = Readonly<{
  orderedCandidates: readonly WorkbenchDockFocusCandidate[];
  target: WorkbenchDockFocusCandidate | null;
  currentIndex: number | null;
  session: WorkbenchDockFocusCycleSession | null;
}>;

export function workbenchDockFocusCandidateKey(
  candidate: Pick<WorkbenchDockFocusCandidate, 'kind' | 'id'>
): string {
  return `${candidate.kind}:${candidate.id}`;
}

function compareStableText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function compareWorkbenchDockFocusCandidates(
  left: WorkbenchDockFocusCandidate,
  right: WorkbenchDockFocusCandidate
): number {
  return (
    left.y - right.y ||
    left.x - right.x ||
    left.createdAtUnixMs - right.createdAtUnixMs ||
    compareStableText(left.id, right.id)
  );
}

export function sortWorkbenchDockFocusCandidates(
  candidates: readonly WorkbenchDockFocusCandidate[]
): readonly WorkbenchDockFocusCandidate[] {
  return [...candidates].sort(compareWorkbenchDockFocusCandidates);
}

export function resolveWorkbenchDockFocusCycle(
  options: Readonly<{
    dockItemKey: string;
    candidates: readonly WorkbenchDockFocusCandidate[];
    selectedObject: WorkbenchSelection | null;
    session: WorkbenchDockFocusCycleSession | null;
  }>
): WorkbenchDockFocusCycleResolution {
  const orderedCandidates = sortWorkbenchDockFocusCandidates(options.candidates);
  if (orderedCandidates.length === 0) {
    return {
      orderedCandidates,
      target: null,
      currentIndex: null,
      session: null,
    };
  }

  const orderedKeys = orderedCandidates.map(workbenchDockFocusCandidateKey);
  const candidateSignature = orderedKeys.join('\u0000');
  const selectedKey = options.selectedObject
    ? workbenchDockFocusCandidateKey(options.selectedObject)
    : null;
  const sessionContinues =
    options.session?.dockItemKey === options.dockItemKey &&
    options.session.candidateSignature === candidateSignature &&
    options.session.targetKey === selectedKey;
  const selectedIndex = selectedKey ? orderedKeys.indexOf(selectedKey) : -1;
  const targetIndex = sessionContinues
    ? (orderedKeys.indexOf(options.session!.targetKey) + 1) % orderedCandidates.length
    : selectedIndex >= 0
      ? selectedIndex
      : 0;
  const target = orderedCandidates[targetIndex] ?? null;
  const targetKey = target ? workbenchDockFocusCandidateKey(target) : '';

  return {
    orderedCandidates,
    target,
    currentIndex: target ? targetIndex : null,
    session: target
      ? {
          dockItemKey: options.dockItemKey,
          candidateSignature,
          targetKey,
        }
      : null,
  };
}
