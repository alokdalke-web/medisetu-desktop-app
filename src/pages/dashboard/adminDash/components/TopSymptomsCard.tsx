import { FiActivity, FiUsers } from "react-icons/fi";
import type { SymptomBarProps } from "../../../../types/adminDash";
import ArrowUpRight from "../../components/ArrowUpRight";

const TopSymptomsCard = ({ symptoms, onViewReport }: SymptomBarProps) => (
  <div className="bg-surface border border-line rounded-2xl p-4 @2xl:p-5 shadow-sm dark:shadow-none flex flex-col h-full">
    <div className="flex items-center gap-2 mb-5">
      <div className="h-7 w-7 rounded-full bg-[#e6fbf7] flex items-center justify-center shrink-0 dark:bg-[#16352f]">
        <FiUsers className="h-4 w-4 text-primary dark:text-[#9be7dc]" />
      </div>
      <h3 className="text-[16px] font-semibold text-text">
        Top Symptoms{" "}
        <span className="text-[13px] font-normal text-text-muted/70">
          (This Week)
        </span>
      </h3>
    </div>
    {/* `justify-center`: with one or two symptoms the list would otherwise pin
        to the top of a stretched card and leave a visible void beneath it. */}
    <div className="flex flex-col justify-center gap-5 flex-1">
      {symptoms.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="h-10 w-10 rounded-full bg-surface-muted flex items-center justify-center">
            <FiActivity className="h-5 w-5 text-text-subtle" />
          </div>
          <p className="text-[13px] font-medium text-text-muted">
            No symptoms recorded yet
          </p>
          <p className="text-[12px] text-text-subtle max-w-[220px]">
            Symptoms logged on this week's appointments will be ranked here.
          </p>
        </div>
      ) : (
        symptoms.slice(0, 4).map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[13px] text-text w-[72px] shrink-0">
              {s.name}
            </span>
            <div className="flex-1 h-1 bg-line rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, s.percent)}%` }}
              />
            </div>
            <span className="text-[12px] text-text-muted shrink-0">
              {s.count} ({s.percent}%)
            </span>
          </div>
        ))
      )}
    </div>
    {/* Footer */}
    <div className="border-t border-line mt-5 pt-3 flex justify-center">
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

export default TopSymptomsCard;
