import { describe, expect, it } from "bun:test";
import { defaultAlchemyParams, effectGold, powerFactor } from "../server/src/alchemy-math.ts";
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

const damageStamina: EffectRow = {
  id: 2,
  effect_key: "Damage_Stamina",
  display_name: "Damage Stamina",
  base_cost: 1.8,
  base_mag: 3,
  base_dur: 0,
  value_at_100: 43,
  power_affects_magnitude: 1,
  power_affects_duration: 0,
  is_beneficial: 0,
};

describe("powerFactor", () => {
  it("increases with alchemy skill (UESP F_ALCH formula)", () => {
    const low = powerFactor(
      restoreHealth,
      { ...defaultAlchemyParams, alchemySkill: 15 },
      {
        isPoison: false,
        shouldIncludeBenefactorPoisoner: false,
      },
    );
    const high = powerFactor(
      restoreHealth,
      { ...defaultAlchemyParams, alchemySkill: 100 },
      {
        isPoison: false,
        shouldIncludeBenefactorPoisoner: false,
      },
    );
    expect(high).toBeGreaterThan(low);
    expect(low).toBeCloseTo(4.3, 5);
    expect(high).toBeCloseTo(6, 5);
  });

  it("applies Physician bonus only to restore-type effects", () => {
    const withPhys = powerFactor(
      restoreHealth,
      {
        ...defaultAlchemyParams,
        hasPhysician: true,
      },
      { isPoison: false, shouldIncludeBenefactorPoisoner: false },
    );
    const staminaPhys = powerFactor(
      damageStamina,
      {
        ...defaultAlchemyParams,
        hasPhysician: true,
      },
      { isPoison: false, shouldIncludeBenefactorPoisoner: false },
    );
    expect(withPhys).toBeGreaterThan(
      powerFactor(restoreHealth, defaultAlchemyParams, {
        isPoison: false,
        shouldIncludeBenefactorPoisoner: false,
      }),
    );
    expect(staminaPhys).toBe(
      powerFactor(damageStamina, defaultAlchemyParams, {
        isPoison: false,
        shouldIncludeBenefactorPoisoner: false,
      }),
    );
  });
});

describe("effectGold", () => {
  it("computes positive gold for restore health at low skill", () => {
    const goldValue = effectGold(
      restoreHealth,
      defaultAlchemyParams,
      { isPoison: false, shouldIncludeBenefactorPoisoner: false },
      1,
      1,
    );
    expect(goldValue).toBeGreaterThan(0);
    expect(goldValue).toBeLessThan(500);
  });

  it("applies Benefactor when mixing potions with beneficial effects", () => {
    const plain = effectGold(
      restoreHealth,
      { ...defaultAlchemyParams, hasBenefactor: true },
      { isPoison: false, shouldIncludeBenefactorPoisoner: false },
      1,
      1,
    );
    const benefactor = effectGold(
      restoreHealth,
      { ...defaultAlchemyParams, hasBenefactor: true },
      { isPoison: false, shouldIncludeBenefactorPoisoner: true },
      1,
      1,
    );
    expect(benefactor).toBeGreaterThan(plain);
  });

  it("applies Poisoner when mixing poisons with harmful effects", () => {
    const plain = effectGold(
      damageStamina,
      { ...defaultAlchemyParams, hasPoisoner: true },
      { isPoison: true, shouldIncludeBenefactorPoisoner: false },
      1,
      1,
    );
    const poisoner = effectGold(
      damageStamina,
      { ...defaultAlchemyParams, hasPoisoner: true },
      { isPoison: true, shouldIncludeBenefactorPoisoner: true },
      1,
      1,
    );
    expect(poisoner).toBeGreaterThan(plain);
  });

  it("uses Damage Health parity hints when provided", () => {
    const damageHealth: EffectRow = {
      id: 3,
      effect_key: "Damage_Health",
      display_name: "Damage Health",
      base_cost: 3,
      base_mag: 2,
      base_dur: 1,
      value_at_100: 3,
      power_affects_magnitude: 1,
      power_affects_duration: 0,
      is_beneficial: 0,
    };
    const goldValue = effectGold(
      damageHealth,
      defaultAlchemyParams,
      { isPoison: true, shouldIncludeBenefactorPoisoner: true },
      1,
      1,
      {
        damageHealth: {
          prePowerMag: 2,
          intrinsicDurForGold: 10,
          tableGoldMult: 12.6,
        },
      },
    );
    expect(goldValue).toBe(415);
  });
});
