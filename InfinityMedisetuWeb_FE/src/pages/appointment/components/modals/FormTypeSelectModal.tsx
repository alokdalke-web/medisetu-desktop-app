import { Button, Modal, ModalBody, ModalContent } from "@heroui/react";
import { FiFileText } from "react-icons/fi";

type FormTypeSelectModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConsent: () => void;
  onSelectRefer: () => void;
};

const FormTypeSelectModal = ({
  isOpen,
  onOpenChange,
  onSelectConsent,
  onSelectRefer,
}: FormTypeSelectModalProps) => (
  <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
    <ModalContent>
      {(onClose) => (
        <ModalBody className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-800">
              Select Form Type
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Choose which form you want to open
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <Button
              radius="full"
              variant="flat"
              className="bg-white border border-slate-200 text-slate-700"
              startContent={<FiFileText size={16} />}
              onPress={onSelectConsent}
            >
              Consent Form
            </Button>

            <Button
              radius="full"
              variant="flat"
              className="bg-white border border-slate-200 text-slate-700"
              startContent={<FiFileText size={16} />}
              onPress={onSelectRefer}
            >
              Refer Form
            </Button>
          </div>

          <div className="mt-2">
            <Button
              radius="full"
              variant="light"
              className="w-full"
              onPress={onClose}
            >
              Close
            </Button>
          </div>
        </ModalBody>
      )}
    </ModalContent>
  </Modal>
);

export default FormTypeSelectModal;
