// src/pages/dashboard/doctorDash/DoctorDash.tsx
import React from "react";
import { addToast } from "@heroui/react";
import { useNavigate } from "react-router";
import { FiCalendar, FiClock, FiUsers } from "react-icons/fi";
import { TbChartLine } from "react-icons/tb";

import DateFilterTabs, { type DateTab } from "../DateFilterTabs";
import CustomDateRangePicker from "../CustomDateRangePicker";
import DashboardFooter from "../DashboardFooter";
import { useGetUserQuery } from "../../../redux/api/authApi";
import {
  dashboardApi,
  useGetDoctorDashboardV2Query,
  useGetDoctorDashboardProfileQuery,
} from "../../../redux/api/dashboardApi";
import { useConnectivityState } from "../../../hooks/useConnectivityState";
import { useAppointmentRealtime } from "../../../hooks/useAppointmentRealtime";
import { useAppDispatch } from "../../../redux/hooks";
import FeatureInfoTip from "../../../components/shared/FeatureInfoTip";
import { dashboardTips } from "../../../constants/featureTips";
import { StatCard } from "../../../components/StatCard";
import { normalizeStatus } from "../../../utils/clinicSetupStatus";
import Sk from "../components/Skeleton";

import PatientInsightsCard from "./components/PatientInsightsCard";
import QuickActionsGrid from "./components/QuickActionsGrid";
import RecentPatients from "./components/RecentPatients";
import StartYourDayCard from "./components/StartYourDayCard";
import TodaysAppointmentsList from "./components/TodaysAppointmentsList";
import AppointmentTrendChart from "./components/AppointmentTrendChart";
import DonutOverviewCard from "../DonutOverviewCard";
import {
  cleanText,
  doctorGreetingName,
  formatCompact,
  formatDateLabel,
  formatDateRangeLabel,
  formatSymptoms,
  getGreeting,
  getRtkErrorMessage,
  mergeDateTime,
  toYMD,
} from "./helpers/doctorDashFormatters";
import type { PendingAppt } from "../../../types/doctorDash";

