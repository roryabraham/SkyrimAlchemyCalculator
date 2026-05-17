import * as Popover from "@radix-ui/react-popover";
import { Button, Flex, Text } from "@radix-ui/themes";
import type { MutableRefObject } from "react";
import type { IngredientHit } from "../libs/types.ts";

type Props = {
  listboxId: string;
  suggestionRefs: MutableRefObject<(HTMLButtonElement | null)[]>;
  suggestions: IngredientHit[];
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  pickSuggestion: (hit: IngredientHit) => void;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
};

export function IngredientSuggestionList({
  listboxId,
  suggestionRefs,
  suggestions,
  highlightedIndex,
  setHighlightedIndex,
  pickSuggestion,
  isFetching,
  isError,
  isSuccess,
  error,
}: Props) {
  return (
    <Flex direction="column" gap="1" p="1" id={listboxId} role="listbox" aria-label="Ingredients">
      {isFetching && suggestions.length === 0 && !isError ? (
        <Text size="2" color="gray" style={{ padding: "0.25rem 0.5rem" }}>
          Searching…
        </Text>
      ) : null}
      {isError ? (
        <Text size="2" color="red" style={{ padding: "0.25rem 0.5rem", whiteSpace: "normal" }}>
          {error instanceof Error ? error.message : "Search failed"} — is the API running? Use{" "}
          <code style={{ fontWeight: 600 }}>bun run dev</code>.
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
  );
}
