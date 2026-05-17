import { describe, expect, it } from "bun:test";
import { loadNameIndex } from "../server/src/db.ts";
import { rankPotions } from "../server/src/potion-engine.ts";
import { defaultAlchemyParams } from "../server/src/alchemy-math.ts";

describe("Damage Health gold parity (UESP controlling ingredient)", () => {
  const nameIndex = loadNameIndex();

  it("River Betty outranks Nirnroot and uses Betty magnitude/duration/gold mult", () => {
    const { recipes, error } = rankPotions(
      [
        { name: "River Betty", quantity: 1 },
        { name: "Nirnroot", quantity: 1 },
      ],
      nameIndex,
      defaultAlchemyParams,
    );
    expect(error).toBeUndefined();
    const damageHealthEffect = recipes[0]?.effects.find(
      (effect) => effect.effectKey === "Damage_Health",
    );
    expect(damageHealthEffect?.gold).toBe(8314);
  });

  it("Nirnroot outranks Deathbell on priority (not dominance score)", () => {
    const { recipes, error } = rankPotions(
      [
        { name: "Nirnroot", quantity: 1 },
        { name: "Deathbell", quantity: 1 },
      ],
      nameIndex,
      defaultAlchemyParams,
    );
    expect(error).toBeUndefined();
    const damageHealthEffect = recipes[0]?.effects.find(
      (effect) => effect.effectKey === "Damage_Health",
    );
    expect(damageHealthEffect?.gold).toBe(415);
    expect(damageHealthEffect?.gold).not.toBe(9);
  });
});
