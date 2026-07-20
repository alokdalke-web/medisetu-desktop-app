// src/pages/dashboard/DoctorDash.tsx
import React from "react";
import { addToast } from "@heroui/react";
import { useNavigate } from "react-router";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiUsers,
  FiUserX,
  FiFileText,
  FiChevronRight,
  FiBell,
  FiPlay,
  FiPlus,
} from "react-icons/fi";
import { TbChartLine } from "react-icons/tb";
import { FaUserPlus, FaStethoscope } from "react-icons/fa";
import { BsCapsule, BsClipboard2Pulse } from "react-icons/bs";

import DateFilterTabs, { type DateTab } from "./DateFilterTabs";
import CustomDateRangePicker from "./CustomDateRangePicker";
import DashboardFooter from "./DashboardFooter";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetDoctorDashboardQuery } from "../../redux/api/dashboardApi";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { dashboardTips } from "../../constants/featureTips";
import Images from "../../constants/images";
import { StatCard } from "../../components/StatCard";

/* ---------------- Helpers ---------------- */

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

function parseHikePercent(v: unknown): number | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const m = s.match(/^([+-]?)(\d+(?:\.\d+)?)/);
  if (!m) return undefined;
  const sign = m[1] === "-" ? -1 : 1;
  const num = Number(m[2]);
  if (!Number.isFinite(num)) return undefined;
  return Math.round(sign * Math.abs(num));
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function mergeDateTime(dateISO?: string | null, hhmm?: string | null): string {
  if (!dateISO) return new Date().toISOString();
  const dt = new Date(dateISO);
  if (hhmm && !isPlaceholderTime(hhmm)) {
    const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
    if (!Number.isNaN(h)) dt.setHours(h);
    if (!Number.isNaN(m)) dt.setMinutes(m);
    dt.setSeconds(0);
    dt.setMilliseconds(0);
  }
  return dt.toISOString();
}

function isPlaceholderTime(hhmm?: string | null) {
  const t = String(hhmm ?? "").trim();
  return t === "23:59" || t === "23:59:00";
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

function cleanText(v: unknown): string | null {
  const text = String(v ?? "").trim();
  return text ? text : null;
}

function doctorGreetingName(value: unknown): string {
  return cleanText(value)?.replace(/^dr\.?\s+/i, "") || "Doctor";
}

function formatDateLabel(dateISO?: string | null) {
  const raw = cleanText(dateISO);
  if (!raw) return "—";
  const ymd = raw.includes("T") ? raw.slice(0, 10) : raw;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return raw;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateRangeLabel(startYmd: string, endYmd: string): string {
  const s = new Date(startYmd + "T00:00:00");
  const e = new Date(endYmd + "T00:00:00");
  if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime()))
    return "Custom";
  const fmt = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleString("en-US", { month: "short" });
    return `${day} ${mon}`;
  };
  return `${fmt(s)} - ${fmt(e)} ${e.getFullYear()}`;
}

function getRtkErrorMessage(err: unknown): string {
  if (!err) return "Failed to load dashboard";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const e = err as Record<string, any>;
    const dataMsg =
      e?.data?.message || e?.data?.error || (typeof e?.data === "string" ? e.data : null);
    if (dataMsg) return String(dataMsg);
    if (e?.error) return String(e.error);
  }
  return "Failed to load dashboard";
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatSymptoms(raw: unknown): string | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const list = raw
      .map((item: any) => {
        if (!item) return "";
        if (typeof item === "object") {
          return String(item.name ?? item.label ?? item.title ?? "").trim();
        }
        return String(item).trim();
      })
      .filter(Boolean);
    return list.length > 0 ? list.join(", ") : null;
  }
  const s = String(raw).trim();
  return s ? s : null;
}

/* ---------------- Types ---------------- */

type PendingAppt = {
  id: string;
  patientName: string;
  profileImage?: string | null;
  start: string;
  time: string | null;
  notes: string | null;
  symptoms: string | null;
  age?: string | null;
  gender?: string | null;
  status?: string | null;
  payment?: string | null;
  paymentMethod?: string | null;
  paymentPrice?: number | null;
  tokenNo?: number | null;
  mobile?: string | null;
  appointmentType?: string | null;
  dateLabel: string;
};

type SetupStep = {
  title: string;
  subtitle: string;
  status: "completed" | "pending";
  stepNumber: number;
  path?: string;
};

type SetupProgress = {
  title: string;
  completed: number;
  total: number;
  ctaLabel: string;
  ctaPath: string;
  secondaryLabel: string;
  steps: SetupStep[];
};

function normalizeStepStatus(value: unknown): SetupStep["status"] {
  if (value === true) return "completed";
  const text = String(value ?? "").trim().toLowerCase();
  return text === "completed" || text === "done" || text === "complete"
    ? "completed"
    : "pending";
}

