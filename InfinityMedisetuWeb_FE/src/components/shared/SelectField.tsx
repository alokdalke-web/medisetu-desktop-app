import { Select, SelectItem, Chip, type SelectProps } from "@heroui/react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";
import InputLabel from "./InputLabel";

export type Option = {
  label: string;
  value: string | number;
  serviceCount?: number;
};

type RHFRules<T extends FieldValues> = Omit<
  RegisterOptions<T, Path<T>>,
  "disabled" | "setValueAs" | "valueAsNumber" | "valueAsDate"
>;

interface SelectFieldProps<T extends FieldValues>
  extends Omit<
    SelectProps,
    "children" | "selectedKeys" | "defaultSelectedKeys" | "onSelectionChange"
  > {
  name: Path<T>;
  label: string;
  isOptional?: boolean;
  isRequired?: boolean;
  control: Control<T>;
  options: Option[];
  errorMessage?: string;

  /** If true, convert empty selection to "" (single mode). Default: true */
  emptyAsEmptyString?: boolean;

  /** ✅ NEW: React Hook Form validation rules (fixes TS2322 for `rules`) */
  rules?: RHFRules<T>;
}

function coerceFromKey(key: string | number | undefined, options: Option[]) {
  if (key == null) return "";
  const strKey = String(key);
  const match = options.find((o) => String(o.value) === strKey);
  return match ? match.value : strKey; // preserve number if defined in options
}

const SelectField = <T extends FieldValues>({
  name,
  label,
  isOptional,
  isRequired,
  control,
  options,
  errorMessage,
  emptyAsEmptyString = true,
  rules,
  id,
  className,
  ...props
}: SelectFieldProps<T>) => {
  const isMultiple = props.selectionMode === "multiple";

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        // Build selectedKeys from RHF value
        const selectedKeys = (() => {
          if (isMultiple) {
            const arr = Array.isArray(field.value)
              ? field.value
              : field.value
                ? [field.value]
                : [];
            return new Set(arr.map((v) => String(v)));
          }

          return field.value !== undefined &&
            field.value !== null &&
            field.value !== ""
            ? new Set([String(field.value)])
            : new Set<string>();
        })();

        return (
          <div className={className}>
            <Select
              {...props}
              isRequired={false}
              id={id ?? field.name}
              // name is not used by HeroUI for value control but good to keep
              name={field.name}
              aria-invalid={!!fieldState.error}
              label={<InputLabel label={label} isOptional={isOptional} isRequired={isRequired} />}
              labelPlacement="outside"
              radius="full"
              // size="lg"
              variant="bordered"
              selectedKeys={selectedKeys}
              onSelectionChange={(keys) => {
                if (isMultiple) {
                  const next = Array.from(keys as Set<string>).map((k) =>
                    coerceFromKey(k, options),
                  );
                  field.onChange(next);
                } else {
                  const key = Array.from(keys as Set<string>)[0];
                  const next =
                    key === undefined
                      ? emptyAsEmptyString
                        ? ""
                        : null
                      : coerceFromKey(key, options);
                  field.onChange(next);
                }
              }}
              onOpenChange={(open) => {
                if (!open) field.onBlur(); // mark touched when dropdown closes
              }}
              classNames={{
                trigger:
                  "border-1 border-border-color data-[hover=true]:border-primary/60 data-[open=true]:border-primary text-[16px]",
              }}
            >
              {options.map((option) => (
                <SelectItem
                  key={String(option.value)}
                  textValue={option.label}
                  className="py-2 text-[16px]"
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="truncate">{option.label}</span>
                    {option.serviceCount === 0 && (
                      <Chip
                        size="sm"
                        color="danger"
                        variant="flat"
                        className="h-5 text-[10px] px-1"
                      >
                        Service Unavailable
                      </Chip>
                    )}
                  </div>
                </SelectItem>
              ))}
            </Select>

            {(errorMessage || fieldState.error?.message) && (
              <p className="mt-1 text-xs text-red-500">
                {errorMessage ?? fieldState.error?.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
};

export default SelectField;