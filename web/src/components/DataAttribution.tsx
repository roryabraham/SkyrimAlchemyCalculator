import { Flex, Link, Text } from "@radix-ui/themes";

const UESP = "https://en.uesp.net/wiki/Skyrim:Ingredients";
const UESP_EFFECTS = "https://en.uesp.net/wiki/Skyrim:Alchemy_Effects";
const UESP_HOME = "https://en.uesp.net/wiki/Main_Page";
const UESP_COPYRIGHT = "https://en.uesp.net/wiki/UESPWiki:Copyright_and_Ownership";
const CC_BY_SA = "https://creativecommons.org/licenses/by-sa/2.5/";

export function DataAttribution() {
  return (
    <footer>
      <Flex direction="column" gap="1" pt="2">
        <Text size="1" color="gray" as="p" style={{ lineHeight: 1.5 }}>
          Ingredient and alchemy-effect data are derived from{" "}
          <Link href={UESP_HOME} rel="noopener noreferrer" target="_blank" size="1">
            The Unofficial Elder Scrolls Pages
          </Link>{" "}
          (UESP):{" "}
          <Link href={UESP} rel="noopener noreferrer" target="_blank" size="1">
            Skyrim:Ingredients
          </Link>
          ,{" "}
          <Link href={UESP_EFFECTS} rel="noopener noreferrer" target="_blank" size="1">
            Skyrim:Alchemy_Effects
          </Link>
          . UESP text is licensed under{" "}
          <Link href={CC_BY_SA} rel="noopener noreferrer" target="_blank" size="1">
            CC BY-SA 2.5
          </Link>
          ; see{" "}
          <Link href={UESP_COPYRIGHT} rel="noopener noreferrer" target="_blank" size="1">
            UESP copyright and ownership
          </Link>
          . <em>The Elder Scrolls</em> and related marks are trademarks of ZeniMax Media Inc.
        </Text>
      </Flex>
    </footer>
  );
}
