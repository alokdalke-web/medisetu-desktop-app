import React from "react";

interface ProfilePageHeaderProps {
  /** Leading icon (e.g. <FiUser className="h-4 w-4" />). Rendered inside a tinted square. */
  icon?: React.ReactNode;
  /** Main page title. */
  title: string;
  /** Optional short description shown below the title. */
  description?: string;
  /** Optional actions (buttons) rendered on the right side of the header. */
  actions?: React.ReactNode;
  /** Whether to render the bottom divider. Defaults to true. */
  divider?: boolean;
  className?: string;
}

/**
 * Shared header for all pages inside the Profile module.
 *
 * Standardizes the title row (icon + title + optional description + optional
 * actions) and the divider so every nested profile route shares the exact
 * same layout, typography, spacing, and dark-mode styling.
 */
const ProfilePageHeader: React.FC<ProfilePageHeaderProps> = ({
  icon,
  title,
  description,
  actions,
  divider = true,
  className = "",
}) => {
  return (
    <>
      <div
        className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15 dark:text-[#9be7dc]">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold leading-tight text-slate-900 dark:text-white sm:text-[18px]">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[13px] leading-snug text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {divider && (
        <div className="h-px w-full bg-slate-100 dark:bg-[#273244]" />
      )}
    </>
  );
};

export default ProfilePageHeader;
