import { TimeInput } from "@heroui/react";
import { Controller, type Control, type FieldValues } from "react-hook-form";
import InputLabel from "./InputLabel";
import { Time } from "@internationalized/date";

interface TimeInputFieldProps {
  name: string;
  label: string;
  isOptional?: boolean;
  control: Control<FieldValues, FieldValues>;
}

const TimeInputField = ({
  name,
  control,
  label,
  isOptional,
  ...props
}: TimeInputFieldProps) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TimeInput
          {...field}
          {...props}
          label={<InputLabel label={label} isOptional={isOptional} />}
          labelPlacement="outside"
          radius="full"
          size="lg"
          variant="bordered"
          defaultValue={new Time(9, 0)}
          classNames={{
            inputWrapper:
              "border-1 border-border-color hover:border-primary/60 focus-within:border-border-color focus-within:hover:border-primary",
          }}
        />
      )}
    />
  );
};

export default TimeInputField;
