import { Textarea, type TextAreaProps } from "@heroui/react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

interface PillTextareaProps<T extends FieldValues> extends Omit<TextAreaProps, "name" | "control"> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  placeholder?: string;
  isRequired?: boolean;
}

const PillTextarea = <T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  isRequired,
  ...props
}: PillTextareaProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={isRequired ? { required: `${label} is required` } : undefined}
      render={({ field, fieldState: { error } }) => (
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[12px] font-medium text-[#475569] font-outfit">
            {label}
            {isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <Textarea
            {...field}
            {...props}
            value={field.value ?? ""}
            placeholder={placeholder}
            radius="lg"
            size="sm"
            variant="bordered"
            isInvalid={!!error}
            errorMessage={error?.message}
            classNames={{
              input: "text-[13px] font-normal text-[#0F172A] placeholder:text-[#94A3B8] font-outfit",
              inputWrapper: "bg-white border-[#E2E8F0] data-[hover=true]:border-[#0A6C74] group-data-[focus=true]:border-[#0A6C74] px-3 py-2",
            }}
          />
        </div>
      )}
    />
  );
};

export default PillTextarea;
