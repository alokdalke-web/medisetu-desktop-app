import React from "react";
import {
  FiGlobe,
  FiClock,
  FiRepeat,
  FiMoon,
  FiMessageCircle,
  FiZap,
} from "react-icons/fi";

type RuleItem = {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  color: string;
};

const rules: RuleItem[] = [
  {
    icon: <FiMessageCircle className="text-[14px]" />,
    label: "Preferred Channel",
    value: "WhatsApp",
    description: "Primary channel for outgoing patient messages.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: <FiRepeat className="text-[14px]" />,
    label: "Fallback Order",
    value: "SMS → Email → Push",
    description: "Channels tried if the preferred one fails.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: <FiZap className="text-[14px]" />,
    label: "Retry Attempts",
    value: "3 retries",
    description: "Number of delivery retry attempts before giving up.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: <FiMoon className="text-[14px]" />,
    label: "Quiet Hours",
    value: "10:00 PM – 7:00 AM",
    description: "No notifications sent during these hours.",
    color: "bg-slate-100 text-slate-600",
  },
  {
    icon: <FiGlobe className="text-[14px]" />,
    label: "Language",
    value: "English",
    description: "Default language for notification templates.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: <FiClock className="text-[14px]" />,
    label: "Delivery Timeout",
    value: "30 seconds",
    description: "Max wait time before marking delivery as failed.",
    color: "bg-rose-50 text-rose-600",
  },
];

const DeliveryRulesTab: React.FC = () => (
  <div className="space-y-4">
    <p className="text-[12px] text-slate-500">
      Global notification behavior applied system-wide. Override per template or
      event where needed.
    </p>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rules.map((rule) => (
        <div
          key={rule.label}
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${rule.color}`}
          >
            {rule.icon}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500">{rule.label}</div>
            <div className="text-[14px] font-semibold text-slate-800">
              {rule.value}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
              {rule.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default DeliveryRulesTab;
