export function isAbortError(maybeError: unknown): boolean {
  if (typeof maybeError !== "object" || maybeError === null) {
    return false;
  }
  const name = "name" in maybeError ? String((maybeError as { name: unknown }).name) : "";
  if (name === "AbortError") {
    return true;
  }
  const msg = "message" in maybeError ? String((maybeError as { message: unknown }).message) : "";
  return /aborted/i.test(msg);
}

/** Heuristic: timeouts, rate limits, and common transport failures. */
export function isLikelyTransientNetworkError(maybeError: unknown): boolean {
  if (isAbortError(maybeError)) {
    return true;
  }
  const msg = maybeError instanceof Error ? maybeError.message : String(maybeError);
  if (/HTTP (408|429|500|502|503|504)/.test(msg)) {
    return true;
  }
  if (/rate|throttl|too many|busy/i.test(msg)) {
    return true;
  }
  if (/fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket/i.test(msg)) {
    return true;
  }
  return false;
}
