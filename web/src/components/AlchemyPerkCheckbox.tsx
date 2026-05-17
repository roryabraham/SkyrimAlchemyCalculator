import { Checkbox, Flex, Text } from "@radix-ui/themes";

type Props = {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
};

export function AlchemyPerkCheckbox({ id, label, checked, onCheckedChange }: Props) {
  return (
    <Flex align="center" gap="2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Text as="label" htmlFor={id} size="2" style={{ cursor: "pointer" }}>
        {label}
      </Text>
    </Flex>
  );
}
