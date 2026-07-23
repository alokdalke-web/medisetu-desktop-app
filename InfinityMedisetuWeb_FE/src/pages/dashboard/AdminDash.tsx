// src/pages/dashboard/AdminDash.tsx
import { addToast } from "@heroui/react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useMemo, useRef, useState } from "react";
import { BsTelephone } from "react-icons/bs";
import { FiCalendar, FiUserPlus, FiUsers, FiWifiOff } from "react-icons/fi";
import { HiOutlineClock } from "react-icons/hi";
import { IoAlertCircleOutline } from "react-icons/io5";
import { LuBell, LuBrain, LuCalendarCheck } from "react-icons/lu";
import { MdOutlinePayment, MdOutlineRefresh } from "react-icons/md";
import { TbChartLine, TbReportAnalytics } from "react-icons/tb";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { useDebounce } from "use-debounce";
import BannerDisplay from "../../components/banners/BannerDisplay";
import { isNetworkError } from "../../utils/getApiErrorText";
import Tooltip from "../../components/shared/Tooltip";


import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import type { RevenueOverviewPeriod } from "../../redux/api/dashboardApi";
import {
  useGetDashboardQuery,
  useGetDoctorDashboardQuery,
  useGetRevenueOverviewQuery,
  useGetTodayOverviewQuery,
} from "../../redux/api/dashboardApi";
import { useSearchPatientsQuery } from "../../redux/api/usersApi";
import type { RootState } from "../../redux/store";
import FreeTrialSuccessModal from "../../components/subscription/FreeTrialSuccessModal";
import { PromoSidebar } from "../../components/subscription/PromoSidebar";
import AppLoader from "../../components/common/AppLoader";
import { useDashboardInit } from "../../hooks/useDashboardInit";

import { StatCard } from "../../components/StatCard";
import CustomDateRangePicker from "./CustomDateRangePicker";
import DashboardFooter from "./DashboardFooter";
import DateFilterTabs, { type DateTab } from "./DateFilterTabs";
import DonutOverviewCard, { type DonutItem } from "./DonutOverviewCard";
import ClinicSetup from "./OnboardingDash/pages/ClinicSetup";
import RevenueOverviewChart, { type ChartPoint } from "./RevenueOverviewChart";
import { useConnectivityState } from "../../hooks/useConnectivityState";

/* ---------------- helpers ---------------- */

// const PREMIUM_CROWN_ICON = `${import.meta.env.BASE_URL}assets/icons/premium-crown-icon.svg`;

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

/** Parse trend strings like "↑ 100%", "↓ 25%", "0%" from today-overview API */
function parseTrendPercent(trend?: string): number | undefined {
  if (!trend) return undefined;
  const s = trend.trim();
  if (s === "0%") return 0;
  const m = s.match(/([↑↓]?)\s*(\d+(?:\.\d+)?)%?/);
  if (!m) return undefined;
  const sign = m[1] === "↓" ? -1 : 1;
  const num = Number(m[2]);
  if (!Number.isFinite(num)) return undefined;
  return Math.round(sign * num);
}

function formatINR(n: number) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${n}`;
  }
}

function formatCompact(n: number) {
  try {
    return new Intl.NumberFormat("en-IN").format(n);
  } catch {
    return String(n);
  }
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
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
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
  const year = e.getFullYear();
  return `${fmt(s)} - ${fmt(e)} ${year}`;
}

type SubscriptionLike = {
  planName?: string | null;
  slug?: string | null;
  price?: string | number | null;
};

function isFreeSubscription(subscription?: SubscriptionLike | null): boolean {
  if (!subscription) return false;

  const planName = String(subscription.planName ?? "").trim().toLowerCase();
  const slug = String(subscription.slug ?? "").trim().toLowerCase();
  const price = Number(subscription.price);

  return (
    planName === "free" ||
    planName === "free plan" ||
    slug === "free" ||
    slug === "free-plan" ||
    (!Number.isNaN(price) && price === 0)
  );
}

/* ---------------- Types (loose) ---------------- */

type DashboardResultLoose = {
  status?: {
    totalAppoiment?: { count?: number; hikePersent?: unknown };
    activePatent?: { count?: number; hikePersent?: unknown };
    totalEarning?: { amount?: number; hikePersent?: unknown };
    pendingAproval?: { count?: number; hikePersent?: unknown };
    pendingPayment?: { amount?: number; hikePersent?: unknown };
    noShowCount?: { count?: number; hikePersent?: unknown };
  };
  revenueOverview?: Array<{ date?: string; appoitmentCount?: number }>;
  appoimentStatus?: {
    pending?: number;
    confirmed?: number;
    cancelled?: number;
    completed?: number;
  };
  patentOverview?: Array<{ date?: string; count?: number }>;
  symptomStats?: Array<{
    symptomId?: string;
    symptomName?: string;
    count?: number;
  }>;
};

type PendingAppt = {
  id: string;
  patientName: string;
  profileImage?: string | null;
  start: string;
  time: string | null;
  notes: string | null;
  age?: string | null;
  gender?: string | null;
  status?: string | null;
  payment?: string | null;
  paymentMethod?: string | null;
  tokenNo?: number | null;
  patientId?: string | null;
};

/* ---------------- Skeleton UI ---------------- */

const Sk = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-lg bg-slate-200 dark:bg-[#172033] ${className}`}
  />
);

/* ---------------- Summary Bar ---------------- */

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

type SummaryBarProps = {
  nextApptTime?: string;
  nextApptName?: string;
  remaining?: number;
  completed?: number;
  pending?: number;
  todayRevenue?: number;
  onViewSchedule?: () => void;
};

