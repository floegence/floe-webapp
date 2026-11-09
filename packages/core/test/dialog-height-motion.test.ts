import { afterEach, expect, it, vi } from 'vitest';
import { observeDialogHeight } from '../src/components/ui/dialogHeightMotion';

afterEach(() => vi.unstubAllGlobals());

it('does not replay rounded layout height against fractional observer height', () => {
  let notify!: ResizeObserverCallback;
  const observe = vi.fn();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { notify = callback; }
    observe = observe;
    unobserve() {}
    disconnect() {}
  });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  let height = 101;
  let finish!: () => void;
  const animate = vi.fn(() => ({
    addEventListener: (_type: string, callback: () => void) => { finish = callback; },
    cancel: vi.fn(),
  }));
  const element = { get offsetHeight() { return height; }, animate, getAnimations: () => [], style: { willChange: '' } } as unknown as HTMLElement;
  const dispose = observeDialogHeight(element);
  const report = (blockSize: number) => notify([{ borderBoxSize: [{ blockSize }] } as unknown as ResizeObserverEntry], {} as ResizeObserver);
  try {
    report(100.5);
    expect(animate).not.toHaveBeenCalled();
    height = 201; report(200.5);
    expect(animate).toHaveBeenCalledOnce();
    finish(); report(200.5);
    expect(animate).toHaveBeenCalledOnce();
    expect(element.style.willChange).toBe('');
  } finally { dispose(); }
});
