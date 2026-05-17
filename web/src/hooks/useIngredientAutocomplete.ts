import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { fetchIngredients } from "../ingredient-api.ts";
import type { IngredientHit, InventoryRowPatch } from "../types.ts";

const NO_INGREDIENT_SUGGESTIONS: IngredientHit[] = [];

type Args = {
  name: string;
  onUpdate: (patch: InventoryRowPatch) => void;
  quantityInputRef: RefObject<HTMLInputElement | null>;
};

export function useIngredientAutocomplete({ name, onUpdate, quantityInputRef }: Args) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listboxId = useId();
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const prevSuggestionsRef = useRef<IngredientHit[] | null>(null);
  const highlightedIndexRef = useRef(highlightedIndex);
  highlightedIndexRef.current = highlightedIndex;

  const trimmedName = name.trim();
  const { data, isError, error, isFetching, isSuccess, isPending, isEnabled } = useQuery({
    queryKey: ["ingredients", "autocomplete", trimmedName],
    queryFn: () => fetchIngredients(trimmedName),
    enabled: trimmedName.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const isPopoverOpen =
    !isDismissed &&
    trimmedName.length > 0 &&
    isEnabled &&
    (isPending || isFetching || isSuccess || isError);
  const suggestions = isSuccess && Array.isArray(data) ? data : NO_INGREDIENT_SUGGESTIONS;

  const isKeyboardNavEnabled = isPopoverOpen && suggestions.length > 0;

  if (prevSuggestionsRef.current !== suggestions) {
    prevSuggestionsRef.current = suggestions;
    setHighlightedIndex(-1);
    suggestionRefs.current = [];
  }

  useEffect(() => {
    if (highlightedIndex < 0) {
      return;
    }
    suggestionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const pickSuggestion = (hit: IngredientHit) => {
    setIsDismissed(true);
    setHighlightedIndex(-1);
    onUpdate({
      name: hit.name,
      ingredientId: hit.id,
      ingredientIconUrl: hit.iconUrl,
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = quantityInputRef.current;
        if (el) {
          el.focus();
          el.select();
        }
      });
    });
  };

  const onPopoverOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setIsDismissed(true);
    }
  };

  const onComboboxChange = (value: string) => {
    setIsDismissed(false);
    setHighlightedIndex(-1);
    onUpdate({ name: value });
  };

  const onComboboxFocus = () => {
    setIsDismissed(false);
  };

  const onComboboxKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isKeyboardNavEnabled) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((i) => {
        if (i < 0) {
          return 0;
        }
        return i < suggestions.length - 1 ? i + 1 : i;
      });
      return;
    }
    if (event.key === "ArrowUp") {
      const i = highlightedIndexRef.current;
      if (i <= 0) {
        setHighlightedIndex(-1);
        return;
      }
      event.preventDefault();
      setHighlightedIndex(i - 1);
      return;
    }
    if (event.key === "Enter") {
      const i = highlightedIndexRef.current;
      const pickIndex = i >= 0 ? i : 0;
      const hit = suggestions[pickIndex];
      if (hit) {
        event.preventDefault();
        pickSuggestion(hit);
      }
    }
  };

  return {
    listboxId,
    suggestionRefs,
    isPopoverOpen,
    onPopoverOpenChange,
    suggestions,
    isFetching,
    isError,
    isSuccess,
    error,
    isKeyboardNavEnabled,
    highlightedIndex,
    setHighlightedIndex,
    pickSuggestion,
    onComboboxChange,
    onComboboxFocus,
    onComboboxKeyDown,
  };
}
