/**
 * Performance harness for recipe generation (`rankPotions`).
 *
 * Run from repo root: bun run server/bench/recipe-generation.perf.ts
 * Optional: PERF_MEGA_RUNS=3 PERF_MEGA_WARMUP=1 for full-catalog timing.
 */
import { Database } from "bun:sqlite";
import path from "node:path";
import { loadAllIngredientRows, loadNameIndex } from "../src/db.ts";
import { expandInventory, rankPotions } from "../src/potion-engine.ts";

/** Mirrors server/src/potion-engine.ts combo + filter shape (for allocation counting). */
function combinations2(ids: number[]): number[][] {
  const keys = new Map<string, [number, number]>();
  for (let leftIndex = 0; leftIndex < ids.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < ids.length; rightIndex++) {
      const firstId = ids[leftIndex];
      const secondId = ids[rightIndex];
      const pairKey = firstId <= secondId ? `${firstId},${secondId}` : `${secondId},${firstId}`;
      keys.set(pairKey, [firstId, secondId]);
    }
  }
  return [...keys.values()];
}

function combinations3(ids: number[]): number[][] {
  const keys = new Map<string, [number, number, number]>();
  for (let leftIndex = 0; leftIndex < ids.length; leftIndex++) {
    for (let midIndex = leftIndex + 1; midIndex < ids.length; midIndex++) {
      for (let rightIndex = midIndex + 1; rightIndex < ids.length; rightIndex++) {
        const arr = [ids[leftIndex], ids[midIndex], ids[rightIndex]].sort(
          (leftId, rightId) => leftId - rightId,
        );
        keys.set(arr.join(","), arr as [number, number, number]);
      }
    }
  }
  return [...keys.values()];
}

function isDistinctIngredientMixture(combo: number[]): boolean {
  return new Set(combo).size === combo.length;
}

function comboStats(idsLength: number) {
  const ids = Array.from({ length: idsLength }, (_, i) => i + 1);
  const c2 = combinations2(ids).filter(isDistinctIngredientMixture);
  const c3 = combinations3(ids).filter(isDistinctIngredientMixture);
  const merged = [...c2, ...c3];
  return {
    n: idsLength,
    pairs: c2.length,
    triples: c3.length,
    totalBuilt: merged.length,
    capped8000: Math.min(merged.length, 8000),
  };
}

function multisetComboCounts(bag: number[]) {
  const c2 = combinations2(bag).filter(isDistinctIngredientMixture);
  const c3 = combinations3(bag).filter(isDistinctIngredientMixture);
  return { pairsOut: c2.length, triplesOut: c3.length, totalOut: c2.length + c3.length };
}

