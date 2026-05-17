import {
  Badge,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";
import type { Recipe } from "../types.ts";

type Props = {
  recipes: Recipe[];
  truncated: boolean;
  loading: boolean;
};

export function RecipeResultsPanel({ recipes, truncated, loading }: Props) {
  return (
    <Card size="3" variant="surface">
      <Heading as="h2" size="5" weight="bold" mb="3">
        Best brews
      </Heading>
      {truncated ? (
        <Text as="p" size="2" color="amber" mb="3" highContrast>
          Showing the first batch of combinations only — narrow your list for a
          full search.
        </Text>
      ) : null}
      {recipes.length === 0 && !loading ? (
        <Text as="p" size="2" color="gray" mb="3">
          Results appear here after you search.
        </Text>
      ) : null}
      <Flex direction="column" gap="3">
        {recipes.map((rec, i) => (
          <Card key={i} size="2" variant="classic">
            <Flex align="center" justify="between" gap="3" wrap="wrap" mb="2">
              <Text size="4" weight="bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                {rec.totalGold.toLocaleString()} gold
              </Text>
              <Badge
                size="1"
                color={rec.mixtureKind === "potion" ? "jade" : "ruby"}
                variant="soft"
                highContrast
              >
                {rec.mixtureKind}
              </Badge>
            </Flex>
            <Text size="2" color="gray" mb="2">
              {rec.ingredients.map((ing) => ing.name).join(" + ")}
            </Text>
            <Separator size="4" my="2" />
            <Flex direction="column" gap="1" asChild>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {rec.effects.map((e) => (
                  <li key={e.effectKey}>
                    <Flex justify="between" align="center" gap="3">
                      <Text size="2" color="gray">
                        {e.displayName}
                      </Text>
                      <Text
                        size="2"
                        weight="medium"
                        color="jade"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {e.gold.toLocaleString()}
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
