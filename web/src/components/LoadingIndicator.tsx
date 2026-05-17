import { Flex, Text } from "@radix-ui/themes";
import { useLottie } from "lottie-react";
import cauldronAnimation from "../assets/lottie/cauldron.json";

function CauldronLottie() {
  const { View } = useLottie(
    {
      animationData: cauldronAnimation,
      loop: true,
      "aria-label": "Updating recipe list",
    },
    { width: 80, height: 80 },
  );
  return View;
}

export function LoadingIndicator() {
  return (
    <Flex align="center" justify="center" width="100%" mb="3" aria-live="polite" aria-busy="true">
      <Text as="div" color="gray" size="2" className="loading-indicator">
        <CauldronLottie />
      </Text>
    </Flex>
  );
}
