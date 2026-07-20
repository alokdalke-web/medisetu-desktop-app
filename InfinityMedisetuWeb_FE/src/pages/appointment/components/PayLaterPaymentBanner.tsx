import { Button } from "@heroui/react";
import React from "react";

type PayLaterPaymentBannerProps = {
  appointmentData: any;
  isActionBusy: boolean;
  isPaymentProcessing: boolean;
  onMarkAsPaid: () => void;
};

const PayLaterPaymentBanner: React.FC<PayLaterPaymentBannerProps> = ({
  appointmentData,
  isActionBusy,
  isPaymentProcessing,
  onMarkAsPaid,
}) => {
  const isPayLaterPaymentPending =
    appointmentData?.paymentMode === "Pay Later" &&
    String(appointmentData?.paymentStatus ?? "").toLowerCase() !== "paid" &&
    (appointmentData?.appointmentStatus === "Pending" ||
      appointmentData?.appointmentStatus === "Patient Arrived");

  if (!isPayLaterPaymentPending) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3 dark:border-amber-700/40 dark:bg-amber-900/20">
      <p className="text-[12px] font-medium text-amber-800 dark:text-amber-200">
        Payment for this appointment is pending. Complete the payment to
        proceed further.
      </p>

      <Button
        size="sm"
        radius="full"
        variant="flat"
        className="h-8 shrink-0 bg-primary text-white"
        data-mark-as-paid="true"
        onPress={onMarkAsPaid}
        isDisabled={isActionBusy || isPaymentProcessing}
      >
        Mark as Paid
      </Button>
    </div>
  );
};

export default PayLaterPaymentBanner;
