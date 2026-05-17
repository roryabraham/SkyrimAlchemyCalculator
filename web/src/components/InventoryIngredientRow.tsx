import type { InventoryRow } from "../types.ts";

type Props = {
  row: InventoryRow;
  onUpdate: (rowId: string, patch: Partial<InventoryRow>) => void;
  onRemove: (rowId: string) => void;
  onSearch: (rowId: string, q: string) => void;
};

export function InventoryIngredientRow({
  row,
  onUpdate,
  onRemove,
  onSearch,
}: Props) {
  return (
    <tr>
      <td className="cell-autocomplete">
        <div className="ac-wrap">
          <input
            className="input"
            placeholder="Search…"
            value={row.name}
            autoComplete="off"
            onChange={(e) => {
              const v = e.target.value;
              onUpdate(row.id, { name: v, open: true });
              onSearch(row.id, v);
            }}
            onFocus={() => {
              onUpdate(row.id, { open: true });
              if (row.name.trim()) onSearch(row.id, row.name);
            }}
            onBlur={() => {
              setTimeout(() => onUpdate(row.id, { open: false }), 150);
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
                      onUpdate(row.id, {
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
          {row.loading && <span className="hint">Searching…</span>}
        </div>
      </td>
      <td>
        <input
          className="input input-narrow"
          type="number"
          min={1}
          value={row.count}
          onChange={(e) =>
            onUpdate(row.id, {
              count: Math.max(1, Number(e.target.value) || 1),
            })
          }
        />
      </td>
      <td>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onRemove(row.id)}
          aria-label="Remove row"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
