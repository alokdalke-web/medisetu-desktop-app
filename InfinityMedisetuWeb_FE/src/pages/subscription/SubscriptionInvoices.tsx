import { useState } from "react";
import { Link } from "react-router";
import { addToast, Chip, Pagination, useDisclosure } from "@heroui/react";
import { format } from "date-fns";
import {
    FiChevronLeft,
    FiDownload,
    FiSearch,
    FiFileText,
    FiCalendar,
} from "react-icons/fi";
import { PiCrownSimpleFill } from "react-icons/pi";

import {
    useGetBillingHistoryQuery,
    type BillingHistoryItem,
} from "../../redux/api/subscriptionApi";
import {
    safeFormatMoney,
    type InvoiceData,
} from "../../utils/subscriptionHelpers";
import InvoicePreviewModal from "../../components/subscription/InvoicePreviewModal";

/* ────────── Helpers ────────── */

function formatDate(dateString: string | undefined): string {
    if (!dateString) return "—";
    try {
        return format(new Date(dateString), "dd MMM yyyy");
    } catch {
        return "—";
    }
}

function getActiveStatus(item: BillingHistoryItem): boolean {
    if (!item.expiresAt) return item.active;
    return item.active && new Date(item.expiresAt) > new Date();
}

function getInvoiceId(item: any): string {
    if (item.transactionId) return item.transactionId;
    if (!item.id) return "—";
    const suffix = item.id.split("-").pop()?.slice(0, 4) || "0001";
    const year = item.createdAt
        ? new Date(item.createdAt).getFullYear()
        : new Date().getFullYear();
    return `INV-${year}-${suffix.toUpperCase()}`;
}

/* ────────── Skeleton ────────── */
const Skel = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-[#172033] ${className}`} />
);

/* ────────── Constants ────────── */
const PAGE_SIZE = 10;

/* ────────── Component ────────── */

