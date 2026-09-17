import { describe, expect, it } from 'vitest';
import { calculateFitScale } from '../src/utils/fitScale';

describe('calculateFitScale', () => {
  it('enlarges content and limits the height only in contain mode', () => {
    const dimensions = { content: { width: 600, height: 400 }, viewport: { width: 1200, height: 600 } };
    expect(calculateFitScale({ ...dimensions, mode: 'contain' })).toBe(1.5);
    expect(calculateFitScale({ ...dimensions, mode: 'width' })).toBe(2);
  });
  it('preserves tiny scales without rounding to zero', () => {
    expect(calculateFitScale({ content: { width: 1e6, height: 1e6 }, viewport: { width: 10, height: 20 }, mode: 'contain' })).toBe(0.00001);
  });
  it.each([0, -1, NaN, Infinity])('waits for usable dimensions (%s)', (value) => {
    expect(calculateFitScale({ content: { width: value, height: 100 }, viewport: { width: 100, height: 100 }, mode: 'width' })).toBeNull();
    expect(calculateFitScale({ content: { width: 100, height: 100 }, viewport: { width: 100, height: value }, mode: 'contain' })).toBeNull();
  });
});
