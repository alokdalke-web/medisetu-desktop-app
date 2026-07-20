import React from "react";
import { Select, SelectItem } from "@heroui/react";
import { Controller, Control, RegisterOptions } from "react-hook-form";
import { FiChevronDown } from "react-icons/fi";

interface OnboardingSelectProps {
  name: string;
  control: Control<any>;
  label: string;
  placeholder: string;
  isRequired?: boolean;
  icon?: React.ReactNode;
  rules?: RegisterOptions;
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
      render={({ field: { onChange, onBlur, name: fieldName, value }, fieldState: { error } }) => (
        <div className={`flex flex-col gap-1.5 ${className}`}>
          <label className="text-xs sm:text-base font-medium text-slate-700 dark:text-white flex items-center gap-1">
            {label}
            {isRequired && <span className="text-red-500">*</span>}
          </label>

          <Select
            aria-label={label}
            name={fieldName}
            placeholder={placeholder}
            selectedKeys={value ? new Set([String(value)]) : new Set<string>()}
            onSelectionChange={(keys) => {
              if (keys === "all") return;

              const selectedKey = Array.from(keys)[0];
              const nextValue = selectedKey ? String(selectedKey) : "";

              onChange(nextValue);
              onChangeCallback?.(nextValue);
            }}
            onOpenChange={(open) => {
              if (!open) onBlur();
            }}
            isInvalid={!!error}
            variant="bordered"
            radius="lg"
            size="md"
            selectorIcon={<FiChevronDown className="h-4 w-4 text-[#8da0c0]" />}
            startContent={icon ? <span className="text-[#8da0c0]">{icon}</span> : undefined}
            classNames={{
              trigger:
                "h-11 sm:h-12 min-h-0 border border-slate-200 bg-white px-3 shadow-none data-[hover=true]:border-[#0a7c83]/50 data-[open=true]:border-[#0a7c83] data-[open=true]:ring-2 data-[open=true]:ring-[#0a7c83]/15 dark:border-slate-700 dark:bg-slate-800",
              innerWrapper: icon ? "gap-3" : "",
              value:
                "text-[13px] sm:text-[14px] font-medium text-[#1e2a44] group-data-[has-value=false]:text-[#8da0c0]",
              selectorIcon: "right-3 text-[#8da0c0]",
              popoverContent:
                "rounded-xl border border-[#e2eaf4] bg-white p-1 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900",
              listbox: "p-0",
            }}
            listboxProps={{
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
              <SelectItem key={option.value} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </Select>

          {error && (
            <span className="text-[12px] text-red-500 ml-1">{error.message}</span>
          )}
        </div>
      )}
    />
  );
};
