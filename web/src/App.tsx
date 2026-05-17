import { Container, Flex } from "@radix-ui/themes";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useDeferredValue, useEffect, useState, useTransition } from "react";
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
    },
  ]);
  const [params, setParams] = useState<AlchemyFormParams>({
    ...defaultAlchemyFormParams,
  });
  const [, startSettingsTransition] = useTransition();

  const potionsMutation = useMutation({
    mutationFn: () => {
      const inventory = rows
        .filter((row) => row.name.trim())
        .map((row) => ({ name: row.name.trim(), count: row.count }));
      return requestPotionsRank(inventory, params);
    },
  });

  const addRow = useCallback(() => {
    const newId = uid();
    setRows((prevRows) => [...prevRows, { id: newId, name: "", count: 1 }]);
    requestAnimationFrame(() => {
      document.getElementById(`ingredient-name-${newId}`)?.focus();
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }
      if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (event.code !== "KeyN") {
        return;
      }
      event.preventDefault();
      addRow();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addRow]);

  const removeRow = (rowId: string) => {
    setRows((prevRows) =>
      prevRows.length <= 1 ? prevRows : prevRows.filter((row) => row.id !== rowId),
    );
  };

  const updateRow = (rowId: string, patch: Partial<InventoryRow>) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
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
    rows.some((row) => row.name.trim()) &&
    rows
      .filter((row) => row.name.trim())
      .reduce((totalUnits, row) => totalUnits + Math.max(0, Math.floor(row.count)), 0) >= 2;

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
