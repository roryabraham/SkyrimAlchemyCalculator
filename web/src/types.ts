/** Mirrors `POST /api/potions` `params` (see server `parseAlchemyParams`). */
export type AlchemyFormParams = {
  alchemySkill: number;
  fortifyAlchemy: number;
  alchemistPercent: number;
  hasPhysician: boolean;
  hasBenefactor: boolean;
  hasPoisoner: boolean;
  seekerOfShadowsPercent: number;
};

export const defaultAlchemyFormParams: AlchemyFormParams = {
  alchemySkill: 15,
  fortifyAlchemy: 0,
  alchemistPercent: 0,
  hasPhysician: false,
  hasBenefactor: false,
  hasPoisoner: false,
  seekerOfShadowsPercent: 0,
};

export type IngredientHit = { id: number; name: string };

export type Recipe = {
  ingredients: { id: number; name: string }[];
  effects: { displayName: string; effectKey: string; gold: number }[];
  totalGold: number;
  mixtureKind: "potion" | "poison";
  dominantEffectKey: string;
};

export type InventoryRow = {
  id: string;
  name: string;
  count: number;
  open: boolean;
};
