import React from "react";
import { Spinner } from "@heroui/react";

import ConfigurationCard from "./components/ConfigurationCard";
import ConfigurationSummary from "./components/ConfigurationSummary";
import InfoBanner from "./components/InfoBanner";
import QuickAccessCard from "./components/QuickAccessCard";
import RecentActivityCard from "./components/RecentActivityCard";
import SectionHeader from "./components/SectionHeader";
import { useConfigurationData } from "./hooks/useConfigurationData";
import PremiumUpgradeBanner from "../../components/shared/PremiumUpgradeBanner";
import { useIsFreePlan } from "../../hooks/useIsFreePlan";

const Configuration: React.FC = () => {
  const {
    isLoading,
    laboratorySection,
    pharmacySection,
    quickAccessItems,
    recentActivities,
    summaryStats,
  } = useConfigurationData();
  const { isFreePlan } = useIsFreePlan();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // Free plan — show only the banner, hide all data
  if (isFreePlan) {
    return (
      <div className="mx-auto w-full  space-y-8">
        <SectionHeader
          title="Lab & Pharmacy Configuration"
          subtitle="Configure and manage your laboratory and pharmacy settings, departments and master data."
        />
        <PremiumUpgradeBanner
          featureName="Lab & Pharmacy"
          description="Upgrade to Premium to configure and manage your laboratory and pharmacy — including departments, tests, medicines, and billing integrations."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      {/* Page Header */}
      <SectionHeader
        title="Lab & Pharmacy Configuration"
        subtitle="Configure and manage your laboratory and pharmacy settings, departments and master data."
      />

      {/* Configuration Cards — Lab & Pharmacy side by side */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ConfigurationCard section={laboratorySection} />
        <ConfigurationCard section={pharmacySection} />
      </div>

      {/* Quick Access + Recent Activity */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_360px]">
        {/* Quick Access */}
        <section className="space-y-4">
          <h3 className="text-[13px] font-semibold text-default-700 dark:text-default-200">
            Quick Access
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickAccessItems.map((item) => (
              <QuickAccessCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <RecentActivityCard activities={recentActivities} />
      </div>

      {/* Configuration Summary */}
      <ConfigurationSummary title="Configuration Summary" stats={summaryStats} />

      {/* Info Banner */}
      <InfoBanner
        message="All lab tests, packages, medicines, and configuration settings will be used across the system for billing, inventory and reports."
        actionLabel="Learn More"
        onAction={() => { }}
      />
    </div>
  );
};

export default Configuration;
