/** Classic Levenshtein distance (insert / delete / substitute), for fuzzy matching. */
export function levenshtein(source: string, target: string): number {
  const sourceLen = source.length;
  const targetLen = target.length;
  if (sourceLen === 0) {
    return targetLen;
  }
  if (targetLen === 0) {
    return sourceLen;
  }
  const v0 = new Int32Array(targetLen + 1);
  for (let targetCol = 0; targetCol <= targetLen; targetCol++) {
    v0[targetCol] = targetCol;
  }
  const v1 = new Int32Array(targetLen + 1);
  for (let sourceRow = 0; sourceRow < sourceLen; sourceRow++) {
    v1[0] = sourceRow + 1;
    for (let targetCol = 0; targetCol < targetLen; targetCol++) {
      const cost = source.charCodeAt(sourceRow) === target.charCodeAt(targetCol) ? 0 : 1;
      v1[targetCol + 1] = Math.min(v1[targetCol] + 1, v0[targetCol + 1] + 1, v0[targetCol] + cost);
    }
    for (let targetCol = 0; targetCol <= targetLen; targetCol++) {
      v0[targetCol] = v1[targetCol]!;
    }
  }
  return v0[targetLen]!;
}
