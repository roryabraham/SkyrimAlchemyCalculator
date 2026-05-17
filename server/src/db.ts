import path from "node:path";
import { Database } from "bun:sqlite";
import { levenshtein } from "../../libs/levenshtein.ts";
import { normalizeIngredientKey } from "../../libs/ingredient-key.ts";

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;
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
  if (_ingredientSearchRows) return _ingredientSearchRows;
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
  if (keyLen <= 1) return 0;
  if (keyLen <= 3) return 1;
  return Math.min(12, Math.ceil(keyLen * 0.45));
}

export function searchIngredients(q: string, limit = 30): IngredientRow[] {
  const key = normalizeIngredientKey(q);
  if (!key) return [];

  const rows = getIngredientSearchRows();
  const maxD = maxTyposForKey(key.length);

  const substring: IngredientRow[] = [];
  const typoHits: { row: IngredientRow; dist: number }[] = [];

  for (const r of rows) {
    if (r.name_normalized.includes(key)) {
      substring.push(r);
      continue;
    }
    const dist = levenshtein(key, r.name_normalized);
    if (dist <= maxD) typoHits.push({ row: r, dist });
  }

  substring.sort((a, b) => a.name.localeCompare(b.name));
  typoHits.sort((a, b) => {
    if (a.dist !== b.dist) return a.dist - b.dist;
    return a.row.name.localeCompare(b.row.name);
  });

  const seen = new Set<number>();
  const out: IngredientRow[] = [];

  for (const r of substring) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
    if (out.length >= limit) return out;
  }
  for (const { row: r } of typoHits) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
    if (out.length >= limit) return out;
  }

  return out;
}

export function loadIngredientEffects(ingredientIds: number[]): Map<number, IngredientEffectRow[]> {
  const db = getDb();
  const map = new Map<number, IngredientEffectRow[]>();
  if (ingredientIds.length === 0) return map;
  const placeholders = ingredientIds.map(() => "?").join(",");
  const rows = db
    .query(
      `SELECT ingredient_id, slot, effect_id, mag_mult, dur_mult, gold_mult
       FROM ingredient_effects WHERE ingredient_id IN (${placeholders})
       ORDER BY ingredient_id, slot`,
    )
    .all(...ingredientIds) as IngredientEffectRow[];
  for (const r of rows) {
    const arr = map.get(r.ingredient_id) ?? [];
    arr.push(r);
    map.set(r.ingredient_id, arr);
  }
  return map;
}

export function loadEffectsByIds(ids: number[]): Map<number, EffectRow> {
  const db = getDb();
  const m = new Map<number, EffectRow>();
  if (ids.length === 0) return m;
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .query(`SELECT * FROM effects WHERE id IN (${placeholders})`)
    .all(...ids) as EffectRow[];
  for (const r of rows) m.set(r.id, r);
  return m;
}

export function resolveIngredientIds(names: string[]): { id: number; name: string }[] {
  const db = getDb();
  const sel = db.prepare(`SELECT id, name FROM ingredients WHERE name_normalized = ?`);
  const out: { id: number; name: string }[] = [];
  for (const raw of names) {
    const key = normalizeIngredientKey(raw);
    const row = sel.get(key) as { id: number; name: string } | null;
    if (row) out.push(row);
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
  const m = new Map<string, { id: number; canonical: string }>();
  for (const r of rows) {
    m.set(r.name_normalized, { id: r.id, canonical: r.name });
  }
  return m;
}
