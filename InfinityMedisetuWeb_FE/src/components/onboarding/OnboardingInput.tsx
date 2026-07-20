import React from "react";
import { Controller, Control, RegisterOptions } from "react-hook-form";

interface OnboardingInputProps {
  name: string;
  control: Control<any>;
  label?: string;
  placeholder: string;
  isRequired?: boolean;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "url" | "search" | "none" | "decimal";
  maxLength?: number;
  icon?: React.ReactNode;
  rules?: RegisterOptions;
  parse?: (value: string) => string;
  className?: string;
  isTextarea?: boolean;
  minRows?: number;
}

export const OnboardingInput: React.FC<OnboardingInputProps> = ({
  name,
  control,
  label,
  placeholder,
  isRequired = false,
  type = "text",
  inputMode = "text",
  maxLength,
  icon,
  rules = {},
  parse,
  className = "",
  isTextarea = false,
  minRows = 3,
}) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        ...rules,
        ...(isRequired && { required: `${label} is required` }),
      }}
      render={({ field: { onChange, value, ...field }, fieldState: { error } }) => (
        <div className={`flex flex-col gap-1 sm:gap-1.5 ${className}`}>
          {/* Label */}
          {label && (
            <label className="flex items-center gap-1 text-[13px] font-semibold text-slate-700 dark:text-white sm:text-[14px]">
              {label}
              {isRequired && <span className="text-red-500">*</span>}
            </label>
          )}

          {/* Input/Textarea Container */}
          <div className="relative">
            {/* Icon */}
            {icon && !isTextarea && (
              <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 dark:text-slate-500">
                {icon}
              </div>
            )}

            {/* Textarea or Input Field */}
            {isTextarea ? (
              <textarea
                {...field}
                maxLength={maxLength}
                placeholder={placeholder}
                rows={minRows}
                value={value || ""}
                onChange={(e) => {
                  const newValue = parse ? parse(e.target.value) : e.target.value;
                  onChange(newValue);
                }}
                className={[
                  "w-full rounded-lg border transition-all duration-200 resize-none",
                  "px-3 sm:px-4 py-3",
                  "text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500",
                  "bg-white dark:bg-slate-800/80",
                  error
                    ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:focus:ring-red-500/30"
                    : "border-slate-200 dark:border-slate-700 focus:border-primary dark:focus:border-primary-hover focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary-hover/30",
                  "outline-none",
                  "dark:shadow-sm",
                ].join(" ")}
              />
            ) : (
              <input
                {...field}
                type={type}
                inputMode={inputMode}
                maxLength={maxLength}
                placeholder={placeholder}
                value={value || ""}
                onChange={(e) => {
                  const newValue = parse ? parse(e.target.value) : e.target.value;
                  onChange(newValue);
                }}
                className={[
                  "w-full h-11 rounded-lg border transition-all duration-200",
                  icon ? "pl-10 sm:pl-12 pr-3 sm:pr-4" : "px-3 sm:px-4",
                  "text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500",
                  "bg-white dark:bg-slate-800/80",
                  error
                    ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:focus:ring-red-500/30"
                    : "border-slate-200 dark:border-slate-700 focus:border-primary dark:focus:border-primary-hover focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary-hover/30",
                  "outline-none",
                  "dark:shadow-sm",
                ].join(" ")}
              />
            )}
          </div>

          {/* Error Message */}
          {error && (
            <span className="text-[11px] sm:text-[12px] text-red-500 ml-1">{error.message}</span>
          )}
        </div>
      )}
    />
  );
};
