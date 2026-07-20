import React from "react";
import { Switch } from "@heroui/react";
import {
  LuCalendar, LuCalendarClock, LuCalendarCheck, LuCalendarX,
  LuUserMinus, LuCreditCard, LuFlaskConical, LuClipboardList,
  LuUpload, LuFileText, LuUserPlus, LuBellRing, LuLock,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import type { PreferenceSetting, ResolvedPreferences } from "../../../redux/api/settingApi";
import type { NotificationCategory, NotificationEvent } from "../types";
import { INTERNAL_CATEGORIES } from "../constants";
import CollapsibleSection from "./CollapsibleSection";
import SectionSaveBar from "./SectionSaveBar";

type InternalNotificationsTabProps = {
  eventsByCategory: Record<NotificationCategory, NotificationEvent[]>;
  preferences: ResolvedPreferences | null;
  onToggle: (channel: "inApp" | "push", key: string, value: boolean) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  isFetchingDefaults: boolean;
};

const EVENT_ICONS: Record<string, IconType> = {
  appointment_created: LuCalendar,
  appointment_rescheduled: LuCalendarClock,
  appointment_confirmed: LuCalendarCheck,
  appointment_canceled: LuCalendarX,
  appointment_no_show: LuUserMinus,
  payment_received: LuCreditCard,
  test_assigned_to_lab: LuFlaskConical,
  test_log_created: LuClipboardList,
  test_report_uploaded: LuUpload,
  pdf_ready: LuFileText,
  user_created: LuUserPlus,
};

const EventRow: React.FC<{
  event: NotificationEvent;
  inApp?: PreferenceSetting;
  push?: PreferenceSetting;
  onToggle: (channel: "inApp" | "push", key: string, value: boolean) => void;
}> = ({ event, inApp, push, onToggle }) => {
  const Icon = EVENT_ICONS[event.key] ?? LuBellRing;
  return (
    <div className="grid grid-cols-[1fr_60px_60px] items-center gap-2 py-2.5 sm:grid-cols-[1fr_72px_72px]">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={14} className="shrink-0 text-slate-400" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-slate-800 truncate">
              {event.name}
            </span>
            {((inApp && !inApp.configurable) || (push && !push.configurable)) && (
              <LuLock size={9} className="shrink-0 text-slate-300" />
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate">{event.description}</p>
        </div>
      </div>
      <div className="flex justify-center">
        {inApp ? (
          <Switch
            isSelected={inApp.enabled}
            onValueChange={(val) => onToggle("inApp", event.key, val)}
            size="sm"
            isDisabled={!inApp.configurable}
            aria-label={`In-app for ${event.name}`}
          />
        ) : <span className="text-[10px] text-slate-300">—</span>}
      </div>
      <div className="flex justify-center">
        {push ? (
          <Switch
            isSelected={push.enabled}
            onValueChange={(val) => onToggle("push", event.key, val)}
            size="sm"
            isDisabled={!push.configurable}
            aria-label={`Push for ${event.name}`}
          />
        ) : <span className="text-[10px] text-slate-300">—</span>}
      </div>
    </div>
  );
};

const InternalNotificationsTab: React.FC<InternalNotificationsTabProps> = ({
  eventsByCategory,
  preferences,
  onToggle,
  onSave,
  onReset,
  isSaving,
  isFetchingDefaults,
}) => (
  <div className="space-y-3">
    <p className="text-[12px] text-slate-500">
      Notifications received by clinic staff. Expand a category to configure
      In-App and Push delivery per event.
    </p>

    {INTERNAL_CATEGORIES.map((category) => {
      const events = eventsByCategory[category.id] ?? [];
      if (events.length === 0) return null;

      return (
        <CollapsibleSection
          key={category.id}
          icon={<LuBellRing size={16} />}
          title={category.title}
          badge={`${events.length}`}
          description={`${events.length} notification events`}
          defaultOpen={category.id === "appointments"}
        >
          {/* Column labels */}
          <div className="grid grid-cols-[1fr_60px_60px] gap-2 pb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400 sm:grid-cols-[1fr_72px_72px]">
            <div>Event</div>
            <div className="text-center">In-App</div>
            <div className="text-center">Push</div>
          </div>
          <div className="divide-y divide-slate-50">
            {events.map((event) => (
              <EventRow
                key={event.key}
                event={event}
                inApp={preferences?.inApp?.[event.key]}
                push={preferences?.push?.[event.key]}
                onToggle={onToggle}
              />
            ))}
          </div>
        </CollapsibleSection>
      );
    })}

    <SectionSaveBar
      onSave={onSave}
      onReset={onReset}
      isSaving={isSaving}
      isResetting={isFetchingDefaults}
      resetLabel="Reset to Defaults"
    />
  </div>
);

export default InternalNotificationsTab;
