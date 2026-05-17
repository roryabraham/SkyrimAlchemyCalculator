/**
 * Canonical lookup key for ingredient display names.
 * Matches `name_normalized` in scraped JSON and SQLite, and inventory resolution on the API.
 */
export function normalizeIngredientKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
