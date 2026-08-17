
import {
  Spinner,
  Avatar,
  Pagination,
  Tabs,
  Tab,
} from "@heroui/react";
import React, { useState, useEffect } from "react";
import {
  FiAlertCircle,
  FiFileText,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";

import SearchField from "../../components/shared/SearchField";
import {
  useGetInvoicesQuery,
  type InvoiceListRow,
  type InvoiceSummary,
} from "../../redux/api/pharmacyApi";
import { useGetUserQuery } from "../../redux/api/authApi";
import type { RootState } from "../../redux/store";
import DashboardDateRangePicker from "../dashboard/DashboardDateRangePicker";
import AppButton from "../../components/shared/AppButton";

/* ---------- Helpers ---------- */

const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

const formatCompact = (n: number) => {
  try {
    return new Intl.NumberFormat("en-IN").format(n);
  } catch {
    return String(n);
  }
};

const formatINR = (n: number) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${formatCompact(n)}`;
  }
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return String(iso);
  }
};

const pickUser = (resp: any) =>
  resp?.data?.user ?? resp?.data ?? resp?.user ?? resp ?? null;

const getInvoiceNo = (row: any) => {
  const v =
    row?.invoiceNo ??
    row?.invoiceNumber ??
    row?.number ??
    row?.billing?.invoiceNo ??
    row?.billing?.invoiceNumber;

  if (v) return String(v);
  const id = String(row?.id ?? "");
  return id ? `#${id.slice(0, 8).toUpperCase()}` : "—";
};

const getPaymentModeCls = (mode: string) => {
  const m = String(mode ?? "CASH").toUpperCase();
  if (m === "UPI") return "bg-indigo-50 text-indigo-700 border-indigo-100";
  if (m === "CASH") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (m === "CARD") return "bg-purple-50 text-purple-700 border-purple-100";
  return "bg-slate-50 text-slate-700 border-slate-100";
};

const getTotal = (row: any) => {
  const v =
    row?.total ??
    row?.totalAmount ??
    row?.billing?.totalPrice ??
    row?.billing?.total ??
    row?.billing?.totalAmount ??
    0;

  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
};

/* ---------- Skeleton UI ---------- */

const LocalSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={["animate-pulse rounded-xl bg-slate-200/70", className].join(" ")} />
);

const StatCardsSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100" />
          <div className="flex-1">
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="mt-2 h-5 w-28 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const TableSkeleton = ({ rows = 8 }: { rows?: number }) => (
  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="min-w-[1180px] w-full table-fixed text-[13px] sm:text-[14px] border-collapse">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr className="text-left text-slate-500">
            <th className="w-[140px] px-6 py-4 font-semibold">Invoice</th>
            <th className="w-[280px] px-6 py-4 font-semibold">Customer</th>
            <th className="w-[200px] px-6 py-4 font-semibold">Bill Details</th>
            <th className="w-[230px] px-6 py-4 font-semibold">Payment</th>
            <th className="w-[150px] px-6 py-4 font-semibold">Amount</th>
            <th className="px-6 py-4 font-semibold">Created At</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="px-6 py-5"><LocalSkeleton className="h-5 w-20 rounded-lg" /></td>
              <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                  <LocalSkeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-2">
                    <LocalSkeleton className="h-4 w-32 rounded" />
                    <LocalSkeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
              </td>
              <td className="px-6 py-5"><LocalSkeleton className="h-4 w-16 rounded" /></td>
              <td className="px-6 py-5"><LocalSkeleton className="h-7 w-20 rounded-full" /></td>
              <td className="px-6 py-5"><LocalSkeleton className="h-5 w-24 rounded" /></td>
              <td className="px-6 py-5"><LocalSkeleton className="h-4 w-32 rounded" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* ---------- Stat Cards (ONLY 2 CARDS) ---------- */



