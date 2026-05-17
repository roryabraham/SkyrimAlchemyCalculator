import { Button, Card, Checkbox, Flex, Grid, Heading, Text, TextField } from "@radix-ui/themes";
import type { Dispatch, SetStateAction } from "react";
import { useId } from "react";
import type { AlchemyFormParams } from "../types.ts";
import { defaultAlchemyFormParams } from "../types.ts";

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
  let n = Math.floor(Number(value));
  if (!Number.isFinite(n)) n = fallback;
  if (opts?.min !== undefined) n = Math.max(opts.min, n);
  if (opts?.max !== undefined) n = Math.min(opts.max, n);
  startSettingsTransition(() => {
    setParams((p) => ({ ...p, [key]: n }));
  });
}

export function AlchemySettingsPanel({ params, setParams, startSettingsTransition }: Props) {
  const id = useId();
  const physicianId = `${id}-physician`;
  const benefactorId = `${id}-benefactor`;
  const poisonerId = `${id}-poisoner`;

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
        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor={`${id}-skill`}>
            Alchemy skill
          </Text>
          <TextField.Root
            id={`${id}-skill`}
            size="2"
            type="number"
            min={0}
            max={100}
            value={String(params.alchemySkill)}
            onChange={(e) =>
              setNumParam(
                setParams,
                startSettingsTransition,
                "alchemySkill",
                e.target.value,
                defaultAlchemyFormParams.alchemySkill,
                { min: 0, max: 100 },
              )
            }
          />
        </Flex>
        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor={`${id}-fortify`}>
            Fortify Alchemy (%)
          </Text>
          <TextField.Root
            id={`${id}-fortify`}
            size="2"
            type="number"
            min={0}
            max={500}
            value={String(params.fortifyAlchemy)}
            onChange={(e) =>
              setNumParam(
                setParams,
                startSettingsTransition,
                "fortifyAlchemy",
                e.target.value,
                defaultAlchemyFormParams.fortifyAlchemy,
                { min: 0, max: 500 },
              )
            }
          />
        </Flex>
        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor={`${id}-alchemist`}>
            Alchemist perk (%)
          </Text>
          <TextField.Root
            id={`${id}-alchemist`}
            size="2"
            type="number"
            min={0}
            max={100}
            value={String(params.alchemistPercent)}
            onChange={(e) =>
              setNumParam(
                setParams,
                startSettingsTransition,
                "alchemistPercent",
                e.target.value,
                defaultAlchemyFormParams.alchemistPercent,
                { min: 0, max: 100 },
              )
            }
          />
        </Flex>
        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor={`${id}-seeker`}>
            Seeker of Shadows (%)
          </Text>
          <TextField.Root
            id={`${id}-seeker`}
            size="2"
            type="number"
            min={0}
            max={20}
            value={String(params.seekerOfShadowsPercent)}
            onChange={(e) =>
              setNumParam(
                setParams,
                startSettingsTransition,
                "seekerOfShadowsPercent",
                e.target.value,
                defaultAlchemyFormParams.seekerOfShadowsPercent,
                { min: 0, max: 20 },
              )
            }
          />
        </Flex>
      </Grid>
      <Flex wrap="wrap" gap="4" mb="4">
        <Flex align="center" gap="2">
          <Checkbox
            id={physicianId}
            checked={params.hasPhysician}
            onCheckedChange={(v) =>
              startSettingsTransition(() => {
                setParams((p) => ({ ...p, hasPhysician: v === true }));
              })
            }
          />
          <Text as="label" htmlFor={physicianId} size="2" style={{ cursor: "pointer" }}>
            Physician
          </Text>
        </Flex>
        <Flex align="center" gap="2">
          <Checkbox
            id={benefactorId}
            checked={params.hasBenefactor}
            onCheckedChange={(v) =>
              startSettingsTransition(() => {
                setParams((p) => ({ ...p, hasBenefactor: v === true }));
              })
            }
          />
          <Text as="label" htmlFor={benefactorId} size="2" style={{ cursor: "pointer" }}>
            Benefactor
          </Text>
        </Flex>
        <Flex align="center" gap="2">
          <Checkbox
            id={poisonerId}
            checked={params.hasPoisoner}
            onCheckedChange={(v) =>
              startSettingsTransition(() => {
                setParams((p) => ({ ...p, hasPoisoner: v === true }));
              })
            }
          />
          <Text as="label" htmlFor={poisonerId} size="2" style={{ cursor: "pointer" }}>
            Poisoner
          </Text>
        </Flex>
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
