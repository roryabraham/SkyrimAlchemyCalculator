import { Box, Flex, Heading, Separator, Text } from "@radix-ui/themes";

export function AppHeader() {
  return (
    <header>
      <Text
        as="p"
        size="1"
        color="gray"
        mb="2"
        style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
      >
        Arcane economics · lab notes
      </Text>
      <Flex align="center" gap={{ initial: "4", sm: "5" }} mb="2" wrap="wrap">
        <Flex direction="column" gap="2" style={{ flex: "1 1 16rem", minWidth: 0, maxWidth: "42rem" }}>
          <Heading
            as="h1"
            size="8"
            weight="bold"
            mb="0"
            className="alchemy-display"
            color="violet"
            highContrast
          >
            Skyrim Alchemy Calculator
          </Heading>
          <Text size="3" color="gray">
            Toss your satchel into the cauldron: Anniversary Edition data from UESP, ranked by
            estimated gold (a decent stand‑in for alchemy XP when you are hoarding reagents).
          </Text>
        </Flex>
        <Box
          style={{
            flexShrink: 0,
            width: "clamp(6.25rem, 20vw, 8.75rem)",
            height: "clamp(6.25rem, 20vw, 8.75rem)",
            borderRadius: "50%",
            backgroundColor: "color-mix(in oklab, var(--violet-12) 50%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
          }}
        >
          <img
            src="/favicon.webp"
            alt=""
            decoding="async"
            aria-hidden
            style={{
              width: "92%",
              height: "92%",
              objectFit: "contain",
            }}
          />
        </Box>
      </Flex>
      <Separator size="4" mt="5" style={{ background: "var(--amber-a6)" }} />
    </header>
  );
}
