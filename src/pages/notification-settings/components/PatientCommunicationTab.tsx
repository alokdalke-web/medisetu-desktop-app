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

// Alpha tints, not `bg-{color}-50` — those have no dark remap and glare on a
// dark page (UI_CONVENTIONS.md §2).
const channels = [
  {
    key: "whatsappEnabled" as const,
    title: "WhatsApp",
    description: "Reminders, rescheduling and feedback.",
    icon: <LuMessageCircle className="h-[18px] w-[18px]" />,
    tone: "bg-green-500/10 text-green-600 dark:text-green-400",
    provider: "Meta Business API",
  },
  {
    key: "smsEnabled" as const,
    title: "SMS",
    description: "Text reminders and confirmations.",
    icon: <FiMessageSquare className="h-[18px] w-[18px]" />,
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    provider: "Twilio",
  },
  {
    key: "voiceCallEnabled" as const,
    title: "Voice Calls",
    description: "Automated calls for high-priority appointments.",
    icon: <FiPhone className="h-[18px] w-[18px]" />,
    tone: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    provider: "Twilio Voice",
  },
  {
    key: "emailEnabled" as const,
    title: "Email",
    description: "Detailed notifications with attachments.",
    icon: <FiMail className="h-[18px] w-[18px]" />,
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    provider: "SMTP",
  },
  {
    key: "pushEnabled" as const,
    title: "Push Notification",
    description: "Instant alerts in the patient app.",
    icon: <FiSmartphone className="h-[18px] w-[18px]" />,
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {channels.map((ch) => {
        const isToggleable = ch.key in channelToggles;
        const isEnabled = isToggleable
          ? channelToggles[ch.key as keyof ChannelToggles]
          : false;

        return (
          <div
            key={ch.key}
            className={`flex flex-col justify-between rounded-xl border bg-surface p-4 transition-shadow hover:shadow-sm dark:hover:shadow-none ${
              isEnabled ? "border-primary/40" : "border-line"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${ch.tone}`}
              >
                {ch.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-text">{ch.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted">
                  {ch.description}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${
                    isEnabled ? "bg-success" : "bg-text-subtle"
                  }`}
                />
                <span className="text-[11px] font-medium text-text-muted">
                  {isEnabled ? "Enabled" : "Disabled"}
                </span>
                <span className="truncate text-[10px] text-text-subtle">
                  · {ch.provider}
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
                  aria-label={`${isEnabled ? "Disable" : "Enable"} ${ch.title}`}
                  className="shrink-0 cursor-pointer"
                />
              ) : (
                <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-text-subtle">
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