const SummaryBar = ({
  nextApptTime,
  nextApptName,
  remaining,
  completed,
  pending,
  todayRevenue,
  onViewSchedule,
}: SummaryBarProps) => (
  <div className="bg-[#f5fbfb] border border-[#e5e7ea] rounded-xl flex flex-col xl:flex-row xl:items-center px-4 xl:px-2 2xl:px-5 py-4 xl:py-2 gap-4 xl:gap-2 2xl:gap-4 dark:bg-[#111726] dark:border-[#273244]">
    {/* Left: Today's Summary */}
    <div className="flex items-center gap-3 xl:gap-2 2xl:gap-4 shrink-0">
      <div className="h-[36px] w-[36px] xl:h-[30px] xl:w-[30px] 2xl:h-[42px] 2xl:w-[42px] rounded-full bg-[#e6fbf7] flex items-center justify-center shrink-0 dark:bg-[#16352f]">
        <TbReportAnalytics className="h-4 w-4 xl:h-3 xl:w-3 2xl:h-5 2xl:w-5 text-[#0a6c74] dark:text-[#9be7dc]" />
      </div>
      <span className="text-[14px] xl:text-[10px] 2xl:text-[14px] font-semibold text-[#100e1c] leading-tight xl:leading-3 2xl:leading-5 whitespace-nowrap dark:text-white">
        Today's
        <br className="hidden xl:block" />
        <span className="xl:hidden"> </span>Summary
      </span>
    </div>

    {/* Divider */}
    <div className="hidden xl:block w-px h-[44px] bg-[#e5e7ea] shrink-0 dark:bg-[#273244]" />

    {/* Stats - grid on small/medium/lg, flex on xl/2xl */}
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-1 min-w-0 xl:flex xl:items-center">
      <div className="flex flex-col gap-1 2xl:gap-1.5 min-w-0">
        <span className="text-[12px] xl:text-[10px] 2xl:text-[12px] text-[#677294] whitespace-nowrap dark:text-white">
          Next Appointment
        </span>
        <span className="text-[14px] xl:text-[12px] 2xl:text-[14px] font-bold text-[#100e1c] truncate dark:text-white">
          {nextApptTime ?? "—"}{" "}
          <span className="text-[12px] xl:text-[10px] 2xl:text-[12px] font-medium text-[#677294] dark:text-white">
            {nextApptName ?? ""}
          </span>
        </span>
      </div>

      <div className="hidden xl:block w-px h-[44px] bg-[#e5e7ea] shrink-0 dark:bg-[#273244]" />

      <div className="flex flex-col gap-1 2xl:gap-1.5 min-w-0">
        <span className="text-[12px] xl:text-[10px] 2xl:text-[12px] text-[#677294] dark:text-white">
          Remaining
        </span>
        <span className="text-[14px] xl:text-[12px] 2xl:text-[14px] font-bold text-[#100e1c] dark:text-white">
          {remaining ?? 0}
        </span>
      </div>

      <div className="hidden xl:block w-px h-[44px] bg-[#e5e7ea] shrink-0 dark:bg-[#273244]" />

      <div className="flex flex-col gap-1 2xl:gap-1.5 min-w-0">
        <span className="text-[12px] xl:text-[10px] 2xl:text-[12px] text-[#677294] dark:text-white">
          Completed
        </span>
        <span className="text-[14px] xl:text-[12px] 2xl:text-[14px] font-bold text-[#100e1c] dark:text-white">
          {completed ?? 0}
        </span>
      </div>

      <div className="hidden xl:block w-px h-[44px] bg-[#e5e7ea] shrink-0 dark:bg-[#273244]" />

      <div className="flex flex-col gap-1 2xl:gap-1.5 min-w-0">
        <span className="text-[12px] xl:text-[10px] 2xl:text-[12px] text-[#677294] dark:text-white">
          Pending
        </span>
        <span className="text-[14px] xl:text-[12px] 2xl:text-[14px] font-bold text-[#100e1c] dark:text-white">
          {pending ?? 0}
        </span>
      </div>

      <div className="hidden xl:block w-px h-[44px] bg-[#e5e7ea] shrink-0 dark:bg-[#273244]" />

      <div className="flex flex-col gap-1 2xl:gap-1.5 min-w-0">
        <span className="text-[12px] xl:text-[10px] 2xl:text-[12px] text-[#677294] dark:text-white">
          Today's Earning
        </span>
        <span className="text-[14px] xl:text-[12px] 2xl:text-[14px] font-bold text-[#01c2a8] dark:text-[#9be7dc]">
          ₹{todayRevenue != null ? todayRevenue.toLocaleString("en-IN") : "0"}
        </span>
      </div>
    </div>

    {/* View Full Schedule button */}
    <button
      type="button"
      onClick={onViewSchedule}
      className="border border-[#0a6c74] rounded-[10px] px-4 xl:px-2 2xl:px-3 py-2.5 xl:py-1 2xl:py-1.5 flex items-center justify-center gap-2 text-[13px] xl:text-[10px] 2xl:text-[12px] font-medium text-[#0a6c74] hover:bg-[#0a6c74]/5 hover:gap-3 transition-all duration-200 shrink-0 whitespace-nowrap w-full xl:w-auto mt-2 xl:mt-0 dark:border-[#46beae]/50 dark:text-[#9be7dc] dark:hover:bg-[#1a3a35]"
    >
      View Full Schedule
      <ArrowUpRight className="text-[#0a6c74] dark:text-[#9be7dc]" />
    </button>
  </div>
);

/* ---------------- Sidebar Widgets ---------------- */

const INSIGHT_PREVIEW_ITEMS = [
  {
    id: "fever",
    iconBg: "bg-[#fff0f0] dark:bg-[#332022]",
    iconColor: "text-[#e5484d]",
  },
  {
    id: "patients",
    iconBg: "bg-[#eef6ff] dark:bg-[#17263d]",
    iconColor: "text-[#3b82f6]",
  },
  {
    id: "billing",
    iconBg: "bg-[#fff7e6] dark:bg-[#332716]",
    iconColor: "text-[#f59e0b]",
  },
];

type AIInsightsWidgetProps = {
  isFreePlan: boolean;
  onUpgrade: () => void;
};

