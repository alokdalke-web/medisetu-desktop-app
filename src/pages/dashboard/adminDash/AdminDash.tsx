// src/pages/dashboard/adminDash/AdminDash.tsx
import { addToast } from "@heroui/react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiCalendar, FiUsers } from "react-icons/fi";
import { HiOutlineClock } from "react-icons/hi";
import { MdOutlinePayment } from "react-icons/md";
import { TbChartLine } from "react-icons/tb";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { useDebounce } from "use-debounce";
import BannerDisplay from "../../../components/banners/BannerDisplay";
import { isNetworkError } from "../../../utils/getApiErrorText";

import { useGetUserQuery } from "../../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../../redux/api/clinicApi";
import {
  useGetDashboardQuery,
  useGetDoctorDashboardQuery,
  useGetRevenueOverviewQuery,
  useGetTodayOverviewQuery,
} from "../../../redux/api/dashboardApi";
import { useGetPaymentTransactionsQuery } from "../../../redux/api/subscriptionApi";
import { useSearchPatientsQuery } from "../../../redux/api/usersApi";
import type { RootState } from "../../../redux/store";
import FreeTrialSuccessModal from "../../../components/subscription/FreeTrialSuccessModal";
import { FreeTrialOfferCard } from "../../../components/subscription/FreeTrialOfferCard";
import AppLoader from "../../../components/common/AppLoader";
import { useDashboardInit } from "../../../hooks/useDashboardInit";
import { useConnectivityState } from "../../../hooks/useConnectivityState";

import { StatCard } from "../../../components/StatCard";
import CustomDateRangePicker from "../CustomDateRangePicker";
import DashboardFooter from "../DashboardFooter";
import DateFilterTabs, { type DateTab } from "../DateFilterTabs";
import DonutOverviewCard, { type DonutItem } from "../DonutOverviewCard";
import ClinicSetup from "../OnboardingDash/pages/ClinicSetup";
import RevenueOverviewChart, { type ChartPoint } from "../RevenueOverviewChart";

// AI Insights is parked until the feature exists — see the commented-out
// render in the right rail below. `CollectionsWidget` took its slot.
// import AIInsightsWidget from "./components/AIInsightsWidget";
import AlertsWidget from "./components/AlertsWidget";
import ClinicPulseWidget from "./components/ClinicPulseWidget";
import CollectionsWidget from "./components/CollectionsWidget";
import PatientOverviewCard from "./components/PatientOverviewCard";
import PatientSearchBar from "./components/PatientSearchBar";
import PendingAppointmentsTable from "./components/PendingAppointmentsTable";
import QuickActionsWidget from "./components/QuickActionsWidget";
import RemindersWidget from "./components/RemindersWidget";
import Sk from "../components/Skeleton";
import TopSymptomsCard from "./components/TopSymptomsCard";
import {
  formatCompact,
  formatDateRangeLabel,
  formatINR,
  getGreeting,
  mergeDateTime,
  parseHikePercent,
  parseTrendPercent,
  toYMD,
} from "./helpers/adminDashFormatters";
import type {
  DashboardResultLoose,
  PaymentModeShare,
  PaymentTransactionsSummary,
  PendingAppt,
  PulseRate,
} from "../../../types/adminDash";

