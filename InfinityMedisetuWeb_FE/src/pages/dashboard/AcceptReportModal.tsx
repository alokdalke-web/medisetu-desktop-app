import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

type Row = any;

const AcceptReportModal = ({
  isOpen,
  onOpenChange,
  selectedRow,
  isLoading,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRow: Row | null;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      size="sm"
      backdrop="opaque"
      classNames={{
        backdrop: "bg-slate-950/45 backdrop-blur-sm",
        base: "rounded-3xl border border-slate-200 shadow-2xl",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 px-6 pt-6">
          <span className="text-lg font-bold text-slate-950">Accept Test</span>
          <span className="text-xs font-normal text-slate-500">
            Move this initiated test into your in-progress queue.
          </span>
        </ModalHeader>
        <ModalBody className="px-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {selectedRow?.testName ?? "Selected test"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedRow?.patientName ?? "Patient"} -{" "}
              {selectedRow?.doctorName ?? "Doctor"}
            </p>
          </div>
        </ModalBody>
        <ModalFooter className="px-6 pb-6">
          <Button
            variant="bordered"
            radius="full"
            onPress={onCancel}
            isDisabled={isLoading}
            className="border-slate-200 px-5 font-semibold text-slate-600"
          >
            Cancel
          </Button>
          <Button
            color="primary"
            radius="full"
            onPress={onConfirm}
            isLoading={isLoading}
            className="px-6 font-semibold text-white"
          >
            Accept
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AcceptReportModal;
