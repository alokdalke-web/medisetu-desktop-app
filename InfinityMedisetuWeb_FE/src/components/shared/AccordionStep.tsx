import React from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

interface AccordionStepProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  isOpen: boolean;
  isEnabled: boolean;
  isCompleted?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionStep: React.FC<AccordionStepProps> = ({
  icon: Icon,
  title,
  description,
  isOpen,
  isEnabled,
  isCompleted,
  onToggle,
  children,
}) => {
  return (
    <div
      className={[
        "rounded-2xl border transition-all duration-200",
        isOpen
          ? "border-[#0A6C74]/15 shadow-[0_4px_16px_rgba(0,0,0,0.06)] bg-white"
          : isCompleted
          ? "border-[#ECECEC] bg-white shadow-sm overflow-hidden"
          : "border-[#ECECEC] bg-white shadow-sm overflow-hidden",
      ].join(" ")}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => isEnabled && onToggle()}
        disabled={!isEnabled}
        className={[
          "flex w-full items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 text-left transition-colors",
          isOpen
            ? "bg-white"
            : isEnabled
            ? "hover:bg-slate-50/50"
            : "cursor-not-allowed opacity-50",
        ].join(" ")}
      >
        <div className="flex items-center gap-3">
          {/* Icon circle */}
          <span
            className={[
              "flex h-9 w-9 items-center justify-center rounded-full shrink-0",
              isOpen
                ? "bg-[#0A6C74] text-white"
                : isCompleted
                ? "bg-[#E8F6F4] text-[#0A6C74]"
                : "bg-slate-100 text-slate-500",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
          </span>

          {/* Title and description */}
          <div>
            <span
              className={[
                "text-[14px] font-semibold",
                isOpen
                  ? "text-[#100E1C]"
                  : isCompleted
                  ? "text-[#100E1C]"
                  : "text-[#100E1C]",
              ].join(" ")}
            >
              {title}
            </span>
            {description && (
              <p className="text-[12px] text-[#677294] mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {/* Chevron */}
        <span className="text-[#677294]">
          {isOpen ? (
            <FiChevronUp className="h-5 w-5" />
          ) : (
            <FiChevronDown className="h-5 w-5" />
          )}
        </span>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="border-t border-[#ECECEC] px-4 py-5 sm:px-5 sm:py-6">
          {children}
        </div>
      )}
    </div>
  );
};

export default AccordionStep;
