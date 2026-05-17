import { Flex, Heading, Separator, Text } from "@radix-ui/themes";

export function AppHeader() {
  return (
    <header>
      <Flex align="center" gap="2" mb="2" wrap="wrap">
        <Text size="2" weight="medium" style={{ opacity: 0.85 }} highContrast>
          ⚗
        </Text>
        <Text size="1" color="gray" style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Arcane economics · lab notes
        </Text>
      </Flex>
      <Heading
        as="h1"
        size="8"
        weight="bold"
        mb="2"
        className="alchemy-display"
        color="violet"
        highContrast
      >
        Skyrim Alchemy Calculator
      </Heading>
      <Text size="3" color="gray" style={{ maxWidth: "42rem" }}>
        Toss your satchel into the cauldron: Anniversary Edition data from UESP, ranked by
        estimated gold (a decent stand‑in for alchemy XP when you are hoarding reagents).
      </Text>
      <Separator size="4" mt="5" style={{ background: "var(--amber-a6)" }} />
    </header>
  );
}
