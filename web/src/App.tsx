import { Container, Flex } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import { AlchemySettingsPanel } from "./components/AlchemySettingsPanel.tsx";
import { AppHeader } from "./components/AppHeader.tsx";
import { InventoryPanel } from "./components/InventoryPanel.tsx";
import { RecipeResultsPanel } from "./components/RecipeResultsPanel.tsx";
import { fetchIngredientsForAutocomplete } from "./ingredient-api.ts";
import { requestPotionsRank } from "./potions-api.ts";
import type { AlchemyFormParams, InventoryRow, Recipe } from "./types.ts";
import { defaultAlchemyFormParams } from "./types.ts";
import { uid } from "./uid.ts";

export type { AlchemyFormParams } from "./types.ts";

export function App() {
  const [rows, setRows] = useState<InventoryRow[]>([
    {
      id: uid(),
      name: "",
      count: 1,
      suggestions: [],
      open: false,
      loading: false,
    },
  ]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<AlchemyFormParams>({
    ...defaultAlchemyFormParams,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = (rowId: string, q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, loading: true } : r)));
      void fetchIngredientsForAutocomplete(q).then((hits) => {
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId ? { ...r, suggestions: hits, loading: false, open: true } : r,
          ),
        );
      });
    }, 220);
  };

  const addRow = () => {
    setRows((r) => [
      ...r,
      {
        id: uid(),
        name: "",
        count: 1,
        suggestions: [],
        open: false,
        loading: false,
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
    setError(null);
    setLoading(true);
    setRecipes([]);
    const inventory = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), count: r.count }));
    void requestPotionsRank(inventory, params).then((outcome) => {
      if (outcome.type === "success") {
        setRecipes(outcome.recipes);
        setTruncated(outcome.truncated);
      } else {
        setError(outcome.error);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
          onSearch={runSearch}
          onAddRow={addRow}
          onSubmit={submit}
        />
        <AlchemySettingsPanel params={params} setParams={setParams} />
        <RecipeResultsPanel recipes={recipes} truncated={truncated} loading={loading} />
      </Flex>
    </Container>
  );
}
