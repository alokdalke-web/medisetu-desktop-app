import React, { useState, useMemo } from "react";
import {
  Modal,
  ModalContent,
  ModalBody,
  Textarea,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";
import { FiX, FiInfo } from "react-icons/fi";
import AppButton from "../../components/shared/AppButton";
import {
  useGetCancellationReasonsQuery,
  useGetClinicCancellationPolicyQuery,
  useCancelAppointmentStaffMutation,
} from "../../redux/api/cancellationPolicyApi";

interface CancelAppointmentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  appointmentId: string;
  patientName: string;
  onSuccess?: () => void;
}

const CancelAppointmentModal: React.FC<CancelAppointmentModalProps> = ({
  isOpen,
  onOpenChange,
  appointmentId,
  patientName,
  onSuccess,
}) => {
  const [selectedReasonCode, setSelectedReasonCode] = useState("");
  const [comments, setComments] = useState("");

  const { data: reasonsData, isLoading: isLoadingReasons } = useGetCancellationReasonsQuery(undefined, { skip: !isOpen });
  const { data: policyData } = useGetClinicCancellationPolicyQuery(undefined, { skip: !isOpen });
  const [cancelAppointment, { isLoading: isCancelling }] = useCancelAppointmentStaffMutation();

  // Extract policy rules (fallback to defaults if policy is off/missing)
  const isPolicyActive = policyData?.isActive !== false;
  const reasonMandatory = isPolicyActive ? (policyData?.reasonMandatory ?? true) : false;
  const allowAdditionalComments = isPolicyActive ? (policyData?.allowAdditionalComments ?? true) : true;
  const minCommentLength = isPolicyActive ? (policyData?.minCommentLength ?? 0) : 0;
  const maxCommentLength = isPolicyActive ? (policyData?.maxCommentLength ?? 500) : 500;

  // Validation
  const isReasonValid = !reasonMandatory || !!selectedReasonCode;
  
  const isCommentValid = useMemo(() => {
    if (!allowAdditionalComments) return true;
    const len = comments.trim().length;
    // If optional (min is 0) and empty, it's valid. If min is > 0, empty is invalid.
    if (len === 0 && minCommentLength === 0) return true;
    return len >= minCommentLength && len <= maxCommentLength;
  }, [allowAdditionalComments, comments, minCommentLength, maxCommentLength]);

  const isValid = isReasonValid && isCommentValid;

  const handleConfirm = async () => {
    if (!isValid) return;

    try {
      const response = await cancelAppointment({
        appointmentId,
        reasonCode: selectedReasonCode,
        comments: allowAdditionalComments ? comments.trim() : undefined,
      }).unwrap();

      const refundStatusText = response?.refundStatus 
        ? ` (Refund Status: ${response.refundStatus})`
        : "";

      addToast({
        title: "Appointment Cancelled",
        description: `The appointment has been successfully cancelled.${refundStatusText}`,
        color: "success",
      });

      setSelectedReasonCode("");
      setComments("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      addToast({
        title: "Cancellation Failed",
        description: error?.data?.message || "Failed to cancel the appointment. Please try again.",
        color: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      hideCloseButton
      size="md"
      classNames={{
        base: "rounded-2xl",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <ModalBody className="p-6 relative text-slate-700">
            {/* Close button */}
            <button
              onClick={onClose}
              disabled={isCancelling}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <FiX size={18} />
            </button>

            {/* Icon */}
            <div className="flex justify-center mt-2">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <FiInfo size={24} />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-lg font-semibold text-center mt-4 text-slate-800">
              Cancel Appointment
            </h2>

            {/* Subtitle */}
            <p className="text-sm text-slate-500 text-center mt-1">
              Are you sure you want to cancel the appointment of{" "}
              <span className="font-semibold text-slate-700">{patientName}</span>?
            </p>

            {/* Staff bypass notification banner */}
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2.5 items-start">
              <FiInfo className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <div className="text-[12px] text-amber-800 leading-normal">
                <span className="font-semibold">Clinic Staff Override:</span> You bypass policy restrictions (booking window limits, daily limits, cooldowns).
              </div>
            </div>

            {/* Reason Selection */}
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">
                Cancellation Reason {reasonMandatory && <span className="text-rose-500">*</span>}
              </label>

              <Select
                selectedKeys={selectedReasonCode ? [selectedReasonCode] : []}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0] as string;
                  setSelectedReasonCode(val);
                }}
                radius="lg"
                variant="bordered"
                placeholder={isLoadingReasons ? "Loading reasons..." : "Select cancellation reason"}
                isDisabled={isLoadingReasons || isCancelling}
                classNames={{
                  trigger: "h-11 border-slate-200 hover:border-teal-400 focus:border-teal-500",
                }}
              >
                {(reasonsData || []).map((reason) => (
                  <SelectItem key={reason.code} textValue={reason.displayName}>
                    {reason.displayName}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* Comments Field */}
            {allowAdditionalComments && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Additional Comments {minCommentLength > 0 && <span className="text-rose-500">*</span>}
                  </label>
                  <span className={`text-[11px] font-medium ${
                    comments.length > maxCommentLength ? "text-rose-500" : "text-slate-400"
                  }`}>
                    {comments.length} / {maxCommentLength} chars
                  </span>
                </div>

                <Textarea
                  placeholder={`Enter details... ${minCommentLength > 0 ? `(Min ${minCommentLength} chars)` : ""}`}
                  value={comments}
                  onValueChange={setComments}
                  radius="lg"
                  variant="bordered"
                  isDisabled={isCancelling}
                  minRows={3}
                  classNames={{
                    input: "text-sm",
                    inputWrapper: "border-slate-200 hover:border-teal-400 focus-within:!border-teal-500 focus-within:!ring-1 focus-within:!ring-teal-100",
                  }}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <AppButton
                text="Dismiss"
                onPress={onClose}
                isDisabled={isCancelling}
                className="w-1/2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              />
              <AppButton
                text="Proceed"
                buttonVariant="danger"
                onPress={handleConfirm}
                isLoading={isCancelling}
                isDisabled={!isValid}
                className="w-1/2"
              />
            </div>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CancelAppointmentModal;
