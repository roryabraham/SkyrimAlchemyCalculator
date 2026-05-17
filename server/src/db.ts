import path from "node:path";
import { Database } from "bun:sqlite";

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

export function searchIngredients(q: string, limit = 30): IngredientRow[] {
  const db = getDb();
  const needle = `%${q.toLowerCase().replace(/%/g, "\\%")}%`;
  return db
    .query(
      `SELECT id, name, name_normalized FROM ingredients
       WHERE name_normalized LIKE ? ESCAPE '\\'
       ORDER BY name ASC LIMIT ?`,
    )
    .all(needle, limit) as IngredientRow[];
}

export function loadIngredientEffects(
  ingredientIds: number[],
): Map<number, IngredientEffectRow[]> {
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

export function resolveIngredientIds(
  names: string[],
): { id: number; name: string }[] {
  const db = getDb();
  const sel = db.prepare(
    `SELECT id, name FROM ingredients WHERE name_normalized = ?`,
  );
  const out: { id: number; name: string }[] = [];
  for (const raw of names) {
    const key = raw
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const row = sel.get(key) as { id: number; name: string } | null;
    if (row) out.push(row);
  }
  return out;
}

export function loadNameIndex(): Map<
  string,
  { id: number; canonical: string }
> {
  const db = getDb();
  const rows = db
    .query("SELECT id, name, name_normalized FROM ingredients")
    .all() as { id: number; name: string; name_normalized: string }[];
  const m = new Map<string, { id: number; canonical: string }>();
  for (const r of rows) {
    m.set(r.name_normalized, { id: r.id, canonical: r.name });
  }
  return m;
}
