// src/pages/dashboard/receptionistDash/ReceptionistDash.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { FiCalendar, FiPlus, FiUsers } from "react-icons/fi";
import { HiOutlineClock } from "react-icons/hi";
import { MdOutlinePayment } from "react-icons/md";
import { TbChartLine } from "react-icons/tb";
import { useSelector } from "react-redux";

import { useGetClinicAppointmentsQuery } from "../../../redux/api/appointmentApi";
import { useGetReceptionOverviewQuery } from "../../../redux/api/dashboardApi";
import { useGetDoctorListQuery } from "../../../redux/api/usersApi";
import { useGetUserQuery } from "../../../redux/api/authApi";
import { useConnectivityState } from "../../../hooks/useConnectivityState";
import { skipToken } from "@reduxjs/toolkit/query";
import type { RootState } from "../../../redux/store";
import FeatureInfoTip from "../../../components/shared/FeatureInfoTip";
import { dashboardTips } from "../../../constants/featureTips";
import ReceptionStatCard from "./components/ReceptionStatCard";
import DashboardFooter from "../DashboardFooter";
import { normalizeStatus } from "../../../utils/clinicSetupStatus";

import Sk from "../components/Skeleton";
import DonutOverviewCard, { type DonutItem } from "../DonutOverviewCard";
import AppointmentsTable from "./components/AppointmentsTable";
import DoctorFilterDropdown from "./components/DoctorFilterDropdown";
import DoctorQueueHint from "./components/DoctorQueueHint";
import DoctorQueueWidget from "./components/DoctorQueueWidget";
import PendingPaymentsWidget from "./components/PendingPaymentsWidget";
import QuickActionsWidget from "./components/QuickActionsWidget";
import { fmtINR, fmtTime12, getGreeting, mergeDateTime, toYMD } from "./helpers/receptionistDashFormatters";
import type { AppointmentRow } from "../../../types/receptionistDash";

const APPROVAL_LOCKED_TITLE = "Available after account approval";
const disabledNavClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:-translate-y-0";

