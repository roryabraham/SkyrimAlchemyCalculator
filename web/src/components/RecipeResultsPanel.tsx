import { Card, Flex, Heading, Text } from "@radix-ui/themes";
import { canBrewRecipe } from "../brew-recipe.ts";
import type { InventoryRow, Recipe } from "../types.ts";
import { RecipeCard } from "./RecipeCard.tsx";

type Props = {
  inventoryRows: InventoryRow[];
  onBrewRecipe: (recipe: Recipe) => void;
  /** Authoritative list for empty-state and loading-related copy. */
  recipes: Recipe[];
  /** List rendered in the scroll area (may lag via `useDeferredValue`). */
  displayedRecipes: Recipe[];
  isListUpdating: boolean;
  isTruncated: boolean;
  isLoading: boolean;
};

function recipeKey(rec: Recipe): string {
  const ids = rec.ingredients.map((ing) => ing.id).join("-");
  return `${rec.mixtureKind}-${rec.dominantEffectKey}-${ids}-${rec.totalGold}`;
}

export function RecipeResultsPanel({
  inventoryRows,
  onBrewRecipe,
  recipes,
  displayedRecipes,
  isListUpdating,
  isTruncated,
  isLoading,
}: Props) {
  const brewableDisplayedRecipes = displayedRecipes.filter((rec) =>
    canBrewRecipe(inventoryRows, rec),
  );
  const brewableRankedCount = recipes.filter((rec) => canBrewRecipe(inventoryRows, rec)).length;
  const showDepletedRanked =
    recipes.length > 0 && brewableRankedCount === 0 && !isLoading;

  return (
    <Card size="3" variant="surface" className="alchemy-panel-glow">
      <Heading as="h2" size="5" weight="bold" mb="1" className="alchemy-display">
        Concoctions worth coin
      </Heading>
      <Text size="2" color="gray" mb="3" as="p">
        Highest gold first — chase the shiny septims, not the fumes.
      </Text>
      {isTruncated ? (
        <Text as="p" size="2" color="amber" mb="3" highContrast>
          Showing the first batch of combinations only — narrow your list for a full search.
        </Text>
      ) : null}
      {isListUpdating ? (
        <Text as="p" size="2" color="gray" mb="3">
          Updating list…
        </Text>
      ) : null}
      {recipes.length === 0 && !isLoading ? (
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
      <Flex direction="column" gap="3">
        {brewableDisplayedRecipes.map((rec) => (
          <RecipeCard
            key={recipeKey(rec)}
            recipe={rec}
            canBrew
            onBrew={() => onBrewRecipe(rec)}
          />
        ))}
      </Flex>
    </Card>
  );
}
