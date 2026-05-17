import path from "node:path";
import { Database } from "bun:sqlite";
import { levenshtein } from "../../libs/levenshtein.ts";
import { normalizeIngredientKey } from "../../libs/ingredient-key.ts";

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) {
    return _db;
  }
  const root = path.join(import.meta.dir, "..", "..");
  const file = path.join(root, "data", "alchemy.sqlite");
  _db = new Database(file, { readonly: true });
  _db.run("PRAGMA foreign_keys = ON;");
  return _db;
}

export type EffectRow = {
  id: number;
  effect_key: string;
  display_name: string;
  base_cost: number;
  base_mag: number;
  base_dur: number;
  value_at_100: number;
  power_affects_magnitude: number;
  power_affects_duration: number;
  is_beneficial: number;
};

export type IngredientRow = {
  id: number;
  name: string;
  name_normalized: string;
};

export type IngredientEffectRow = {
  ingredient_id: number;
  slot: number;
  effect_id: number;
  mag_mult: number | null;
  dur_mult: number | null;
  gold_mult: number | null;
};

let _ingredientSearchRows: IngredientRow[] | null = null;

function getIngredientSearchRows(): IngredientRow[] {
  if (_ingredientSearchRows) {
    return _ingredientSearchRows;
  }
  const db = getDb();
  _ingredientSearchRows = db
    .query("SELECT id, name, name_normalized FROM ingredients")
    .all() as IngredientRow[];
  return _ingredientSearchRows;
}

/** All ingredients (for icon lookup by id). Uses the same cache as search. */
export function loadAllIngredientRows(): IngredientRow[] {
  return getIngredientSearchRows();
}

export { normalizeIngredientKey };

function maxTyposForKey(keyLen: number): number {
  if (keyLen <= 1) {
    return 0;
  }
  if (keyLen <= 3) {
    return 1;
  }
  return Math.min(12, Math.ceil(keyLen * 0.45));
}

export function searchIngredients(query: string, limit = 30): IngredientRow[] {
  const key = normalizeIngredientKey(query);
  if (!key) {
    return [];
  }

  const rows = getIngredientSearchRows();
  const maxD = maxTyposForKey(key.length);

  const substring: IngredientRow[] = [];
  const typoHits: { row: IngredientRow; dist: number }[] = [];

  for (const row of rows) {
    if (row.name_normalized.includes(key)) {
      substring.push(row);
      continue;
    }
    const dist = levenshtein(key, row.name_normalized);
    if (dist <= maxD) {
      typoHits.push({ row, dist });
    }
  }

  substring.sort((left, right) => left.name.localeCompare(right.name));
  typoHits.sort((left, right) => {
    if (left.dist !== right.dist) {
      return left.dist - right.dist;
    }
    return left.row.name.localeCompare(right.row.name);
  });

  const seen = new Set<number>();
  const out: IngredientRow[] = [];

  for (const row of substring) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    out.push(row);
    if (out.length >= limit) {
      return out;
    }
  }
  for (const { row: typoRow } of typoHits) {
    if (seen.has(typoRow.id)) {
      continue;
    }
    seen.add(typoRow.id);
    out.push(typoRow);
    if (out.length >= limit) {
      return out;
    }
  }

  return out;
}

export function loadIngredientEffects(ingredientIds: number[]): Map<number, IngredientEffectRow[]> {
  const db = getDb();
  const map = new Map<number, IngredientEffectRow[]>();
  if (ingredientIds.length === 0) {
    return map;
  }
  const placeholders = ingredientIds.map(() => "?").join(",");
  const rows = db
    .query(
      `SELECT ingredient_id, slot, effect_id, mag_mult, dur_mult, gold_mult
       FROM ingredient_effects WHERE ingredient_id IN (${placeholders})
       ORDER BY ingredient_id, slot`,
    )
    .all(...ingredientIds) as IngredientEffectRow[];
  for (const row of rows) {
    const arr = map.get(row.ingredient_id) ?? [];
    arr.push(row);
    map.set(row.ingredient_id, arr);
  }
  return map;
}

export function loadEffectsByIds(ids: number[]): Map<number, EffectRow> {
  const db = getDb();
  const effectMap = new Map<number, EffectRow>();
  if (ids.length === 0) {
    return effectMap;
  }
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .query(`SELECT * FROM effects WHERE id IN (${placeholders})`)
    .all(...ids) as EffectRow[];
  for (const row of rows) {
    effectMap.set(row.id, row);
  }
  return effectMap;
}

export function resolveIngredientIds(names: string[]): { id: number; name: string }[] {
  const db = getDb();
  const sel = db.prepare(`SELECT id, name FROM ingredients WHERE name_normalized = ?`);
  const out: { id: number; name: string }[] = [];
  for (const raw of names) {
    const key = normalizeIngredientKey(raw);
    const row = sel.get(key) as { id: number; name: string } | null;
    if (row) {
      out.push(row);
    }
  }
  return out;
}

export function loadNameIndex(): Map<string, { id: number; canonical: string }> {
  const db = getDb();
  const rows = db.query("SELECT id, name, name_normalized FROM ingredients").all() as {
    id: number;
    name: string;
    name_normalized: string;
  }[];
  const nameIndexMap = new Map<string, { id: number; canonical: string }>();
  for (const row of rows) {
    nameIndexMap.set(row.name_normalized, { id: row.id, canonical: row.name });
  }
  return nameIndexMap;
}
