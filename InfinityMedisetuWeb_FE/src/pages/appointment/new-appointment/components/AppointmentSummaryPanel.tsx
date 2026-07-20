import React from "react";
import { FiArrowRight, FiCalendar, FiLock } from "react-icons/fi";

type AppointmentSummaryPanelProps = {
  showPatientSummary: boolean;
  patientName: string;
  patientAgeGender: string;
  patientPhone: string;
  patientAddress: string;
  patientBadgeText: string;
  doctorName: string;
  doctorRole: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  paymentMode: string;
  amountText: string;
  isCreating: boolean;
  isSubmitting: boolean;
  saveButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onSubmit: React.MouseEventHandler<HTMLButtonElement>;
  getInitials: (name: string) => string;
};

/* ── Reusable row: label on top, value below ── */
const SummaryRow: React.FC<{
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}> = ({ label, value, muted }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {label}
    </p>
    <div
      className={[
        "mt-0.5 text-[13px] font-semibold leading-snug",
        muted
          ? "text-slate-400 dark:text-slate-500"
          : "text-slate-900 dark:text-white",
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
      className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726] dark:shadow-none"
      style={{ maxHeight: "calc(100vh - 7rem)", contain: "layout style" }}
    >
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 px-4 py-3.5 dark:border-[#273244]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-primary dark:bg-[#1a3a35] dark:text-[#9be7dc]">
          <FiCalendar className="h-4 w-4" />
        </div>
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
          Appointment Summary
        </h2>
      </div>

      {/* ── Scrollable body ── */}
      <div className="appointment-scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-0 divide-y divide-slate-100 dark:divide-[#273244]">

          {/* Patient block */}
          {showPatientSummary ? (
            <div className="px-4 py-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Patient
              </p>

              {/* Avatar + name row */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[13px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {getInitials(patientName || "P")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">
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
            <div className="px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Patient
              </p>
              <p className="mt-2 text-[13px] text-slate-400 dark:text-slate-500">
                No patient selected
              </p>
            </div>
          )}

          {/* Doctor & Service block */}
          <div className="px-4 py-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Doctor &amp; Service
            </p>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[13px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {getInitials(doctorName || "D")}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">
                  {doctorName || <span className="text-slate-400 dark:text-slate-500">Select doctor</span>}
                </p>
                <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                  {serviceName || doctorRole || <span className="text-slate-400 dark:text-slate-500">Select service</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Date & Time block — large and prominent */}
          <div className="px-4 py-4 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Date &amp; Time
            </p>

            {dateLabel ? (
              <>
                <p className="text-[15px] font-bold text-slate-900 dark:text-white leading-snug">
                  {dateLabel}
                </p>
                <p className={[
                  "text-[14px] font-semibold leading-snug",
                  timeLabel
                    ? "text-primary dark:text-[#46beae]"
                    : "text-slate-400 dark:text-slate-500",
                ].join(" ")}>
                  {timeLabel || "Select a slot"}
                </p>
              </>
            ) : (
              <p className="text-[13px] text-slate-400 dark:text-slate-500">
                Select date &amp; slot
              </p>
            )}
          </div>

          {/* Payment block */}
          <div className="px-4 py-4">
            <SummaryRow
              label="Payment"
              value={paymentMode || "Select mode"}
              muted={!paymentMode}
            />
          </div>
        </div>
      </div>

      {/* ── Sticky footer ── */}
      <div className="shrink-0 space-y-3 border-t border-slate-100 px-4 py-4 dark:border-[#273244]">
        {/* Amount row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
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

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <FiLock className="h-3 w-3" />
          Secure &amp; encrypted
        </div>
      </div>
    </aside>
  );
};

export default AppointmentSummaryPanel;
