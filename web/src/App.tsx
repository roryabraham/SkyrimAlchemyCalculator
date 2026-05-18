import { Container, Flex } from "@radix-ui/themes";
import { useMutation } from "@tanstack/react-query";
import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { readPersistedState, writePersistedState } from "./libs/app-persistence.ts";
import { AlchemySettingsPanel } from "./components/AlchemySettingsPanel.tsx";
import { AppHeader } from "./components/AppHeader.tsx";
import { DataAttribution } from "./components/DataAttribution.tsx";
import { InventoryPanel } from "./components/InventoryPanel.tsx";
import { RecipeResultsPanel } from "./components/RecipeResultsPanel.tsx";
import { applyRecipeBrew, getBrewAffectedRowIds } from "./libs/brew-recipe.ts";
import { recipeKey } from "./libs/recipe-key.ts";
import { requestPotionsRank } from "./libs/potions-api.ts";
import type {
  AlchemyFormParams,
  InventoryRow,
  InventoryRowPatch,
  Recipe,
  RecipeEffectFilterToken,
  RecipeSharedBlend,
} from "./libs/types.ts";
import { defaultAlchemyFormParams, RECIPE_SHARED_BLEND_ORDER } from "./libs/types.ts";
import { uid } from "./libs/uid.ts";

export type { AlchemyFormParams } from "./libs/types.ts";

type BrewFlashState = {
  recipeKey: string;
  rowIds: readonly string[];
};

const NO_BREW_FLASH_ROWS: readonly string[] = [];

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

  const [brewFlash, setBrewFlash] = useState<BrewFlashState | null>(null);
  const brewFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Empty = show all blends; otherwise OR of selected `Recipe.sharedBlend` values. */
  const [recipeBlendSelection, setRecipeBlendSelection] = useState<RecipeSharedBlend[]>([]);
  /** Recipes must include every listed effect (`effectKey`). */
  const [recipeEffectFilters, setRecipeEffectFilters] = useState<RecipeEffectFilterToken[]>([]);

  const persistSnapshotRef = useRef({ rows, params });
  const rowsRef = useRef(rows);

  useLayoutEffect(() => {
    persistSnapshotRef.current = { rows, params };
    rowsRef.current = rows;
  }, [rows, params]);

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

  useEffect(() => {
    return () => {
      if (brewFlashTimerRef.current != null) {
        clearTimeout(brewFlashTimerRef.current);
        brewFlashTimerRef.current = null;
      }
    };
  }, []);

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
    setRows((prevRows) => {
      if (prevRows.length <= 1) {
        return [{ id: uid(), name: "", quantity: 1 }];
      }
      return prevRows.filter((row) => row.id !== rowId);
    });
  };

  const updateRow = (rowId: string, patch: InventoryRowPatch) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const submit = () => {
    potionsMutation.mutate();
  };

  const brewRecipe = (recipe: Recipe) => {
    if (brewFlashTimerRef.current != null) {
      clearTimeout(brewFlashTimerRef.current);
      brewFlashTimerRef.current = null;
    }
    const touched = getBrewAffectedRowIds(rowsRef.current, recipe);
    if (touched == null) {
      return;
    }
    setBrewFlash({ recipeKey: recipeKey(recipe), rowIds: touched });
    setRows((prev) => applyRecipeBrew(prev, recipe) ?? prev);
    brewFlashTimerRef.current = setTimeout(() => {
      setBrewFlash(null);
      brewFlashTimerRef.current = null;
    }, 520);
  };

  const isLoading = potionsMutation.isPending;
  const outcome = potionsMutation.data;
  const rankedRecipes = isLoading ? [] : outcome?.type === "success" ? outcome.recipes : [];
  const deferredRankedRecipes = useDeferredValue(rankedRecipes);
  const matchesRecipeBlend = (recipe: Recipe) =>
    recipeBlendSelection.length === 0 || recipeBlendSelection.includes(recipe.sharedBlend);

  const matchesEffectFilters = (recipe: Recipe) =>
    recipeEffectFilters.every((token) =>
      recipe.effects.some((effect) => effect.effectKey === token.effectKey),
    );

  const recipesAfterEffects = rankedRecipes.filter(matchesEffectFilters);
  const deferredRecipesAfterEffects = useDeferredValue(recipesAfterEffects);

  const toggleRecipeBlend = (blend: RecipeSharedBlend) => {
    setRecipeBlendSelection((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(blend)) {
        nextSet.delete(blend);
      } else {
        nextSet.add(blend);
      }
      if (nextSet.size === RECIPE_SHARED_BLEND_ORDER.length) {
        return [];
      }
      return RECIPE_SHARED_BLEND_ORDER.filter((b) => nextSet.has(b));
    });
  };

  const clearRecipeBlendSelection = () => {
    setRecipeBlendSelection([]);
  };

  const addRecipeEffectFilter = (token: RecipeEffectFilterToken) => {
    setRecipeEffectFilters((prev) => {
      if (prev.some((t) => t.effectKey === token.effectKey)) {
        return prev;
      }
      return [...prev, token];
    });
  };

  const removeRecipeEffectFilter = (effectKey: string) => {
    setRecipeEffectFilters((prev) => prev.filter((t) => t.effectKey !== effectKey));
  };

  const recipesForList = recipesAfterEffects.filter(matchesRecipeBlend);
  const displayedRecipesForList = deferredRecipesAfterEffects.filter(matchesRecipeBlend);
  const isListUpdating =
    !isLoading &&
    rankedRecipes.length > 0 &&
    (rankedRecipes !== deferredRankedRecipes ||
      recipesAfterEffects !== deferredRecipesAfterEffects);
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
          brewFlashRowIds={brewFlash?.rowIds ?? NO_BREW_FLASH_ROWS}
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
          brewFlashRecipeKey={brewFlash?.recipeKey ?? null}
          recipes={recipesForList}
          displayedRecipes={displayedRecipesForList}
          rankedRecipeCountBeforeBlend={rankedRecipes.length}
          recipeCountAfterEffects={recipesAfterEffects.length}
          effectFilters={recipeEffectFilters}
          onAddEffectFilter={addRecipeEffectFilter}
          onRemoveEffectFilter={removeRecipeEffectFilter}
          blendSelection={recipeBlendSelection}
          onToggleBlendFilter={toggleRecipeBlend}
          onSelectAllBlendFilters={clearRecipeBlendSelection}
          isListUpdating={isListUpdating}
          isTruncated={isTruncated}
          isLoading={isLoading}
        />
        <DataAttribution />
      </Flex>
    </Container>
  );
}
