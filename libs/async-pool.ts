/**
 * Run async work over `items` with at most `concurrency` tasks in flight.
 * Result order matches `items` (index `i` maps to `items[i]`).
 */
export async function runPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const n = items.length;
  const results = Array.from({ length: n }) as R[];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = nextIndex++;
      if (i >= n) return;
      results[i] = await fn(items[i]!, i);
    }
  }

  const workers = Math.min(concurrency, Math.max(1, n));
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
