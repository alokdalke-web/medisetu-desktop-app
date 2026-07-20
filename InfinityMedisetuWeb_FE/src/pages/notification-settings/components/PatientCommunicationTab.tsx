import React from "react";
import { Switch } from "@heroui/react";
import { FiPhone, FiMessageSquare, FiMail, FiSmartphone } from "react-icons/fi";
import { LuMessageCircle } from "react-icons/lu";

import SectionSaveBar from "./SectionSaveBar";

type ChannelToggles = {
  voiceCallEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
};

type PatientCommunicationTabProps = {
  channelToggles: ChannelToggles;
  onToggle: (channel: keyof ChannelToggles, value: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
  isDisabled?: boolean;
};

const channels = [
  {
    key: "whatsappEnabled" as const,
    title: "WhatsApp",
    description: "Interactive messages for reminders, rescheduling, and feedback.",
    icon: <LuMessageCircle className="text-[18px]" />,
    color: "bg-green-50 text-green-600",
    provider: "Meta Business API",
  },
  {
    key: "smsEnabled" as const,
    title: "SMS",
    description: "Standard text reminders for routine checkups and confirmations.",
    icon: <FiMessageSquare className="text-[18px]" />,
    color: "bg-blue-50 text-blue-600",
    provider: "Twilio",
  },
  {
    key: "voiceCallEnabled" as const,
    title: "Voice Calls",
    description: "Automated calls to confirm high-priority surgery appointments.",
    icon: <FiPhone className="text-[18px]" />,
    color: "bg-purple-50 text-purple-600",
    provider: "Twilio Voice",
  },
  {
    key: "emailEnabled" as const,
    title: "Email",
    description: "Detailed notifications with attachments and receipts.",
    icon: <FiMail className="text-[18px]" />,
    color: "bg-amber-50 text-amber-600",
    provider: "SMTP",
  },
  {
    key: "pushEnabled" as const,
    title: "Push Notification (Patient App)",
    description: "Instant mobile notifications for the patient app.",
    icon: <FiSmartphone className="text-[18px]" />,
    color: "bg-rose-50 text-rose-600",
    provider: "Firebase",
  },
];

const PatientCommunicationTab: React.FC<PatientCommunicationTabProps> = ({
  channelToggles,
  onToggle,
  onSave,
  isSaving,
  isDisabled = false,
}) => (
  <div className="space-y-4">
    <p className="text-[12px] text-slate-500">
      Manage how notifications are delivered to patients. Enable or disable each
      communication channel independently.
    </p>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {channels.map((ch) => {
        const isEnabled =
          ch.key in channelToggles
            ? channelToggles[ch.key as keyof ChannelToggles]
            : false;
        const isToggleable = ch.key in channelToggles;

        return (
          <div
            key={ch.key}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${ch.color}`}
              >
                {ch.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-slate-900">
                  {ch.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  {ch.description}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-1.5 w-1.5 rounded-full ${
                    isEnabled ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                <span className="text-[11px] font-medium text-slate-500">
                  {isEnabled ? "Enabled" : "Disabled"}
                </span>
                <span className="text-[10px] text-slate-400">
                  • {ch.provider}
                </span>
              </div>
              {isToggleable ? (
                <Switch
                  isSelected={isEnabled}
                  onValueChange={(val) =>
                    onToggle(ch.key as keyof ChannelToggles, val)
                  }
                  size="sm"
                  isDisabled={isDisabled}
                  aria-label={`Toggle ${ch.title}`}
                />
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                  Coming Soon
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>

    <SectionSaveBar onSave={onSave} isSaving={isSaving} />
  </div>
);

export default PatientCommunicationTab;
