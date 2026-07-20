import { Checkbox, type CheckboxProps } from "@heroui/react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

type RHFCheckboxProps<TFieldValues extends FieldValues = FieldValues> =
  Omit<CheckboxProps, "name" | "checked" | "defaultChecked" | "isSelected" | "onValueChange"> & {
    name: Path<TFieldValues>;
    label: string;
    control: Control<TFieldValues>;
  };

const CheckBox = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  control,
  classNames,
  ...props
}: RHFCheckboxProps<TFieldValues>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Checkbox
          {...props}
          name={field.name}
          // HeroUI expects these:
          isSelected={!!field.value}
          onValueChange={field.onChange}
          onBlur={field.onBlur}
          ref={field.ref}
          classNames={{
            ...classNames,
            wrapper: `w-6 h-6 rounded-sm ${classNames?.wrapper ?? ""}`,
          }}
        >
          {label}
        </Checkbox>
      )}
    />
  );
};

export default CheckBox;
