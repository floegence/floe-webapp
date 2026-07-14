import { createRoot, createSignal } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { createUIFirstSelection, type UIFirstSelectionPhase } from '../src/utils/uiFirstSelection';

describe('createUIFirstSelection', () => {
  it('presents intent before committing and content presentation', () => {
    const scheduled: Array<() => void> = [];
    const phases: UIFirstSelectionPhase[] = [];
    let dispose = () => undefined;

    createRoot((rootDispose) => {
      dispose = rootDispose;
      const [committed, setCommitted] = createSignal('files');
      const selection = createUIFirstSelection({
        committed,
        commit: setCommitted,
        scheduleAfterPaint: (callback) => scheduled.push(callback),
        onEvent: (event) => phases.push(event.phase),
      });

      selection.request('terminal');
      expect(selection.visual()).toBe('terminal');
      expect(selection.committed()).toBe('files');
      expect(selection.pending()).toBe(true);
      expect(phases).toEqual(['requested']);

      scheduled.shift()?.();
      expect(selection.committed()).toBe('terminal');
      expect(phases).toEqual(['requested', 'intent_presented', 'commit_started', 'committed']);

      scheduled.shift()?.();
      expect(selection.pending()).toBe(false);
      expect(phases.at(-1)).toBe('content_presented');
    });

    dispose();
  });

  it('cancels stale requests so only the latest target commits', () => {
    const scheduled: Array<() => void> = [];
    const commits = vi.fn();

    createRoot((dispose) => {
      const [committed, setCommitted] = createSignal('files');
      const selection = createUIFirstSelection({
        committed,
        commit: (value: string) => {
          commits(value);
          setCommitted(value);
        },
        scheduleAfterPaint: (callback) => scheduled.push(callback),
      });

      selection.request('terminal');
      selection.request('monitor');
      expect(selection.visual()).toBe('monitor');
      scheduled.splice(0).forEach((callback) => callback());
      scheduled.splice(0).forEach((callback) => callback());
      expect(commits).toHaveBeenCalledTimes(1);
      expect(commits).toHaveBeenCalledWith('monitor');
      dispose();
    });
  });

  it('supports pointer previews without changing canonical state', () => {
    createRoot((dispose) => {
      const [committed] = createSignal('one');
      const selection = createUIFirstSelection({ committed, commit: vi.fn() });
      selection.preview('two');
      expect(selection.visual()).toBe('two');
      expect(selection.committed()).toBe('one');
      selection.resetPreview();
      expect(selection.visual()).toBe('one');
      dispose();
    });
  });

  it('keeps pending intent when a derived canonical accessor reruns without changing value', () => {
    const scheduled: Array<() => void> = [];
    const phases: UIFirstSelectionPhase[] = [];

    createRoot((dispose) => {
      const [state, setState] = createSignal({ selected: 'files', revision: 0 });
      const selection = createUIFirstSelection({
        committed: () => state().selected,
        commit: (selected: string) => setState((current) => ({ ...current, selected })),
        scheduleAfterPaint: (callback) => scheduled.push(callback),
        onEvent: (event) => phases.push(event.phase),
      });

      selection.request('terminal');
      setState((current) => ({ ...current, revision: current.revision + 1 }));
      expect(selection.visual()).toBe('terminal');
      expect(selection.pending()).toBe(true);
      expect(phases).toEqual(['requested']);

      scheduled.shift()?.();
      scheduled.shift()?.();
      expect(selection.committed()).toBe('terminal');
      expect(selection.pending()).toBe(false);
      dispose();
    });
  });

  it('can defer activation side effects for a value that is already canonical', () => {
    const scheduled: Array<() => void> = [];
    const commit = vi.fn();

    createRoot((dispose) => {
      const [committed] = createSignal('files');
      const selection = createUIFirstSelection({
        committed,
        commit,
        commitEqualRequests: true,
        scheduleAfterPaint: (callback) => scheduled.push(callback),
      });

      selection.request('files');
      expect(selection.pending()).toBe(true);
      expect(commit).not.toHaveBeenCalled();
      scheduled.shift()?.();
      expect(commit).toHaveBeenCalledWith('files', undefined);
      dispose();
    });
  });
});
