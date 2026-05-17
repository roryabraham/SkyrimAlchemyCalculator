import { Checkbox, Flex, Text } from "@radix-ui/themes";

type Props = {
  id: string;
  label: string;
  isChecked: boolean;
  onCheckedChange: (isChecked: boolean) => void;
};

export function AlchemyPerkCheckbox({ id, label, isChecked, onCheckedChange }: Props) {
  return (
    <Flex align="center" gap="2">
      <Checkbox
        id={id}
        checked={isChecked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Text as="label" htmlFor={id} size="2" style={{ cursor: "pointer" }}>
        {label}
      </Text>
    </Flex>
  );
}
