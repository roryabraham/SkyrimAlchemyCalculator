import { TextField } from "@radix-ui/themes";
import { useRef, useState, type RefObject } from "react";
import type { InventoryRowPatch } from "../types.ts";

function clampQuantity(n: number): number {
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

type Props = {
  rowId: string;
  quantity: number;
  inputRef: RefObject<HTMLInputElement | null>;
  onUpdate: (patch: InventoryRowPatch) => void;
  onAddRow: () => void;
};

export function IngredientQuantityField({ rowId, quantity, inputRef, onUpdate, onAddRow }: Props) {
  const [quantityDraft, setQuantityDraft] = useState(() => String(quantity));
  const [prevQuantity, setPrevQuantity] = useState(quantity);
  const isQuantityFieldFocusedRef = useRef(false);

  if (quantity !== prevQuantity) {
    setPrevQuantity(quantity);
    if (!isQuantityFieldFocusedRef.current) {
      setQuantityDraft(String(quantity));
    }
  }

  const commitQuantityDraft = () => {
    isQuantityFieldFocusedRef.current = false;
    const parsed = parseInt(quantityDraft, 10);
    const next = clampQuantity(parsed);
    setQuantityDraft(String(next));
    if (next !== quantity) {
      onUpdate({ quantity: next });
    }
  };

  return (
    <TextField.Root
      ref={inputRef}
      id={`ingredient-qty-${rowId}`}
      size="2"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      style={{ maxWidth: "5rem" }}
      value={quantityDraft}
      onChange={(event) => {
        const v = event.target.value;
        if (v !== "" && !/^\d+$/.test(v)) {
          return;
        }
        setQuantityDraft(v);
        if (v !== "") {
          const n = parseInt(v, 10);
          if (Number.isFinite(n) && n >= 1) {
            onUpdate({ quantity: n });
          }
        }
      }}
      onFocus={() => {
        isQuantityFieldFocusedRef.current = true;
      }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.key !== "Enter") {
          return;
        }
        event.preventDefault();
        commitQuantityDraft();
        onAddRow();
      }}
      onBlur={commitQuantityDraft}
    />
  );
}
