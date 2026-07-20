import React, { useState } from "react";
import { Spinner, Tab, Tabs } from "@heroui/react";
import { FiBell, FiMessageSquare, FiFileText } from "react-icons/fi";

import OverviewStats from "./components/OverviewStats";
import PatientCommunicationTab from "./components/PatientCommunicationTab";
import TemplatesTab from "./components/TemplatesTab";
import RemindersTab from "./components/RemindersTab";
import { NOTIFICATION_EVENTS, NOTIFICATION_TEMPLATES } from "./constants";
import { useNotificationSettings } from "./hooks/useNotificationSettings";

type TabKey = "patient" | "reminders" | "templates";

const NotificationSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("patient");

  const {
    isLoading,
    isSaving,
    isFreePlan,
    channelToggles,
    handleToggleChannel,
    handleSaveChannels,
  } = useNotificationSettings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeChannels = Object.values(channelToggles).filter(Boolean).length;

  return (
    <div className="mx-auto w-full space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
          {" "}
          Notification Configuration
        </h2>
        <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          Manage communication channels, reminders, and message templates.
        </p>
      </div>

      {/* Overview Stats */}
      <OverviewStats
        totalEvents={NOTIFICATION_EVENTS.length}
        activeChannels={activeChannels}
        connectedProviders={3}
        templates={NOTIFICATION_TEMPLATES.length}
      />

      {/* Tabbed Navigation */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as TabKey)}
        variant="underlined"
        aria-label="Notification configuration sections"
        classNames={{
          base: "w-full",
          tabList:
            "w-full rounded-none bg-transparent p-0 border-b border-slate-200 " +
            "flex flex-nowrap gap-0 sm:gap-2 overflow-x-auto",
          tab:
            "group rounded-none bg-transparent px-2 sm:px-3 py-2.5 h-11 " +
            "min-w-fit " +
            "data-[hover=true]:bg-transparent " +
            "text-slate-500 hover:text-slate-900 " +
            "data-[selected=true]:text-primary transition-colors",
          tabContent:
            "font-medium text-[12px] sm:text-[13px] text-inherit " +
            "group-data-[selected=true]:text-inherit whitespace-nowrap",
          cursor: "bg-primary h-[2px] rounded-none shadow-none",
          panel: "pt-5 px-0",
        }}
      >
        <Tab
          key="patient"
          title={
            <span className="flex items-center gap-1.5">
              <FiMessageSquare className="text-[14px] shrink-0" />
              <span className="hidden sm:inline">Communication Channels</span>
              <span className="sm:hidden">Channels</span>
            </span>
          }
        >
          <PatientCommunicationTab
            channelToggles={channelToggles}
            onToggle={handleToggleChannel}
            onSave={handleSaveChannels}
            isSaving={isSaving}
            isDisabled={isFreePlan}
          />
        </Tab>
        <Tab
          key="reminders"
          title={
            <span className="flex items-center gap-1.5">
              <FiBell className="text-[14px] shrink-0" />
              <span>Reminders</span>
            </span>
          }
        >
          <RemindersTab />
        </Tab>
        <Tab
          key="templates"
          title={
            <span className="flex items-center gap-1.5">
              <FiFileText className="text-[14px] shrink-0" />
              <span>Templates</span>
            </span>
          }
        >
          <TemplatesTab />
        </Tab>
      </Tabs>
    </div>
  );
};

export default NotificationSettings;
