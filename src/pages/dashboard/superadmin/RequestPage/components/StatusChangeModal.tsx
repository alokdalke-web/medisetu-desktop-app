import React from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Button,
} from "@heroui/react";
import type { PendingStatusChange } from "../types";

interface StatusChangeModalProps {
  isOpen: boolean;
  pendingStatusChange: PendingStatusChange | null;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal for confirming status changes, archives, and unarchives
 */
export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  isOpen,
  pendingStatusChange,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  if (!pendingStatusChange) return null;

  const getModalTitle = (): string => {
    switch (pendingStatusChange.action) {
      case "archive":
        return "Archive Request";
      case "unarchive":
        return "Unarchive Request";
      default:
        return "Confirm Status Change";
    }
  };

  const getConfirmButtonText = (): string => {
    switch (pendingStatusChange.action) {
      case "archive":
        return "Yes, Archive";
      case "unarchive":
        return "Yes, Unarchive";
      default:
        return "Yes, Change Status";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) onCancel();
      }}
      placement="center"
      size="sm"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="text-base">
              {getModalTitle()}
            </ModalHeader>

            <ModalBody>
              <p className="text-sm text-slate-600">
                Are you sure you want to move this request from{" "}
                <span className="font-semibold text-slate-900">
                  {pendingStatusChange.fromStatus}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {pendingStatusChange.toStatus}
                </span>
                ?
              </p>
            </ModalBody>

            <ModalFooter>
              <Button
                variant="light"
                onPress={() => {
                  onCancel();
                  onClose();
                }}
                isDisabled={isLoading}
              >
                Cancel
              </Button>

              <Button
                color="primary"
                onPress={onConfirm}
                isLoading={isLoading}
              >
                {getConfirmButtonText()}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
