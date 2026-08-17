import type { ReactNode } from "react";
import type { IconType } from "react-icons";

type PharmacyStatCardProps = {
  title: ReactNode;
  value: ReactNode;
  detail: ReactNode;
  icon: IconType;
  iconBg: string;
  iconColor: string;
  isLoading?: boolean;
  trend?: "increase" | "decrease" | string;
  detailColor?: string;
};

const PharmacyStatCard = ({
  title,
  value,
  detail,
  icon: Icon,
  iconBg,
  iconColor,
  isLoading = false,
  trend,
  detailColor,
}: PharmacyStatCardProps) => {
  const trendColor =
    detailColor ?? (trend === "decrease" ? "text-red-600" : "text-emerald-600");

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none sm:px-4 sm:py-4">
      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left">
        <div className={["grid h-10 w-10 shrink-0 place-items-center rounded-full sm:h-12 sm:w-12", iconBg].join(" ")}>
          <Icon className={["text-lg sm:text-xl", iconColor].join(" ")} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-white sm:text-[13px]">
            {title}
          </p>
          <p className="mt-0.5 text-[18px] font-bold leading-none text-slate-900 dark:text-white sm:text-[24px]">
            {isLoading ? "..." : value}
          </p>
          <p className={["mt-0.5 truncate text-[10px] font-semibold sm:mt-1 sm:text-[12px]", trendColor].join(" ")}>
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PharmacyStatCard;
