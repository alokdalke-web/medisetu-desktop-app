// components/shared/DatePickerField.tsx
import { DatePicker } from "@heroui/react";
import { Controller, type Control, type FieldValues } from "react-hook-form";
import InputLabel from "./InputLabel";
import { today, getLocalTimeZone } from "@internationalized/date";

interface DatePickerFieldProps {
  name: string;
  label: string;
  isOptional?: boolean;
  control: Control<FieldValues, FieldValues>;
  disablePast?: boolean;
}

const toYMD = (d: any): string => {
  if (!d) return "";

  if (
    typeof d === "object" &&
    d !== null &&
    "year" in d &&
    "month" in d &&
    "day" in d
  ) {
    const y = String(d.year);
    const m = String(d.month).padStart(2, "0");
    const day = String(d.day).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  if (typeof d === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }

  return "";
};

const DatePickerField = ({
  name,
  control,
  label,
  isOptional,
  disablePast = false,
  ...props
}: DatePickerFieldProps) => {
  const minValue = disablePast ? today(getLocalTimeZone()) : undefined;
  const todayYmd = disablePast ? toYMD(minValue) : "";

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <DatePicker
          {...field}
          {...props}
          minValue={minValue}
          onChange={(val: any) => {
            if (disablePast && val) {
              const picked = toYMD(val);
              if (picked && todayYmd && picked < todayYmd) {
                return;
              }
            }
            field.onChange(val);
          }}
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

export default DatePickerField;
