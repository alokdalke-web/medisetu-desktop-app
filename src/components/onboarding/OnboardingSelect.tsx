import React from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/react";
import { Controller, Control, RegisterOptions } from "react-hook-form";
import { FiChevronDown } from "react-icons/fi";

interface OnboardingSelectProps {
  name: string;
  control: any;
  label: string;
  placeholder: string;
  isRequired?: boolean;
  icon?: React.ReactNode;
  rules?: any;
  options?: { value: string; label: string }[];
  onChange?: (value: string) => void;
  className?: string;
}

export const OnboardingSelect: React.FC<OnboardingSelectProps> = ({
  name,
  control,
  label,
  placeholder,
  isRequired = false,
  icon,
  rules = {},
  options = [],
  onChange: onChangeCallback,
  className = "",
}) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        ...(isRequired && { required: `${label} is required` }),
        ...rules,
      }}
      render={({ field: { onChange, onBlur, name: fieldName, value }, fieldState: { error } }) => {
        const inputValue = value ? String(value) : "";
        const selectedKey = options.some((option) => String(option.value) === inputValue)
          ? inputValue
          : null;

        const updateValue = (nextValue: string) => {
          onChange(nextValue);
          onChangeCallback?.(nextValue);
        };

        return (
          <div className={`flex flex-col gap-1.5 ${className}`}>
            <label className="flex items-center gap-1 text-[13px] font-semibold text-slate-700 dark:text-white sm:text-[14px]">
              {label}
              {isRequired && <span className="text-red-500">*</span>}
            </label>

            <Autocomplete
              aria-label={label}
              name={fieldName}
              placeholder={placeholder}
              inputValue={inputValue}
              selectedKey={selectedKey}
              onInputChange={updateValue}
              onSelectionChange={(key) => updateValue(key ? String(key) : "")}
              onBlur={onBlur}
              allowsCustomValue
              menuTrigger="focus"
              isClearable
              isInvalid={!!error}
              variant="bordered"
              radius="lg"
              size="md"
              selectorIcon={<FiChevronDown className="h-4 w-4 text-[#8da0c0]" />}
              startContent={icon ? <span className="text-[#8da0c0]">{icon}</span> : undefined}
              inputProps={{
                classNames: {
                  input:
                    "text-[13px] font-medium text-[#1e2a44] placeholder:text-[#8da0c0] dark:text-white dark:placeholder:text-slate-500",
                  inputWrapper:
                    "h-11 min-h-11 border border-slate-200 bg-white px-3 shadow-none data-[hover=true]:border-[#0a7c83]/50 data-[focus=true]:border-[#0a7c83] data-[focus=true]:ring-2 data-[focus=true]:ring-[#0a7c83]/15 dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-sm",
                  innerWrapper: icon ? "gap-3" : "",
                },
              }}
              classNames={{
                base: "w-full",
                selectorButton: "text-[#8da0c0]",
                clearButton: "text-[#8da0c0]",
                popoverContent:
                  "rounded-xl border border-[#e2eaf4] bg-white p-1 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900",
                listbox: "p-0",
                listboxWrapper: "max-h-64",
              }}
              listboxProps={{
                emptyContent: "No speciality found",
                itemClasses: {
                  base:
                    "rounded-lg px-3 py-2 text-[13px] font-semibold text-[#31415f] data-[hover=true]:bg-slate-50 data-[selectable=true]:focus:bg-[#eaf9f7] data-[selectable=true]:focus:text-[#007c82] data-[selected=true]:bg-[#eaf9f7] data-[selected=true]:text-[#007c82]",
                  selectedIcon: "text-[#007c82]",
                },
              }}
              popoverProps={{
                offset: 6,
                placement: "bottom",
              }}
            >
              {options.map((option) => (
                <AutocompleteItem key={option.value} textValue={option.label}>
                  {option.label}
                </AutocompleteItem>
              ))}
            </Autocomplete>

            {error && (
              <span className="text-[12px] text-red-500 ml-1">{error.message}</span>
            )}
          </div>
        );
      }}
    />
  );
};
