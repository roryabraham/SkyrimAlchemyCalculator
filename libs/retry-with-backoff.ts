import { sleep } from "./sleep.ts";

export type RetryWithBackoffOptions = {
  maxAttempts: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  /** When false, the error is rethrown immediately. */
  shouldRetry: (error: unknown) => boolean;
  /** Called after a failed attempt, before sleeping (not called on the final failure). */
  onRetry?: (ctx: {
    attempt: number;
    maxAttempts: number;
    backoffMs: number;
    label: string | undefined;
    error: unknown;
  }) => void;
};

/**
 * Retry `fn` with exponential backoff between attempts.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: RetryWithBackoffOptions & { label?: string },
): Promise<T> {
  let backoff = opts.initialBackoffMs;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error;
      }
      opts.onRetry?.({
        attempt,
        maxAttempts: opts.maxAttempts,
        backoffMs: backoff,
        label: opts.label,
        error: error,
      });
      await sleep(backoff);
      backoff = Math.min(opts.maxBackoffMs, Math.floor(backoff * opts.backoffMultiplier));
    }
  }
  throw new Error("retryWithBackoff: unreachable");
}
