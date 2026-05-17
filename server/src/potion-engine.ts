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

export type InventoryLine = { name: string; count: number };

export type RecipeResult = {
  ingredients: { name: string; id: number }[];
  effects: { displayName: string; effectKey: string; gold: number }[];
  totalGold: number;
  mixtureKind: "potion" | "poison";
  dominantEffectKey: string;
};

function magDurGold(ie: IngredientEffectRow): {
  mag: number;
  dur: number;
  gold: number;
} {
  return {
    mag: ie.mag_mult ?? 1,
    dur: ie.dur_mult ?? 1,
    gold: ie.gold_mult ?? 1,
  };
}

function dominanceScore(effect: EffectRow, ie: IngredientEffectRow): number {
  const { mag, dur, gold } = magDurGold(ie);
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
  const scored = contributors.map((c) => {
    const name = idToName.get(c.ingredientId) ?? "";
    const row = getDamageHealthRow(name);
    const priority = row?.priority ?? 0;
    const dom = dominanceScore(effect, c.ie);
    return { c, priority, dom };
  });
  scored.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.dom - a.dom;
  });
  const w = scored[0].c;
  const m = magDurGold(w.ie);
  return { ...m, ingredientId: w.ingredientId };
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
  for (let i = 1; i < contributors.length; i++) {
    const s = dominanceScore(effect, contributors[i].ie);
    if (s > bestScore) {
      bestScore = s;
      bestIdx = i;
    }
  }
  const w = contributors[bestIdx];
  const m = magDurGold(w.ie);
  return { ...m, ingredientId: w.ingredientId };
}

function buildGoldHints(
  effect: EffectRow,
  winnerIngredientId: number,
  idToName: Map<number, string>,
  w: { mag: number; dur: number; gold: number },
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
  const intrinsicDurForGold = row.useTenSecondGoldDuration
    ? 10
    : Math.max(1, Math.round(row.baseDurCk * w.dur));
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

  for (const iid of ingredientIds) {
    for (const ie of ieMap.get(iid) ?? []) {
      effCount.set(ie.effect_id, (effCount.get(ie.effect_id) ?? 0) + 1);
      const arr = contrib.get(ie.effect_id) ?? [];
      arr.push({ ingredientId: iid, ie });
      contrib.set(ie.effect_id, arr);
    }
  }

  const shared: number[] = [];
  for (const [eid, n] of effCount) {
    if (n >= 2) {
      shared.push(eid);
    }
  }
  if (shared.length === 0) {
    return null;
  }

  let dominantEid = shared[0];
  let dominantGold = -1;
  const prelimPoison = false;

  for (const eid of shared) {
    const eff = effectById.get(eid);
    if (!eff) {
      continue;
    }
    const c = contrib.get(eid) ?? [];
    const w = pickWinner(eff, c, idToName);
    const hints = buildGoldHints(eff, w.ingredientId, idToName, w);
    const g = effectGoldForDominance(eff, params, prelimPoison, w.mag, w.dur, hints);
    if (g > dominantGold) {
      dominantGold = g;
      dominantEid = eid;
    }
  }

  const domEff = effectById.get(dominantEid);
  if (!domEff) {
    return null;
  }
  const isPoison = !domEff.is_beneficial;

  const effectsOut: RecipeResult["effects"] = [];
  let total = 0;
  for (const eid of shared) {
    const eff = effectById.get(eid);
    if (!eff) {
      continue;
    }
    const c = contrib.get(eid) ?? [];
    const w = pickWinner(eff, c, idToName);
    const hints = buildGoldHints(eff, w.ingredientId, idToName, w);
    let g = effectGold(
      eff,
      params,
      { isPoison, includeBenefactorPoisoner: true },
      w.mag,
      w.dur,
      hints,
    );
    if (!hints?.damageHealth && w.gold !== 1) {
      g = Math.floor(g * w.gold);
    }
    effectsOut.push({
      displayName: eff.display_name,
      effectKey: eff.effect_key,
      gold: g,
    });
    total += g;
  }

  effectsOut.sort((a, b) => b.gold - a.gold);

  return {
    ingredients: ingredientIds.map((id) => ({
      id,
      name: idToName.get(id) ?? "?",
    })),
    effects: effectsOut,
    totalGold: total,
    mixtureKind: isPoison ? "poison" : "potion",
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
    const n = Math.floor(line.count);
    if (n < 0) {
      return { error: `Invalid count for ${line.name}` };
    }
    for (let k = 0; k < n; k++) {
      bag.push(row.id);
    }
    idToName.set(row.id, row.canonical);
  }
  bag.sort((a, b) => a - b);
  return { ids: bag, idToName };
}

function combinations2(ids: number[]): number[][] {
  const keys = new Map<string, [number, number]>();
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];
      const k = a <= b ? `${a},${b}` : `${b},${a}`;
      keys.set(k, [a, b]);
    }
  }
  return [...keys.values()];
}

function combinations3(ids: number[]): number[][] {
  const keys = new Map<string, [number, number, number]>();
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      for (let k = j + 1; k < ids.length; k++) {
        const arr = [ids[i], ids[j], ids[k]].sort((x, y) => x - y);
        keys.set(arr.join(","), arr as [number, number, number]);
      }
    }
  }
  return [...keys.values()];
}

export function rankPotions(
  lines: InventoryLine[],
  nameToId: Map<string, { id: number; canonical: string }>,
  params: AlchemyParams = defaultAlchemyParams,
): { recipes: RecipeResult[]; truncated: boolean; error?: string } {
  const exp = expandInventory(lines, nameToId);
  if ("error" in exp) {
    return { recipes: [], truncated: false, error: exp.error };
  }

  const { ids, idToName } = exp;
  if (ids.length < 2) {
    return { recipes: [], truncated: false, error: "Need at least 2 ingredients total." };
  }

  const uniq = [...new Set(ids)];
  const ieMap = loadIngredientEffects(uniq);
  const allEffectIds = new Set<number>();
  for (const iid of uniq) {
    for (const ie of ieMap.get(iid) ?? []) {
      allEffectIds.add(ie.effect_id);
    }
  }
  const effectById = loadEffectsByIds([...allEffectIds]);

  const combos: number[][] = [...combinations2(ids), ...combinations3(ids)];
  let truncated = false;
  const cap = MAX_RECIPES;
  const slice = combos.length > cap ? ((truncated = true), combos.slice(0, cap)) : combos;

  const recipes: RecipeResult[] = [];
  for (const combo of slice) {
    const r = evaluateRecipe(combo, idToName, ieMap, effectById, params);
    if (r) {
      recipes.push(r);
    }
  }

  recipes.sort((a, b) => b.totalGold - a.totalGold);
  return { recipes, truncated };
}
