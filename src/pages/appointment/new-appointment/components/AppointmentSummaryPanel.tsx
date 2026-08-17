import React from "react";
import { FiArrowRight, FiCalendar, FiLock } from "react-icons/fi";

import type { AppointmentSummaryPanelProps } from "../../../../types/appointment";

/* ── Reusable row: label on top, value below ── */
const SummaryRow: React.FC<{
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}> = ({ label, value, muted }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
      {label}
    </p>
    <div
      className={[
        "mt-0.5 text-[13px] font-semibold leading-snug",
        muted
          ? "text-text-muted"
          : "text-text",
      ].join(" ")}
    >
      {value}
    </div>
  </div>
);

/* ── Thin divider ── */
// const Divider = () => (
//   <div className="h-px bg-slate-100 dark:bg-[#273244]" />
// );

const AppointmentSummaryPanel: React.FC<AppointmentSummaryPanelProps> = ({
  showPatientSummary,
  patientName,
  patientAgeGender,
  patientPhone,
  patientAddress,
  patientBadgeText,
  doctorName,
  doctorRole,
  serviceName,
  dateLabel,
  timeLabel,
  paymentMode,
  amountText,
  isCreating,
  isSubmitting,
  saveButtonRef,
  onSubmit,
  getInitials,
}) => {
  const safeAmount = amountText || "—";
  const isLoading = isCreating || isSubmitting;

  return (
    <aside
      className="flex flex-col rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none"
      style={{ maxHeight: "calc(100vh - 7rem)", contain: "layout style" }}
    >
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-line px-3.5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-primary dark:bg-[#1a3a35] dark:text-[#9be7dc]">
          <FiCalendar className="h-4 w-4" />
        </div>
        <h2 className="text-[15px] font-bold text-text">
          Appointment Summary
        </h2>
      </div>

      {/* ── Scrollable body ── */}
      <div className="appointment-scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-0 divide-y divide-slate-100 dark:divide-[#273244]">

          {/* Patient block */}
          {showPatientSummary ? (
            <div className="px-3.5 py-3 space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Patient
              </p>

              {/* Avatar + name row */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[12px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {getInitials(patientName || "P")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-text">
                    {patientName}
                  </p>
                  {patientBadgeText && (
                    <span className="mt-0.5 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {patientBadgeText}
                    </span>
                  )}
                </div>
              </div>

              {/* Patient details grid */}
              <div className="grid grid-cols-2 gap-3">
                <SummaryRow
                  label="Age / Gender"
                  value={patientAgeGender || "—"}
                  muted={!patientAgeGender}
                />
                <SummaryRow
                  label="Phone"
                  value={patientPhone || "—"}
                  muted={!patientPhone}
                />
                {patientAddress && (
                  <div className="col-span-2">
                    <SummaryRow label="Address" value={patientAddress} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Patient
              </p>
              <p className="mt-2 text-[13px] text-text-muted">
                No patient selected
              </p>
            </div>
          )}

          {/* Doctor & Service block */}
          <div className="px-3.5 py-3 space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Doctor &amp; Service
            </p>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[12px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {getInitials(doctorName || "D")}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-text">
                  {doctorName || <span className="text-text-muted">Select doctor</span>}
                </p>
                <p className="truncate text-[12px] text-text-muted">
                  {serviceName || doctorRole || <span className="text-text-muted">Select service</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Date & Time block — large and prominent */}
          <div className="px-3.5 py-3 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Date &amp; Time
            </p>

            {dateLabel ? (
              <>
                <p className="text-[15px] font-bold text-text leading-snug">
                  {dateLabel}
                </p>
                <p className={[
                  "text-[14px] font-semibold leading-snug",
                  timeLabel
                    ? "text-primary dark:text-[#46beae]"
                    : "text-text-muted",
                ].join(" ")}>
                  {timeLabel || "Select a slot"}
                </p>
              </>
            ) : (
              <p className="text-[13px] text-text-muted">
                Select date &amp; slot
              </p>
            )}
          </div>

          {/* Payment block */}
          <div className="px-3.5 py-3">
            <SummaryRow
              label="Payment"
              value={paymentMode || "Select mode"}
              muted={!paymentMode}
            />
          </div>
        </div>
      </div>

      {/* ── Sticky footer ── */}
      <div className="shrink-0 space-y-2.5 border-t border-line px-3.5 py-3.5">
        {/* Amount row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-text-muted">
            Total Amount
          </span>
          <span className="text-[22px] font-bold leading-none text-primary">
            {safeAmount}
          </span>
        </div>

        {/* Submit button */}
        <button
          ref={saveButtonRef}
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[14px] font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Confirming…" : "Confirm Appointment"}
          {!isLoading && <FiArrowRight className="h-4 w-4" />}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
          <FiLock className="h-3 w-3" />
          Secure &amp; encrypted
        </div>
      </div>
    </aside>
  );
};

export default AppointmentSummaryPanel;
