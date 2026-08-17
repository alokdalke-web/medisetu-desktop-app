import { Modal, ModalBody, ModalContent } from "@heroui/react";
import { FiInfo } from "react-icons/fi";

import AppButton from "../../../../components/shared/AppButton";

type CancelAppointmentConfirmModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onCancel: () => Promise<void>;
  isLoading: boolean;
};

const CancelAppointmentConfirmModal = ({
  isOpen,
  onOpenChange,
  onClose,
  onCancel,
  isLoading,
}: CancelAppointmentConfirmModalProps) => (
  <Modal
    isOpen={isOpen}
    onOpenChange={onOpenChange}
    size="sm"
    classNames={{ base: "rounded-2xl" }}
  >
    <ModalContent>
      {() => (
        <ModalBody className="p-6">
          <div className="flex justify-center mt-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
              <FiInfo className="text-red-600" size={22} />
            </div>
          </div>

          <h2 className="mt-2 text-center text-xl font-semibold">
            Cancel Appointment
          </h2>

          <p className="mt-1 text-center text-sm text-slate-500">
            Are you sure you want to cancel this appointment?
          </p>

          <div className="mt-4 flex gap-3">
            <AppButton
              text="No"
              onPress={onClose}
              className="w-1/2 bg-white border border-neutral-300 text-slate-600"
            />

            <AppButton
              text="Yes, Cancel"
              buttonVariant="danger"
              onPress={async () => {
                await onCancel();
                onClose();
              }}
              isLoading={isLoading}
              className="w-1/2"
            />
          </div>
        </ModalBody>
      )}
    </ModalContent>
  </Modal>
);

export default CancelAppointmentConfirmModal;
