import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dir, "..", "..");

export type IconManifestEntry = {
  publicPath: string;
  wikiFile?: string;
};

let _byNameNormalized: Map<string, IconManifestEntry> | null = null;

function manifestPath(): string {
  return path.join(ROOT, "data", "ingredient-icons.json");
}

/** Optional CDN or absolute origin; no trailing slash. Same-origin when unset. */
function iconBaseUrl(): string {
  return (process.env.INGREDIENT_ICON_BASE_URL ?? "").replace(/\/$/, "");
}

export function loadIconManifest(): Map<string, IconManifestEntry> {
  if (_byNameNormalized) return _byNameNormalized;
  _byNameNormalized = new Map();
  const p = manifestPath();
  if (!existsSync(p)) return _byNameNormalized;

  const raw: unknown = JSON.parse(readFileSync(p, "utf8"));
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return _byNameNormalized;

  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === "string") {
      _byNameNormalized.set(key, { publicPath: val });
      continue;
    }
    if (val !== null && typeof val === "object" && "publicPath" in val) {
      const publicPath = (val as { publicPath: unknown }).publicPath;
      if (typeof publicPath === "string") {
        const wikiFile = (val as { wikiFile?: unknown }).wikiFile;
        _byNameNormalized.set(key, {
          publicPath,
          wikiFile: typeof wikiFile === "string" ? wikiFile : undefined,
        });
      }
    }
  }
  return _byNameNormalized;
}

export function iconUrlForNameNormalized(nameNormalized: string): string | null {
  const entry = loadIconManifest().get(nameNormalized);
  if (!entry?.publicPath) return null;
  const rel = entry.publicPath.startsWith("/") ? entry.publicPath : `/${entry.publicPath}`;
  const base = iconBaseUrl();
  return base === "" ? rel : `${base}${rel}`;
}
