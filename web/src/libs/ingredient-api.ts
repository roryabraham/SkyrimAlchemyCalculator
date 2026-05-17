import type { IngredientHit } from "./types.ts";

export async function fetchIngredients(query: string): Promise<IngredientHit[]> {
  if (!query.trim()) {
    return [];
  }
  const response = await fetch(`/api/ingredients?q=${encodeURIComponent(query.trim())}`);
  if (!response.ok) {
    throw new Error(`Search failed (${response.status})`);
  }
  return (await response.json()) as IngredientHit[];
}
