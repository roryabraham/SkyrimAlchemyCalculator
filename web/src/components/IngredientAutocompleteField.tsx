import * as Popover from "@radix-ui/react-popover";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea, Spinner, TextField, Theme } from "@radix-ui/themes";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { fetchIngredients } from "../ingredient-api.ts";
import type { IngredientHit, InventoryRowPatch } from "../types.ts";
import { IngredientSuggestionList } from "./IngredientSuggestionList.tsx";

const NO_INGREDIENT_SUGGESTIONS: IngredientHit[] = [];

type Props = {
  rowId: string;
  name: string;
  onUpdate: (patch: InventoryRowPatch) => void;
  quantityInputRef: RefObject<HTMLInputElement | null>;
};

export function IngredientAutocompleteField({ rowId, name, onUpdate, quantityInputRef }: Props) {
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

  return (
    <>
      {/*
        All Popover parts come from @radix-ui/react-popover directly.
        Mixing @radix-ui/themes Popover.Root with a separately-installed Anchor caused a
        createContextScope mismatch — they each create independent React contexts, so the
        Anchor's position was never communicated to Root and the panel rendered off-screen.
      */}
      <Popover.Root open={isPopoverOpen} onOpenChange={onPopoverOpenChange} modal={false}>
        <Popover.Anchor asChild>
          <TextField.Root
            id={`ingredient-name-${rowId}`}
            size="2"
            placeholder="Whisper an ingredient…"
            value={name}
            autoComplete="off"
            role="combobox"
            aria-expanded={isKeyboardNavEnabled}
            aria-controls={isKeyboardNavEnabled ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={
              isKeyboardNavEnabled && highlightedIndex >= 0
                ? `${listboxId}-opt-${suggestions[highlightedIndex]!.id}`
                : undefined
            }
            onChange={(event) => onComboboxChange(event.target.value)}
            onFocus={onComboboxFocus}
            onKeyDown={onComboboxKeyDown}
          >
            {isFetching ? (
              <TextField.Slot side="right">
                <Spinner size="1" />
              </TextField.Slot>
            ) : null}
          </TextField.Root>
        </Popover.Anchor>

        <Popover.Portal>
          <Theme appearance="dark" accentColor="amber" grayColor="mauve" radius="large">
            <Popover.Content
              side="bottom"
              align="start"
              sideOffset={4}
              collisionPadding={8}
              onOpenAutoFocus={(event) => event.preventDefault()}
              style={{
                width: "var(--radix-popper-anchor-width)",
                minWidth: "10rem",
                maxHeight: 240,
                zIndex: 9999,
                borderRadius: "var(--radius-3)",
                background: "var(--color-panel-solid)",
                boxShadow: "var(--shadow-4)",
                border: "1px solid var(--gray-a6)",
                overflow: "hidden",
              }}
            >
              <ScrollArea type="hover" scrollbars="vertical" style={{ maxHeight: 240 }}>
                <IngredientSuggestionList
                  listboxId={listboxId}
                  suggestionRefs={suggestionRefs}
                  suggestions={suggestions}
                  highlightedIndex={highlightedIndex}
                  setHighlightedIndex={setHighlightedIndex}
                  pickSuggestion={pickSuggestion}
                  isFetching={isFetching}
                  isError={isError}
                  isSuccess={isSuccess}
                  error={error}
                />
              </ScrollArea>
            </Popover.Content>
          </Theme>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
