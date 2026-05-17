/**
 * Fetch UESP Skyrim:Ingredients (Standard + Creation Club tables) and write
 * `data/ingredients.raw.txt` plus normalized `data/ingredients.json`.
 * Targets Anniversary Edition coverage (base + DLC + CC bundled with AE).
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fetchMediaWikiParseHtml } from "../libs/mediawiki-parse-text.ts";
import { parseIngredientTables } from "./lib/parse-ingredients-html.ts";
import type { ParsedIngredient } from "./lib/ingredient-types.ts";

const ROOT = path.join(import.meta.dir, "..");
const DATA = path.join(ROOT, "data");

async function fetchHtml(): Promise<string> {
  return fetchMediaWikiParseHtml({
    page: "Skyrim:Ingredients",
    userAgent: "SkyrimAlchemyCalculator/1.0 (educational; contact: local)",
  });
}

function toJsonRecord(row: ParsedIngredient) {
  return {
    name: row.name,
    nameNormalized: row.nameNormalized,
    rowId: row.rowId,
    formIdRaw: row.formIdRaw,
    section: row.section,
    value: row.value,
    weight: row.weight,
    merchantAvail: row.merchantAvail,
    garden: row.garden,
    effects: row.effects.map((e, i) => ({
      slot: i + 1,
      effectKey: e.effectKey,
      displayName: e.displayName,
      magMult: e.magMult,
      durMult: e.durMult,
      goldMult: e.goldMult,
    })),
  };
}

function rawTsv(rows: ParsedIngredient[]): string {
  const header = ["name", "section", "formIdRaw", "e1", "e2", "e3", "e4"].join("\t");
  const lines = rows.map((r) =>
    [r.name, r.section, r.formIdRaw, ...r.effects.map((e) => e.displayName)].join("\t"),
  );
  return [header, ...lines].join("\n");
}

await mkdir(DATA, { recursive: true });

const html = await fetchHtml();
const parsed = parseIngredientTables(html);

const byName = new Map<string, ParsedIngredient>();
for (const p of parsed) {
  byName.set(p.name, p);
}
const merged = [...byName.values()];

await Bun.write(path.join(DATA, "ingredients.raw.txt"), rawTsv(merged));
await Bun.write(
  path.join(DATA, "ingredients.json"),
  JSON.stringify(merged.map(toJsonRecord), null, 2) + "\n",
);

console.log(`Wrote ${merged.length} ingredients to data/ingredients.json`);
