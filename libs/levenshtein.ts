/** Classic Levenshtein distance (insert / delete / substitute), for fuzzy matching. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) {
    return n;
  }
  if (n === 0) {
    return m;
  }
  const v0 = new Int32Array(n + 1);
  for (let j = 0; j <= n; j++) {
    v0[j] = j;
  }
  const v1 = new Int32Array(n + 1);
  for (let i = 0; i < m; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < n; j++) {
      const cost = a.charCodeAt(i) === b.charCodeAt(j) ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= n; j++) {
      v0[j] = v1[j]!;
    }
  }
  return v0[n]!;
}
