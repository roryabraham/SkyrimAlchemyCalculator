import { IconButton, Table } from "@radix-ui/themes";
import { useRef } from "react";
import type { InventoryRow } from "../types.ts";
import { FinalizedIngredientCell } from "./FinalizedIngredientCell.tsx";
import { IngredientAutocompleteField } from "./IngredientAutocompleteField.tsx";
import { IngredientQuantityField } from "./IngredientQuantityField.tsx";

type Props = {
  row: InventoryRow;
  onUpdate: (rowId: string, patch: Partial<InventoryRow>) => void;
  onRemove: (rowId: string) => void;
  onAddRow: () => void;
};

export function InventoryIngredientRow({ row, onUpdate, onRemove, onAddRow }: Props) {
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const isFinalized = typeof row.ingredientId === "number";
  const onPatch = (patch: Partial<InventoryRow>) => onUpdate(row.id, patch);

  const beginEditIngredient = () => {
    onPatch({ ingredientId: undefined, ingredientIconUrl: undefined });
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
          <IngredientAutocompleteField
            rowId={row.id}
            name={row.name}
            onPatch={onPatch}
            quantityInputRef={quantityInputRef}
          />
        )}
      </Table.Cell>

      <Table.Cell style={{ width: "5.5rem", verticalAlign: "middle" }}>
        <IngredientQuantityField
          rowId={row.id}
          count={row.count}
          inputRef={quantityInputRef}
          onPatch={onPatch}
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
