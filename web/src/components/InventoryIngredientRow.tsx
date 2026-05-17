import { IconButton, Table } from "@radix-ui/themes";
import { motion } from "framer-motion";
import type { Ref } from "react";
import { useRef } from "react";
import type { InventoryRow, InventoryRowPatch } from "../types.ts";
import { FinalizedIngredientCell } from "./FinalizedIngredientCell.tsx";
import { IngredientAutocompleteField } from "./IngredientAutocompleteField.tsx";
import { IngredientQuantityField } from "./IngredientQuantityField.tsx";

const MotionRow = motion(Table.Row);

type Props = {
  ref?: Ref<HTMLTableRowElement>;
  row: InventoryRow;
  brewFlash: boolean;
  onUpdate: (rowId: string, patch: InventoryRowPatch) => void;
  onRemove: (rowId: string) => void;
  onAddRow: () => void;
};

export function InventoryIngredientRow({
  ref,
  row,
  brewFlash,
  onUpdate,
  onRemove,
  onAddRow,
}: Props) {
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
    <MotionRow
      ref={ref}
      align="start"
      className={brewFlash ? "alchemy-brew-flash" : undefined}
      layout
      exit={{ opacity: 0, scaleY: 0 }}
      style={{ originY: 0 }}
      transition={{ duration: 0.2, ease: "easeIn" }}
    >
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
    </MotionRow>
  );
}
