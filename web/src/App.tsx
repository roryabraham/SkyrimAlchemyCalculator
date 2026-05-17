import { Container, Flex } from "@radix-ui/themes";
import { useMutation } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { readPersistedState, writePersistedState } from "./app-persistence.ts";
import { AlchemySettingsPanel } from "./components/AlchemySettingsPanel.tsx";
import { AppHeader } from "./components/AppHeader.tsx";
import { DataAttribution } from "./components/DataAttribution.tsx";
import { InventoryPanel } from "./components/InventoryPanel.tsx";
import { RecipeResultsPanel } from "./components/RecipeResultsPanel.tsx";
import { applyRecipeBrew } from "./brew-recipe.ts";
import { requestPotionsRank } from "./potions-api.ts";
import type { AlchemyFormParams, InventoryRow, InventoryRowPatch, Recipe } from "./types.ts";
import { defaultAlchemyFormParams } from "./types.ts";
import { uid } from "./uid.ts";

export type { AlchemyFormParams } from "./types.ts";

export function App() {
  const [rows, setRows] = useState<InventoryRow[]>(() => {
    const persisted = readPersistedState();
    return persisted?.rows ?? [{ id: uid(), name: "", quantity: 1 }];
  });
  const [params, setParams] = useState<AlchemyFormParams>(() => {
    const persisted = readPersistedState();
    return persisted?.params ?? { ...defaultAlchemyFormParams };
  });
  const [, startSettingsTransition] = useTransition();

  const persistSnapshotRef = useRef({ rows, params });
  persistSnapshotRef.current = { rows, params };

  useEffect(() => {
    const debounceMs = 350;
    let timerId = window.setTimeout(() => {
      writePersistedState(persistSnapshotRef.current);
    }, debounceMs);

    const flush = () => {
      window.clearTimeout(timerId);
      writePersistedState(persistSnapshotRef.current);
    };

    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [rows, params]);

  const potionsMutation = useMutation({
    mutationFn: () => {
      const inventory = rows
        .filter((row) => row.name.trim())
        .map((row) => ({ name: row.name.trim(), quantity: row.quantity }));
      return requestPotionsRank(inventory, params);
    },
  });

  const addRow = () => {
    const newId = uid();
    setRows((prevRows) => [...prevRows, { id: newId, name: "", quantity: 1 }]);
    requestAnimationFrame(() => {
      document.getElementById(`ingredient-name-${newId}`)?.focus();
    });
  };

  const removeRow = (rowId: string) => {
    setRows((prevRows) =>
      prevRows.length <= 1 ? prevRows : prevRows.filter((row) => row.id !== rowId),
    );
  };

  const updateRow = (rowId: string, patch: InventoryRowPatch) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const submit = () => {
    potionsMutation.mutate();
  };

  const brewRecipe = (recipe: Recipe) => {
    setRows((prev) => applyRecipeBrew(prev, recipe) ?? prev);
  };

  const isLoading = potionsMutation.isPending;
  const outcome = potionsMutation.data;
  const recipes = isLoading ? [] : outcome?.type === "success" ? outcome.recipes : [];
  const deferredRecipes = useDeferredValue(recipes);
  const isListUpdating = !isLoading && recipes.length > 0 && recipes !== deferredRecipes;
  const isTruncated =
    !isLoading && outcome?.type === "success" ? Boolean(outcome.isTruncated) : false;
  const error = outcome?.type === "error" ? outcome.error : null;

  const isSubmitEnabled =
    rows.some((row) => row.name.trim()) &&
    rows
      .filter((row) => row.name.trim())
      .reduce((totalUnits, row) => totalUnits + Math.max(0, Math.floor(row.quantity)), 0) >= 2;

  return (
    <Container size="2" px={{ initial: "4", sm: "5" }} py="6">
      <Flex direction="column" gap="6">
        <AppHeader />
        <InventoryPanel
          rows={rows}
          isSubmitEnabled={isSubmitEnabled}
          isLoading={isLoading}
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
          inventoryRows={rows}
          onBrewRecipe={brewRecipe}
          recipes={recipes}
          displayedRecipes={deferredRecipes}
          isListUpdating={isListUpdating}
          isTruncated={isTruncated}
          isLoading={isLoading}
        />
        <DataAttribution />
      </Flex>
    </Container>
  );
}
