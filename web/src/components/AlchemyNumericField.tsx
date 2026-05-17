import { Flex, Text, TextField } from "@radix-ui/themes";

type Props = {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  onValueChange: (raw: string) => void;
};

export function AlchemyNumericField({ id, label, min, max, value, onValueChange }: Props) {
  return (
    <Flex direction="column" gap="1">
      <Text as="label" size="2" weight="medium" htmlFor={id}>
        {label}
      </Text>
      <TextField.Root
        id={id}
        size="2"
        type="number"
        min={min}
        max={max}
        value={String(value)}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </Flex>
  );
}
