/**
 * Retry with exponential backoff for external API calls.
 *
 * Usage:
 *   const result = await retryWithBackoff(() => fetch(url).then(r => r.json()));
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: any) => boolean;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 10_000,
    shouldRetry = () => true,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        break;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * baseDelayMs,
        maxDelayMs,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Batch processor with concurrency limit.
 *
 * Usage:
 *   await batchWithLimit(items, async (item) => processItem(item), 5);
 */
export async function batchWithLimit<T, R>(
  items: T[],
  handler: (item: T) => Promise<R>,
  concurrency: number = 5,
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = handler(item)
      .then((result) => {
        results.push(result);
      })
      .catch((error) => {
        console.error('[batchWithLimit] Item failed:', error?.message);
      });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove settled promises
      for (let i = executing.length - 1; i >= 0; i--) {
        const settled = await Promise.race([
          executing[i].then(() => true),
          Promise.resolve(false),
        ]);
        if (settled) executing.splice(i, 1);
      }
    }
  }

  await Promise.all(executing);
  return results;
}
