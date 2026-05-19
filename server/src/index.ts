import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { getDb, loadAllIngredientRows, loadNameIndex, searchIngredients } from "./db.ts";
import { defaultAlchemyParams, type AlchemyParams } from "./alchemy-math.ts";
import { iconUrlForNameNormalized, loadIconManifest } from "./ingredient-icons.ts";
import { rankPotions, type InventoryLine, type RecipeResult } from "./potion-engine.ts";

const PORT = Number(process.env.PORT) || 3001;
const STATIC_ROOT = process.env.STATIC_ROOT?.trim() ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function mimeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".webp":
      return "image/webp";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".woff2":
      return "font/woff2";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

/** Serve Vite `dist` when `STATIC_ROOT` is set; SPA fallback to `index.html`. */
function staticOrSpaResponse(req: Request): Response | null {
  if (!STATIC_ROOT || req.method !== "GET") {
    return null;
  }
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api")) {
    return null;
  }
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/" || rel === "") {
    rel = "index.html";
  } else {
    rel = rel.replace(/^\/+/, "");
  }

  const candidate = path.resolve(path.join(STATIC_ROOT, rel));
  const rootResolved = path.resolve(STATIC_ROOT);
  if (candidate !== rootResolved && !candidate.startsWith(`${rootResolved}${path.sep}`)) {
    return new Response("Forbidden", { status: 403, headers: cors });
  }

  if (existsSync(candidate)) {
    const st = statSync(candidate);
    if (st.isFile()) {
      return new Response(Bun.file(candidate), {
        headers: { "Content-Type": mimeForPath(candidate) },
      });
    }
    if (st.isDirectory()) {
      const indexInDir = path.join(candidate, "index.html");
      if (existsSync(indexInDir)) {
        return new Response(Bun.file(indexInDir), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }
  }

  const indexPath = path.join(STATIC_ROOT, "index.html");
  if (existsSync(indexPath)) {
    return new Response(Bun.file(indexPath), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors },
  });
}

function parseAlchemyParams(body: Record<string, unknown>): AlchemyParams {
  const rawParams = (body.params ?? {}) as Record<string, unknown>;
  return {
    alchemySkill: Number(rawParams.alchemySkill ?? defaultAlchemyParams.alchemySkill),
    fortifyAlchemy: Number(rawParams.fortifyAlchemy ?? defaultAlchemyParams.fortifyAlchemy),
    alchemistPercent: Number(rawParams.alchemistPercent ?? defaultAlchemyParams.alchemistPercent),
    hasPhysician: Boolean(rawParams.hasPhysician),
    hasBenefactor: Boolean(rawParams.hasBenefactor),
    hasPoisoner: Boolean(rawParams.hasPoisoner),
    seekerOfShadowsPercent: Number(
      rawParams.seekerOfShadowsPercent ?? defaultAlchemyParams.seekerOfShadowsPercent,
    ),
  };
}

/** Warm DB so first request does not pay open cost. */
getDb();
const nameIndex = loadNameIndex();
loadIconManifest();
const idToNameNormalized = new Map(
  loadAllIngredientRows().map((row) => [row.id, row.name_normalized] as const),
);

function withIngredientIcons(recipes: RecipeResult[]) {
  return recipes.map((rec) => ({
    ...rec,
    ingredients: rec.ingredients.map((ingredient) => {
      const nameNormalized = idToNameNormalized.get(ingredient.id);
      return {
        ...ingredient,
        iconUrl: nameNormalized ? iconUrlForNameNormalized(nameNormalized) : null,
      };
    }),
  }));
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/api/ingredients") {
      const query = url.searchParams.get("q")?.trim() ?? "";
      if (query.length < 1) {
        return json([]);
      }
      const rows = searchIngredients(query, 40);
      return json(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          iconUrl: iconUrlForNameNormalized(row.name_normalized),
        })),
      );
    }

    if (req.method === "POST" && url.pathname === "/api/potions") {
      let body: Record<string, unknown>;
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      const inv = body.inventory as InventoryLine[] | undefined;
      if (!Array.isArray(inv)) {
        return json({ error: "Expected { inventory: [{ name, quantity }] }" }, 400);
      }
      const params = parseAlchemyParams(body);
      const { recipes, isTruncated, error } = rankPotions(inv, nameIndex, params);
      if (error) {
        return json({ error, recipes: [], truncated: false }, 400);
      }
      return json({ recipes: withIngredientIcons(recipes), truncated: isTruncated });
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return json({ ok: true });
    }

    const staticRes = staticOrSpaResponse(req);
    if (staticRes) {
      return staticRes;
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
});

console.log(`Skyrim Alchemy API http://127.0.0.1:${PORT}`);