const AdminDash = ({
  showDoctorStats: _showDoctorStats = false,
  showRevenue = true,
}: {
  showDoctorStats?: boolean;
  showRevenue?: boolean;
}) => {
  const navigate = useNavigate();
  // Get current user
  const authUser = useSelector((s: RootState) => s.auth.user);
  const { data: userData } = useGetUserQuery();
  const { data: clinicData } = useGetAllClinicsQuery();
  const currentUser = (userData as any)?.user ?? (userData as any) ?? authUser;
  const userStatus = (clinicData as any)?.profile?.userStatus ?? currentUser?.userStatus;
  const isApproved = String(userStatus || "").toLowerCase() === "active";
  const currentUserName = currentUser?.name ?? "Doctor";
  // Mirrors PaymentHistory.tsx — gates the Collections widget.
  const paymentVisible = Boolean((currentUser as any)?.paymentVisible ?? true);
  // const currentSubscription = clinicData?.subscription;
  // For the parked AI Insights widget (see the right rail):
  // const isAiInsightsLocked = isFreeSubscription(currentSubscription);

  // Check if user is eligible for free trial offer
  const showFreeOffer = userData?.noSubscriptionTakenTillNow === true || currentUser?.noSubscriptionTakenTillNow === true;

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalExpiryDate, setModalExpiryDate] = useState<string | undefined>(undefined);

  const handleShowSuccessModal = (expiryDate?: string | null) => {
    setModalExpiryDate(expiryDate || undefined);
    setShowSuccessModal(true);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);

    // Show a small success toast after modal closes
    setTimeout(() => {
      addToast({
        title: "Success",
        description: "Free Trial Activated Successfully!",
        color: "success",
      });
    }, 300);
  };

  const [startDate, setStartDate] = useState(() => toYMD(new Date()));
  const [endDate, setEndDate] = useState(() => toYMD(new Date()));
  const [activeTab, setActiveTab] = useState<DateTab>("today");
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);

  // Separate state for the Revenue Overview chart period
  const [revenueChartPeriod, setRevenueChartPeriod] = useState<"week" | "month">("week");

  // Compute a meaningful comparison label based on the active date filter
  const comparisonLabel = useMemo(() => {
    switch (activeTab) {
      case "today":
        return "yesterday";
      case "yesterday":
        return "day before";
      case "thisWeek":
        return "last week";
      case "thisMonth":
        return "last month";
      case "custom":
        return "previous period";
      default:
        return "yesterday";
    }
  }, [activeTab]);

  // Patient search state (debounced)
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isFetching: isSearching } =
    useSearchPatientsQuery(
      debouncedSearch.trim().length >= 2
        ? { pageNumber: 1, pageSize: 8, search: debouncedSearch.trim() }
        : skipToken,
    );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle date tab changes
  const handleTabChange = (tab: DateTab) => {
    setActiveTab(tab);
    const today = new Date();
    let s = today;
    let e = today;

    if (tab === "today") {
      s = today;
      e = today;
    } else if (tab === "yesterday") {
      const yd = new Date(today);
      yd.setDate(yd.getDate() - 1);
      s = yd;
      e = yd;
    } else if (tab === "thisWeek") {
      const day = today.getDay();
      s = new Date(today);
      s.setDate(today.getDate() - day);
      e = new Date(s);
      e.setDate(s.getDate() + 6);
    } else if (tab === "thisMonth") {
      s = new Date(today.getFullYear(), today.getMonth(), 1);
      e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    setStartDate(toYMD(s));
    setEndDate(toYMD(e));
  };

  // Check offline state
  const connectivityState = useConnectivityState();
  const isOffline = connectivityState !== "online";

  // Current doctor ID
  const currentDoctorId = String(currentUser?.id ?? currentUser?._id ?? "");

  // ===== Today Overview API (needed before todayAppointments) =====
  const todayOverviewArgs = useMemo(() => {
    if (!currentDoctorId || isOffline) return undefined;
    return { doctorId: currentDoctorId };
  }, [currentDoctorId, isOffline]);

  const {
    data: todayOverviewData,
    isLoading: isTodayLoading,
    isFetching: _isTodayFetching,
  } = useGetTodayOverviewQuery(todayOverviewArgs ?? skipToken, {
    refetchOnMountOrArgChange: true,
  });

  // Fetch pending appointments for current doctor (skip if role is Admin)
  const isAdmin = String(currentUser?.userType ?? "").toLowerCase() === "admin";

  const pendingQueryArgs = useMemo(() => {
    if (isAdmin || isOffline) return undefined;
    const args: Record<string, any> = { startDate, endDate };
    if (currentDoctorId) args.doctorId = currentDoctorId;
    return args;
  }, [startDate, endDate, currentDoctorId, isAdmin, isOffline]);

  const { data: doctorDashData } = useGetDoctorDashboardQuery(
    pendingQueryArgs ?? skipToken,
    {
      refetchOnMountOrArgChange: true,
    },
  );

  // Map today's appointments from new API (preferred) or fallback to doctor dashboard
  const todayAppointments: PendingAppt[] = useMemo(() => {
    // Prefer new today-overview API todaysAppointments
    const newAppts = todayOverviewData?.data?.todaysAppointments;
    if (newAppts && newAppts.length > 0) {
      return newAppts.map((p) => {
        const start = mergeDateTime(p.appointmentDate, p.appointmentTime ?? null);
        return {
          id: p.id,
          patientName: p.patientName ?? "Unknown",
          profileImage: p.patientProfileImage ?? null,
          start,
          time: p.appointmentTime ?? null,
          notes: p.appointmentType ?? null,
          age: p.patientAge != null ? String(p.patientAge) : null,
          gender: p.patientGender ?? null,
          status: p.appointmentStatus ?? "Pending",
          payment: p.paymentStatus ?? null,
          paymentMethod: null,
          tokenNo: p.tokenNo ?? null,
          patientId: null,
          patientMobile: (p as any).patientMobile ?? null,
        };
      });
    }

    // Fallback to old doctor dashboard API
    const raw = (doctorDashData as any)?.result?.pendingAppointment ?? [];
    return raw
      .map((p: any) => {
        const id = String(p.appoinmentId ?? p.appointmentId ?? p.id ?? "");
        const start = mergeDateTime(
          p.appointmentDate,
          p.appointmentTime ?? null,
        );
        const payment = p.payment ?? {};
        return {
          id,
          patientName: p.name ?? "Unknown",
          profileImage: p.profileImage ?? null,
          start,
          time: p.appointmentTime ?? null,
          notes: p.appointmentType ?? null,
          age: p.age ?? null,
          gender: p.gender ?? null,
          status: p.status ?? "Pending",
          payment: payment.paymentStatus ?? p.paymentStatus ?? null,
          paymentMethod: payment.paymentMode ?? p.paymentMethod ?? null,
          tokenNo: p.tokenNo ?? null,
          patientId: p.patientId ?? null,
          patientMobile: p.patientMobile ?? p.mobile ?? p.phone ?? null,
        };
      })
      .sort((a: PendingAppt, b: PendingAppt) => {
        const aToken = a.tokenNo != null ? 0 : 1;
        const bToken = b.tokenNo != null ? 0 : 1;
        if (aToken !== bToken) return aToken - bToken;
        if (a.tokenNo != null && b.tokenNo != null)
          return a.tokenNo - b.tokenNo;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
  }, [doctorDashData, todayOverviewData]);

  // Query args for dashboard API
  const queryArgs = useMemo(() => {
    if (!startDate || !endDate || isOffline) return undefined;
    return {
      startDate,
      endDate,
      dateRangeStartCount: startDate,
      dateRangeEndCount: endDate,
    };
  }, [startDate, endDate, isOffline]);

  const curArg = queryArgs ?? skipToken;

  const {
    data: curData,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetDashboardQuery(curArg, { refetchOnMountOrArgChange: true });

  // ===== NEW APIs: Revenue Overview & Today Overview =====
  /**
   * Clinic-wide revenue — deliberately no `doctorId`.
   *
   * /dashboard/revenue-overview scopes to a single doctor whenever an admin
   * sends `doctorId` (`if (isAdmin && opts?.doctorId)`), and this page used to
   * send the logged-in user's own id. For an admin who also has a doctor
   * profile that silently reduced every revenue figure on the dashboard to
   * that one doctor's share, so the totals disagreed with Payments History for
   * the same date range. Omitting it means the backend still resolves a
   * Doctor user to their own id, but an Admin gets the whole clinic.
   */
  const revenueOverviewArgs = useMemo(() => {
    if (isOffline) return undefined;
    return { startDate, endDate };
  }, [startDate, endDate, isOffline]);

  const {
    data: revenueOverviewData,
    isLoading: isRevenueLoading,
    isFetching: _isRevenueFetching,
  } = useGetRevenueOverviewQuery(revenueOverviewArgs ?? skipToken, {
    refetchOnMountOrArgChange: true,
  });

  /**
   * The Revenue Overview chart plots a full week or month, always — separate
   * from the page's date filter.
   *
   * The stat cards are scoped to whatever the filter says ("Today" must mean
   * today's revenue), but feeding that same one-day range to the chart made it
   * request a single day and render a single dot. So the chart gets its own
   * range, derived from `revenuePeriod` and anchored on the selected date:
   * the containing Sun–Sat week, or the containing calendar month.
   */
  const revenueChartArgs = useMemo(() => {
    if (isOffline) return undefined;
    const anchor = new Date();

    let rangeStart: Date;
    let rangeEnd: Date;

    if (revenueChartPeriod === "month") {
      rangeStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      rangeEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    } else {
      rangeStart = new Date(anchor);
      rangeStart.setDate(anchor.getDate() - anchor.getDay());
      rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeStart.getDate() + 6);
    }

    // Clinic-wide, for the same reason as `revenueOverviewArgs` above.
    return {
      startDate: toYMD(rangeStart),
      endDate: toYMD(rangeEnd),
    };
  }, [revenueChartPeriod, isOffline]);

  // Deduped by RTK Query whenever it resolves to the same range as the stats
  // query above (i.e. when the filter already is this week / this month).
  const {
    data: revenueChartData,
    isLoading: isRevenueChartLoading,
  } = useGetRevenueOverviewQuery(revenueChartArgs ?? skipToken, {
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (isError && !isNetworkError(error)) {
      addToast({
        title: "Failed to load dashboard",
        description:
          (error as any)?.data?.message ??
          (error as any)?.error ??
          "Something went wrong",
        color: "danger",
        variant: "flat",
      });
    }
  }, [isError, error]);

  const r = (curData as any)?.result as DashboardResultLoose | undefined;

  const topStats = useMemo(
    () => ({
      totalAppointments: r?.status?.totalAppoiment?.count ?? 0,
      activePatients: r?.status?.activePatent?.count ?? 0,
      revenue: revenueOverviewData?.data?.netRevenue ?? r?.status?.totalEarning?.amount ?? 0,
      pendingPayment: revenueOverviewData?.data?.pendingPayments ?? r?.status?.pendingPayment?.amount ?? 0,
      noShowAppointments: r?.status?.noShowCount?.count ?? 0,
    }),
    [r, revenueOverviewData],
  );

  const deltas = useMemo(
    () => ({
      appt: parseHikePercent(r?.status?.totalAppoiment?.hikePersent),
      patients: parseHikePercent(r?.status?.activePatent?.hikePersent),
      revenue: revenueOverviewData?.data?.trend
        ? parseTrendPercent(revenueOverviewData.data.trend)
        : parseHikePercent(r?.status?.totalEarning?.hikePersent),
      noShow: parseHikePercent(r?.status?.noShowCount?.hikePersent),
      pendingPayment: parseHikePercent(r?.status?.pendingPayment?.hikePersent),
    }),
    [r, revenueOverviewData],
  );

  const revenuePoints: ChartPoint[] = useMemo(() => {
    // Prefer the chart-scoped revenue-overview query (full week/month)
    const newData = revenueChartData?.data?.revenueOverview;
    if (newData && newData.length > 0) {
      return newData.map((d) => {
        const dateStr = d.date;
        const dt = new Date(dateStr);
        const label = Number.isFinite(dt.getTime())
          ? dt.toLocaleString("en-US", { month: "short", day: "numeric" })
          : dateStr;
        return { date: dateStr, count: d.amount, label };
      });
    }
    // Fallback to old dashboard API daily revenue (amount field)
    return (r?.revenueOverview ?? []).map((d: any) => {
      const dateStr = String(d.date ?? "");
      const dt = new Date(dateStr);
      const label = Number.isFinite(dt.getTime())
        ? dt.toLocaleString("en-US", { month: "short", day: "numeric" })
        : dateStr;
      return { date: dateStr, count: Number(d.amount ?? 0), label };
    });
  }, [r, revenueChartData]);

  // Chart header total — the week/month being plotted, not the filtered range.
  const totalRevenueForChart = useMemo(() => {
    if (revenueChartData?.data) {
      return revenueChartData.data.netRevenue;
    }
    return topStats.revenue;
  }, [revenueChartData, topStats.revenue]);

  /**
   * Today's operational rates, derived from the counts already returned by
   * /dashboard/today-overview. Percentages are against today's total, and each
   * row carries its raw counts so a tiny denominator reads honestly.
   */
  const clinicPulse = useMemo(() => {
    const appts = todayOverviewData?.data?.appointments;
    const revenue = todayOverviewData?.data?.revenue;
    const total = appts?.total ?? 0;

    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    const of = (n: number) => `${n} of ${total}`;

    const completed = appts?.completed ?? 0;
    const noShow = appts?.noShow ?? 0;
    const cancelled = appts?.cancelled ?? 0;

    const rates: PulseRate[] = [
      {
        label: "Completed",
        percent: pct(completed),
        detail: of(completed),
        color: "#2fae8e",
      },
      {
        label: "No-shows",
        percent: pct(noShow),
        detail: of(noShow),
        color: "#e89b00",
      },
      {
        label: "Cancelled",
        percent: pct(cancelled),
        detail: of(cancelled),
        color: "#e5484d",
      },
    ];

    return {
      totalToday: total,
      rates,
      paidCount: revenue?.todayPaidAppointments ?? 0,
      unpaidCount: revenue?.todayPendingCount ?? 0,
    };
  }, [todayOverviewData]);

  /**
   * Collections figures come from the Payments History endpoint, not from
   * /dashboard/revenue-overview.
   *
   * Same range, same summary object, same numbers — by construction rather
   * than by coincidence. revenue-overview buckets by appointment date and can
   * be doctor-scoped, so figures derived from it drifted from what Payments
   * History reported for an identical range. `pageSize: 1` because only the
   * summary is needed; the backend computes it over the full filtered set
   * before paginating. No `doctorId` — clinic-wide, matching that page's
   * default "All doctors".
   */
  const paymentSummaryArgs = useMemo(
    () => ({ pageNumber: 1, pageSize: 1, startDate, endDate }),
    [startDate, endDate],
  );

  // Honour the same `paymentVisible` flag that gates the Payments History
  // page — a user who may not see payment transactions there must not see
  // them summarised here either.
  const { data: paymentTxData } = useGetPaymentTransactionsQuery(
    paymentVisible ? paymentSummaryArgs : skipToken,
    { refetchOnMountOrArgChange: true },
  );

  const collections = useMemo(() => {
    const summary = paymentTxData?.summary as
      | PaymentTransactionsSummary
      | undefined;

    const creditByMode = summary?.paymentModeSummary?.credit ?? {};
    const totalCredit = summary?.totalCreditAmount ?? 0;

    // Known modes keep a stable colour; anything else the backend reports
    // still shows, appended by descending amount, so nothing is dropped.
    const palette: Record<string, string> = {
      cash: "#2fae8e",
      upi: "#2898ff",
      card: "#6366f1",
      online: "#2898ff",
      razorpay: "#6366f1",
      insurance: "#f4a261",
      "pay later": "#e89b00",
      paylater: "#e89b00",
      unknown: "#94a3b8",
    };
    const fallback = ["#e5484d", "#e89b00", "#01c2a8", "#94a3b8"];

    const modes: PaymentModeShare[] = Object.entries(creditByMode)
      .map(([mode, amount]) => ({ mode, amount: Number(amount) || 0 }))
      .filter((m) => m.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .map(({ mode, amount }, i) => ({
        label: mode,
        amount,
        // Share of credit, so the bar always totals 100%.
        percent: totalCredit > 0 ? Math.round((amount / totalCredit) * 100) : 0,
        color: palette[mode.trim().toLowerCase()] ?? fallback[i % fallback.length],
      }));

    return {
      totalCredit,
      modes,
      refunded: summary?.totalDebitAmount ?? 0,
      netAmount: summary?.netAmount ?? 0,
      pendingAmount: summary?.totalPendingAmount ?? 0,
      transactionCount: summary?.totalTransactions ?? 0,
    };
  }, [paymentTxData]);

  /**
   * Exact range the collections figures cover — the page filter, same as the
   * stat cards. Stated literally rather than as "This Week", which was wrong
   * the moment the filter pointed anywhere else.
   */
  const collectionsRangeLabel = useMemo(() => {
    const fmt = (ymd: string) => {
      const d = new Date(`${ymd}T00:00:00`);
      return Number.isFinite(d.getTime())
        ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : ymd;
    };
    return startDate === endDate
      ? fmt(startDate)
      : `${fmt(startDate)} – ${fmt(endDate)}`;
  }, [startDate, endDate]);

  const appointmentStatusItems: DonutItem[] = useMemo(() => {
    // Use today-overview API data only when viewing "today" tab
    const todayAppts = todayOverviewData?.data?.appointments;
    if (activeTab === "today" && todayAppts) {
      return [
        { label: "Completed", value: todayAppts.completed, color: "#2fae8e" },
        { label: "Ongoing", value: todayAppts.confirmed, color: "#2898ff" },
        { label: "Cancelled", value: todayAppts.cancelled, color: "#f4a261" },
        { label: "Pending", value: todayAppts.pending, color: "#e5484d" },
      ];
    }
    // Use date-range-aware dashboard API for other tabs
    const pending = r?.appoimentStatus?.pending ?? 0;
    const confirmed = r?.appoimentStatus?.confirmed ?? 0;
    const cancelled = r?.appoimentStatus?.cancelled ?? 0;
    const completed = r?.appoimentStatus?.completed ?? 0;
    return [
      { label: "Completed", value: completed, color: "#2fae8e" },
      { label: "Ongoing", value: confirmed, color: "#2898ff" },
      { label: "Cancelled", value: cancelled, color: "#f4a261" },
      { label: "Pending", value: pending, color: "#e5484d" },
    ];
  }, [r, todayOverviewData, activeTab]);

  const symptomStats = useMemo(() => {
    // Prefer new today-overview API symptomCounts
    const symptomData = todayOverviewData?.data?.symptomCounts?.data;
    if (symptomData && Object.keys(symptomData).length > 0) {
      const entries = Object.entries(symptomData).sort(([, a], [, b]) => b - a);
      const total = entries.reduce((sum, [, count]) => sum + count, 0);
      return entries.map(([name, count]) => ({
        name: name.replace(/_/g, " "),
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
    }
    // Fallback to old dashboard API
    const total = (r?.symptomStats ?? []).reduce(
      (a: number, s: any) => a + (Number(s.count) || 0),
      0,
    );
    return (r?.symptomStats ?? []).map((s: any) => ({
      name: s.symptomName || "Unknown",
      count: Number(s.count ?? 0),
      percent: total > 0 ? Math.round((Number(s.count ?? 0) / total) * 100) : 0,
    }));
  }, [r, todayOverviewData]);



  const showSkeleton =
    (!curData && (isLoading || isFetching)) ||
    (!revenueOverviewData && isRevenueLoading) ||
    (!revenueChartData && isRevenueChartLoading) ||
    (!todayOverviewData && isTodayLoading);
  // For the parked AI Insights widget (see the right rail):
  // const handleUpgradePlan = () => navigate("/subscription");

  // Patient overview from new today-overview API
  const patientOverviewFromApi = useMemo(() => {
    const po = todayOverviewData?.data?.patientOverview;
    if (!po) return null;
    return {
      newPatients: po.newPatients.count,
      returningPatients: po.returningPatients.count,
      newDelta: parseTrendPercent(po.newPatients.trend),
      returningDelta: parseTrendPercent(po.returningPatients.trend),
    };
  }, [todayOverviewData]);

  /* ============ RENDER ============ */

  // ===== Dashboard Initialization Loader =====
  // Show loader only on first dashboard load after login
  const { showLoader } = useDashboardInit({
    loadingStates: [
      isLoading,           // Main dashboard query
      isTodayLoading,      // Today overview query
      isRevenueLoading,    // Revenue overview query (filter-scoped, for stats)
      isRevenueChartLoading, // Revenue overview query (week/month, for chart)
      !userData,           // User data loading
      !clinicData,         // Clinic data loading
    ],
    minDisplayTime: 3500,  // Show for at least 3.5 seconds
    maxWaitTime: 5000,     // Maximum wait 5 seconds
  });

  // If showing initialization loader, render it
  if (showLoader) {
    return <AppLoader message="Initializing your dashboard..." />;
  }

  return (
    !isApproved ? (
      <ClinicSetup />
    ) : (
      <div className="w-full min-w-0 px-3 sm:px-0 pt-0 pb-4 sm:pb-6 antialiased lg:h-full lg:flex lg:flex-col lg:overflow-hidden dark:bg-[#0b1321]">
        {showSkeleton ? (
          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto no-scrollbar space-y-4 sm:space-y-6">
            <Sk className="h-8 w-48 sm:w-72" />
            <Sk className="h-4 w-64 sm:w-96" />
            {/* Skeleton geometry mirrors the loaded layout so the page
                doesn't jump when data lands. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Sk key={i} className="h-[104px] rounded-2xl" />
              ))}
            </div>
            <Sk className="h-[104px] rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] gap-4 sm:gap-5">
              <div className="space-y-4 sm:space-y-5">
                <Sk className="h-72 rounded-2xl" />
                <Sk className="h-72 rounded-2xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <Sk className="h-60 rounded-2xl" />
                <Sk className="h-48 rounded-2xl" />
                <Sk className="h-48 rounded-2xl" />
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto no-scrollbar">
            {/*
              Sized by container width, not viewport width. The content column
              is ~420px narrower than the window (sidebar + the 320/360px right
              rail), so viewport breakpoints promote these grids to multi-column
              well before the content actually fits. Every `@`-prefixed variant
              below measures the nearest `@container` ancestor instead.
            */}
            <div className="@container max-w-full space-y-4 @2xl:space-y-5">
              {/* ── DASHBOARD_TOP Banner ── */}
              <BannerDisplay placement="DASHBOARD_TOP" className="mb-1" />

              {/* ===== Header: Greeting + Filters ===== */}
              <div className="flex flex-col gap-3 @2xl:gap-4 @4xl:flex-row @4xl:items-center @4xl:justify-between">
                {/* `min-w-0`, not `shrink-0`: a long clinician name alongside
                    the date tabs and search must be able to compress rather
                    than widen the page. */}
                <div className="flex min-w-0 flex-col gap-1">
                  <h2 className="text-[18px] sm:text-[22px] md:text-[24px] lg:text-[26px] font-semibold leading-tight tracking-tight text-text">
                    {getGreeting()}, Dr. {currentUserName.split(" ")[0]} 👋
                  </h2>
                  <p className="text-[12px] sm:text-[13px] lg:text-[14px] font-normal leading-5 text-text-muted">
                    Here's what's happening in your clinic today.
                  </p>
                </div>

                <div
                  id="tour-admin-controls"
                  className="flex w-full min-w-0 flex-col gap-3 @2xl:flex-row @2xl:flex-wrap @2xl:items-center @2xl:justify-end @4xl:w-auto"
                >
                  <div
                    className="relative flex items-center gap-3 overflow-x-auto no-scrollbar @2xl:justify-end min-w-0 flex-shrink"
                    data-datepicker-anchor
                  >
                    <DateFilterTabs
                      active={activeTab}
                      onChange={handleTabChange}
                      startYmd={startDate}
                      endYmd={endDate}
                      onRangeChange={(s, e) => { setStartDate(s); setEndDate(e); }}
                      onCustom={() => {
                        setActiveTab("custom");
                        setShowCustomCalendar(true);
                      }}
                      customLabel={
                        activeTab === "custom" && !showCustomCalendar
                          ? formatDateRangeLabel(startDate, endDate)
                          : undefined
                      }
                    />
                    {showCustomCalendar && (
                      <CustomDateRangePicker
                        startYmd={startDate}
                        endYmd={endDate}
                        onApply={(s, e) => {
                          setStartDate(s);
                          setEndDate(e);
                          setShowCustomCalendar(false);
                        }}
                        onCancel={() => {
                          setShowCustomCalendar(false);
                          setActiveTab("today");
                          handleTabChange("today");
                        }}
                      />
                    )}
                  </div>

                  <PatientSearchBar
                    containerRef={searchRef}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    showSearchResults={showSearchResults}
                    setShowSearchResults={setShowSearchResults}
                    debouncedSearch={debouncedSearch}
                    isSearching={isSearching}
                    searchResults={searchResults}
                    navigate={navigate}
                  />
                </div>
              </div>

              {/* ===== Top Metric Cards ===== */}
              <div
                id="tour-dashboard-stats"
                // One full-width tile per row on a phone, matching the
                // appointment card grid — two-up at 320px squeezes the label
                // and leaves a fifth tile orphaned on its own row.
                // Column count is gated on the tile actually fitting: a tile
                // needs ~240px for icon + label + value, and ~330px once the
                // sparkline shows. Going 5-across too early was what pushed
                // the page into horizontal scroll.
                className={`grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 ${showRevenue ? "@6xl:grid-cols-5" : "@5xl:grid-cols-4"} gap-3 @3xl:gap-4 @5xl:gap-5 ${isFetching ? "opacity-80 transition-opacity" : ""}`}
              >
                <StatCard
                  icon={<FiCalendar className="h-5 w-5 text-[#27b77a]" />}
                  label="Total Appointments"
                  value={formatCompact(topStats.totalAppointments)}
                  delta={deltas.appt}
                  bgColor="bg-[rgba(39,183,122,0.1)]"
                  deltaLabel={comparisonLabel}
                />
                <StatCard
                  icon={<FiUsers className="h-5 w-5 text-[#6366f1]" />}
                  label="Total Patients"
                  value={formatCompact(topStats.activePatients)}
                  delta={deltas.patients}
                  bgColor="bg-[rgba(99,102,241,0.1)]"
                  deltaLabel={comparisonLabel}
                />
                {showRevenue && (
                  <StatCard
                    icon={<TbChartLine className="h-5 w-5 text-[#01c2a8]" />}
                    label="Total Revenue"
                    // Filter-scoped, unlike the chart: "Today" means today.
                    value={formatINR(topStats.revenue)}
                    delta={deltas.revenue}
                    bgColor="bg-primary/10"
                    deltaLabel={comparisonLabel}
                  />
                )}
                <StatCard
                  icon={<HiOutlineClock className="h-5 w-5 text-[#e89b00]" />}
                  label="No Shows"
                  value={formatCompact(topStats.noShowAppointments)}
                  delta={deltas.noShow}
                  bgColor="bg-amber-500/10"
                  deltaLabel={comparisonLabel}
                  sparkUp={false}
                />
                <StatCard
                  icon={<MdOutlinePayment className="h-5 w-5 text-[#3b82f6]" />}
                  label="Pending Payments"
                  value={formatINR(topStats.pendingPayment)}
                  delta={deltas.pendingPayment}
                  bgColor="bg-blue-500/10"
                  deltaLabel={comparisonLabel}
                />
              </div>

              {/* ===== Summary Bar ===== */}
              {/* ===== Main Content: Charts + Right Sidebar ===== */}
              <div className="grid grid-cols-1 @5xl:grid-cols-[minmax(0,1fr)_320px] @7xl:grid-cols-[minmax(0,1fr)_360px] gap-4 @2xl:gap-5">
                {/* Left Column — its own container, since it is much narrower
                    than the page once the right rail is beside it. */}
                <div className="@container flex flex-col gap-4 @2xl:gap-5 min-w-0">
                  {/* Revenue + Donut Row */}
                  <div
                    id="tour-admin-charts"
                    className="grid grid-cols-1 @2xl:grid-cols-[1.6fr_1fr] gap-4 @2xl:gap-5"
                  >
                    <RevenueOverviewChart
                      title="Revenue Overview"
                      data={revenuePoints}
                      totalRevenue={totalRevenueForChart}
                      range={revenueChartPeriod === "week" ? "thisWeek" : "thisMonth"}
                      onRangeChange={(range) => {
                        setRevenueChartPeriod(range === "thisWeek" ? "week" : "month");
                      }}
                      trend={revenueChartData?.data?.trend}
                      comparisonLabel={revenueChartData?.data?.comparisonLabel}
                    />
                    <DonutOverviewCard
                      title="Appointment Status"
                      centerLabel="Total Appt"
                      items={appointmentStatusItems}
                      emptyTitle="No appointments in this period"
                      emptyHint="The status breakdown appears once appointments are booked."
                    />
                  </div>

                  <PendingAppointmentsTable
                    appointments={todayAppointments}
                    navigate={navigate}
                    onViewAll={() => navigate(`/appointment?date=${toYMD(new Date())}`)}
                  />

                  {/*
                    Bottom Row: Top Symptoms + Patient Overview.

                    Deliberately NOT stretched to fill leftover column height —
                    doing that just relocates the whitespace inside the cards,
                    which reads worse than a gap between them. Column balance
                    is handled by distributing widgets (see Quick Actions).
                  */}
                  <div
                    id="tour-admin-reports-overview"
                    className="grid grid-cols-1 @2xl:grid-cols-2 items-stretch gap-4 @2xl:gap-5"
                  >
                    <TopSymptomsCard
                      symptoms={symptomStats}
                      onViewReport={() => navigate("/reports")}
                    />
                    <PatientOverviewCard
                      newPatients={
                        patientOverviewFromApi?.newPatients ??
                        (topStats.activePatients > 0
                          ? Math.round(topStats.activePatients * 0.6)
                          : 0)
                      }
                      returningPatients={
                        patientOverviewFromApi?.returningPatients ??
                        (topStats.activePatients > 0
                          ? Math.round(topStats.activePatients * 0.4)
                          : 0)
                      }
                      newDelta={patientOverviewFromApi?.newDelta ?? deltas.patients}
                      returningDelta={patientOverviewFromApi?.returningDelta ?? deltas.patients}
                      deltaLabel="last 30 days"
                      onViewReport={() => navigate("/reports/patients")}
                    />
                  </div>

                  {/*
                    Quick Actions lives in the left column, not the right rail.

                    The rail carried six widgets against the left column's
                    four, so the grid row took the rail's height and left a
                    tall void under the left column on wide screens. Moving
                    this strip across evens the two columns out — balancing by
                    content rather than stretching cards to hide the gap. It
                    also gets a full-width 4-across row instead of being
                    squeezed 2x2 into a 320px rail.
                  */}
                  <QuickActionsWidget navigate={navigate} />
                </div>

                {/* Right Sidebar */}
                <div
                  id="tour-admin-side-panel"
                  // Two-up while the rail is stacked full-width below the
                  // charts; single column once it becomes the 320px side rail.
                  className="grid grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-1 items-start gap-4 @2xl:gap-5"
                >
                  <BannerDisplay placement="DASHBOARD_SIDEBAR" compact className="@2xl:col-span-2 @5xl:col-span-1" />

                  {/* Medicine Spotlight Banners */}
                  <BannerDisplay placement="INSIGHTS_WIDGET" className="@2xl:col-span-2 @5xl:col-span-1" />

                  <FreeTrialOfferCard
                    showFreeOffer={showFreeOffer}
                    onShowSuccessModal={handleShowSuccessModal}
                  />

                  {/*
                    Parked until AI Insights actually exists — it rendered a
                    blurred mock behind a "Coming Soon" veil, which spends prime
                    rail space on nothing. Restore this (and its import) when
                    the feature ships.

                    <AIInsightsWidget
                      isFreePlan={isAiInsightsLocked}
                      onUpgrade={handleUpgradePlan}
                    />
                  */}
                  <ClinicPulseWidget
                    totalToday={clinicPulse.totalToday}
                    rates={clinicPulse.rates}
                    paidCount={clinicPulse.paidCount}
                    unpaidCount={clinicPulse.unpaidCount}
                    onViewAppointments={() =>
                      navigate(`/appointment?date=${toYMD(new Date())}`)
                    }
                  />
                  {paymentVisible && (
                  <CollectionsWidget
                    periodLabel={collectionsRangeLabel}
                    totalCredit={collections.totalCredit}
                    modes={collections.modes}
                    refunded={collections.refunded}
                    netAmount={collections.netAmount}
                    pendingAmount={collections.pendingAmount}
                    transactionCount={collections.transactionCount}
                    onViewPayments={() => navigate("/payment-history")}
                  />
                  )}
                  <AlertsWidget
                    noShowCount={topStats.noShowAppointments}
                    onViewNoShow={() => navigate("/no-show")}
                  />
                  <RemindersWidget appointments={todayAppointments} navigate={navigate} />
                </div>
              </div>

              {/* ===== Footer ===== */}
              <DashboardFooter />
            </div>
          </div>
        )}

        {/* Success Modal for Free Trial Activation */}
        <FreeTrialSuccessModal
          isOpen={showSuccessModal}
          onClose={handleCloseSuccessModal}
          expiryDate={modalExpiryDate}
        />
      </div>
    )
  );
};

export default AdminDash;
