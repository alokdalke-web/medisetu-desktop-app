// src/pages/dashboard/ReceptionistDash.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiPlus,
  FiChevronDown,
  FiUsers,
  FiUserPlus,
  FiUserCheck,
  FiPhoneCall,
} from "react-icons/fi";
import { MdOutlinePayment, MdOutlineRefresh } from "react-icons/md";
import { useSelector } from "react-redux";

import { useGetClinicAppointmentsQuery } from "../../redux/api/appointmentApi";
import { useGetAllUsersQuery } from "../../redux/api/usersApi";
import { useGetUserQuery } from "../../redux/api/authApi";
import type { RootState } from "../../redux/store";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { dashboardTips } from "../../constants/featureTips";
import { StatCard } from "../../components/StatCard";
import DashboardFooter from "./DashboardFooter";

/* ============ Helpers ============ */

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mergeDateTime(dateISO?: string | null, hhmm?: string | null): string {
  if (!dateISO) return new Date().toISOString();
  const dt = new Date(dateISO);
  if (hhmm) {
    const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
    if (!Number.isNaN(h)) dt.setHours(h);
    if (!Number.isNaN(m)) dt.setMinutes(m);
    dt.setSeconds(0);
    dt.setMilliseconds(0);
  }
  return dt.toISOString();
}

