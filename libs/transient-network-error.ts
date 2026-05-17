export function isAbortError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const name = "name" in e ? String((e as { name: unknown }).name) : "";
  if (name === "AbortError") return true;
  const msg = "message" in e ? String((e as { message: unknown }).message) : "";
  return /aborted/i.test(msg);
}

/** Heuristic: timeouts, rate limits, and common transport failures. */
export function isLikelyTransientNetworkError(e: unknown): boolean {
  if (isAbortError(e)) return true;
  const msg = e instanceof Error ? e.message : String(e);
  if (/HTTP (408|429|500|502|503|504)/.test(msg)) return true;
  if (/rate|throttl|too many|busy/i.test(msg)) return true;
  if (/fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket/i.test(msg)) return true;
  return false;
}
