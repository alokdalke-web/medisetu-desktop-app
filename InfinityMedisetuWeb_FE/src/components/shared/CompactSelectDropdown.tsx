import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";

export type CompactSelectOption<T extends string | number> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type CompactSelectDropdownProps<T extends string | number> = {
  ariaLabel: string;
  value: T;
  options: readonly CompactSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  selectedClassName?: string;
  unselectedClassName?: string;
};

const baseTriggerClass =
  "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-900 outline-none transition hover:border-primary/40 focus:border-primary/45 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

const baseMenuClass =
  "absolute left-0 top-[calc(100%+6px)] z-[70] w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-200/70";

const baseOptionClass =
  "flex min-h-8 w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold transition";

export default function CompactSelectDropdown<T extends string | number>({
  ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  optionClassName = "",
  selectedClassName = "bg-teal-50 text-teal-700",
  unselectedClassName = "text-slate-800 hover:bg-slate-50 hover:text-primary",
}: CompactSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [searchBuffer, setSearchBuffer] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleContainerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    // Toggle menu on Enter or Space
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen((open) => !open);
      return;
    }

    // Handle alphanumeric and numeric keys for searching options
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const nextBuffer = searchBuffer + event.key;
      setSearchBuffer(nextBuffer);

      // Clean string helper (remove hyphens, spaces, underscores, slashes)
      const cleanStr = (s: string) => s.replace(/[-_ /]/g, "").toLowerCase();
      const target = cleanStr(nextBuffer);

      const matched = options.find((opt) => {
        const optVal = cleanStr(String(opt.value));
        const optLabel = cleanStr(opt.label);
        return optVal.startsWith(target) || optLabel.startsWith(target);
      });

      if (matched) {
        onChange(matched.value);
      }

      timerRef.current = setTimeout(() => {
        setSearchBuffer("");
      }, 1000);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative ${className}`}
      onKeyDown={handleContainerKeyDown}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={`${baseTriggerClass} ${triggerClassName}`}
      >
        <span className="min-w-0 truncate">
          {selectedOption?.label ?? "Select"}
        </span>
        <FiChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`${baseMenuClass} ${menuClassName}`}
        >
          <div className="max-h-72 overflow-y-auto [scrollbar-width:thin]">
            {options.map((option) => {
              const isSelected = String(option.value) === String(value);

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={[
                    baseOptionClass,
                    optionClassName,
                    isSelected ? selectedClassName : unselectedClassName,
                    option.disabled ? "cursor-not-allowed opacity-50" : "",
                  ].join(" ")}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected && <FiCheck className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