const DoctorDash: React.FC<{ hideHeader?: boolean }> = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = React.useState(() => toYMD(new Date()));
  const [endDate, setEndDate] = React.useState(() => toYMD(new Date()));
  const [activeTab, setActiveTab] = React.useState<DateTab>("today");
  const [showCustomCalendar, setShowCustomCalendar] = React.useState(false);
  const { data: userData } = useGetUserQuery();
  const currentUser: any = React.useMemo(() => (userData as any)?.user ?? userData ?? {}, [userData]);
  const currentUserStatus = normalizeStatus(currentUser?.userStatus);
  const isDoctorApprovalLocked = Boolean(currentUserStatus) && currentUserStatus !== "active";
  const navigateWhenApproved = React.useCallback(
    (path: string) => {
      if (isDoctorApprovalLocked) return;
      navigate(path);
    },
    [isDoctorApprovalLocked, navigate],
  );

  const handleTabChange = React.useCallback((tab: DateTab) => {
    setActiveTab(tab);
    const now = new Date();
    let s = now;
    let e = now;
    if (tab === "today") { s = now; e = now; }
    else if (tab === "yesterday") {
      const yd = new Date(now);
      yd.setDate(yd.getDate() - 1);
      s = yd; e = yd;
    } else if (tab === "thisWeek") {
      const day = now.getDay();
      s = new Date(now);
      s.setDate(now.getDate() - day);
      e = new Date(s);
      e.setDate(s.getDate() + 6);
    } else if (tab === "thisMonth") {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    setStartDate(toYMD(s));
    setEndDate(toYMD(e));
  }, []);

  const connectivityState = useConnectivityState();
  const isOffline = connectivityState !== "online";

  const {
    data: dashboard,
    isFetching: isDashboardLoading,
    isError,
    error,
  } = useGetDoctorDashboardV2Query(
    { startDate, endDate },
    { skip: !startDate || !endDate || isOffline, refetchOnMountOrArgChange: true },
  );

  // Separate query/cache tag: doctorName + setupProgress change on the order of
  // "once per onboarding step," not per appointment event, so this must not be
  // refetched by the same realtime/short-TTL path as the volatile stats above.
  const { data: profile } = useGetDoctorDashboardProfileQuery(undefined, { skip: isOffline });

  // This dashboard's "Today's Appointments"/queue widgets read from
  // dashboardApi's "DoctorDashboard" tag, which is a separate cache from
  // appointmentApi's "Appointment" tag — so a status change (e.g. marking an
  // appointment Completed) never auto-refreshed this screen without a manual
  // reload. Listen for the same socket events the appointment list already
  // uses, and invalidate this dashboard's tag too.
  const dispatch = useAppDispatch();
  useAppointmentRealtime({
    doctorId: currentUser?.id,
    onAppointmentEvent: () => {
      dispatch(dashboardApi.util.invalidateTags(["DoctorDashboard"]));
    },
  });

  React.useEffect(() => {
    if (!isError) return;
    addToast({ title: "Dashboard", description: getRtkErrorMessage(error), color: "danger", variant: "flat" });
  }, [isError, error]);

  const doctorNameForHeader = React.useMemo(() => {
    return doctorGreetingName(
      profile?.data?.doctorName ?? currentUser?.name ?? currentUser?.email,
    );
  }, [profile, currentUser]);

  const todayAppointments: PendingAppt[] = React.useMemo(() => {
    const raw = dashboard?.data?.pendingAppointments ?? [];
    return raw
      .map((p, index) => {
        const id = String(p.appointmentId ?? `pending-${index}`);
        const start = mergeDateTime(p.appointmentDate, p.appointmentTime ?? null);
        const payment = p.payment ?? {};
        const paymentMethod = cleanText(payment.paymentMode);
        const paymentStatus = cleanText(payment.paymentStatus);
        const price = Number(payment.price ?? 0);
        return {
          id,
          patientName: p.name ?? "Unknown",
          profileImage: p.profileImage ?? null,
          start,
          time: p.appointmentTime ?? null,
          notes: cleanText(p.reasonForVisit ?? p.appointmentType),
          symptoms: formatSymptoms(p.symptoms),
          age: p.age != null ? String(p.age) : null,
          gender: p.gender ?? null,
          status: "Pending",
          payment: paymentStatus || null,
          paymentMethod: paymentMethod || null,
          paymentPrice: Number.isFinite(price) ? price : null,
          tokenNo: p.tokenNo ?? null,
          mobile: p.mobile ?? null,
          appointmentType: cleanText(p.appointmentType),
          dateLabel: formatDateLabel(p.appointmentDate),
        };
      })
      .sort((a: PendingAppt, b: PendingAppt) => {
        const aT = a.tokenNo != null ? 0 : 1;
        const bT = b.tokenNo != null ? 0 : 1;
        if (aT !== bT) return aT - bT;
        if (a.tokenNo != null && b.tokenNo != null) return a.tokenNo - b.tokenNo;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
  }, [dashboard]);

  const visibleAppointments = todayAppointments;

  const dashStats = React.useMemo(() => {
    const st = dashboard?.data?.status;
    return {
      totalAppointments: st?.totalAppointments?.count ?? 0,
      noShow: st?.noShowAppointments?.count ?? 0,
      completed: st?.completedAppointments?.count ?? 0,
      waiting: st?.waitingPatients?.count ?? 0,
      remaining: st?.remainingAppointments?.count ?? 0,
      confirmed: st?.confirmedAppointments?.count ?? 0,
      pending: st?.pendingAppointments?.count ?? 0,
      cancelled: st?.cancelledAppointments?.count ?? 0,
      deltaAppt: st?.totalAppointments?.hikePercent,
      deltaWaiting: st?.waitingPatients?.hikePercent,
      deltaCompleted: st?.completedAppointments?.hikePercent,
      deltaRemaining: st?.remainingAppointments?.hikePercent,
    };
  }, [dashboard]);

  const statusBreakdown = React.useMemo(
    () => [
      { label: "Completed", value: dashStats.completed, color: "#27b77a" },
      { label: "Confirmed", value: dashStats.confirmed, color: "#6366f1" },
      { label: "Pending", value: dashStats.pending, color: "#f59e0b" },
      { label: "Waiting", value: dashStats.waiting, color: "#3b82f6" },
      { label: "Cancelled", value: dashStats.cancelled, color: "#94a3b8" },
      { label: "No-Show", value: dashStats.noShow, color: "#f43f5e" },
    ],
    [dashStats],
  );

  const trendData = dashboard?.data?.appointmentStats ?? [];

  const showSkeleton = !dashboard && isDashboardLoading;

  return (
    <div className="w-full min-w-0 pb-4 sm:pb-6 antialiased dark:bg-[#0b1321]">
      {showSkeleton ? (
        <div className="space-y-4 sm:space-y-6">
          {!hideHeader && (
            <>
              <Sk className="h-8 w-48 sm:w-72" />
              <Sk className="h-4 w-64 sm:w-96" />
            </>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-[90px] rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
            <Sk className="h-64 rounded-xl" />
            <Sk className="h-64 rounded-xl" />
          </div>
          <Sk className="h-20 rounded-xl" />
          <Sk className="h-72 rounded-xl" />
        </div>
      ) : (
        <div className="max-w-full space-y-5">

          {/* ===== Header: Date Controls ===== */}
          {!hideHeader && (
            <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex shrink-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[20px] sm:text-[24px] font-semibold leading-tight tracking-tight text-text md:text-[26px]">
                    {getGreeting()}, Dr. {doctorNameForHeader} 👋
                  </h2>
                  <FeatureInfoTip
                    title="Dashboard Tips"
                    tips={dashboardTips}
                    guideSection="dashboard-doctor"
                    linkLabel="Read dashboard guide"
                  />
                </div>
                <p className="text-[13px] sm:text-[14px] font-normal leading-5 text-text-muted">
                  Here's what's happening in your clinic today.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
                <div className="relative flex w-full sm:w-auto items-center gap-3 overflow-x-auto no-scrollbar sm:justify-end" data-datepicker-anchor>
                  <DateFilterTabs
                    active={activeTab}
                    onChange={handleTabChange}
                    onCustom={() => { setActiveTab("custom"); setShowCustomCalendar(true); }}
                    customLabel={activeTab === "custom" && !showCustomCalendar ? formatDateRangeLabel(startDate, endDate) : undefined}
                    startYmd={startDate}
                    endYmd={endDate}
                    onRangeChange={(s, e) => { setStartDate(s); setEndDate(e); }}
                  />
                  {showCustomCalendar && (
                    <CustomDateRangePicker
                      startYmd={startDate}
                      endYmd={endDate}
                      onApply={(s, e) => { setStartDate(s); setEndDate(e); setShowCustomCalendar(false); }}
                      onCancel={() => { setShowCustomCalendar(false); setActiveTab("today"); handleTabChange("today"); }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== Essential Statistics ===== */}
          <div id="tour-doctor-dashboard-stats" className={isDashboardLoading ? "opacity-80 transition-opacity" : ""}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              <StatCard
                icon={<FiCalendar className="h-5 w-5 text-[#27b77a]" />}
                label="Today's Appointments"
                value={formatCompact(dashStats.totalAppointments)}
                delta={dashStats.deltaAppt}
                bgColor="bg-[rgba(39,183,122,0.1)]"
                deltaLabel="yesterday"
              />
              <StatCard
                icon={<FiUsers className="h-5 w-5 text-[#6366f1]" />}
                label="Waiting Patients"
                value={formatCompact(dashStats.waiting)}
                delta={dashStats.deltaWaiting}
                bgColor="bg-[rgba(99,102,241,0.1)]"
                deltaLabel="yesterday"
              />
              <StatCard
                icon={<TbChartLine className="h-5 w-5 text-[#01c2a8]" />}
                label="Completed"
                value={formatCompact(dashStats.completed)}
                delta={dashStats.deltaCompleted}
                bgColor="bg-primary/10"
                deltaLabel="yesterday"
              />
              <StatCard
                icon={<FiClock className="h-5 w-5 text-[#3b82f6]" />}
                label="Remaining"
                value={formatCompact(dashStats.remaining)}
                delta={dashStats.deltaRemaining}
                bgColor="bg-blue-500/10"
                deltaLabel="yesterday"
                sparkUp={false}
              />
            </div>
          </div>

          {/* ===== Start Your Day + Today's Appointments ===== */}
          <div id="tour-doctor-consultation-board" className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr]">
            <StartYourDayCard
              firstPatient={visibleAppointments[0]}
              waitingCount={dashStats.waiting}
              totalAppointments={dashStats.totalAppointments}
              completedCount={dashStats.completed}
              remainingCount={dashStats.remaining}
              onStartConsultation={() => {
                const first = visibleAppointments[0];
                if (first) navigateWhenApproved(`/appointment/${first.id}`);
                else navigateWhenApproved("/appointment");
              }}
              onViewPatient={() => {
                const first = visibleAppointments[0];
                if (first) navigateWhenApproved(`/appointment/${first.id}`);
                else navigateWhenApproved("/patients");
              }}
              onAddWalkIn={() => navigateWhenApproved("/appointment/new")}
              isNavigationDisabled={isDoctorApprovalLocked}
            />
            <TodaysAppointmentsList
              appointments={visibleAppointments}
              onViewCalendar={() => navigateWhenApproved("/appointment/calendar")}
              onViewAppointment={(id) => navigateWhenApproved(`/appointment/${id}`)}
              onAddWalkIn={() => navigateWhenApproved("/appointment/new")}
              isNavigationDisabled={isDoctorApprovalLocked}
            />
          </div>

          {/* ===== Interactive Insights: Trend + Status Breakdown ===== */}
          <div id="tour-doctor-trend" className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr]">
            <AppointmentTrendChart data={trendData} />
            <DonutOverviewCard
              title="Appointment Breakdown"
              centerLabel="Total"
              items={statusBreakdown}
            />
          </div>

          {/* ===== Bottom Info Grid: Recent Patients, Patient Insights ===== */}
          <div id="tour-doctor-insights" className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <RecentPatients
              appointments={visibleAppointments}
              navigate={navigateWhenApproved}
              isNavigationDisabled={isDoctorApprovalLocked}
            />
            <PatientInsightsCard
              peakHours={dashboard?.data?.peakHours ?? []}
              newPatients={dashboard?.data?.patientTypes?.newPatients?.count}
              newPatientsTrend={dashboard?.data?.patientTypes?.newPatients?.hikePercent}
              returningPatients={dashboard?.data?.patientTypes?.returningPatients?.count}
              returningPatientsTrend={dashboard?.data?.patientTypes?.returningPatients?.hikePercent}
              uniquePatients={dashboard?.data?.status?.uniquePatients?.count}
              uniquePatientsTrend={dashboard?.data?.status?.uniquePatients?.hikePercent}
            />
          </div>

          {/* ===== Quick Clinic Actions ===== */}
          <div id="tour-doctor-quick-actions">
            <QuickActionsGrid
              navigate={navigateWhenApproved}
              isNavigationDisabled={isDoctorApprovalLocked}
            />
          </div>

          <DashboardFooter />
        </div>
      )}
    </div>
  );
};

export default DoctorDash;
