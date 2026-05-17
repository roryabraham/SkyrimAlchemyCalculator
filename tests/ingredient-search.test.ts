import { describe, expect, it } from "bun:test";
import { getDb, searchIngredients } from "../server/src/db.ts";

describe("searchIngredients", () => {
  it("warms db", () => {
    getDb();
  });

  it("returns empty array for empty or whitespace-only query", () => {
    expect(searchIngredients("", 10)).toEqual([]);
    expect(searchIngredients("   ", 10)).toEqual([]);
  });

  it("finds Nightshade by transposed-letter typo (fuzzy)", () => {
    const rows = searchIngredients("nigthshade", 40);
    const names = rows.map((r) => r.name);
    expect(names).toContain("Nightshade");
  });

  it("finds Nightshade by substring", () => {
    const rows = searchIngredients("night", 40);
    const names = rows.map((r) => r.name);
    expect(names).toContain("Nightshade");
  });
});
