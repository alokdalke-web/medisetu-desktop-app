import { FiUsers } from "react-icons/fi";
import type { PatientOverviewProps } from "../../../../types/adminDash";
import ArrowUpRight from "../../components/ArrowUpRight";

const PatientOverviewCard = ({
  newPatients,
  returningPatients,
  newDelta,
  returningDelta,
  deltaLabel = "yesterday",
  onViewReport,
}: PatientOverviewProps) => (
  <div className="bg-surface border border-line rounded-2xl shadow-sm dark:shadow-none overflow-hidden relative min-h-[254px] flex flex-col">
    {/* Title */}
    <div className="px-4 sm:px-5 pt-4 sm:pt-5">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-[#e8f4f8] flex items-center justify-center shrink-0 dark:bg-[#172b48]">
          <FiUsers className="h-4 w-4 text-[#2898ff]" />
        </div>
        <h3 className="text-[16px] font-semibold text-text leading-normal">
          Patient Overview{" "}
          <span className="text-[13px] font-normal text-text-muted/70">
            (This Month)
          </span>
        </h3>
      </div>
    </div>

    {/* Content area */}
    <div className="flex-1 grid grid-cols-2 xl:flex xl:flex-row items-center justify-between gap-4 xl:gap-2 px-4 sm:px-5 xl:px-7 py-5 xl:py-0 relative">
      {/* Center: Circle icon (top on mobile, center on larger) */}
      <div className="col-span-2 flex justify-center xl:order-2">
        <div className="h-[48px] w-[48px] sm:h-[56px] sm:w-[56px] xl:h-[72px] xl:w-[72px] 2xl:h-[80px] 2xl:w-[80px] rounded-full bg-[#e8f4f8] flex items-center justify-center shrink-0 dark:bg-[#172b48]">
          <FiUsers className="h-5 w-5 sm:h-6 sm:w-6 xl:h-7 xl:w-7 2xl:h-8 2xl:w-8 text-[#2898ff]" />
        </div>
      </div>

      {/* Left: New Patient */}
      <div className="flex flex-col gap-1 items-center xl:items-start xl:order-1 min-w-0">
        <span className="text-[12px] 2xl:text-[14px] font-normal text-text-muted whitespace-nowrap">
          New Patient
        </span>
        <span className="text-[20px] sm:text-[22px] 2xl:text-[24px] font-semibold text-text leading-[28px]">
          {String(newPatients).padStart(2, "0")}
        </span>
        {typeof newDelta === "number" && (
          <div className="flex items-center gap-1 text-[11px] sm:text-[12px] flex-wrap justify-center xl:justify-start">
            <span className="font-medium text-[#2fae8e] leading-[16px] whitespace-nowrap">
              {newDelta >= 0 ? "↑" : "↓"} {Math.abs(newDelta)}%
            </span>
            <span className="text-text-muted whitespace-nowrap">
              vs
            </span>
            <span className="text-text-muted whitespace-nowrap">
              {deltaLabel}
            </span>
          </div>
        )}
      </div>

      {/* Right: Returning Patients */}
      <div className="flex flex-col gap-1 items-center xl:items-end xl:order-3 min-w-0 text-center xl:text-right">
        <span className="text-[12px] 2xl:text-[14px] font-normal text-text-muted whitespace-nowrap">
          Returning Patients
        </span>
        <span className="text-[20px] sm:text-[22px] 2xl:text-[24px] font-semibold text-text leading-[28px]">
          {String(returningPatients).padStart(2, "0")}
        </span>
        {typeof returningDelta === "number" && (
          <div className="flex items-center gap-1 text-[11px] sm:text-[12px] flex-wrap justify-center xl:justify-end">
            <span className="font-medium text-[#2fae8e] leading-[16px] whitespace-nowrap">
              {returningDelta >= 0 ? "↑" : "↓"} {Math.abs(returningDelta)}%
            </span>
            <span className="text-text-muted whitespace-nowrap">
              vs
            </span>
            <span className="text-text-muted whitespace-nowrap">
              {deltaLabel}
            </span>
          </div>
        )}
      </div>
    </div>

    {/* Footer */}
    <div className="border-t border-line px-5 py-3 flex justify-center">
      <button
        type="button"
        onClick={onViewReport}
        className="cursor-pointer flex items-center gap-2 text-[14px] font-medium text-primary tracking-[-0.3px] hover:gap-3 hover:opacity-80 transition-all duration-200 dark:text-[#9be7dc]"
      >
        View Full Report
        <ArrowUpRight className="text-primary dark:text-[#9be7dc]" />
      </button>
    </div>
  </div>
);

export default PatientOverviewCard;
