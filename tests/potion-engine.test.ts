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
    const r = expandInventory(
      [
        { name: "Wheat", count: 2 },
        { name: "Blue Mountain Flower", count: 1 },
      ],
      nameIndex,
    );
    if ("error" in r) throw new Error(r.error);
    expect(r.ids.length).toBe(3);
    expect([...r.ids].sort((a, b) => a - b)).toEqual(r.ids);
    expect(r.idToName.size).toBeGreaterThanOrEqual(2);
  });

  it("normalizes ingredient keys (spacing and case)", () => {
    const r = expandInventory(
      [{ name: "  BLUE   mountain  FLOWER ", count: 1 }],
      nameIndex,
    );
    if ("error" in r) throw new Error(r.error);
    expect(r.ids.length).toBe(1);
  });

  it("returns error for unknown ingredients", () => {
    const r = expandInventory(
      [{ name: "Not A Real Skyrim Ingredient Xyz", count: 1 }],
      nameIndex,
    );
    expect("error" in r).toBe(true);
    if ("error" in r) {
      expect(r.error).toContain("Unknown ingredient");
    }
  });

  it("returns error for negative counts", () => {
    const r = expandInventory([{ name: "Wheat", count: -1 }], nameIndex);
    expect("error" in r).toBe(true);
    if ("error" in r) {
      expect(r.error).toContain("Invalid count");
    }
  });
});

describe("rankPotions", () => {
  const nameIndex = loadNameIndex();

  it("returns error when fewer than two ingredients total", () => {
    const r = rankPotions([{ name: "Wheat", count: 1 }], nameIndex);
    expect(r.error).toBe("Need at least 2 ingredients total.");
    expect(r.recipes).toEqual([]);
  });

  it("returns empty recipes when no pair shares an effect", () => {
    const r = rankPotions(
      [
        { name: "Abecean Longfin", count: 1 },
        { name: "Aloe Vera Leaves", count: 1 },
      ],
      nameIndex,
    );
    expect(r.error).toBeUndefined();
    expect(r.truncated).toBe(false);
    expect(r.recipes).toEqual([]);
  });

  it("labels a beneficial dominant mixture as potion", () => {
    const r = rankPotions(
      [
        { name: "Wheat", count: 1 },
        { name: "Blue Mountain Flower", count: 1 },
      ],
      nameIndex,
    );
    expect(r.error).toBeUndefined();
    expect(r.recipes.length).toBeGreaterThan(0);
    const top = r.recipes[0];
    expect(top.mixtureKind).toBe("potion");
    expect(top.dominantEffectKey).toBeTruthy();
    expect(top.totalGold).toBeGreaterThan(0);
    expect(
      top.effects.some((e) => e.effectKey === "Restore_Health"),
    ).toBe(true);
  });

  it("labels a poison-dominant mixture as poison", () => {
    const r = rankPotions(
      [
        { name: "River Betty", count: 1 },
        { name: "Nirnroot", count: 1 },
      ],
      nameIndex,
    );
    expect(r.error).toBeUndefined();
    expect(r.recipes.length).toBe(1);
    expect(r.recipes[0].mixtureKind).toBe("poison");
    expect(r.recipes[0].dominantEffectKey).toBe("Damage_Health");
  });

  it("sorts results by totalGold descending", () => {
    const r = rankPotions(
      [
        { name: "Wheat", count: 1 },
        { name: "Blue Mountain Flower", count: 1 },
        { name: "River Betty", count: 1 },
        { name: "Nirnroot", count: 1 },
      ],
      nameIndex,
    );
    expect(r.error).toBeUndefined();
    expect(r.recipes.length).toBeGreaterThan(1);
    for (let i = 1; i < r.recipes.length; i++) {
      expect(r.recipes[i - 1].totalGold).toBeGreaterThanOrEqual(
        r.recipes[i].totalGold,
      );
    }
  });

  it("sets truncated when combo enumeration hits MAX_RECIPES", () => {
    const db = getDb();
    const rows = db
      .query("SELECT name FROM ingredients ORDER BY id LIMIT 37")
      .all() as { name: string }[];
    expect(rows.length).toBe(37);
    const inv: InventoryLine[] = rows.map((row) => ({
      name: row.name,
      count: 1,
    }));
    const r = rankPotions(inv, nameIndex);
    expect(r.error).toBeUndefined();
    expect(r.truncated).toBe(true);
    expect(r.recipes.length).toBeLessThanOrEqual(MAX_RECIPES);
  });

  it("applies alchemy params to gold (Benefactor boosts beneficial effects)", () => {
    const base = rankPotions(
      [
        { name: "Wheat", count: 1 },
        { name: "Blue Mountain Flower", count: 1 },
      ],
      nameIndex,
      { ...defaultAlchemyParams, hasBenefactor: false },
    );
    const boosted = rankPotions(
      [
        { name: "Wheat", count: 1 },
        { name: "Blue Mountain Flower", count: 1 },
      ],
      nameIndex,
      { ...defaultAlchemyParams, hasBenefactor: true },
    );
    expect(base.error).toBeUndefined();
    expect(boosted.error).toBeUndefined();
    const rhBase = base.recipes[0]?.effects.find(
      (e) => e.effectKey === "Restore_Health",
    );
    const rhBoost = boosted.recipes[0]?.effects.find(
      (e) => e.effectKey === "Restore_Health",
    );
    expect(rhBase && rhBoost).toBeTruthy();
    expect((rhBoost as { gold: number }).gold).toBeGreaterThan(
      (rhBase as { gold: number }).gold,
    );
  });
});
