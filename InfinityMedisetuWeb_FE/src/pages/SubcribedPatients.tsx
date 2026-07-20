// Payment History — redesigned to match Appointments module design language
import { addToast, Avatar, Pagination } from "@heroui/react";
import { skipToken } from "@reduxjs/toolkit/query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router";
import { useGetUserQuery } from "../redux/api/authApi";

import SearchField from "../components/shared/SearchField";
import type { RootState } from "../redux/store";
import DashboardDateRangePicker from "./dashboard/DashboardDateRangePicker";

import {
  FiSettings,
  FiEye,
  FiCalendar,
  FiCopy,
  FiX,
  FiChevronDown,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { LuBanknote, LuReceipt, LuArrowDownUp } from "react-icons/lu";
import {
  useGetPaymentTransactionsQuery,
  type Pagination as ApiPagination,
  type PaymentTransaction,
} from "../redux/api/subscriptionApi";
import useDebounce from "../hooks/useDebounce";
import BannerDisplay from "../components/banners/BannerDisplay";
import FeatureInfoTip from "../components/shared/FeatureInfoTip";
import { paymentsTips } from "../constants/featureTips";
import StatusChip from "../components/shared/StatusChip";
import { getApiErrorText, isNetworkError } from "../utils/getApiErrorText";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "all" | "credit" | "debit";
type PageSize = 6 | 10 | 15;

type Row = {
  rawId: string;
  originalAppointmentId?: string | null;
  patientName: string;
  patientMobile: string | null;
  patientEmail?: string | null;
  patientAvatar?: string | null;
  doctorName: string;
  doctorSpeciality: string | null;
  doctorAvatar?: string | null;
  serviceName: string;
  priceNumber: number | null;
  entryType: string;
  paymentMode?: string | null;
  refundMode?: string | null;
  refundNotes?: string | null;
  mode?: string | null;
  dateLabel: string;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const formatDateSafe = (val?: string | null) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString();
};

const mapFromAPI = (item: PaymentTransaction): Row => {
  const patientName = item.patientName ?? "Unknown Patient";
  const patientMobile = item.patientMobile ?? null;
  const serviceName = item.serviceName ?? "—";
  const priceNumber = typeof item.price === "number" ? item.price : null;
  const entryType = item.entryType ?? "";
  const paymentMode = item.paymentMode ?? null;
  const refundMode = item.refundMode ?? null;
  const refundNotes = item.refundNotes ?? null;
  const mode = entryType.toLowerCase() === "credit" ? paymentMode : refundMode;

  const dateSrc = item.appointmentDate ?? null;
  const dateLabel = dateSrc
    ? (() => {
      const d = new Date(dateSrc);
      if (Number.isNaN(d.getTime())) return formatDateSafe(dateSrc);
      const mon = d.toLocaleString("en-US", { month: "long" });
      const day = d.getDate();
      const yy = d.getFullYear();
      return `${mon} ${day}, ${yy}`;
    })()
    : "—";

  const rawId = String(
    item.transactionId ?? item.originalAppointmentId ?? "",
  ).trim();

  return {
    rawId,
    originalAppointmentId: item.originalAppointmentId ?? null,
    patientName,
    patientMobile,
    doctorName: item.doctorName ?? "—",
    doctorSpeciality: item.doctorSpeciality ?? null,
    serviceName,
    priceNumber,
    entryType,
    paymentMode,
    refundMode,
    refundNotes,
    mode,
    dateLabel,
  };
};

const moneyFmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const monthStartYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};

