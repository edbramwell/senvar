export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const defaultOptions: Required<RetryOptions> = {
  attempts: 5,
  baseDelayMs: 200,
  maxDelayMs: 2_000,
};

export async function retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt < opts.attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === opts.attempts - 1) break;

      const jitter = Math.random() * opts.baseDelayMs;
      const delay = Math.min(opts.baseDelayMs * 2 ** attempt + jitter, opts.maxDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

