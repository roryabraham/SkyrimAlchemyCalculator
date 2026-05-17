import type { Recipe } from "../types.ts";

type Props = {
  recipes: Recipe[];
  truncated: boolean;
  loading: boolean;
};

export function RecipeResultsPanel({ recipes, truncated, loading }: Props) {
  return (
    <section className="panel">
      <h2>Best brews</h2>
      {truncated && (
        <p className="warn">
          Showing the first batch of combinations only — narrow your list for a
          full search.
        </p>
      )}
      {recipes.length === 0 && !loading && (
        <p className="muted">Results appear here after you search.</p>
      )}
      <ol className="recipe-list">
        {recipes.map((rec, i) => (
          <li key={i} className="recipe-card">
            <div className="recipe-top">
              <span className="gold">
                {rec.totalGold.toLocaleString()} gold
              </span>
              <span className={`tag ${rec.mixtureKind}`}>{rec.mixtureKind}</span>
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
  );
}
