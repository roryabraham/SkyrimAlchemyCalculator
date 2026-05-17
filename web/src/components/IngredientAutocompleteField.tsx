import * as Popover from "@radix-ui/react-popover";
import {
  Button,
  Flex,
  ScrollArea,
  Spinner,
  Text,
  TextField,
  Theme,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { fetchIngredients } from "../ingredient-api.ts";
import type { IngredientHit, InventoryRow } from "../types.ts";

const NO_INGREDIENT_SUGGESTIONS: IngredientHit[] = [];

type Props = {
  rowId: string;
  name: string;
  onPatch: (patch: Partial<InventoryRow>) => void;
  quantityInputRef: RefObject<HTMLInputElement | null>;
};

export function IngredientAutocompleteField({ rowId, name, onPatch, quantityInputRef }: Props) {
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

  return (
    <>
      {/*
        All Popover parts come from @radix-ui/react-popover directly.
        Mixing @radix-ui/themes Popover.Root with a separately-installed Anchor caused a
        createContextScope mismatch — they each create independent React contexts, so the
        Anchor's position was never communicated to Root and the panel rendered off-screen.
      */}
      <Popover.Root
        open={popoverOpen}
        onOpenChange={(next) => {
          if (!next) {
            setDismissed(true);
          }
        }}
        modal={false}
      >
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
            onChange={(event) => {
              setDismissed(false);
              setHighlightedIndex(-1);
              onPatch({ name: event.target.value });
            }}
            onFocus={() => setDismissed(false)}
            onKeyDown={(event) => {
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
            }}
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
                <Flex
                  direction="column"
                  gap="1"
                  p="1"
                  id={listboxId}
                  role="listbox"
                  aria-label="Ingredients"
                >
                  {isFetching && suggestions.length === 0 && !isError ? (
                    <Text size="2" color="gray" style={{ padding: "0.25rem 0.5rem" }}>
                      Searching…
                    </Text>
                  ) : null}
                  {isError ? (
                    <Text
                      size="2"
                      color="red"
                      style={{ padding: "0.25rem 0.5rem", whiteSpace: "normal" }}
                    >
                      {error instanceof Error ? error.message : "Search failed"} — is the API
                      running? Use <code style={{ fontWeight: 600 }}>bun run dev</code>.
                    </Text>
                  ) : null}
                  {isSuccess && suggestions.length === 0 && !isFetching ? (
                    <Text size="2" color="gray" style={{ padding: "0.25rem 0.5rem" }}>
                      No ingredients match.
                    </Text>
                  ) : null}
                  {suggestions.map((hit, index) => (
                    <Popover.Close key={hit.id} asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="1"
                        role="option"
                        tabIndex={-1}
                        id={`${listboxId}-opt-${hit.id}`}
                        aria-selected={highlightedIndex === index}
                        ref={(el) => {
                          suggestionRefs.current[index] = el;
                        }}
                        style={{
                          justifyContent: "flex-start",
                          outlineOffset: 2,
                          ...(highlightedIndex === index
                            ? {
                                background: "var(--amber-a3)",
                                boxShadow: "inset 0 0 0 1px var(--amber-a6)",
                              }
                            : {}),
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => pickSuggestion(hit)}
                      >
                        <Flex align="center" gap="2">
                          {hit.iconUrl ? (
                            <img
                              src={hit.iconUrl}
                              alt=""
                              width={22}
                              height={22}
                              style={{ objectFit: "contain", flexShrink: 0 }}
                            />
                          ) : null}
                          {hit.name}
                        </Flex>
                      </Button>
                    </Popover.Close>
                  ))}
                </Flex>
              </ScrollArea>
            </Popover.Content>
          </Theme>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
