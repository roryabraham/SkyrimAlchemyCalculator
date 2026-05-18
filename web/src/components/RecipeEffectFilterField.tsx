import * as Popover from "@radix-ui/react-popover";
import { Button, Flex, Text, TextField, Theme } from "@radix-ui/themes";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { searchEffectCatalog, type EffectCatalogRow } from "../libs/effects-catalog.ts";
import type { RecipeEffectFilterToken } from "../libs/types.ts";

type Props = {
  excludedEffectKeys: ReadonlySet<string>;
  onAddFilter: (token: RecipeEffectFilterToken) => void;
  /** Optional id of a visible label (e.g. section heading). */
  ariaLabelledBy?: string;
};

export function RecipeEffectFilterField({
  excludedEffectKeys,
  onAddFilter,
  ariaLabelledBy,
}: Props) {
  const [value, setValue] = useState("");
  const [isDismissed, setIsDismissed] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listboxId = useId();
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const trimmed = value.trim();
  const suggestions = searchEffectCatalog(trimmed, excludedEffectKeys);
  const suggestionRowKey = suggestions.map((r) => r.effectKey).join("\0");
  const isPopoverOpen = !isDismissed && trimmed.length > 0;
  const isKeyboardNavEnabled = isPopoverOpen && suggestions.length > 0;

  useEffect(() => {
    setHighlightedIndex(-1);
    suggestionRefs.current = [];
  }, [suggestionRowKey]);

  useEffect(() => {
    if (highlightedIndex < 0 || highlightedIndex >= suggestions.length) {
      return;
    }
    suggestionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, suggestionRowKey, suggestions.length]);

  const resetHighlight = () => {
    setHighlightedIndex(-1);
    suggestionRefs.current = [];
  };

  const pickSuggestion = (row: EffectCatalogRow) => {
    setIsDismissed(true);
    resetHighlight();
    setValue("");
    onAddFilter({ effectKey: row.effectKey, displayName: row.displayName });
  };

  const onPopoverOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setIsDismissed(true);
    }
  };

  const onComboboxChange = (next: string) => {
    setIsDismissed(false);
    setHighlightedIndex(-1);
    setValue(next);
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
      const i = highlightedIndex;
      if (i <= 0) {
        setHighlightedIndex(-1);
        return;
      }
      event.preventDefault();
      setHighlightedIndex(i - 1);
      return;
    }
    if (event.key === "Enter") {
      const i = highlightedIndex;
      const pickIndex = i >= 0 ? i : 0;
      const row = suggestions[pickIndex];
      if (row) {
        event.preventDefault();
        pickSuggestion(row);
      }
    }
  };

  return (
    <Popover.Root open={isPopoverOpen} onOpenChange={onPopoverOpenChange} modal={false}>
      <Popover.Anchor asChild>
        <TextField.Root
          size="2"
          placeholder="Filter by an effect…"
          value={value}
          autoComplete="off"
          role="combobox"
          aria-labelledby={ariaLabelledBy}
          aria-expanded={isKeyboardNavEnabled}
          aria-controls={isKeyboardNavEnabled ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            isKeyboardNavEnabled && highlightedIndex >= 0
              ? `${listboxId}-opt-${suggestions[highlightedIndex]!.effectKey}`
              : undefined
          }
          onChange={(event) => onComboboxChange(event.target.value)}
          onFocus={onComboboxFocus}
          onKeyDown={onComboboxKeyDown}
        />
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
              overflow: "auto",
            }}
          >
            <Flex
              direction="column"
              gap="1"
              p="1"
              id={listboxId}
              role="listbox"
              aria-label="Effects"
            >
              {suggestions.length === 0 ? (
                <Text size="2" color="gray" style={{ padding: "0.25rem 0.5rem" }}>
                  No effects match.
                </Text>
              ) : null}
              {suggestions.map((row, index) => (
                <Popover.Close key={row.effectKey} asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="1"
                    role="option"
                    tabIndex={-1}
                    id={`${listboxId}-opt-${row.effectKey}`}
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
                    onClick={() => pickSuggestion(row)}
                  >
                    {row.displayName}
                  </Button>
                </Popover.Close>
              ))}
            </Flex>
          </Popover.Content>
        </Theme>
      </Popover.Portal>
    </Popover.Root>
  );
}
