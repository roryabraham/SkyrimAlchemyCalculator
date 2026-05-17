import { describe, expect, it } from "bun:test";
import {
  applyRecipeBrew,
  canBrewRecipe,
  getBrewAffectedRowIds,
} from "../web/src/libs/brew-recipe.ts";
import type { InventoryRow, Recipe } from "../web/src/libs/types.ts";

function makeRecipe(
  ingredients: { id: number; name: string }[],
  overrides: Partial<
    Pick<Recipe, "effects" | "totalGold" | "mixtureKind" | "sharedBlend" | "dominantEffectKey">
  > = {},
): Recipe {
  const mixtureKind = overrides.mixtureKind ?? "potion";
  return {
    ingredients: ingredients.map((ing) => ({ ...ing, iconUrl: null })),
    effects: overrides.effects ?? [],
    totalGold: overrides.totalGold ?? 0,
    mixtureKind,
    sharedBlend:
      overrides.sharedBlend ??
      (mixtureKind === "poison" ? ("harmful" as const) : ("beneficial" as const)),
    dominantEffectKey: overrides.dominantEffectKey ?? "TestEffect",
  };
}

function row(partial: Omit<InventoryRow, "id"> & { id?: string }): InventoryRow {
  return {
    id: partial.id ?? `id-${partial.ingredientId ?? partial.name}-${partial.quantity}`,
    name: partial.name,
    quantity: partial.quantity,
    ingredientId: partial.ingredientId,
    ingredientIconUrl: partial.ingredientIconUrl,
  };
}

describe("canBrewRecipe", () => {
  const wheatBlue = makeRecipe([
    { id: 1, name: "Wheat" },
    { id: 2, name: "Blue Mountain Flower" },
  ]);

  it("returns true when each recipe ingredient has at least one matching unit", () => {
    const rows: InventoryRow[] = [
      row({ name: "Wheat", quantity: 1, ingredientId: 1 }),
      row({ name: "Blue Mountain Flower", quantity: 3, ingredientId: 2 }),
    ];
    expect(canBrewRecipe(rows, wheatBlue)).toBe(true);
  });

  it("returns false when any recipe ingredient is short", () => {
    const rows: InventoryRow[] = [
      row({ name: "Wheat", quantity: 1, ingredientId: 1 }),
      row({ name: "Blue Mountain Flower", quantity: 0, ingredientId: 2 }),
    ];
    expect(canBrewRecipe(rows, wheatBlue)).toBe(false);
  });

  it("matches by ingredient id when the row was finalized from autocomplete", () => {
    const rows: InventoryRow[] = [
      row({ name: "Typo Name", quantity: 1, ingredientId: 1 }),
      row({ name: "Blue Mountain Flower", quantity: 1, ingredientId: 2 }),
    ];
    expect(canBrewRecipe(rows, wheatBlue)).toBe(true);
  });

  it("matches by normalized name when ingredientId is unset", () => {
    const recipe = makeRecipe([{ id: 99, name: "Salt Pile" }]);
    const rows: InventoryRow[] = [row({ name: "  SALT pile ", quantity: 1 })];
    expect(canBrewRecipe(rows, recipe)).toBe(true);
  });

  it("does not match wrong id when ingredientId is set", () => {
    const recipe = makeRecipe([{ id: 10, name: "A" }]);
    const rows: InventoryRow[] = [row({ name: "A", quantity: 5, ingredientId: 99 })];
    expect(canBrewRecipe(rows, recipe)).toBe(false);
  });

  it("floors fractional quantities", () => {
    const recipe = makeRecipe([{ id: 1, name: "Wheat" }]);
    const rows: InventoryRow[] = [row({ name: "Wheat", quantity: 0.9, ingredientId: 1 })];
    expect(canBrewRecipe(rows, recipe)).toBe(false);
  });

  it("returns true when the only matching stock is on a later row", () => {
    const recipe = makeRecipe([{ id: 5, name: "Bee" }]);
    const rows: InventoryRow[] = [
      row({ name: "Mudcrab Chitin", quantity: 10, ingredientId: 99 }),
      row({ name: "Bee", quantity: 1, ingredientId: 5 }),
    ];
    expect(canBrewRecipe(rows, recipe)).toBe(true);
  });
});

