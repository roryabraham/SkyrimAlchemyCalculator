import {
  loadEffectsByIds,
  loadIngredientEffects,
  type EffectRow,
  type IngredientEffectRow,
} from "./db.ts";
import {
  defaultAlchemyParams,
  effectGold,
  effectGoldForDominance,
  type AlchemyParams,
  type EffectGoldHints,
} from "./alchemy-math.ts";
import { normalizeIngredientKey } from "../../libs/ingredient-key.ts";
import { getDamageHealthRow } from "./damage-health-parity.ts";

export const MAX_RECIPES = 8000;

export type InventoryLine = { name: string; quantity: number };

/** Whether shared effects are all helpful, all harmful, or both (Skyrim potion/poison brews). */
export type RecipeSharedBlend = "beneficial" | "harmful" | "mixed";

export type RecipeResult = {
  ingredients: { name: string; id: number }[];
  effects: { displayName: string; effectKey: string; gold: number }[];
  totalGold: number;
  mixtureKind: "potion" | "poison";
  sharedBlend: RecipeSharedBlend;
  dominantEffectKey: string;
};

function magDurGold(ingredientEffect: IngredientEffectRow): {
  mag: number;
  dur: number;
  gold: number;
} {
  return {
    mag: ingredientEffect.mag_mult ?? 1,
    dur: ingredientEffect.dur_mult ?? 1,
    gold: ingredientEffect.gold_mult ?? 1,
  };
}

function dominanceScore(effect: EffectRow, ingredientEffect: IngredientEffectRow): number {
  const { mag, dur, gold } = magDurGold(ingredientEffect);
  return effect.base_cost * mag * dur * gold;
}

type WinnerMults = {
  mag: number;
  dur: number;
  gold: number;
  ingredientId: number;
};

function pickDamageHealthWinner(
  effect: EffectRow,
  contributors: { ingredientId: number; ie: IngredientEffectRow }[],
  idToName: Map<number, string>,
): WinnerMults {
  const scored = contributors.map((contributor) => {
    const name = idToName.get(contributor.ingredientId) ?? "";
    const row = getDamageHealthRow(name);
    const priority = row?.priority ?? 0;
    const dom = dominanceScore(effect, contributor.ie);
    return { contributor, priority, dom };
  });
  scored.sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }
    return right.dom - left.dom;
  });
  const top = scored[0].contributor;
  const mults = magDurGold(top.ie);
  return { ...mults, ingredientId: top.ingredientId };
}

function pickWinner(
  effect: EffectRow,
  contributors: { ingredientId: number; ie: IngredientEffectRow }[],
  idToName: Map<number, string>,
): WinnerMults {
  if (effect.effect_key === "Damage_Health") {
    return pickDamageHealthWinner(effect, contributors, idToName);
  }
  let bestIdx = 0;
  let bestScore = dominanceScore(effect, contributors[0].ie);
  for (let contributorIdx = 1; contributorIdx < contributors.length; contributorIdx++) {
    const score = dominanceScore(effect, contributors[contributorIdx].ie);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = contributorIdx;
    }
  }
  const winner = contributors[bestIdx];
  const mults = magDurGold(winner.ie);
  return { ...mults, ingredientId: winner.ingredientId };
}

function buildGoldHints(
  effect: EffectRow,
  winnerIngredientId: number,
  idToName: Map<number, string>,
  winnerMults: { mag: number; dur: number; gold: number },
): EffectGoldHints | undefined {
  if (effect.effect_key !== "Damage_Health") {
    return undefined;
  }
  const name = idToName.get(winnerIngredientId);
  if (!name) {
    return undefined;
  }
  const row = getDamageHealthRow(name);
  if (!row) {
    return undefined;
  }
  const intrinsicDurForGold = row.isTenSecondGoldDuration
    ? 10
    : Math.max(1, Math.round(row.baseDurCk * winnerMults.dur));
  return {
    damageHealth: {
      prePowerMag: row.prePowerMag,
      intrinsicDurForGold,
      tableGoldMult: row.goldMult,
    },
  };
}

