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
import {existsSync, readFileSync, statSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(import.meta.dir, '..');
const DATA = path.join(ROOT, 'data');
const MANIFEST_PATH = path.join(DATA, 'ingredient-icons.json');
const PUBLIC_ICONS = path.join(ROOT, 'web', 'public', 'ingredient-icons');

const UA = {'User-Agent': 'SkyrimAlchemyCalculator/1.0 (educational; contact: local)'};
const API = 'https://en.uesp.net/w/api.php';
const GAP_MS = 120;
/** Default 4; override with INGREDIENT_ICON_FETCH_CONCURRENCY (1–8). */
const CONCURRENCY = Math.min(8, Math.max(1, Number.parseInt(process.env.INGREDIENT_ICON_FETCH_CONCURRENCY ?? '4', 10) || 4));
const API_TIMEOUT_MS = 45_000;
const DOWNLOAD_TIMEOUT_MS = 90_000;

const MAX_RETRIES = 8;
const INITIAL_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 90_000;
const BACKOFF_FACTOR = 2;

type ManifestEntry = {publicPath: string; wikiFile: string};
type ManifestJson = Record<string, ManifestEntry | {publicPath: string; wikiFile?: string}>;

function loadManifestFromDisk(): Record<string, ManifestEntry> {
    if (!existsSync(MANIFEST_PATH)) return {};
    try {
        const raw = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as ManifestJson;
        const out: Record<string, ManifestEntry> = {};
        for (const [k, v] of Object.entries(raw)) {
            if (v && typeof v === 'object' && 'publicPath' in v && typeof v.publicPath === 'string') {
                const wikiFile = 'wikiFile' in v && typeof v.wikiFile === 'string' ? v.wikiFile : '(unknown)';
                out[k] = {publicPath: v.publicPath, wikiFile};
            }
        }
        return out;
    } catch {
        return {};
    }
}

/** manifest `publicPath` is like `/ingredient-icons/foo.png` */
function absoluteFromPublicPath(publicPath: string): string {
    const rel = publicPath.replace(/^\/+/, '');
    return path.join(ROOT, 'web', 'public', rel);
}

let manifestState: Record<string, ManifestEntry> = loadManifestFromDisk();

let manifestWriteChain: Promise<void> = Promise.resolve();

function flushManifestToDisk(): Promise<void> {
    manifestWriteChain = manifestWriteChain.then(async () => {
        await Bun.write(MANIFEST_PATH, JSON.stringify(manifestState, null, 2) + '\n');
    });
    return manifestWriteChain;
}

function isAbortError(e: unknown): boolean {
    if (typeof e !== 'object' || e === null) return false;
    const name = 'name' in e ? String((e as {name: unknown}).name) : '';
    if (name === 'AbortError') return true;
    const msg = 'message' in e ? String((e as {message: unknown}).message) : '';
    return /aborted/i.test(msg);
}

function isRetryableError(e: unknown): boolean {
    if (isAbortError(e)) return true;
    const msg = e instanceof Error ? e.message : String(e);
    if (/HTTP (408|429|500|502|503|504)/.test(msg)) return true;
    if (/rate|throttl|too many|busy/i.test(msg)) return true;
    if (/fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket/i.test(msg)) return true;
    return false;
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(input: string | URL, init: RequestInit | undefined, timeoutMs: number): Promise<Response> {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        return await fetch(input, {...init, signal: ctrl.signal});
    } finally {
        clearTimeout(id);
    }
}

async function withBackoff<T>(label: string, attemptFetch: () => Promise<T>): Promise<T> {
    let backoff = INITIAL_BACKOFF_MS;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await attemptFetch();
        } catch (e) {
            if (attempt === MAX_RETRIES || !isRetryableError(e)) throw e;
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[backoff] ${label} attempt ${attempt}/${MAX_RETRIES} failed (${msg}) — waiting ${backoff}ms`);
            await sleep(backoff);
            backoff = Math.min(MAX_BACKOFF_MS, Math.floor(backoff * BACKOFF_FACTOR));
        }
    }
    throw new Error('withBackoff: unreachable');
}

type IngredientJson = {
    name: string;
    nameNormalized: string;
    rowId: string;
};

function wikiTitleFromRowId(rowId: string): string {
    return `Skyrim:${rowId.replace(/_/g, ' ')}`;
}

function fileSlug(nameNormalized: string): string {
    return nameNormalized.trim().replace(/\s+/g, '-');
}

function pickIngredientIconFilename(images: string[]): string | null {
    const icon = images.filter((f) => /^SR-icon-ingredient-/i.test(f));
    if (icon.length === 0) return null;
    icon.sort((a, b) => {
        const ap = a.toLowerCase().endsWith('.png') ? 0 : 1;
        const bp = b.toLowerCase().endsWith('.png') ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return a.localeCompare(b);
    });
    return icon[0] ?? null;
}

function extFromFilename(filename: string): string {
    const i = filename.lastIndexOf('.');
    return i >= 0 ? filename.slice(i).toLowerCase() : '.png';
}

async function mwParseImages(pageTitle: string): Promise<string[] | null> {
    return withBackoff(`parse ${pageTitle}`, async () => {
        const u = new URL(API);
        u.searchParams.set('action', 'parse');
        u.searchParams.set('page', pageTitle);
        u.searchParams.set('prop', 'images');
        u.searchParams.set('format', 'json');
        const res = await fetchWithTimeout(u, {headers: UA}, API_TIMEOUT_MS);
        if (!res.ok) throw new Error(`UESP parse HTTP ${res.status} ${pageTitle}`);
        const j = (await res.json()) as {
            parse?: {images?: string[]};
            error?: {info?: string};
        };
        if (j.error) throw new Error(j.error.info ?? 'UESP parse error');
        return j.parse?.images ?? null;
    });
}

async function mwImageUrl(wikiFilename: string): Promise<string | null> {
    return withBackoff(`imageinfo ${wikiFilename}`, async () => {
        const u = new URL(API);
        u.searchParams.set('action', 'query');
        u.searchParams.set('titles', `File:${wikiFilename}`);
        u.searchParams.set('prop', 'imageinfo');
        u.searchParams.set('iiprop', 'url|size');
        u.searchParams.set('format', 'json');
        const res = await fetchWithTimeout(u, {headers: UA}, API_TIMEOUT_MS);
        if (!res.ok) throw new Error(`UESP query HTTP ${res.status} ${wikiFilename}`);
        const j = (await res.json()) as {
            query?: {
                pages?: Record<string, {missing?: string; imageinfo?: {url: string; size?: number}[]}>;
            };
        };
        const pages = j.query?.pages;
        if (!pages) return null;
        const page = Object.values(pages)[0];
        if (!page || page.missing !== undefined) return null;
        const info = page.imageinfo?.[0];
        return info?.url ?? null;
    });
}

async function downloadToFile(url: string, dest: string): Promise<void> {
    return withBackoff(`download ${path.basename(dest)}`, async () => {
        const res = await fetchWithTimeout(url, {headers: UA}, DOWNLOAD_TIMEOUT_MS);
        if (!res.ok) throw new Error(`Download HTTP ${res.status} ${url}`);
        const buf = new Uint8Array(await res.arrayBuffer());
        await Bun.write(dest, buf);
    });
}

async function runPool<T, R>(items: readonly T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
    const n = items.length;
    const results = Array.from({length: n}) as R[];
    let nextIndex = 0;

    async function worker(): Promise<void> {
        while (true) {
            const i = nextIndex++;
            if (i >= n) return;
            results[i] = await fn(items[i]!, i);
        }
    }

    const workers = Math.min(concurrency, Math.max(1, n));
    await Promise.all(Array.from({length: workers}, () => worker()));
    return results;
}

type TaskResult = {
    manifestKey: string | null;
    manifestValue: ManifestEntry | null;
    missing: string[];
};

async function processIngredient(ing: IngredientJson, index: number, total: number): Promise<TaskResult> {
    const missing: string[] = [];

    const cached = manifestState[ing.nameNormalized];
    if (cached?.publicPath) {
        const abs = absoluteFromPublicPath(cached.publicPath);
        if (existsSync(abs) && statSync(abs).size > 0) {
            console.log(`[${index + 1}/${total}] ${ing.rowId} SKIP (disk + manifest cache)`);
            return {
                manifestKey: ing.nameNormalized,
                manifestValue: cached,
                missing,
            };
        }
    }

    const title = wikiTitleFromRowId(ing.rowId);
    console.log(`[${index + 1}/${total}] ${ing.rowId} (concurrency=${CONCURRENCY})`);

    let images: string[] | null;
    try {
        images = await mwParseImages(title);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const detail = isAbortError(e) ? 'parse timeout' : msg;
        missing.push(`${ing.rowId}\tparse\t${detail}`);
        images = null;
    }
    await sleep(GAP_MS);

    const wikiFile = images ? pickIngredientIconFilename(images) : null;
    if (!wikiFile) {
        missing.push(`${ing.rowId}\t${ing.name}\tno SR-icon-ingredient-*`);
        return {manifestKey: null, manifestValue: null, missing};
    }

    let imageUrl: string | null;
    try {
        imageUrl = await mwImageUrl(wikiFile);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const detail = isAbortError(e) ? 'imageinfo timeout' : msg;
        missing.push(`${ing.rowId}\timageinfo\t${detail}`);
        imageUrl = null;
    }
    await sleep(GAP_MS);

    if (!imageUrl) {
        missing.push(`${ing.rowId}\t${ing.name}\tno imageinfo url`);
        return {manifestKey: null, manifestValue: null, missing};
    }

    const ext = extFromFilename(wikiFile);
    const slug = fileSlug(ing.nameNormalized);
    const destName = `${slug}${ext}`;
    const destPath = path.join(PUBLIC_ICONS, destName);
    const publicPath = `/ingredient-icons/${destName}`;
    const entry: ManifestEntry = {publicPath, wikiFile};

    if (existsSync(destPath) && statSync(destPath).size > 0) {
        manifestState[ing.nameNormalized] = entry;
        await flushManifestToDisk();
        return {
            manifestKey: ing.nameNormalized,
            manifestValue: entry,
            missing,
        };
    }

    try {
        await downloadToFile(imageUrl, destPath);
        manifestState[ing.nameNormalized] = entry;
        await flushManifestToDisk();
        return {
            manifestKey: ing.nameNormalized,
            manifestValue: entry,
            missing,
        };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const detail = isAbortError(e) ? 'download timeout' : msg;
        missing.push(`${ing.rowId}\t${ing.name}\tdownload\t${detail}`);
        return {manifestKey: null, manifestValue: null, missing};
    }
}

await mkdir(PUBLIC_ICONS, {recursive: true});

const ingredients: IngredientJson[] = JSON.parse(await Bun.file(path.join(DATA, 'ingredients.json')).text());

const cachedCount = Object.keys(manifestState).length;
console.log(`Fetching ${ingredients.length} ingredient icons (concurrency=${CONCURRENCY}, gap=${GAP_MS}ms, manifest has ${cachedCount} keys, resume=yes, backoff=yes)`);

const taskResults = await runPool(ingredients, CONCURRENCY, (ing, i) => processIngredient(ing, i, ingredients.length));

await manifestWriteChain;
const missing: string[] = [];
for (const r of taskResults) {
    for (const line of r.missing) missing.push(line);
}

await Bun.write(MANIFEST_PATH, JSON.stringify(manifestState, null, 2) + '\n');
await Bun.write(path.join(DATA, 'ingredient-icons-missing.txt'), missing.length ? missing.join('\n') + '\n' : '');

console.log(`Manifest: ${Object.keys(manifestState).length} / ${ingredients.length} ingredients`);
console.log(`Missing / errors this run: ${missing.length} (see data/ingredient-icons-missing.txt)`);
