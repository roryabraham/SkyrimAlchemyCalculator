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
import type { InventoryRow } from "../types.ts";

type Props = {
  row: InventoryRow;
  onUpdate: (rowId: string, patch: Partial<InventoryRow>) => void;
  onRemove: (rowId: string) => void;
  onSearch: (rowId: string, q: string) => void;
};

export function InventoryIngredientRow({ row, onUpdate, onRemove, onSearch }: Props) {
  const suggestOpen = row.open && row.suggestions.length > 0;

  return (
    <Table.Row align="start">
      <Table.Cell style={{ minWidth: "12rem" }}>
        <Popover.Root open={suggestOpen} modal={false}>
          <Popover.Anchor>
            <Box position="relative" width="100%">
              <TextField.Root
                size="2"
                placeholder="Search…"
                value={row.name}
                autoComplete="off"
                onChange={(e) => {
                  const v = e.target.value;
                  onUpdate(row.id, { name: v, open: true });
                  onSearch(row.id, v);
                }}
                onFocus={() => {
                  onUpdate(row.id, { open: true });
                  if (row.name.trim()) onSearch(row.id, row.name);
                }}
                onBlur={() => {
                  setTimeout(() => onUpdate(row.id, { open: false }), 150);
                }}
              >
                {row.loading ? (
                  <TextField.Slot side="right">
                    <Spinner size="1" />
                  </TextField.Slot>
                ) : null}
              </TextField.Root>
            </Box>
          </Popover.Anchor>
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
                {row.suggestions.map((h) => (
                  <Button
                    key={h.id}
                    type="button"
                    variant="ghost"
                    size="1"
                    justify="start"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onUpdate(row.id, {
                        name: h.name,
                        open: false,
                        suggestions: [],
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