function evaluateRecipe(
  ingredientIds: number[],
  idToName: Map<number, string>,
  ieMap: Map<number, IngredientEffectRow[]>,
  effectById: Map<number, EffectRow>,
  params: AlchemyParams,
): RecipeResult | null {
  const effCount = new Map<number, number>();
  const contrib = new Map<number, { ingredientId: number; ie: IngredientEffectRow }[]>();

  for (const ingredientId of ingredientIds) {
    for (const ingredientEffect of ieMap.get(ingredientId) ?? []) {
      effCount.set(ingredientEffect.effect_id, (effCount.get(ingredientEffect.effect_id) ?? 0) + 1);
      const arr = contrib.get(ingredientEffect.effect_id) ?? [];
      arr.push({ ingredientId, ie: ingredientEffect });
      contrib.set(ingredientEffect.effect_id, arr);
    }
  }

  const shared: number[] = [];
  for (const [effectId, useCount] of effCount) {
    if (useCount >= 2) {
      shared.push(effectId);
    }
  }
  if (shared.length === 0) {
    return null;
  }

  const prelimPoison = false;
  type SharedRow = {
    effect: EffectRow;
    winner: WinnerMults;
    hints: EffectGoldHints | undefined;
  };
  const sharedRows: SharedRow[] = [];
  let dominantEid = shared[0]!;
  let dominantGold = -1;

  for (const effectId of shared) {
    const effect = effectById.get(effectId);
    if (!effect) {
      continue;
    }
    const contributorsForEffect = contrib.get(effectId) ?? [];
    const winner = pickWinner(effect, contributorsForEffect, idToName);
    const hints = buildGoldHints(effect, winner.ingredientId, idToName, winner);
    const dominanceGold = effectGoldForDominance(
      effect,
      params,
      prelimPoison,
      winner.mag,
      winner.dur,
      hints,
    );
    if (dominanceGold > dominantGold) {
      dominantGold = dominanceGold;
      dominantEid = effectId;
    }
    sharedRows.push({ effect, winner, hints });
  }

  const domEff = effectById.get(dominantEid);
  if (!domEff) {
    return null;
  }
  const isPoison = !domEff.is_beneficial;

  const effectsOut: RecipeResult["effects"] = [];
  let total = 0;
  for (const row of sharedRows) {
    const { effect, winner, hints } = row;
    let effectGoldValue = effectGold(
      effect,
      params,
      { isPoison, shouldIncludeBenefactorPoisoner: true },
      winner.mag,
      winner.dur,
      hints,
    );
    if (!hints?.damageHealth && winner.gold !== 1) {
      effectGoldValue = Math.floor(effectGoldValue * winner.gold);
    }
    effectsOut.push({
      displayName: effect.display_name,
      effectKey: effect.effect_key,
      gold: effectGoldValue,
    });
    total += effectGoldValue;
  }

  effectsOut.sort((left, right) => right.gold - left.gold);

  let beneficialShared = false;
  let harmfulShared = false;
  for (const row of sharedRows) {
    if (row.effect.is_beneficial) {
      beneficialShared = true;
    } else {
      harmfulShared = true;
    }
  }
  const sharedBlend: RecipeSharedBlend =
    beneficialShared && harmfulShared ? "mixed" : beneficialShared ? "beneficial" : "harmful";

  return {
    ingredients: ingredientIds.map((ingredientId) => ({
      id: ingredientId,
      name: idToName.get(ingredientId) ?? "?",
    })),
    effects: effectsOut,
    totalGold: total,
    mixtureKind: isPoison ? "poison" : "potion",
    sharedBlend,
    dominantEffectKey: domEff.effect_key,
  };
}

