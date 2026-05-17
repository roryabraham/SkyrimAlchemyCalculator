import { Badge, Card, Flex, Separator, Text } from "@radix-ui/themes";
import type { Recipe } from "../types.ts";

type Props = {
  recipe: Recipe;
};

export function RecipeCard({ recipe: rec }: Props) {
  return (
    <Card size="2" variant="classic">
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
  );
}
