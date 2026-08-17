// Payment History — matches the Appointments/Patients module design language
import { addToast } from "@heroui/react";
import { skipToken } from "@reduxjs/toolkit/query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router";
import { useGetUserQuery } from "../../redux/api/authApi";

import type { RootState } from "../../redux/store";
import PageHeader from "../../components/common/PageHeader";

import { FiSettings } from "react-icons/fi";
import { LuArrowDownUp, LuBanknote, LuMinus, LuPlus, LuWallet } from "react-icons/lu";
import {
  useGetPaymentTransactionsQuery,
  type PaymentStatus,
  type PaymentTransaction,
} from "../../redux/api/subscriptionApi";
import { useGetDoctorListQuery } from "../../redux/api/usersApi";
import useDebounce from "../../hooks/useDebounce";
import BannerDisplay from "../../components/banners/BannerDisplay";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { paymentsTips } from "../../constants/featureTips";
import { getApiErrorText, isNetworkError } from "../../utils/getApiErrorText";

import PaymentStatCards from "./components/toolbar/PaymentStatCards";
import PaymentToolbar from "./components/toolbar/PaymentToolbar";
import TransactionCards from "./components/list/TransactionCards";
import TransactionTable from "./components/list/TransactionTable";
import BottomControls from "./components/list/BottomControls";
import TransactionDetailDrawer from "./components/list/TransactionDetailDrawer";
import {
  doctorDisplayName,
  mapFromAPI,
  monthStartYMD,
  moneyFmt,
  prettyModeLabel,
  toYMD,
} from "./helpers/paymentHistoryFormatters";
import type {
  FilterOption,
  PageSize,
  TabKey,
  TransactionRow,
} from "../../types/paymentHistory";

function getRtkErrorText(err: unknown) {
  return getApiErrorText(err, "Failed to load payment history.");
}

type PaymentTransactionsQueryArgs = Exclude<
  Parameters<typeof useGetPaymentTransactionsQuery>[0],
  typeof skipToken
>;

