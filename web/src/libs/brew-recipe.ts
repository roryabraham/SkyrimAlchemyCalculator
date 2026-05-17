import type { InventoryRow, Recipe } from "./types.ts";
import { uid } from "./uid.ts";

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function rowMatchesRecipeIngredient(
  row: InventoryRow,
  ing: Recipe["ingredients"][number],
): boolean {
  if (typeof row.ingredientId === "number") {
    return row.ingredientId === ing.id;
  }
  return normalizeName(row.name) === normalizeName(ing.name);
}

function floorQty(q: number): number {
  return Math.max(0, Math.floor(q));
}

/**
 * Whether the current inventory can supply one brew (1 of each recipe ingredient).
 */
export function canBrewRecipe(rows: InventoryRow[], recipe: Recipe): boolean {
  const available = rows.map((row) => floorQty(row.quantity));
  for (const ing of recipe.ingredients) {
    let need = 1;
    for (let i = 0; i < rows.length && need > 0; i++) {
      if (!rowMatchesRecipeIngredient(rows[i], ing)) {
        continue;
      }
      const take = Math.min(available[i], need);
      available[i] -= take;
      need -= take;
    }
    if (need > 0) {
      return false;
    }
  }
  return true;
}

function finalizeAfterBrew(rows: InventoryRow[]): InventoryRow[] {
  const kept = rows.filter((row) => row.quantity > 0);
  if (kept.length === 0) {
    return [{ id: uid(), name: "", quantity: 1 }];
  }
  return kept;
}

/**
 * Returns updated inventory after one brew, or `null` if stock is insufficient.
 */
export function applyRecipeBrew(rows: InventoryRow[], recipe: Recipe): InventoryRow[] | null {
  if (!canBrewRecipe(rows, recipe)) {
    return null;
  }
  const draft = rows.map((row) => ({ ...row, quantity: floorQty(row.quantity) }));
  for (const ing of recipe.ingredients) {
    let need = 1;
    for (let i = 0; i < draft.length && need > 0; i++) {
      const row = draft[i];
      if (!rowMatchesRecipeIngredient(row, ing) || row.quantity <= 0) {
        continue;
      }
      const take = Math.min(row.quantity, need);
      draft[i] = { ...row, quantity: row.quantity - take };
      need -= take;
    }
  }
  return finalizeAfterBrew(draft);
}

/**
 * Row ids that lose at least one unit when brewing `recipe` (same matching rules
 * as {@link applyRecipeBrew}). `null` if the brew cannot run.
 */
export function getBrewAffectedRowIds(rows: InventoryRow[], recipe: Recipe): string[] | null {
  if (!canBrewRecipe(rows, recipe)) {
    return null;
  }
  const draft = rows.map((row) => ({ ...row, quantity: floorQty(row.quantity) }));
  const touched: string[] = [];
  const seen = new Set<string>();
  for (const ing of recipe.ingredients) {
    let need = 1;
    for (let i = 0; i < draft.length && need > 0; i++) {
      const row = draft[i];
      if (!rowMatchesRecipeIngredient(row, ing) || row.quantity <= 0) {
        continue;
      }
      const take = Math.min(row.quantity, need);
      if (take > 0 && !seen.has(row.id)) {
        seen.add(row.id);
        touched.push(row.id);
      }
      draft[i] = { ...row, quantity: row.quantity - take };
      need -= take;
    }
  }
  return touched;
}
