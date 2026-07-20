import { DateRangePicker } from "@heroui/react";
import { Controller, type Control, type FieldValues } from "react-hook-form";
import InputLabel from "./InputLabel";

interface DateRangeFieldProps {
  name: string;
  label: string;
  isOptional?: boolean;
  control: Control<FieldValues, FieldValues>;
}

const DateRangeField = ({
  name,
  control,
  label,
  isOptional,
  ...props
}: DateRangeFieldProps) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <DateRangePicker
          {...field}
          {...props}
          label={<InputLabel label={label} isOptional={isOptional} />}
          labelPlacement="outside"
          radius="full"
          size="lg"
          variant="bordered"
          classNames={{
            inputWrapper:
              "border-1 border-border-color hover:border-primary/60 focus-within:border-border-color focus-within:hover:border-primary",
          }}
        />
      )}
    />
  );
};

export default DateRangeField;
