import type { EffectRow } from "./db.ts";

const F_ALCH_INIT = 4;
const F_ALCH_SKILL = 1.5;

export type AlchemyParams = {
  alchemySkill: number;
  fortifyAlchemy: number;
  alchemistPercent: number;
  hasPhysician: boolean;
  hasBenefactor: boolean;
  hasPoisoner: boolean;
  seekerOfShadowsPercent: number;
};

export const defaultAlchemyParams: AlchemyParams = {
  alchemySkill: 15,
  fortifyAlchemy: 0,
  alchemistPercent: 0,
  hasPhysician: false,
  hasBenefactor: false,
  hasPoisoner: false,
  seekerOfShadowsPercent: 0,
};

/** UESP Damage Health controlling-ingredient path (see damage-health-parity.ts). */
export type DamageHealthGoldHints = {
  prePowerMag: number;
  intrinsicDurForGold: number;
  tableGoldMult: number;
};

export type EffectGoldHints = {
  damageHealth?: DamageHealthGoldHints;
};

function physicianBonus(effect: EffectRow): number {
  const k = effect.effect_key;
  if (
    k === "Restore_Health" ||
    k === "Restore_Magicka" ||
    k === "Restore_Stamina"
  ) {
    return 25;
  }
  return 0;
}

/** Per-effect power multiplier (UESP PowerFactor). */
export function powerFactor(
  effect: EffectRow,
  params: AlchemyParams,
  opts: { isPoison: boolean; includeBenefactorPoisoner: boolean },
): number {
  const alchemist = params.alchemistPercent;
  const physician = params.hasPhysician ? physicianBonus(effect) : 0;
  let benefactor = 0;
  let poisoner = 0;
  if (opts.includeBenefactorPoisoner) {
    if (!opts.isPoison && params.hasBenefactor && effect.is_beneficial) {
      benefactor = 25;
    }
    if (opts.isPoison && params.hasPoisoner && !effect.is_beneficial) {
      poisoner = 25;
    }
  }
  const seeker = params.seekerOfShadowsPercent;
  return (
    F_ALCH_INIT *
    (1 + (F_ALCH_SKILL - 1) * (params.alchemySkill / 100)) *
    (1 + params.fortifyAlchemy / 100) *
    (1 + alchemist / 100) *
    (1 + physician / 100) *
    (1 + benefactor / 100 + poisoner / 100) *
    (1 + seeker / 100)
  );
}

function scaledMagnitude(
  effect: EffectRow,
  params: AlchemyParams,
  opts: { isPoison: boolean; includeBenefactorPoisoner: boolean },
  ingredientMagMult: number,
): number {
  const pf = powerFactor(effect, params, opts);
  let mag = effect.base_mag * ingredientMagMult;
  if (effect.power_affects_magnitude) mag *= pf;
  return Math.round(mag);
}

function scaledDuration(
  effect: EffectRow,
  params: AlchemyParams,
  opts: { isPoison: boolean; includeBenefactorPoisoner: boolean },
  ingredientDurMult: number,
): number {
  const pf = powerFactor(effect, params, opts);
  let dur = effect.base_dur * ingredientDurMult;
  if (effect.power_affects_duration) dur *= pf;
  return Math.round(dur);
}

/**
 * Single-effect gold (UESP floor formula).
 * When `hints.damageHealth` is set, uses UESP per-ingredient Damage Health
 * magnitude/duration/gold-mult (closer to game than generic effect bases).
 */
export function effectGold(
  effect: EffectRow,
  params: AlchemyParams,
  opts: { isPoison: boolean; includeBenefactorPoisoner: boolean },
  ingredientMagMult: number,
  ingredientDurMult: number,
  hints?: EffectGoldHints,
): number {
  const dh = effect.effect_key === "Damage_Health" && hints?.damageHealth;

  let mag: number;
  let durForGold: number;

  if (dh) {
    const pf = powerFactor(effect, params, opts);
    const h = hints.damageHealth!;
    mag = Math.round(
      h.prePowerMag * (effect.power_affects_magnitude ? pf : 1),
    );
    durForGold = h.intrinsicDurForGold;
  } else {
    mag = scaledMagnitude(
      effect,
      params,
      opts,
      ingredientMagMult,
    );
    durForGold = scaledDuration(
      effect,
      params,
      opts,
      ingredientDurMult,
    );
  }

  const magTerm = mag > 0 ? mag ** 1.1 : 1;
  const durTerm = durForGold > 0 ? (durForGold / 10) ** 1.1 : 1;
  let gold = Math.floor(
    effect.base_cost * Math.max(magTerm, 1) * durTerm,
  );
  if (dh) {
    gold = Math.floor(gold * hints.damageHealth!.tableGoldMult);
  }
  return gold;
}

/** Gold for dominance / potion-vs-poison label (no Benefactor/Poisoner in PowerFactor). */
export function effectGoldForDominance(
  effect: EffectRow,
  params: AlchemyParams,
  isPoison: boolean,
  ingredientMagMult: number,
  ingredientDurMult: number,
  hints?: EffectGoldHints,
): number {
  return effectGold(
    effect,
    params,
    { isPoison, includeBenefactorPoisoner: false },
    ingredientMagMult,
    ingredientDurMult,
    hints,
  );
}
