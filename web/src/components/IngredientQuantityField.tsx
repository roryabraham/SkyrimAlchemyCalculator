import { TextField } from "@radix-ui/themes";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { InventoryRow } from "../types.ts";

function clampCount(n: number): number {
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

type Props = {
  rowId: string;
  count: number;
  inputRef: RefObject<HTMLInputElement | null>;
  onPatch: (patch: Partial<InventoryRow>) => void;
  onAddRow: () => void;
};

export function IngredientQuantityField({ rowId, count, inputRef, onPatch, onAddRow }: Props) {
  const [countDraft, setCountDraft] = useState(() => String(count));
  const countFieldFocusedRef = useRef(false);

  useEffect(() => {
    if (!countFieldFocusedRef.current) {
      setCountDraft(String(count));
    }
  }, [count]);

  const commitCountDraft = () => {
    countFieldFocusedRef.current = false;
    const parsed = parseInt(countDraft, 10);
    const next = clampCount(parsed);
    setCountDraft(String(next));
    if (next !== count) {
      onPatch({ count: next });
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
      value={countDraft}
      onChange={(event) => {
        const v = event.target.value;
        if (v !== "" && !/^\d+$/.test(v)) {
          return;
        }
        setCountDraft(v);
        if (v !== "") {
          const n = parseInt(v, 10);
          if (Number.isFinite(n) && n >= 1) {
            onPatch({ count: n });
          }
        }
      }}
      onFocus={() => {
        countFieldFocusedRef.current = true;
      }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.key !== "Enter") {
          return;
        }
        event.preventDefault();
        commitCountDraft();
        onAddRow();
      }}
      onBlur={commitCountDraft}
    />
  );
}
