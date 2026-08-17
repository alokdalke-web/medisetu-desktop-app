import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalBody,
  Textarea,
  Select,
  SelectItem,
} from "@heroui/react";
import { FiX, FiUserX } from "react-icons/fi";
import AppButton from "../../components/shared/AppButton";
import { useMarkAsNoShowMutation } from "../../redux/api/appointmentApi";
import { addToast } from "@heroui/react";

interface MarkNoShowModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  appointmentId: string;
  onSuccess?: () => void;
}

const NO_SHOW_REASONS = [
  "Patient did not arrive",
  "Arrived after grace period",
  "Did not respond to call/message",
  "Duplicate appointment",
  "Cancelled verbally but not updated",
  "Emergency case handled",
  "Other",
];

const MarkNoShowModal: React.FC<MarkNoShowModalProps> = ({
  isOpen,
  onOpenChange,
  appointmentId,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [markAsNoShow, { isLoading }] = useMarkAsNoShowMutation();

  const handleConfirm = async () => {
    const finalReason =
      selectedReason === "Other" ? customReason : selectedReason;

    try {
      await markAsNoShow({
        appointmentId,
        reason: finalReason,
      }).unwrap();

      addToast({
        title: "Success",
        description: "Appointment marked as No Show successfully",
        color: "success",
      });

      onOpenChange(false);
      setSelectedReason("");
      setCustomReason("");
      onSuccess?.();
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to mark as No Show",
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
          <ModalBody className="p-6 relative">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <FiX size={18} />
            </button>

            {/* Icon */}
            <div className="flex justify-center mt-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <FiUserX className="text-red-500" size={22} />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-semibold text-center mt-4">
              Mark as No-Show?
            </h2>

            {/* Subtitle */}
            <p className="text-sm text-slate-500 text-center mt-1">
              Patient did not arrive within the allowed time window.
            </p>

            {/* Reason Section */}
            <div className="mt-6">
              <label className="text-sm font-medium text-slate-700">
                Reason for No-show{" "}
                <span className="text-slate-400">(Optional)</span>
              </label>

              {/* HeroUI Select */}
              <Select
                selectedKeys={selectedReason ? [selectedReason] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string;
                  setSelectedReason(value);
                }}
                radius="lg"
                variant="bordered"
                className="mt-2"
                placeholder="Select reason"
              >
                {NO_SHOW_REASONS.map((r) => (
                  <SelectItem key={r}>{r}</SelectItem>
                ))}
              </Select>

              {/* Custom Reason Input */}
              {selectedReason === "Other" && (
                <Textarea
                  placeholder="Enter custom reason"
                  value={customReason}
                  onValueChange={setCustomReason}
                  radius="lg"
                  variant="bordered"
                  className="mt-3"
                  minRows={3}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <AppButton
                text="Cancel"
                onPress={onClose}
                className="w-1/2 bg-white border border-red-300 text-red-500 hover:bg-red-50"
              />
              <AppButton
                text="Confirm No-Show"
                buttonVariant="danger"
                onPress={handleConfirm}
                isLoading={isLoading}
                className="w-1/2"
              />
            </div>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default MarkNoShowModal;
