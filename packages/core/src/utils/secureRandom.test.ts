import { afterEach, describe, expect, it, vi } from 'vitest';
import { secureRandomUUID } from './secureRandom';

afterEach(() => vi.unstubAllGlobals());

describe('secureRandomUUID', () => {
  it('creates distinct RFC 9562 UUIDs with only the HTTP CSPRNG available', () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto);
    vi.stubGlobal('crypto', { getRandomValues });
    const values = Array.from({ length: 256 }, () => secureRandomUUID());
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) {
      expect(value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
      );
    }
  });

  it('does not replace missing secure entropy with weak random numbers', () => {
    vi.stubGlobal('crypto', {});
    expect(secureRandomUUID).toThrow('Cryptographically secure random values are unavailable');
  });
});
