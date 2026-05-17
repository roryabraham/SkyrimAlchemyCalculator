import type { IngredientHit } from "./types.ts";

export async function fetchIngredients(q: string): Promise<IngredientHit[]> {
  if (!q.trim()) return [];
  const r = await fetch(`/api/ingredients?q=${encodeURIComponent(q.trim())}`);
  if (!r.ok) throw new Error("Search failed");
  return (await r.json()) as IngredientHit[];
}

/** Like `fetchIngredients` but never throws (for autocomplete outside try/catch). */
export async function fetchIngredientsForAutocomplete(q: string): Promise<IngredientHit[]> {
  try {
    return await fetchIngredients(q);
  } catch {
    return [];
  }
}
