import React from "react";
import {
  FiPhone,
  FiMessageSquare,
  FiMail,
  FiSmartphone,
  FiSettings,
} from "react-icons/fi";
import { LuMessageCircle } from "react-icons/lu";

type ProviderCard = {
  name: string;
  icon: React.ReactNode;
  color: string;
  provider: string;
  detail: string;
  status: "connected" | "configured" | "disconnected";
};

const providers: ProviderCard[] = [
  {
    name: "WhatsApp",
    icon: <LuMessageCircle className="text-[18px]" />,
    color: "bg-green-50 text-green-600",
    provider: "Meta Business API",
    detail: "+91 98765 XXXXX",
    status: "connected",
  },
  {
    name: "SMS",
    icon: <FiMessageSquare className="text-[18px]" />,
    color: "bg-blue-50 text-blue-600",
    provider: "Twilio",
    detail: "Sender: MEDISETU",
    status: "configured",
  },
  {
    name: "Voice",
    icon: <FiPhone className="text-[18px]" />,
    color: "bg-purple-50 text-purple-600",
    provider: "Twilio Voice",
    detail: "+91 80XXX XXXXX",
    status: "configured",
  },
  {
    name: "Email",
    icon: <FiMail className="text-[18px]" />,
    color: "bg-amber-50 text-amber-600",
    provider: "SMTP",
    detail: "noreply@clinic.com",
    status: "connected",
  },
  {
    name: "Push Notifications",
    icon: <FiSmartphone className="text-[18px]" />,
    color: "bg-rose-50 text-rose-600",
    provider: "Firebase",
    detail: "FCM Project configured",
    status: "configured",
  },
];

const statusStyles: Record<ProviderCard["status"], string> = {
  connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
  configured: "bg-blue-50 text-blue-700 border-blue-200",
  disconnected: "bg-red-50 text-red-700 border-red-200",
};

const statusLabels: Record<ProviderCard["status"], string> = {
  connected: "Connected",
  configured: "Configured",
  disconnected: "Disconnected",
};

const ProviderConfigTab: React.FC = () => (
  <div className="space-y-4">
    <p className="text-[12px] text-slate-500">
      Manage third-party integrations and API credentials for each
      communication channel.
    </p>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {providers.map((p) => (
        <div
          key={p.name}
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${p.color}`}
              >
                {p.icon}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-slate-900">
                  {p.name}
                </p>
                <p className="text-[11px] text-slate-500">{p.provider}</p>
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyles[p.status]}`}
            >
              {statusLabels[p.status]}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-[11px] text-slate-400">{p.detail}</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
              aria-label={`Configure ${p.name}`}
            >
              <FiSettings className="text-[11px]" />
              Configure
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ProviderConfigTab;
