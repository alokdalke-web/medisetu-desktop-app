import { Input, type InputProps } from "@heroui/react";
import { Controller, type Control, type FieldValues, type Path, type RegisterOptions } from "react-hook-form";

interface PillInputProps<T extends FieldValues> extends Omit<InputProps, "name" | "control"> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  placeholder?: string;
  isRequired?: boolean;
  rules?: RegisterOptions<T, Path<T>>;
  parse?: (val: string) => any;
}

const PillInput = <T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  isRequired,
  rules,
  parse,
  ...props
}: PillInputProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        ...(isRequired ? { required: `${label} is required` } : {}),
        ...rules,
      }}
      render={({ field, fieldState: { error } }) => (
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[12px] font-medium text-[#475569] font-outfit">
            {label}
            {isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <Input
            {...field}
            {...props}
            onChange={(e) => {
              const val = e.target.value;
              const next = parse ? parse(val) : val;
              field.onChange(next);
            }}
            value={field.value ?? ""}
            placeholder={placeholder}
            radius="lg"
            size="sm"
            variant="bordered"
            isInvalid={!!error}
            errorMessage={error?.message}
            classNames={{
              input: "text-[13px] font-normal text-[#0F172A] placeholder:text-[#94A3B8] font-outfit",
              inputWrapper: "bg-white border-[#E2E8F0] data-[hover=true]:border-[#0A6C74] group-data-[focus=true]:border-[#0A6C74] h-[38px] min-h-[38px] px-3",
            }}
          />
        </div>
      )}
    />
  );
};

export default PillInput;
