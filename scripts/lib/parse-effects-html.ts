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
  if (!href) return null;
  const m = href.match(/\/wiki\/Skyrim:([^#?]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

function parseNum(s: string): number {
  const t = s.replace(/[^\d.+-]/g, "").trim();
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

export function parseAlchemyEffectsHtml(html: string): EffectRow[] {
  const $ = cheerio.load(html);
  const $table = $("#Effect_List")
    .closest("h2")
    .nextAll("table.wikitable")
    .first();
  if (!$table.length) throw new Error("Effect list table not found");

  const out: EffectRow[] = [];
  for (const tr of $table.find("tbody > tr").toArray()) {
    const $tr = $(tr);
    const $th = $tr.find("> th").first();
    if (!$th.length) continue;

    const $links = $th.find('a[href^="/wiki/Skyrim:"]');
    let $chosen = $links.last();
    for (let i = 0; i < $links.length; i++) {
      const $x = $links.eq(i);
      if ($x.text().trim()) {
        $chosen = $x;
        break;
      }
    }
    if (!$chosen.length) continue;

    const href = $chosen.attr("href");
    const key = effectKeyFromHref(href);
    if (!key) continue;

    const displayName = $chosen.text().trim();
    const tds = $tr.find("> td").toArray();
    if (tds.length < 6) continue;

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
