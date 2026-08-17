import React, { useState } from "react";
import PageContainer from "../../../../components/common/PageContainer";
import PageHeader from "../../../../components/common/PageHeader";
import DashboardDateRangePicker from "../../DashboardDateRangePicker";
import { KpiMetricsSection } from "./components/KpiMetricsSection";
import { DashboardCharts } from "./components/DashboardCharts";
import { RecentActivitiesSection } from "./components/RecentActivitiesSection";
import { PerformanceSummarySection } from "./components/PerformanceSummarySection";
import { getCurrentMonthRange } from "./utils";

/**
 * Main SuperAdmin Dashboard Home
 * Displays comprehensive overview of platform performance and metrics
 */
const DashboardHome: React.FC = () => {
  const currentMonthRange = getCurrentMonthRange();

  // State: Date filters
  const [startDate, setStartDate] = useState(currentMonthRange.start);
  const [endDate, setEndDate] = useState(currentMonthRange.end);


  const handleDateChange = (startYmd: string, endYmd: string) => {
    setStartDate(startYmd);
    setEndDate(endYmd);
  };

  return (
    <PageContainer className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your platform performance"
        actions={
          <div className="w-full sm:w-auto">
            <DashboardDateRangePicker
              startYmd={startDate}
              endYmd={endDate}
              isFetching={false}
              onApply={handleDateChange}
            />
          </div>
        }
      />

      {/* Top KPI Metrics */}
      <KpiMetricsSection dateRange={{ startDate, endDate }} />

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column - Large Charts */}
        <div className="space-y-6 xl:col-span-2">
          <DashboardCharts dateRange={{ startDate, endDate }} />
        </div>

        {/* Right Column - Summary & Activities */}
        <div className="space-y-6">
          <PerformanceSummarySection dateRange={{ startDate, endDate }} />
          <RecentActivitiesSection />
        </div>
      </div>
    </PageContainer>
  );
};

export default DashboardHome;
