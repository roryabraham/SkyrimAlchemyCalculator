import { describe, expect, it } from "bun:test";
import { getDb, loadNameIndex } from "../server/src/db.ts";
import {
  expandInventory,
  MAX_RECIPES,
  rankPotions,
  type InventoryLine,
} from "../server/src/potion-engine.ts";
import { defaultAlchemyParams } from "../server/src/alchemy-math.ts";

describe("expandInventory", () => {
  const nameIndex = loadNameIndex();

  it("maps lines to sorted ids and canonical names", () => {
    const result = expandInventory(
      [
        { name: "Wheat", quantity: 2 },
        { name: "Blue Mountain Flower", quantity: 1 },
      ],
      nameIndex,
    );
    if ("error" in result) {
      throw new Error(result.error);
    }
    expect(result.ids.length).toBe(3);
    expect([...result.ids].sort((left, right) => left - right)).toEqual(result.ids);
    expect(result.idToName.size).toBeGreaterThanOrEqual(2);
  });

  it("normalizes ingredient keys (spacing and case)", () => {
    const result = expandInventory(
      [{ name: "  BLUE   mountain  FLOWER ", quantity: 1 }],
      nameIndex,
    );
    if ("error" in result) {
      throw new Error(result.error);
    }
    expect(result.ids.length).toBe(1);
  });

  it("returns error for unknown ingredients", () => {
    const result = expandInventory(
      [{ name: "Not A Real Skyrim Ingredient Xyz", quantity: 1 }],
      nameIndex,
    );
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("Unknown ingredient");
    }
  });

  it("returns error for negative quantities", () => {
    const result = expandInventory([{ name: "Wheat", quantity: -1 }], nameIndex);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("Invalid quantity");
    }
  });
});

describe("rankPotions", () => {
  const nameIndex = loadNameIndex();

  it("returns error when fewer than two ingredients total", () => {
    const result = rankPotions([{ name: "Wheat", quantity: 1 }], nameIndex);
    expect(result.error).toBe("Need at least 2 ingredients total.");
    expect(result.recipes).toEqual([]);
  });

  it("never ranks a mixture that repeats the same ingredient (Skyrim lab rules)", () => {
    const onlyWheat = rankPotions([{ name: "Wheat", quantity: 2 }], nameIndex);
    expect(onlyWheat.error).toBeUndefined();
    expect(onlyWheat.recipes).toEqual([]);

    const wheatPlusBlue = rankPotions(
      [
        { name: "Wheat", quantity: 2 },
        { name: "Blue Mountain Flower", quantity: 1 },
      ],
      nameIndex,
    );
    expect(wheatPlusBlue.error).toBeUndefined();
    for (const rec of wheatPlusBlue.recipes) {
      const ingIds = rec.ingredients.map((ing) => ing.id);
      expect(new Set(ingIds).size).toBe(ingIds.length);
    }
  });

  it("returns empty recipes when no pair shares an effect", () => {
    const result = rankPotions(
      [
        { name: "Abecean Longfin", quantity: 1 },
        { name: "Aloe Vera Leaves", quantity: 1 },
      ],
      nameIndex,
    );
    expect(result.error).toBeUndefined();
    expect(result.isTruncated).toBe(false);
    expect(result.recipes).toEqual([]);
  });

  it("labels a beneficial dominant mixture as potion", () => {
    const result = rankPotions(
      [
        { name: "Wheat", quantity: 1 },
        { name: "Blue Mountain Flower", quantity: 1 },
      ],
      nameIndex,
    );
    expect(result.error).toBeUndefined();
    expect(result.recipes.length).toBeGreaterThan(0);
    const top = result.recipes[0];
    expect(top.mixtureKind).toBe("potion");
    expect(top.dominantEffectKey).toBeTruthy();
    expect(top.totalGold).toBeGreaterThan(0);
    expect(top.effects.some((effect) => effect.effectKey === "Restore_Health")).toBe(true);
  });

  it("labels a poison-dominant mixture as poison", () => {
    const result = rankPotions(
      [
        { name: "River Betty", quantity: 1 },
        { name: "Nirnroot", quantity: 1 },
      ],
      nameIndex,
    );
    expect(result.error).toBeUndefined();
    expect(result.recipes.length).toBe(1);
    expect(result.recipes[0].mixtureKind).toBe("poison");
    expect(result.recipes[0].dominantEffectKey).toBe("Damage_Health");
  });

  it("sorts results by totalGold descending", () => {
    const result = rankPotions(
      [
        { name: "Wheat", quantity: 1 },
        { name: "Blue Mountain Flower", quantity: 1 },
        { name: "River Betty", quantity: 1 },
        { name: "Nirnroot", quantity: 1 },
      ],
      nameIndex,
    );
    expect(result.error).toBeUndefined();
    expect(result.recipes.length).toBeGreaterThan(1);
    for (let recipeIdx = 1; recipeIdx < result.recipes.length; recipeIdx++) {
      expect(result.recipes[recipeIdx - 1].totalGold).toBeGreaterThanOrEqual(
        result.recipes[recipeIdx].totalGold,
      );
    }
  });

  it("sets isTruncated when combo enumeration hits MAX_RECIPES", () => {
    const db = getDb();
    const rows = db.query("SELECT name FROM ingredients ORDER BY id LIMIT 37").all() as {
      name: string;
    }[];
    expect(rows.length).toBe(37);
    const inv: InventoryLine[] = rows.map((row) => ({
      name: row.name,
      quantity: 1,
    }));
    const result = rankPotions(inv, nameIndex);
    expect(result.error).toBeUndefined();
    expect(result.isTruncated).toBe(true);
    expect(result.recipes.length).toBeLessThanOrEqual(MAX_RECIPES);
  });

  it("applies alchemy params to gold (Benefactor boosts beneficial effects)", () => {
    const base = rankPotions(
      [
        { name: "Wheat", quantity: 1 },
        { name: "Blue Mountain Flower", quantity: 1 },
      ],
      nameIndex,
      { ...defaultAlchemyParams, hasBenefactor: false },
    );
    const boosted = rankPotions(
      [
        { name: "Wheat", quantity: 1 },
        { name: "Blue Mountain Flower", quantity: 1 },
      ],
      nameIndex,
      { ...defaultAlchemyParams, hasBenefactor: true },
    );
    expect(base.error).toBeUndefined();
    expect(boosted.error).toBeUndefined();
    const restoreHealthGoldBase = base.recipes[0]?.effects.find(
      (effect) => effect.effectKey === "Restore_Health",
    );
    const restoreHealthGoldBoosted = boosted.recipes[0]?.effects.find(
      (effect) => effect.effectKey === "Restore_Health",
    );
    expect(restoreHealthGoldBase && restoreHealthGoldBoosted).toBeTruthy();
    expect((restoreHealthGoldBoosted as { gold: number }).gold).toBeGreaterThan(
      (restoreHealthGoldBase as { gold: number }).gold,
    );
  });
});
