import { Badge, Card, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import type { Recipe } from "../types.ts";

type Props = {
  /** Authoritative list for empty-state and loading-related copy. */
  recipes: Recipe[];
  /** List rendered in the scroll area (may lag via `useDeferredValue`). */
  displayedRecipes: Recipe[];
  listUpdating: boolean;
  truncated: boolean;
  loading: boolean;
};

function recipeKey(rec: Recipe): string {
  const ids = rec.ingredients.map((ing) => ing.id).join("-");
  return `${rec.mixtureKind}-${rec.dominantEffectKey}-${ids}-${rec.totalGold}`;
}

export function RecipeResultsPanel({
  recipes,
  displayedRecipes,
  listUpdating,
  truncated,
  loading,
}: Props) {
  return (
    <Card size="3" variant="surface" className="alchemy-panel-glow">
      <Heading as="h2" size="5" weight="bold" mb="1" className="alchemy-display">
        Concoctions worth coin
      </Heading>
      <Text size="2" color="gray" mb="3" as="p">
        Highest gold first — chase the shiny septims, not the fumes.
      </Text>
      {truncated ? (
        <Text as="p" size="2" color="amber" mb="3" highContrast>
          Showing the first batch of combinations only — narrow your list for a full search.
        </Text>
      ) : null}
      {listUpdating ? (
        <Text as="p" size="2" color="gray" mb="3">
          Updating list…
        </Text>
      ) : null}
      {recipes.length === 0 && !loading ? (
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
          <Card key={recipeKey(rec)} size="2" variant="classic">
            <Flex align="center" justify="between" gap="3" wrap="wrap" mb="2">
              <Text size="4" weight="bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                {rec.totalGold.toLocaleString()} gold
              </Text>
              <Badge
                size="1"
                color={rec.mixtureKind === "potion" ? "amber" : "ruby"}
                variant="soft"
                highContrast
              >
                {rec.mixtureKind}
              </Badge>
            </Flex>
            <Flex align="center" gap="2" wrap="wrap" mb="2">
              {rec.ingredients.map((ing, idx) => (
                <Flex key={ing.id} align="center" gap="2">
                  {idx > 0 ? (
                    <Text size="2" color="gray" style={{ userSelect: "none" }}>
                      +
                    </Text>
                  ) : null}
                  {ing.iconUrl ? (
                    <img
                      src={ing.iconUrl}
                      alt=""
                      width={22}
                      height={22}
                      style={{ objectFit: "contain", flexShrink: 0 }}
                    />
                  ) : null}
                  <Text size="2" color="gray">
                    {ing.name}
                  </Text>
                </Flex>
              ))}
            </Flex>
            <Separator size="4" my="2" />
            <Flex direction="column" gap="1" asChild>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {rec.effects.map((effect) => (
                  <li key={effect.effectKey}>
                    <Flex justify="between" align="center" gap="3">
                      <Text size="2" color="gray">
                        {effect.displayName}
                      </Text>
                      <Text
                        size="2"
                        weight="medium"
                        color="amber"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {effect.gold.toLocaleString()}
                      </Text>
                    </Flex>
                  </li>
                ))}
              </ul>
            </Flex>
          </Card>
        ))}
      </Flex>
    </Card>
  );
}
