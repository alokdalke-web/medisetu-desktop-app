import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
  RadioGroup,
  Radio,
} from "@heroui/react";
import { FiAlertTriangle } from "react-icons/fi";
import type { BulkActionType } from "../types";

interface BulkActionConfirmModalProps {
  isOpen: boolean;
  action: BulkActionType | null;
  selectedCount: number;
  isLoading?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

const ACTION_CONFIG = {
  approve: {
    title: "Confirm Bulk Approval",
    message:
      "You are about to approve all selected requests. This action cannot be easily undone.",
    buttonLabel: "Approve",
    buttonColor: "success" as const,
    icon: "✓",
    color: "emerald",
  },
  reject: {
    title: "Confirm Bulk Rejection",
    message: "You are about to reject all selected requests. Please provide a reason.",
    buttonLabel: "Reject",
    buttonColor: "danger" as const,
    icon: "✗",
    color: "rose",
    requiresReason: true,
  },
  archive: {
    title: "Confirm Bulk Archive",
    message: "You are about to archive all selected requests. You can unarchive them later.",
    buttonLabel: "Archive",
    buttonColor: "warning" as const,
    icon: "📦",
    color: "amber",
  },
  unarchive: {
    title: "Confirm Bulk Unarchive",
    message: "You are about to unarchive all selected requests.",
    buttonLabel: "Unarchive",
    buttonColor: "primary" as const,
    icon: "📪",
    color: "blue",
  },
  export: {
    title: "Export Requests",
    message: "Select your preferred export format for the selected requests.",
    buttonLabel: "Export",
    buttonColor: "primary" as const,
    icon: "📥",
    color: "blue",
    isExport: true,
  },
};

/**
 * Bulk Action Confirmation Modal
 * Shows confirmation before executing bulk operations
 * For reject action, requires rejection reason
 */
export const BulkActionConfirmModal: React.FC<BulkActionConfirmModalProps> = ({
  isOpen,
  action,
  selectedCount,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "excel">("csv");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setRejectionReason("");
      setExportFormat("csv");
    }
  }, [isOpen]);

  if (!action) return null;

  const config = ACTION_CONFIG[action];

  const handleConfirm = () => {
    if (action === "reject" && !rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    
    if (action === "export") {
      onConfirm(exportFormat);
    } else {
      onConfirm(rejectionReason);
    }
  };

  const canSubmit =
    action !== "reject" ||
    (rejectionReason.trim().length > 0 && rejectionReason.trim().length <= 500);

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="md" isDismissable={!isLoading}>
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <div className={`text-2xl`}>{config.icon}</div>
          <span className="text-lg font-semibold">{config.title}</span>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {/* Warning Message */}
          <div className={`rounded-lg border border-${config.color}-200 bg-${config.color}-50 p-3`}>
            <p className="text-sm text-slate-700">{config.message}</p>
          </div>

          {/* Selected Count */}
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-600 mb-1">Selected Items</p>
            <p className="text-lg font-semibold text-slate-900">{selectedCount}</p>
          </div>

          {/* Rejection Reason (if needed) */}
          {action === "reject" && (
            <div>
              <Textarea
                label="Rejection Reason"
                placeholder="Explain why these requests are being rejected..."
                value={rejectionReason}
                onValueChange={setRejectionReason}
                minRows={3}
                maxLength={500}
                isDisabled={isLoading}
                description={`${rejectionReason.length}/500`}
                isInvalid={rejectionReason.length === 0}
                errorMessage={
                  rejectionReason.length === 0
                    ? "Rejection reason is required"
                    : undefined
                }
              />
            </div>
          )}

          {/* Export Format Selection (if export) */}
          {action === "export" && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Export Format</p>
              <RadioGroup
                value={exportFormat}
                onValueChange={(value) => setExportFormat(value as "csv" | "json" | "excel")}
                color="primary"
              >
                <Radio value="csv" description="Comma-separated values">
                  CSV (.csv)
                </Radio>
                <Radio value="excel" description="Microsoft Excel format">
                  Excel (.xlsx)
                </Radio>
                <Radio value="json" description="JavaScript Object Notation">
                  JSON (.json)
                </Radio>
              </RadioGroup>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                <p>💡 <strong>Tip:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>CSV is best for Excel/Google Sheets</li>
                  <li>Excel has better formatting</li>
                  <li>JSON is useful for data integration</li>
                </ul>
              </div>
            </div>
          )}

          {/* Alert */}
          {action !== "export" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex gap-2">
              <FiAlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">
                This action cannot be easily undone. Please review your selection carefully.
              </p>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            variant="light"
            onPress={onCancel}
            disabled={isLoading}
            className="font-semibold"
          >
            Cancel
          </Button>

          <Button
            color={config.buttonColor}
            onPress={handleConfirm}
            isLoading={isLoading}
            disabled={isLoading || !canSubmit}
            className="font-semibold"
          >
            {config.buttonLabel} ({selectedCount})
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BulkActionConfirmModal;
