import { IconButton, Table } from "@radix-ui/themes";
import { useRef } from "react";
import type { InventoryRow, InventoryRowPatch } from "../types.ts";
import { FinalizedIngredientCell } from "./FinalizedIngredientCell.tsx";
import { IngredientAutocompleteField } from "./IngredientAutocompleteField.tsx";
import { IngredientQuantityField } from "./IngredientQuantityField.tsx";

type Props = {
  row: InventoryRow;
  onUpdate: (rowId: string, patch: InventoryRowPatch) => void;
  onRemove: (rowId: string) => void;
  onAddRow: () => void;
};

export function InventoryIngredientRow({ row, onUpdate, onRemove, onAddRow }: Props) {
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const isFinalized = typeof row.ingredientId === "number";
  const updateRowFields = (patch: InventoryRowPatch) => {
    onUpdate(row.id, patch);
    if (typeof patch.ingredientId === "number") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = quantityInputRef.current;
          if (el) {
            el.focus();
            el.select();
          }
        });
      });
    }
  };

  const beginEditIngredient = () => {
    updateRowFields({ ingredientId: undefined, ingredientIconUrl: undefined });
    requestAnimationFrame(() => {
      document.getElementById(`ingredient-name-${row.id}`)?.focus();
    });
  };

  return (
    <Table.Row align="start">
      <Table.Cell style={{ minWidth: "12rem" }}>
        {isFinalized ? (
          <FinalizedIngredientCell
            name={row.name}
            ingredientIconUrl={row.ingredientIconUrl}
            onChangeClick={beginEditIngredient}
          />
        ) : (
          <IngredientAutocompleteField rowId={row.id} name={row.name} onUpdate={updateRowFields} />
        )}
      </Table.Cell>

      <Table.Cell style={{ width: "5.5rem", verticalAlign: "middle" }}>
        <IngredientQuantityField
          rowId={row.id}
          quantity={row.quantity}
          inputRef={quantityInputRef}
          onUpdate={updateRowFields}
          onAddRow={onAddRow}
        />
      </Table.Cell>
      <Table.Cell style={{ width: "3rem", verticalAlign: "middle" }}>
        <IconButton
          type="button"
          size="2"
          variant="ghost"
          color="gray"
          aria-label="Remove row"
          onClick={() => onRemove(row.id)}
        >
          ✕
        </IconButton>
      </Table.Cell>
    </Table.Row>
  );
}