const AIInsightsWidget = (_props: AIInsightsWidgetProps) => (
  <div className="bg-[#f8f9fb] border border-[rgba(0,0,0,0.05)] rounded-2xl p-4 flex flex-col gap-4 dark:bg-[#111726] dark:border-[#273244]">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-[#eef1ff] flex items-center justify-center shrink-0 dark:bg-[#1d2440]">
          <LuBrain className="h-5 w-5 text-[#6366f1]" />
        </div>
        <span className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
          AI Insights
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e0f7fa] px-2 py-1 text-[10px] font-semibold leading-none text-[#0a6c74] dark:bg-[#0d2f33] dark:text-[#9be7dc]">
          Coming Soon
        </span>
      </div>
    </div>

    <div className="relative min-h-[164px]">
      <div
        className="flex flex-col gap-1 pointer-events-none select-none blur-[3px]"
        aria-hidden="true"
      >
        {INSIGHT_PREVIEW_ITEMS.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-[rgba(207,207,207,0.2)] rounded-xl p-3 flex items-center gap-2.5 dark:bg-[#0f1728] dark:border-[#273244]"
          >
            <div
              className={`h-9 w-9 rounded-full ${item.iconBg} flex items-center justify-center shrink-0`}
            >
              <IoAlertCircleOutline className={`h-4 w-4 ${item.iconColor}`} />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[13px] font-semibold text-[#100e1c] truncate dark:text-white">
                Fever cases are 30% higher
              </span>
              <span className="text-[12px] font-medium text-[#677294] dark:text-white">
                compared to last week.
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-3">
        <div className="w-full max-w-[220px] rounded-xl border border-[#d8d4ee] bg-[#f5f1ff] px-4 py-4 text-center shadow-[0_10px_30px_rgba(79,70,229,0.12)] backdrop-blur-sm dark:border-[#3a315b] dark:bg-[#141b2c]/95">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#eef1ff] dark:bg-[#1d2440]">
            <LuBrain className="h-5 w-5 text-[#6366f1]" />
          </div>
          <p className="text-[13px] font-semibold text-[#101828] dark:text-white">
            Coming Soon
          </p>
          <p className="mt-1 text-[11px] font-medium leading-4 text-[#445176] dark:text-[#d7def5]">
            AI-powered insights will be available soon.
          </p>
        </div>
      </div>
    </div>
  </div>
);

type AlertsWidgetProps = {
  noShowCount: number;
  onViewNoShow?: () => void;
};

const AlertsWidget = ({ noShowCount, onViewNoShow }: AlertsWidgetProps) => (
  <div className="bg-[#fef0f0] border border-[rgba(0,0,0,0.05)] rounded-2xl p-4 flex flex-col gap-4 dark:bg-[#221114] dark:border-[#5b1d22]">
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-[#fecaca] flex items-center justify-center dark:bg-[#3a171b]">
        <LuBell className="h-5 w-5 text-[#e5484d] dark:text-[#ff9a9d]" />
      </div>
      <span className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
        Alerts
      </span>
    </div>
    <div className="flex flex-col gap-1">
      {noShowCount > 0 && (
        <div
          onClick={onViewNoShow}
          className="bg-white border border-[rgba(207,207,207,0.2)] rounded-xl p-3 flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 transition dark:bg-[#111726] dark:border-[#5b1d22] dark:hover:bg-[#151e31]"
        >
          <div className="h-9 w-9 rounded-full bg-[#fff7e6] flex items-center justify-center shrink-0 dark:bg-[#332716]">
            <FiCalendar className="h-4 w-4 text-[#e89b00]" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[13px] font-semibold text-[#100e1c] dark:text-white">
              {noShowCount} Missed Appointment{noShowCount > 1 ? "s" : ""}
            </span>
            <span className="text-[12px] font-medium text-[#677294] dark:text-white">
              Today
            </span>
          </div>
        </div>
      )}
      {noShowCount === 0 && (
        <div className="bg-white border border-[rgba(207,207,207,0.2)] rounded-xl p-3 flex items-center gap-2.5 dark:bg-[#111726] dark:border-[#5b1d22]">
          <div className="h-9 w-9 rounded-full bg-[#dcfce7] flex items-center justify-center shrink-0 dark:bg-[#16352f]">
            <FiCalendar className="h-4 w-4 text-[#166534]" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[13px] font-semibold text-[#100e1c] dark:text-white">
              No missed appointments
            </span>
            <span className="text-[12px] font-medium text-[#677294] dark:text-white">
              All patients showed up today
            </span>
          </div>
        </div>
      )}
    </div>
  </div>
);

type RemindersWidgetProps = {
  appointments: PendingAppt[];
  navigate: (path: string) => void;
};

const RemindersWidget = ({ appointments, navigate }: RemindersWidgetProps) => (
  <div className="bg-[#f0f8ff] border border-[rgba(0,0,0,0.05)] rounded-2xl p-4 flex flex-col gap-4 dark:bg-[#111726] dark:border-[#273244]">
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-[#dbeafe] flex items-center justify-center dark:bg-[#172b48]">
        <LuCalendarCheck className="h-5 w-5 text-[#2898ff]" />
      </div>
      <span className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
        Upcoming Reminders
      </span>
    </div>
    <div className="flex flex-col gap-1">
      {appointments.slice(0, 2).map((appt) => (
        <div
          key={appt.id}
          onClick={() => navigate(`/appointment/${appt.id}`)}
          className="bg-white border border-[rgba(207,207,207,0.2)] rounded-xl p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 hover:shadow-sm transition-all duration-200 dark:bg-[#0f1728] dark:border-[#273244] dark:hover:bg-[#151e31]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-full bg-[#fff7e6] flex items-center justify-center shrink-0 dark:bg-[#332716]">
              <FiCalendar className="h-4 w-4 text-[#e89b00]" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[13px] font-semibold text-[#100e1c] truncate dark:text-white">
                {appt.patientName}
              </span>
              <span className="text-[12px] font-medium text-[#677294] dark:text-white">
                {appt.time ? fmtTime12(appt.start) : "Today"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="border border-[#0a6c74] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[#100e1c] hover:bg-[#0a6c74]/5 transition shrink-0 dark:border-[#46beae]/50 dark:text-[#9be7dc] dark:hover:bg-[#1a3a35]"
          >
            <BsTelephone className="h-3 w-3" />
            Call
          </button>
        </div>
      ))}
    </div>
    <button
      type="button"
      onClick={() => navigate(`/appointment?date=${toYMD(new Date())}`)}
      className="flex items-center gap-2 text-[14px] font-medium text-[#2898ff] tracking-[-0.3px] hover:gap-3 hover:opacity-80 transition-all duration-200 dark:text-[#8fc7ff]"
    >
      View All Reminders
      <ArrowUpRight className="text-[#2898ff] dark:text-[#8fc7ff]" />
    </button>
  </div>
);

/* ---------------- Top Symptoms Card ---------------- */

type SymptomBarProps = {
  symptoms: Array<{ name: string; count: number; percent: number }>;
  onViewReport?: () => void;
};

const TopSymptomsCard = ({ symptoms, onViewReport }: SymptomBarProps) => (
  <div className="bg-white border border-[rgba(229,231,234,0.6)] rounded-2xl p-4 sm:p-5 flex flex-col h-full dark:bg-[#111726] dark:border-[#273244]">
    <div className="flex items-center gap-2 mb-5">
      <div className="h-7 w-7 rounded-full bg-[#e6fbf7] flex items-center justify-center shrink-0 dark:bg-[#16352f]">
        <FiUsers className="h-4 w-4 text-[#0a6c74] dark:text-[#9be7dc]" />
      </div>
      <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
        Top Symptoms{" "}
        <span className="text-[13px] font-normal text-[#677294] dark:text-white/70">
          (This Week)
        </span>
      </h3>
    </div>
    <div className="flex flex-col gap-5 flex-1">
      {symptoms.slice(0, 4).map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-[13px] text-[#100e1c] w-[72px] shrink-0 dark:text-white">
            {s.name}
          </span>
          <div className="flex-1 h-1 bg-[#e5e7ea] rounded-full overflow-hidden dark:bg-[#273244]">
            <div
              className="h-full rounded-full bg-[#0a6c74]"
              style={{ width: `${Math.min(100, s.percent)}%` }}
            />
          </div>
          <span className="text-[12px] text-[#677294] shrink-0 dark:text-white">
            {s.count} ({s.percent}%)
          </span>
        </div>
      ))}
    </div>
    {/* Footer */}
    <div className="border-t border-[#e5e7ea] mt-5 pt-3 flex justify-center dark:border-[#273244]">
      <button
        type="button"
        onClick={onViewReport}
        className="flex items-center gap-2 text-[14px] font-medium text-[#0a6c74] tracking-[-0.3px] hover:gap-3 hover:opacity-80 transition-all duration-200 dark:text-[#9be7dc]"
      >
        View Full Report
        <ArrowUpRight className="text-[#0a6c74] dark:text-[#9be7dc]" />
      </button>
    </div>
  </div>
);

/* ---------------- Patient Overview Card ---------------- */

type PatientOverviewProps = {
  newPatients: number;
  returningPatients: number;
  newDelta?: number;
  returningDelta?: number;
  deltaLabel?: string;
  onViewReport?: () => void;
};

const PatientOverviewCard = ({
  newPatients,
  returningPatients,
  newDelta,
  returningDelta,
  deltaLabel = "yesterday",
  onViewReport,
}: PatientOverviewProps) => (
  <div className="bg-white border border-[rgba(229,231,234,0.6)] rounded-[16px] overflow-hidden relative min-h-[254px] flex flex-col dark:bg-[#111726] dark:border-[#273244]">
    {/* Title */}
    <div className="px-4 sm:px-5 pt-4 sm:pt-5">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-[#e8f4f8] flex items-center justify-center shrink-0 dark:bg-[#172b48]">
          <FiUsers className="h-4 w-4 text-[#2898ff]" />
        </div>
        <h3 className="text-[16px] font-semibold text-[#100e1c] leading-normal dark:text-white">
          Patient Overview{" "}
          <span className="text-[13px] font-normal text-[#677294] dark:text-white/70">
            (This Month)
          </span>
        </h3>
      </div>
    </div>

    {/* Content area */}
    <div className="flex-1 grid grid-cols-2 xl:flex xl:flex-row items-center justify-between gap-4 xl:gap-2 px-4 sm:px-5 xl:px-7 py-5 xl:py-0 relative">
      {/* Center: Circle icon (top on mobile, center on larger) */}
      <div className="col-span-2 flex justify-center xl:order-2">
        <div className="h-[48px] w-[48px] sm:h-[56px] sm:w-[56px] xl:h-[72px] xl:w-[72px] 2xl:h-[80px] 2xl:w-[80px] rounded-full bg-[#e8f4f8] flex items-center justify-center shrink-0 dark:bg-[#172b48]">
          <FiUsers className="h-5 w-5 sm:h-6 sm:w-6 xl:h-7 xl:w-7 2xl:h-8 2xl:w-8 text-[#2898ff]" />
        </div>
      </div>

      {/* Left: New Patient */}
      <div className="flex flex-col gap-1 items-center xl:items-start xl:order-1 min-w-0">
        <span className="text-[12px] 2xl:text-[14px] font-normal text-[#677294] whitespace-nowrap dark:text-white">
          New Patient
        </span>
        <span className="text-[20px] sm:text-[22px] 2xl:text-[24px] font-semibold text-[#131927] leading-[28px] dark:text-white">
          {String(newPatients).padStart(2, "0")}
        </span>
        {typeof newDelta === "number" && (
          <div className="flex items-center gap-1 text-[11px] sm:text-[12px] flex-wrap justify-center xl:justify-start">
            <span className="font-medium text-[#2fae8e] leading-[16px] whitespace-nowrap">
              {newDelta >= 0 ? "↑" : "↓"} {Math.abs(newDelta)}%
            </span>
            <span className="text-[rgba(103,114,148,0.6)] whitespace-nowrap dark:text-white">
              vs
            </span>
            <span className="text-[rgba(103,114,148,0.6)] whitespace-nowrap dark:text-white">
              {deltaLabel}
            </span>
          </div>
        )}
      </div>

      {/* Right: Returning Patients */}
      <div className="flex flex-col gap-1 items-center xl:items-end xl:order-3 min-w-0 text-center xl:text-right">
        <span className="text-[12px] 2xl:text-[14px] font-normal text-[#677294] whitespace-nowrap dark:text-white">
          Returning Patients
        </span>
        <span className="text-[20px] sm:text-[22px] 2xl:text-[24px] font-semibold text-[#131927] leading-[28px] dark:text-white">
          {String(returningPatients).padStart(2, "0")}
        </span>
        {typeof returningDelta === "number" && (
          <div className="flex items-center gap-1 text-[11px] sm:text-[12px] flex-wrap justify-center xl:justify-end">
            <span className="font-medium text-[#2fae8e] leading-[16px] whitespace-nowrap">
              {returningDelta >= 0 ? "↑" : "↓"} {Math.abs(returningDelta)}%
            </span>
            <span className="text-[rgba(103,114,148,0.6)] whitespace-nowrap dark:text-white">
              vs
            </span>
            <span className="text-[rgba(103,114,148,0.6)] whitespace-nowrap dark:text-white">
              {deltaLabel}
            </span>
          </div>
        )}
      </div>
    </div>

    {/* Footer */}
    <div className="border-t border-[#e5e7ea] px-5 py-3 flex justify-center dark:border-[#273244]">
      <button
        type="button"
        onClick={onViewReport}
        className="flex items-center gap-2 text-[14px] font-medium text-[#0a6c74] tracking-[-0.3px] hover:gap-3 hover:opacity-80 transition-all duration-200 dark:text-[#9be7dc]"
      >
        View Full Report
        <ArrowUpRight className="text-[#0a6c74] dark:text-[#9be7dc]" />
      </button>
    </div>
  </div>
);

/* ---------------- Quick Actions Widget ---------------- */

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
        onClick={() => navigate("/payment-history")}
        className="bg-white border border-[rgba(229,231,234,0.6)] rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:bg-[#111726] dark:border-[#273244] dark:hover:bg-[#151e31]"
      >
        <div className="h-8 w-8 rounded-lg bg-[rgba(10,108,116,0.1)] flex items-center justify-center dark:bg-[#0f2a2b]">
          <MdOutlinePayment className="h-4 w-4 text-[#0a6c74]" />
        </div>
        <span className="text-[11px] font-medium text-[#100e1c] text-center leading-tight dark:text-white">
          Payment
        </span>
      </button>
      <button
        type="button"
        onClick={() => addToast({ title: "Coming Soon", description: "Prescription feature is coming soon!", color: "primary" })}
        className="bg-white border border-[rgba(229,231,234,0.6)] rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:bg-[#111726] dark:border-[#273244] dark:hover:bg-[#151e31]"
      >
        <div className="h-8 w-8 rounded-lg bg-[rgba(10,108,116,0.1)] flex items-center justify-center dark:bg-[#0f2a2b]">
          <LuBrain className="h-4 w-4 text-[#0a6c74]" />
        </div>
        <span className="text-[11px] font-medium text-[#100e1c] text-center leading-tight dark:text-white">
          Prescription
        </span>
      </button>
    </div>
  </div>
);

/* ---------------- Pending Appointments Table ---------------- */

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
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${bg} ${text}`}
    >
      {label}
    </span>
  );
};

/* ---------------- Main Component ---------------- */

const AdminDash = ({
  showDoctorStats: _showDoctorStats = false,
  showRevenue = true,
}: {
  showDoctorStats?: boolean;
  showRevenue?: boolean;
}) => {
  const navigate = useNavigate();
  const isOffline = useConnectivityState() !== 'online';
  // Get current user
  const authUser = useSelector((s: RootState) => s.auth.user);
  const { data: userData } = useGetUserQuery();
  const { data: clinicData } = useGetAllClinicsQuery();
  const currentUser = (userData as any)?.user ?? (userData as any) ?? authUser;
  const userStatus = (clinicData as any)?.profile?.userStatus ?? currentUser?.userStatus;
  const isApproved = String(userStatus || "").toLowerCase() === "active";
  const currentUserName = currentUser?.name ?? "Doctor";
  const currentSubscription = clinicData?.subscription;
  const isAiInsightsLocked = isFreeSubscription(currentSubscription);

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

  // Revenue period is derived from the active date tab.
  // When the user switches tabs, the revenue chart automatically follows.
  const revenuePeriod: RevenueOverviewPeriod = useMemo(() => {
    if (activeTab === "thisMonth" || activeTab === "custom") return "month";
    return "week"; // today, yesterday, thisWeek all show weekly revenue
  }, [activeTab]);

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
      e = today;
    } else if (tab === "thisMonth") {
      s = new Date(today.getFullYear(), today.getMonth(), 1);
      e = today;
    }

    setStartDate(toYMD(s));
    setEndDate(toYMD(e));
  };

  // Current doctor ID
  const currentDoctorId = String(currentUser?.id ?? currentUser?._id ?? "");

  // ===== Today Overview API (needed before todayAppointments) =====
  const todayOverviewArgs = useMemo(() => {
    if (!currentDoctorId) return undefined;
    return { doctorId: currentDoctorId };
  }, [currentDoctorId]);

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
    if (isAdmin) return undefined;
    const args: Record<string, any> = { startDate, endDate };
    if (currentDoctorId) args.doctorId = currentDoctorId;
    return args;
  }, [startDate, endDate, currentDoctorId, isAdmin]);

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
    if (!startDate || !endDate) return undefined;
    return {
      startDate,
      endDate,
      dateRangeStartCount: startDate,
      dateRangeEndCount: endDate,
    };
  }, [startDate, endDate]);

  const curArg = queryArgs ?? skipToken;

  const {
    data: curData,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetDashboardQuery(curArg, { refetchOnMountOrArgChange: true });

  // ===== NEW APIs: Revenue Overview & Today Overview =====
  const revenueOverviewArgs = useMemo(() => {
    const args: { period: RevenueOverviewPeriod; doctorId?: string } = {
      period: revenuePeriod,
    };
    if (currentDoctorId) args.doctorId = currentDoctorId;
    return args;
  }, [revenuePeriod, currentDoctorId]);

  const {
    data: revenueOverviewData,
    isLoading: isRevenueLoading,
    isFetching: _isRevenueFetching,
  } = useGetRevenueOverviewQuery(revenueOverviewArgs, {
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
    // Prefer new revenue-overview API data
    const newData = revenueOverviewData?.data?.revenueOverview;
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
  }, [r, revenueOverviewData]);

  // Total revenue from new API (preferred) or old API
  const totalRevenueForChart = useMemo(() => {
    if (revenueOverviewData?.data) {
      return revenueOverviewData.data.netRevenue;
    }
    return topStats.revenue;
  }, [revenueOverviewData, topStats.revenue]);

  // Revenue trend from new API
  const revenueTrend = useMemo(() => {
    if (revenueOverviewData?.data?.trend) {
      return parseTrendPercent(revenueOverviewData.data.trend);
    }
    return deltas.revenue;
  }, [revenueOverviewData, deltas.revenue]);

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

  // Summary bar data
  const summaryData = useMemo(() => {
    // Prefer new today-overview API
    const todayAppts = todayOverviewData?.data?.appointments;
    const todaysApptList = todayOverviewData?.data?.todaysAppointments;
    if (todayAppts) {
      // Find the next upcoming appointment from todaysAppointments
      const now = new Date();
      const upcomingFromList = (todaysApptList ?? []).filter((a) => {
        const status = a.appointmentStatus?.toLowerCase() ?? "";
        // Only consider non-completed, non-cancelled appointments
        if (status === "completed" || status === "cancelled" || status === "noshow") return false;
        if (a.appointmentTime) {
          const [h, m] = a.appointmentTime.split(":").map(Number);
          const apptTime = new Date(now);
          apptTime.setHours(h, m, 0, 0);
          return apptTime >= now;
        }
        return true;
      });
      const nextAppt = upcomingFromList[0];
      const nextApptTime = nextAppt
        ? (() => {
          const dt = new Date(nextAppt.appointmentDate);
          if (nextAppt.appointmentTime) {
            const [h, m] = nextAppt.appointmentTime.split(":").map(Number);
            if (!Number.isNaN(h)) dt.setHours(h);
            if (!Number.isNaN(m)) dt.setMinutes(m);
          }
          return fmtTime12(dt.toISOString());
        })()
        : undefined;
      return {
        nextApptTime,
        nextApptName: nextAppt?.patientName,
        remaining: todayAppts.remaining,
        completed: todayAppts.completed,
        pending: todayAppts.pending,
      };
    }
    // Fallback to old data
    const pending = todayAppointments.filter(
      (a) => a.status?.toLowerCase() === "pending",
    ).length;
    const completed = r?.appoimentStatus?.completed ?? 0;
    const remaining = todayAppointments.length;
    const nextAppt = todayAppointments[0];
    return {
      nextApptTime: nextAppt ? fmtTime12(nextAppt.start) : undefined,
      nextApptName: nextAppt?.patientName,
      remaining,
      completed,
      pending,
    };
  }, [todayAppointments, r, todayOverviewData]);

  const showSkeleton =
    (!curData && (isLoading || isFetching)) ||
    (!revenueOverviewData && isRevenueLoading) ||
    (!todayOverviewData && isTodayLoading);
  const handleUpgradePlan = () => navigate("/subscription");

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
      isRevenueLoading,    // Revenue overview query
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
      // profileStatus === "rejected" ? (
      //   <div className="w-full min-h-screen bg-slate-50/60 px-4 py-8 md:py-12 lg:px-8 lg:py-16 flex flex-col justify-center items-center">
      //     <ApprovalPendingPanel
      //       isChecking={isClinicsFetching}
      //       onCheckStatus={() => { void refetchClinics(); }}
      //       status={profileStatus}
      //     />
      //   </div>
      // ) : (
      // <ClinicSetup />
      // )
    ) : (
      <div className="w-full min-w-0 px-3 sm:px-0 pt-0 pb-4 sm:pb-6 antialiased lg:h-full lg:flex lg:flex-col lg:overflow-hidden dark:bg-[#0b1321]">
        {showSkeleton ? (
          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto no-scrollbar space-y-4 sm:space-y-6">
            <Sk className="h-8 w-48 sm:w-72" />
            <Sk className="h-4 w-64 sm:w-96" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Sk key={i} className="h-[144px] rounded-2xl" />
              ))}
            </div>
            <Sk className="h-[86px] rounded-xl" />
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
            <div className="max-w-full space-y-4 sm:space-y-5">
              {/* ── DASHBOARD_TOP Banner ── */}
              <BannerDisplay placement="DASHBOARD_TOP" className="mb-1" />

              {/* ===== Header: Greeting + Filters ===== */}
              <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex shrink-0 flex-col gap-1 xl:min-w-[220px]">
                  <h2 className="text-[18px] sm:text-[22px] md:text-[24px] lg:text-[26px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white">
                    {getGreeting()}, Dr. {currentUserName.split(" ")[0]} 👋
                  </h2>
                  <p className="text-[12px] sm:text-[13px] lg:text-[14px] font-normal leading-5 text-[#677294] dark:text-white">
                    Here's what's happening in your clinic today.
                  </p>
                </div>

                <div
                  id="tour-admin-controls"
                  className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end xl:w-auto"
                >
                  <div
                    className="relative flex items-center gap-3 overflow-x-auto no-scrollbar sm:justify-end min-w-0 flex-shrink"
                    data-datepicker-anchor
                  >
                    <DateFilterTabs
                      active={activeTab}
                      onChange={handleTabChange}
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

                  {/* Search */}
                  <div
                    ref={searchRef}
                    className="relative w-full sm:w-[220px] lg:w-[260px] xl:w-[280px] shrink-0 "
                  >
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowSearchResults(true);
                      }}
                      onFocus={() => setShowSearchResults(true)}
                      placeholder="Search patients..."
                      className="w-full rounded-xl border border-[rgba(207,207,207,0.5)] bg-white py-2.5 pr-4 pl-10 text-[14px] text-[#100e1c] placeholder:text-[#677294] focus:ring-1 focus:ring-[#0a6c74]/30 focus:outline-none dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:placeholder:text-white"
                    />
                    <svg
                      className="absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-[#677294] dark:text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    {isSearching && (
                      <div className="absolute top-1/2 right-3 -translate-y-1/2">
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                      </div>
                    )}

                    {/* Search Results Dropdown */}
                    {showSearchResults && debouncedSearch.trim().length >= 2 && (
                      <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-[320px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
                        {searchResults?.users && searchResults.users.length > 0 ? (
                          searchResults.users.map((patient: any) => (
                            <button
                              key={patient.id ?? patient._id}
                              type="button"
                              onClick={() => {
                                navigate(`/patient/${patient.id ?? patient._id}`);
                                setShowSearchResults(false);
                                setSearchTerm("");
                              }}
                              className="flex w-full items-center gap-3 border-b border-slate-50 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-slate-50 dark:border-[#273244] dark:hover:bg-[#151e31]"
                            >
                              {patient.profileImage ? (
                                <img
                                  src={patient.profileImage}
                                  alt={patient.name}
                                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 dark:bg-[#1d2440] dark:text-white">
                                  {initials(patient.name ?? "")}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                                  {patient.name}
                                </p>
                                <p className="truncate text-[11px] text-slate-500 dark:text-white">
                                  {patient.email || patient.mobile || ""}
                                </p>
                              </div>
                            </button>
                          ))
                        ) : !isSearching ? (
                          <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-white">
                            No patients found
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ===== Top Metric Cards ===== */}
              <div
                id="tour-dashboard-stats"
                className={`grid grid-cols-2 sm:grid-cols-3  lg:grid-cols-4 ${showRevenue ? "xl:grid-cols-5" : "xl:grid-cols-4"} gap-2 sm:gap-3 lg:gap-4 ${isFetching ? "opacity-80 transition-opacity" : ""}`}
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
                    value={formatINR(totalRevenueForChart)}
                    delta={revenueTrend}
                    bgColor="bg-[#e6fbf7]"
                    deltaLabel={comparisonLabel}
                  />
                )}
                <StatCard
                  icon={<HiOutlineClock className="h-5 w-5 text-[#e89b00]" />}
                  label="No Shows"
                  value={formatCompact(topStats.noShowAppointments)}
                  delta={deltas.noShow}
                  bgColor="bg-[#fff7e6]"
                  deltaLabel={comparisonLabel}
                  sparkUp={false}
                />
                <StatCard
                  icon={<MdOutlinePayment className="h-5 w-5 text-[#3b82f6]" />}
                  label="Pending Payments"
                  value={formatINR(topStats.pendingPayment)}
                  delta={deltas.pendingPayment}
                  bgColor="bg-[#eef1ff]"
                  deltaLabel={comparisonLabel}
                />
              </div>

              {/* ===== Summary Bar ===== */}
              {/* ===== Main Content: Charts + Right Sidebar ===== */}
              <div className={`grid grid-cols-1 ${showFreeOffer ? `lg:grid-cols-[minmax(0,1fr)_320px_320px] xl:grid-cols-[minmax(0,1fr)_360px_360px]` : `lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]`} gap-4 sm:gap-5`}>
                {/* Left Column */}
                <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
                  {/* Summary Bar */}
                  <div id="tour-admin-summary">
                    <SummaryBar
                      nextApptTime={summaryData.nextApptTime}
                      nextApptName={summaryData.nextApptName}
                      remaining={summaryData.remaining}
                      completed={summaryData.completed}
                      pending={summaryData.pending}
                      todayRevenue={todayOverviewData?.data?.revenue?.todayRevenue ?? revenueOverviewData?.data?.todayRevenue}
                      onViewSchedule={() => navigate(`/appointment?date=${toYMD(new Date())}`)}
                    />
                  </div>

                  {/* Revenue + Donut Row */}
                  <div
                    id="tour-admin-charts"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr] gap-4 sm:gap-5 relative"
                  >
                    <RevenueOverviewChart
                      title="Revenue Overview"
                      data={revenuePoints}
                      totalRevenue={totalRevenueForChart}
                      range={revenuePeriod === "week" ? "thisWeek" : "thisMonth"}
                      onRangeChange={(range) => {
                        // Sync the main date filter when user toggles the chart range
                        if (range === "thisWeek") {
                          handleTabChange("thisWeek");
                        } else {
                          handleTabChange("thisMonth");
                        }
                      }}
                      trend={revenueOverviewData?.data?.trend}
                      comparisonLabel={revenueOverviewData?.data?.comparisonLabel}
                    />
                    <DonutOverviewCard
                      title="Appointment Status"
                      centerLabel="Total Appt"
                      items={appointmentStatusItems}
                    />
                  </div>

                  {/* Today's Appointments Table */}
                  <div
                    id="tour-admin-todays-appointments"
                    className="bg-white border border-[rgba(229,231,234,0.6)] rounded-[16px] overflow-hidden shadow-[0_1px_1px_rgba(0,0,0,0.05)] flex flex-col min-w-0 dark:bg-[#111726] dark:border-[#273244] dark:shadow-none"
                  >
                    {/* Table Header */}
                    <div className="px-4 pt-4 pb-2">
                      <h3 className="text-[16px] font-semibold text-[#100e1c] dark:text-white">
                        Today's Appointments
                      </h3>
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
                              Consultation
                            </th>
                            <th className="px-4 py-2 text-[12px] font-semibold text-[#677294] uppercase tracking-[0.8px] dark:text-white">
                              Status
                            </th>
                            <th className="px-4 py-2 text-[12px] font-semibold text-[#677294] uppercase tracking-[0.8px] text-center dark:text-white">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {todayAppointments.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-4 py-12 text-center text-sm text-[#677294] dark:text-white"
                              >
                                No appointments today.
                              </td>
                            </tr>
                          ) : (
                            todayAppointments.slice(0, 4).map((appt) => {
                              const st = (appt.status ?? "").toLowerCase();
                              const canReschedule =
                                st.includes("pending") ||
                                st.includes("upcoming") ||
                                st.includes("confirm");
                              const rescheduleTooltip = !canReschedule
                                ? st.includes("complet")
                                  ? "Completed appointments cannot be rescheduled"
                                  : st.includes("cancel")
                                    ? "Cancelled appointments cannot be rescheduled"
                                    : st.includes("noshow") || st.includes("no show")
                                      ? "No-show appointments cannot be rescheduled"
                                      : "This appointment cannot be rescheduled"
                                : "";

                              return (
                                <tr
                                  key={appt.id}
                                  className="hover:bg-[#f8f9fb] transition cursor-pointer dark:hover:bg-[#151e31]"
                                  onClick={() =>
                                    navigate(`/appointment/${appt.id}`)
                                  }
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      {appt.profileImage ? (
                                        <img
                                          src={appt.profileImage}
                                          alt={appt.patientName}
                                          className="h-8 w-8 rounded-full object-cover shrink-0"
                                        />
                                      ) : (
                                        <div className="h-8 w-8 rounded-full bg-[#eef1ff] flex items-center justify-center text-[10px] font-semibold text-[#6366f1] shrink-0 dark:bg-[#1d2440] dark:text-white">
                                          {initials(appt.patientName)}
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-[16px] font-semibold text-[#181c1c] leading-normal dark:text-white">
                                          {appt.patientName}
                                        </p>
                                        {appt.patientId && (
                                          <p className="text-[11px] font-normal text-[#3e4947] dark:text-white">
                                            PID: {appt.patientId}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-[14px] font-normal text-[#181c1c] dark:text-white">
                                    {fmtTime12(appt.start)}
                                  </td>
                                  <td className="px-4 py-3 text-[14px] font-normal text-[#181c1c] dark:text-white">
                                    {appt.notes || "Follow-up"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <StatusBadge
                                      status={appt.status ?? "Pending"}
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                      {canReschedule ? (
                                        <Tooltip content="Reschedule appointment" placement="top">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigate(`/appointment/${appt.id}/reschedule`);
                                            }}
                                            className="h-[29px] w-[29px] rounded-full border-[0.5px] border-[#e5484d] flex items-center justify-center hover:bg-red-50 transition dark:hover:bg-[#332022]"
                                          >
                                            <MdOutlineRefresh className="h-4 w-4 text-[#e5484d]" />
                                          </button>
                                        </Tooltip>
                                      ) : (
                                        <Tooltip content={rescheduleTooltip} placement="top">
                                          <button
                                            type="button"
                                            disabled
                                            className="h-[29px] w-[29px] rounded-full border-[0.5px] border-[#d4d4d4] flex items-center justify-center opacity-40 cursor-not-allowed"
                                          >
                                            <MdOutlineRefresh className="h-4 w-4 text-[#9ca3af]" />
                                          </button>
                                        </Tooltip>
                                      )}
                                      <Tooltip content="View appointment details" placement="top">
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
                                      </Tooltip>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[#e5e7ea] px-4 py-3 flex justify-center dark:border-[#273244]">
                      <button
                        type="button"
                        onClick={() => navigate(`/appointment?date=${toYMD(new Date())}`)}
                        className="flex items-center gap-2 cursor-pointer text-[14px] font-medium text-[#0a6c74] tracking-[-0.3px] hover:gap-3 hover:opacity-80 transition-all duration-200 dark:text-[#9be7dc]"
                      >
                        View All Appointments{" "}
                        <ArrowUpRight className="text-[#0a6c74] dark:text-[#9be7dc]" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row: Top Symptoms + Patient Overview */}
                  <div
                    id="tour-admin-reports-overview"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 relative"
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
                </div>

                {/* Right Sidebar */}
                <div
                  id="tour-admin-side-panel"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-5"
                >
                  <BannerDisplay placement="DASHBOARD_SIDEBAR" compact className="sm:col-span-2 lg:col-span-1" />

                  {/* Medicine Spotlight Banners */}
                  <BannerDisplay placement="INSIGHTS_WIDGET" className="sm:col-span-2 lg:col-span-1" />


                  <AIInsightsWidget
                    isFreePlan={isAiInsightsLocked}
                    onUpgrade={handleUpgradePlan}
                  />
                  <AlertsWidget
                    noShowCount={topStats.noShowAppointments}
                    onViewNoShow={() => navigate("/no-show")}
                  />
                  <RemindersWidget appointments={todayAppointments} navigate={navigate} />
                  <QuickActionsWidget navigate={navigate} />
                </div>
                <div>

                  {/* Promo Sidebar - Free Trial Offer */}
                  <PromoSidebar
                    showFreeOffer={showFreeOffer}
                    onShowSuccessModal={handleShowSuccessModal}
                  />
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
