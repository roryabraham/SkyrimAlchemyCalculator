/**
 * Read data/ingredients.json, resolve each ingredient's UESP wiki page images,
 * download SR-icon-ingredient-* files into web/public/ingredient-icons/, and
 * write data/ingredient-icons.json (nameNormalized -> publicPath).
 *
 * - **Resume / local cache:** loads existing `data/ingredient-icons.json`; if an entry's
 *   file already exists under `web/public/` with size &gt; 0, skips all UESP calls for that row.
 * - Persists the manifest after each successful download so a crash mid-run can resume.
 * - **Backoff:** retries timeouts, 429, and 5xx with exponential backoff (see constants).
 * - Bounded pool: `INGREDIENT_ICON_FETCH_CONCURRENCY` (default **4**, max **8**).
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { runPool } from "../libs/async-pool.ts";
import { fetchWithTimeout } from "../libs/fetch-with-timeout.ts";
import { retryWithBackoff } from "../libs/retry-with-backoff.ts";
import { sleep } from "../libs/sleep.ts";
import { isAbortError, isLikelyTransientNetworkError } from "../libs/transient-network-error.ts";

const ROOT = path.join(import.meta.dir, "..");
const DATA = path.join(ROOT, "data");
const MANIFEST_PATH = path.join(DATA, "ingredient-icons.json");
const PUBLIC_ICONS = path.join(ROOT, "web", "public", "ingredient-icons");

const UA = { "User-Agent": "SkyrimAlchemyCalculator/1.0 (educational; contact: local)" };
const API = "https://en.uesp.net/w/api.php";
const GAP_MS = 120;
/** Default 4; override with INGREDIENT_ICON_FETCH_CONCURRENCY (1–8). */
const CONCURRENCY = Math.min(
  8,
  Math.max(1, Number.parseInt(process.env.INGREDIENT_ICON_FETCH_CONCURRENCY ?? "4", 10) || 4),
);
const API_TIMEOUT_MS = 45_000;
const DOWNLOAD_TIMEOUT_MS = 90_000;

const MAX_RETRIES = 8;
const INITIAL_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 90_000;
const BACKOFF_FACTOR = 2;

type ManifestEntry = { publicPath: string; wikiFile: string };
type ManifestJson = Record<string, ManifestEntry | { publicPath: string; wikiFile?: string }>;

