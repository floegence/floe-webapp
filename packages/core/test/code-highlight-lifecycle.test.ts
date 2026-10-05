// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class TestWorker {
  static instances: TestWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  onmessageerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { TestWorker.instances.push(this); }
  complete() {
    const request = this.postMessage.mock.lastCall![0];
    this.onmessage?.({ data: { id: request.id, tokens: [{ start: 0, end: request.code.length, light: '#112233', dark: '#ddeeff' }] } });
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  TestWorker.instances = [];
  vi.stubGlobal('Worker', TestWorker);
  vi.stubGlobal('IntersectionObserver', undefined);
});
afterEach(() => {
  vi.useRealTimers(); vi.unstubAllGlobals(); document.body.replaceChildren();
  document.getSelection()?.removeAllRanges();
});
function element(source = 'const answer = 42;') {
  const code = document.createElement('code'); code.textContent = source; document.body.append(code); return code;
}

describe('code enhancement lifecycle', () => {
  it('serializes visible work and cancels queued and in-flight DOM owners', async () => {
    const { enhanceCodeBlock } = await import('../src/code-highlight');
    const first = element(); const second = element(); const third = element();
    const cancelFirst = enhanceCodeBlock(first, 'js');
    const cancelSecond = enhanceCodeBlock(second, 'js');
    const cancelThird = enhanceCodeBlock(third, 'js');
    const worker = TestWorker.instances[0];
    expect(TestWorker.instances).toHaveLength(1);
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    cancelFirst(); cancelSecond(); worker.complete(); await vi.advanceTimersByTimeAsync(0);
    expect(first.children).toHaveLength(0);
    expect(second.children).toHaveLength(0);
    expect(worker.postMessage).toHaveBeenCalledTimes(2);
    worker.complete();
    expect(third.textContent).toBe('const answer = 42;');
    expect(third.children).toHaveLength(1);
    cancelThird();
  });

  it.each(['error', 'messageerror', 'timeout'])('settles %s without retry loops or removing readable code', async (failure) => {
    const { enhanceCodeBlock } = await import('../src/code-highlight');
    const first = element(); const second = element();
    const cleanups = [enhanceCodeBlock(first, 'js'), enhanceCodeBlock(second, 'js')];
    const worker = TestWorker.instances[0];
    if (failure === 'error') worker.onerror!();
    else if (failure === 'messageerror') worker.onmessageerror!();
    else await vi.advanceTimersByTimeAsync(15_000);
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(first.textContent).toBe('const answer = 42;');
    expect(second.children).toHaveLength(0);
    const third = element(); cleanups.push(enhanceCodeBlock(third, 'js'));
    expect(TestWorker.instances).toHaveLength(1);
    expect(worker.postMessage).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    cleanups.forEach((cleanup) => cleanup());
  });

  it('discards replaced sources and releases deferred selection listeners', async () => {
    const { enhanceCodeBlock } = await import('../src/code-highlight');
    const code = element(); const cancel = enhanceCodeBlock(code, 'js');
    code.textContent = 'replaced'; TestWorker.instances[0].complete();
    expect(code.children).toHaveLength(0); cancel();
    const selected = element();
    const range = document.createRange(); range.selectNodeContents(selected); document.getSelection()!.addRange(range);
    const remove = vi.spyOn(document, 'removeEventListener');
    const cleanup = enhanceCodeBlock(selected, 'js'); TestWorker.instances[0].complete();
    expect(selected.children).toHaveLength(0);
    cleanup();
    expect(remove).toHaveBeenCalledWith('selectionchange', expect.any(Function));
    document.getSelection()!.removeAllRanges(); document.dispatchEvent(new Event('selectionchange'));
    expect(selected.children).toHaveLength(0);
  });

  it('limits queued work and never parses plain or oversized code', async () => {
    const { enhanceCodeBlock } = await import('../src/code-highlight');
    const cleanups = [enhanceCodeBlock(element('x'.repeat(32_769)), 'js'), enhanceCodeBlock(element(), '')];
    expect(TestWorker.instances).toHaveLength(0);
    for (let i = 0; i < 140; i++) cleanups.push(enhanceCodeBlock(element(), 'js'));
    const worker = TestWorker.instances[0];
    for (let i = 0; i < 140; i++) { worker.complete(); await vi.advanceTimersByTimeAsync(0); }
    expect(worker.postMessage).toHaveBeenCalledTimes(129);
    cleanups.forEach((cleanup) => cleanup());
  });
});