const PaymentHistory: React.FC = () => {
  const authUser = useSelector((s: RootState) => s.auth.user);
  const navigate = useNavigate();

  const { data: userData } = useGetUserQuery();
  const user = (userData as any)?.user ?? userData;
  const paymentVisible = Boolean((user as any)?.paymentVisible ?? true);

  const userTypeRaw = String(
    (authUser as any)?.userType ?? (authUser as any)?.role ?? "",
  ).trim().toLowerCase();
  const isDoctorUser = userTypeRaw === "doctor";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [tab, setTab] = useState<TabKey>("all");
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement | null>(null);
  // Mobile-only: collapse date-range/type/status/mode/doctor behind a "Filters" button.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [paymentModeFilter, setPaymentModeFilter] = useState<string | null>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string | null>(null);
  const [doctorFilter, setDoctorFilter] = useState<string | null>(null);

  // Doctor options (hidden for doctor-role users, who only see their own data)
  const { data: doctorList } = useGetDoctorListQuery(undefined, { skip: isDoctorUser });
  const doctorOptions: FilterOption[] = useMemo(
    () => (Array.isArray(doctorList) ? doctorList : []).map((d) => ({
      value: d.id,
      label: doctorDisplayName(d.name),
    })),
    [doctorList],
  );

  const statusOptions: FilterOption[] = useMemo(
    () => [
      { value: "Paid", label: "Paid" },
      { value: "Pending", label: "Pending (Pay Later)" },
      { value: "Already Paid", label: "Already Paid" },
      { value: "Refunded", label: "Refunded" },
    ],
    [],
  );

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<PageSize>(10);

  // Initialized directly (not via a mount effect) so the very first render
  // already has the real date range — avoids an initial unfiltered "all
  // time" fetch that gets immediately discarded once the effect used to run.
  const [startDate, setStartDate] = useState<string>(() => monthStartYMD(new Date()));
  const [endDate, setEndDate] = useState<string>(() => toYMD(new Date()));

  const [selectedTxn, setSelectedTxn] = useState<TransactionRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [tabCounts, setTabCounts] = useState<Record<TabKey, number>>({ all: 0, credit: 0, debit: 0 });

  useEffect(() => {
    setTabCounts({ all: 0, credit: 0, debit: 0 });
  }, [debouncedSearch, startDate, endDate]);

  useEffect(() => { setPage(1); }, [tab, rowsPerPage, search, startDate, endDate, paymentModeFilter, paymentStatusFilter, doctorFilter]);

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
    paymentMode: paymentModeFilter || undefined,
    paymentStatus: (paymentStatusFilter as PaymentStatus) || undefined,
    doctorId: doctorFilter || undefined,
  }), [page, apiPageSize, debouncedSearch, startDate, endDate, tab, paymentModeFilter, paymentStatusFilter, doctorFilter]);

  const { data, isLoading, isFetching, isError, error } =
    useGetPaymentTransactionsQuery(paymentVisible ? queryArgs : skipToken, {
      // Refetch on mount only if the cached data for these exact filters is
      // older than 30s, instead of unconditionally refetching every time this
      // page is navigated to (RTK Query already refetches on real arg changes).
      refetchOnMountOrArgChange: 30,
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

  // Multiple services added to the same appointment (e.g. a primary charge +
  // an add-on) each arrive as separate PaymentTransaction rows from the API.
  // Merge those belonging to the same appointment + entry type (Credit/Debit)
  // into a single row, keeping each service's own amount so the row can
  // expand into its component services instead of only showing a combined total.
  type GroupedTxn = PaymentTransaction & {
    _services: {
      name: string;
      price: number;
      transactionId: string;
      paymentMode: string | null;
      refundMode: string | null;
      entryType: string | null;
    }[];
  };
  const groupedList: GroupedTxn[] = useMemo(() => {
    const map = new Map<string, GroupedTxn>();

    for (const item of rawList) {
      const key = item.originalAppointmentId
        ? `${item.originalAppointmentId}::${item.entryType ?? ""}`
        : `txn::${item.transactionId ?? ""}::${item.patientName ?? ""}::${item.appointmentDate ?? ""}`;
      const priceVal = typeof item.price === "number" ? item.price : 0;
      const existing = map.get(key);
      const service = {
        name: item.serviceName ?? "Service",
        price: priceVal,
        transactionId: item.transactionId ?? "",
        paymentMode: item.paymentMode ?? null,
        refundMode: item.refundMode ?? null,
        entryType: item.entryType ?? null,
      };

      if (existing) {
        existing._services.push(service);
        existing.price = (existing.price ?? 0) + priceVal;
      } else {
        map.set(key, { ...item, price: priceVal, _services: [service] });
      }
    }

    return Array.from(map.values());
  }, [rawList]);

  const meta = useMemo(() => (
    data?.metadata ?? {
      totalRecords: rawList.length,
      totalPages: 1,
      currentPage: page,
      pageSize: apiPageSize,
    }
  ), [data, rawList.length, page, apiPageSize]);

  const rows = useMemo(
    () => groupedList.map(({ _services, ...item }) => mapFromAPI(item, _services)),
    [groupedList],
  );
  const activeTotal = rows.length;
  // Raw (pre-grouping) transaction count across the whole filtered result —
  // used for the "Total Transactions" stat, since each grouped row can
  // represent more than one billed service/entry.
  const rawTotal = Number(meta.totalRecords ?? rawList.length);
  const creditTransactions = Number(
    summaryRaw?.creditTransactions ??
    summaryRaw?.totalCreditTransactions ??
    0
  );
  const totalPages = Math.max(1, Number(meta.totalPages ?? 1));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
      pendingAmount: Number(summaryRaw?.totalPendingAmount ?? 0),
      netAmount: creditAmount - debitAmount,
      totalTransactions: rawTotal,
      creditTransactions,
      modes,
    };
  }, [rawTotal, summaryRaw, rawList]);

  // Payment-mode filter options.
  //
  // The backend matches modes case/whitespace-insensitively, so we can safely
  // always offer the canonical set the system can record — including "Online"
  // (how Razorpay payments are stored) — even when the currently loaded rows
  // don't happen to contain that mode. On top of that we union any *custom*
  // modes actually observed in the data, deduped by normalized key so a stored
  // "PayLater" doesn't show up as a second "Pay Later" entry.
  //
  // `calc.modes` only reflects the currently filtered result set, so we
  // accumulate every mode ever seen across loads rather than reading it live.
  const seenModesRef = useRef<Set<string>>(new Set());
  const [seenModesVersion, setSeenModesVersion] = useState(0);

  useEffect(() => {
    let changed = false;
    Object.keys(calc.modes)
      .filter((m) => m && m !== "Unknown")
      .forEach((m) => {
        if (!seenModesRef.current.has(m)) {
          seenModesRef.current.add(m);
          changed = true;
        }
      });
    if (changed) setSeenModesVersion((v) => v + 1);
  }, [calc.modes]);

  const modeOptions: FilterOption[] = useMemo(() => {
    const normKey = (m: string) => m.toLowerCase().replace(/\s+/g, "");
    // Canonical modes the platform can store (see backend payment insert).
    const CANONICAL_MODES = ["Cash", "Online", "UPI", "Card", "Insurance", "Pay Later"];

    const byKey = new Map<string, string>();
    // Canonical first so their preferred spelling wins for display…
    CANONICAL_MODES.forEach((m) => byKey.set(normKey(m), m));
    // …then add any custom modes seen in real data that aren't already covered.
    seenModesRef.current.forEach((m) => {
      const k = normKey(m);
      if (!byKey.has(k)) byKey.set(k, m);
    });

    return Array.from(byKey.values())
      .sort()
      .map((m) => ({ value: m, label: prettyModeLabel(m) }));
    // seenModesVersion drives recomputation as new modes are discovered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenModesVersion]);

  const handleViewDetails = (txn: TransactionRow) => {
    setSelectedTxn(txn);
    setIsDetailsOpen(true);
  };

  const handleViewAppointment = (txn: TransactionRow) => {
    if (txn.originalAppointmentId) {
      navigate(`/appointment/${txn.originalAppointmentId}`);
    } else {
      addToast({ title: "Appointment ID not found", description: "This transaction does not have an associated appointment.", color: "danger" });
    }
  };

  const handleCopy = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts where the Clipboard API is unavailable.
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      addToast({ title: "Copied to clipboard", description: text, color: "success" });
    } catch {
      addToast({
        title: "Couldn't copy",
        description: "Please copy the transaction ID manually.",
        color: "danger",
      });
    }
  };

  const showSkeleton = isLoading && !data;
  const isRefreshing = isFetching && !showSkeleton;

  const shiftDateByOneDay = (direction: "prev" | "next") => {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    const shift = direction === "prev" ? -1 : 1;
    start.setDate(start.getDate() + shift);
    end.setDate(end.getDate() + shift);
    setStartDate(toYMD(start));
    setEndDate(toYMD(end));
  };

  if (!paymentVisible) {
    return (
      <div className="w-full min-w-0 px-0 py-0">
        <PageHeader title="Payments History" className="mb-5" />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-[13px] text-yellow-800">
          Payment visibility is currently turned off. You can change the setting from your{" "}
          <Link to="/profile/security" className="inline-flex items-center gap-1 font-semibold text-primary">
            <FiSettings size={13} /> profile settings
          </Link>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Credit",
      value: moneyFmt(calc.creditAmount),
      detail: "Payments received",
      icon: <LuWallet size={20} className="rotate-180" />,
      iconClassName: "bg-emerald-50 text-emerald-600 dark:bg-[#16352f] dark:text-[#9be7dc]",
      detailClassName: "text-emerald-600 dark:text-[#9be7dc]",
    },
    {
      label: "Total Debit",
      value: moneyFmt(calc.debitAmount),
      detail: "Refunds processed",
      icon: <LuMinus size={20} />,
      iconClassName: "bg-red-50 text-red-500 dark:bg-[#2d1619] dark:text-red-400",
      detailClassName: "text-red-500 dark:text-red-400",
    },
    {
      label: "Amount Received",
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
      detailClassName: "text-text-muted",
    },
    {
      label: "Credit Transactions",
      value: String(calc.creditTransactions),
      detail: "In selected period",
      icon: <LuPlus size={20} />,
      iconClassName: "bg-purple-50 text-purple-600 dark:bg-[#1f1735] dark:text-purple-400",
      detailClassName: "text-text-muted",
    },
  ];

  const errorText = getRtkErrorText(error);

  return (
    <div className="w-full min-w-0 px-0 py-0">
      <BannerDisplay placement="BILLING_PAGE" className="mb-4" />

      <PageHeader
        title="Payments History"
        description="View and manage all payment transactions"
        className="mb-5"
        titleExtra={
          <FeatureInfoTip
            title="Payment Tips"
            tips={paymentsTips}
            guideSection="payments-guide"
            linkLabel="Read payments guide"
          />
        }
      />

      <PaymentStatCards stats={statCards} isLoading={isLoading} />

      <PaymentToolbar
        search={search}
        setSearch={setSearch}
        mobileFiltersOpen={mobileFiltersOpen}
        setMobileFiltersOpen={setMobileFiltersOpen}
        isLoading={isLoading}
        startDate={startDate}
        endDate={endDate}
        onApplyRange={(s, e) => { setStartDate(s); setEndDate(e); }}
        onShiftDate={shiftDateByOneDay}
        tab={tab}
        setTab={setTab}
        isTypeOpen={isTypeOpen}
        setIsTypeOpen={setIsTypeOpen}
        typeDropdownRef={typeDropdownRef}
        counts={counts}
        statusOptions={statusOptions}
        paymentStatusFilter={paymentStatusFilter}
        setPaymentStatusFilter={setPaymentStatusFilter}
        modeOptions={modeOptions}
        paymentModeFilter={paymentModeFilter}
        setPaymentModeFilter={setPaymentModeFilter}
        isDoctorUser={isDoctorUser}
        doctorOptions={doctorOptions}
        doctorFilter={doctorFilter}
        setDoctorFilter={setDoctorFilter}
      />

      {/* Table / List */}
      <div className="mt-4">
        <div className={["overflow-visible rounded-lg border border-line bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:shadow-none relative", isRefreshing ? "opacity-60 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200"].join(" ")}>

          {/* Refreshing indicator */}
          {isRefreshing && (
            <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden rounded-t-lg bg-primary/10">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
          )}

          <TransactionCards
            rows={rows}
            showSkeleton={showSkeleton}
            isError={isError}
            errorText={errorText}
            isDoctorUser={isDoctorUser}
            onViewDetails={handleViewDetails}
            onViewAppointment={handleViewAppointment}
          />

          <TransactionTable
            rows={rows}
            showSkeleton={showSkeleton}
            isError={isError}
            errorText={errorText}
            isDoctorUser={isDoctorUser}
            onViewDetails={handleViewDetails}
          />

          <BottomControls
            show={!showSkeleton}
            page={page}
            setPage={setPage}
            totalPages={totalPages}
            totalRecords={activeTotal}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
          />
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

export default PaymentHistory;
