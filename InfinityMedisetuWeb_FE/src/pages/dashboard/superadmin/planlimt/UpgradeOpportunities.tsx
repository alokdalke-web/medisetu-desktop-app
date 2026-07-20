import {
  FiUsers,
  FiUserPlus,
  FiLock,
  FiArrowRight,
} from "react-icons/fi";
import type { PlanLimitsUpgradeOpportunities } from "../../../../redux/api/planLimitsApi";

interface UpgradeOpportunitiesProps {
  opportunities?: PlanLimitsUpgradeOpportunities;
}

export default function UpgradeOpportunities({ opportunities }: UpgradeOpportunitiesProps) {
  const opportunityItems = [
    {
      count: opportunities?.whatsappLimitReachedClinics ?? 0,
      text: "reached WhatsApp limit",
      icon: <FiUsers size={14} />,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
    {
      count: opportunities?.doctorAccountUpgradeNeededClinics ?? 0,
      text: "need more doctor accounts",
      icon: <FiUserPlus size={14} />,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-500",
    },
    {
      count: opportunities?.storageUpgradeNeededClinics ?? 0,
      text: "need more storage",
      icon: <FiLock size={14} />,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-6">
        <h3 className="mb-6 2xl:text-lg text-sm font-semibold text-slate-900">
          Upgrade Opportunities
        </h3>

        <div className="space-y-5">
          {opportunityItems.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-4"
            >
              <div
                className={`flex 2xl:h-10 2xl:w-10 h-6 w-6 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}
              >
                <span className={item.iconColor}>
                  {item.icon}
                </span>
              </div>

              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  {item.count} Clinics
                </p>

                <p className="text-xs text-slate-500">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 px-6 py-4">
        <button className="flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900">
          View all opportunities
          <FiArrowRight />
        </button>
      </div>
    </div>
  );
}