function getRtkErrorText(err: unknown) {
  return getApiErrorText(err, "Failed to load payment history.");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-[#172033] ${className}`} />
);

const doctorDisplayName = (name: string) => {
  const clean = String(name || "").trim();
  if (!clean || clean === "—") return "—";
  return clean.toLowerCase().startsWith("dr.") ? clean : `Dr. ${clean}`;
};

// Entry type pill — maps to StatusChip-compatible status
const entryTypeStatus = (type: string) => {
  const t = type.toLowerCase();
  if (t === "credit") return "completed"; // green
  if (t === "debit") return "cancelled";  // red
  return "unknown";
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  iconClassName: string;
  detailClassName: string;
}> = ({ label, value, detail, icon, iconClassName, detailClassName }) => (
  <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none sm:px-5">
    <div className="flex items-center gap-4">
      <div className={["grid h-12 w-12 shrink-0 place-items-center rounded-full", iconClassName].join(" ")}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-slate-500 dark:text-white">{label}</p>
        <p className="mt-0.5 text-[24px] font-bold leading-none text-slate-900 dark:text-white">{value}</p>
        <p className={["mt-1 truncate text-[12px]", detailClassName].join(" ")}>{detail}</p>
      </div>
    </div>
  </div>
);

// ─── Bottom Controls (Pagination) ─────────────────────────────────────────────

const BottomControls: React.FC<{
  show: boolean;
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  totalRecords: number;
  rowsPerPage: PageSize;
  setRowsPerPage: (v: PageSize) => void;
}> = ({ show, page, setPage, totalPages, totalRecords, rowsPerPage, setRowsPerPage }) => {
  const [isPageSizeOpen, setIsPageSizeOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const pageSizeOptions: PageSize[] = [6, 10, 15];
  const fromRecord = totalRecords > 0 ? Math.min((page - 1) * rowsPerPage + 1, totalRecords) : 0;
  const toRecord = totalRecords > 0 ? Math.min(page * rowsPerPage, totalRecords) : 0;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPageSizeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="border-t border-slate-100 px-4 py-3 dark:border-[#273244]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <span className="text-center text-[13px] font-medium text-slate-500 dark:text-white sm:text-left">
          Showing {fromRecord} to {toRecord} of {totalRecords} transactions
        </span>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-end">
          <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-slate-600 dark:text-white sm:justify-start">
            <span className="whitespace-nowrap">Rows per page:</span>
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsPageSizeOpen((prev) => !prev)}
                className="flex h-9 w-[72px] items-center justify-between rounded-lg border border-primary/35 bg-white px-3 text-[13px] font-semibold text-primary shadow-sm dark:bg-[#111726] dark:text-white outline-none transition hover:border-primary/60 hover:bg-primary/5 focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <span>{rowsPerPage}</span>
                <FiChevronDown className={`text-primary transition-transform duration-200 dark:text-white ${isPageSizeOpen ? "rotate-180" : ""}`} />
              </button>
              {isPageSizeOpen && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[72px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-[#273244] dark:bg-[#111726]">
                  {pageSizeOptions.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => { setRowsPerPage(size); setIsPageSizeOpen(false); }}
                      className={["flex h-9 w-full items-center px-3 text-left text-[13px] transition", rowsPerPage === size ? "bg-primary text-white" : "bg-white text-slate-700 hover:bg-primary/5 hover:text-primary dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]"].join(" ")}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {show && totalRecords > 0 && totalPages > 1 && (
            <div className="flex justify-center lg:justify-end">
              <Pagination
                isCompact
                showControls
                total={totalPages}
                page={page}
                onChange={setPage}
                radius="lg"
                classNames={{
                  wrapper: "gap-2 flex-wrap justify-center lg:justify-end",
                  item: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                  prev: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                  next: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                  cursor: "hidden",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Transaction Detail Side Drawer ──────────────────────────────────────────

const TransactionDetailDrawer: React.FC<{
  txn: Row | null;
  isOpen: boolean;
  onClose: () => void;
  onCopy: (text: string) => void;
  onViewAppointment: (txn: Row) => void;
  moneyFmt: (n: number) => string;
}> = ({ txn, isOpen, onClose, onCopy, onViewAppointment, moneyFmt }) => {
  if (!isOpen || !txn) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Transaction Details">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-[#111726] sm:rounded-l-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-[#273244]">
          <h3 className="text-[18px] font-bold text-slate-900 dark:text-white">Transaction Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#1d2a42] dark:hover:text-white"
            aria-label="Close panel"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-6">

            {/* TXN ID + type badge */}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <StatusChip status={entryTypeStatus(txn.entryType)} text={txn.entryType ? txn.entryType[0].toUpperCase() + txn.entryType.slice(1) : "—"} />
              <span
                onClick={() => onCopy(txn.rawId)}
                className="cursor-pointer select-all font-medium hover:text-slate-700 dark:hover:text-white"
                title="Click to copy Transaction ID"
              >
                TXN-{txn.rawId}
              </span>
              <button
                type="button"
                onClick={() => onCopy(txn.rawId)}
                className="text-slate-400 transition hover:text-slate-600 dark:hover:text-white"
                title="Copy Transaction ID"
              >
                <FiCopy size={14} />
              </button>
            </div>

            {/* Amount + status */}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[30px] font-bold leading-none text-slate-900 dark:text-white">
                  {txn.priceNumber != null ? moneyFmt(txn.priceNumber) : "—"}
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{txn.mode ?? "—"} Payment</div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                  ✓ Completed
                </span>
                <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{txn.dateLabel}</div>
              </div>
            </div>

            <hr className="border-gray-100 dark:border-[#273244]" />

            {/* Payment Information */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-[#273244]">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-white dark:ring-1 dark:ring-[#46beae]/35">
                  <LuBanknote size={16} />
                </div>
                <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">Payment Information</h4>
              </div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Amount</span><span className="font-semibold text-slate-900 dark:text-white">{txn.priceNumber != null ? moneyFmt(txn.priceNumber) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Payment Mode</span><span className="font-semibold text-slate-900 dark:text-white">{txn.mode ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Type</span><span className="font-semibold text-slate-900 dark:text-white">{txn.entryType ? txn.entryType[0].toUpperCase() + txn.entryType.slice(1) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Status</span><span className="font-semibold text-emerald-600">Completed</span></div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Transaction ID</span>
                <span
                  onClick={() => onCopy(txn.rawId)}
                  className="cursor-pointer select-all font-semibold text-slate-900 dark:text-white hover:text-primary flex items-center gap-1"
                  title="Click to copy"
                >
                  TXN-{txn.rawId}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Date</span><span className="font-semibold text-slate-900 dark:text-white">{txn.dateLabel}</span></div>
              {txn.refundNotes && (
                <div className="flex justify-between gap-2"><span className="text-slate-500 dark:text-slate-400">Refund Notes</span><span className="font-semibold text-slate-900 dark:text-white text-right max-w-[55%]">{txn.refundNotes}</span></div>
              )}
            </div>

            <hr className="border-gray-100 dark:border-[#273244]" />

            {/* Patient Information */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-[#273244]">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-white dark:ring-1 dark:ring-[#46beae]/35">
                  <LuReceipt size={16} />
                </div>
                <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">Patient Information</h4>
              </div>
              <div className="flex items-center gap-3">
                <Avatar src={txn.patientAvatar || undefined} size="sm" className="bg-slate-100 text-slate-600 dark:bg-[#172033] dark:text-white" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{txn.patientName}</div>
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">{txn.patientMobile ?? "—"}</div>
                </div>
              </div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Service</span><span className="font-semibold text-slate-900 dark:text-white text-right max-w-[55%] truncate">{txn.serviceName}</span></div>
            </div>

            <hr className="border-gray-100 dark:border-[#273244]" />

            {/* Doctor Information */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-[#273244]">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-white dark:ring-1 dark:ring-[#46beae]/35">
                  <LuArrowDownUp size={16} />
                </div>
                <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">Doctor Information</h4>
              </div>
              <div className="flex items-center gap-3">
                <Avatar src={txn.doctorAvatar || undefined} size="sm" className="bg-slate-100 text-slate-600 dark:bg-[#172033] dark:text-white" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{doctorDisplayName(txn.doctorName)}</div>
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">{txn.doctorSpeciality ?? "Consultation"}</div>
                </div>
              </div>
            </div>

            {/* View Appointment action */}
            {txn.originalAppointmentId && (
              <>
                <hr className="border-gray-100 dark:border-[#273244]" />
                <button
                  type="button"
                  onClick={() => onViewAppointment(txn)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-[13px] font-semibold text-primary transition hover:bg-primary/10 dark:border-primary/40 dark:bg-primary/10 dark:text-white"
                >
                  <FiCalendar size={15} />
                  View Linked Appointment
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
// (empty state is rendered inline inside the table/card body)

// ─── Main Component ───────────────────────────────────────────────────────────

const TAB_KEYS: TabKey[] = ["all", "credit", "debit"];
const tabLabel = (k: TabKey) =>
  k === "all" ? "Type - All" : `Type - ${k[0].toUpperCase() + k.slice(1)}`;

type PaymentTransactionsQueryArgs = Exclude<
  Parameters<typeof useGetPaymentTransactionsQuery>[0],
  typeof skipToken
>;

const SubcribedPatients: React.FC = () => {
  const authUser = useSelector((s: RootState) => s.auth.user);
  const navigate = useNavigate();

  // Payment visibility check
  const { data: userData } = useGetUserQuery();
  const user = (userData as any)?.user ?? userData;
  const paymentVisible = Boolean((user as any)?.paymentVisible ?? true);

  const userTypeRaw = String(
    (authUser as any)?.userType ?? (authUser as any)?.role ?? "",
  ).trim().toLowerCase();
  const isDoctorUser = userTypeRaw === "doctor";

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [tab, setTab] = useState<TabKey>("all");
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement | null>(null);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<PageSize>(10);

  // ── Date range ────────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    setStartDate((p) => p || monthStartYMD(now));
    setEndDate((p) => p || toYMD(now));
  }, []);

  // ── Detail drawer state ───────────────────────────────────────────────────
  const [selectedTxn, setSelectedTxn] = useState<Row | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // ── Tab counts ────────────────────────────────────────────────────────────
  const [tabCounts, setTabCounts] = useState<Record<TabKey, number>>({ all: 0, credit: 0, debit: 0 });

  // Reset tab counts when search/date criteria change
  useEffect(() => {
    setTabCounts({ all: 0, credit: 0, debit: 0 });
  }, [debouncedSearch, startDate, endDate]);

  // Reset to page 1 on filter changes
  useEffect(() => { setPage(1); }, [tab, rowsPerPage, search, startDate, endDate]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const apiPageSize = rowsPerPage;

  const queryArgs = useMemo<PaymentTransactionsQueryArgs>(() => ({
    pageNumber: page,
    pageSize: apiPageSize,
    search: debouncedSearch.trim() || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    entryType: tab === "credit" ? "Credit" : tab === "debit" ? "Debit" : undefined,
  }), [page, apiPageSize, debouncedSearch, startDate, endDate, tab]);

  const { data, isLoading, isFetching, isError, error } =
    useGetPaymentTransactionsQuery(paymentVisible ? queryArgs : skipToken, {
      refetchOnMountOrArgChange: true,
    });

  useEffect(() => {
    if (isError && !isNetworkError(error)) {
      addToast({
        title: "Failed to load payment history",
        description: getRtkErrorText(error),
        color: "danger",
        variant: "flat",
      });
    }
  }, [isError, error]);

  const rawList: PaymentTransaction[] = useMemo(() => data?.data ?? [], [data]);
  const summaryRaw: any = data?.summary ?? null;

  const meta: ApiPagination = useMemo(() => (
    data?.metadata ?? {
      totalRecords: rawList.length,
      totalPages: 1,
      currentPage: page,
      pageSize: apiPageSize,
    }
  ), [data, rawList.length, page, apiPageSize]);

  const rows = useMemo(() => rawList.map(mapFromAPI), [rawList]);
  const activeTotal = Number(meta.totalRecords ?? rows.length);
  const totalPages = Math.max(1, Number(meta.totalPages ?? 1));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Cache tab counts
  useEffect(() => {
    if (data?.metadata) {
      const total = Number(data.metadata.totalRecords ?? rawList.length);
      setTabCounts((prev) => {
        if (prev[tab] === total) return prev;
        return { ...prev, [tab]: total };
      });
    }
  }, [data, tab, rawList.length]);

  const counts = useMemo(() => ({
    all: tab === "all" ? activeTotal : (tabCounts.all || 0),
    credit: tab === "credit" ? activeTotal : (tabCounts.credit || 0),
    debit: tab === "debit" ? activeTotal : (tabCounts.debit || 0),
  }), [tab, activeTotal, tabCounts]);

  // ── Summary calculations ──────────────────────────────────────────────────
  const calc = useMemo(() => {
    let creditAmount = 0;
    let debitAmount = 0;
    const modes: Record<string, { credit: { amount: number; count: number }; debit: { amount: number; count: number } }> = {};

    if (summaryRaw?.paymentModeSummary) {
      const creditObj = summaryRaw.paymentModeSummary.credit || {};
      const debitObj = summaryRaw.paymentModeSummary.debit || {};
      Object.keys(creditObj).forEach((m) => {
        const mode = (m || "Unknown").trim() || "Unknown";
        modes[mode] = modes[mode] || { credit: { amount: 0, count: 0 }, debit: { amount: 0, count: 0 } };
        modes[mode].credit.amount += Number(creditObj[m] ?? 0);
      });
      Object.keys(debitObj).forEach((m) => {
        const mode = (m || "Unknown").trim() || "Unknown";
        modes[mode] = modes[mode] || { credit: { amount: 0, count: 0 }, debit: { amount: 0, count: 0 } };
        modes[mode].debit.amount += Number(debitObj[m] ?? 0);
      });
      creditAmount = Number(summaryRaw.totalCreditAmount ?? summaryRaw.totalAmountCredit ?? 0);
      debitAmount = Number(summaryRaw.totalDebitAmount ?? summaryRaw.totalAmountDebit ?? 0);
    } else {
      rawList.forEach((it) => {
        const entry = String(it.entryType ?? "").toLowerCase();
        const mode = entry === "credit" ? (it.paymentMode ?? "Unknown") : (it.refundMode ?? "Unknown");
        const modeKey = String(mode || "Unknown").trim() || "Unknown";
        const amt = Number(it.price ?? 0) || 0;
        modes[modeKey] = modes[modeKey] || { credit: { amount: 0, count: 0 }, debit: { amount: 0, count: 0 } };
        if (entry === "credit") modes[modeKey].credit.amount += amt;
        else if (entry === "debit") modes[modeKey].debit.amount += amt;
      });
      creditAmount = Object.values(modes).reduce((s, v) => s + v.credit.amount, 0);
      debitAmount = Object.values(modes).reduce((s, v) => s + v.debit.amount, 0);
    }

    // Counts from current rawList
    rawList.forEach((it) => {
      const entry = String(it.entryType ?? "").toLowerCase();
      const mode = entry === "credit" ? (it.paymentMode ?? "Unknown") : (it.refundMode ?? "Unknown");
      const modeKey = String(mode || "Unknown").trim() || "Unknown";
      modes[modeKey] = modes[modeKey] || { credit: { amount: 0, count: 0 }, debit: { amount: 0, count: 0 } };
      if (entry === "credit") modes[modeKey].credit.count += 1;
      else if (entry === "debit") modes[modeKey].debit.count += 1;
    });

    return {
      creditAmount,
      debitAmount,
      netAmount: creditAmount - debitAmount,
      totalTransactions: activeTotal,
      modes,
    };
  }, [activeTotal, summaryRaw, rawList]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleViewDetails = (txn: Row) => {
    setSelectedTxn(txn);
    setIsDetailsOpen(true);
  };

  const handleViewAppointment = (txn: Row) => {
    if (txn.originalAppointmentId) {
      navigate(`/appointment/${txn.originalAppointmentId}`);
    } else {
      addToast({ title: "Appointment ID not found", description: "This transaction does not have an associated appointment.", color: "danger" });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({ title: "Copied to Clipboard", description: `Copied: ${text}`, color: "success" });
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const showSkeleton = isLoading && !data;
  const isRefreshing = isFetching && !showSkeleton;
  const colSpan = isDoctorUser ? 6 : 7;

  // ── Date navigation helpers ───────────────────────────────────────────────
  const shiftDateByOneDay = (direction: "prev" | "next") => {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    const shift = direction === "prev" ? -1 : 1;
    start.setDate(start.getDate() + shift);
    end.setDate(end.getDate() + shift);
    setStartDate(toYMD(start));
    setEndDate(toYMD(end));
  };

  // ── Payment not visible ───────────────────────────────────────────────────
  if (!paymentVisible) {
    return (
      <div className="w-full min-w-0 px-0 py-0">
        <div className="mb-5">
          <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
            Payments History
          </h2>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-[13px] text-yellow-800">
          Payment visibility is currently turned off. You can change the setting from your{" "}
          <Link to="/profile/security" className="inline-flex items-center gap-1 font-semibold text-primary">
            <FiSettings size={13} /> profile settings
          </Link>
        </div>
      </div>
    );
  }

  // ── Stat cards data ───────────────────────────────────────────────────────
  const statCards = [
    {
      label: "Total Credit",
      value: moneyFmt(calc.creditAmount),
      detail: "Payments received",
      icon: <LuArrowDownUp size={20} className="rotate-180" />,
      iconClassName: "bg-emerald-50 text-emerald-600 dark:bg-[#16352f] dark:text-[#9be7dc]",
      detailClassName: "text-emerald-600 dark:text-[#9be7dc]",
    },
    {
      label: "Total Debit",
      value: moneyFmt(calc.debitAmount),
      detail: "Refunds processed",
      icon: <LuArrowDownUp size={20} />,
      iconClassName: "bg-red-50 text-red-500 dark:bg-[#2d1619] dark:text-red-400",
      detailClassName: "text-red-500 dark:text-red-400",
    },
    {
      label: "Net Amount",
      value: moneyFmt(calc.netAmount),
      detail: calc.netAmount >= 0 ? "Positive balance" : "Negative balance",
      icon: <LuBanknote size={20} />,
      iconClassName: "bg-blue-50 text-blue-600 dark:bg-[#172b48] dark:text-blue-400",
      detailClassName: calc.netAmount >= 0 ? "text-emerald-600 dark:text-[#9be7dc]" : "text-red-500 dark:text-red-400",
    },
    {
      label: "Total Transactions",
      value: String(calc.totalTransactions),
      detail: "In selected period",
      icon: <LuArrowDownUp size={20} />,
      iconClassName: "bg-purple-50 text-purple-600 dark:bg-[#1f1735] dark:text-purple-400",
      detailClassName: "text-slate-500 dark:text-white",
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-w-0 px-0 py-0">
      {/* Banner */}
      <BannerDisplay placement="BILLING_PAGE" className="mb-4" />

      {/* Page Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
            Payments History
          </h2>
          <FeatureInfoTip
            title="Payment Tips"
            tips={paymentsTips}
            guideSection="payments-guide"
            linkLabel="Read payments guide"
          />
        </div>
        <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-white">
          View and manage all payment transactions
        </p>
      </div>

      {/* Stat Cards */}
      <div className={["stats-scroll", isLoading ? "opacity-75 transition-opacity" : ""].join(" ")}>
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Toolbar / Filter Bar */}
      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">

          {/* Search */}
          <div className="w-full lg:w-[320px]">
            <SearchField
              type="text"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search by patient or doctor name..."
              className="w-full"
              classNames={{
                inputWrapper:
                  "h-11 rounded-lg border border-slate-200 bg-white px-3 shadow-sm " +
                  "data-[hover=true]:border-slate-300 data-[focus=true]:border-primary " +
                  "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                input: "text-[14px] text-slate-700 placeholder:text-[14px] placeholder:text-slate-400 dark:text-white dark:placeholder:text-white",
              }}
            />
          </div>

          {/* Date range with prev/next arrows */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => shiftDateByOneDay("prev")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31] disabled:cursor-not-allowed disabled:opacity-50"
              title="Previous period"
              aria-label="Previous period"
            >
              <FiChevronLeft size={16} />
            </button>

            <div className="flex min-w-0 flex-1 items-center sm:flex-none [&>div]:!w-full sm:[&>div]:!w-auto [&_button]:!h-10 [&_button]:!rounded-lg [&_button]:!border-slate-200 [&_button]:!px-3 [&_button]:!shadow-sm [&_button_span]:!text-[13px]">
              <DashboardDateRangePicker
                startYmd={startDate}
                endYmd={endDate}
                isFetching={showSkeleton}
                onApply={(s, e) => { setStartDate(s); setEndDate(e); }}
              />
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => shiftDateByOneDay("next")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31] disabled:cursor-not-allowed disabled:opacity-50"
              title="Next period"
              aria-label="Next period"
            >
              <FiChevronRight size={16} />
            </button>
          </div>

          {/* Type filter dropdown */}
          <div ref={typeDropdownRef} className="relative w-full sm:w-[190px]">
            <button
              type="button"
              onClick={() => setIsTypeOpen(!isTypeOpen)}
              onKeyDown={(e) => { if (e.key === "Escape") setIsTypeOpen(false); }}
              aria-expanded={isTypeOpen}
              aria-label="Payment type filter"
              className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 shadow-sm dark:border-[#273244] dark:bg-[#111726] dark:text-white outline-none transition hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#151e31] focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            >
              <span className="truncate text-left">
                {tabLabel(tab)}{tab !== "all" && counts[tab] ? ` (${counts[tab]})` : ""}
              </span>
              <FiChevronDown className={`ml-2 shrink-0 text-slate-500 transition-transform duration-200 dark:text-white ${isTypeOpen ? "rotate-180" : ""}`} />
            </button>

            {isTypeOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30">
                {TAB_KEYS.map((key) => {
                  const isActive = tab === key;
                  const count = counts[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setTab(key); setIsTypeOpen(false); }}
                      className={["flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition", isActive ? "bg-teal-50 text-teal-700 dark:bg-[#173c36] dark:text-[#9be7dc]" : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]"].join(" ")}
                    >
                      <span>{tabLabel(key)}{count ? ` (${count})` : ""}</span>
                      {isActive && <FiCheck className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table / List */}
      <div className="mt-4">
        <div className={["overflow-visible rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none relative", isRefreshing ? "opacity-60 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200"].join(" ")}>

          {/* Refreshing indicator */}
          {isRefreshing && (
            <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden rounded-t-lg bg-primary/10">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
          )}

          <>
            {/* ── MOBILE: Card view ── */}
            <div className="space-y-3 p-3 md:hidden">
              {showSkeleton && Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#273244] dark:bg-[#111726]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Skel className="h-10 w-10 rounded-full" />
                      <div className="min-w-0">
                        <Skel className="h-4 w-36" />
                        <Skel className="mt-2 h-3 w-24" />
                      </div>
                    </div>
                    <Skel className="h-6 w-16 rounded-full" />
                  </div>
                  <Skel className="mt-3 h-12 w-full rounded-xl" />
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#0f1728]">
                    <Skel className="h-4 w-20" />
                    <Skel className="h-4 w-20" />
                  </div>
                </div>
              ))}
              {!showSkeleton && isError && (
                <div className="py-10 text-center text-[13px] text-red-600">{getRtkErrorText(error)}</div>
              )}
              {!showSkeleton && !isError && rows.length === 0 && (
                <div className="py-10 text-center text-[13px] text-slate-400 dark:text-white">
                  No payment history found for the selected criteria.
                </div>
              )}
              {!showSkeleton && !isError && rows.length > 0 && rows.map((r, idx) => {
                const cardKey = `${r.rawId || r.patientName}-${idx}`;
                return (
                  <div
                    key={cardKey}
                    className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726] dark:shadow-none"
                  >
                    <div className="p-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar src={r.patientAvatar || undefined} size="sm" className="bg-emerald-50 text-emerald-700 dark:bg-[#16352f] dark:text-white" />
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-bold leading-5 text-slate-900 dark:text-white">{r.patientName}</p>
                            <p className="truncate text-[12px] font-medium leading-4 text-slate-500 dark:text-white">{r.patientMobile ?? "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusChip status={entryTypeStatus(r.entryType)} text={r.entryType ? r.entryType[0].toUpperCase() + r.entryType.slice(1) : "—"} />
                          <button
                            type="button"
                            onClick={() => handleViewDetails(r)}
                            className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-white dark:hover:bg-[#151e31]"
                            aria-label="View transaction details"
                          >
                            <FiEye size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Doctor strip (non-doctor users) */}
                      {!isDoctorUser && (
                        <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-[#0f1728]">
                          <div className="flex items-center gap-3">
                            <Avatar src={r.doctorAvatar || undefined} size="sm" className="bg-slate-200 dark:bg-[#172033] dark:text-white" />
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold leading-5 text-slate-900 dark:text-white">{doctorDisplayName(r.doctorName)}</p>
                              <p className="truncate text-[12px] font-medium leading-4 text-primary">{r.doctorSpeciality ?? "Consultation"}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Info grid */}
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#0f1728]">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-slate-500 dark:text-white">Mode</p>
                          <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">{r.mode ?? "—"}</p>
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="text-[11px] font-medium text-slate-500 dark:text-white">Amount</p>
                          <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">
                            {r.priceNumber != null ? moneyFmt(r.priceNumber) : "—"}
                          </p>
                        </div>
                      </div>

                      {/* Bottom row */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-start gap-2">
                          <span className="mt-[5px] h-2.5 w-2.5 rounded-full bg-emerald-600" />
                          <div>
                            <p className="text-[12px] font-medium text-slate-500 dark:text-white">{r.serviceName}</p>
                            <p className="text-[12px] font-medium text-slate-500 dark:text-white">{r.dateLabel}</p>
                          </div>
                        </div>
                        {r.originalAppointmentId && (
                          <button
                            type="button"
                            onClick={() => handleViewAppointment(r)}
                            className="flex h-7 items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2 text-[11px] font-medium text-primary transition hover:bg-primary/10 dark:border-primary/40 dark:bg-primary/10 dark:text-white"
                          >
                            <FiCalendar size={11} />
                            Appointment
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── DESKTOP: Table view ── */}
            <div className="hidden overflow-x-auto pb-1 md:block [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50/80 dark:bg-[#111726]">
                  <tr className="border-b border-slate-100 dark:border-[#273244]">
                    <th className="w-[22%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Patient</th>
                    {!isDoctorUser && <th className="w-[22%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Doctor</th>}
                    <th className="w-[18%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Service</th>
                    <th className="w-[13%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Mode</th>
                    <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Amount</th>
                    <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Date</th>
                    <th className="w-[9%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">Type</th>
                    <th className="w-[6%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                  {showSkeleton ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={colSpan + 1} className="px-5 py-5">
                          <div className="flex items-center gap-3">
                            <Skel className="h-10 w-10 rounded-full" />
                            <div className="min-w-0 flex-1">
                              <Skel className="h-4 w-44" />
                              <Skel className="mt-2 h-3 w-64 max-w-[70%]" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : isError ? (
                    <tr>
                      <td colSpan={colSpan + 1} className="h-[320px] text-center text-[13px] text-red-600">
                        {getRtkErrorText(error)}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={colSpan + 1} className="h-[320px] text-center text-slate-400 dark:text-white">
                        No payment history found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => (
                      <tr
                        key={`${r.rawId || r.patientName}-${idx}`}
                        className="cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-[#151e31]"
                        onClick={() => handleViewDetails(r)}
                      >
                        {/* Patient */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar src={r.patientAvatar || undefined} name={r.patientName} size="sm" className="bg-emerald-50 text-emerald-700 dark:bg-[#16352f] dark:text-white" />
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-bold text-slate-950 dark:text-white">{r.patientName}</p>
                              <p className="truncate text-[12px] font-medium text-slate-500 dark:text-white">{r.patientMobile ?? "—"}</p>
                            </div>
                          </div>
                        </td>

                        {/* Doctor */}
                        {!isDoctorUser && (
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar src={r.doctorAvatar || undefined} name={r.doctorName || "Doctor"} size="sm" className="bg-slate-100 text-slate-700 dark:bg-[#172033] dark:text-white" />
                              <div className="min-w-0">
                                <p className="truncate text-[14px] font-bold text-slate-950 dark:text-white">{doctorDisplayName(r.doctorName)}</p>
                                <p className="truncate text-[12px] font-medium text-slate-500 dark:text-white">{r.doctorSpeciality ?? "Consultation"}</p>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Service */}
                        <td className="px-5 py-4">
                          <span className="block max-w-[220px] truncate text-[14px] font-semibold text-slate-900 dark:text-white">{r.serviceName}</span>
                        </td>

                        {/* Mode */}
                        <td className="px-5 py-4">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-slate-900 dark:text-white">{r.mode ?? "—"}</p>
                            {r.refundNotes && (
                              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400" title={r.refundNotes}>({r.refundNotes})</p>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4">
                          <p className="text-[14px] font-bold text-slate-950 dark:text-white">
                            {r.priceNumber != null ? moneyFmt(r.priceNumber) : "—"}
                          </p>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4">
                          <p className="text-[14px] font-semibold text-slate-950 dark:text-white">{r.dateLabel}</p>
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4">
                          <StatusChip status={entryTypeStatus(r.entryType)} text={r.entryType ? r.entryType[0].toUpperCase() + r.entryType.slice(1) : "—"} />
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleViewDetails(r)}
                              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
                              title="View transaction details"
                              aria-label="View transaction details"
                            >
                              <FiEye size={15} />
                            </button>
                            {r.originalAppointmentId && (
                              <button
                                type="button"
                                onClick={() => handleViewAppointment(r)}
                                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
                                title="View appointment"
                                aria-label="View appointment"
                              >
                                <FiCalendar size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <BottomControls
              show={!showSkeleton}
              page={page}
              setPage={setPage}
              totalPages={totalPages}
              totalRecords={activeTotal}
              rowsPerPage={rowsPerPage}
              setRowsPerPage={setRowsPerPage}
            />
          </>
        </div>
      </div>

      {/* Transaction Detail Drawer */}
      <TransactionDetailDrawer
        txn={selectedTxn}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onCopy={handleCopy}
        onViewAppointment={handleViewAppointment}
        moneyFmt={moneyFmt}
      />
    </div>
  );
};

export default SubcribedPatients;
