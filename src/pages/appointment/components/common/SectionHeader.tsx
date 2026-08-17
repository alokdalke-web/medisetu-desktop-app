import React from "react";

type SectionHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  className = "min-w-0",
  titleClassName = "text-sm font-semibold text-slate-900",
  subtitleClassName = "text-xs text-slate-500",
}) => (
  <div className={className}>
    <p className={titleClassName}>{title}</p>
    {subtitle !== undefined && <p className={subtitleClassName}>{subtitle}</p>}
  </div>
);

export default SectionHeader;