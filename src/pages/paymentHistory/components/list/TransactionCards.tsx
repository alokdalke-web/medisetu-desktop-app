import { Avatar } from "@heroui/react";
import React from "react";
import { FiCalendar, FiEye } from "react-icons/fi";
import StatusChip from "../../../../components/shared/StatusChip";
import type { TransactionCardsProps } from "../../../../types/paymentHistory";
import {
  doctorDisplayName,
  entryTypeLabel,
  entryTypeStatus,
  isDebitEntry,
  moneyFmt,
  paymentStatusMeta,
} from "../../helpers/paymentHistoryFormatters";
import SkeletonBlock from "./SkeletonBlock";

const TransactionCards: React.FC<TransactionCardsProps> = ({
  rows,
  showSkeleton,
  isError,
  errorText,
  isDoctorUser,
  onViewDetails,
  onViewAppointment,
}) => (
  <div className="space-y-3 p-3 md:hidden">
    {showSkeleton && Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SkeletonBlock className="h-10 w-10 rounded-full" />
            <div className="min-w-0">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="mt-2 h-3 w-24" />
            </div>
          </div>
          <SkeletonBlock className="h-6 w-16 rounded-full" />
        </div>
        <SkeletonBlock className="mt-3 h-12 w-full rounded-xl" />
        <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
      </div>
    ))}

    {!showSkeleton && isError && (
      <div className="py-10 text-center text-[13px] text-red-600">{errorText}</div>
    )}

    {!showSkeleton && !isError && rows.length === 0 && (
      <div className="py-10 text-center text-[13px] text-text-subtle">
        No payment history found for the selected criteria.
      </div>
    )}

    {!showSkeleton && !isError && rows.length > 0 && rows.map((r, idx) => {
      const cardKey = `${r.rawId || r.patientName}-${idx}`;
      return (
        <div
          key={cardKey}
          className="rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none"
        >
          <div className="p-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={r.patientAvatar || undefined} size="sm" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold leading-5 text-text">{r.patientName}</p>
                  <p className="truncate text-[12px] font-medium leading-4 text-text-muted">{r.patientMobile ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusChip status={entryTypeStatus(r.entryType)} text={entryTypeLabel(r.entryType)} />
                <button
                  type="button"
                  onClick={() => onViewDetails(r)}
                  className="grid h-10 w-10 lg:h-8 lg:w-8 place-items-center rounded-full text-text-muted hover:bg-surface-muted"
                  aria-label="View transaction details"
                >
                  <FiEye size={15} />
                </button>
              </div>
            </div>

            {/* Doctor strip (non-doctor users) */}
            {!isDoctorUser && (
              <div className="mt-3 rounded-xl bg-surface-muted px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar src={r.doctorAvatar || undefined} size="sm" className="bg-surface-muted" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-5 text-text">{doctorDisplayName(r.doctorName)}</p>
                    <p className="truncate text-[12px] font-medium leading-4 text-primary">{r.doctorSpeciality ?? "Consultation"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Info grid */}
            <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-text-muted">Mode</p>
                <p className="truncate text-[13px] font-semibold text-text">{r.mode ?? "—"}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-text-muted">Status</p>
                {(() => {
                  const meta = paymentStatusMeta(r.paymentStatus, r.entryType);
                  return <StatusChip status={meta.chip} text={meta.label} classNames={{ base: "!px-2 !py-0.5" }} />;
                })()}
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[11px] font-medium text-text-muted">Amount</p>
                <p className={`truncate text-[13px] font-semibold ${isDebitEntry(r.entryType) ? "text-red-600 dark:text-red-400" : "text-text"}`}>
                  {r.priceNumber != null ? `${isDebitEntry(r.entryType) ? "− " : ""}${moneyFmt(r.priceNumber)}` : "—"}
                </p>
              </div>
            </div>

            {/* Bottom row */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-start gap-2">
                <span className="mt-[5px] h-2.5 w-2.5 rounded-full bg-emerald-600" />
                <div>
                  <p className="text-[12px] font-medium text-text-muted">{r.serviceName}</p>
                  <p className="text-[12px] font-medium text-text-muted">{r.dateLabel}</p>
                </div>
              </div>
              {r.originalAppointmentId && (
                <button
                  type="button"
                  onClick={() => onViewAppointment(r)}
                  className="flex h-7 items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2 text-[11px] font-medium text-primary transition hover:bg-primary/10"
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
);

export default TransactionCards;
