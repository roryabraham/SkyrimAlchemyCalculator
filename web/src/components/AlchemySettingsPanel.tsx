import { Button, Card, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import type { Dispatch, SetStateAction } from "react";
import { useId } from "react";
import type { AlchemyFormParams } from "../types.ts";
import { defaultAlchemyFormParams } from "../types.ts";
import { AlchemyNumericField } from "./AlchemyNumericField.tsx";
import { AlchemyPerkCheckbox } from "./AlchemyPerkCheckbox.tsx";

type Props = {
  params: AlchemyFormParams;
  setParams: Dispatch<SetStateAction<AlchemyFormParams>>;
  startSettingsTransition: (fn: () => void) => void;
};

function setNumParam(
  setParams: Props["setParams"],
  startSettingsTransition: Props["startSettingsTransition"],
  key: "alchemySkill" | "fortifyAlchemy" | "alchemistPercent" | "seekerOfShadowsPercent",
  value: string,
  fallback: number,
  opts?: { min?: number; max?: number },
) {
  let parsedInt = Math.floor(Number(value));
  if (!Number.isFinite(parsedInt)) {
    parsedInt = fallback;
  }
  if (opts?.min !== undefined) {
    parsedInt = Math.max(opts.min, parsedInt);
  }
  if (opts?.max !== undefined) {
    parsedInt = Math.min(opts.max, parsedInt);
  }
  startSettingsTransition(() => {
    setParams((prevParams) => ({ ...prevParams, [key]: parsedInt }));
  });
}

const NUMERIC_FIELDS = [
  {
    idSuffix: "skill",
    label: "Alchemy skill",
    key: "alchemySkill" as const,
    min: 0,
    max: 100,
    fallback: defaultAlchemyFormParams.alchemySkill,
  },
  {
    idSuffix: "fortify",
    label: "Fortify Alchemy (%)",
    key: "fortifyAlchemy" as const,
    min: 0,
    max: 500,
    fallback: defaultAlchemyFormParams.fortifyAlchemy,
  },
  {
    idSuffix: "alchemist",
    label: "Alchemist perk (%)",
    key: "alchemistPercent" as const,
    min: 0,
    max: 100,
    fallback: defaultAlchemyFormParams.alchemistPercent,
  },
  {
    idSuffix: "seeker",
    label: "Seeker of Shadows (%)",
    key: "seekerOfShadowsPercent" as const,
    min: 0,
    max: 20,
    fallback: defaultAlchemyFormParams.seekerOfShadowsPercent,
  },
] as const;

const PERK_FIELDS = [
  { idSuffix: "physician", label: "Physician", key: "hasPhysician" as const },
  { idSuffix: "benefactor", label: "Benefactor", key: "hasBenefactor" as const },
  { idSuffix: "poisoner", label: "Poisoner", key: "hasPoisoner" as const },
] as const;

export function AlchemySettingsPanel({ params, setParams, startSettingsTransition }: Props) {
  const id = useId();

  return (
    <Card size="3" variant="surface" className="alchemy-panel-glow">
      <Heading as="h2" size="5" weight="bold" mb="2" className="alchemy-display">
        Arcane modifiers
      </Heading>
      <Text as="p" size="2" color="gray" mb="4">
        Skill, gear, and perks tune the UESP PowerFactor so your gold estimates match the build you
        are actually running.
      </Text>
      <Grid columns={{ initial: "1", sm: "2" }} gap="3" mb="4">
        {NUMERIC_FIELDS.map((field) => (
          <AlchemyNumericField
            key={field.key}
            id={`${id}-${field.idSuffix}`}
            label={field.label}
            min={field.min}
            max={field.max}
            value={params[field.key]}
            onValueChange={(raw) =>
              setNumParam(
                setParams,
                startSettingsTransition,
                field.key,
                raw,
                field.fallback,
                { min: field.min, max: field.max },
              )
            }
          />
        ))}
      </Grid>
      <Flex wrap="wrap" gap="4" mb="4">
        {PERK_FIELDS.map((field) => (
          <AlchemyPerkCheckbox
            key={field.key}
            id={`${id}-${field.idSuffix}`}
            label={field.label}
            checked={params[field.key]}
            onCheckedChange={(next) =>
              startSettingsTransition(() => {
                setParams((prevParams) => ({ ...prevParams, [field.key]: next }));
              })
            }
          />
        ))}
      </Flex>
      <Button
        type="button"
        size="2"
        variant="outline"
        color="gray"
        onClick={() =>
          startSettingsTransition(() => {
            setParams({ ...defaultAlchemyFormParams });
          })
        }
      >
        Reset to defaults
      </Button>
    </Card>
  );
}
