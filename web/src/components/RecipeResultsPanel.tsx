import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { AnimatePresence, motion } from "framer-motion";
import { canBrewRecipe } from "../libs/brew-recipe.ts";
import { recipeKey } from "../libs/recipe-key.ts";
import type {
  InventoryRow,
  Recipe,
  RecipeEffectFilterToken,
  RecipeSharedBlend,
} from "../libs/types.ts";
import { RECIPE_SHARED_BLEND_ORDER } from "../libs/types.ts";
import { LoadingIndicator } from "./LoadingIndicator.tsx";
import { RecipeCard } from "./RecipeCard.tsx";
import { RecipeEffectFilterField } from "./RecipeEffectFilterField.tsx";

const BLEND_TOGGLE_LABELS: Record<RecipeSharedBlend, string> = {
  beneficial: "Potions",
  harmful: "Poisons",
  mixed: "Potion/poisons",
};

type Props = {
  inventoryRows: InventoryRow[];
  onBrewRecipe: (recipe: Recipe) => void;
  /** When set, the matching recipe card plays a short brew highlight. */
  brewFlashRecipeKey: string | null;
  /** Authoritative list for empty-state and loading-related copy. */
  recipes: Recipe[];
  /** List rendered in the scroll area (may lag via `useDeferredValue`). */
  displayedRecipes: Recipe[];
  /** Count before `blendFilter` (for “narrow filter” copy). */
  rankedRecipeCountBeforeBlend: number;
  /** Recipes remaining after effect filters, before blend filter (for empty-state copy). */
  recipeCountAfterEffects: number;
  effectFilters: readonly RecipeEffectFilterToken[];
  onAddEffectFilter: (token: RecipeEffectFilterToken) => void;
  onRemoveEffectFilter: (effectKey: string) => void;
  /** Empty = All. Otherwise recipes whose `sharedBlend` is in this list (OR). */
  blendSelection: readonly RecipeSharedBlend[];
  onToggleBlendFilter: (blend: RecipeSharedBlend) => void;
  onSelectAllBlendFilters: () => void;
  isListUpdating: boolean;
  isTruncated: boolean;
  isLoading: boolean;
};

