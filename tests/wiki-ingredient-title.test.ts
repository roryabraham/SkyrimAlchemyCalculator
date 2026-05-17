import { describe, expect, it } from "bun:test";
import { wikiTitleFromIngredientRowId } from "../scripts/lib/wiki-ingredient-title.ts";

describe("wikiTitleFromIngredientRowId", () => {
  it("maps underscores to spaces for wiki title", () => {
    expect(wikiTitleFromIngredientRowId("Abecean_Longfin")).toBe("Skyrim:Abecean Longfin");
  });

  it("decodes .27 to apostrophe (UESP HTML row id encoding)", () => {
    expect(wikiTitleFromIngredientRowId("Chicken.27s_Egg")).toBe("Skyrim:Chicken's Egg");
    expect(wikiTitleFromIngredientRowId("Dragon.27s_Tongue")).toBe("Skyrim:Dragon's Tongue");
  });
});