function median(samples: number[]): number {
  const s = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function timeIt(label: string, runs: number, fn: () => void, warmupRuns = 2): void {
  const samples: number[] = [];
  for (let warm = 0; warm < warmupRuns; warm++) {
    fn();
  }
  for (let runIdx = 0; runIdx < runs; runIdx++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  const med = median(samples);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  console.log(`${label}: median ${med.toFixed(2)}ms  mean ${mean.toFixed(2)}ms  (n=${runs})`);
}

function firstNIngredientLines(
  nameIndex: Map<string, { id: number; canonical: string }>,
  n: number,
): { name: string; quantity: number }[] {
  const lines: { name: string; quantity: number }[] = [];
  for (const { canonical } of nameIndex.values()) {
    lines.push({ name: canonical, quantity: 1 });
    if (lines.length >= n) {
      break;
    }
  }
  if (lines.length < n) {
    throw new Error(`Need at least ${n} ingredients in DB, got ${lines.length}`);
  }
  return lines;
}

function main() {
  const dbPath = path.join(import.meta.dir, "..", "..", "data", "alchemy.sqlite");
  const db = new Database(dbPath, { readonly: true });
  const totalIngredients = (
    db.query("SELECT COUNT(*) AS c FROM ingredients").get() as { c: number }
  ).c;
  db.close();

  console.log(`Ingredients in DB: ${totalIngredients}\n`);

  console.log("--- Combo construction (distinct ids 1..n, same as engine) ---");
  const comboSizes = [25, 30, 35, 40, 45, 50];
  if (process.env.PERF_STRESS === "1") {
    comboSizes.push(75, 100, 125, 150);
  }
  for (const n of comboSizes) {
    const st = comboStats(n);
    console.log(
      `n=${n}  pairs=${st.pairs}  triples=${st.triples}  totalArraysBuilt=${st.totalBuilt}  evaluatedCap=${st.capped8000}`,
    );
    const ids = Array.from({ length: n }, (_, i) => i + 1);
    const runs = n >= 100 ? 1 : 5;
    timeIt(`  build+filter combos only`, runs, () => {
      const combos = [...combinations2(ids), ...combinations3(ids)].filter(isDistinctIngredientMixture);
      void combos.length;
    });
  }
  if (process.env.PERF_STRESS !== "1") {
    console.log("(Set PERF_STRESS=1 to include n=75..150 combo timing.)\n");
  }

  console.log("\n--- rankPotions end-to-end (first N canonical names, qty 1 each) ---");
  const nameIndex = loadNameIndex();
  for (const n of [20, 25, 30, 35, 40]) {
    const inv = firstNIngredientLines(nameIndex, n);
    timeIt(`rankPotions n=${n}`, Math.max(3, n <= 25 ? 8 : 3), () => {
      rankPotions(inv, nameIndex);
    });
  }

  console.log("\n--- Multiset: few ingredient types, large total count (inventory realism) ---");
  const few = firstNIngredientLines(nameIndex, 5);
  for (const q of [10, 15, 20, 25, 30]) {
    const inv = few.map((line) => ({ ...line, quantity: q }));
    const exp = expandInventory(inv, nameIndex);
    if ("error" in exp) {
      throw new Error(exp.error);
    }
    const bag = exp.ids;
    const mc = multisetComboCounts(bag);
    const indexTriples = (bag.length * (bag.length - 1) * (bag.length - 2)) / 6;
    console.log(
      `5 types × qty ${q} => bagLen=${bag.length}  innerTripleLoops≈${Math.round(indexTriples)}  uniqueCombosOut=${mc.totalOut} (pairs ${mc.pairsOut}, triples ${mc.triplesOut})`,
    );
    timeIt(`  build combos only (multiset bag)`, 2, () => {
      const combos = [...combinations2(bag), ...combinations3(bag)].filter(isDistinctIngredientMixture);
      void combos.length;
    });
    timeIt(`rankPotions 5×${q}`, 2, () => {
      rankPotions(inv, nameIndex);
    });
  }

  const qtyEach = 10;
  console.log(`\n--- Realistic full catalog: qty ${qtyEach} of every ingredient ---`);
  const catalogRows = loadAllIngredientRows();
  const typeCount = catalogRows.length;
  const pairCount = (typeCount * (typeCount - 1)) / 2;
  const tripleCount =
    typeCount >= 3 ? (typeCount * (typeCount - 1) * (typeCount - 2)) / 6 : 0;
  const totalMixtures = pairCount + tripleCount;
  const fullCatalogInv = catalogRows.map((row) => ({ name: row.name, quantity: qtyEach }));
  console.log(
    `ingredientTypes=${typeCount}  unitsInBag=${typeCount * qtyEach}  2+3 mixtures=${Math.round(totalMixtures)}  MAX_RECIPES cap=8000  truncated=${totalMixtures > 8000}`,
  );
  const megaRuns = Number(process.env.PERF_MEGA_RUNS ?? "2");
  const megaWarmup = Number(process.env.PERF_MEGA_WARMUP ?? "1");
  timeIt(
    `rankPotions full catalog ×${qtyEach}`,
    Number.isFinite(megaRuns) && megaRuns >= 1 ? megaRuns : 2,
    () => {
      rankPotions(fullCatalogInv, nameIndex);
    },
    Number.isFinite(megaWarmup) && megaWarmup >= 0 ? megaWarmup : 1,
  );
}

main();
