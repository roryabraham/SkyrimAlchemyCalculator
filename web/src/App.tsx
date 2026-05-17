import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type IngredientHit = { id: number; name: string };

type Recipe = {
  ingredients: { id: number; name: string }[];
  effects: { displayName: string; effectKey: string; gold: number }[];
  totalGold: number;
  mixtureKind: "potion" | "poison";
  dominantEffectKey: string;
};

type Row = {
  id: string;
  name: string;
  count: number;
  suggestions: IngredientHit[];
  open: boolean;
  loading: boolean;
};

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

const defaultParams: AlchemyFormParams = {
  alchemySkill: 15,
  fortifyAlchemy: 0,
  alchemistPercent: 0,
  hasPhysician: false,
  hasBenefactor: false,
  hasPoisoner: false,
  seekerOfShadowsPercent: 0,
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function fetchIngredients(q: string): Promise<IngredientHit[]> {
  if (!q.trim()) return [];
  const r = await fetch(
    `/api/ingredients?q=${encodeURIComponent(q.trim())}`,
  );
  if (!r.ok) throw new Error("Search failed");
  return (await r.json()) as IngredientHit[];
}

export function App() {
  const [rows, setRows] = useState<Row[]>([
    {
      id: uid(),
      name: "",
      count: 1,
      suggestions: [],
      open: false,
      loading: false,
    },
  ]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<AlchemyFormParams>({ ...defaultParams });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setNumParam = (
    key:
      | "alchemySkill"
      | "fortifyAlchemy"
      | "alchemistPercent"
      | "seekerOfShadowsPercent",
    value: string,
    fallback: number,
    opts?: { min?: number; max?: number },
  ) => {
    let n = Math.floor(Number(value));
    if (!Number.isFinite(n)) n = fallback;
    if (opts?.min !== undefined) n = Math.max(opts.min, n);
    if (opts?.max !== undefined) n = Math.min(opts.max, n);
    setParams((p) => ({ ...p, [key]: n }));
  };

  const runSearch = useCallback((rowId: string, q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, loading: true } : r,
        ),
      );
      try {
        const hits = await fetchIngredients(q);
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? { ...r, suggestions: hits, loading: false, open: true }
              : r,
          ),
        );
      } catch {
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId ? { ...r, loading: false, suggestions: [] } : r,
          ),
        );
      }
    }, 220);
  }, []);

  const addRow = () => {
    setRows((r) => [
      ...r,
      {
        id: uid(),
        name: "",
        count: 1,
        suggestions: [],
        open: false,
        loading: false,
      },
    ]);
  };

  const removeRow = (rowId: string) => {
    setRows((r) => (r.length <= 1 ? r : r.filter((x) => x.id !== rowId)));
  };

  const updateRow = (rowId: string, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    );
  };

  const submit = async () => {
    setError(null);
    setLoading(true);
    setRecipes([]);
    try {
      const inventory = rows
        .filter((r) => r.name.trim())
        .map((r) => ({ name: r.name.trim(), count: r.count }));
      const res = await fetch("/api/potions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory, params }),
      });
      const data = (await res.json()) as {
        recipes?: Recipe[];
        truncated?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      setRecipes(data.recipes ?? []);
      setTruncated(Boolean(data.truncated));
    } catch {
      setError("Could not reach server. Is the API running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const canSubmit = useMemo(
    () =>
      rows.some((r) => r.name.trim()) &&
      rows
        .filter((r) => r.name.trim())
        .reduce((s, r) => s + Math.max(0, Math.floor(r.count)), 0) >= 2,
    [rows],
  );

  return (
    <main className="layout">
      <header className="header">
        <h1>Skyrim Alchemy Calculator</h1>
        <p className="sub">
          Anniversary Edition data from UESP. Recipes sorted by estimated
          gold value (alchemy XP proxy).
        </p>
      </header>

      <section className="panel">
        <h2>Your ingredients</h2>
        <table className="inv-table">
          <thead>
            <tr>
              <th>Ingredient</th>
              <th className="narrow">Qty</th>
              <th className="narrow" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="cell-autocomplete">
                  <div className="ac-wrap">
                    <input
                      className="input"
                      placeholder="Search…"
                      value={row.name}
                      autoComplete="off"
                      onChange={(e) => {
                        const v = e.target.value;
                        updateRow(row.id, { name: v, open: true });
                        runSearch(row.id, v);
                      }}
                      onFocus={() => {
                        updateRow(row.id, { open: true });
                        if (row.name.trim()) runSearch(row.id, row.name);
                      }}
                      onBlur={() => {
                        setTimeout(
                          () => updateRow(row.id, { open: false }),
                          150,
                        );
                      }}
                    />
                    {row.open && row.suggestions.length > 0 && (
                      <ul className="suggest">
                        {row.suggestions.map((h) => (
                          <li key={h.id}>
                            <button
                              type="button"
                              className="suggest-btn"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                updateRow(row.id, {
                                  name: h.name,
                                  open: false,
                                  suggestions: [],
                                });
                              }}
                            >
                              {h.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {row.loading && (
                      <span className="hint">Searching…</span>
                    )}
                  </div>
                </td>
                <td>
                  <input
                    className="input input-narrow"
                    type="number"
                    min={1}
                    value={row.count}
                    onChange={(e) =>
                      updateRow(row.id, {
                        count: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => removeRow(row.id)}
                    aria-label="Remove row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row-actions">
          <button type="button" className="btn" onClick={addRow}>
            Add ingredient
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!canSubmit || loading}
            onClick={() => void submit()}
          >
            {loading ? "Working…" : "Find potions"}
          </button>
        </div>
        {error && <p className="err">{error}</p>}
      </section>

      <section className="panel">
        <h2>Alchemy settings</h2>
        <p className="muted small">
          Used for gold estimates (UESP PowerFactor). Matches API defaults until
          you change them.
        </p>
        <div className="params-grid">
          <label className="field">
            <span className="field-label">Alchemy skill</span>
            <input
              className="input"
              type="number"
              min={0}
              max={100}
              value={params.alchemySkill}
              onChange={(e) =>
                setNumParam("alchemySkill", e.target.value, defaultParams.alchemySkill, {
                  min: 0,
                  max: 100,
                })
              }
            />
          </label>
          <label className="field">
            <span className="field-label">Fortify Alchemy (%)</span>
            <input
              className="input"
              type="number"
              min={0}
              max={500}
              value={params.fortifyAlchemy}
              onChange={(e) =>
                setNumParam("fortifyAlchemy", e.target.value, defaultParams.fortifyAlchemy, {
                  min: 0,
                  max: 500,
                })
              }
            />
          </label>
          <label className="field">
            <span className="field-label">Alchemist perk (%)</span>
            <input
              className="input"
              type="number"
              min={0}
              max={100}
              value={params.alchemistPercent}
              onChange={(e) =>
                setNumParam(
                  "alchemistPercent",
                  e.target.value,
                  defaultParams.alchemistPercent,
                  { min: 0, max: 100 },
                )
              }
            />
          </label>
          <label className="field">
            <span className="field-label">Seeker of Shadows (%)</span>
            <input
              className="input"
              type="number"
              min={0}
              max={20}
              value={params.seekerOfShadowsPercent}
              onChange={(e) =>
                setNumParam(
                  "seekerOfShadowsPercent",
                  e.target.value,
                  defaultParams.seekerOfShadowsPercent,
                  { min: 0, max: 20 },
                )
              }
            />
          </label>
        </div>
        <div className="params-checks">
          <label className="check">
            <input
              type="checkbox"
              checked={params.hasPhysician}
              onChange={(e) =>
                setParams((p) => ({ ...p, hasPhysician: e.target.checked }))
              }
            />
            <span>Physician</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={params.hasBenefactor}
              onChange={(e) =>
                setParams((p) => ({ ...p, hasBenefactor: e.target.checked }))
              }
            />
            <span>Benefactor</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={params.hasPoisoner}
              onChange={(e) =>
                setParams((p) => ({ ...p, hasPoisoner: e.target.checked }))
              }
            />
            <span>Poisoner</span>
          </label>
        </div>
        <button
          type="button"
          className="btn btn-small"
          onClick={() => setParams({ ...defaultParams })}
        >
          Reset to defaults
        </button>
      </section>

      <section className="panel">
        <h2>Best brews</h2>
        {truncated && (
          <p className="warn">
            Showing the first batch of combinations only — narrow your list
            for a full search.
          </p>
        )}
        {recipes.length === 0 && !loading && (
          <p className="muted">Results appear here after you search.</p>
        )}
        <ol className="recipe-list">
          {recipes.map((rec, i) => (
            <li key={i} className="recipe-card">
              <div className="recipe-top">
                <span className="gold">{rec.totalGold.toLocaleString()} gold</span>
                <span className={`tag ${rec.mixtureKind}`}>
                  {rec.mixtureKind}
                </span>
              </div>
              <div className="recipe-ing">
                {rec.ingredients.map((ing) => ing.name).join(" + ")}
              </div>
              <ul className="fx">
                {rec.effects.map((e) => (
                  <li key={e.effectKey}>
                    <span>{e.displayName}</span>
                    <span className="fx-g">{e.gold.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
