import React, { useEffect, useRef, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import type { FilterDropdownProps, FilterOption } from "../../../../types/paymentHistory";

// Reusable single-select dropdown used for Payment Mode, Payment Status, and
// Doctor filters. `value === null` means "All".
const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  allLabel = "All",
  widthClass = "w-full sm:w-[170px]",
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = options.find((o) => o.value === value) ?? null;
  const items: FilterOption[] = [{ value: "", label: allLabel }, ...options];

  return (
    <div ref={ref} className={`relative ${widthClass}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} filter`}
        className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-text shadow-sm outline-none transition hover:border-primary/40 hover:bg-surface-muted focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
      >
        <span className="truncate text-left">{label} - {selected?.label ?? allLabel}</span>
        <FiChevronDown className={`ml-2 shrink-0 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="listbox" aria-label={`${label} options`} className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-xl shadow-slate-200/70 dark:shadow-black/30">
          {items.map((opt) => {
            const isActive = (value ?? "") === opt.value;
            return (
              <button
                key={opt.value || "__all__"}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => { onChange(opt.value || null); setOpen(false); }}
                className={["flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition", isActive ? "bg-primary/10 text-primary" : "text-text hover:bg-surface-muted"].join(" ")}
              >
                <span className="truncate">{opt.label}</span>
                {isActive && <FiCheck className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
