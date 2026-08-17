import React from "react";
import { Modal, ModalContent, ModalBody, ModalFooter } from "@heroui/react";
import { FiAlertTriangle, FiCalendar, FiClock, FiUser } from "react-icons/fi";

import AppButton from "../../../components/shared/AppButton";
import type { FutureDateActionModalProps } from "../../../types/appointment";

/**
 * Guard rail shown when a doctor / front desk confirms or checks in an
 * appointment that is booked for a later day. It restates the scheduled day so
 * the mistake is obvious before the status change goes through.
 */
const FutureDateActionModal: React.FC<FutureDateActionModalProps> = ({
  action,
  onClose,
  onConfirm,
  appointmentDate,
  appointmentTime,
  patientName,
  doctorName,
  daysAway,
  isLoading = false,
}) => {
  const isArrived = action === "arrived";

  const title = isArrived
    ? "Mark patient as arrived?"
    : "Confirm this appointment?";

  const body = isArrived
    ? "Check-in is normally done on the day of the visit. Marking the patient as arrived now will place them in today's queue."
    : "This appointment is not scheduled for today. Confirming it now will move it out of the pending list ahead of its date.";

  const dayHint =
    daysAway && daysAway > 0
      ? `${daysAway} ${daysAway === 1 ? "day" : "days"} from today`
      : "a future date";

  return (
    <Modal
      isOpen={action !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      placement="center"
      hideCloseButton
      className="mx-3 rounded-2xl bg-surface sm:mx-0 sm:rounded-3xl"
    >
      <ModalContent>
        <>
          <ModalBody className="px-5 pt-6 pb-0 sm:px-8 sm:pt-8">
            <div className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning"
              >
                <FiAlertTriangle size={22} />
              </span>

              <div className="min-w-0">
                <h2 className="text-lg font-semibold leading-6 text-text sm:text-xl">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-5 text-text-muted">{body}</p>
              </div>
            </div>

            {/* Scheduled-for summary — the detail that makes the misclick visible */}
            <div className="mt-5 rounded-2xl border border-line bg-background-secondary p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Scheduled for
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-text">
                  <FiCalendar className="text-primary" size={16} />
                  {appointmentDate}
                </span>

                {appointmentTime && (
                  <span className="flex items-center gap-2 text-sm font-semibold text-text">
                    <FiClock className="text-primary" size={16} />
                    {appointmentTime}
                  </span>
                )}

                <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
                  {dayHint}
                </span>
              </div>

              {(patientName || doctorName) && (
                <p className="mt-3 flex items-center gap-2 text-xs font-medium text-text-muted">
                  <FiUser size={14} />
                  {[patientName, doctorName].filter(Boolean).join("  •  ")}
                </p>
              )}
            </div>
          </ModalBody>

          <ModalFooter className="flex-col-reverse gap-3 px-5 pt-6 pb-6 sm:flex-row sm:justify-end sm:px-8 sm:pb-8">
            <AppButton
              text="Cancel"
              buttonVariant="outlined"
              onPress={onClose}
              isDisabled={isLoading}
              className="w-full sm:w-auto sm:min-w-[120px]"
            />
            <AppButton
              text={isArrived ? "Mark arrived anyway" : "Confirm anyway"}
              buttonVariant="primary"
              onPress={onConfirm}
              isLoading={isLoading}
              className="w-full sm:w-auto sm:min-w-[180px]"
            />
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  );
};

export default FutureDateActionModal;