const InvoiceStatCards: React.FC<{
  summary?: InvoiceSummary;
}> = ({ summary }) => {
  const stats = [
    {
      label: "Total Invoices",
      value: formatCompact(summary?.totalInvoices ?? 0),
      icon: <FiFileText />,
      accent: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Total Amount",
      value: formatINR(summary?.pendingPayments ?? 0),
      icon: <FiAlertCircle />,
      accent: "text-emerald-700 bg-emerald-50",
    },
    {
      label: "Paid Invoices",
      value: formatCompact(summary?.paidInvoices ?? 0),
      icon: <FiFileText />,
      accent: "text-blue-600 bg-blue-50",
    },
    {
      label: "Cancelled Invoices",
      value: formatCompact(summary?.cancelledInvoices ?? 0),
      icon: <FiAlertCircle />,
      accent: "text-rose-600 bg-rose-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {stats.map((s, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div
              className={[
                "h-10 w-10 rounded-xl flex items-center justify-center text-lg shadow-sm",
                s.accent,
              ].join(" ")}
            >
              {s.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-slate-500 uppercase tracking-wider">
                {s.label}
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900 leading-none">
                {s.value}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------- Pagination helper ---------- */
const PharmacyInvoice: React.FC = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const authUser = useSelector((s: RootState) => s.auth.user);
  const { data: userData } = useGetUserQuery();
  const user = pickUser(userData) ?? pickUser(authUser);
  const pharmacyId = String(user?.pharmacyDetails?.pharmacyId ?? "");

  const [displayStartDate, setDisplayStartDate] = useState<string>(() =>
    getTodayIST(),
  );
  const [displayEndDate, setDisplayEndDate] = useState<string>(() =>
    getTodayIST(),
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const [statusTab, setStatusTab] = useState<string>("all");

  const { data, isLoading, isFetching, isError, refetch } = useGetInvoicesQuery(
    {
      pharmacyId,
      page,
      pageSize,
      search,
      startDate: displayStartDate || undefined,
      endDate: displayEndDate || undefined,
      status: statusTab === "all" ? undefined : statusTab.toUpperCase(),
    },
    { skip: !pharmacyId },
  );

  const shiftDateRangeByOneDay = (direction: "prev" | "next") => {
    if (!displayStartDate || !displayEndDate) return;
    const shift = direction === "prev" ? -1 : 1;
    const parseYmdLocal = (ymdStr: string) => {
      const [y, m, d] = (ymdStr || "").split("-").map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    };
    const toYmdLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };

    const baseDate = parseYmdLocal(displayStartDate);
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + shift);
    const nextYmd = toYmdLocal(nextDate);

    setDisplayStartDate(nextYmd);
    setDisplayEndDate(nextYmd);
    setPage(1);
  };

  const raw: any = data as any;
  const dataNode: any = raw?.data ?? raw;

  const invoices: InvoiceListRow[] = (dataNode?.invoices ?? []) as InvoiceListRow[];

  const totalPages = dataNode?.totalPages ?? raw?.pagination?.totalPages ?? 1;
  const totalRecords =
    dataNode?.totalCount ?? raw?.pagination?.totalRecords ?? invoices.length;
  const currentPage = dataNode?.currentPage ?? raw?.pagination?.currentPage ?? page;
  const size = dataNode?.pageSize ?? raw?.pagination?.pageSize ?? pageSize;

  const startIdx = totalRecords === 0 ? 0 : (currentPage - 1) * size + 1;
  const endIdx = Math.min(currentPage * size, totalRecords);

  // ✅ UX states
  const showInitialLoading = isLoading && invoices.length === 0;
  const showRefreshing = isFetching && invoices.length > 0;

  const summary: InvoiceSummary = raw?.summary ?? {
    totalInvoices: totalRecords,
    pendingPayments: invoices.reduce((acc, inv) => acc + inv.total, 0),
    paidInvoices: 0,
    cancelledInvoices: 0,
  };



  return (
    <div className="w-full h-full px-0 py-0 text-[14px] leading-snug antialiased">
      {/* Header Section */}
      <div className="mb-5 border-b border-slate-100 pb-3 flex items-center justify-between">
        <h2 className="text-[20px] md:text-[24px] font-bold leading-tight tracking-tight text-slate-900">
          Pharmacy Invoices
        </h2>

        <AppButton
          text="Create Invoice"
          buttonVariant="primary"
          onPress={() => navigate("/pharmacy/invoice/new")}
          startContent={<FiPlus className="h-5 w-5" />}
          className="h-10 px-6 font-bold shadow-sm"
        />
      </div>

      {/* Stats Summary Grid */}
      {showInitialLoading ? (
        <StatCardsSkeleton />
      ) : (
        <InvoiceStatCards summary={summary} />
      )}

      {/* Tabs & Filters Bar */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* Tabs for status */}
        <div className="overflow-x-auto no-scrollbar">
          <Tabs
            selectedKey={statusTab}
            onSelectionChange={(k) => {
              setStatusTab(String(k));
              setPage(1);
            }}
            classNames={{
              tabList: "bg-transparent p-0 flex-nowrap gap-2",
              tab:
                "h-9 rounded-full px-5 text-[13px] font-semibold " +
                "border border-slate-200 whitespace-nowrap bg-white " +
                "data-[hover=true]:bg-white data-[selected=true]:bg-primary " +
                "data-[selected=true]:border-primary data-[selected=true]:shadow-sm",
              tabContent: "text-slate-600 group-data-[selected=true]:!text-white",
              cursor: "hidden",
            }}
          >
            <Tab key="all" title={`All Invoices (${formatCompact(totalRecords)})`} />
            <Tab key="paid" title="Paid" />
            <Tab key="pending" title="Pending" />
          </Tabs>
        </div>

        {/* Filters section */}
        <div className="lg:ml-auto flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="w-full sm:w-[320px]">
            <SearchField
              type="text"
              value={searchInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchInput(e.target.value)
              }
              onClear={() => setSearchInput("")}
              placeholder="Search customer or invoice..."
              className="w-full"
            />
          </div>

          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              disabled={isFetching}
              onClick={() => shiftDateRangeByOneDay("prev")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <FiChevronLeft size={16} />
            </button>

            <div className="[&_[data-slot='input-wrapper']]:!h-10 [&_[data-slot='input-wrapper']]:!rounded-xl">
              <DashboardDateRangePicker
                startYmd={displayStartDate}
                endYmd={displayEndDate}
                isFetching={isFetching}
                onApply={(s, e) => {
                  setDisplayStartDate(s);
                  setDisplayEndDate(e);
                  setPage(1);
                }}
              />
            </div>

            <button
              type="button"
              disabled={isFetching}
              onClick={() => shiftDateRangeByOneDay("next")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-0">
          {isError ? (
            <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700 flex flex-col items-center gap-3 text-center">
              <FiAlertCircle size={24} className="text-rose-400" />
              <div>
                <p className="font-bold">Failed to load invoices</p>
                <p className="text-rose-600/70 mt-1">
                  There was an error fetching the data from the server.
                </p>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-all active:scale-95 shadow-sm"
              >
                Try Again
              </button>
            </div>
          ) : showInitialLoading ? (
            <TableSkeleton rows={pageSize} />
          ) : (
            <>
              <div
                className="relative overflow-hidden"
                aria-busy={showRefreshing}
              >
                {showRefreshing && (
                  <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex items-center justify-center transition-all">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-xl">
                      <Spinner size="sm" />
                      Refreshing data…
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto no-scrollbar">
                  <table className="min-w-[1180px] w-full table-fixed text-[13px] sm:text-[14px] border-collapse text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-slate-500">
                        <th className="w-[140px] px-6 py-4 font-semibold">
                          Invoice
                        </th>
                        <th className="w-[280px] px-6 py-4 font-semibold">
                          Customer
                        </th>
                        <th className="w-[200px] px-6 py-4 font-semibold">
                          Bill Details
                        </th>
                        <th className="w-[230px] px-6 py-4 font-semibold">
                          Payment
                        </th>
                        <th className="w-[150px] px-6 py-4 font-semibold">
                          Amount
                        </th>
                        <th className="px-6 py-4 font-semibold">
                          Created At
                        </th>
                      </tr>
                    </thead>

                    <tbody
                      className={[
                        "divide-y divide-slate-50",
                        showRefreshing ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      {invoices.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-20 text-center text-slate-400 italic font-medium"
                          >
                            No invoices found.
                          </td>
                        </tr>
                      ) : (
                        invoices.map((row: any) => (
                          <tr
                            key={row.id}
                            onClick={() =>
                              navigate(`/pharmacy/invoice/${row.id}`)
                            }
                            className="group hover:bg-slate-50/80 transition-all cursor-pointer border-transparent"
                          >
                            <td className="px-6 py-5">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[12px] font-bold shadow-sm border border-slate-200/50">
                                {getInvoiceNo(row)}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${row.customerName}`}
                                  name={row.customerName}
                                  size="sm"
                                  className="bg-slate-100 text-[10px] font-bold shadow-sm"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate">
                                    {String(row.customerName ?? "—")}
                                  </span>
                                  <span className="text-[12px] text-slate-500 font-medium">
                                    {row.mobile ?? "No Mobile"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-slate-700">
                                  {row.itemCount ?? 0} Items
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Tax: {formatINR(row.billing?.tax ?? 0)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span
                                className={[
                                  "inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border shadow-sm uppercase tracking-wider",
                                  getPaymentModeCls(row.billing?.paymentMethod),
                                ].join(" ")}
                              >
                                {row.billing?.paymentMethod ?? "CASH"}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-[15px] font-black text-slate-900">
                                  {formatINR(getTotal(row))}
                                </span>
                                {row.billing?.discount > 0 && (
                                  <span className="text-[11px] text-rose-500 font-bold">
                                    -{formatINR(row.billing.discount)} off
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5 text-slate-500 font-medium whitespace-nowrap text-[13px]">
                              {formatDateTime(row.createdAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Section */}
              {!showInitialLoading && totalRecords > 0 && (
                <div className="p-5 bg-white border-t border-slate-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[13px] text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-900">{startIdx}</span>
                    {" to "}
                    <span className="font-bold text-slate-900">{endIdx}</span>
                    {" of "}
                    <span className="font-bold text-slate-900">{formatCompact(totalRecords)}</span>
                    {" results"}
                  </p>

                  <div className="flex justify-center sm:justify-end">
                    <Pagination
                      isCompact
                      showControls
                      total={totalPages}
                      page={currentPage}
                      onChange={setPage}
                      radius="full"
                      classNames={{
                        wrapper: "gap-2 flex-wrap justify-center sm:justify-end",
                        item:
                          "min-w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary transition-all font-bold text-xs",
                        prev:
                          "min-w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 active:scale-90 transition-all",
                        next:
                          "min-w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 active:scale-90 transition-all",
                        cursor: "hidden",
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyInvoice;
