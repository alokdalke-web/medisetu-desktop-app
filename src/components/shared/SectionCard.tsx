import React from "react";
import type { SectionCardProps } from "../../types/shared/sectionCard";

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6 lg:p-8",
};

const SectionCard: React.FC<SectionCardProps> = ({
  children,
  title,
  description,
  icon,
  action,
  className = "",
  padding = "md",
}) => {
  const hasHeader = Boolean(title || description || action);

  return (
    <div
      className={`rounded-2xl border border-line bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none ${paddingClasses[padding]} ${className}`}
    >
      {hasHeader && (
        <div
          className={`mb-4 flex items-start justify-between gap-3 ${
            padding === "none" ? "p-4 pb-0 sm:p-5 sm:pb-0" : ""
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-[15px] font-semibold text-text">{title}</h3>
              )}
              {description && (
                <p className="mt-0.5 text-[13px] text-text-muted">
                  {description}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default SectionCard;
