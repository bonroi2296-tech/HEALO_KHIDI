import { describe, it, expect } from 'vitest';
import { retryWithBackoff, batchWithLimit } from './retry';

describe('retryWithBackoff', () => {
  it('returns result on first success', async () => {
    const result = await retryWithBackoff(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
  });

  it('retries on failure and succeeds', async () => {
    let attempt = 0;
    const fn = () => {
      attempt++;
      if (attempt < 3) throw new Error('fail');
      return Promise.resolve('success');
    };

    const result = await retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 10 });
    expect(result).toBe('success');
    expect(attempt).toBe(3);
  });

  it('throws after max retries', async () => {
    const fn = () => Promise.reject(new Error('always fails'));

    await expect(
      retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 10 })
    ).rejects.toThrow('always fails');
  });

  it('respects shouldRetry', async () => {
    let attempt = 0;
    const fn = () => {
      attempt++;
      throw new Error('stop');
    };

    await expect(
      retryWithBackoff(fn, {
        maxRetries: 5,
        baseDelayMs: 10,
        shouldRetry: () => false,
      })
    ).rejects.toThrow('stop');
    expect(attempt).toBe(1);
  });
});

describe('batchWithLimit', () => {
  it('processes all items', async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await batchWithLimit(
      items,
      async (item) => item * 2,
      2,
    );
    expect(results).toHaveLength(5);
    expect(results.sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10]);
  });

  it('handles empty array', async () => {
    const results = await batchWithLimit([], async () => 'x', 3);
    expect(results).toHaveLength(0);
  });
});
