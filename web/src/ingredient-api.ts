import type { IngredientHit } from "./types.ts";

export async function fetchIngredients(q: string): Promise<IngredientHit[]> {
  if (!q.trim()) return [];
  const r = await fetch(
    `/api/ingredients?q=${encodeURIComponent(q.trim())}`,
  );
  if (!r.ok) throw new Error("Search failed");
  return (await r.json()) as IngredientHit[];
}
