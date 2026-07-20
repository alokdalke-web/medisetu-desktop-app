import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  FiBox,
  FiDatabase,
  FiGrid,
  FiLayers,
  FiPackage,
  FiTag,
  FiUsers,
} from "react-icons/fi";
import { MdOutlineBiotech, MdLocalPharmacy, MdOutlineMedication } from "react-icons/md";
import React from "react";

import { useGetAllClinicsQuery } from "../../../redux/api/clinicApi";
import {
  useGetLabsByClinicIdQuery,
  useGetLabTestsQuery,
  useGetLabDepartmentsQuery,
} from "../../../redux/api/labApi";
import { useGetPharmaciesQuery } from "../../../redux/api/pharmacyApi";
import { useGetMedicinesQuery } from "../../../redux/api/medicineApi";
import type {
  ActivityItem,
  ConfigurationSection,
  ConfigurationStat,
  QuickAccessItem,
} from "../types";

export function useConfigurationData() {
  const navigate = useNavigate();

  // --- Data fetching ---
  const { data: clinicRes, isLoading: clinicLoading } =
    useGetAllClinicsQuery(undefined);

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

  // Fetch lab tests (paginated — we only need the count from pagination metadata)
  const { data: labTestsRes } = useGetLabTestsQuery(
    { page: 1, limit: 1 },
    { skip: !clinicId },
  );

  // Fetch lab departments for accurate count
  const { data: labDepartmentsRes } = useGetLabDepartmentsQuery(undefined, {
    skip: !clinicId,
  });

  // Fetch medicines for total count
  const { data: medicinesRes } = useGetMedicinesQuery(undefined);

  // --- Derived data ---
  const labs = useMemo(() => {
    const arr = labsRes ?? [];
    return arr.filter((x: any) => x?.deletedAt == null);
  }, [labsRes]);

  const pharmacies = useMemo(
    () => pharmacyRes?.pharmacies ?? [],
    [pharmacyRes],
  );

  // Real counts from backend
  const totalLabTests = labTestsRes?.pagination?.totalRecords ?? 0;
  const totalDepartments = labDepartmentsRes?.length ?? 0;
  const totalMedicines = medicinesRes?.medicines?.length ?? 0;

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

  const isLoading = clinicLoading || labsLoading || pharmacyLoading;

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
      highlightLabel: "Tests",
      highlightValue: totalLabTests || (labs.length > 0 ? "—" : 0),
      stats: [
        {
          label: "Departments",
          value: totalDepartments || (labs.length > 0 ? "—" : 0),
          icon: React.createElement(FiGrid, { className: "text-[14px]" }),
        },
        {
          label: "Labs",
          value: labs.length,
          icon: React.createElement(FiDatabase, { className: "text-[14px]" }),
        },
        {
          label: "Tests",
          value: totalLabTests || (labs.length > 0 ? "—" : 0),
          icon: React.createElement(FiLayers, { className: "text-[14px]" }),
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
    [labs, totalDepartments, totalLabTests, goToLab],
  );

  // --- Pharmacy Section ---
  const pharmacyStaffCount = pharmacies.reduce(
    (acc: number, p: any) => acc + (p?.staffCount ?? 0),
    0,
  );

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
      highlightLabel: "Medicines",
      highlightValue: totalMedicines || (pharmacies.length > 0 ? "—" : 0),
      stats: [
        {
          label: "Pharmacies",
          value: pharmacies.length,
          icon: React.createElement(FiTag, { className: "text-[14px]" }),
        },
        {
          label: "Medicines",
          value: totalMedicines || (pharmacies.length > 0 ? "—" : 0),
          icon: React.createElement(MdOutlineMedication, { className: "text-[14px]" }),
        },
        {
          label: "Staff",
          value: pharmacyStaffCount || (pharmacies.length > 0 ? "—" : 0),
          icon: React.createElement(FiUsers, { className: "text-[14px]" }),
        },
        {
          label: "Status",
          value: pharmacies.length > 0 ? "Active" : "Not Set",
          icon: React.createElement(FiBox, { className: "text-[14px]" }),
        },
      ],
      actionLabel: "Manage Pharmacy",
      onAction: goToPharmacy,
    }),
    [pharmacies, totalMedicines, pharmacyStaffCount, goToPharmacy],
  );

  // --- Quick Access Items ---
  const quickAccessItems: QuickAccessItem[] = useMemo(
    () => [
      {
        id: "manage-lab",
        label: "Lab Details",
        description: "View and manage laboratory",
        icon: React.createElement(MdOutlineBiotech, { className: "text-[16px]" }),
        onClick: goToLab,
      },
      {
        id: "manage-pharmacy",
        label: "Pharmacy Details",
        description: "View and manage pharmacy",
        icon: React.createElement(MdLocalPharmacy, { className: "text-[16px]" }),
        onClick: goToPharmacy,
      },
      {
        id: "manage-medicines",
        label: "Medicines",
        description: "Manage medicine catalog",
        icon: React.createElement(MdOutlineMedication, { className: "text-[16px]" }),
        onClick: () => navigate("/medicines"),
      },
      {
        id: "manage-users",
        label: "Users & Roles",
        description: "Manage system users",
        icon: React.createElement(FiUsers, { className: "text-[16px]" }),
        onClick: () => navigate("/users"),
      },
      {
        id: "subscription",
        label: "Subscription",
        description: "Manage your plan",
        icon: React.createElement(FiPackage, { className: "text-[16px]" }),
        onClick: () => navigate("/subscription"),
      },
      {
        id: "clinic-settings",
        label: "Clinic Settings",
        description: "Organization details",
        icon: React.createElement(FiLayers, { className: "text-[16px]" }),
        onClick: () => navigate("/profile/clinic"),
      },
    ],
    [navigate, goToLab, goToPharmacy],
  );

  // --- Recent Activity (derived from real timestamps) ---
  const recentActivities: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    // Add lab entries with real timestamps
    labs.forEach((lab: any, index: number) => {
      items.push({
        id: `lab-${lab?.id || index}`,
        title: `${lab?.name || "Laboratory"} configured`,
        description: `Lab status: ${lab?.labStatus || "Active"}`,
        badge: "Lab",
        badgeColor: "lab",
        timestamp: lab?.createdAt
          ? new Date(lab.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "Recently",
      });
    });

    // Add pharmacy entries with real timestamps
    pharmacies.forEach((pharmacy: any, index: number) => {
      items.push({
        id: `pharmacy-${pharmacy?.id || index}`,
        title: `${pharmacy?.name || "Pharmacy"} configured`,
        description: `Pharmacy status: ${pharmacy?.status || "active"}`,
        badge: "Pharmacy",
        badgeColor: "pharmacy",
        timestamp: pharmacy?.createdAt
          ? new Date(pharmacy.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "Recently",
      });
    });

    // Sort by timestamp (most recent first)
    items.sort((a, b) => {
      const dateA = a.timestamp !== "Recently" ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp !== "Recently" ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    });

    if (items.length === 0) {
      items.push({
        id: "no-activity",
        title: "No configuration activity yet",
        description: "Set up your laboratory and pharmacy to get started",
        badge: "System",
        badgeColor: "system",
        timestamp: "—",
      });
    }

    return items;
  }, [labs, pharmacies]);

  // --- Summary Stats ---
  const summaryStats: ConfigurationStat[] = useMemo(
    () => [
      {
        label: "Total Labs",
        value: labs.length,
        icon: React.createElement(MdOutlineBiotech, { className: "text-[18px]" }),
      },
      {
        label: "Total Pharmacies",
        value: pharmacies.length,
        icon: React.createElement(MdLocalPharmacy, { className: "text-[18px]" }),
      },
      {
        label: "Lab Tests",
        value: totalLabTests || "—",
        icon: React.createElement(FiLayers, { className: "text-[18px]" }),
      },
      {
        label: "Departments",
        value: totalDepartments || "—",
        icon: React.createElement(FiGrid, { className: "text-[18px]" }),
      },
      {
        label: "Medicines",
        value: totalMedicines || "—",
        icon: React.createElement(MdOutlineMedication, { className: "text-[18px]" }),
      },
      {
        label: "Staff Members",
        value: pharmacyStaffCount || "—",
        icon: React.createElement(FiUsers, { className: "text-[18px]" }),
      },
    ],
    [labs, pharmacies, totalLabTests, totalDepartments, totalMedicines, pharmacyStaffCount],
  );

  return {
    isLoading,
    laboratorySection,
    pharmacySection,
    quickAccessItems,
    recentActivities,
    summaryStats,
  };
}
