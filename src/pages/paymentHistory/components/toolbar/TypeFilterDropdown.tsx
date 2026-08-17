import React from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import type { TabKey } from "../../../../types/paymentHistory";
import type { TypeFilterDropdownProps } from "../../../../types/paymentHistory";

const TAB_KEYS: TabKey[] = ["all", "credit", "debit"];

const tabLabel = (k: TabKey) =>
  k === "all"
    ? "Type - All"
    : k === "credit"
      ? "Type - Payments"
      : "Type - Refunds";

const TypeFilterDropdown: React.FC<TypeFilterDropdownProps> = ({
  tab,
  setTab,
  isOpen,
  setIsOpen,
  dropdownRef,
  counts,
}) => (
  <div ref={dropdownRef} className="relative w-full sm:w-[160px]">
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      onKeyDown={(e) => { if (e.key === "Escape") setIsOpen(false); }}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-label="Payment type filter"
      className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-text shadow-sm outline-none transition hover:border-primary/40 hover:bg-surface-muted focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
    >
      <span className="truncate text-left">
        {tabLabel(tab)}{tab !== "all" && counts[tab] ? ` (${counts[tab]})` : ""}
      </span>
      <FiChevronDown className={`ml-2 shrink-0 text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
    </button>

    {isOpen && (
      <div role="listbox" aria-label="Type options" className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-xl shadow-slate-200/70 dark:shadow-black/30">
        {TAB_KEYS.map((key) => {
          const isActive = tab === key;
          const count = counts[key];
          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => { setTab(key); setIsOpen(false); }}
              className={["flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition", isActive ? "bg-primary/10 text-primary" : "text-text hover:bg-surface-muted"].join(" ")}
            >
              <span>{tabLabel(key)}{count ? ` (${count})` : ""}</span>
              {isActive && <FiCheck className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

export default TypeFilterDropdown;
