import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  FiBox,
  FiDatabase,
  FiGrid,
  FiPackage,
  FiTag,
} from "react-icons/fi";
import { MdOutlineBiotech, MdLocalPharmacy } from "react-icons/md";
import React from "react";

import { useGetAllClinicsQuery } from "../../../redux/api/clinicApi";
import { useGetLabsByClinicIdQuery } from "../../../redux/api/labApi";
import { useGetPharmaciesQuery } from "../../../redux/api/pharmacyApi";
import {
  useGetLabPharmacyOverviewQuery,
  useGetLabPharmacyActivitiesUsersQuery,
  useGetLabPharmacyStatsQuery,
} from "../../../redux/api/usersApi";
import type {
  ConfigurationSection,
  LabOverviewData,
  PharmacyOverviewData,
  LabActivityItem,
  PharmacyActivityItem,
  PharmaLabActiveUser,
} from "../types";

export function useConfigurationData() {
  const navigate = useNavigate();

  // --- Data fetching ---
  const { data: clinicRes, isLoading: clinicLoading } =
    useGetAllClinicsQuery(undefined);

  const { data: overviewRes, isLoading: overviewLoading } =
    useGetLabPharmacyOverviewQuery(undefined);

  const { data: activitiesUsersRes, isLoading: activitiesUsersLoading } =
    useGetLabPharmacyActivitiesUsersQuery(undefined);

  const clinicId = useMemo(() => {
    const d: any = clinicRes;
    const id =
      d?.clinic?.id ||
      d?.clinic?._id ||
      d?.result?.clinic?.id ||
      d?.result?.clinic?._id ||
      "";
    return id.toString();
  }, [clinicRes]);

  const { data: labsRes, isLoading: labsLoading } = useGetLabsByClinicIdQuery(
    clinicId,
    { skip: !clinicId },
  );

  const { data: pharmacyRes, isLoading: pharmacyLoading } =
    useGetPharmaciesQuery({ page: 1, pageSize: 50 });

  const { data: statsRes, isLoading: statsLoading } = useGetLabPharmacyStatsQuery(undefined);

  // --- Derived data ---
  const labs = useMemo(() => {
    const arr = labsRes ?? [];
    return arr.filter((x: any) => x?.deletedAt == null);
  }, [labsRes]);

  const pharmacies = useMemo(
    () => pharmacyRes?.pharmacies ?? [],
    [pharmacyRes],
  );

  const statsData = statsRes?.data ?? {};
  const apiTotalDepartments = statsData.totalDepartments ?? 0;
  const apiTotalCompletedTests = statsData.totalCompletedTests ?? 0;
  const apiTotalSales = statsData.totalSales ?? 0;
  const apiTotalSuppliers = statsData.totalSuppliers ?? 0;

  // Get the first (primary) lab and pharmacy IDs for direct navigation
  const primaryLabId = useMemo(() => {
    if (labs.length === 0) return null;
    const lab: any = labs[0];
    return (lab?.id || lab?._id || "").toString();
  }, [labs]);

  const primaryPharmacyId = useMemo(() => {
    if (pharmacies.length === 0) return null;
    return pharmacies[0]?.id ?? null;
  }, [pharmacies]);

  const isLoading = clinicLoading || labsLoading || pharmacyLoading || overviewLoading || activitiesUsersLoading || statsLoading;

  // --- Navigation helpers ---
  const goToLab = useCallback(() => {
    if (primaryLabId) {
      navigate(`/configuration/labs/${primaryLabId}`);
    } else {
      navigate("/configuration/lab");
    }
  }, [primaryLabId, navigate]);

  const goToPharmacy = useCallback(() => {
    if (primaryPharmacyId) {
      navigate(`/configuration/pharmacy/${primaryPharmacyId}`);
    } else {
      navigate("/configuration/pharmacy");
    }
  }, [primaryPharmacyId, navigate]);

  // --- Laboratory Section ---
  const laboratorySection: ConfigurationSection = useMemo(
    () => ({
      id: "laboratory",
      title: "Laboratory",
      description:
        "Manage lab departments, tests, price lists, and related settings.",
      status: labs.length > 0 ? "active" : "inactive",
      icon: React.createElement(MdOutlineBiotech, { className: "text-[22px]" }),
      iconBgClass: "bg-teal-50",
      iconTextClass: "text-teal-600",
      stats: [
        {
          label: "Departments",
          value: apiTotalDepartments || (labs.length > 0 ? "—" : 0),
          icon: React.createElement(FiGrid, { className: "text-[14px]" }),
        },
        {
          label: "Completed Tests",
          value: apiTotalCompletedTests || (labs.length > 0 ? "—" : 0),
          icon: React.createElement(FiDatabase, { className: "text-[14px]" }),
        },
        {
          label: "Status",
          value: labs.length > 0 ? "Active" : "Not Set",
          icon: React.createElement(FiPackage, { className: "text-[14px]" }),
        },
      ],
      actionLabel: "Manage Laboratory",
      onAction: goToLab,
    }),
    [labs, apiTotalDepartments, apiTotalCompletedTests, goToLab],
  );

  // --- Pharmacy Section ---
  const pharmacySection: ConfigurationSection = useMemo(
    () => ({
      id: "pharmacy",
      title: "Pharmacy",
      description:
        "Manage medicine categories, products, suppliers, and pricing.",
      status: pharmacies.length > 0 ? "active" : "inactive",
      icon: React.createElement(MdLocalPharmacy, { className: "text-[22px]" }),
      iconBgClass: "bg-emerald-50",
      iconTextClass: "text-emerald-600",
      stats: [
        {
          label: "Total Sales",
          value: apiTotalSales || (pharmacies.length > 0 ? "—" : 0),
          icon: React.createElement(FiTag, { className: "text-[14px]" }),
        },
        {
          label: "Total Suppliers",
          value: apiTotalSuppliers || (pharmacies.length > 0 ? "—" : 0),
          icon: React.createElement(FiBox, { className: "text-[14px]" }),
        },
        {
          label: "Status",
          value: pharmacies.length > 0 ? "Active" : "Not Set",
          icon: React.createElement(FiPackage, { className: "text-[14px]" }),
        },
      ],
      actionLabel: "Manage Pharmacy",
      onAction: goToPharmacy,
    }),
    [pharmacies, apiTotalSales, apiTotalSuppliers, goToPharmacy],
  );

  const laboratoryOverviewData: LabOverviewData = useMemo(() => {
    const apiData = overviewRes?.data?.laboratoryOverview;
    return {
      totalTests: apiData?.totalMonthTests ?? 128,
      testsToday: apiData?.testsToday ?? 18,
      revenue: apiData?.revenue ?? 24560,
      pendingReports: apiData?.pendingReports ?? 7,
      topCategories: (apiData?.topTest ?? [
        { name: "CBC", percentage: 36, color: "#3B82F6" },
        { name: "RBC", percentage: 28, color: "#10B981" },
        { name: "Urine Test", percentage: 18, color: "#06B6D4" },
        { name: "LFT", percentage: 10, color: "#F59E0B" },
        { name: "KFT", percentage: 8, color: "#6B7280" }
      ]).map((item: any) => ({
        name: item.name,
        percentage: Number(item.percentage) || 0,
        color: item.color || "#6B7280",
      })),
      statusOverview: (apiData?.statusOverview ?? [
        { label: "Completed", value: 76, percentage: 59, color: "#10B981" },
        { label: "Pending", value: 28, percentage: 22, color: "#F59E0B" },
        { label: "In Progress", value: 17, percentage: 13, color: "#3B82F6" },
        { label: "Rejected", value: 7, percentage: 6, color: "#EF4444" }
      ]).map((item: any) => ({
        label: item.label,
        value: Number(item.value) || 0,
        percentage: Number(item.percentage) || 0,
        color: item.color || "#6B7280",
      })),
    };
  }, [overviewRes]);

  const pharmacyOverviewData: PharmacyOverviewData = useMemo(() => {
    const apiData = overviewRes?.data?.pharmacyOverview;
    return {
      totalStockItems: apiData?.totalStockItems ?? 35,
      lowStockItems: apiData?.lowStockItems ?? 6,
      stockValue: apiData?.stockValue ?? 125430,
      expiringSoon: apiData?.expiringSoon ?? 4,
      stockStatus: (apiData?.stockStatus ?? [
        { label: "Good Stock", value: 20, percentage: 57, color: "#10B981" },
        { label: "Medium Stock", value: 6, percentage: 17, color: "#F59E0B" },
        { label: "Low Stock", value: 3, percentage: 9, color: "#EF4444" },
        { label: "Out of Stock", value: 6, percentage: 17, color: "#6B7280" }
      ]).map((item: any) => ({
        label: item.label,
        value: Number(item.value) || 0,
        percentage: Number(item.percentage) || 0,
        color: item.color || "#6B7280",
      })),
      topCategories: (apiData?.topCategories ?? [
        { name: "Antibiotics", percentage: 40, color: "#3B82F6" },
        { name: "Pain Relief", percentage: 25, color: "#10B981" },
        { name: "Vitamins", percentage: 15, color: "#06B6D4" },
        { name: "Antacids", percentage: 10, color: "#F59E0B" },
        { name: "Others", percentage: 10, color: "#6B7280" }
      ]).map((item: any) => ({
        name: item.name,
        percentage: Number(item.percentage) || 0,
        color: item.color || "#6B7280",
      })),
    };
  }, [overviewRes]);

  const recentLabActivities: LabActivityItem[] = useMemo(() => {
    const apiList = activitiesUsersRes?.data?.recentLabActivities;
    if (!apiList || apiList.length === 0) {
      return [];
    }
    return apiList.map((item: any) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      status: item.status,
      timestamp: item.timestamp,
      iconColor: item.iconColor || "text-purple-500 bg-purple-50 border border-purple-100",
    }));
  }, [activitiesUsersRes]);

  const recentPharmacyActivities: PharmacyActivityItem[] = useMemo(() => {
    const apiList = activitiesUsersRes?.data?.recentPharmacyActivities;
    if (!apiList || apiList.length === 0) {
      return [];
    }
    return apiList.map((item: any) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      status: item.status,
      timestamp: item.timestamp,
      iconColor: item.iconColor || "text-emerald-500 bg-emerald-50 border border-emerald-100",
    }));
  }, [activitiesUsersRes]);

  const pharmaLabActiveUsers: PharmaLabActiveUser[] = useMemo(() => {
    const apiList = activitiesUsersRes?.data?.pharmaLabActiveUsers;
    if (!apiList || apiList.length === 0) {
      return [];
    }
    return apiList.map((item: any) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      mobile: item.mobile,
      createdAt: item.createdAt,
      status: item.status || "Active",
    }));
  }, [activitiesUsersRes]);

  return {
    isLoading,
    laboratorySection,
    pharmacySection,
    laboratoryOverviewData,
    pharmacyOverviewData,
    recentLabActivities,
    recentPharmacyActivities,
    pharmaLabActiveUsers,
  };
}
