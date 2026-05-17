import * as cheerio from "cheerio";
import type { Cheerio } from "cheerio";
import type { Element } from "domhandler";
import { normalizeIngredientKey } from "../../libs/ingredient-key.ts";
import type { ParsedEffect, ParsedIngredient } from "./ingredient-types.ts";

const UNUSED_ROW_IDS = new Set([
  "Berit_s_Ashes",
  "Fine-Cut_Void_Salt",
  "Jarrin_Root",
  "Wild_Greenspore",
  "Poisoned_Void_Salt",
]);

/** UESP ingredient links sometimes use alternate page titles vs Alchemy_Effects table keys. */
const EFFECT_KEY_ALIASES: Record<string, string> = {
  Paralysis: "Paralyze_(effect)",
  Fortify_Archery: "Fortify_Marksman",
  Fortify_Persuasion: "Fortify_Barter",
};

/** Extract Skyrim wiki title from /wiki/Skyrim:Foo_bar */
function effectKeyFromHref(href: string | undefined): string | null {
  if (!href) {
    return null;
  }
  const wikiPathMatch = href.match(/\/wiki\/Skyrim:([^#?]+)/);
  if (!wikiPathMatch) {
    return null;
  }
  try {
    return decodeURIComponent(wikiPathMatch[1].replace(/_/g, "_"));
  } catch {
    return wikiPathMatch[1];
  }
}

function parseEffectCell($cell: Cheerio<Element>): ParsedEffect | null {
  const $links = $cell.find('a[href^="/wiki/Skyrim:"]');
  let $chosen = $links.last();
  for (let linkIndex = 0; linkIndex < $links.length; linkIndex++) {
    const $linkCandidate = $links.eq(linkIndex);
    if ($linkCandidate.text().trim()) {
      $chosen = $linkCandidate;
      break;
    }
  }
  if (!$chosen.length) {
    return null;
  }
  const href = $chosen.attr("href");
  const key = effectKeyFromHref(href);
  if (!key) {
    return null;
  }
  const canon = EFFECT_KEY_ALIASES[key] ?? key;
  const displayName = $chosen.text().trim();
  const cellText = $cell.text().replace(/\s+/g, " ").trim();
  const nums = [...cellText.matchAll(/(\d+(?:\.\d+)?)\s*×/g)].map((match) => Number(match[1]));
  let magMult: number | null = null;
  let durMult: number | null = null;
  let goldMult: number | null = null;
  if (nums.length === 1) {
    goldMult = nums[0];
  } else if (nums.length >= 2) {
    magMult = nums[0];
    durMult = nums[1];
    if (nums.length >= 3) {
      goldMult = nums[2];
    }
  }
  return {
    effectKey: canon,
    displayName,
    href,
    magMult,
    durMult,
    goldMult,
  };
}

function parseNumberLoose(s: string): number | null {
  const numericText = s.replace(/[^\d.+-]/g, "").trim();
  if (!numericText) {
    return null;
  }
  const parsed = Number(numericText);
  return Number.isFinite(parsed) ? parsed : null;
}

function formIdFromNameCell($cell: Cheerio<Element>): string {
  return $cell.find(".idall").text().replace(/\s+/g, " ").trim();
}

/**
 * Walk UESP Skyrim:Ingredients HTML: one `table.striped2_1` for Standard, one for CC.
 */
export function parseIngredientTables(html: string): ParsedIngredient[] {
  const $ = cheerio.load(html);
  const out: ParsedIngredient[] = [];

  function harvestTable($table: Cheerio<Element>, section: "standard" | "creation_club") {
    const trs = $table.find("tbody > tr").toArray();
    for (let rowIndex = 0; rowIndex < trs.length; rowIndex++) {
      const $tr = $(trs[rowIndex]);
      if ($tr.find("th").length) {
        continue;
      }
      const rowId = $tr.attr("id");
      if (!rowId) {
        continue;
      }
      if (UNUSED_ROW_IDS.has(rowId)) {
        continue;
      }

      const tds0 = $tr.find("> td");
      if (tds0.length < 3) {
        continue;
      }
      const $nameTd = $(tds0[1]);
      const $nameLink = $nameTd.find('a[href^="/wiki/Skyrim:"]').first();
      const name = $nameLink.text().trim();
      if (!name) {
        continue;
      }

      const descriptionText = $(tds0[2]).text().replace(/\s+/g, " ").trim();
      rowIndex++;
      if (rowIndex >= trs.length) {
        break;
      }
      const $tr2 = $(trs[rowIndex]);
      const tds = $tr2.find("> td").toArray();
      if (tds.length < 8) {
        continue;
      }

      const effects: ParsedEffect[] = [];
      for (let effectSlot = 0; effectSlot < 4; effectSlot++) {
        const parsedEffect = parseEffectCell($(tds[effectSlot]));
        if (parsedEffect) {
          effects.push(parsedEffect);
        }
      }
      if (effects.length !== 4) {
        continue;
      }

      const value = parseNumberLoose($(tds[4]).text());
      const weight = parseNumberLoose($(tds[5]).text());
      const merchantAvail = $(tds[6]).text().replace(/\s+/g, " ").trim();
      const garden = $(tds[7]).text().replace(/\s+/g, " ").trim();

      out.push({
        rowId,
        name,
        nameNormalized: normalizeIngredientKey(name),
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

  const $std = $("#Standard_Ingredients").closest("h2").nextAll("table.striped2_1").first();
  if ($std.length) {
    harvestTable($std, "standard");
  }

  const $cc = $("#Creation_Club_Ingredients").closest("h2").nextAll("table.striped2_1").first();
  if ($cc.length) {
    harvestTable($cc, "creation_club");
  }

  return out;
}
