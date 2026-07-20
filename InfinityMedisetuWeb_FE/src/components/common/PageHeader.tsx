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
    <div
      className={`flex flex-col gap-4 lg:flex-row sm:items-start sm:justify-between ${className}`}
    >
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
            {" "}
            {title}
          </h2>
          {titleExtra}
        </div>

        {description && (
          <p className="dark:text-white text-slate-500 text-xs 2xl:text-sm mt-1">
            {description}
          </p>
        )}
      </div>

      {actions && <div>{actions}</div>}
    </div>
  );
};

export default PageHeader;
