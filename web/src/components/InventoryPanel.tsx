import {
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Spinner,
  Table,
} from "@radix-ui/themes";
import type { InventoryRow } from "../types.ts";
import { InventoryIngredientRow } from "./InventoryIngredientRow.tsx";

type Props = {
  rows: InventoryRow[];
  canSubmit: boolean;
  loading: boolean;
  error: string | null;
  onUpdateRow: (rowId: string, patch: Partial<InventoryRow>) => void;
  onRemoveRow: (rowId: string) => void;
  onSearch: (rowId: string, q: string) => void;
  onAddRow: () => void;
  onSubmit: () => void;
};

export function InventoryPanel({
  rows,
  canSubmit,
  loading,
  error,
  onUpdateRow,
  onRemoveRow,
  onSearch,
  onAddRow,
  onSubmit,
}: Props) {
  return (
    <Card size="3" variant="surface">
      <Heading as="h2" size="5" weight="bold" mb="4">
        Your ingredients
      </Heading>
      <Table.Root variant="surface" size="2">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Ingredient</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={{ width: "5.5rem" }}>
              Qty
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={{ width: "3rem" }} />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => (
            <InventoryIngredientRow
              key={row.id}
              row={row}
              onUpdate={onUpdateRow}
              onRemove={onRemoveRow}
              onSearch={onSearch}
            />
          ))}
        </Table.Body>
      </Table.Root>
      <Flex wrap="wrap" gap="3" mt="4" align="center">
        <Button type="button" size="2" variant="soft" onClick={onAddRow}>
          Add ingredient
        </Button>
        <Button
          type="button"
          size="2"
          disabled={!canSubmit || loading}
          onClick={() => void onSubmit()}
        >
          {loading ? (
            <Flex align="center" gap="2">
              <Spinner size="1" />
              Working…
            </Flex>
          ) : (
            "Find potions"
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
