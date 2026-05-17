/** Alchemy skill and perk knobs shared by the API and gold formulas (UESP-style). */
export type AlchemyParams = {
  alchemySkill: number;
  fortifyAlchemy: number;
  alchemistPercent: number;
  hasPhysician: boolean;
  hasBenefactor: boolean;
  hasPoisoner: boolean;
  seekerOfShadowsPercent: number;
};

export const defaultAlchemyParams: AlchemyParams = {
  alchemySkill: 15,
  fortifyAlchemy: 0,
  alchemistPercent: 0,
  hasPhysician: false,
  hasBenefactor: false,
  hasPoisoner: false,
  seekerOfShadowsPercent: 0,
};
