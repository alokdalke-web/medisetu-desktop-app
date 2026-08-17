import React from "react";
import { Spinner } from "@heroui/react";

import PageContainer from "../../components/common/PageContainer";
import PageHeader from "../../components/common/PageHeader";
import OverviewStats from "./components/OverviewStats";
import PatientCommunicationTab from "./components/PatientCommunicationTab";
import RemindersTab from "./components/RemindersTab";
import { NOTIFICATION_EVENTS } from "./constants";
import { useNotificationSettings } from "./hooks/useNotificationSettings";

/**
 * Two sections stacked rather than tabbed: with Templates gone there are only
 * channels and reminders left, and each is short enough to read at a glance —
 * tabs were hiding half a screen of content behind a click.
 */
const SectionCard: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5 dark:shadow-none">
    <div className="mb-4">
      <h3 className="text-[15px] font-semibold text-text sm:text-[16px]">
        {title}
      </h3>
      <p className="mt-0.5 text-xs text-text-muted 2xl:text-sm">{description}</p>
    </div>
    {children}
  </section>
);

const NotificationSettings: React.FC = () => {
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
    <PageContainer className="mx-auto w-full space-y-5">
      <PageHeader
        title="Notification Configuration"
        description="Manage how patients are contacted and when appointment reminders go out."
      />

      <OverviewStats
        totalEvents={NOTIFICATION_EVENTS.length}
        activeChannels={activeChannels}
        connectedProviders={3}
        templates={0}
      />

      <SectionCard
        title="Communication Channels"
        description="Enable or disable each channel independently. Disabled channels send nothing, whatever the reminder settings say."
      >
        <PatientCommunicationTab
          channelToggles={channelToggles}
          onToggle={handleToggleChannel}
          onSave={handleSaveChannels}
          isSaving={isSaving}
          isDisabled={isFreePlan}
        />
      </SectionCard>

      <SectionCard
        title="Reminders"
        description="Set how far ahead appointment reminders are sent, and when patients are told a doctor is running late."
      >
        <RemindersTab />
      </SectionCard>
    </PageContainer>
  );
};

export default NotificationSettings;
