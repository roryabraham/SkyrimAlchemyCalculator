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
} from "./alchemy-math.ts";

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

function dominanceScore(
  effect: EffectRow,
  ie: IngredientEffectRow,
): number {
  const { mag, dur, gold } = magDurGold(ie);
  return effect.base_cost * mag * dur * gold;
}

function pickWinner(
  effect: EffectRow,
  contributors: { ingredientId: number; ie: IngredientEffectRow }[],
): { mag: number; dur: number; gold: number } {
  let best = magDurGold(contributors[0].ie);
  let bestScore = dominanceScore(effect, contributors[0].ie);
  for (let i = 1; i < contributors.length; i++) {
    const s = dominanceScore(effect, contributors[i].ie);
    if (s > bestScore) {
      bestScore = s;
      best = magDurGold(contributors[i].ie);
    }
  }
  return best;
}

function evaluateRecipe(
  ingredientIds: number[],
  idToName: Map<number, string>,
  ieMap: Map<number, IngredientEffectRow[]>,
  effectById: Map<number, EffectRow>,
  params: AlchemyParams,
): RecipeResult | null {
  const effCount = new Map<number, number>();
  const contrib = new Map<
    number,
    { ingredientId: number; ie: IngredientEffectRow }[]
  >();

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
    if (n >= 2) shared.push(eid);
  }
  if (shared.length === 0) return null;

  let dominantEid = shared[0];
  let dominantGold = -1;
  const prelimPoison = false;

  for (const eid of shared) {
    const eff = effectById.get(eid);
    if (!eff) continue;
    const c = contrib.get(eid) ?? [];
    const w = pickWinner(eff, c);
    const g = effectGoldForDominance(
      eff,
      params,
      prelimPoison,
      w.mag,
      w.dur,
    );
    if (g > dominantGold) {
      dominantGold = g;
      dominantEid = eid;
    }
  }

  const domEff = effectById.get(dominantEid);
  if (!domEff) return null;
  const isPoison = !domEff.is_beneficial;

  const effectsOut: RecipeResult["effects"] = [];
  let total = 0;
  for (const eid of shared) {
    const eff = effectById.get(eid);
    if (!eff) continue;
    const c = contrib.get(eid) ?? [];
    const w = pickWinner(eff, c);
    let g = effectGold(
      eff,
      params,
      { isPoison, includeBenefactorPoisoner: true },
      w.mag,
      w.dur,
    );
    if (w.gold !== 1) g = Math.floor(g * w.gold);
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

function normalizeInvKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Expand inventory lines into multiset of ingredient ids (order sorted by id). */
export function expandInventory(
  lines: InventoryLine[],
  nameToId: Map<string, { id: number; canonical: string }>,
): { ids: number[]; idToName: Map<number, string> } | { error: string } {
  const bag: number[] = [];
  const idToName = new Map<number, string>();
  for (const line of lines) {
    const key = normalizeInvKey(line.name);
    const row = nameToId.get(key);
    if (!row) {
      return { error: `Unknown ingredient: ${line.name}` };
    }
    const n = Math.floor(line.count);
    if (n < 0) return { error: `Invalid count for ${line.name}` };
    for (let k = 0; k < n; k++) bag.push(row.id);
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
  if ("error" in exp) return { recipes: [], truncated: false, error: exp.error };

  const { ids, idToName } = exp;
  if (ids.length < 2) {
    return { recipes: [], truncated: false, error: "Need at least 2 ingredients total." };
  }

  const uniq = [...new Set(ids)];
  const ieMap = loadIngredientEffects(uniq);
  const allEffectIds = new Set<number>();
  for (const iid of uniq) {
    for (const ie of ieMap.get(iid) ?? []) allEffectIds.add(ie.effect_id);
  }
  const effectById = loadEffectsByIds([...allEffectIds]);

  const combos: number[][] = [...combinations2(ids), ...combinations3(ids)];
  let truncated = false;
  const cap = MAX_RECIPES;
  const slice = combos.length > cap ? (truncated = true, combos.slice(0, cap)) : combos;

  const recipes: RecipeResult[] = [];
  for (const combo of slice) {
    const r = evaluateRecipe(combo, idToName, ieMap, effectById, params);
    if (r) recipes.push(r);
  }

  recipes.sort((a, b) => b.totalGold - a.totalGold);
  return { recipes, truncated };
}
