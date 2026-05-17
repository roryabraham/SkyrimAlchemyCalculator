import { getDb, loadNameIndex, searchIngredients } from "./db.ts";
import { defaultAlchemyParams, type AlchemyParams } from "./alchemy-math.ts";
import { rankPotions, type InventoryLine } from "./potion-engine.ts";

const PORT = Number(process.env.PORT) || 3001;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors },
  });
}

function parseAlchemyParams(body: Record<string, unknown>): AlchemyParams {
  const p = (body.params ?? {}) as Record<string, unknown>;
  return {
    alchemySkill: Number(p.alchemySkill ?? defaultAlchemyParams.alchemySkill),
    fortifyAlchemy: Number(p.fortifyAlchemy ?? defaultAlchemyParams.fortifyAlchemy),
    alchemistPercent: Number(p.alchemistPercent ?? defaultAlchemyParams.alchemistPercent),
    hasPhysician: Boolean(p.hasPhysician),
    hasBenefactor: Boolean(p.hasBenefactor),
    hasPoisoner: Boolean(p.hasPoisoner),
    seekerOfShadowsPercent: Number(
      p.seekerOfShadowsPercent ?? defaultAlchemyParams.seekerOfShadowsPercent,
    ),
  };
}

/** Warm DB so first request does not pay open cost. */
getDb();
const nameIndex = loadNameIndex();

Bun.serve({
  port: PORT,
  async fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/api/ingredients") {
      const q = url.searchParams.get("q")?.trim() ?? "";
      if (q.length < 1) {
        return json([]);
      }
      const rows = searchIngredients(q, 40);
      return json(rows.map((r) => ({ id: r.id, name: r.name })));
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
        return json({ error: "Expected { inventory: [{ name, count }] }" }, 400);
      }
      const params = parseAlchemyParams(body);
      const { recipes, truncated, error } = rankPotions(inv, nameIndex, params);
      if (error) {
        return json({ error, recipes: [], truncated: false }, 400);
      }
      return json({ recipes, truncated });
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return json({ ok: true });
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
});

console.log(`Skyrim Alchemy API http://127.0.0.1:${PORT}`);
