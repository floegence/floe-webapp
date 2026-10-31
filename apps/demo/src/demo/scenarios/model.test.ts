import { describe, expect, it } from 'vitest';
import { deploymentBuckets, deploymentsInRange, summarize, taskStep, trend } from './model';

describe('deterministic scenario contracts', () => {
  it('separates a numeric decrease from improvement', () => {
    expect(trend(42, 50, 'lower')).toEqual({
      change: -8,
      direction: 'down',
      assessment: 'improved',
    });
    expect(trend(2, 4, 'lower').assessment).toBe('improved');
    expect(trend(12, 10, 'neutral').assessment).toBe('neutral');
    expect(trend(98, 99, 'higher').assessment).toBe('worsened');
    expect(trend(4, 4, 'lower').direction).toBe('flat');
  });
  it.each([7, 30, 90] as const)(
    'uses the same %d-day data for metrics, chart and comparison',
    (days) => {
      const current = deploymentsInRange(days);
      const previous = deploymentsInRange(days, true);
      expect(deploymentBuckets(days).reduce((sum, bucket) => sum + bucket.value, 0)).toBe(
        current.length
      );
      expect(current.some((row) => previous.some((other) => row.id === other.id))).toBe(false);
      expect(previous.length).toBeGreaterThan(0);
      expect(summarize(current).failed).toBe(
        current.filter((row) => row.status === 'Failed').length
      );
    }
  );
  it('keeps cancelled and failed work terminal until explicitly restarted', () => {
    expect(taskStep('cancelled', 2, false)).toEqual({ status: 'cancelled', completed: 2 });
    expect(taskStep('running', 2, true)).toEqual({ status: 'failed', completed: 2 });
    expect(taskStep('failed', 2, false).status).toBe('failed');
    expect(taskStep('running', 3, false)).toEqual({ status: 'succeeded', completed: 4 });
  });
});
