import React from "react";
import { FaRupeeSign } from "react-icons/fa";
import { FiClock, FiCreditCard, FiSend } from "react-icons/fi";

import InfoModal from "../../components/shared/Modals/InfoModal";
import Icons from "../../constants/icons";

interface ConfirmAppointmentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  appointmentData: {
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
    service: string;
    paymentMode: string;
    amount?: string;
    isTokenAppointment: boolean;
  } | null;
  onConfirm: () => void;
  /** True when the service is chargeable, i.e. a payment mode must exist before
   *  the appointment can be created. Free / already-covered services pass false. */
  requiresPaymentMode?: boolean;
  paymentModeOptions?: { label: string; value: string }[];
  /** Late capture: lets the user pick a mode here when they skipped the form's
   *  Payment section, instead of being bounced back to it. */
  onSelectPaymentMode?: (value: string) => void;
}

const getPaymentIcon = (value: string) => {
  if (value === "Cash") return <FaRupeeSign className="h-3 w-3" />;
  if (value === "UPI") return <FiSend className="h-4 w-4" />;
  if (value === "Card") return <FiCreditCard className="h-4 w-4" />;
  return <FiClock className="h-4 w-4" />;
};

const ConfirmAppointmentModal: React.FC<ConfirmAppointmentModalProps> = ({
  isOpen,
  onOpenChange,
  appointmentData,
  onConfirm,
  requiresPaymentMode = false,
  paymentModeOptions = [],
  onSelectPaymentMode,
}) => {
  /* Only stands in for the form's Payment section when it was left empty — a
     mode already chosen there stays a read-only review row. */
  const needsPaymentMode =
    requiresPaymentMode &&
    !appointmentData?.paymentMode &&
    !!onSelectPaymentMode &&
    paymentModeOptions.length > 0;
  React.useEffect(() => {
    // Enter-to-confirm must respect the same gate as the button, or it would
    // create the appointment with no payment mode.
    if (!isOpen || !appointmentData || needsPaymentMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== "NumpadEnter") return;
      if (e.repeat) return;

      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase() ?? "";

      if (tagName === "button") return;

      e.preventDefault();
      onConfirm();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, appointmentData, onConfirm, needsPaymentMode]);

  if (!appointmentData) return null;

  return (
    <InfoModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Confirm Appointment"
      subTitle="Please review the appointment details before confirming"
      icon={Icons.checkCircleIcon}
      primaryBtnText="Confirm Appointment"
      onPress={onConfirm}
      isPrimaryDisabled={needsPaymentMode}
      disableBackdropClick={true}
      addBodyNode={
        <div className="mt-5 text-left">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-[#273244] dark:bg-[#0f1728]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Patient
                </p>
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white">
                  {appointmentData.patientName}
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Doctor
                </p>
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white">
                  Dr. {appointmentData.doctorName}
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Date
                </p>
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white">
                  {appointmentData.date}
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {appointmentData.isTokenAppointment ? "Token" : "Time"}
                </p>
                <p className="text-[14px] font-semibold text-primary dark:text-[#46beae]">
                  {appointmentData.time}
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Service
                </p>
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white">
                  {appointmentData.service}
                </p>
              </div>

              <div
                className={[
                  "space-y-0.5",
                  needsPaymentMode ? "col-span-1 sm:col-span-2" : "",
                ].join(" ")}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Payment Method
                </p>

                {needsPaymentMode ? (
                  <>
                    <div
                      role="radiogroup"
                      aria-label="Select Payment Mode"
                      className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4"
                    >
                      {paymentModeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={false}
                          onClick={() => onSelectPaymentMode?.(opt.value)}
                          className="inline-flex h-10 w-full min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-[13px] font-semibold text-text transition-colors hover:border-primary hover:text-primary"
                        >
                          <span className="shrink-0">
                            {getPaymentIcon(opt.value)}
                          </span>
                          <span className="truncate">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                    {/* UPI needs its QR and both need a transaction ID, so those
                        two continue on the form rather than finishing here. */}
                    <p className="pt-1.5 text-[11px] leading-4 text-text-muted">
                      UPI and Card open the payment step on the form to capture
                      the QR code and transaction ID.
                    </p>
                  </>
                ) : (
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-white">
                    {appointmentData.paymentMode === "Pay Later"
                      ? "Pay on Visit"
                      : appointmentData.paymentMode ||
                        (requiresPaymentMode ? "—" : "Not required")}
                  </p>
                )}
              </div>

              {appointmentData.amount && (
                <div className="col-span-1 space-y-0.5 sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Amount
                  </p>
                  <p className="text-[18px] font-bold text-primary dark:text-[#46beae]">
                    {appointmentData.amount}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      }
    />
  );
};

export default ConfirmAppointmentModal;