/**
 * UESP Skyrim:Damage Health — priority, magnitude, duration-for-gold, and gold mult
 * per controlling ingredient. Improves parity vs generic effect.base_mag/base_dur.
 * @see https://en.uesp.net/wiki/Skyrim:Damage_Health
 */

export type DamageHealthRow = {
  /** Higher wins when this ingredient controls Damage Health. */
  priority: number;
  /** Base magnitude × mag mult before PowerFactor (UESP columns). */
  prePowerMag: number;
  /** CK base duration; 0 with † uses 10s for gold cost only. */
  baseDurCk: number;
  /** When true, gold uses intrinsic duration 10 instead of CK 0 / bug path. */
  useTenSecondGoldDuration: boolean;
  /** UESP Gold Mult for this ingredient on Damage Health. */
  goldMult: number;
};

function n(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Normalized ingredient name → UESP Damage Health row. */
export const DAMAGE_HEALTH_BY_INGREDIENT = new Map<string, DamageHealthRow>(
  [
    ["chokeberry", { priority: 1, prePowerMag: 3 * 1.5, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1.6 }],
    ["coda flower", { priority: 1, prePowerMag: 3 * 1.5, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1.6 }],
    ["crimson nirnroot", { priority: 3, prePowerMag: 6 * 3, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 3.3 }],
    ["deathbell", { priority: 1, prePowerMag: 3 * 1.5, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1.6 }],
    ["ectoplasm", { priority: 2, prePowerMag: 1 * 1, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1 }],
    ["emperor parasol moss", { priority: 5, prePowerMag: 3 * 1.5, baseDurCk: 0, useTenSecondGoldDuration: true, goldMult: 19.7 }],
    ["falmer ear", { priority: 2, prePowerMag: 1 * 1, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1 }],
    ["fire petal", { priority: 1, prePowerMag: 3 * 1.5, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1.6 }],
    ["gnarl bark", { priority: 1, prePowerMag: 3 * 1.5, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1.6 }],
    ["harrada", { priority: 2, prePowerMag: 4 * 2, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 2.14 }],
    ["human flesh", { priority: 2, prePowerMag: 1 * 1, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1 }],
    ["human heart", { priority: 2, prePowerMag: 1 * 1, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1 }],
    ["imp gall", { priority: 1, prePowerMag: 3 * 1.5, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1.6 }],
    ["imp stool", { priority: 2, prePowerMag: 1 * 1, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1 }],
    ["jarrin root", { priority: 7, prePowerMag: 200 * 100, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 158 }],
    ["mort flesh", { priority: 2, prePowerMag: 1 * 1, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1 }],
    ["nightshade", { priority: 2, prePowerMag: 1 * 1, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1 }],
    ["nirnroot", { priority: 4, prePowerMag: 2 * 1, baseDurCk: 0, useTenSecondGoldDuration: true, goldMult: 12.6 }],
    ["poison bloom", { priority: 1, prePowerMag: 3 * 1.5, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1.6 }],
    ["red mountain flower", { priority: 2, prePowerMag: 1 * 1, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1 }],
    ["redwort flower", { priority: 1, prePowerMag: 3 * 1.5, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1.6 }],
    ["river betty", { priority: 6, prePowerMag: 5 * 2.5, baseDurCk: 0, useTenSecondGoldDuration: true, goldMult: 34.5 }],
    ["scalon fin", { priority: 1, prePowerMag: 3 * 1.5, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1.6 }],
    ["skeever tail", { priority: 2, prePowerMag: 1 * 1, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1 }],
    ["small antlers", { priority: 2, prePowerMag: 1 * 1, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1 }],
    ["spiddal stick", { priority: 2, prePowerMag: 4 * 2, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 2.14 }],
    ["troll fat", { priority: 2, prePowerMag: 1 * 1, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1 }],
    ["void salts", { priority: 2, prePowerMag: 1 * 1, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1 }],
    ["wisp stalk caps", { priority: 1, prePowerMag: 3 * 1.5, baseDurCk: 1, useTenSecondGoldDuration: false, goldMult: 1.6 }],
  ],
);

export function normalizeIngredientKey(name: string): string {
  return n(name);
}

export function getDamageHealthRow(
  ingredientCanonicalName: string,
): DamageHealthRow | undefined {
  return DAMAGE_HEALTH_BY_INGREDIENT.get(n(ingredientCanonicalName));
}
