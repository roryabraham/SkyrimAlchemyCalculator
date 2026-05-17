import {
  Button,
  Flex,
  IconButton,
  ScrollArea,
  Spinner,
  Table,
  Text,
  TextField,
  Theme,
} from "@radix-ui/themes";
import * as Popover from "@radix-ui/react-popover";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchIngredients } from "../ingredient-api.ts";
import type { InventoryRow } from "../types.ts";

type Props = {
  row: InventoryRow;
  onUpdate: (rowId: string, patch: Partial<InventoryRow>) => void;
  onRemove: (rowId: string) => void;
};

export function InventoryIngredientRow({ row, onUpdate, onRemove }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const q = row.name.trim();
  const { data, isError, error, isFetching, isSuccess, isPending, isEnabled } = useQuery({
    queryKey: ["ingredients", "autocomplete", q],
    queryFn: () => fetchIngredients(q),
    enabled: q.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const popoverOpen =
    !dismissed && q.length > 0 && isEnabled && (isPending || isFetching || isSuccess || isError);
  const suggestions = isSuccess && Array.isArray(data) ? data : [];

  return (
    <Table.Row align="start">
      <Table.Cell style={{ minWidth: "12rem" }}>
        {/*
          All Popover parts come from @radix-ui/react-popover directly.
          Mixing @radix-ui/themes Popover.Root with a separately-installed Anchor caused a
          createContextScope mismatch — they each create independent React contexts, so the
          Anchor's position was never communicated to Root and the panel rendered off-screen.
        */}
        <Popover.Root
          open={popoverOpen}
          onOpenChange={(next) => {
            if (!next) setDismissed(true);
          }}
          modal={false}
        >
          <Popover.Anchor asChild>
            <TextField.Root
              size="2"
              placeholder="Whisper an ingredient…"
              value={row.name}
              autoComplete="off"
              onChange={(e) => {
                setDismissed(false);
                onUpdate(row.id, { name: e.target.value });
              }}
              onFocus={() => setDismissed(false)}
            >
              {isFetching ? (
                <TextField.Slot side="right">
                  <Spinner size="1" />
                </TextField.Slot>
              ) : null}
            </TextField.Root>
          </Popover.Anchor>

          <Popover.Portal>
            {/* Theme re-establishes Radix Themes token context inside the portal */}
            <Theme appearance="dark" accentColor="amber" grayColor="mauve" radius="large">
              <Popover.Content
                side="bottom"
                align="start"
                sideOffset={4}
                collisionPadding={8}
                onOpenAutoFocus={(e) => e.preventDefault()}
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
                  <Flex direction="column" gap="1" p="1">
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
                    {suggestions.map((h) => (
                      <Popover.Close key={h.id} asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="1"
                          style={{ justifyContent: "flex-start" }}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setDismissed(true);
                            onUpdate(row.id, { name: h.name });
                          }}
                        >
                          <Flex align="center" gap="2">
                            {h.iconUrl ? (
                              <img
                                src={h.iconUrl}
                                alt=""
                                width={22}
                                height={22}
                                style={{ objectFit: "contain", flexShrink: 0 }}
                              />
                            ) : null}
                            {h.name}
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
