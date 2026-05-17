import { Card, Flex, Heading, Text } from "@radix-ui/themes";
import type { Recipe } from "../types.ts";
import { RecipeCard } from "./RecipeCard.tsx";

type Props = {
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
  recipes,
  displayedRecipes,
  isListUpdating,
  isTruncated,
  isLoading,
}: Props) {
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
      <Flex direction="column" gap="3">
        {displayedRecipes.map((rec) => (
          <RecipeCard key={recipeKey(rec)} recipe={rec} />
        ))}
      </Flex>
    </Card>
  );
}
