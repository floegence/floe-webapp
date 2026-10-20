import { describe, expect, it } from 'vitest';
import { createVirtualListLayout } from '../src/components/chat/hooks/virtualListLayout';

describe('stable virtual list geometry', () => {
  it('preserves measured identities and reading anchors across prepend and eviction', () => {
    const layout = createVirtualListLayout(80);
    layout.reset(['a', 'b', 'c'], () => 80);
    layout.measure('b', 140);
    const anchor = layout.anchor(100)!;
    expect(anchor).toEqual({ key: 'b', offset: 20 });
    layout.reset(['previous', 'a', 'b', 'c'], () => 80);
    expect(layout.offset(anchor)).toBe(180);
    expect(layout.item(2)?.size).toBe(140);
    layout.reset(['b', 'c', 'next'], () => 80);
    expect(layout.offset(anchor)).toBe(20);
    expect(layout.measuredCount()).toBe(1);
    layout.reset(['c', 'next'], () => 80);
    expect(layout.offset(anchor)).toBeUndefined();
    expect(layout.measuredCount()).toBe(0);
  });

  it('rejects duplicate keys without changing accepted geometry', () => {
    const layout = createVirtualListLayout(10);
    layout.reset(['a', 'b'], () => 10);
    expect(() => layout.reset(['a', 'a'], () => 99)).toThrow('unique');
    expect(layout.total()).toBe(20);
    expect(layout.item(1)?.key).toBe('b');
  });

  it('handles empty, boundary and non-finite geometry deterministically', () => {
    const layout = createVirtualListLayout(NaN);
    expect(layout.range(0, 100)).toEqual({ start: 0, end: 0 });
    expect(layout.anchor(0)).toBeUndefined();
    layout.reset(['a', 'b'], () => NaN);
    expect(layout.total()).toBe(160);
    expect(layout.range(80, 0)).toEqual({ start: 1, end: 2 });
    expect(layout.range(-5, Infinity, NaN)).toEqual({ start: 0, end: 1 });
    expect(layout.anchor(NaN)).toEqual({ key: 'a', offset: 0 });
    expect(layout.offset({ key: 'b', offset: NaN })).toBe(80);
    expect(layout.prefix(Infinity)).toBe(160);
    expect(layout.prefix(NaN)).toBe(0);
    expect(layout.item(-1)).toBeUndefined();
    expect(layout.measure('evicted', 100)).toBe(false);
  });

  it('matches a linear oracle across keyed windows and repeated measurements', () => {
    const layout = createVirtualListLayout(80);
    let seed = 273198;
    const random = (n: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % n;
    };
    const measured = new Map<string, number>();
    for (let round = 0; round < 300; round++) {
      const first = random(500);
      const keys = Array.from({ length: 1 + random(450) }, (_, i) => String(first + i));
      for (const key of measured.keys()) if (!keys.includes(key)) measured.delete(key);
      layout.reset(keys, () => 80);
      for (let sample = 0; sample < 30; sample++) {
        const key = keys[random(keys.length)]!;
        const height = 1 + random(1000);
        measured.set(key, height);
        layout.measure(key, height);
        const sizes = keys.map((item) => measured.get(item) ?? 80);
        const prefixes = [0];
        for (const size of sizes) prefixes.push(prefixes[prefixes.length - 1]! + size);
        const sum = (n: number) => prefixes[n]!;
        const top = random(sum(sizes.length) + 100);
        const heightViewport = random(800);
        const locate = (offset: number) => {
          let i = 0;
          while (i < keys.length - 1 && sum(i + 1) <= offset) i++;
          return i;
        };
        expect(layout.total()).toBe(sum(sizes.length));
        expect(layout.range(top, heightViewport, 2)).toEqual({
          start: Math.max(0, locate(top) - 2),
          end: Math.min(keys.length, locate(top + heightViewport) + 3),
        });
        const anchor = layout.anchor(top)!;
        expect(layout.offset(anchor)).toBe(Math.min(top, sum(sizes.length)));
      }
    }
  });
});
