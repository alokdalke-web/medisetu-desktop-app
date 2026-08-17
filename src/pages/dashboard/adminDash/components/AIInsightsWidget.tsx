import { IoAlertCircleOutline } from "react-icons/io5";
import { LuBrain } from "react-icons/lu";
import type { AIInsightsWidgetProps } from "../../../../types/adminDash";

const INSIGHT_PREVIEW_ITEMS = [
  {
    id: "fever",
    iconBg: "bg-[#fff0f0] dark:bg-[#332022]",
    iconColor: "text-[#e5484d]",
  },
  {
    id: "patients",
    iconBg: "bg-[#eef6ff] dark:bg-[#17263d]",
    iconColor: "text-[#3b82f6]",
  },
  {
    id: "billing",
    iconBg: "bg-[#fff7e6] dark:bg-[#332716]",
    iconColor: "text-[#f59e0b]",
  },
];

const AIInsightsWidget = (_props: AIInsightsWidgetProps) => (
  <div className="bg-surface-muted border border-line rounded-2xl p-4 flex flex-col gap-4">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-[#eef1ff] flex items-center justify-center shrink-0 dark:bg-[#1d2440]">
          <LuBrain className="h-5 w-5 text-[#6366f1]" />
        </div>
        <span className="text-[16px] font-semibold text-text">
          AI Insights
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e0f7fa] px-2 py-1 text-[10px] font-semibold leading-none text-primary dark:bg-[#0d2f33] dark:text-[#9be7dc]">
          Coming Soon
        </span>
      </div>
    </div>

    <div className="relative min-h-[164px]">
      <div
        className="flex flex-col gap-1 pointer-events-none select-none blur-[3px]"
        aria-hidden="true"
      >
        {INSIGHT_PREVIEW_ITEMS.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-line rounded-xl p-3 flex items-center gap-2.5 dark:bg-[#0f1728]"
          >
            <div
              className={`h-9 w-9 rounded-full ${item.iconBg} flex items-center justify-center shrink-0`}
            >
              <IoAlertCircleOutline className={`h-4 w-4 ${item.iconColor}`} />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[13px] font-semibold text-text truncate">
                Fever cases are 30% higher
              </span>
              <span className="text-[12px] font-medium text-text-muted">
                compared to last week.
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-3">
        <div className="w-full max-w-[220px] rounded-xl border border-[#d8d4ee] bg-[#f5f1ff] px-4 py-4 text-center shadow-[0_10px_30px_rgba(79,70,229,0.12)] backdrop-blur-sm dark:border-[#3a315b] dark:bg-[#141b2c]/95">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#eef1ff] dark:bg-[#1d2440]">
            <LuBrain className="h-5 w-5 text-[#6366f1]" />
          </div>
          <p className="text-[13px] font-semibold text-[#101828] dark:text-white">
            Coming Soon
          </p>
          <p className="mt-1 text-[11px] font-medium leading-4 text-[#445176] dark:text-[#d7def5]">
            AI-powered insights will be available soon.
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default AIInsightsWidget;
