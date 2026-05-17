import { Container, Flex } from "@radix-ui/themes";
import { useMutation } from "@tanstack/react-query";
import { useDeferredValue, useState, useTransition } from "react";
import { AlchemySettingsPanel } from "./components/AlchemySettingsPanel.tsx";
import { AppHeader } from "./components/AppHeader.tsx";
import { DataAttribution } from "./components/DataAttribution.tsx";
import { InventoryPanel } from "./components/InventoryPanel.tsx";
import { RecipeResultsPanel } from "./components/RecipeResultsPanel.tsx";
import { requestPotionsRank } from "./potions-api.ts";
import type { AlchemyFormParams, InventoryRow } from "./types.ts";
import { defaultAlchemyFormParams } from "./types.ts";
import { uid } from "./uid.ts";

export type { AlchemyFormParams } from "./types.ts";

export function App() {
  const [rows, setRows] = useState<InventoryRow[]>([
    {
      id: uid(),
      name: "",
      count: 1,
      open: false,
    },
  ]);
  const [params, setParams] = useState<AlchemyFormParams>({
    ...defaultAlchemyFormParams,
  });
  const [, startSettingsTransition] = useTransition();

  const potionsMutation = useMutation({
    mutationFn: () => {
      const inventory = rows
        .filter((r) => r.name.trim())
        .map((r) => ({ name: r.name.trim(), count: r.count }));
      return requestPotionsRank(inventory, params);
    },
  });

  const addRow = () => {
    setRows((r) => [
      ...r,
      {
        id: uid(),
        name: "",
        count: 1,
        open: false,
      },
    ]);
  };

  const removeRow = (rowId: string) => {
    setRows((r) => (r.length <= 1 ? r : r.filter((x) => x.id !== rowId)));
  };

  const updateRow = (rowId: string, patch: Partial<InventoryRow>) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  };

  const submit = () => {
    potionsMutation.mutate();
  };

  const loading = potionsMutation.isPending;
  const outcome = potionsMutation.data;
  const recipes = loading ? [] : outcome?.type === "success" ? outcome.recipes : [];
  const deferredRecipes = useDeferredValue(recipes);
  const listUpdating = !loading && recipes.length > 0 && recipes !== deferredRecipes;
  const truncated = !loading && outcome?.type === "success" ? Boolean(outcome.truncated) : false;
  const error = outcome?.type === "error" ? outcome.error : null;

  const canSubmit =
    rows.some((r) => r.name.trim()) &&
    rows.filter((r) => r.name.trim()).reduce((s, r) => s + Math.max(0, Math.floor(r.count)), 0) >=
      2;

  return (
    <Container size="2" px={{ initial: "4", sm: "5" }} py="6">
      <Flex direction="column" gap="6">
        <AppHeader />
        <InventoryPanel
          rows={rows}
          canSubmit={canSubmit}
          loading={loading}
          error={error}
          onUpdateRow={updateRow}
          onRemoveRow={removeRow}
          onAddRow={addRow}
          onSubmit={submit}
        />
        <AlchemySettingsPanel
          params={params}
          setParams={setParams}
          startSettingsTransition={startSettingsTransition}
        />
        <RecipeResultsPanel
          recipes={recipes}
          displayedRecipes={deferredRecipes}
          listUpdating={listUpdating}
          truncated={truncated}
          loading={loading}
        />
        <DataAttribution />
      </Flex>
    </Container>
  );
}
