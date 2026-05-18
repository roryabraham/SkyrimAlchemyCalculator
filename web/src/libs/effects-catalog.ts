import raw from "../../../data/effects.json";

export type EffectCatalogRow = {
  effectKey: string;
  displayName: string;
  baseCost: number;
  baseMag: number;
  baseDur: number;
  valueAt100: number;
  powerAffectsMagnitude: boolean;
  powerAffectsDuration: boolean;
  isBeneficial: boolean;
};

export const EFFECTS_CATALOG: readonly EffectCatalogRow[] = raw as EffectCatalogRow[];

export function searchEffectCatalog(
  query: string,
  excludedKeys: ReadonlySet<string>,
  limit = 40,
): EffectCatalogRow[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return [];
  }
  const qKeyish = q.replace(/\s+/g, "_");
  const hits = EFFECTS_CATALOG.filter(
    (row) =>
      !excludedKeys.has(row.effectKey) &&
      (row.displayName.toLowerCase().includes(q) ||
        row.effectKey.toLowerCase().includes(q) ||
        row.effectKey.toLowerCase().includes(qKeyish)),
  );
  return hits
    .slice()
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .slice(0, limit);
}
