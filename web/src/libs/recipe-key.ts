import type { Recipe } from "./types.ts";

/** Stable key for a recipe row (matches list rendering / brew flash). */
export function recipeKey(rec: Recipe): string {
  const ids = rec.ingredients.map((ing) => ing.id).join("-");
  return `${rec.sharedBlend}-${rec.mixtureKind}-${rec.dominantEffectKey}-${ids}-${rec.totalGold}`;
}
