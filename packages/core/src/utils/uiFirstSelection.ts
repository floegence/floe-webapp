import { createEffect, createSignal, onCleanup, untrack, type Accessor } from 'solid-js';
import { deferAfterPaint } from './defer';

export type UIFirstSelectionPhase =
  | 'requested'
  | 'intent_presented'
  | 'commit_started'
  | 'committed'
  | 'content_presented'
  | 'cancelled';

export interface UIFirstSelectionEvent<T, M = undefined> {
  phase: UIFirstSelectionPhase;
  value: T;
  metadata: M | undefined;
  transactionId: number;
  startedAt: number;
  timestamp: number;
  elapsedMs: number;
}

export interface CreateUIFirstSelectionOptions<T, M = undefined> {
  committed: Accessor<T>;
  commit: (value: T, metadata: M | undefined) => void;
  equals?: (left: T, right: T) => boolean;
  onEvent?: (event: UIFirstSelectionEvent<T, M>) => void;
  scheduleAfterPaint?: (callback: () => void) => void;
}

export interface UIFirstSelectionController<T, M = undefined> {
  visual: Accessor<T>;
  committed: Accessor<T>;
  pending: Accessor<boolean>;
  preview: (value: T) => void;
  resetPreview: () => void;
  request: (value: T, metadata?: M) => void;
  commitNow: (value: T, metadata?: M) => void;
  cancel: () => void;
}

type SelectionTransaction<T, M> = {
  id: number;
  value: T;
  metadata: M | undefined;
  startedAt: number;
  committing: boolean;
};

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export function createUIFirstSelection<T, M = undefined>(
  options: CreateUIFirstSelectionOptions<T, M>,
): UIFirstSelectionController<T, M> {
  const equals = options.equals ?? Object.is;
  const scheduleAfterPaint = options.scheduleAfterPaint ?? deferAfterPaint;
  const [visual, setVisual] = createSignal<T>(untrack(options.committed), { equals });
  const [pending, setPending] = createSignal(false);
  let transaction: SelectionTransaction<T, M> | null = null;
  let nextTransactionId = 1;
  let disposed = false;
  let previewed = false;

  const emit = (phase: UIFirstSelectionPhase, current: SelectionTransaction<T, M>) => {
    const timestamp = now();
    options.onEvent?.({
      phase,
      value: current.value,
      metadata: current.metadata,
      transactionId: current.id,
      startedAt: current.startedAt,
      timestamp,
      elapsedMs: Math.max(0, timestamp - current.startedAt),
    });
  };

  const cancelTransaction = (resetVisual: boolean) => {
    const current = transaction;
    transaction = null;
    previewed = false;
    setPending(false);
    if (current) emit('cancelled', current);
    if (resetVisual && !disposed) setVisual(() => options.committed());
  };

  const request = (value: T, metadata?: M) => {
    if (disposed) return;
    if (transaction) cancelTransaction(false);
    previewed = false;
    setVisual(() => value);

    if (equals(value, options.committed())) {
      setPending(false);
      return;
    }

    const current: SelectionTransaction<T, M> = {
      id: nextTransactionId,
      value,
      metadata,
      startedAt: now(),
      committing: false,
    };
    nextTransactionId += 1;
    transaction = current;
    setPending(true);
    emit('requested', current);

    scheduleAfterPaint(() => {
      if (disposed || transaction !== current) return;
      emit('intent_presented', current);
      emit('commit_started', current);
      current.committing = true;
      options.commit(current.value, current.metadata);
      current.committing = false;
      if (disposed || transaction !== current) return;
      emit('committed', current);

      scheduleAfterPaint(() => {
        if (disposed || transaction !== current) return;
        emit('content_presented', current);
        transaction = null;
        setPending(false);
        setVisual(() => options.committed());
      });
    });
  };

  const commitNow = (value: T, metadata?: M) => {
    if (disposed) return;
    cancelTransaction(false);
    previewed = false;
    setVisual(() => value);
    if (!equals(value, options.committed())) options.commit(value, metadata);
    setVisual(() => options.committed());
  };

  createEffect(() => {
    const canonical = options.committed();
    const current = transaction;
    if (current && current.committing && equals(canonical, current.value)) return;
    if (current && !equals(canonical, current.value)) {
      cancelTransaction(false);
    }
    if (!transaction || !equals(canonical, transaction.value)) {
      previewed = false;
      setVisual(() => canonical);
    }
  });

  onCleanup(() => {
    disposed = true;
    cancelTransaction(false);
  });

  return {
    visual,
    committed: options.committed,
    pending,
    preview: (value: T) => {
      if (disposed || transaction) return;
      previewed = true;
      setVisual(() => value);
    },
    resetPreview: () => {
      if (disposed || !previewed || transaction) return;
      previewed = false;
      setVisual(() => options.committed());
    },
    request,
    commitNow,
    cancel: () => cancelTransaction(true),
  };
}
