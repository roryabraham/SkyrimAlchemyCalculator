import * as Popover from "@radix-ui/react-popover";
import { ScrollArea, Spinner, TextField, Theme } from "@radix-ui/themes";
import type { RefObject } from "react";
import { useIngredientAutocomplete } from "../hooks/useIngredientAutocomplete.ts";
import type { InventoryRowPatch } from "../types.ts";
import { IngredientSuggestionList } from "./IngredientSuggestionList.tsx";

type Props = {
  rowId: string;
  name: string;
  onUpdate: (patch: InventoryRowPatch) => void;
  quantityInputRef: RefObject<HTMLInputElement | null>;
};

export function IngredientAutocompleteField({ rowId, name, onUpdate, quantityInputRef }: Props) {
  const {
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
  } = useIngredientAutocomplete({ name, onUpdate, quantityInputRef });

  return (
    <>
      {/*
        All Popover parts come from @radix-ui/react-popover directly.
        Mixing @radix-ui/themes Popover.Root with a separately-installed Anchor caused a
        createContextScope mismatch — they each create independent React contexts, so the
        Anchor's position was never communicated to Root and the panel rendered off-screen.
      */}
      <Popover.Root open={popoverOpen} onOpenChange={onPopoverOpenChange} modal={false}>
        <Popover.Anchor asChild>
          <TextField.Root
            id={`ingredient-name-${rowId}`}
            size="2"
            placeholder="Whisper an ingredient…"
            value={name}
            autoComplete="off"
            role="combobox"
            aria-expanded={canKeyboardNavigate}
            aria-controls={canKeyboardNavigate ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={
              canKeyboardNavigate && highlightedIndex >= 0
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
