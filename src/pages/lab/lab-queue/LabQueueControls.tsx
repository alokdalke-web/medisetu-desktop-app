import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiChevronDown,
} from "react-icons/fi";

import type { FilterOption, LabTestStatus, SortKey } from "./types";
import { pageSizeOptions } from "./utils";

export function StatusBadge({ status }: { status: LabTestStatus }) {
  const active = status === "active";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-[11px] font-semibold leading-none",
        active
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {active ? "Active" : "Deactive"}
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const custom = source === "Custom";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1",
        "text-[11px] font-semibold leading-none",
        custom
          ? "border-sky-100 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      {source}
    </span>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption =
    options.find((option) => option.value === value) ??
    options[0] ??
    ({ label: "All", value: "all" } satisfies FilterOption);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={[
          "inline-flex h-11 w-full items-center justify-between gap-3",
          "rounded-lg border bg-white px-3 text-left text-[13px] font-semibold text-slate-700 shadow-sm",
          "transition-all duration-200 focus:outline-none",
          isOpen
            ? "border-primary/45 ring-2 ring-primary/10"
            : "border-slate-200 hover:border-primary/40 hover:bg-slate-50",
        ].join(" ")}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`${label} filter`}
      >
        <span className="min-w-0 truncate">
          {label} - {selectedOption.label}
        </span>
        <FiChevronDown
          className={[
            "h-4 w-4 shrink-0 text-primary transition-transform duration-200",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full min-w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">
          <div
            className="max-h-72 overflow-y-auto pr-1 scrollbar-hide"
            role="listbox"
          >
            {options.map((option) => {
              const isSelected = option.value === selectedOption.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={[
                    "flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-3 py-2",
                    "text-left text-[13px] font-semibold transition-colors",
                    isSelected
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-900 hover:bg-slate-50",
                  ].join(" ")}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="min-w-0 truncate">
                    {label} - {option.label}
                  </span>
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

export function CatalogMetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone: "emerald" | "sky" | "violet" | "amber";
}) {
  const toneConfig = {
    emerald: "bg-emerald-50 text-emerald-600",
    sky: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  }[tone];

  return (
    <div className="min-h-[110px] overflow-hidden rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm transition-colors hover:border-slate-300">
      <div className="flex h-full min-w-0 items-center gap-4">
        <span className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full ${toneConfig}`}>
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-slate-500">
            {label}
          </p>
          <div className="mt-1 truncate text-[26px] font-semibold leading-none text-slate-950">
            {value}
          </div>
          <p className="mt-2 truncate text-[12px] font-semibold text-slate-500">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SortHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  align = "left",
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey | null;
  direction: "asc" | "desc";
  align?: "left" | "right";
  onSort: (key: SortKey) => void;
}) {
  const isActive = activeSortKey === sortKey;
  const ActiveIcon = direction === "asc" ? FiArrowUp : FiArrowDown;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={[
        "inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-500 transition-colors hover:text-slate-800",
        align === "right" ? "justify-end" : "justify-start",
      ].join(" ")}
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      {isActive ? (
        <ActiveIcon className="h-3 w-3 text-primary" />
      ) : (
        <span className="flex flex-col text-slate-300">
          <FiArrowUp className="h-2 w-2" />
          <FiArrowDown className="-mt-1 h-2 w-2" />
        </span>
      )}
    </button>
  );
}

export function PageSizeDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-9 w-[72px] cursor-pointer items-center justify-between rounded-lg border border-primary/35 bg-white px-3 text-[13px] font-semibold text-primary shadow-sm transition-all duration-200 hover:border-primary/60 hover:bg-primary/5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <span>{value}</span>
        <FiChevronDown
          className={[
            "text-slate-400 transition-transform duration-200",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[72px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="py-1">
            {pageSizeOptions.map((option) => {
              const isActive = option === value;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={[
                    "flex h-9 w-full items-center px-3 text-left text-[13px] transition-colors",
                    isActive
                      ? "bg-[#0A6C74] text-white"
                      : "text-[#677294] hover:bg-slate-50 hover:text-slate-900",
                  ].join(" ")}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
