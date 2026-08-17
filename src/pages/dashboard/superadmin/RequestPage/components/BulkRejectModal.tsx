import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";

interface BulkRejectModalProps {
  isOpen: boolean;
  selectedCount: number;
  isLoading: boolean;
  onConfirm: (reason?: string) => Promise<void>;
  onCancel: () => void;
}

const REJECTION_REASONS = [
  { key: "incomplete", label: "Incomplete Information" },
  { key: "invalid_docs", label: "Invalid Documents" },
  { key: "duplicate", label: "Duplicate Request" },
  { key: "non_compliant", label: "Non-Compliant" },
  { key: "other", label: "Other" },
];

/**
 * Modal for rejecting multiple requests with reason
 */
export const BulkRejectModal: React.FC<BulkRejectModalProps> = ({
  isOpen,
  selectedCount,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  const [selectedReason, setSelectedReason] = useState<Set<string>>(new Set());
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason(new Set());
      setCustomReason("");
      onCancel();
    }
  };

  const handleConfirm = async () => {
    let reason = "";

    if (selectedReason.size === 0) {
      addToast({
        title: "Validation Error",
        description: "Please select a rejection reason",
        color: "warning",
      });
      return;
    }

    const reasonKey = Array.from(selectedReason)[0];
    const reasonObj = REJECTION_REASONS.find(r => r.key === reasonKey);

    if (reasonKey === "other") {
      if (!customReason.trim()) {
        addToast({
          title: "Validation Error",
          description: "Please enter a custom reason",
          color: "warning",
        });
        return;
      }
      reason = customReason;
    } else {
      reason = reasonObj?.label || "";
    }

    setIsSubmitting(true);
    try {
      await onConfirm(reason);
      setSelectedReason(new Set());
      setCustomReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedReasonKey = Array.from(selectedReason)[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      backdrop="blur"
      isDismissable={!isSubmitting}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Reject Requests
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Selected Requests
              </p>
              <p className="text-lg font-bold text-danger">{selectedCount} requests</p>
            </div>

            <div>
              <Select
                label="Rejection Reason"
                placeholder="Select a reason..."
                selectedKeys={selectedReason}
                onSelectionChange={(keys: any) => {
                  if (typeof keys === 'object' && keys !== null) {
                    setSelectedReason(new Set(Array.from(keys)));
                  }
                }}
                disabled={isSubmitting}
                isRequired
              >
                {REJECTION_REASONS.map((reason) => (
                  <SelectItem key={reason.key}>
                    {reason.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {selectedReasonKey === "other" && (
              <Textarea
                label="Specify Reason"
                placeholder="Enter your custom rejection reason..."
                value={customReason}
                onValueChange={setCustomReason}
                disabled={isSubmitting}
                rows={3}
                isRequired
              />
            )}

            <div className="rounded-lg bg-danger-50 p-3">
              <p className="text-sm text-danger-700">
                <strong>Note:</strong> Rejecting these requests is irreversible. All {selectedCount} selected requests will be marked as rejected.
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="default"
            variant="light"
            onPress={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            color="danger"
            onPress={handleConfirm}
            isLoading={isSubmitting || isLoading}
          >
            Reject All
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BulkRejectModal;
