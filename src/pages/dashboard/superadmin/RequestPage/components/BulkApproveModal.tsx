import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { FiCheckCircle } from "react-icons/fi";

interface BulkApproveModalProps {
  isOpen: boolean;
  selectedCount: number;
  isLoading: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Modal for confirming bulk approval of requests
 */
export const BulkApproveModal: React.FC<BulkApproveModalProps> = ({
  isOpen,
  selectedCount,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (!isSubmitting) {
      onCancel();
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      backdrop="blur"
      isDismissable={!isSubmitting}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <FiCheckCircle className="text-green-600" />
          <span>Approve Requests</span>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-center text-sm text-slate-700">
                You are about to approve
              </p>
              <p className="text-center text-2xl font-bold text-green-600">
                {selectedCount} request{selectedCount !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                This will:
              </p>
              <ul className="space-y-1 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Mark all requests as Approved
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Activate the doctor profiles
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Send approval notifications
                </li>
              </ul>
            </div>

            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-sm text-blue-700">
                <strong>Tip:</strong> You can still review individual requests before confirming.
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
            color="success"
            onPress={handleConfirm}
            isLoading={isSubmitting || isLoading}
          >
            Approve All
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BulkApproveModal;
