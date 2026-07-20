import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  addToast,
} from "@heroui/react";

interface BulkAssignModalProps {
  isOpen: boolean;
  selectedCount: number;
  isLoading: boolean;
  onConfirm: (assignedTo: string, notes?: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Modal for assigning requests to a person/team
 */
export const BulkAssignModal: React.FC<BulkAssignModalProps> = ({
  isOpen,
  selectedCount,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (!isSubmitting) {
      setAssignedTo("");
      setNotes("");
      onCancel();
    }
  };

  const handleConfirm = async () => {
    if (!assignedTo.trim()) {
      addToast({
        title: "Validation Error",
        description: "Please enter assignee name",
        color: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(assignedTo, notes);
      setAssignedTo("");
      setNotes("");
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
        <ModalHeader className="flex flex-col gap-1">
          Assign Requests
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Selected Requests
              </p>
              <p className="text-lg font-bold text-primary">{selectedCount} requests</p>
            </div>

            <Input
              label="Assign To"
              placeholder="Enter name or email of assignee"
              value={assignedTo}
              onValueChange={setAssignedTo}
              disabled={isSubmitting}
              isRequired
            />

            <Textarea
              label="Notes (Optional)"
              placeholder="Add any notes or instructions..."
              value={notes}
              onValueChange={setNotes}
              disabled={isSubmitting}
              rows={3}
            />
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
            color="primary"
            onPress={handleConfirm}
            isLoading={isSubmitting || isLoading}
          >
            Assign
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BulkAssignModal;
