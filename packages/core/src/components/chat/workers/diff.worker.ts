import type { DiffWorkerRequest, DiffWorkerResponse } from '../types';
import { computeCodeDiffModel } from '../diff/diffModel';

postMessage({ type: 'ready' });

addEventListener('message', (e: MessageEvent<DiffWorkerRequest>) => {
  const { id, oldCode, newCode } = e.data;
  try {
    const model = computeCodeDiffModel(oldCode, newCode);
    const msg: DiffWorkerResponse = { id, model };
    postMessage(msg);
  } catch (err) {
    const msg: DiffWorkerResponse = {
      id,
      model: { unifiedLines: [], split: { left: [], right: [] }, stats: { added: 0, removed: 0 } },
      error: err instanceof Error ? err.message : 'Failed to compute diff',
    };
    postMessage(msg);
  }
});

