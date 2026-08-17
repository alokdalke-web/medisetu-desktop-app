import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { FiAlertCircle } from "react-icons/fi";

import AppButton from "../../../components/shared/AppButton";

type DiscardChangesModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
};

const DiscardChangesModal = ({
  isOpen,
  onOpenChange,
  onDiscard,
}: DiscardChangesModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      hideCloseButton
      size="md"
      className="rounded-3xl p-6"
      classNames={{
        wrapper: "z-[1101]",
        backdrop: "z-[1100]",
      }}
    >
      <ModalContent>
        {(onCloseConfirm) => (
          <>
            <ModalHeader className="flex flex-col items-center gap-2 pb-2 text-center">
              <div className="rounded-full bg-warning-50 p-3">
                <FiAlertCircle className="h-8 w-8 text-warning" />
              </div>
              <h3 className="text-xl font-bold">Discard Changes?</h3>
            </ModalHeader>

            <ModalBody className="pb-6 text-center text-slate-600">
              You have unsaved changes. Are you sure you want to discard them
              and close the window?
            </ModalBody>

            <ModalFooter className="flex justify-center gap-3 pt-0">
              <AppButton
                text="No, Stay"
                buttonVariant="outlined"
                className="h-11 w-32"
                onPress={onCloseConfirm}
              />
              <AppButton
                text="Yes, Discard"
                buttonVariant="danger"
                className="h-11 w-32"
                onPress={onDiscard}
              />
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default DiscardChangesModal;
