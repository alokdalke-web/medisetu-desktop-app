import { Avatar } from "@heroui/react";
import React, { useState } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import StatusChip from "../../../../components/shared/StatusChip";
import type { TransactionTableProps } from "../../../../types/paymentHistory";
import { doctorDisplayName, isDebitEntry, moneyFmt, paymentStatusMeta } from "../../helpers/paymentHistoryFormatters";
import SkeletonBlock from "./SkeletonBlock";
import TypeIndicator from "./TypeIndicator";

const TransactionTable: React.FC<TransactionTableProps> = ({
  rows,
  showSkeleton,
  isError,
  errorText,
  isDoctorUser,
  onViewDetails,
}) => {
  const colSpan = isDoctorUser ? 7 : 8;
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="hidden overflow-x-auto pb-1 md:block [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
      <table className="w-full min-w-[1100px] text-left">
        <thead className="bg-surface-muted">
          <tr className="border-b border-line">
            <th className="w-10 px-2 py-4" aria-hidden="true" />
            <th className="w-[21%] px-5 py-4 text-[13px] font-bold text-text-muted">Patient</th>
            {!isDoctorUser && <th className="w-[21%] px-5 py-4 text-[13px] font-bold text-text-muted">Doctor</th>}
            <th className="w-[18%] px-5 py-4 text-[13px] font-bold text-text-muted">Service</th>
            <th className="w-[13%] px-5 py-4 text-[13px] font-bold text-text-muted">Mode</th>
            <th className="w-[10%] px-5 py-4 text-right text-[13px] font-bold text-text-muted">Amount</th>
            <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-text-muted">Date</th>
            <th className="w-[9%] px-5 py-4 text-[13px] font-bold text-text-muted">Type</th>
            <th className="w-[11%] px-5 py-4 text-[13px] font-bold text-text-muted">Status</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-line">
          {showSkeleton ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={colSpan + 1} className="px-5 py-5">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-10 w-10 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <SkeletonBlock className="h-4 w-44" />
                      <SkeletonBlock className="mt-2 h-3 w-64 max-w-[70%]" />
                    </div>
                  </div>
                </td>
              </tr>
            ))
          ) : isError ? (
            <tr>
              <td colSpan={colSpan + 1} className="h-[320px] text-center text-[13px] text-red-600">
                {errorText}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan + 1} className="h-[320px] text-center text-text-subtle">
                No payment history found for the selected criteria.
              </td>
            </tr>
          ) : (
            rows.map((r, idx) => {
              const rowKey = `${r.rawId || r.patientName}-${idx}`;
              const hasSubRows = !!r.subServices && r.subServices.length > 1;
              const isExpanded = hasSubRows && expandedKeys.has(rowKey);

              return (
                <React.Fragment key={rowKey}>
                  <tr
                    role="button"
                    tabIndex={0}
                    aria-label={`View transaction details for ${r.patientName}`}
                    className="cursor-pointer transition hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                    onClick={() => onViewDetails(r)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onViewDetails(r);
                      }
                    }}
                  >
                    {/* Expand toggle */}
                    <td className="px-2 py-4 text-center">
                      {hasSubRows && (
                        <button
                          type="button"
                          aria-label={isExpanded ? "Collapse services" : "Expand services"}
                          aria-expanded={isExpanded}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(rowKey);
                          }}
                          className="grid h-7 w-7 place-items-center rounded-full text-text-muted transition hover:bg-surface-muted hover:text-text"
                        >
                          {isExpanded ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
                        </button>
                      )}
                    </td>

                    {/* Patient */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={r.patientAvatar || undefined} name={r.patientName} size="sm" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-text">{r.patientName}</p>
                          <p className="truncate text-[12px] font-medium text-text-muted">{r.patientMobile ?? "—"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Doctor */}
                    {!isDoctorUser && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={r.doctorAvatar || undefined} name={r.doctorName || "Doctor"} size="sm" className="bg-surface-muted text-text" />
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-bold text-text">{doctorDisplayName(r.doctorName)}</p>
                            <p className="truncate text-[12px] font-medium text-text-muted">{r.doctorSpeciality ?? "Consultation"}</p>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Service */}
                    <td className="px-5 py-4">
                      <span className="block max-w-[220px] truncate text-[14px] font-semibold text-text">{r.serviceName}</span>
                    </td>

                    {/* Mode */}
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-text">{r.mode ?? "—"}</p>
                        {r.refundNotes && (
                          <p className="mt-0.5 truncate text-[11px] font-medium text-text-muted" title={r.refundNotes}>({r.refundNotes})</p>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4 text-right">
                      <p className={`text-[14px] font-bold tabular-nums ${isDebitEntry(r.entryType) ? "text-red-600 dark:text-red-400" : "text-text"}`}>
                        {r.priceNumber != null ? `${isDebitEntry(r.entryType) ? "− " : ""}${moneyFmt(r.priceNumber)}` : "—"}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4">
                      <p className="text-[14px] font-semibold text-text">{r.dateLabel}</p>
                    </td>

                    {/* Type */}
                    <td className="px-5 py-4">
                      <TypeIndicator entryType={r.entryType} />
                    </td>

                    {/* Payment status */}
                    <td className="px-5 py-4">
                      {(() => {
                        const meta = paymentStatusMeta(r.paymentStatus, r.entryType);
                        return <StatusChip status={meta.chip} text={meta.label} />;
                      })()}
                    </td>
                  </tr>

                  {isExpanded && r.subServices!.map((s, subIdx) => (
                    <tr key={`${rowKey}-sub-${subIdx}`} className="bg-surface-muted/50">
                      <td className="px-2 py-2" />
                      <td className="px-5 py-2" />
                      {!isDoctorUser && <td className="px-5 py-2" />}
                      <td className="px-5 py-2">
                        <span className="block max-w-[200px] truncate text-[13px] text-text-muted">{s.serviceName}</span>
                      </td>
                      <td className="px-5 py-2">
                        <span className="block max-w-[150px] truncate text-[13px] text-text-muted">{s.mode ?? "—"}</span>
                      </td>
                      <td className="px-5 py-2 text-right">
                        <p className={`text-[13px] tabular-nums ${isDebitEntry(r.entryType) ? "text-red-500/80 dark:text-red-400/80" : "text-text-muted"}`}>
                          {isDebitEntry(r.entryType) ? "− " : ""}{moneyFmt(s.priceNumber)}
                        </p>
                      </td>
                      <td className="px-5 py-2" />
                      <td className="px-5 py-2" />
                      <td className="px-5 py-2" />
                    </tr>
                  ))}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
