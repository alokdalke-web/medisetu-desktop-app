import React from "react";

interface SectionCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

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
  className = "",
  padding = "md",
}) => {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none ${paddingClasses[padding]} ${className}`}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-[13px] text-slate-500 mt-0.5 dark:text-slate-400">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default SectionCard;
