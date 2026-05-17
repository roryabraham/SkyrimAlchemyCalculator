import { describe, expect, it } from "bun:test";
import { loadNameIndex } from "../server/src/db.ts";
import { rankPotions } from "../server/src/potion-engine.ts";
import { defaultAlchemyParams } from "../server/src/alchemy-math.ts";

describe("Damage Health gold parity (UESP controlling ingredient)", () => {
  const nameIndex = loadNameIndex();

  it("River Betty outranks Nirnroot and uses Betty magnitude/duration/gold mult", () => {
    const { recipes, error } = rankPotions(
      [
        { name: "River Betty", count: 1 },
        { name: "Nirnroot", count: 1 },
      ],
      nameIndex,
      defaultAlchemyParams,
    );
    expect(error).toBeUndefined();
    const dh = recipes[0]?.effects.find((e) => e.effectKey === "Damage_Health");
    expect(dh?.gold).toBe(8314);
  });

  it("Nirnroot outranks Deathbell on priority (not dominance score)", () => {
    const { recipes, error } = rankPotions(
      [
        { name: "Nirnroot", count: 1 },
        { name: "Deathbell", count: 1 },
      ],
      nameIndex,
      defaultAlchemyParams,
    );
    expect(error).toBeUndefined();
    const dh = recipes[0]?.effects.find((e) => e.effectKey === "Damage_Health");
    expect(dh?.gold).toBe(415);
    expect(dh?.gold).not.toBe(9);
  });
});
