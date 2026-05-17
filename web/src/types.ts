import { defaultAlchemyParams, type AlchemyParams } from "../../libs/alchemy-params.ts";

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
  count: number;
};
