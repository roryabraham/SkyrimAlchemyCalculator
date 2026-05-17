import { Heading, Text } from "@radix-ui/themes";

export function AppHeader() {
  return (
    <header>
      <Heading size="8" weight="bold" highContrast mb="2">
        Skyrim Alchemy Calculator
      </Heading>
      <Text size="3" color="gray">
        Anniversary Edition data from UESP. Recipes sorted by estimated gold value (alchemy XP
        proxy).
      </Text>
    </header>
  );
}
