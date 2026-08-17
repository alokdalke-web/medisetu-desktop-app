import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
  /** Optional element rendered inline next to the title (e.g. FeatureInfoTip) */
  titleExtra?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  className = "",
  actions,
  titleExtra,
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* Title + actions always share one row, even on mobile — actions
          (e.g. a "+ New X" button) must not wrap into their own full-width
          row, which wastes the vertical space mobile screens don't have to
          spare. See UI_REMEDIATION_LOG.md #21. Consumers are responsible for
          keeping their `actions` content itself compact/responsive
          (icon-only under `sm`, full label from `sm` up). */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-[24px] font-semibold leading-tight tracking-tight text-text md:text-[26px]">
            {title}
          </h2>
          {titleExtra}
        </div>

        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {description && (
        <p className="text-text-muted text-xs 2xl:text-sm">
          {description}
        </p>
      )}
    </div>
  );
};

export default PageHeader;
