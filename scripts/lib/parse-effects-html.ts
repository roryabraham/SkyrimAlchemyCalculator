import * as cheerio from "cheerio";

export type EffectRow = {
  effectKey: string;
  displayName: string;
  baseCost: number;
  baseMag: number;
  baseDur: number;
  valueAt100: number;
  /** Green UESP cell: magnitude scales with alchemy power */
  powerAffectsMagnitude: boolean;
  powerAffectsDuration: boolean;
  isBeneficial: boolean;
};

function effectKeyFromHref(href: string | undefined): string | null {
  if (!href) {
    return null;
  }
  const wikiPathMatch = href.match(/\/wiki\/Skyrim:([^#?]+)/);
  if (!wikiPathMatch) {
    return null;
  }
  try {
    return decodeURIComponent(wikiPathMatch[1]);
  } catch {
    return wikiPathMatch[1];
  }
}

function parseNum(text: string): number {
  const numericText = text.replace(/[^\d.+-]/g, "").trim();
  const parsed = Number(numericText);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseAlchemyEffectsHtml(html: string): EffectRow[] {
  const $ = cheerio.load(html);
  const $table = $("#Effect_List").closest("h2").nextAll("table.wikitable").first();
  if (!$table.length) {
    throw new Error("Effect list table not found");
  }

  const out: EffectRow[] = [];
  for (const tr of $table.find("tbody > tr").toArray()) {
    const $tr = $(tr);
    const $th = $tr.find("> th").first();
    if (!$th.length) {
      continue;
    }

    const $links = $th.find('a[href^="/wiki/Skyrim:"]');
    let $chosen = $links.last();
    for (let linkIndex = 0; linkIndex < $links.length; linkIndex++) {
      const $linkCandidate = $links.eq(linkIndex);
      if ($linkCandidate.text().trim()) {
        $chosen = $linkCandidate;
        break;
      }
    }
    if (!$chosen.length) {
      continue;
    }

    const href = $chosen.attr("href");
    const key = effectKeyFromHref(href);
    if (!key) {
      continue;
    }

    const displayName = $chosen.text().trim();
    const tds = $tr.find("> td").toArray();
    if (tds.length < 6) {
      continue;
    }

    const baseCost = parseNum($(tds[2]).text());
    const $magTd = $(tds[3]);
    const $durTd = $(tds[4]);
    const baseMag = parseNum($magTd.text());
    const baseDur = parseNum($durTd.text());
    const valueAt100 = parseNum($(tds[5]).text());

    const isBeneficial = $th.hasClass("EffectPos");
    out.push({
      effectKey: key,
      displayName,
      baseCost,
      baseMag,
      baseDur,
      valueAt100,
      powerAffectsMagnitude: $magTd.hasClass("EffectPos"),
      powerAffectsDuration: $durTd.hasClass("EffectPos"),
      isBeneficial,
    });
  }
  return out;
}
