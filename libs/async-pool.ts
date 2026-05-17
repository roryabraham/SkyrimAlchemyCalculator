/**
 * Run async work over `items` with at most `concurrency` tasks in flight.
 * Result order matches `items` (index `itemIndex` maps to `items[itemIndex]`).
 */
export async function runPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const itemCount = items.length;
  const results = Array.from({ length: itemCount }) as R[];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const itemIndex = nextIndex++;
      if (itemIndex >= itemCount) {
        return;
      }
      results[itemIndex] = await fn(items[itemIndex]!, itemIndex);
    }
  }

  const workers = Math.min(concurrency, Math.max(1, itemCount));
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
