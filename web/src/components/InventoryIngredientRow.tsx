import {
  Box,
  Button,
  Flex,
  IconButton,
  Popover,
  ScrollArea,
  Spinner,
  Table,
  TextField,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { fetchIngredientsForAutocomplete } from "../ingredient-api.ts";
import type { InventoryRow } from "../types.ts";

type Props = {
  row: InventoryRow;
  onUpdate: (rowId: string, patch: Partial<InventoryRow>) => void;
  onRemove: (rowId: string) => void;
};

export function InventoryIngredientRow({ row, onUpdate, onRemove }: Props) {
  const deferredQuery = useDeferredValue(row.name.trim());
  const q = deferredQuery;
  const { data, isFetching } = useQuery({
    queryKey: ["ingredients", "autocomplete", q],
    queryFn: () => fetchIngredientsForAutocomplete(q),
    enabled: q.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const suggestions = q.length > 0 ? (data ?? []) : [];
  const suggestOpen = row.open && suggestions.length > 0;
  const queryStale = row.name.trim() !== deferredQuery;

  return (
    <Table.Row align="start">
      <Table.Cell style={{ minWidth: "12rem" }}>
        <Popover.Root open={suggestOpen} modal={false}>
          {/* @radix-ui/themes Popover.Anchor drops children; Trigger asChild keeps the field in the DOM. */}
          <Popover.Trigger asChild>
            <Box position="relative" width="100%">
              <TextField.Root
                size="2"
                placeholder="Whisper an ingredient…"
                value={row.name}
                autoComplete="off"
                onChange={(e) => {
                  const v = e.target.value;
                  onUpdate(row.id, { name: v, open: true });
                }}
                onFocus={() => {
                  onUpdate(row.id, { open: true });
                }}
                onBlur={() => {
                  setTimeout(() => onUpdate(row.id, { open: false }), 150);
                }}
              >
                {queryStale || isFetching ? (
                  <TextField.Slot side="right">
                    <Spinner size="1" />
                  </TextField.Slot>
                ) : null}
              </TextField.Root>
            </Box>
          </Popover.Trigger>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={4}
            maxWidth="100%"
            style={{ width: "var(--radix-popover-anchor-width)" }}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <ScrollArea type="hover" scrollbars="vertical" style={{ maxHeight: 220 }}>
              <Flex direction="column" gap="1" p="1">
                {suggestions.map((h) => (
                  <Button
                    key={h.id}
                    type="button"
                    variant="ghost"
                    size="1"
                    style={{ justifyContent: "flex-start" }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onUpdate(row.id, {
                        name: h.name,
                        open: false,
                      });
                    }}
                  >
                    {h.name}
                  </Button>
                ))}
              </Flex>
            </ScrollArea>
          </Popover.Content>
        </Popover.Root>
      </Table.Cell>
      <Table.Cell style={{ width: "5.5rem", verticalAlign: "middle" }}>
        <TextField.Root
          size="2"
          type="number"
          min={1}
          style={{ maxWidth: "5rem" }}
          value={String(row.count)}
          onChange={(e) =>
            onUpdate(row.id, {
              count: Math.max(1, Number(e.target.value) || 1),
            })
          }
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
    </Table.Row>
  );
}
