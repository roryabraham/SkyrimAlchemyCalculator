import { describe, expect, it } from "bun:test";
import path from "node:path";
import { parseIngredientTables } from "../scripts/lib/parse-ingredients-html.ts";
import { parseAlchemyEffectsHtml } from "../scripts/lib/parse-effects-html.ts";

describe("parseIngredientTables", () => {
  it("parses a minimal Standard Ingredients wikitable", async () => {
    const html = await Bun.file(
      path.join(import.meta.dir, "fixtures", "min-ingredients.html"),
    ).text();
    const rows = parseIngredientTables(html);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Test Root");
    expect(rows[0].effects).toHaveLength(4);
    expect(rows[0].effects[0].effectKey).toBe("Restore_Health");
    expect(rows[0].effects[3].effectKey).toBe("Slow");
  });
});

describe("parseAlchemyEffectsHtml", () => {
  it("parses a tiny effect list fragment", () => {
    const html = `
<h2><span id="Effect_List">Effect List</span></h2>
<table class="wikitable sortable"><tbody>
<tr><th>Effect</th><th>Ingredients</th><th>Description</th><th>Base_Cost</th><th>Base_Mag</th><th>Base_Dur</th><th>Value</th></tr>
<tr>
<th class="EffectPos"><a href="/wiki/Skyrim:Restore_Health" title="Skyrim:Restore Health">Restore Health</a><br /><span class="idall">(00000000)</span></th>
<td><p>x</p></td>
<td>Restore HP</td>
<td>0.5</td>
<td class="EffectPos">5</td>
<td>0</td>
<td>21</td>
</tr>
</tbody></table>`;
    const eff = parseAlchemyEffectsHtml(html);
    expect(eff).toHaveLength(1);
    expect(eff[0].effectKey).toBe("Restore_Health");
    expect(eff[0].baseCost).toBe(0.5);
    expect(eff[0].powerAffectsMagnitude).toBe(true);
  });
});
