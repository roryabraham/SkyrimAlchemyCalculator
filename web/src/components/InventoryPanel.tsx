import { Button, Callout, Card, Flex, Heading, Spinner, Table, Text } from "@radix-ui/themes";
import { AnimatePresence } from "framer-motion";
import type { InventoryRow, InventoryRowPatch } from "../libs/types.ts";
import { InventoryIngredientRow } from "./InventoryIngredientRow.tsx";

type Props = {
  rows: InventoryRow[];
  /** Row ids that should briefly highlight after a Brew consumes stock. */
  brewFlashRowIds: readonly string[];
  isSubmitEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  onUpdateRow: (rowId: string, patch: InventoryRowPatch) => void;
  onRemoveRow: (rowId: string) => void;
  onAddRow: () => void;
  onSubmit: () => void;
};

export function InventoryPanel({
  rows,
  brewFlashRowIds,
  isSubmitEnabled,
  isLoading,
  error,
  onUpdateRow,
  onRemoveRow,
  onAddRow,
  onSubmit,
}: Props) {
  return (
    <Card size="3" variant="surface" className="alchemy-panel-glow">
      <Heading as="h2" size="5" weight="bold" mb="1" className="alchemy-display">
        Ingredient hoard
      </Heading>
      <Text size="2" color="gray" mb="4" as="p">
        Name what you have on hand — we will pair the priciest brews.
      </Text>
      <Table.Root variant="surface" size="2">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Ingredient</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={{ width: "5.5rem" }}>Qty</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={{ width: "3rem" }} />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <AnimatePresence mode="popLayout" initial={false}>
            {rows.map((row) => (
              <InventoryIngredientRow
                key={row.id}
                row={row}
                brewFlash={brewFlashRowIds.includes(row.id)}
                onUpdate={onUpdateRow}
                onRemove={onRemoveRow}
                onAddRow={onAddRow}
              />
            ))}
          </AnimatePresence>
        </Table.Body>
      </Table.Root>
      <Flex wrap="wrap" gap="3" mt="4" align="center">
        <Button type="button" size="2" variant="soft" onClick={onAddRow}>
          + Another ingredient
        </Button>
        <Button type="button" size="2" disabled={!isSubmitEnabled || isLoading} onClick={onSubmit}>
          {isLoading ? (
            <Flex align="center" gap="2">
              <Spinner size="1" />
              Distilling…
            </Flex>
          ) : (
            "Brew best value"
          )}
        </Button>
      </Flex>
      {error ? (
        <Callout.Root color="red" variant="soft" mt="4" role="alert">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      ) : null}
    </Card>
  );
}
