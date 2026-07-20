
import React from "react";
import {
  Autocomplete,
  AutocompleteItem,
  type AutocompleteProps,
} from "@heroui/react";
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
  badgeText?: string;
  badgeTone?:
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";
};

type RHFRules<T extends FieldValues> = Omit<
  RegisterOptions<T, Path<T>>,
  "disabled" | "setValueAs" | "valueAsNumber" | "valueAsDate"
>;

interface AutocompleteFieldProps<T extends FieldValues>
  extends Omit<
    AutocompleteProps,
    "children" | "selectedKey" | "defaultSelectedKey" | "onSelectionChange"
  > {
  name: Path<T>;
  label?: React.ReactNode;
  isOptional?: boolean;
  control: Control<T>;
  options: Option[];
  errorMessage?: string;
  onInputChange?: (value: string) => void;
  onSelectionChange?: (key: string | number | null) => void;
  isLoading?: boolean;
  rules?: RHFRules<T>;
  containerClassName?: string;

  /** ✅ NEW: Custom empty content (replaces "No results found.") */
  emptyContent?: React.ReactNode;

  /** ✅ NEW: Control dropdown open/close from parent */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

}

const AutocompleteField = <T extends FieldValues>({
  name,
  label,
  isOptional,
  control,
  options,
  errorMessage,
  onInputChange,
  onSelectionChange: externalOnSelectionChange,
  isLoading,
  isRequired,
  rules,
  containerClassName,
  emptyContent,
  ...props
}: AutocompleteFieldProps<T>) => {
  const {
    classNames: autocompleteClassNames,
    radius,
    size,
    variant,
    ...autocompleteProps
  } = props;

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const isInvalid = Boolean(fieldState.error || errorMessage);
        const errorMsg = errorMessage ?? fieldState.error?.message;

        return (
          <div className={containerClassName ?? "mb-4"}>
            <Autocomplete
              {...autocompleteProps}
              inputValue={autocompleteProps.inputValue}
              onInputChange={onInputChange}
              isLoading={isLoading}
              isInvalid={isInvalid}
              errorMessage={errorMsg}
              selectedKey={field.value ? String(field.value) : null}
              onSelectionChange={(key) => {
                const val = key ? String(key) : "";
                field.onChange(val);
                externalOnSelectionChange?.(val || null);
              }}
              label={
                label ? (
                  <InputLabel
                    label={label}
                    isOptional={isOptional}
                    isRequired={isRequired}
                  />
                ) : undefined
              }
              labelPlacement="outside-top"
              radius={radius ?? "lg"}
              size={size ?? "lg"}
              variant={variant ?? "bordered"}
              classNames={{
                base: autocompleteClassNames?.base ?? "max-w-full",
                ...autocompleteClassNames,
              } as any}
              /** ✅ IMPORTANT: override empty state */
              listboxProps={{
                ...(autocompleteProps as any)?.listboxProps,
                emptyContent:
                  emptyContent !== undefined
                    ? emptyContent
                    : (autocompleteProps as any)?.listboxProps?.emptyContent,
              }}
            >
              {options.map((option) => {
                const hasBadge = Boolean(option.badgeText);
                const tone = option.badgeTone ?? "danger";

                const wrapCls =
                  tone === "success"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : tone === "warning"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : tone === "info"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : tone === "muted"
                          ? "bg-slate-50 text-slate-600 border-slate-200"
                          : tone === "default"
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : "bg-rose-50 text-rose-700 border-rose-200";

                const dotCls =
                  tone === "success"
                    ? "bg-emerald-500"
                    : tone === "warning"
                      ? "bg-amber-500"
                      : tone === "info"
                        ? "bg-sky-500"
                        : tone === "muted"
                          ? "bg-slate-400"
                          : tone === "default"
                            ? "bg-slate-500"
                            : "bg-rose-500";

                return (
                  <AutocompleteItem
                    key={String(option.value)}
                    textValue={option.label}
                  >
                    {hasBadge ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{option.label}</span>
                        <span
                          className={[
                            "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] border",
                            wrapCls,
                          ].join(" ")}
                        >
                          <span
                            className={["h-1.5 w-1.5 rounded-full", dotCls].join(
                              " ",
                            )}
                          />
                          {option.badgeText}
                        </span>
                      </div>
                    ) : (
                      option.label
                    )}
                  </AutocompleteItem>
                );
              })}
            </Autocomplete>
          </div>
        );
      }}
    />
  );
};

export default AutocompleteField;
