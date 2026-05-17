/**
 * Idempotent SQLite build from data/effects.json and data/ingredients.json.
 */
import { Database } from "bun:sqlite";
import path from "node:path";

const ROOT = path.join(import.meta.dir, "..");
const DB_PATH = path.join(ROOT, "data", "alchemy.sqlite");

type EffectJson = {
  effectKey: string;
  displayName: string;
  baseCost: number;
  baseMag: number;
  baseDur: number;
  valueAt100: number;
  powerAffectsMagnitude: boolean;
  powerAffectsDuration: boolean;
  isBeneficial: boolean;
};

type IngredientJson = {
  name: string;
  nameNormalized: string;
  rowId: string;
  formIdRaw: string;
  section: string;
  value: number | null;
  weight: number | null;
  merchantAvail: string;
  garden: string;
  effects: {
    slot: number;
    effectKey: string;
    magMult: number | null;
    durMult: number | null;
    goldMult: number | null;
  }[];
};

const effects: EffectJson[] = JSON.parse(
  await Bun.file(path.join(ROOT, "data", "effects.json")).text(),
);
const ingredients: IngredientJson[] = JSON.parse(
  await Bun.file(path.join(ROOT, "data", "ingredients.json")).text(),
);

const db = new Database(DB_PATH);
db.run("PRAGMA foreign_keys = ON;");

db.exec(`
DROP TABLE IF EXISTS ingredient_effects;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS effects;

CREATE TABLE effects (
  id INTEGER PRIMARY KEY,
  effect_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  base_cost REAL NOT NULL,
  base_mag REAL NOT NULL,
  base_dur REAL NOT NULL,
  value_at_100 REAL NOT NULL,
  power_affects_magnitude INTEGER NOT NULL,
  power_affects_duration INTEGER NOT NULL,
  is_beneficial INTEGER NOT NULL
);

CREATE TABLE ingredients (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_normalized TEXT NOT NULL,
  row_id TEXT,
  form_id_raw TEXT,
  section TEXT,
  value INTEGER,
  weight REAL,
  merchant_avail TEXT,
  garden TEXT
);

CREATE INDEX idx_ingredients_name_norm ON ingredients(name_normalized);

CREATE TABLE ingredient_effects (
  ingredient_id INTEGER NOT NULL,
  slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 4),
  effect_id INTEGER NOT NULL,
  mag_mult REAL,
  dur_mult REAL,
  gold_mult REAL,
  PRIMARY KEY (ingredient_id, slot),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
  FOREIGN KEY (effect_id) REFERENCES effects(id)
);
`);

const insEffect = db.prepare(`
INSERT INTO effects (effect_key, display_name, base_cost, base_mag, base_dur, value_at_100,
  power_affects_magnitude, power_affects_duration, is_beneficial)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const e of effects) {
  insEffect.run(
    e.effectKey,
    e.displayName,
    e.baseCost,
    e.baseMag,
    e.baseDur,
    e.valueAt100,
    e.powerAffectsMagnitude ? 1 : 0,
    e.powerAffectsDuration ? 1 : 0,
    e.isBeneficial ? 1 : 0,
  );
}

const insIng = db.prepare(`
INSERT INTO ingredients (name, name_normalized, row_id, form_id_raw, section, value, weight, merchant_avail, garden)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insIE = db.prepare(`
INSERT INTO ingredient_effects (ingredient_id, slot, effect_id, mag_mult, dur_mult, gold_mult)
VALUES (?, ?, ?, ?, ?, ?)
`);

const effectIdByKey = new Map<string, number>();
for (const row of db.query("SELECT id, effect_key FROM effects").all() as {
  id: number;
  effect_key: string;
}[]) {
  effectIdByKey.set(row.effect_key, row.id);
}

for (const ing of ingredients) {
  const info = insIng.run(
    ing.name,
    ing.nameNormalized,
    ing.rowId,
    ing.formIdRaw,
    ing.section,
    ing.value,
    ing.weight,
    ing.merchantAvail,
    ing.garden,
  );
  const ingredientId = Number(info.lastInsertRowid);
  for (const slot of ing.effects) {
    const eid = effectIdByKey.get(slot.effectKey);
    if (eid === undefined) {
      throw new Error(`Missing effect ${slot.effectKey} for ${ing.name}`);
    }
    insIE.run(ingredientId, slot.slot, eid, slot.magMult, slot.durMult, slot.goldMult);
  }
}

db.close();
console.log(`Seeded ${DB_PATH}`);
