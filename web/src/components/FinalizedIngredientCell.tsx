import { Button, Flex, Text } from "@radix-ui/themes";

type Props = {
  name: string;
  ingredientIconUrl?: string | null;
  onChangeClick: () => void;
};

export function FinalizedIngredientCell({ name, ingredientIconUrl, onChangeClick }: Props) {
  return (
    <Flex align="center" gap="2" wrap="wrap">
      {ingredientIconUrl ? (
        <img
          src={ingredientIconUrl}
          alt=""
          width={22}
          height={22}
          style={{ objectFit: "contain", flexShrink: 0 }}
        />
      ) : null}
      <Text size="2" weight="medium" style={{ lineHeight: 1.4 }}>
        {name}
      </Text>
      <Button type="button" variant="ghost" size="1" color="gray" onClick={onChangeClick}>
        Change
      </Button>
    </Flex>
  );
}