const SubscriptionInvoices = () => {
    const { data: billingData, isLoading, error } = useGetBillingHistoryQuery();
    const { isOpen, onOpen, onClose } = useDisclosure();

    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

    const billingHistory = billingData?.data || [];

    // Filter by search
    const filteredHistory = billingHistory.filter((item: any) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const invoiceId = getInvoiceId(item).toLowerCase();
        const planName = (item.planName || "").toLowerCase();
        const paymentMode = (item.paymentMode || "").toLowerCase();
        return invoiceId.includes(q) || planName.includes(q) || paymentMode.includes(q);
    });

    // Pagination
    const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE);
    const paginatedHistory = filteredHistory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleViewInvoice = (item: any) => {
        try {
            setSelectedInvoice({
                id: item.id,
                transactionId: item.transactionId,
                planName: item.planName,
                planDescription: item.planDescription || "Clinic Subscription Plan",
                price: item.price,
                startsAt: item.startsAt,
                expiresAt: item.expiresAt,
                createdAt: item.createdAt,
                paymentMode: item.paymentMode,
                paymentStatus: item.paymentStatus,
                clinicName: item.clinicName,
                clinicAddress: item.clinicAddress,
                clinicPhone: item.clinicPhone,
                clinicState: item.clinicState,
                clinicCity: item.clinicCity,
                zipCode: item.ZipCode,
                currency: item.currency || "INR",
                adminName: item.adminName,
                adminEmail: item.adminEmail,
                adminMobile: item.adminMobile,
            });
            onOpen();
        } catch {
            addToast({ title: "Error", description: "Failed to load invoice preview", color: "danger" });
        }
    };

    /* ────── Loading ────── */
    if (isLoading) {
        return (
            <div className="space-y-5 p-4 sm:p-6">
                <Skel className="h-5 w-40" />
                <Skel className="h-9 w-full max-w-sm" />
                <div className="rounded-lg border border-slate-200 dark:border-[#273244] overflow-hidden">
                    <Skel className="h-12 w-full rounded-none" />
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skel key={i} className="h-14 w-full rounded-none border-t border-slate-100 dark:border-[#273244]" />
                    ))}
                </div>
            </div>
        );
    }

    /* ────── Error ────── */
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px] p-4">
                <div className="text-center">
                    <FiFileText className="mx-auto text-4xl text-slate-300 dark:text-slate-600" />
                    <p className="mt-3 font-semibold text-slate-700 dark:text-white">Failed to load invoices</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please check your connection and try again.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-5">
            {/* ─── Header ─── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        to="/subscription"
                        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]"
                        aria-label="Back to Subscription"
                    >
                        <FiChevronLeft className="text-[15px]" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                            Invoices
                        </h1>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400">
                            {filteredHistory.length} invoice{filteredHistory.length !== 1 ? "s" : ""} total
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-xs w-full sm:w-auto">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        placeholder="Search invoices..."
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-primary"
                    />
                </div>
            </div>

            {/* ─── Table ─── */}
            {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg border border-slate-200 bg-white dark:border-[#273244] dark:bg-[#111726]">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 dark:bg-[#1e293b]">
                        <FiFileText className="text-xl text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="mt-4 text-[14px] font-semibold text-slate-700 dark:text-white">
                        {searchQuery ? "No matching invoices" : "No invoices yet"}
                    </p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                        {searchQuery
                            ? "Try a different search term."
                            : "Invoices will appear here after your first payment."}
                    </p>
                </div>
            ) : (
                <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
                    <div className="overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent]">
                        <table className="w-full min-w-[800px] text-left">
                            <thead className="bg-slate-50/80 dark:bg-[#111726]">
                                <tr className="border-b border-slate-100 dark:border-[#273244]">
                                    <th className="w-[28%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                                        Invoice
                                    </th>
                                    <th className="w-[18%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                                        Date
                                    </th>
                                    <th className="w-[18%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                                        Plan
                                    </th>
                                    <th className="w-[14%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                                        Amount
                                    </th>
                                    <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                                        Status
                                    </th>
                                    <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white text-right">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedHistory.map((item: any) => {
                                    const isActive = getActiveStatus(item);
                                    const invoiceId = getInvoiceId(item);
                                    const amount = safeFormatMoney(Number(item.price || 0), item.currency || "INR");

                                    return (
                                        <tr
                                            key={item.id}
                                            className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/60 dark:border-[#273244] dark:hover:bg-[#151e31] cursor-pointer"
                                            onClick={() => handleViewInvoice(item)}
                                        >
                                            {/* Invoice ID */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-[#172033]">
                                                        <FiFileText className="text-[13px] text-slate-500 dark:text-white" />
                                                    </div>
                                                    <span className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                                                        {invoiceId}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Date */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    <FiCalendar className="text-[11px] text-slate-400" />
                                                    <span className="text-[13px] text-slate-700 dark:text-white">
                                                        {formatDate(item.createdAt || item.startsAt)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Plan */}
                                            <td className="px-5 py-3.5">
                                                <Chip size="sm" variant="flat" className="h-6">
                                                    {item.planName === "Pro" ? (
                                                        <span className="flex items-center gap-1 text-[11px]">
                                                            <PiCrownSimpleFill className="text-yellow-500 text-[10px]" /> Pro
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px]">{item.planName || "—"}</span>
                                                    )}
                                                </Chip>
                                            </td>

                                            {/* Amount */}
                                            <td className="px-5 py-3.5">
                                                <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                                                    {amount}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-3.5">
                                                <span
                                                    className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold ${isActive
                                                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                                            : "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400"
                                                        }`}
                                                >
                                                    {isActive ? "Active" : "Expired"}
                                                </span>
                                            </td>

                                            {/* Action */}
                                            <td className="px-5 py-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleViewInvoice(item); }}
                                                    className="inline-grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-primary/5 hover:text-primary hover:border-primary/30 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]"
                                                    aria-label="Download invoice"
                                                >
                                                    <FiDownload className="text-[13px]" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#273244] px-5 py-3">
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">
                                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredHistory.length)} of {filteredHistory.length}
                            </p>
                            <Pagination
                                isCompact
                                showControls
                                total={totalPages}
                                page={page}
                                onChange={setPage}
                                radius="lg"
                                classNames={{
                                    wrapper: "gap-1.5",
                                    item:
                                        "min-w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-none " +
                                        "hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary " +
                                        "dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                                    prev:
                                        "min-w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                                    next:
                                        "min-w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                                    cursor: "hidden",
                                }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Invoice Preview Modal */}
            {selectedInvoice && (
                <InvoicePreviewModal
                    isOpen={isOpen}
                    onClose={() => { onClose(); setSelectedInvoice(null); }}
                    invoiceData={selectedInvoice}
                />
            )}
        </div>
    );
};

export default SubscriptionInvoices;
