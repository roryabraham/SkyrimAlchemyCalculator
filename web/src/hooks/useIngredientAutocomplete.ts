import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { fetchIngredients } from "../ingredient-api.ts";
import type { IngredientHit, InventoryRow } from "../types.ts";

const NO_INGREDIENT_SUGGESTIONS: IngredientHit[] = [];

type Args = {
  name: string;
  onPatch: (patch: Partial<InventoryRow>) => void;
  quantityInputRef: RefObject<HTMLInputElement | null>;
};

export function useIngredientAutocomplete({ name, onPatch, quantityInputRef }: Args) {
  const [dismissed, setDismissed] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listboxId = useId();
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const highlightedIndexRef = useRef(highlightedIndex);
  highlightedIndexRef.current = highlightedIndex;

  const trimmedName = name.trim();
  const { data, isError, error, isFetching, isSuccess, isPending, isEnabled } = useQuery({
    queryKey: ["ingredients", "autocomplete", trimmedName],
    queryFn: () => fetchIngredients(trimmedName),
    enabled: trimmedName.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const popoverOpen =
    !dismissed &&
    trimmedName.length > 0 &&
    isEnabled &&
    (isPending || isFetching || isSuccess || isError);
  const suggestions = isSuccess && Array.isArray(data) ? data : NO_INGREDIENT_SUGGESTIONS;

  const canKeyboardNavigate = popoverOpen && suggestions.length > 0;

  useEffect(() => {
    setHighlightedIndex(-1);
    suggestionRefs.current = [];
  }, [suggestions]);

  useEffect(() => {
    if (highlightedIndex < 0) {
      return;
    }
    suggestionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const pickSuggestion = (hit: IngredientHit) => {
    setDismissed(true);
    setHighlightedIndex(-1);
    onPatch({
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

  const onPopoverOpenChange = (next: boolean) => {
    if (!next) {
      setDismissed(true);
    }
  };

  const onComboboxChange = (value: string) => {
    setDismissed(false);
    setHighlightedIndex(-1);
    onPatch({ name: value });
  };

  const onComboboxFocus = () => {
    setDismissed(false);
  };

  const onComboboxKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!canKeyboardNavigate) {
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
    popoverOpen,
    onPopoverOpenChange,
    suggestions,
    isFetching,
    isError,
    isSuccess,
    error,
    canKeyboardNavigate,
    highlightedIndex,
    setHighlightedIndex,
    pickSuggestion,
    onComboboxChange,
    onComboboxFocus,
    onComboboxKeyDown,
  };
}