function normalizeSetupProgress(result: any): SetupProgress | null {
  const raw =
    result?.setupProgress ??
    result?.doctorSetupProgress ??
    result?.onboardingProgress ??
    null;
  const rawSteps = Array.isArray(raw?.steps) ? raw.steps : [];

  if (!raw || rawSteps.length === 0) return null;

  const steps = rawSteps.map((step: any, index: number): SetupStep => {
    const status = normalizeStepStatus(step?.status ?? step?.completed);
    return {
      title: String(step?.title ?? step?.label ?? `Step ${index + 1}`),
      subtitle: String(step?.subtitle ?? (status === "completed" ? "Completed" : "Pending")),
      status,
      stepNumber: toNumber(step?.stepNumber ?? step?.step ?? step?.order, index + 1),
      path: cleanText(step?.path ?? step?.href) ?? undefined,
    };
  });

  const completed = toNumber(
    raw?.completed,
    steps.filter((step: SetupStep) => step.status === "completed").length,
  );
  const total = Math.max(steps.length, toNumber(raw?.total, steps.length));

  return {
    title: String(raw?.title ?? "Welcome! Let's set up a few things to get you started."),
    completed,
    total,
    ctaLabel: String(raw?.ctaLabel ?? "Continue Setup"),
    ctaPath: cleanText(raw?.ctaPath) ?? "/clinic-setup",
    secondaryLabel: String(raw?.secondaryLabel ?? "Setup Center"),
    steps,
  };
}

/* ---------------- Skeleton ---------------- */

const Sk = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-[#172033] ${className}`} />
);

/* ---------------- Start Your Day Card ---------------- */