/** Expand inventory lines into multiset of ingredient ids (order sorted by id). */
export function expandInventory(
  lines: InventoryLine[],
  nameToId: Map<string, { id: number; canonical: string }>,
): { ids: number[]; idToName: Map<number, string> } | { error: string } {
  const bag: number[] = [];
  const idToName = new Map<number, string>();
  for (const line of lines) {
    const key = normalizeIngredientKey(line.name);
    const row = nameToId.get(key);
    if (!row) {
      return { error: `Unknown ingredient: ${line.name}` };
    }
    const unitCount = Math.floor(line.quantity);
    if (unitCount < 0) {
      return { error: `Invalid quantity for ${line.name}` };
    }
    for (let repeatIdx = 0; repeatIdx < unitCount; repeatIdx++) {
      bag.push(row.id);
    }
    idToName.set(row.id, row.canonical);
  }
  bag.sort((leftId, rightId) => leftId - rightId);
  return { ids: bag, idToName };
}

/**
 * 2- and 3-ingredient mixtures over distinct sorted ids (same order as legacy
 * combinations2 then combinations3 on a distinct multiset, without Map dedup).
 * Collects at most `cap` mixtures (pairs first, then triples).
 */
function enumerateMixturesUpToCap(
  sortedDistinctIds: number[],
  cap: number,
): {
  combos: number[][];
  isTruncated: boolean;
} {
  const n = sortedDistinctIds.length;
  if (n < 2) {
    return { combos: [], isTruncated: false };
  }
  const pairCount = (n * (n - 1)) / 2;
  const tripleCount = n >= 3 ? (n * (n - 1) * (n - 2)) / 6 : 0;
  const totalMixtures = pairCount + tripleCount;
  const isTruncated = totalMixtures > cap;
  const limit = Math.min(totalMixtures, cap);
  const combos: number[][] = [];

  for (let leftIndex = 0; leftIndex < n && combos.length < limit; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < n && combos.length < limit; rightIndex++) {
      combos.push([sortedDistinctIds[leftIndex]!, sortedDistinctIds[rightIndex]!]);
    }
  }
  for (let leftIndex = 0; leftIndex < n && combos.length < limit; leftIndex++) {
    for (let midIndex = leftIndex + 1; midIndex < n && combos.length < limit; midIndex++) {
      for (let rightIndex = midIndex + 1; rightIndex < n && combos.length < limit; rightIndex++) {
        combos.push([
          sortedDistinctIds[leftIndex]!,
          sortedDistinctIds[midIndex]!,
          sortedDistinctIds[rightIndex]!,
        ]);
      }
    }
  }
  return { combos, isTruncated };
}

export function rankPotions(
  lines: InventoryLine[],
  nameToId: Map<string, { id: number; canonical: string }>,
  params: AlchemyParams = defaultAlchemyParams,
): { recipes: RecipeResult[]; isTruncated: boolean; error?: string } {
  const exp = expandInventory(lines, nameToId);
  if ("error" in exp) {
    return { recipes: [], isTruncated: false, error: exp.error };
  }

  const { ids, idToName } = exp;
  if (ids.length < 2) {
    return { recipes: [], isTruncated: false, error: "Need at least 2 ingredients total." };
  }

  const uniq = [...new Set(ids)];
  const ieMap = loadIngredientEffects(uniq);
  const allEffectIds = new Set<number>();
  for (const ingredientId of uniq) {
    for (const ingredientEffect of ieMap.get(ingredientId) ?? []) {
      allEffectIds.add(ingredientEffect.effect_id);
    }
  }
  const effectById = loadEffectsByIds([...allEffectIds]);

  const { combos: slice, isTruncated } = enumerateMixturesUpToCap(uniq, MAX_RECIPES);

  const recipes: RecipeResult[] = [];
  for (const combo of slice) {
    const evaluated = evaluateRecipe(combo, idToName, ieMap, effectById, params);
    if (evaluated) {
      recipes.push(evaluated);
    }
  }

  recipes.sort((left, right) => right.totalGold - left.totalGold);
  return { recipes, isTruncated };
}
