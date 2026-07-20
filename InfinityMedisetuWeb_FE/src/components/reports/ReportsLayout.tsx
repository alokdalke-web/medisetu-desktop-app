import React, { useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { Button } from "@heroui/react";
import { FiDownload } from "react-icons/fi";
import FeatureInfoTip from "../shared/FeatureInfoTip";
import PremiumUpgradeBanner from "../shared/PremiumUpgradeBanner";
import { reportsTips } from "../../constants/featureTips";
import { useIsFreePlan } from "../../hooks/useIsFreePlan";

interface ReportsLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  /** Optional: override export handler */
  onExport?: () => void;
}

const tabs: {
  key: string;
  label: string;
  path: string;
  comingSoon?: boolean;
}[] = [
  { key: "overview", label: "Overview", path: "/reports" },
  { key: "patients", label: "Patients", path: "/reports/patients" },
  { key: "appointments", label: "Appointments", path: "/reports/appointments" },
  {
    key: "medicines",
    label: "Medicines",
    path: "/reports/medicines",
    comingSoon: true,
  },
  {
    key: "revenue",
    label: "Revenue",
    path: "/reports/revenue",
    comingSoon: true,
  },
  { key: "staff", label: "Staff", path: "/reports/staff", comingSoon: true },
  {
    key: "custom",
    label: "Custom Reports",
    path: "/reports/custom",
    comingSoon: true,
  },
];

const ReportsLayout: React.FC<ReportsLayoutProps> = ({
  children,
  title,
  subtitle,
  onExport,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isFreePlan } = useIsFreePlan();

  const getActiveTab = () => {
    const currentPath = location.pathname;
    const activeTab = tabs.find((tab) => tab.path === currentPath);
    return activeTab?.key || "overview";
  };

  const handleTabChange = (key: string) => {
    const tab = tabs.find((t) => t.key === key);
    if (!tab) return;
    navigate(tab.path);
  };

  const handleExport = useCallback(() => {
    if (onExport) {
      onExport();
      return;
    }
    window.print();
  }, [onExport]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header — stacks on mobile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
              {" "}
              {title}
            </h2>
            <FeatureInfoTip
              title="Report Tips"
              tips={reportsTips}
              guideSection="reports-guide"
              linkLabel="Read reports guide"
            />
          </div>
          <p className="text-[12px] sm:text-[13px] text-[#677294] mt-0.5 dark:text-white/70">
            {subtitle}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            className="bg-[#0a6c74] text-white text-[13px]"
            startContent={<FiDownload className="h-3.5 w-3.5" />}
            size="sm"
            onPress={handleExport}
            isDisabled={isFreePlan}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Tab Navigation — horizontal scroll on mobile */}
      <div className="-mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pt-4 pb-2 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = getActiveTab() === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`relative px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-[12px] sm:text-[13px] whitespace-nowrap transition-all duration-200 shrink-0 ${
                  isActive
                    ? "bg-[#0a6c74] text-white shadow-sm"
                    : "bg-white text-[#677294] hover:bg-[#f8f9fb] border border-[rgba(229,231,234,0.6)] dark:bg-[#111726] dark:border-[#273244] dark:text-white dark:hover:bg-[#172033]"
                }`}
              >
                {tab.label}
                {tab.comingSoon && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-[#f59e0b] text-white text-[8px] sm:text-[9px] font-semibold rounded-md leading-none shadow-sm z-10">
                    Preview
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 sm:space-y-5">
        {isFreePlan ? (
          <PremiumUpgradeBanner
            featureName="Reports & Analytics"
            description="Upgrade to Premium to unlock advanced clinic reports, custom report builder, scheduled delivery, and detailed revenue and patient analytics."
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default ReportsLayout;
