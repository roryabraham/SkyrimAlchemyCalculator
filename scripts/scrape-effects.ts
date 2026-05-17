/**
 * Fetch UESP Skyrim:Alchemy_Effects Effect List table → data/effects.json
 */
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { parseAlchemyEffectsHtml } from "./lib/parse-effects-html.ts";

const ROOT = path.join(import.meta.dir, "..");
const DATA = path.join(ROOT, "data");

const MW =
  "https://en.uesp.net/w/api.php?action=parse&page=Skyrim:Alchemy_Effects&prop=text&format=json";

async function fetchHtml(): Promise<string> {
  const res = await fetch(MW, {
    headers: { "User-Agent": "SkyrimAlchemyCalculator/1.0 (educational)" },
  });
  if (!res.ok) throw new Error(`UESP HTTP ${res.status}`);
  const j = (await res.json()) as {
    parse?: { text?: { "*": string } };
    error?: { info?: string };
  };
  if (j.error) throw new Error(j.error.info ?? "UESP API error");
  const html = j.parse?.text?.["*"];
  if (!html) throw new Error("Missing parse.text");
  return html;
}

await mkdir(DATA, { recursive: true });
const rows = parseAlchemyEffectsHtml(await fetchHtml());
await Bun.write(path.join(DATA, "effects.json"), JSON.stringify(rows, null, 2) + "\n");
console.log(`Wrote ${rows.length} effects to data/effects.json`);
