import type { AlchemyFormParams, PotionsInventoryLine, Recipe } from "./types.ts";

export type PotionsRankOutcome =
  | { type: "success"; recipes: Recipe[]; truncated: boolean }
  | { type: "error"; error: string };

/**
 * POST /api/potions — network + JSON parsing live here so `App` stays
 * React Compiler–friendly (no try/catch in the component tree).
 */
export async function requestPotionsRank(
  inventory: PotionsInventoryLine[],
  params: AlchemyFormParams,
): Promise<PotionsRankOutcome> {
  try {
    const res = await fetch("/api/potions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventory, params }),
    });
    const body: unknown = await res.json();
    if (!res.ok) {
      let message = "Request failed";
      if (
        body !== null &&
        typeof body === "object" &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string" &&
        (body as { error: string }).error.length > 0
      ) {
        message = (body as { error: string }).error;
      }
      return { type: "error", error: message };
    }
    if (
      body === null ||
      typeof body !== "object" ||
      !("recipes" in body) ||
      !Array.isArray((body as { recipes: unknown }).recipes)
    ) {
      return { type: "error", error: "Invalid response" };
    }
    const recipes = (body as { recipes: Recipe[] }).recipes;
    const truncated = Boolean((body as { truncated?: unknown }).truncated);
    return { type: "success", recipes, truncated };
  } catch {
    return {
      type: "error",
      error: "Could not reach server. Is the API running?",
    };
  }
}
