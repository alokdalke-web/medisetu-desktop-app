import {
  FiMessageSquare,
  FiUsers,
  FiLock,
  FiArrowRight,
} from "react-icons/fi";
import type { PlanLimitsUsageInsights } from "../../../../redux/api/planLimitsApi";

interface UsageInsightsProps {
  insights?: PlanLimitsUsageInsights;
}

const clampPercentage = (value?: number) => Math.max(0, Math.min(100, value ?? 0));

export default function UsageInsights({ insights }: UsageInsightsProps) {
  const insightItems = [
    {
      title: "WhatsApp Messages",
      value: clampPercentage(insights?.whatsappUsageReachedLimit),
      color: "bg-amber-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      icon: <FiMessageSquare size={14} />,
    },
    {
      title: "Doctor Accounts",
      value: clampPercentage(insights?.doctorAccountsReachedLimit),
      color: "bg-blue-500",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      icon: <FiUsers size={14} />,
    },
    {
      title: "Storage Retention",
      value: clampPercentage(insights?.storageReachedLimit),
      color: "bg-violet-500",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-500",
      icon: <FiLock size={14} />,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-3 2xl:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm 2xl:text-lg font-semibold text-slate-900">
            Usage Insights
          </h3>

          <span className="text-xs 2xl:text-sm text-slate-500">
            Last 30 Days
          </span>
        </div>

        <div className="space-y-6">
          {insightItems.map((item) => (
            <div key={item.title}>
              <div className="flex gap-4">
                <div
                  className={`flex 2xl:h-10 2xl:w-10 h-6 w-6  shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}
                >
                  <span className={item.iconColor}>
                    {item.icon}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">
                        {item.title}
                      </p>

                      <p className="text-xs text-slate-500 ">
                        {item.value}% clinics reached limit
                      </p>
                    </div>

                    <span className="text-xs font-medium text-slate-600">
                      {item.value}%
                    </span>
                  </div>

                  <div className="h-1 2xl:h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 px-6 py-4">
        <button className="flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900">
          View detailed analytics
          <FiArrowRight />
        </button>
      </div>
    </div>
  );
}
