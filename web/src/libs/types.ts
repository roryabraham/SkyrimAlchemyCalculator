import { defaultAlchemyParams, type AlchemyParams } from "../../../libs/alchemy-params.ts";

/** Same fields as `POST /api/potions` `params` (see server `parseAlchemyParams`). */
export type AlchemyFormParams = AlchemyParams;

export const defaultAlchemyFormParams = defaultAlchemyParams;

export type IngredientHit = { id: number; name: string; iconUrl: string | null };

export type Recipe = {
  ingredients: { id: number; name: string; iconUrl: string | null }[];
  effects: { displayName: string; effectKey: string; gold: number }[];
  totalGold: number;
  mixtureKind: "potion" | "poison";
  dominantEffectKey: string;
};

export type InventoryRow = {
  id: string;
  name: string;
  quantity: number;
  /** Set when the user chose an autocomplete hit; ingredient cell shows icon + label. */
  ingredientId?: number;
  ingredientIconUrl?: string | null;
};

/** Subset of `InventoryRow` sent to POST /api/potions `inventory`. */
export type PotionsInventoryLine = { name: string; quantity: number };

/**
 * Editable fields merged into a row (e.g. `{ quantity: 3 }`). Spelled out so
 * patch literals stay well-typed at call sites.
 */
export type InventoryRowPatch = {
  name?: string;
  quantity?: number;
  ingredientId?: number;
  ingredientIconUrl?: string | null;
};
