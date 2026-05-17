import { describe, expect, it } from "bun:test";
import { effectGold, defaultAlchemyParams } from "../server/src/alchemy-math.ts";
import type { EffectRow } from "../server/src/db.ts";

const restoreHealth: EffectRow = {
  id: 1,
  effect_key: "Restore_Health",
  display_name: "Restore Health",
  base_cost: 0.5,
  base_mag: 5,
  base_dur: 0,
  value_at_100: 21,
  power_affects_magnitude: 1,
  power_affects_duration: 0,
  is_beneficial: 1,
};

describe("effectGold", () => {
  it("computes positive gold for restore health at low skill", () => {
    const g = effectGold(
      restoreHealth,
      defaultAlchemyParams,
      { isPoison: false, includeBenefactorPoisoner: false },
      1,
      1,
    );
    expect(g).toBeGreaterThan(0);
    expect(g).toBeLessThan(500);
  });
});
