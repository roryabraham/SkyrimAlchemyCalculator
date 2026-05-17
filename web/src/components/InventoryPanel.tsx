import type { InventoryRow } from "../types.ts";
import { InventoryIngredientRow } from "./InventoryIngredientRow.tsx";

type Props = {
  rows: InventoryRow[];
  canSubmit: boolean;
  loading: boolean;
  error: string | null;
  onUpdateRow: (rowId: string, patch: Partial<InventoryRow>) => void;
  onRemoveRow: (rowId: string) => void;
  onSearch: (rowId: string, q: string) => void;
  onAddRow: () => void;
  onSubmit: () => void;
};

export function InventoryPanel({
  rows,
  canSubmit,
  loading,
  error,
  onUpdateRow,
  onRemoveRow,
  onSearch,
  onAddRow,
  onSubmit,
}: Props) {
  return (
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
            <InventoryIngredientRow
              key={row.id}
              row={row}
              onUpdate={onUpdateRow}
              onRemove={onRemoveRow}
              onSearch={onSearch}
            />
          ))}
        </tbody>
      </table>
      <div className="row-actions">
        <button type="button" className="btn" onClick={onAddRow}>
          Add ingredient
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!canSubmit || loading}
          onClick={() => void onSubmit()}
        >
          {loading ? "Working…" : "Find potions"}
        </button>
      </div>
      {error && <p className="err">{error}</p>}
    </section>
  );
}
