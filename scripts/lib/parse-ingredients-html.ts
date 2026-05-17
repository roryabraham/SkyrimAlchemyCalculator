import * as cheerio from "cheerio";
import type { ParsedEffect, ParsedIngredient } from "./ingredient-types.ts";

const UNUSED_ROW_IDS = new Set([
  "Berit_s_Ashes",
  "Fine-Cut_Void_Salt",
  "Jarrin_Root",
  "Wild_Greenspore",
  "Poisoned_Void_Salt",
]);

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Extract Skyrim wiki title from /wiki/Skyrim:Foo_bar */
function effectKeyFromHref(href: string | undefined): string | null {
  if (!href) return null;
  const m = href.match(/\/wiki\/Skyrim:([^#?]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].replace(/_/g, "_"));
  } catch {
    return m[1];
  }
}

function parseEffectCell($cell: cheerio.Cheerio): ParsedEffect | null {
  const $links = $cell.find('a[href^="/wiki/Skyrim:"]');
  let $chosen = $links.last();
  for (let i = 0; i < $links.length; i++) {
    const $x = $links.eq(i);
    if ($x.text().trim()) {
      $chosen = $x;
      break;
    }
  }
  if (!$chosen.length) return null;
  const href = $chosen.attr("href");
  const key = effectKeyFromHref(href);
  if (!key) return null;
  const displayName = $chosen.text().trim();
  const cellText = $cell.text().replace(/\s+/g, " ").trim();
  const nums = [...cellText.matchAll(/(\d+(?:\.\d+)?)\s*×/g)].map((x) =>
    Number(x[1]),
  );
  let magMult: number | null = null;
  let durMult: number | null = null;
  let goldMult: number | null = null;
  if (nums.length === 1) {
    goldMult = nums[0];
  } else if (nums.length >= 2) {
    magMult = nums[0];
    durMult = nums[1];
    if (nums.length >= 3) goldMult = nums[2];
  }
  return {
    effectKey: key,
    displayName,
    href,
    magMult,
    durMult,
    goldMult,
  };
}

function parseNumberLoose(s: string): number | null {
  const t = s.replace(/[^\d.+-]/g, "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function formIdFromNameCell($cell: cheerio.Cheerio): string {
  return $cell.find(".idall").text().replace(/\s+/g, " ").trim();
}

/**
 * Walk UESP Skyrim:Ingredients HTML: one `table.striped2_1` for Standard, one for CC.
 */
export function parseIngredientTables(html: string): ParsedIngredient[] {
  const $ = cheerio.load(html);
  const out: ParsedIngredient[] = [];

  function harvestTable(
    $table: cheerio.Cheerio,
    section: "standard" | "creation_club",
  ) {
    const trs = $table.find("tbody > tr").toArray();
    for (let i = 0; i < trs.length; i++) {
      const $tr = $(trs[i]);
      if ($tr.find("th").length) continue;
      const rowId = $tr.attr("id");
      if (!rowId) continue;
      if (UNUSED_ROW_IDS.has(rowId)) continue;

      const tds0 = $tr.find("> td");
      if (tds0.length < 3) continue;
      const $nameTd = $(tds0[1]);
      const $nameLink = $nameTd.find('a[href^="/wiki/Skyrim:"]').first();
      const name = $nameLink.text().trim();
      if (!name) continue;

      const descriptionText = $(tds0[2]).text().replace(/\s+/g, " ").trim();
      i++;
      if (i >= trs.length) break;
      const $tr2 = $(trs[i]);
      const tds = $tr2.find("> td").toArray();
      if (tds.length < 8) continue;

      const effects: ParsedEffect[] = [];
      for (let c = 0; c < 4; c++) {
        const pe = parseEffectCell($(tds[c]));
        if (pe) effects.push(pe);
      }
      if (effects.length !== 4) continue;

      const value = parseNumberLoose($(tds[4]).text());
      const weight = parseNumberLoose($(tds[5]).text());
      const merchantAvail = $(tds[6]).text().replace(/\s+/g, " ").trim();
      const garden = $(tds[7]).text().replace(/\s+/g, " ").trim();

      out.push({
        rowId,
        name,
        nameNormalized: normalizeName(name),
        formIdRaw: formIdFromNameCell($nameTd),
        descriptionText,
        effects,
        value,
        weight,
        merchantAvail,
        garden,
        section,
      });
    }
  }

  const $std = $("#Standard_Ingredients")
    .closest("h2")
    .nextAll("table.striped2_1")
    .first();
  if ($std.length) harvestTable($std, "standard");

  const $cc = $("#Creation_Club_Ingredients")
    .closest("h2")
    .nextAll("table.striped2_1")
    .first();
  if ($cc.length) harvestTable($cc, "creation_club");

  return out;
}
