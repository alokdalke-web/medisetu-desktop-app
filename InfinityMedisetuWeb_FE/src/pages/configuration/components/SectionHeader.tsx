import React from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  size?: "default" | "large";
};

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  size: _size = "large",
}) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 className="text-xl font-bold leading-tight tracking-tight text-default-900 dark:text-white">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-[13px] text-default-400">
          {subtitle}
        </p>
      )}
    </div>
    {action && <div className="mt-2 sm:mt-0">{action}</div>}
  </div>
);

export default SectionHeader;
