import React from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import { STATUS_TABS } from "../../hooks/useAppointmentFilters";
import type { StatusFilterDropdownProps } from "../../../../types/appointment";

const StatusFilterDropdown: React.FC<StatusFilterDropdownProps> = ({
  tab,
  setTab,
  isOpen,
  setIsOpen,
  dropdownRef,
  statusLabel,
}) => (
  <div ref={dropdownRef} className="relative w-full sm:w-[190px]">
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      onKeyDown={(e) => { if (e.key === "Escape") setIsOpen(false); }}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-label="Appointment status filter"
      className={[
        "flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-line bg-surface",
        "px-3 text-[13px] font-semibold text-text",
        "outline-none transition",
        "hover:border-primary/40 hover:bg-surface-muted",
        "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
      ].join(" ")}
    >
      <span className="truncate text-left">{statusLabel(tab)}</span>
      <FiChevronDown
        className={`ml-2 shrink-0 text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      />
    </button>

    {isOpen && (
      <div role="listbox" aria-label="Status options" className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-xl shadow-slate-200/70 dark:shadow-black/30">
        {STATUS_TABS.map((statusKey) => {
          const isActive = tab === statusKey;
          return (
            <button
              key={statusKey}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => { setTab(statusKey); setIsOpen(false); }}
              className={[
                "flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-text hover:bg-surface-muted",
              ].join(" ")}
            >
              <span className="line-clamp-2">{statusLabel(statusKey)}</span>
              {isActive && <FiCheck className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

export default StatusFilterDropdown;
