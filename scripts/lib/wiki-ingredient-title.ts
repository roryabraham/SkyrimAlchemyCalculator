/**
 * Build UESP `Skyrim:` page title from the HTML `id` / `rowId` stored in `ingredients.json`.
 *
 * UESP table row anchors encode apostrophe as `.27` (see e.g. `Chicken.27s_Egg`); MediaWiki
 * page titles use a normal apostrophe (`Skyrim:Chicken's Egg`).
 */
export function wikiTitleFromIngredientRowId(rowId: string): string {
  const decoded = rowId.replace(/\.27/g, "'");
  return `Skyrim:${decoded.replace(/_/g, " ")}`;
}
