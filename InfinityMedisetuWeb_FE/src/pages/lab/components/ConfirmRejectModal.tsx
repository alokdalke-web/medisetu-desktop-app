import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

import type { LabTestRow } from "../labData";

export function ConfirmRejectModal({
  isOpen,
  row,
  reason,
  isLoading,
  onOpenChange,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  row: LabTestRow | null;
  reason: string;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
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
          <span className="text-lg font-bold text-slate-950">Reject Test</span>
          <span className="text-xs font-normal text-slate-500">
            This will mark the test as rejected in this frontend flow.
          </span>
        </ModalHeader>
        <ModalBody className="px-6">
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-950">
              {row?.testName ?? "Selected test"}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {row?.patientName ?? "Patient"} - {row?.doctorName ?? "Doctor"}
            </p>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              Reason optional
            </span>
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Add rejection reason"
              className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-red-200 focus:ring-4 focus:ring-red-50"
            />
          </label>
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
            color="danger"
            radius="full"
            onPress={onConfirm}
            isLoading={isLoading}
            className="px-6 font-semibold text-white"
          >
            Reject
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
