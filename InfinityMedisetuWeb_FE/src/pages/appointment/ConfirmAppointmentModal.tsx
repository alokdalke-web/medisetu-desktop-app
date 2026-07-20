import React from "react";
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
}

const ConfirmAppointmentModal: React.FC<ConfirmAppointmentModalProps> = ({
  isOpen,
  onOpenChange,
  appointmentData,
  onConfirm,
}) => {
  React.useEffect(() => {
    if (!isOpen || !appointmentData) return;

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
  }, [isOpen, appointmentData, onConfirm]);

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

              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Payment Method
                </p>
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white">
                  {appointmentData.paymentMode === "Pay Later"
                    ? "Pay on Visit"
                    : appointmentData.paymentMode || "—"}
                </p>
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