export function RecipeResultsPanel({
  inventoryRows,
  onBrewRecipe,
  brewFlashRecipeKey,
  recipes,
  displayedRecipes,
  rankedRecipeCountBeforeBlend,
  recipeCountAfterEffects,
  effectFilters,
  onAddEffectFilter,
  onRemoveEffectFilter,
  blendSelection,
  onToggleBlendFilter,
  onSelectAllBlendFilters,
  isListUpdating,
  isTruncated,
  isLoading,
}: Props) {
  const excludedEffectKeys = new Set(effectFilters.map((f) => f.effectKey));
  const brewableDisplayedRecipes = displayedRecipes.filter((rec) =>
    canBrewRecipe(inventoryRows, rec),
  );
  const brewableRankedCount = recipes.filter((rec) => canBrewRecipe(inventoryRows, rec)).length;
  const showDepletedRanked = recipes.length > 0 && brewableRankedCount === 0 && !isLoading;
  const showEffectFilterEmpty =
    rankedRecipeCountBeforeBlend > 0 &&
    effectFilters.length > 0 &&
    recipeCountAfterEffects === 0 &&
    !isLoading;
  const showBlendFilterEmpty =
    rankedRecipeCountBeforeBlend > 0 &&
    recipes.length === 0 &&
    blendSelection.length > 0 &&
    recipeCountAfterEffects > 0 &&
    !isLoading;
  const isBlendFilterAll = blendSelection.length === 0;

  return (
    <Card size="3" variant="surface" className="alchemy-panel-glow">
      <Heading as="h2" size="5" weight="bold" mb="1" className="alchemy-display">
        Concoctions worth coin
      </Heading>
      <Text size="2" color="gray" mb="3" as="p">
        Highest gold first — chase the shiny septims, not the fumes.
      </Text>
      {rankedRecipeCountBeforeBlend > 0 ? (
        <Flex mb="3" direction="column" gap="2">
          <Text id="recipe-effect-filter-label" size="2" weight="medium" color="gray" as="p">
            Effects on the brew
          </Text>
          {effectFilters.length > 0 ? (
            <Flex
              gap="2"
              wrap="wrap"
              role="list"
              aria-label="Active effect filters"
              aria-describedby="recipe-effect-filter-label"
            >
              {effectFilters.map((token) => (
                <Flex
                  key={token.effectKey}
                  role="listitem"
                  align="center"
                  gap="1"
                  pl="2"
                  pr="1"
                  py="1"
                  style={{
                    borderRadius: "9999px",
                    background: "var(--gray-a3)",
                    border: "1px solid var(--gray-a6)",
                    maxWidth: "100%",
                  }}
                >
                  <Text size="1" weight="medium" style={{ minWidth: 0, marginLeft: "0.2rem" }}>
                    {token.displayName}
                  </Text>
                  <Button
                    type="button"
                    size="1"
                    variant="ghost"
                    color="gray"
                    highContrast
                    aria-label={`Remove ${token.displayName}`}
                    onClick={() => {
                      onRemoveEffectFilter(token.effectKey);
                    }}
                    style={{
                      flexShrink: 0,
                      cursor: "pointer",
                      width: "1.25rem",
                      height: "1.25rem",
                      minWidth: "1.25rem",
                      padding: 0,
                      marginInline: "0.075rem",
                      borderRadius: "50%",
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ×
                  </Button>
                </Flex>
              ))}
            </Flex>
          ) : null}
          <RecipeEffectFilterField
            ariaLabelledBy="recipe-effect-filter-label"
            excludedEffectKeys={excludedEffectKeys}
            onAddFilter={onAddEffectFilter}
          />
        </Flex>
      ) : null}
      {rankedRecipeCountBeforeBlend > 0 ? (
        <Flex mb="3" direction="column" gap="2">
          <Text id="recipe-blend-filter-label" size="2" weight="medium" color="gray" as="p">
            <Text as="span">Show</Text>
            <Text as="span" color="gray" aria-hidden style={{ userSelect: "none" }}>
              {" "}
              &bull;{" "}
            </Text>
            <Text as="span" style={{ fontVariantNumeric: "tabular-nums" }}>
              {recipes.length}
            </Text>
            <Text as="span"> recipes</Text>
          </Text>
          <Flex gap="2" wrap="wrap" role="group" aria-labelledby="recipe-blend-filter-label">
            <Button
              type="button"
              size="1"
              variant={isBlendFilterAll ? "solid" : "soft"}
              aria-pressed={isBlendFilterAll}
              onClick={() => {
                onSelectAllBlendFilters();
              }}
            >
              All
            </Button>
            {RECIPE_SHARED_BLEND_ORDER.map((blend) => (
              <Button
                key={blend}
                type="button"
                size="1"
                variant={blendSelection.includes(blend) ? "solid" : "soft"}
                aria-pressed={blendSelection.includes(blend)}
                onClick={() => {
                  onToggleBlendFilter(blend);
                }}
              >
                {BLEND_TOGGLE_LABELS[blend]}
              </Button>
            ))}
          </Flex>
        </Flex>
      ) : null}
      {isTruncated ? (
        <Text as="p" size="2" color="amber" mb="3" highContrast>
          Showing the first batch of combinations only — narrow your list for a full search.
        </Text>
      ) : null}
      <AnimatePresence>
        {isListUpdating ? (
          <motion.div
            key="loading-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <LoadingIndicator />
          </motion.div>
        ) : null}
      </AnimatePresence>
      {rankedRecipeCountBeforeBlend === 0 && !isLoading ? (
        <Text as="p" size="2" color="gray" mb="3">
          The cauldron is quiet — add ingredients and hit{" "}
          <Text as="span" weight="bold">
            Brew best value
          </Text>
          .
        </Text>
      ) : null}
      {showDepletedRanked ? (
        <Text as="p" size="2" color="gray" mb="3">
          Nothing left here matches your jars — hit{" "}
          <Text as="span" weight="bold">
            Brew best value
          </Text>{" "}
          to re-rank with what you still hold.
        </Text>
      ) : null}
      {showEffectFilterEmpty ? (
        <Text as="p" size="2" color="gray" mb="3">
          No brews here carry every tagged effect — peel off a tag or try another name.
        </Text>
      ) : null}
      {showBlendFilterEmpty ? (
        <Text as="p" size="2" color="gray" mb="3">
          No recipes in this view — pick{" "}
          <Text as="span" weight="bold">
            All
          </Text>{" "}
          or another filter.
        </Text>
      ) : null}
      <Flex direction="column" gap="3">
        <AnimatePresence mode="popLayout" initial={false}>
          {brewableDisplayedRecipes.map((rec) => (
            <motion.div
              key={recipeKey(rec)}
              layout
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeIn" }}
            >
              <RecipeCard
                recipe={rec}
                canBrew
                brewFlash={brewFlashRecipeKey !== null && brewFlashRecipeKey === recipeKey(rec)}
                onBrew={() => onBrewRecipe(rec)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </Flex>
    </Card>
  );
}
