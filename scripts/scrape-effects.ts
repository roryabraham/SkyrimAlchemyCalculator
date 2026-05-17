/**
 * Fetch UESP Skyrim:Alchemy_Effects Effect List table → data/effects.json
 */
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fetchMediaWikiParseHtml } from "../libs/mediawiki-parse-text.ts";
import { parseAlchemyEffectsHtml } from "./lib/parse-effects-html.ts";

const ROOT = path.join(import.meta.dir, "..");
const DATA = path.join(ROOT, "data");

async function fetchHtml(): Promise<string> {
  return fetchMediaWikiParseHtml({
    page: "Skyrim:Alchemy_Effects",
    userAgent: "SkyrimAlchemyCalculator/1.0 (educational)",
  });
}

await mkdir(DATA, { recursive: true });
const rows = parseAlchemyEffectsHtml(await fetchHtml());
await Bun.write(path.join(DATA, "effects.json"), JSON.stringify(rows, null, 2) + "\n");
console.log(`Wrote ${rows.length} effects to data/effects.json`);
