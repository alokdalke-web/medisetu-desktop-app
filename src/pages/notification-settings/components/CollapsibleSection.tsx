import React, { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

type CollapsibleSectionProps = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  icon,
  title,
  description,
  badge,
  defaultOpen = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
      {/* Header — clickable */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50/50 sm:px-5"
        aria-expanded={isOpen}
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-slate-900">
              {title}
            </span>
            {badge && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
              {description}
            </p>
          )}
        </div>
        <FiChevronDown
          className={`shrink-0 text-[14px] text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;