function fmtTime12(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function initials(name: string) {
  const parts = String(name || "").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const cn = (...xs: Array<string | undefined | false>) =>
  xs.filter(Boolean).join(" ");

/* ============ Types ============ */

type AppointmentRow = {
  id: string;
  name: string;
  avatar: string | null;
  start: string;
  time: string | null;
  tokenNo: number | null;
  doctorName: string;
  status: string;
  type: string;
  payment: string | null;
  paymentMethod: string | null;
};

/* ============ Shared Atoms (mirroring AdminDash) ============ */

const Sk = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-lg bg-slate-200 dark:bg-[#172033] ${className}`}
  />
);

/** Arrow icon rotated 90° (pointing right) matching Figma solar:arrow-up-linear */
const ArrowUpRight = ({ className = "" }: { className?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    className={`shrink-0 rotate-90 ${className}`}
  >
    <path
      d="M12 19V5M5 12L12 5L19 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toLowerCase() ?? "";
  let bg = "bg-[#fef9c3]";
  let text = "text-[#854d0e]";
  let label = "Pending";

  if (s.includes("complet")) {
    bg = "bg-[#dcfce7]";
    text = "text-[#166534]";
    label = "Completed";
  } else if (s.includes("progress") || s.includes("confirm")) {
    bg = "bg-[#dbeafe]";
    text = "text-[#1e40af]";
    label = "Confirmed";
  } else if (s.includes("cancel")) {
    bg = "bg-[#fee2e2]";
    text = "text-[#991b1b]";
    label = "Cancelled";
  } else if (s.includes("noshow") || s.includes("no show") || s.includes("no-show")) {
    bg = "bg-[#ffe4e6]";
    text = "text-[#9f1239]";
    label = "No Show";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${bg} ${text}`}
    >
      {label}
    </span>
  );
};

/* ============ Quick Actions Widget ============ */

const QuickActionsWidget = ({
  navigate,
}: {
  navigate: (path: string) => void;
}) => (
  <div className="flex flex-col gap-3">
    <h3 className="text-[15px] font-semibold text-[#100e1c] dark:text-white">
      Quick Actions
    </h3>
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-3">
      <button
        type="button"
        onClick={() => navigate("/appointment/new")}
        className="bg-white border border-[rgba(229,231,234,0.6)] rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:bg-[#111726] dark:border-[#273244] dark:hover:bg-[#151e31]"
      >
        <div className="h-8 w-8 rounded-lg bg-[rgba(39,183,122,0.1)] flex items-center justify-center dark:bg-[#16352f]">
          <FiCalendar className="h-4 w-4 text-[#27b77a]" />
        </div>
        <span className="text-[11px] font-medium text-[#100e1c] text-center leading-tight dark:text-white">
          New Appointment
        </span>
      </button>
      <button
        type="button"
        onClick={() => navigate("/patient/new")}
        className="bg-white border border-[rgba(229,231,234,0.6)] rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:bg-[#111726] dark:border-[#273244] dark:hover:bg-[#151e31]"
      >
        <div className="h-8 w-8 rounded-lg bg-[rgba(99,102,241,0.1)] flex items-center justify-center dark:bg-[#1d2440]">
          <FiUserPlus className="h-4 w-4 text-[#6366f1]" />
        </div>
        <span className="text-[11px] font-medium text-[#100e1c] text-center leading-tight dark:text-white">
          Add Patient
        </span>
      </button>
      <button
        type="button"
        onClick={() => navigate("/patients")}
        className="bg-white border border-[rgba(229,231,234,0.6)] rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:bg-[#111726] dark:border-[#273244] dark:hover:bg-[#151e31]"
      >
        <div className="h-8 w-8 rounded-lg bg-[rgba(40,152,255,0.1)] flex items-center justify-center dark:bg-[#172b48]">
          <FiUsers className="h-4 w-4 text-[#2898ff]" />
        </div>
        <span className="text-[11px] font-medium text-[#100e1c] text-center leading-tight dark:text-white">
          Patients
        </span>
      </button>
      <button
        type="button"
        onClick={() => navigate("/payment-history")}
        className="bg-white border border-[rgba(229,231,234,0.6)] rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:bg-[#111726] dark:border-[#273244] dark:hover:bg-[#151e31]"
      >
        <div className="h-8 w-8 rounded-lg bg-[rgba(10,108,116,0.1)] flex items-center justify-center dark:bg-[#0f2a2b]">
          <MdOutlinePayment className="h-4 w-4 text-[#0a6c74]" />
        </div>
        <span className="text-[11px] font-medium text-[#100e1c] text-center leading-tight dark:text-white">
          Payments
        </span>
      </button>
    </div>
  </div>
);

/* ============ Component ============ */

const ReceptionistDash = () => {
  const navigate = useNavigate();
  const today = useMemo(() => toYMD(new Date()), []);

  // Greeting target user
  const authUser = useSelector((s: RootState) => s.auth.user);
  const { data: userData } = useGetUserQuery();
  const currentUser = (userData as any)?.user ?? (userData as any) ?? authUser;
  const currentUserName = String(currentUser?.name ?? "Receptionist").trim();

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

  const { data: doctorsData } = useGetAllUsersQuery({
    page: 1,
    pageSize: 100,
    userType: "Doctor",
  });

  const doctorsList = useMemo(() => {
    return (doctorsData?.users ?? []).map((d: any) => ({
      id: String(d.id ?? d._id ?? ""),
      name: String(d.name ?? d.firstName ?? "Unknown"),
    }));
  }, [doctorsData]);

  const selectedDoctorName = useMemo(() => {
    if (!selectedDoctorId) return "All Doctors";
    const found = doctorsList.find(
      (d: { id: string; name: string }) => d.id === selectedDoctorId
    );
    return found?.name ?? "All Doctors";
  }, [selectedDoctorId, doctorsList]);

  // Fetch today's appointments
  const queryArgs = useMemo(() => {
    const args: Record<string, any> = {
      startDate: today,
      endDate: today,
      pageSize: 100,
      page: 1,
    };
    if (selectedDoctorId) args.doctorId = selectedDoctorId;
    return args;
  }, [today, selectedDoctorId]);

  const {
    data: appointmentsData,
    isLoading,
    isFetching,
  } = useGetClinicAppointmentsQuery(queryArgs, {
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
          paymentMethod: payment.paymentMode ?? appt?.paymentMethod ?? null,
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

  // Stats
  const stats = useMemo(() => {
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
    return { total, pending, confirmed, completed };
  }, [allAppointments]);

  const showSkeleton = isLoading && !appointmentsData;

  return (
    <div className="w-full min-w-0 px-3 sm:px-0 pt-0 pb-4 sm:pb-6 antialiased lg:h-full lg:flex lg:flex-col lg:overflow-hidden dark:bg-[#0b1321]">
      {showSkeleton ? (
        <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto no-scrollbar space-y-4 sm:space-y-6">
          <Sk className="h-8 w-48 sm:w-72" />
          <Sk className="h-4 w-64 sm:w-96" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Sk key={i} className="h-[104px] rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] gap-4 sm:gap-5">
            <div className="space-y-4 sm:space-y-5">
              <Sk className="h-72 rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <Sk className="h-60 rounded-2xl" />
            </div>
          </div>
        </div>
      ) : (
        <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto no-scrollbar">
          <div className="max-w-full space-y-4 sm:space-y-5">
            {/* ===== Header: Greeting + Doctor Filter ===== */}
            <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex shrink-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] sm:text-[22px] md:text-[24px] lg:text-[26px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white">
                    {getGreeting()}, {currentUserName.split(" ")[0]} 👋
                  </h2>
                  <FeatureInfoTip
                    title="Dashboard Tips"
                    tips={dashboardTips}
                    guideSection="dashboard-receptionist"
                    linkLabel="Read dashboard guide"
                  />
                </div>
                <p className="text-[12px] sm:text-[13px] lg:text-[14px] font-normal leading-5 text-[#677294] dark:text-white">
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
                {/* Doctor Filter */}
                <div className="relative w-full sm:w-auto" ref={doctorDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDoctorDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-xl border border-[rgba(207,207,207,0.5)] bg-white py-2.5 pr-4 pl-3 text-[14px] text-[#100e1c] hover:bg-slate-50 w-full sm:w-auto min-w-[180px] dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]"
                  >
                    <FiUsers className="h-[18px] w-[18px] text-[#677294] dark:text-white" />
                    <span className="truncate max-w-[160px]">
                      {selectedDoctorName}
                    </span>
                    <FiChevronDown className="h-4 w-4 text-[#677294] ml-auto dark:text-white" />
                  </button>
                  {isDoctorDropdownOpen && (
                    <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg max-h-60 overflow-y-auto dark:border-[#273244] dark:bg-[#111726]">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoctorId("");
                          setIsDoctorDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-[#151e31]",
                          !selectedDoctorId
                            ? "font-medium text-slate-900 bg-slate-50 dark:text-white dark:bg-[#151e31]"
                            : "text-slate-700 dark:text-white"
                        )}
                      >
                        All Doctors
                      </button>
                      {doctorsList.map((doc: { id: string; name: string }) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => {
                            setSelectedDoctorId(doc.id);
                            setIsDoctorDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-[#151e31]",
                            selectedDoctorId === doc.id
                              ? "font-medium text-slate-900 bg-slate-50 dark:text-white dark:bg-[#151e31]"
                              : "text-slate-700 dark:text-white"
                          )}
                        >
                          {doc.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* New Appointment CTA */}
                <button
                  type="button"
                  onClick={() => navigate("/appointment/new")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#0a6c74] px-4 py-2.5 text-[14px] font-medium text-white hover:bg-[#085a61] transition w-full sm:w-auto dark:bg-[#0a6c74] dark:hover:bg-[#085a61]"
                >
                  <FiPlus className="h-4 w-4" /> New Appointment
                </button>
              </div>
            </div>

            <div
              id="tour-reception-dashboard-overview"
              className="space-y-4 scroll-mt-6 sm:space-y-5"
            >
              {/* ===== Top Metric Cards ===== */}
              <div
                className={cn(
                  "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4",
                  isFetching && "opacity-80 transition-opacity"
                )}
              >
                <StatCard
                  icon={<FiCalendar className="h-5 w-5 text-[#27b77a]" />}
                  label="Today's"
                  sublabel="Appointments"
                  value={String(stats.total).padStart(2, "0")}
                  bgColor="bg-[rgba(39,183,122,0.1)]"
                  compact
                />
                <StatCard
                  icon={<FiClock className="h-5 w-5 text-[#e89b00]" />}
                  label="Pending"
                  sublabel="Check-ins"
                  value={String(stats.pending).padStart(2, "0")}
                  bgColor="bg-[#fff7e6]"
                  compact
                  sparkUp={false}
                />
                <StatCard
                  icon={<FiCheckCircle className="h-5 w-5 text-[#2898ff]" />}
                  label="Confirmed"
                  value={String(stats.confirmed).padStart(2, "0")}
                  bgColor="bg-[#eef6ff]"
                  compact
                />
                <StatCard
                  icon={<FiUserCheck className="h-5 w-5 text-[#6366f1]" />}
                  label="Completed"
                  value={String(stats.completed).padStart(2, "0")}
                  bgColor="bg-[rgba(99,102,241,0.1)]"
                  compact
                />
              </div>

              {/* ===== Main Content: Appointments Table + Right Sidebar ===== */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] gap-4 sm:gap-5">
                {/* Left Column */}
                <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
                  {/* Today's Appointments Table */}
                  <div className="bg-white border border-[rgba(229,231,234,0.6)] rounded-[16px] overflow-hidden shadow-[0_1px_1px_rgba(0,0,0,0.05)] flex flex-col min-w-0 dark:bg-[#111726] dark:border-[#273244] dark:shadow-none">
                    {/* Table Header */}
                    <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
                      <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
                        Today's Appointments
                      </h3>
                      <span className="text-[12px] font-medium text-[#677294] dark:text-white">
                        {allAppointments.length} total
                      </span>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-left min-w-[600px]">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-[12px] font-semibold text-[#677294] uppercase tracking-[0.8px] dark:text-white">
                              Patient
                            </th>
                            <th className="px-4 py-2 text-[12px] font-semibold text-[#677294] uppercase tracking-[0.8px] dark:text-white">
                              Time
                            </th>
                            <th className="px-4 py-2 text-[12px] font-semibold text-[#677294] uppercase tracking-[0.8px] dark:text-white">
                              Doctor
                            </th>
                            <th className="px-4 py-2 text-[12px] font-semibold text-[#677294] uppercase tracking-[0.8px] dark:text-white">
                              Type
                            </th>
                            <th className="px-4 py-2 text-[12px] font-semibold text-[#677294] uppercase tracking-[0.8px] text-center dark:text-white">
                              Status
                            </th>
                            <th className="px-4 py-2 text-[12px] font-semibold text-[#677294] uppercase tracking-[0.8px] text-center dark:text-white">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {allAppointments.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-4 py-12 text-center text-sm text-[#677294] dark:text-white"
                              >
                                No appointments today.
                              </td>
                            </tr>
                          ) : (
                            allAppointments.slice(0, 8).map((appt) => (
                              <tr
                                key={appt.id}
                                className="hover:bg-[#f8f9fb] transition cursor-pointer dark:hover:bg-[#151e31]"
                                onClick={() =>
                                  navigate(`/appointment/${appt.id}`)
                                }
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    {appt.avatar ? (
                                      <img
                                        src={appt.avatar}
                                        alt={appt.name}
                                        className="h-8 w-8 rounded-full object-cover shrink-0"
                                      />
                                    ) : (
                                      <div className="h-8 w-8 rounded-full bg-[#eef1ff] flex items-center justify-center text-[10px] font-semibold text-[#6366f1] shrink-0 dark:bg-[#1d2440] dark:text-white">
                                        {initials(appt.name)}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-[14px] font-semibold text-[#181c1c] leading-normal dark:text-white truncate">
                                        {appt.name}
                                      </p>
                                      {appt.tokenNo != null && (
                                        <p className="text-[11px] font-normal text-[#3e4947] dark:text-white">
                                          Token #{appt.tokenNo}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-[14px] font-normal text-[#181c1c] dark:text-white whitespace-nowrap">
                                  {appt.time ? fmtTime12(appt.start) : "—"}
                                </td>
                                <td className="px-4 py-3 text-[14px] font-normal text-[#181c1c] dark:text-white">
                                  {appt.doctorName}
                                </td>
                                <td className="px-4 py-3 text-[14px] font-normal text-[#181c1c] dark:text-white">
                                  {appt.type}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <StatusBadge status={appt.status} />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                      className="h-[29px] w-[29px] rounded-full border-[0.5px] border-[#e5484d] flex items-center justify-center hover:bg-red-50 transition dark:hover:bg-[#332022]"
                                      title="Mark no-show"
                                    >
                                      <MdOutlineRefresh className="h-4 w-4 text-[#e5484d]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/appointment/${appt.id}`);
                                      }}
                                      className="bg-[#0a6c74] rounded-lg px-2.5 py-1 w-[54px] text-[12px] font-medium text-white tracking-[-0.3px] capitalize hover:bg-[#085a61] transition text-center"
                                    >
                                      view
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[#e5e7ea] px-4 py-3 flex justify-center dark:border-[#273244]">
                      <button
                        type="button"
                        onClick={() => navigate("/appointment")}
                        className="flex items-center gap-2 text-[14px] font-medium text-[#0a6c74] tracking-[-0.3px] hover:gap-3 hover:opacity-80 transition-all duration-200 dark:text-[#9be7dc]"
                      >
                        View All Appointments{" "}
                        <ArrowUpRight className="text-[#0a6c74] dark:text-[#9be7dc]" />
                      </button>
                    </div>
                  </div>

                  {/* Doctor-wise queue hint when filter is active */}
                  {selectedDoctorId && (
                    <div className="bg-white border border-[rgba(229,231,234,0.6)] rounded-[16px] p-4 flex items-center gap-3 dark:bg-[#111726] dark:border-[#273244]">
                      <div className="h-9 w-9 rounded-full bg-[#e6fbf7] flex items-center justify-center shrink-0 dark:bg-[#16352f]">
                        <FiPhoneCall className="h-4 w-4 text-[#0a6c74] dark:text-[#9be7dc]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#100e1c] dark:text-white">
                          Showing only {selectedDoctorName}
                        </p>
                        <p className="text-[12px] font-medium text-[#677294] dark:text-white">
                          Clear the filter to see all doctors' queues for today.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDoctorId("")}
                        className="ml-auto text-[12px] font-medium text-[#0a6c74] hover:underline shrink-0 dark:text-[#9be7dc]"
                      >
                        Clear filter
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Sidebar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-5">
                  <QuickActionsWidget navigate={navigate} />
                </div>
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
