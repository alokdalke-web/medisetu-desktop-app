import React from "react";
import { Spinner } from "@heroui/react";

import ConfigurationCard from "./components/ConfigurationCard";
import SectionHeader from "./components/SectionHeader";
import LabOverviewCard from "./components/LabOverviewCard";
import PharmacyOverviewCard from "./components/PharmacyOverviewCard";
import ActivityAndAlertsSection from "./components/ActivityAndAlertsSection";
import { useConfigurationData } from "./hooks/useConfigurationData";
import PremiumUpgradeBanner from "../../components/shared/PremiumUpgradeBanner";
import { useIsFreePlan } from "../../hooks/useIsFreePlan";

const Configuration: React.FC = () => {
  const {
    isLoading,
    laboratorySection,
    pharmacySection,
    laboratoryOverviewData,
    pharmacyOverviewData,
    recentLabActivities,
    recentPharmacyActivities,
    pharmaLabActiveUsers,
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
      <div className="mx-auto w-full space-y-8">
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
    <div className="mx-auto w-full space-y-8">
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

      {/* Laboratory and Pharmacy Detailed Overview */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <LabOverviewCard data={laboratoryOverviewData} />
        <PharmacyOverviewCard data={pharmacyOverviewData} />
      </div>

      {/* Activity & Active Users Section */}
      <ActivityAndAlertsSection
        labActivities={recentLabActivities}
        pharmacyActivities={recentPharmacyActivities}
        activeUsers={pharmaLabActiveUsers}
      />
    </div>
  );
};

export default Configuration;