const ReceptionistDash = () => {
  const navigate = useNavigate();
  const today = useMemo(() => toYMD(new Date()), []);

  // Greeting target user
  const authUser = useSelector((s: RootState) => s.auth.user);
  const { data: userData } = useGetUserQuery();
  const currentUser = (userData as any)?.user ?? (userData as any) ?? authUser;
  const currentUserName = String(currentUser?.name ?? "Receptionist").trim();
  const isApprovalPending = normalizeStatus(currentUser?.userStatus) === "pending";
  const lockedTitle = isApprovalPending ? APPROVAL_LOCKED_TITLE : undefined;
  
  const connectivityState = useConnectivityState();
  const isOffline = connectivityState !== "online";

  const navigateWhenApproved = (path: string) => {
    if (isApprovalPending) return;
    navigate(path);
  };

  // Doctor filter
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);
  const doctorDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        doctorDropdownRef.current &&
        !doctorDropdownRef.current.contains(e.target as Node)
      ) {
        setIsDoctorDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isApprovalPending) setIsDoctorDropdownOpen(false);
  }, [isApprovalPending]);

  // Purpose-built, server-cached dropdown list — lighter than paging all users.
  const { data: doctorsData } = useGetDoctorListQuery(undefined, { skip: isOffline });

  const doctorsList = useMemo(() => {
    return (doctorsData ?? []).map((d) => ({
      id: String(d.id ?? ""),
      name: String(d.name ?? "Unknown"),
    }));
  }, [doctorsData]);

  const selectedDoctorName = useMemo(() => {
    if (!selectedDoctorId) return "All Doctors";
    const found = doctorsList.find((d) => d.id === selectedDoctorId);
    return found?.name ?? "All Doctors";
  }, [selectedDoctorId, doctorsList]);

  // Fetch today's appointments
  const queryArgs = useMemo(() => {
    if (isOffline) return undefined;
    const args: Record<string, any> = {
      startDate: today,
      endDate: today,
      pageSize: 100,
      page: 1,
    };
    if (selectedDoctorId) args.doctorId = selectedDoctorId;
    return args;
  }, [today, selectedDoctorId, isOffline]);

  const {
    data: appointmentsData,
    isLoading,
    isFetching,
  } = useGetClinicAppointmentsQuery(queryArgs ?? skipToken, {
    refetchOnMountOrArgChange: true,
  });

  // Parse appointment data
  const allAppointments: AppointmentRow[] = useMemo(() => {
    const raw =
      (appointmentsData as any)?.result?.patients ??
      (appointmentsData as any)?.patients ??
      [];
    return raw
      .map((item: any) => {
        const appt = item?.appointment ?? {};
        const doctor = item?.doctor ?? {};
        const payment = appt?.payment ?? {};
        const start = mergeDateTime(
          appt?.appointmentDate ?? item?.appointmentDate ?? today,
          appt?.appointmentTime ?? null,
        );
        return {
          id: String(appt?.id ?? item?.id ?? ""),
          name: String(item?.name ?? "Unknown"),
          avatar: item?.profileImage ?? null,
          start,
          time: appt?.appointmentTime ?? null,
          tokenNo: appt?.tokenNo ?? item?.tokenNo ?? null,
          doctorName: String(doctor?.name ?? "—"),
          status: String(appt?.appointmentStatus ?? "Pending"),
          type: String(appt?.appointmentType ?? "Consultation"),
          payment: payment.paymentStatus ?? appt?.paymentStatus ?? null,
          paymentMethod:
            payment.paymentMode ?? appt?.paymentMode ?? appt?.paymentMethod ?? null,
          amount: (() => {
            const raw = payment.price ?? appt?.price ?? null;
            return raw != null && !Number.isNaN(Number(raw)) ? Number(raw) : null;
          })(),
        };
      })
      .sort((a: AppointmentRow, b: AppointmentRow) => {
        const aT = a.tokenNo != null ? 0 : 1;
        const bT = b.tokenNo != null ? 0 : 1;
        if (aT !== bT) return aT - bT;
        if (a.tokenNo != null && b.tokenNo != null) return a.tokenNo - b.tokenNo;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
  }, [appointmentsData, today]);

  // Stats from the dedicated reception-overview endpoint; falls back to
  // client-side derivation from the appointment list until it loads.
  const { data: overviewData } = useGetReceptionOverviewQuery(
    isOffline ? skipToken : (selectedDoctorId ? { doctorId: selectedDoctorId } : undefined),
    { refetchOnMountOrArgChange: true },
  );

  const stats = useMemo(() => {
    const api = overviewData?.data;
    if (api) {
      return {
        total: api.appointments.total,
        pending: api.appointments.pending,
        confirmed: api.appointments.confirmed,
        completed: api.appointments.completed,
        noShow: api.appointments.noShow,
        cancelled: api.appointments.cancelled,
        remaining: api.appointments.remaining,
        collectedToday: api.payments.collectedToday,
        pendingAmount: api.payments.pendingAmount,
        pendingCount: api.payments.pendingCount,
        paidCount: api.payments.paidCount,
        newPatients: api.patientsRegisteredToday,
      };
    }
    const total = allAppointments.length;
    const pending = allAppointments.filter((a) =>
      ["pending", "Confirmed", "Scheduled"].includes(a.status)
    ).length;
    const confirmed = allAppointments.filter(
      (a) => a.status.toLowerCase() === "confirmed"
    ).length;
    const completed = allAppointments.filter(
      (a) => a.status.toLowerCase() === "completed"
    ).length;
    return {
      total,
      pending,
      confirmed,
      completed,
      noShow: 0,
      cancelled: 0,
      remaining: total - completed,
      collectedToday: 0,
      pendingAmount: 0,
      pendingCount: 0,
      paidCount: 0,
      newPatients: 0,
    };
  }, [overviewData, allAppointments]);

  const doctorQueues = overviewData?.data?.doctorQueues ?? [];

  // First patient still to be seen (list is already token/time sorted)
  const nextUp = useMemo(() => {
    const next = allAppointments.find((a) => {
      const s = a.status.toLowerCase();
      return (
        s !== "completed" &&
        !s.includes("cancel") &&
        !s.includes("noshow") &&
        !s.includes("no show") &&
        !s.includes("no-show")
      );
    });
    if (!next) return null;
    const when =
      next.tokenNo != null
        ? `Token #${next.tokenNo}`
        : next.time
          ? fmtTime12(next.start)
          : null;
    return when ? `Next: ${when} · ${next.name}` : `Next: ${next.name}`;
  }, [allAppointments]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Slice order keeps the red/green pair (Cancelled/Completed) non-adjacent for
  // color-vision-deficient readers; the legend + slice gaps carry identity too.
  const statusDonutItems: DonutItem[] = useMemo(
    () => [
      { label: "Pending", value: stats.pending, color: "var(--color-status-pending)" },
      { label: "Confirmed", value: stats.confirmed, color: "var(--color-status-confirmed)" },
      { label: "Completed", value: stats.completed, color: "var(--color-status-completed)" },
      { label: "No-show", value: stats.noShow, color: "var(--color-text-subtle)" },
      { label: "Cancelled", value: stats.cancelled, color: "var(--color-status-cancelled)" },
    ],
    [stats],
  );

  const showSkeleton = isLoading && !appointmentsData;

  return (
    <div className="w-full min-w-0 px-3 sm:px-0 pt-0 pb-4 sm:pb-6 antialiased lg:h-full lg:flex lg:flex-col lg:overflow-hidden dark:bg-[#0b1321]">
      {showSkeleton ? (
        <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto no-scrollbar space-y-4 sm:space-y-6">
          <Sk className="h-8 w-48 sm:w-72" />
          <Sk className="h-4 w-64 sm:w-96" />
          <div className="flex gap-3 overflow-x-hidden xl:grid xl:grid-cols-5 xl:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Sk
                key={i}
                className="h-[104px] shrink-0 grow basis-[230px] rounded-xl xl:basis-auto"
              />
            ))}
          </div>
          <Sk className="h-72 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            <Sk className="h-60 rounded-2xl" />
            <Sk className="h-60 rounded-2xl" />
            <Sk className="h-60 rounded-2xl md:col-span-2 xl:col-span-1" />
          </div>
        </div>
      ) : (
        <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto no-scrollbar">
          <div className="max-w-full space-y-4 sm:space-y-5">
            {/* ===== Header: Greeting + Doctor Filter ===== */}
            <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex shrink-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] sm:text-[22px] md:text-[24px] lg:text-[26px] font-semibold leading-tight tracking-tight text-text">
                    {getGreeting()}, {currentUserName.split(" ")[0]} 👋
                  </h2>
                  <FeatureInfoTip
                    title="Dashboard Tips"
                    tips={dashboardTips}
                    guideSection="dashboard-receptionist"
                    linkLabel="Read dashboard guide"
                  />
                </div>
                <p className="text-[12px] sm:text-[13px] lg:text-[14px] font-normal leading-5 text-text-muted">
                  Here's your reception queue for today —{" "}
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  .
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
                <DoctorFilterDropdown
                  doctorsList={doctorsList}
                  selectedDoctorId={selectedDoctorId}
                  selectedDoctorName={selectedDoctorName}
                  isOpen={isDoctorDropdownOpen}
                  setIsOpen={setIsDoctorDropdownOpen}
                  onSelect={(id) => {
                    setSelectedDoctorId(id);
                    setIsDoctorDropdownOpen(false);
                  }}
                  isApprovalPending={isApprovalPending}
                  lockedTitle={lockedTitle}
                  dropdownRef={doctorDropdownRef}
                />

                {/* New Appointment CTA */}
                <button
                  type="button"
                  disabled={isApprovalPending}
                  title={lockedTitle}
                  onClick={() => navigateWhenApproved("/appointment/new")}
                  className={`cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[14px] font-medium text-white hover:bg-[#085a61] transition w-full sm:w-auto ${disabledNavClass}`}
                >
                  <FiPlus className="h-4 w-4" /> New Appointment
                </button>
              </div>
            </div>

            <div
              id="tour-reception-dashboard-overview"
              className="space-y-4 scroll-mt-6 sm:space-y-5"
            >
              {/* ===== Top Metric Cards (AdminDash icons/colors; swipe-strip
                  layout from AppointmentStatCards — 5 tiles can't grid evenly
                  below xl, see UI_PLAYBOOK.md item 8) ===== */}
              <div
                className={[
                  "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2",
                  "[scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:#9ca3af_transparent] active:[scrollbar-color:#9ca3af_transparent]",
                  "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-400",
                  "xl:grid xl:snap-none xl:grid-cols-5 xl:overflow-visible xl:pb-0 xl:gap-4",
                  isFetching ? "opacity-80 transition-opacity" : "",
                ].join(" ")}
              >
                <div className="flex shrink-0 grow snap-start basis-[230px] xl:basis-auto">
                  <ReceptionStatCard
                    icon={<FiCalendar className="h-5 w-5 text-[#27b77a]" />}
                    label="Today's Appointments"
                    value={String(stats.total)}
                    bgColor="bg-[rgba(39,183,122,0.1)]"
                    detail={`${stats.completed} of ${stats.total} seen`}
                    progressPct={stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}
                    onClick={() => scrollToSection("reception-today-table")}
                    disabled={isApprovalPending}
                    lockedTitle={lockedTitle}
                  />
                </div>
                <div className="flex shrink-0 grow snap-start basis-[230px] xl:basis-auto">
                  <ReceptionStatCard
                    icon={<HiOutlineClock className="h-5 w-5 text-[#e89b00]" />}
                    label="Remaining Queue"
                    value={String(stats.remaining)}
                    bgColor="bg-amber-500/10"
                    detail={nextUp ?? "Queue is clear"}
                    onClick={() => scrollToSection("reception-today-table")}
                    disabled={isApprovalPending}
                    lockedTitle={lockedTitle}
                  />
                </div>
                <div className="flex shrink-0 grow snap-start basis-[230px] xl:basis-auto">
                  <ReceptionStatCard
                    icon={<TbChartLine className="h-5 w-5 text-[#01c2a8]" />}
                    label="Collected Today"
                    value={fmtINR(stats.collectedToday)}
                    bgColor="bg-primary/10"
                    detail={`from ${stats.paidCount} paid visit${stats.paidCount === 1 ? "" : "s"}`}
                    onClick={() => navigateWhenApproved("/payment-history")}
                    disabled={isApprovalPending}
                    lockedTitle={lockedTitle}
                  />
                </div>
                <div className="flex shrink-0 grow snap-start basis-[230px] xl:basis-auto">
                  <ReceptionStatCard
                    icon={<MdOutlinePayment className="h-5 w-5 text-[#3b82f6]" />}
                    label="Pending Payments"
                    value={fmtINR(stats.pendingAmount)}
                    bgColor="bg-blue-500/10"
                    detail={`${stats.pendingCount} patient${stats.pendingCount === 1 ? "" : "s"} due`}
                    onClick={() => scrollToSection("reception-collect-payments")}
                    disabled={isApprovalPending}
                    lockedTitle={lockedTitle}
                  />
                </div>
                <div className="flex shrink-0 grow snap-start basis-[230px] xl:basis-auto">
                  <ReceptionStatCard
                    icon={<FiUsers className="h-5 w-5 text-[#6366f1]" />}
                    label="New Patients"
                    value={String(stats.newPatients)}
                    bgColor="bg-[rgba(99,102,241,0.1)]"
                    detail="registered today · tap to add"
                    onClick={() => navigateWhenApproved("/patient/new")}
                    disabled={isApprovalPending}
                    lockedTitle={lockedTitle}
                  />
                </div>
              </div>

              {/* ===== Main Content ===== */}
              <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
                  <div id="reception-today-table" className="scroll-mt-4">
                    <AppointmentsTable
                      appointments={allAppointments}
                      isApprovalPending={isApprovalPending}
                      lockedTitle={lockedTitle}
                      navigateWhenApproved={navigateWhenApproved}
                    />
                  </div>

                  {/* Doctor-wise queue hint when filter is active */}
                  {selectedDoctorId && (
                    <DoctorQueueHint
                      selectedDoctorName={selectedDoctorName}
                      isApprovalPending={isApprovalPending}
                      lockedTitle={lockedTitle}
                      onClear={() => setSelectedDoctorId("")}
                    />
                  )}

                  {/* Overview band: donut + doctor queues share the row so the
                      wide column never stretches a single card's legend apart */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-start">
                    <DonutOverviewCard
                      title="Appointments Overview"
                      centerLabel="Today"
                      items={statusDonutItems}
                    />
                    <div id="reception-collect-payments" className="scroll-mt-4">
                      <PendingPaymentsWidget
                        appointments={allAppointments}
                        isApprovalPending={isApprovalPending}
                        lockedTitle={lockedTitle}
                        navigateWhenApproved={navigateWhenApproved}
                      />
                    </div>
                    <div className="md:col-span-2 xl:col-span-1">
                      <DoctorQueueWidget
                        queues={doctorQueues}
                        isApprovalPending={isApprovalPending}
                        lockedTitle={lockedTitle}
                        onSelectDoctor={(id) =>
                          setSelectedDoctorId((prev) => (prev === id ? "" : id))
                        }
                      />
                    </div>
                  </div>

                  {/* ===== Quick Actions ===== */}
                  <QuickActionsWidget
                    navigate={navigateWhenApproved}
                    isNavigationDisabled={isApprovalPending}
                  />
              </div>
            </div>

            {/* ===== Footer ===== */}
            <DashboardFooter />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistDash;