const StartYourDayCard = ({
  firstPatient,
  waitingCount,
  totalAppointments,
  completedCount,
  remainingCount,
  onStartConsultation,
  onViewPatient,
  onAddWalkIn,
}: {
  firstPatient?: PendingAppt;
  waitingCount: number;
  totalAppointments: number;
  completedCount: number;
  remainingCount: number;
  onStartConsultation: () => void;
  onViewPatient: () => void;
  onAddWalkIn: () => void;
}) => {
  const meta = [
    firstPatient?.gender,
    firstPatient?.age ? `${firstPatient.age} Years` : null,
    firstPatient?.mobile,
  ]
    .filter(Boolean)
    .join(" | ");

  if (firstPatient) {
    return (
      <div className="min-h-[278px] rounded-[16px] border border-[#dfecef] bg-gradient-to-br from-[#f3fffb] via-white to-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:from-[#0d1e1b] dark:via-[#111726] dark:to-[#111726]">
        <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">Start Your Day</h3>
        <p className="mt-0.5 text-[13px] text-[#677294] dark:text-white/60">
          See your first patient and begin consultations.
        </p>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
          <div className="grid gap-5 sm:grid-cols-[125px_minmax(0,1fr)] ">
            <div className="flex min-h-[152px] flex-col items-center justify-center gap-1 rounded-lg border border-[#e1eef0] bg-white/90 px-4 py-3 text-center shadow-[0_6px_18px_rgba(10,108,116,0.05)] dark:border-[#273244] dark:bg-[#0f1728]">
              <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-[#0a6c74] dark:text-[#9be7dc]">
                First Patient
              </span>
              <span className="mt-1 text-[10px] text-[#677294] dark:text-white/50">Token</span>
              <span className="my-1 text-[38px] font-bold leading-none text-[#0a8a87] dark:text-[#9be7dc]">
                {firstPatient.tokenNo != null ? String(firstPatient.tokenNo).padStart(2, "0") : "01"}
              </span>
              <span className="mt-2 whitespace-nowrap text-[10px] text-[#677294] dark:text-white/50">
                Scheduled Time
              </span>
              <span className="text-[12px] font-semibold text-[#100e1c] dark:text-white">
                {fmtTime12(firstPatient.start)}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-5">
              {firstPatient.profileImage ? (
                <img
                  src={firstPatient.profileImage}
                  alt={firstPatient.patientName}
                  className="h-24 w-24 shrink-0 rounded-full border-[10px] border-[#dff5ee] object-cover dark:border-[#16352f]"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[10px] border-[#dff5ee] bg-[#eef1ff] text-[26px] font-semibold text-[#6366f1] dark:border-[#16352f] dark:bg-[#1d2440]">
                  {initials(firstPatient.patientName)}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-[20px] font-bold text-[#100e1c] dark:text-white">
                  {firstPatient.patientName}
                </p>
                {meta && (
                  <p className="mt-1 truncate text-[12px] font-medium text-[#677294] dark:text-white/60">
                    {meta}
                  </p>
                )}

                <div className="mt-4 space-y-3">
                  {firstPatient.symptoms && (
                    <div>
                      <p className="text-[11px] font-semibold text-[#677294] dark:text-white/50">
                        Symptoms
                      </p>
                      <p className="mt-1 max-w-[260px] truncate text-[13px] font-bold text-[#100e1c] dark:text-white">
                        {firstPatient.symptoms}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold text-[#677294] dark:text-white/50">
                      Appointment Type
                    </p>
                    <p className="mt-1 max-w-[260px] truncate text-[13px] font-bold text-[#100e1c] dark:text-white">
                      {firstPatient.appointmentType || "General Consultation"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#e1eef0] bg-white/90 p-4  shadow-[0_6px_18px_rgba(10,108,116,0.04)] dark:border-[#273244] dark:bg-[#0f1728]">
            <h4 className="text-[14px] font-semibold text-[#100e1c] dark:text-white">Queue Summary</h4>
            <div className="mt-4 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12px] font-semibold text-[#f59e0b] whitespace-nowrap">
                  <FaUserPlus className="h-3.5 w-3.5" /> Waiting Now
                </span>
                <span className="text-[14px] font-bold text-[#100e1c] dark:text-white">{waitingCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12px] font-semibold text-[#3b82f6] whitespace-nowrap">
                  <FiCalendar className="h-3.5 w-3.5" /> Today's Appointments
                </span>
                <span className="text-[14px] font-bold text-[#100e1c] dark:text-white">{totalAppointments}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12px] font-semibold text-[#27b77a] whitespace-nowrap">
                  <FiCheckCircle className="h-3.5 w-3.5" /> Completed
                </span>
                <span className="text-[14px] font-bold text-[#100e1c] dark:text-white">{completedCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12px] font-semibold text-[#64748b] whitespace-nowrap dark:text-white/60">
                  <FiClock className="h-3.5 w-3.5" /> Remaining
                </span>
                <span className="text-[14px] font-bold text-[#100e1c] dark:text-white">{remainingCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,216px)_minmax(0,210px)]">
          <button
            type="button"
            onClick={onStartConsultation}
            className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[#07838a] px-5 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(10,108,116,0.18)] transition hover:bg-[#056d74]"
          >
            <FiPlay className="h-4 w-4" /> Start Consultation <FiArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onViewPatient}
            className="flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[6px] border border-[#dfe6ea] bg-white px-5 text-[13px] font-semibold text-[#100e1c] transition hover:bg-[#f8f9fb] dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]"
          >
            <FiFileText className="h-4 w-4" /> View Patient Details
          </button>
        </div>

        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#e6fbf7] px-3 py-2 text-[11px] font-semibold text-[#0a6c74] dark:bg-[#16352f] dark:text-[#9be7dc]">
          <FiCheckCircle className="h-3.5 w-3.5" />
          Once you finish, the next patient will load automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[278px] items-center overflow-hidden rounded-[8px] border border-[#dcefeb] bg-[#fbfffd] px-5 py-6 shadow-[0_8px_24px_rgba(15,23,42,0.03)] dark:border-[#273244] dark:bg-[#111726] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_32%,rgba(227,247,243,0.95),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(247,255,252,0.95),transparent_28%)] dark:opacity-20" />

      <div className="relative z-10 grid w-full items-center gap-5 md:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]">
        <div className="relative mx-auto flex h-[205px] w-full max-w-[250px] items-center justify-center overflow-hidden md:mx-0">
          <img
            src={Images.doctorDashboard}
            alt="Doctor ready for consultations"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-col items-center text-center md:mx-0 md:items-start md:text-left">
          <h3 className="text-[21px] font-bold leading-tight text-[#0a6c74] dark:text-[#9be7dc] sm:text-[22px]">
            Welcome! You're all set.
          </h3>
          <p className="mt-3 text-[13px] font-semibold leading-6 text-[#677294] dark:text-white/70">
            You have {formatCompact(totalAppointments)} appointments scheduled 
            <br />
            Start your first consultation to begin.
          </p>
          <button
            type="button"
            onClick={onStartConsultation}
            className="mt-7 flex h-10 w-full max-w-[265px] cursor-pointer items-center justify-center gap-3 rounded-[6px] bg-[#07838a] px-5 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(10,108,116,0.18)] transition hover:bg-[#056d74]"
          >
            <FiPlay className="h-4 w-4" /> Start First Consultation
          </button>
          <button
            type="button"
            onClick={onAddWalkIn}
            className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-[6px] px-4 py-2 text-[13px] font-bold text-[#0a8a87] transition hover:bg-[#e6fbf7] dark:text-[#9be7dc] dark:hover:bg-[#16352f]"
          >
            <FaUserPlus className="h-4 w-4" /> Add Walk-in Patient
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Today's Appointments Sidebar List ---------------- */

const TodaysAppointmentsList = ({
  appointments,
  onViewCalendar,
  onViewAppointment,
  onAddWalkIn,
}: {
  appointments: PendingAppt[];
  onViewCalendar: () => void;
  onViewAppointment: (id: string) => void;
  onAddWalkIn: () => void;
}) => {
  const [showAll, setShowAll] = React.useState(false);
  const displayed = showAll ? appointments : appointments.slice(0, 5);
  const moreCount = Math.max(0, appointments.length - 5);
  const isLightSchedule = appointments.length > 0 && appointments.length <= 3;

  const getStatusLabel = (_status: string | null | undefined, idx: number) => {
    const status = String(_status ?? "").toLowerCase();
    if (status.includes("complete")) {
      return { label: "Done", color: "text-[#27b77a] bg-[#dcfce7] dark:text-[#9be7dc] dark:bg-[#16352f]" };
    }
    if (status.includes("cancel") || status.includes("no")) {
      return { label: "No Show", color: "text-[#e5484d] bg-[#fee2e2] dark:text-[#ffb4b4] dark:bg-[#2a1717]" };
    }
    if (idx === 0) return { label: "Now", color: "text-[#0a6c74] bg-[#dff8f1] dark:text-[#9be7dc] dark:bg-[#16352f]" };
    if (idx === 1) return { label: "Next", color: "text-[#3b82f6] bg-[#eef1ff] dark:text-[#93bbfc] dark:bg-[#1d2440]" };
    return { label: "Upcoming", color: "text-[#6b5bd6] bg-[#f1edff] dark:text-[#c8b6ff] dark:bg-[#26213f]" };
  };

  return (
    <div className="flex h-full min-h-[278px] flex-col rounded-[16px] border border-[#e5e7ea] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:bg-[#111726]">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">Today's Appointments</h3>
        <button type="button" onClick={onViewCalendar} className="cursor-pointer text-[13px] font-medium text-[#0a6c74] hover:underline dark:text-[#9be7dc]">View Calendar</button>
      </div>

      {displayed.length === 0 ? (
        <div className="grid min-h-[220px] flex-1 items-center gap-4 rounded-xl border border-dashed border-[#dfe6ea] bg-gradient-to-br from-[#f3fffb] via-white to-[#fbfcfd] px-5 py-5 text-center dark:border-[#273244] dark:from-[#0d1e1b] dark:via-[#0f1728] dark:to-[#111726] sm:grid-cols-[145px_1fr] sm:text-left">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#e7fbf6] dark:bg-[#16352f]">
            <img
              src={Images.tipsSuccessIllustration}
              alt=""
              className="h-24 w-28 object-cover " 
            />
          </div>
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-[#100e1c] dark:text-white">No appointments </p>
            <p className="mt-2 max-w-[360px] text-[13px] leading-5 text-[#677294] dark:text-white/60">
              Your schedule is clear right now. Add a walk-in patient or review the calendar for new bookings.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button
                type="button"
                onClick={onAddWalkIn}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#0a6c74] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#085a61]"
              >
                <FiPlus className="h-4 w-4" /> Add Walk-in
              </button>
              <button
                type="button"
                onClick={onViewCalendar}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#dfe6ea] bg-white px-4 py-2 text-[12px] font-semibold text-[#0a6c74] transition hover:bg-[#f8f9fb] dark:border-[#273244] dark:bg-[#111726] dark:text-[#9be7dc] dark:hover:bg-[#151e31]"
              >
                <FiCalendar className="h-4 w-4" /> View Calendar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="-mx-2 overflow-hidden rounded-[10px]">
            {displayed.map((appt, idx) => {
              const statusInfo = getStatusLabel(appt.status, idx);
              const isActiveDot = idx < 2;
              const hasDivider = idx < displayed.length - 1;

              return (
                <button
                  key={appt.id}
                  onClick={() => onViewAppointment(appt.id)}
                  className={`relative grid min-h-[45px] w-full cursor-pointer grid-cols-[34px_76px_minmax(74px,1fr)_auto] items-center gap-2 px-2 text-left transition sm:grid-cols-[36px_82px_minmax(98px,1fr)_minmax(100px,1fr)_auto] sm:gap-3 ${
                    hasDivider ? "border-b border-[#eef2f6] dark:border-[#273244]" : ""
                  } ${
                    idx === 0
                      ? "bg-gradient-to-r from-[#f0fffa] via-[#fbfffd] to-white dark:from-[#16352f] dark:via-[#111726] dark:to-[#111726]"
                      : "bg-white hover:bg-[#fbfcfd] dark:bg-[#111726] dark:hover:bg-[#151e31]"
                  }`}
                >
                  <span className="relative flex h-full w-[26px] items-center justify-center justify-self-start">
                    {idx > 0 && (
                      <span
                        className={`absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 ${
                          idx === 1 ? "bg-[#16a076] dark:bg-[#62d6bd]" : "bg-[#cfd8e6] dark:bg-[#334155]"
                        }`}
                      />
                    )}
                    {idx < displayed.length - 1 && (
                      <span
                        className={`absolute bottom-0 left-1/2 h-1/2 w-px -translate-x-1/2 ${
                          idx === 0 ? "bg-[#16a076] dark:bg-[#62d6bd]" : "bg-[#cfd8e6] dark:bg-[#334155]"
                        }`}
                      />
                    )}
                    <span
                      className={`relative z-10 h-[9px] w-[9px] rounded-full ring-[3px] ring-white dark:ring-[#111726] ${
                        isActiveDot ? "bg-[#16a076] dark:bg-[#62d6bd]" : "bg-[#b8c3d3] dark:bg-[#64748b]"
                      }`}
                    />
                  </span>

                  <span className="whitespace-nowrap text-[12px] font-bold text-[#677294] dark:text-white/60">
                    {fmtTime12(appt.start)}
                  </span>

                  <span className="truncate text-[12px] font-bold text-[#100e1c] dark:text-white">
                    {appt.patientName}
                  </span>

                  <span className="hidden truncate text-[12px] font-semibold text-[#677294] dark:text-white/50 sm:block">
                    {appt.symptoms || appt.notes || "Consultation"}
                  </span>

                  <span className={`shrink-0 justify-self-end rounded-lg px-3 py-1 text-[11px] font-bold ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </button>
              );
            })}
          </div>

          {isLightSchedule && (
            <div className="grid min-h-[132px] flex-1 items-center gap-4 rounded-[8px] border border-[#dff1ee] bg-[#f7fffd] px-5 py-5 dark:border-[#273244] dark:bg-[#0f1728] sm:grid-cols-[96px_1fr]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_12px_24px_rgba(10,108,116,0.1)] dark:bg-[#111726]">
                <img src={Images.tipsSuccessIllustration} alt="" className="h-24 w-28 object-cover " />
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-[15px] font-bold text-[#0a6c74] dark:text-[#9be7dc]">Light schedule today</p>
                <p className="mt-2 max-w-[430px] text-[12px] leading-5 text-[#677294] dark:text-white/60">
                  {appointments.length === 1 ? "Only 1 appointment is queued." : `Only ${appointments.length} appointments are queued.`} New bookings and walk-ins will appear here.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-3 sm:justify-start">
                  <button
                    type="button"
                    onClick={onAddWalkIn}
                    className="flex cursor-pointer items-center gap-2 rounded-[6px] bg-[#e6fbf7] px-4 py-2 text-[12px] font-semibold text-[#0a6c74] transition hover:bg-[#d8f6ef] dark:bg-[#16352f] dark:text-[#9be7dc]"
                  >
                    <FiPlus className="h-4 w-4" /> Add Walk-in
                  </button>
                  <button
                    type="button"
                    onClick={onViewCalendar}
                    className="flex cursor-pointer items-center gap-2 rounded-[6px] px-4 py-2 text-[12px] font-semibold text-[#677294] transition hover:bg-white hover:text-[#0a6c74] dark:text-white/60 dark:hover:bg-[#151e31] dark:hover:text-[#9be7dc]"
                  >
                    <FiCalendar className="h-4 w-4" /> Calendar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!showAll && moreCount > 0 && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 text-[13px] font-medium text-[#677294] transition hover:text-[#0a6c74] dark:text-white/60 dark:hover:text-[#9be7dc]">
          + {moreCount} more appointments ▾
        </button>
      )}
    </div>
  );
};

/* ---------------- Quick Actions ---------------- */

type QuickAction = {
  icon: React.ReactNode;
  label: string;
  path: string;
};

const QUICK_ACTIONS = [
  { icon: <FaUserPlus className="h-[18px] w-[18px] text-[#0a6c74]" />, label: "Add Walk-in\nPatient", path: "/appointment/new" },
  { icon: <BsClipboard2Pulse className="h-[18px] w-[18px] text-[#6366f1]" />, label: "Prescription\nTemplates", path: "/profile/prescription-templates" },
  { icon: <FaStethoscope className="h-[18px] w-[18px] text-[#27b77a]" />, label: "Quick\nPrescription", path: "/prescription-notepad-scanner" },
  { icon: <FiUserX className="h-[18px] w-[18px] text-[#e5484d]" />, label: "No\nShow", path: "/no-show" },
  { icon: <FiDollarSign className="h-[18px] w-[18px] text-[#0a6c74]" />, label: "Services &\nPricing", path: "/profile/services" },
  { icon: <FiClock className="h-[18px] w-[18px] text-[#3b82f6]" />, label: "Doctor\nAvailability", path: "/profile/availability" },
  { icon: <BsCapsule className="h-[18px] w-[18px] text-[#27b77a]" />, label: "Medicines", path: "/profile/medicines" },
  { icon: <FiUsers className="h-[18px] w-[18px] text-[#7c3aed]" />, label: "All\nPatients", path: "/patients" },
] satisfies QuickAction[];

const QuickActionsGrid = ({ navigate }: { navigate: (path: string) => void }) => (
  <div className="rounded-[16px] border border-[#e5e7ea] bg-white p-4 dark:border-[#273244] dark:bg-[#111726]">
    <h3 className="mb-3 text-[15px] font-semibold text-[#100e1c] dark:text-white">Quick Actions</h3>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => navigate(action.path)}
          className="flex min-h-[76px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-[#e5e7ea] bg-white py-2 px-2 transition hover:border-[#0a6c74]/25 hover:shadow-[0_8px_20px_rgba(15,23,42,0.07)] dark:border-[#273244] dark:bg-[#0f1728] dark:hover:border-[#46beae]/30"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f7fb] dark:bg-[#172033]">
            {action.icon}
          </div>
          <span className="text-center text-[11px] font-medium leading-tight text-[#445176] whitespace-pre-line dark:text-white/70">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  </div>
);

/* ---------------- Essential Stats ---------------- */


/* ---------------- Patient Alerts ---------------- */

const PatientAlerts = ({ navigate }: { navigate: (path: string) => void }) => {
  const alerts = [
    { tone: "from-[#ff5573] to-[#d93054]", label: "Diabetic Patients", sub: "Review sugar-level monitoring list" },
    { tone: "from-[#ff985c] to-[#f15b3d]", label: "High BP Patients", sub: "Check BP monitoring follow-ups" },
    { tone: "from-[#f6d365] to-[#d8a724]", label: "Pregnant Patients", sub: "Review follow-ups due today" },
    { tone: "from-[#9d7bf4] to-[#6d54bd]", label: "Allergy Concerns", sub: "Check allergy history before prescribing" },
  ];
  return (
    <div className="rounded-[16px] border border-[#e5e7ea] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:bg-[#111726]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[14px] font-semibold text-[#100e1c] dark:text-white">Patient Alerts</h4>
        <button type="button" onClick={() => navigate("/patients")} className="cursor-pointer text-[11px] font-medium text-[#0a6c74] hover:underline dark:text-[#9be7dc]">View All</button>
      </div>
      <div className="space-y-2.5">
        {alerts.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => navigate("/patients")}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition hover:bg-[#f8f9fb] dark:hover:bg-[#151e31]"
          >
            <span className={`h-3.5 w-3.5 shrink-0 rounded-full bg-gradient-to-br ${a.tone} shadow-[0_4px_10px_rgba(15,23,42,0.14)]`} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#100e1c] dark:text-white">{a.label}</p>
              <p className="text-[11px] text-[#677294] dark:text-white/50">{a.sub}</p>
            </div>
            <FiChevronRight className="h-3.5 w-3.5 text-[#677294] shrink-0 dark:text-white/40" />
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------------- Recent Patients ---------------- */

const RecentPatients = ({ appointments, navigate }: { appointments: PendingAppt[]; navigate: (path: string) => void }) => {
  const recent = appointments.slice(0, 5);
  return (
    <div className="rounded-[16px] border border-[#e5e7ea] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:bg-[#111726]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[14px] font-semibold text-[#100e1c] dark:text-white">Recent Patients</h4>
        <button type="button" onClick={() => navigate("/patients")} className="cursor-pointer text-[11px] font-medium text-[#0a6c74] hover:underline dark:text-[#9be7dc]">View All</button>
      </div>
      <div className="space-y-2">
        {recent.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-[#dfe6ea] bg-[#fbfcfd] px-4 text-center dark:border-[#273244] dark:bg-[#0f1728]">
            <FiUsers className="h-7 w-7 text-[#0a6c74] dark:text-[#9be7dc]" />
            <p className="mt-3 text-[12px] text-[#677294] dark:text-white/60">No recent patients.</p>
          </div>
        ) : (
          recent.map((appt) => (
            <button
              key={appt.id}
              type="button"
              onClick={() => navigate(`/appointment/${appt.id}`)}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl p-2 text-left transition hover:bg-[#f8f9fb] dark:hover:bg-[#151e31]"
            >
              {appt.profileImage ? (
                <img src={appt.profileImage} alt={appt.patientName} className="h-7 w-7 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef1ff] text-[9px] font-bold text-[#6366f1] dark:bg-[#1d2440]">{initials(appt.patientName)}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#100e1c] dark:text-white truncate">{appt.patientName}</p>
              </div>
              <span className="text-[11px] text-[#677294] dark:text-white/50 shrink-0">{fmtTime12(appt.start)}</span>
              <span className="rounded-full bg-[#e6fbf7] px-3 py-1 text-[11px] font-semibold text-[#0a6c74] shrink-0 dark:bg-[#16352f] dark:text-[#9be7dc]">View</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

/* ---------------- Notifications Panel ---------------- */

const NotificationsPanel = ({ navigate }: { navigate: (path: string) => void }) => {
  const notifications = [
    { icon: <FiFileText className="h-4 w-4" />, tone: "bg-[#eef1ff] text-[#3b82f6]", label: "Lab report ready", sub: "Rahul Verma - Blood Test", time: "10 min ago" },
    { icon: <FiUsers className="h-4 w-4" />, tone: "bg-[#dcfce7] text-[#27b77a]", label: "Patient is waiting", sub: "Priya Singh is waiting in clinic", time: "15 min ago" },
    { icon: <FiCalendar className="h-4 w-4" />, tone: "bg-[#fff7e6] text-[#e89b00]", label: "Follow-up due", sub: "Deepak Sharma - 28 Jun", time: "2 hours ago" },
    { icon: <FiUserX className="h-4 w-4" />, tone: "bg-[#fee2e2] text-[#e5484d]", label: "Appointment cancelled", sub: "Amit Patel - 4:30 PM", time: "2 hours ago" },
  ];
  return (
    <div className="rounded-[16px] border border-[#e5e7ea] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:bg-[#111726]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[14px] font-semibold text-[#100e1c] dark:text-white">Notifications</h4>
        <button type="button" onClick={() => navigate("#")} className="cursor-pointer text-[11px] font-medium text-[#0a6c74] hover:underline dark:text-[#9be7dc]">View All</button>
      </div>
      <div className="space-y-2.5">
        {notifications.map((n, idx) => (
          <div key={idx} className="flex items-start gap-2.5">
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.tone}`}>
              {n.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#100e1c] dark:text-white">{n.label}</p>
              <p className="text-[11px] text-[#677294] dark:text-white/50">{n.sub}</p>
            </div>
            <span className="text-[10px] text-[#677294] shrink-0 whitespace-nowrap dark:text-white/40">{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------------- Pro Tips Card ---------------- */

const ProTipsCard = () => (
  <div className="relative overflow-hidden rounded-[16px] border border-[#d8eef0] bg-gradient-to-br from-[#eefcf8] to-[#eaf8fb] p-4 text-center shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:from-[#0d1e1b] dark:to-[#111726]">
    {/* Blurred background content */}
    <div className="filter blur-[2.5px] select-none pointer-events-none opacity-40">
      <h4 className="flex items-center justify-center gap-2 text-[14px] font-semibold text-[#0a6c74] dark:text-[#9be7dc]">
        <FiBell className="h-4 w-4" /> Pro Tip for Today
      </h4>
      <img
        src={Images.tipsSuccessIllustration}
        alt="Daily checklist tip"
        className="mx-auto mt-3 h-24 w-full object-contain"
      />
      <p className="mx-auto mt-3 max-w-[230px] text-[12px] leading-relaxed text-[#445176] dark:text-white/70">
        Start your consultations on time and keep your day organized.
      </p>
      <button
        type="button"
        className="mx-auto mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#cfe4e6] bg-white px-5 py-2 text-[12px] font-semibold text-[#0a6c74] transition hover:bg-[#f7fffd] dark:border-[#273244] dark:bg-[#0f1728] dark:text-[#9be7dc]"
      >
        <FiCheckCircle className="h-4 w-4" /> View Tips
      </button>
    </div>

    {/* Upcoming Feature Overlay */}
    <div className="absolute inset-0 flex items-center justify-center bg-black/[0.01] p-4 dark:bg-black/10">
      <div className="w-full max-w-[210px] rounded-2xl border border-violet-100 bg-[#f5f3ff] p-4 shadow-[0_8px_25px_rgba(124,58,237,0.12)] dark:border-violet-950/40 dark:bg-[#151122] flex flex-col items-center">
        {/* Rocket Icon in Purple Circle */}
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.96 14.96 0 01-10.58 4.39L3 21l.88-3.05a14.96 14.96 0 014.39-10.58m5.96 5.96a14.96 14.96 0 00-5.96-5.96m-1.74 3.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          </svg>
        </div>
        <h5 className="mt-3 text-[14px] font-bold text-[#100e1c] dark:text-white">
          Upcoming
        </h5>
        <p className="mt-1.5 text-center text-[11px] leading-relaxed text-[#677294] dark:text-white/60">
          This feature is coming soon to your dashboard.
        </p>
        <button
          type="button"
          className="mt-4 w-full rounded-lg border border-violet-200 bg-white py-1.5 text-[11px] font-bold text-violet-600 transition hover:bg-violet-50 dark:border-violet-900/60 dark:bg-[#1a152d] dark:text-violet-400 dark:hover:bg-violet-950/40"
        >
          Coming Soon
        </button>
      </div>
    </div>
  </div>
);

/* ---------------- Setup Progress ---------------- */

const SetupProgressBanner = ({
  progress,
  navigate,
}: {
  progress: SetupProgress;
  navigate: (path: string) => void;
}) => (
  <div className="rounded-[16px] border border-[#e5e7ea] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:bg-[#111726] sm:p-5">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-[220px]">
        <h3 className="text-[15px] font-semibold text-[#100e1c] dark:text-white">{progress.title}</h3>
        <p className="mt-4 text-[13px] font-semibold text-[#677294] dark:text-white/60">
          {progress.completed} of {progress.total} steps completed
        </p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {progress.steps.map((step) => {
          const isDone = step.status === "completed";
          return (
            <button
              key={`${step.stepNumber}-${step.title}`}
              type="button"
              onClick={() => step.path && navigate(step.path)}
              className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl px-2 py-1 text-left transition hover:bg-[#f8f9fb] dark:hover:bg-[#151e31]"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  isDone
                    ? "bg-[#e6fbf7] text-[#0a6c74] ring-4 ring-[#eefbf8] dark:bg-[#16352f] dark:text-[#9be7dc] dark:ring-[#0d1e1b]"
                    : "bg-[#eef1ff] text-[#6b5bd6] ring-4 ring-[#f4f2ff] dark:bg-[#1d2440] dark:text-[#c8b6ff] dark:ring-[#151e31]"
                }`}
              >
                {isDone ? <FiCheckCircle className="h-5 w-5" /> : <span className="text-[15px] font-bold">{step.stepNumber}</span>}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-[#100e1c] dark:text-white">
                  {step.title}
                </span>
                <span
                  className={`mt-1 block text-[11px] font-medium ${
                    isDone ? "text-[#27b77a]" : "text-[#677294] dark:text-white/60"
                  }`}
                >
                  {step.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 flex-col items-start gap-2 sm:flex-row sm:items-center xl:flex-col xl:items-end">
        <button
          type="button"
          onClick={() => navigate(progress.ctaPath)}
          className="cursor-pointer rounded-lg bg-[#0a6c74] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(10,108,116,0.18)] transition hover:bg-[#085a61]"
        >
          {progress.ctaLabel}
        </button>
        <button
          type="button"
          onClick={() => navigate(progress.ctaPath)}
          className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-[#0a6c74] transition hover:underline dark:text-[#9be7dc]"
        >
          {progress.secondaryLabel} <FiArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);

/* ============================= Main Component ============================= */

const DoctorDash: React.FC<{ hideHeader?: boolean }> = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = React.useState(() => toYMD(new Date()));
  const [endDate, setEndDate] = React.useState(() => toYMD(new Date()));
  const [activeTab, setActiveTab] = React.useState<DateTab>("today");
  const [showCustomCalendar, setShowCustomCalendar] = React.useState(false);
  const { data: userData } = useGetUserQuery();
  const currentUser: any = React.useMemo(() => (userData as any)?.user ?? userData ?? {}, [userData]);

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
      e = now;
    } else if (tab === "thisMonth") {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = now;
    }
    setStartDate(toYMD(s));
    setEndDate(toYMD(e));
  }, []);

  const {
    data: dashboard,
    isFetching: isDashboardLoading,
    isError,
    error,
  } = useGetDoctorDashboardQuery(
    { startDate, endDate },
    { skip: !startDate || !endDate, refetchOnMountOrArgChange: true },
  );

  React.useEffect(() => {
    if (!isError) return;
    addToast({ title: "Dashboard", description: getRtkErrorMessage(error), color: "danger", variant: "flat" });
  }, [isError, error]);

  const doctorNameForHeader = React.useMemo(() => {
    const result: any = (dashboard as any)?.result ?? {};
    return doctorGreetingName(
      result?.doctorName ??
        result?.doctor?.name ??
        result?.doctorEmail ??
        currentUser?.name ??
        currentUser?.email,
    );
  }, [dashboard, currentUser]);

  const todayAppointments: PendingAppt[] = React.useMemo(() => {
    const raw = (dashboard as any)?.result?.pendingAppointment ?? [];
    return raw
      .map((p: any, index: number) => {
        const id = String(p.appoinmentId ?? p.appointmentId ?? p.id ?? `pending-${index}`);
        const start = mergeDateTime(p.appointmentDate, p.appointmentTime ?? null);
        const payment = p.payment ?? {};
        const paymentMethod = cleanText(payment.paymentMode ?? p.paymentMethod ?? p.paymentMode);
        const paymentStatus = cleanText(payment.paymentStatus ?? p.paymentStatus);
        const price = Number(payment.price ?? p.price ?? p.servicePrice ?? 0);
        return {
          id,
          patientName: p.name ?? p.patientName ?? p.patient?.name ?? "Unknown",
          profileImage: p.profileImage ?? p.patient?.profileImage ?? null,
          start,
          time: p.appointmentTime ?? null,
          notes: cleanText(p.reasonForVisit ?? p.reason ?? p.symptoms ?? p.appointmentType ?? p.serviceName),
          symptoms: formatSymptoms(p.symptoms),
          age: p.age ?? p.patient?.age ?? null,
          gender: p.gender ?? p.patient?.gender ?? null,
          status: p.status ?? "Pending",
          payment: paymentStatus || (paymentMethod?.toLowerCase() === "pay on visit" || paymentMethod?.toLowerCase() === "pay later" ? null : "Covered"),
          paymentMethod: paymentMethod ?? "Covered",
          paymentPrice: Number.isFinite(price) ? price : null,
          tokenNo: p.tokenNo ?? null,
          mobile: p.mobile ?? p.patientMobile ?? p.patient?.mobile ?? null,
          appointmentType: cleanText(p.consultationType ?? p.appointmentType ?? p.serviceName),
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
    const st: any = (dashboard as any)?.result?.status ?? {};
    const totalAppointments = toNumber(st?.totalAppoiment?.count ?? st?.totalAppointment?.count ?? st?.totalAppointments?.count);
    const pending = toNumber(st?.totalPendigAppointments?.count ?? st?.totalPendingAppointments?.count);
    const confirmed = toNumber(st?.totalConfirmedAppointments?.count);
    const noShow = toNumber(st?.totalNoShowAppointments?.count ?? st?.totalCancelledNoShowAppointments?.count);
    const completedFallback = Math.max(0, totalAppointments - pending - confirmed - noShow);
    const completed = toNumber(
      st?.totalCompletedAppointments?.count ??
        st?.totalCompletedConsultations?.count ??
        st?.completedAppointments?.count,
      completedFallback,
    );
    const waiting = toNumber(st?.totalWaitingPatients?.count ?? st?.waitingPatients?.count, pending);
    const remaining = toNumber(
      st?.totalRemainingAppointments?.count ?? st?.remainingAppointments?.count,
      Math.max(0, totalAppointments - completed - noShow),
    );

    // Trend deltas
    const deltaAppt = parseHikePercent(st?.totalAppoiment?.hikePersent ?? st?.totalAppointments?.hikePersent);
    const deltaWaiting = parseHikePercent(st?.totalWaitingPatients?.hikePersent ?? st?.waitingPatients?.hikePersent);
    const deltaCompleted = parseHikePercent(st?.totalCompletedAppointments?.hikePersent ?? st?.completedAppointments?.hikePersent);
    const deltaRemaining = parseHikePercent(st?.totalRemainingAppointments?.hikePersent ?? st?.remainingAppointments?.hikePersent);

    return {
      totalAppointments,
      noShow,
      completed,
      waiting,
      remaining,
      deltaAppt,
      deltaWaiting,
      deltaCompleted,
      deltaRemaining,
    };
  }, [dashboard]);

  const setupProgress = React.useMemo(() => {
    return normalizeSetupProgress((dashboard as any)?.result);
  }, [dashboard]);

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

          {setupProgress && (
            <SetupProgressBanner progress={setupProgress} navigate={navigate} />
          )}

          {/* ===== Header: Date Controls ===== */}
          {!hideHeader && !setupProgress && (
            <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex shrink-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[20px] sm:text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
                    {getGreeting()}, Dr. {doctorNameForHeader} 👋
                  </h2>
                  <FeatureInfoTip
                    title="Dashboard Tips"
                    tips={dashboardTips}
                    guideSection="dashboard-doctor"
                    linkLabel="Read dashboard guide"
                  />
                </div>
                <p className="text-[13px] sm:text-[14px] font-normal leading-5 text-[#677294] dark:text-white">
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
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 xl:grid-cols-4">
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
                bgColor="bg-[#e6fbf7]"
                deltaLabel="yesterday"
              />
              <StatCard
                icon={<FiClock className="h-5 w-5 text-[#3b82f6]" />}
                label="Remaining"
                value={formatCompact(dashStats.remaining)}
                delta={dashStats.deltaRemaining}
                bgColor="bg-[#eef1ff]"
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
                if (first) navigate(`/appointment/${first.id}`);
                else navigate("/appointment");
              }}
              onViewPatient={() => {
                const first = visibleAppointments[0];
                if (first) navigate(`/appointment/${first.id}`);
                else navigate("/patients");
              }}
              onAddWalkIn={() => navigate("/appointment/new")}
            />
            <TodaysAppointmentsList
              appointments={visibleAppointments}
              onViewCalendar={() => navigate("/appointment/calendar")}
              onViewAppointment={(id) => navigate(`/appointment/${id}`)}
              onAddWalkIn={() => navigate("/appointment/new")}
            />
          </div>

          {/* ===== Quick Clinic Actions ===== */}
          <div id="tour-doctor-quick-actions">
            <QuickActionsGrid navigate={navigate} />
          </div>

          {/* ===== Bottom Info Grid: Alerts, Recent, Notifications, Tips ===== */}
          <div id="tour-doctor-insights" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <PatientAlerts navigate={navigate} />
            <RecentPatients appointments={visibleAppointments} navigate={navigate} />
            <NotificationsPanel navigate={navigate} />
            <ProTipsCard />
          </div>

          <DashboardFooter />
        </div>
      )}
    </div>
  );
};

export default DoctorDash;