function loadManifestFromDisk(): Record<string, ManifestEntry> {
  if (!existsSync(MANIFEST_PATH)) {
    return {};
  }
  try {
    const raw = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as ManifestJson;
    const out: Record<string, ManifestEntry> = {};
    for (const [normalizedKey, rawEntry] of Object.entries(raw)) {
      if (
        rawEntry &&
        typeof rawEntry === "object" &&
        "publicPath" in rawEntry &&
        typeof rawEntry.publicPath === "string"
      ) {
        const wikiFile =
          "wikiFile" in rawEntry && typeof rawEntry.wikiFile === "string"
            ? rawEntry.wikiFile
            : "(unknown)";
        out[normalizedKey] = { publicPath: rawEntry.publicPath, wikiFile };
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** manifest `publicPath` is like `/ingredient-icons/foo.png` */
function absoluteFromPublicPath(publicPath: string): string {
  const rel = publicPath.replace(/^\/+/, "");
  return path.join(ROOT, "web", "public", rel);
}

let manifestState: Record<string, ManifestEntry> = loadManifestFromDisk();

let manifestWriteChain: Promise<void> = Promise.resolve();

function flushManifestToDisk(): Promise<void> {
  manifestWriteChain = manifestWriteChain.then(async () => {
    await Bun.write(MANIFEST_PATH, JSON.stringify(manifestState, null, 2) + "\n");
  });
  return manifestWriteChain;
}

function withBackoff<T>(label: string, attemptFetch: () => Promise<T>): Promise<T> {
  return retryWithBackoff(attemptFetch, {
    label,
    maxAttempts: MAX_RETRIES,
    initialBackoffMs: INITIAL_BACKOFF_MS,
    maxBackoffMs: MAX_BACKOFF_MS,
    backoffMultiplier: BACKOFF_FACTOR,
    shouldRetry: isLikelyTransientNetworkError,
    onRetry: ({ attempt, maxAttempts, backoffMs, label: retryLabel, error }) => {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[backoff] ${retryLabel ?? "?"} attempt ${attempt}/${maxAttempts} failed (${msg}) — waiting ${backoffMs}ms`,
      );
    },
  });
}

type IngredientJson = {
  name: string;
  nameNormalized: string;
  rowId: string;
};

function wikiTitleFromRowId(rowId: string): string {
  return `Skyrim:${rowId.replace(/_/g, " ")}`;
}

function fileSlug(nameNormalized: string): string {
  return nameNormalized.trim().replace(/\s+/g, "-");
}

function pickIngredientIconFilename(images: string[]): string | null {
  const icon = images.filter((filename) => /^SR-icon-ingredient-/i.test(filename));
  if (icon.length === 0) {
    return null;
  }
  icon.sort((left, right) => {
    const leftIsPng = left.toLowerCase().endsWith(".png") ? 0 : 1;
    const rightIsPng = right.toLowerCase().endsWith(".png") ? 0 : 1;
    if (leftIsPng !== rightIsPng) {
      return leftIsPng - rightIsPng;
    }
    return left.localeCompare(right);
  });
  return icon[0] ?? null;
}

function extFromFilename(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : ".png";
}

async function mwParseImages(pageTitle: string): Promise<string[] | null> {
  return withBackoff(`parse ${pageTitle}`, async () => {
    const requestUrl = new URL(API);
    requestUrl.searchParams.set("action", "parse");
    requestUrl.searchParams.set("page", pageTitle);
    requestUrl.searchParams.set("prop", "images");
    requestUrl.searchParams.set("format", "json");
    const res = await fetchWithTimeout(requestUrl, { headers: UA }, API_TIMEOUT_MS);
    if (!res.ok) {
      throw new Error(`UESP parse HTTP ${res.status} ${pageTitle}`);
    }
    const payload = (await res.json()) as {
      parse?: { images?: string[] };
      error?: { info?: string };
    };
    if (payload.error) {
      throw new Error(payload.error.info ?? "UESP parse error");
    }
    return payload.parse?.images ?? null;
  });
}

async function mwImageUrl(wikiFilename: string): Promise<string | null> {
  return withBackoff(`imageinfo ${wikiFilename}`, async () => {
    const requestUrl = new URL(API);
    requestUrl.searchParams.set("action", "query");
    requestUrl.searchParams.set("titles", `File:${wikiFilename}`);
    requestUrl.searchParams.set("prop", "imageinfo");
    requestUrl.searchParams.set("iiprop", "url|size");
    requestUrl.searchParams.set("format", "json");
    const res = await fetchWithTimeout(requestUrl, { headers: UA }, API_TIMEOUT_MS);
    if (!res.ok) {
      throw new Error(`UESP query HTTP ${res.status} ${wikiFilename}`);
    }
    const payload = (await res.json()) as {
      query?: {
        pages?: Record<string, { missing?: string; imageinfo?: { url: string; size?: number }[] }>;
      };
    };
    const pages = payload.query?.pages;
    if (!pages) {
      return null;
    }
    const page = Object.values(pages)[0];
    if (!page || page.missing !== undefined) {
      return null;
    }
    const info = page.imageinfo?.[0];
    return info?.url ?? null;
  });
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  return withBackoff(`download ${path.basename(dest)}`, async () => {
    const res = await fetchWithTimeout(url, { headers: UA }, DOWNLOAD_TIMEOUT_MS);
    if (!res.ok) {
      throw new Error(`Download HTTP ${res.status} ${url}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    await Bun.write(dest, buf);
  });
}

type TaskResult = {
  manifestKey: string | null;
  manifestValue: ManifestEntry | null;
  missing: string[];
};

async function processIngredient(
  ingredient: IngredientJson,
  index: number,
  total: number,
): Promise<TaskResult> {
  const missing: string[] = [];

  const cached = manifestState[ingredient.nameNormalized];
  if (cached?.publicPath) {
    const abs = absoluteFromPublicPath(cached.publicPath);
    if (existsSync(abs) && statSync(abs).size > 0) {
      console.log(`[${index + 1}/${total}] ${ingredient.rowId} SKIP (disk + manifest cache)`);
      return {
        manifestKey: ingredient.nameNormalized,
        manifestValue: cached,
        missing,
      };
    }
  }

  const title = wikiTitleFromRowId(ingredient.rowId);
  console.log(`[${index + 1}/${total}] ${ingredient.rowId} (concurrency=${CONCURRENCY})`);

  let images: string[] | null;
  try {
    images = await mwParseImages(title);
  } catch (caughtError) {
    const msg = caughtError instanceof Error ? caughtError.message : String(caughtError);
    const detail = isAbortError(caughtError) ? "parse timeout" : msg;
    missing.push(`${ingredient.rowId}\tparse\t${detail}`);
    images = null;
  }
  await sleep(GAP_MS);

  const wikiFile = images ? pickIngredientIconFilename(images) : null;
  if (!wikiFile) {
    missing.push(`${ingredient.rowId}\t${ingredient.name}\tno SR-icon-ingredient-*`);
    return { manifestKey: null, manifestValue: null, missing };
  }

  let imageUrl: string | null;
  try {
    imageUrl = await mwImageUrl(wikiFile);
  } catch (caughtError) {
    const msg = caughtError instanceof Error ? caughtError.message : String(caughtError);
    const detail = isAbortError(caughtError) ? "imageinfo timeout" : msg;
    missing.push(`${ingredient.rowId}\timageinfo\t${detail}`);
    imageUrl = null;
  }
  await sleep(GAP_MS);

  if (!imageUrl) {
    missing.push(`${ingredient.rowId}\t${ingredient.name}\tno imageinfo url`);
    return { manifestKey: null, manifestValue: null, missing };
  }

  const ext = extFromFilename(wikiFile);
  const slug = fileSlug(ingredient.nameNormalized);
  const destName = `${slug}${ext}`;
  const destPath = path.join(PUBLIC_ICONS, destName);
  const publicPath = `/ingredient-icons/${destName}`;
  const entry: ManifestEntry = { publicPath, wikiFile };

  if (existsSync(destPath) && statSync(destPath).size > 0) {
    manifestState[ingredient.nameNormalized] = entry;
    await flushManifestToDisk();
    return {
      manifestKey: ingredient.nameNormalized,
      manifestValue: entry,
      missing,
    };
  }

  try {
    await downloadToFile(imageUrl, destPath);
    manifestState[ingredient.nameNormalized] = entry;
    await flushManifestToDisk();
    return {
      manifestKey: ingredient.nameNormalized,
      manifestValue: entry,
      missing,
    };
  } catch (caughtError) {
    const msg = caughtError instanceof Error ? caughtError.message : String(caughtError);
    const detail = isAbortError(caughtError) ? "download timeout" : msg;
    missing.push(`${ingredient.rowId}\t${ingredient.name}\tdownload\t${detail}`);
    return { manifestKey: null, manifestValue: null, missing };
  }
}

await mkdir(PUBLIC_ICONS, { recursive: true });

const ingredients: IngredientJson[] = JSON.parse(
  await Bun.file(path.join(DATA, "ingredients.json")).text(),
);

const cachedCount = Object.keys(manifestState).length;
console.log(
  `Fetching ${ingredients.length} ingredient icons (concurrency=${CONCURRENCY}, gap=${GAP_MS}ms, manifest has ${cachedCount} keys, resume=yes, backoff=yes)`,
);

const taskResults = await runPool(ingredients, CONCURRENCY, (ingredient, index) =>
  processIngredient(ingredient, index, ingredients.length),
);

await manifestWriteChain;
const missing: string[] = [];
for (const taskResult of taskResults) {
  for (const line of taskResult.missing) {
    missing.push(line);
  }
}

await Bun.write(MANIFEST_PATH, JSON.stringify(manifestState, null, 2) + "\n");
await Bun.write(
  path.join(DATA, "ingredient-icons-missing.txt"),
  missing.length ? missing.join("\n") + "\n" : "",
);

console.log(`Manifest: ${Object.keys(manifestState).length} / ${ingredients.length} ingredients`);
console.log(`Missing / errors this run: ${missing.length} (see data/ingredient-icons-missing.txt)`);
