

import { Textarea, type TextAreaProps } from "@heroui/react";
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

type RHFTextareaProps<T extends FieldValues> = Omit<
  TextAreaProps,
  "name" | "value" | "defaultValue" | "onChange" | "onValueChange"
> & {
  name: Path<T>;
  label: React.ReactNode;
  isOptional?: boolean;
  control: Control<T>;
  /** Optional parser (e.g., (v) => v.trim()) applied before saving to RHF */
  parse?: (val: string) => unknown;
  rules?: RHFRules<T>;
};

const TextareaField = <T extends FieldValues>({
  name,
  label,
  isOptional,
  control,
  parse,
  id,
  rules,
  ...props
}: RHFTextareaProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <Textarea
          {...props}
          id={id ?? field.name}
          name={field.name}
          value={field.value ?? ""}
          onValueChange={(val) => {
            const next = parse ? parse(val) : val;
            field.onChange(next);
          }}
          onBlur={field.onBlur}
          ref={field.ref}
          aria-invalid={!!fieldState.error}
          isInvalid={!!fieldState.error}
          errorMessage={props.errorMessage ?? fieldState.error?.message}
          label={
            typeof label === "string" ? (
              <InputLabel label={label} isOptional={isOptional} />
            ) : (
              label
            )
          }
          labelPlacement="outside-top"
          size="lg"
          variant="bordered"
          classNames={{
            input:
              "text-base !text-text placeholder:text-text-muted p-2",
            inputWrapper:
              "border-1 border-border-color bg-white data-[hover=true]:border-primary/60 data-[focus=true]:border-primary dark:!border-[#38445a] dark:!bg-[#0f1728] dark:data-[hover=true]:!border-[#46beae]/60 dark:data-[focus=true]:!border-[#46beae]",
            ...(props.classNames ?? {}),
          }}
        />
      )}
    />
  );
};

export default TextareaField;