describe("applyRecipeBrew", () => {
  const twoIng = makeRecipe([
    { id: 1, name: "Wheat" },
    { id: 2, name: "Blue Mountain Flower" },
  ]);

  it("returns null and leaves logic to caller when stock is insufficient", () => {
    const rows: InventoryRow[] = [row({ name: "Wheat", quantity: 1, ingredientId: 1 })];
    expect(applyRecipeBrew(rows, twoIng)).toBe(null);
  });

  it("subtracts one of each ingredient and preserves row metadata", () => {
    const rows: InventoryRow[] = [
      row({
        id: "keep-id-a",
        name: "Wheat",
        quantity: 2,
        ingredientId: 1,
        ingredientIconUrl: "http://example/wheat.png",
      }),
      row({ id: "keep-id-b", name: "Blue Mountain Flower", quantity: 1, ingredientId: 2 }),
    ];
    const next = applyRecipeBrew(rows, twoIng);
    expect(next).not.toBe(null);
    expect(next!.find((r) => r.id === "keep-id-a")?.quantity).toBe(1);
    expect(next!.find((r) => r.id === "keep-id-b")).toBeUndefined();
    expect(next!.length).toBe(1);
  });

  it("removes depleted rows and drains stacked lines in table order", () => {
    const recipe = makeRecipe([{ id: 5, name: "Bee" }]);
    const rows: InventoryRow[] = [
      row({ id: "first", name: "Bee", quantity: 1, ingredientId: 5 }),
      row({ id: "second", name: "Bee", quantity: 2, ingredientId: 5 }),
    ];
    const next = applyRecipeBrew(rows, recipe);
    expect(next).not.toBe(null);
    expect(next!.map((r) => ({ id: r.id, q: r.quantity }))).toEqual([{ id: "second", q: 2 }]);
  });

  it("returns a single empty starter row when the last units are brewed", () => {
    const recipe = makeRecipe([{ id: 1, name: "Only" }]);
    const rows: InventoryRow[] = [row({ name: "Only", quantity: 1, ingredientId: 1 })];
    const next = applyRecipeBrew(rows, recipe);
    expect(next).not.toBe(null);
    expect(next!.length).toBe(1);
    expect(next![0].name).toBe("");
    expect(next![0].quantity).toBe(1);
    expect(next![0].ingredientId).toBeUndefined();
  });

  it("floors fractional quantities then brews whole units", () => {
    const recipe = makeRecipe([{ id: 1, name: "Wheat" }]);
    const rows: InventoryRow[] = [row({ name: "Wheat", quantity: 1.2, ingredientId: 1 })];
    const next = applyRecipeBrew(rows, recipe);
    expect(next).not.toBe(null);
    expect(next!.length).toBe(1);
    expect(next![0].name).toBe("");
    expect(next![0].quantity).toBe(1);
  });
});

describe("getBrewAffectedRowIds", () => {
  it("lists each inventory row id that contributes at least one unit", () => {
    const recipe = makeRecipe([
      { id: 1, name: "Wheat" },
      { id: 2, name: "Blue Mountain Flower" },
    ]);
    const rows: InventoryRow[] = [
      row({ id: "row-a", name: "Wheat", quantity: 2, ingredientId: 1 }),
      row({ id: "row-b", name: "Blue Mountain Flower", quantity: 1, ingredientId: 2 }),
    ];
    expect(getBrewAffectedRowIds(rows, recipe)).toEqual(["row-a", "row-b"]);
  });

  it("returns null when the brew cannot run", () => {
    const recipe = makeRecipe([
      { id: 1, name: "Wheat" },
      { id: 2, name: "Blue Mountain Flower" },
    ]);
    expect(
      getBrewAffectedRowIds([row({ name: "Wheat", quantity: 1, ingredientId: 1 })], recipe),
    ).toBe(null);
  });
});
