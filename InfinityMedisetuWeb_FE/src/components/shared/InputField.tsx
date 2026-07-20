// src/components/shared/InputField.tsx
import { Input, type InputProps } from "@heroui/react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";
import InputLabel from "./InputLabel";

type RHFRules<T extends FieldValues> = Omit<
  RegisterOptions<T, Path<T>>,
  "disabled" | "setValueAs" | "valueAsNumber" | "valueAsDate"
>;

interface InputFieldProps<T extends FieldValues> extends Omit<
  InputProps,
  "name" | "value" | "defaultValue" | "onChange" | "onValueChange"
> {
  name: Path<T>;
  label: React.ReactNode;
  isOptional?: boolean;
  control: Control<T, any, any>;
  coerceNumber?: boolean;
  parse?: (val: string) => unknown;
  error?: string;
  rules?: RHFRules<T>;
  preserveValue?: boolean;
}

/**
 * ✅ Important behavior:
 * - DOES NOT trim() anything (password safe)
 * - Uses onChange event to capture raw value exactly as typed (including spaces)
 * - Optional parse/coerceNumber supported
 */
const InputField = <T extends FieldValues>({
  name,
  label,
  isOptional,
  control,
  coerceNumber,
  parse,
  id,
  isRequired,
  rules,
  error,
  preserveValue,
  ...props
}: InputFieldProps<T>) => {
  void preserveValue;
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const value =
          field.value === null || field.value === undefined
            ? ""
            : typeof field.value === "string"
              ? field.value
              : String(field.value);

        const isInvalid = Boolean(fieldState.error || error);
        const errorMessage = error ?? fieldState.error?.message;

        const handleRawChange = (raw: string) => {
          let next: unknown = raw;

          if (parse) {
            next = parse(raw);
          } else if (coerceNumber || props.type === "number") {
            next =
              raw === "" ? "" : Number.isNaN(Number(raw)) ? raw : Number(raw);
          }

          field.onChange(next);
        };

        return (
          <Input
            {...props}
            isRequired={false}
            id={id ?? field.name}
            name={field.name}
            value={value}
            // ✅ Raw value (no trim, no sanitization)
            onChange={(e) => handleRawChange(e.target.value)}
            onBlur={(e) => {
              field.onBlur();
              props.onBlur?.(e);
            }}
            ref={field.ref}
            isInvalid={isInvalid}
            errorMessage={errorMessage}
            aria-invalid={isInvalid}
            label={
              <InputLabel
                label={label}
                isOptional={isOptional}
                isRequired={isRequired}
              />
            }
            labelPlacement="outside-top"
            radius="full"
           // size="sm"
            variant="bordered"
            classNames={{
              input:
                "text-sm !text-slate-900 placeholder:text-muted py-2 dark:!text-slate-100 dark:placeholder:!text-slate-500 ",
              inputWrapper:
                "border-1 border-border-color bg-white py-2 data-[hover=true]:border-primary/60 data-[focus=true]:border-primary dark:!border-[#38445a] dark:!bg-[#0f1728] dark:data-[hover=true]:!border-[#46beae]/60 dark:data-[focus=true]:!border-[#46beae]",
              ...(props.classNames ?? {}),
            }}
          />
        );
      }}
    />
  );
};

export default InputField;
