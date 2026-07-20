import React from "react";

type InfoRowProps = {
  label: React.ReactNode;
  value?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
};

const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  children,
  icon,
  className,
  valueClassName = "font-medium text-slate-900 text-[9px] md:text-[14px]",
  labelClassName = "text-slate-500",
}) => (
  <div className={className}>
    {icon ? (
      <div className="flex items-center gap-1.5">
        {icon}
        <p className={valueClassName}>{children ?? value}</p>
      </div>
    ) : (
      <p className={valueClassName}>{children ?? value}</p>
    )}
    <p className={labelClassName}>{label}</p>
  </div>
);

export default InfoRow;
