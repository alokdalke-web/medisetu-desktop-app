import { Avatar } from "@heroui/react";
import React, { useEffect, useRef } from "react";
import { FiCalendar, FiCopy, FiX } from "react-icons/fi";
import { LuArrowDownUp, LuBanknote, LuReceipt } from "react-icons/lu";
import StatusChip from "../../../../components/shared/StatusChip";
import type { TransactionDetailDrawerProps } from "../../../../types/paymentHistory";
import {
  doctorDisplayName,
  entryTypeLabel,
  entryTypeStatus,
  isDebitEntry,
  paymentStatusMeta,
} from "../../helpers/paymentHistoryFormatters";

const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({
  txn,
  isOpen,
  onClose,
  onCopy,
  onViewAppointment,
  moneyFmt,
}) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape, trap focus, lock body scroll, and move focus into the drawer.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !txn) return null;

  const isMerged = !!txn.subServices && txn.subServices.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Transaction Details">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div ref={panelRef} className="relative flex h-full w-full max-w-md flex-col bg-surface shadow-2xl sm:rounded-l-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line p-5">
          <h3 className="text-[18px] font-bold text-text">Transaction Details</h3>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 lg:h-8 lg:w-8 place-items-center rounded-full text-text-subtle transition hover:bg-surface-muted hover:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Close panel"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] dark:[scrollbar-color:#475569_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
          <div className="flex flex-col gap-6">

            {/* TXN ID + type badge */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
              <StatusChip status={entryTypeStatus(txn.entryType)} text={entryTypeLabel(txn.entryType)} />
              {isMerged ? (
                <button
                  type="button"
                  onClick={() => onCopy(`APT-${txn.rawId}`)}
                  aria-label="Copy appointment ID"
                  title="This row combines multiple transactions billed under one appointment — copies the shared appointment ID"
                  className="inline-flex items-center gap-1.5 font-medium text-text-muted transition hover:text-text"
                >
                  APT-{txn.rawId}
                  <FiCopy size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onCopy(`TXN-${txn.rawId}`)}
                  aria-label="Copy transaction ID"
                  title="Copy Transaction ID"
                  className="inline-flex items-center gap-1.5 font-medium text-text-muted transition hover:text-text"
                >
                  TXN-{txn.rawId}
                  <FiCopy size={14} />
                </button>
              )}
            </div>

            {isMerged && (
              <div className="-mt-3 rounded-lg bg-surface-muted px-3 py-2 text-[12px] text-text-muted">
                Combines {txn.subServices!.length} transactions billed under this appointment.
              </div>
            )}

            {/* Amount + status */}
            <div className="flex items-start justify-between">
              <div>
                <div className={`text-[30px] font-bold leading-none ${isDebitEntry(txn.entryType) ? "text-red-600 dark:text-red-400" : "text-text"}`}>
                  {txn.priceNumber != null ? `${isDebitEntry(txn.entryType) ? "− " : ""}${moneyFmt(txn.priceNumber)}` : "—"}
                </div>
                <div className="mt-1 text-sm text-text-muted">{txn.mode ?? "—"} · {entryTypeLabel(txn.entryType)}</div>
              </div>
              <div className="text-right">
                {(() => {
                  const meta = paymentStatusMeta(txn.paymentStatus, txn.entryType);
                  return <StatusChip status={meta.chip} text={meta.label} />;
                })()}
                <div className="mt-1 text-[12px] text-text-muted">{txn.dateLabel}</div>
              </div>
            </div>

            <hr className="border-line" />

            {/* Payment Information */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-2 border-b border-line">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-white dark:ring-1 dark:ring-[#46beae]/35">
                  <LuBanknote size={16} />
                </div>
                <h4 className="text-[13px] font-bold text-text">Payment Information</h4>
              </div>
              <div className="flex justify-between"><span className="text-text-muted">Amount</span><span className="font-semibold text-text">{txn.priceNumber != null ? moneyFmt(txn.priceNumber) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Payment Mode</span><span className="font-semibold text-text">{txn.mode ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Type</span><span className="font-semibold text-text">{entryTypeLabel(txn.entryType)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Status</span><span className="font-semibold text-text">{paymentStatusMeta(txn.paymentStatus, txn.entryType).label}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Date</span><span className="font-semibold text-text">{txn.dateLabel}</span></div>
              {txn.refundNotes && (
                <div className="flex justify-between gap-2"><span className="text-text-muted">Refund Notes</span><span className="font-semibold text-text text-right max-w-[55%]">{txn.refundNotes}</span></div>
              )}
            </div>

            <hr className="border-line" />

            {/* Patient Information */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-2 border-b border-line">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-white dark:ring-1 dark:ring-[#46beae]/35">
                  <LuReceipt size={16} />
                </div>
                <h4 className="text-[13px] font-bold text-text">Patient Information</h4>
              </div>
              <div className="flex items-center gap-3">
                <Avatar src={txn.patientAvatar || undefined} size="sm" className="bg-surface-muted text-text-muted" />
                <div>
                  <div className="font-semibold text-text">{txn.patientName}</div>
                  <div className="text-[12px] text-text-muted">{txn.patientMobile ?? "—"}</div>
                </div>
              </div>
              {isMerged ? (
                <div>
                  <span className="text-text-muted">Services</span>
                  <div className="mt-2 space-y-2 rounded-lg border border-line p-3">
                    {txn.subServices!.map((s, i) => (
                      <div key={`${s.transactionId}-${i}`} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-text">{s.serviceName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {s.mode && <span className="text-[11px] font-medium text-text-muted">{s.mode} ·</span>}
                            {s.transactionId && (
                              <button
                                type="button"
                                onClick={() => onCopy(`TXN-${s.transactionId}`)}
                                aria-label={`Copy transaction ID for ${s.serviceName}`}
                                className="inline-flex items-center gap-1 text-[11px] text-text-muted transition hover:text-text"
                              >
                                TXN-{s.transactionId}
                                <FiCopy size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 font-semibold text-text">{moneyFmt(s.priceNumber)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex justify-between"><span className="text-text-muted">Service</span><span className="font-semibold text-text text-right max-w-[55%] truncate">{txn.serviceName}</span></div>
              )}
            </div>

            <hr className="border-line" />

            {/* Doctor Information */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-2 border-b border-line">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-white dark:ring-1 dark:ring-[#46beae]/35">
                  <LuArrowDownUp size={16} />
                </div>
                <h4 className="text-[13px] font-bold text-text">Doctor Information</h4>
              </div>
              <div className="flex items-center gap-3">
                <Avatar src={txn.doctorAvatar || undefined} size="sm" className="bg-surface-muted text-text-muted" />
                <div>
                  <div className="font-semibold text-text">{doctorDisplayName(txn.doctorName)}</div>
                  <div className="text-[12px] text-text-muted">{txn.doctorSpeciality ?? "Consultation"}</div>
                </div>
              </div>
            </div>

            {/* View Appointment action */}
            {txn.originalAppointmentId && (
              <>
                <hr className="border-line" />
                <button
                  type="button"
                  onClick={() => onViewAppointment(txn)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-[13px] font-semibold text-primary transition hover:bg-primary/10"
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

export default TransactionDetailDrawer;
