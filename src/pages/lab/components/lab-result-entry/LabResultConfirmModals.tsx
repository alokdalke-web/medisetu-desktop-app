import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";

import { type LabResultTemplateParameter } from "../../../../redux/api/labAssistantApi";

type LabResultConfirmModalsProps = {
  parameterToDelete: LabResultTemplateParameter | null;
  setParameterToDelete: (parameter: LabResultTemplateParameter | null) => void;
  performDeleteCustomParameter: (parameter: LabResultTemplateParameter) => void;
  showConfirmCompleteModal: boolean;
  setShowConfirmCompleteModal: (open: boolean) => void;
  isSaving: boolean;
  saveCompleted: () => Promise<void>;
};

export function LabResultConfirmModals({
  parameterToDelete,
  setParameterToDelete,
  performDeleteCustomParameter,
  showConfirmCompleteModal,
  setShowConfirmCompleteModal,
  isSaving,
  saveCompleted,
}: LabResultConfirmModalsProps) {
  return (
    <>
      <Modal
        isOpen={Boolean(parameterToDelete)}
        onOpenChange={(open) => {
          if (!open) setParameterToDelete(null);
        }}
        placement="center"
        size="md"
        backdrop="opaque"
        classNames={{
          backdrop: "bg-slate-950/45 backdrop-blur-sm",
          base: "rounded-3xl border border-slate-200 shadow-2xl bg-white p-5",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-slate-950 font-bold p-0">
            Confirm Delete
          </ModalHeader>
          <ModalBody className="py-3 px-0 text-xs font-semibold text-slate-600">
            Are you sure you want to delete the field "
            {parameterToDelete?.parameterName}"?
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2 p-0">
            <Button
              size="sm"
              radius="full"
              variant="flat"
              onPress={() => setParameterToDelete(null)}
              className="px-4 font-bold text-slate-700 h-8"
            >
              No
            </Button>
            <Button
              size="sm"
              radius="full"
              color="danger"
              onPress={() => {
                if (parameterToDelete) {
                  performDeleteCustomParameter(parameterToDelete);
                }
                setParameterToDelete(null);
              }}
              className="px-4 font-bold text-white h-8"
            >
              Yes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={showConfirmCompleteModal}
        onOpenChange={setShowConfirmCompleteModal}
        placement="center"
        size="md"
        backdrop="opaque"
        isDismissable={!isSaving}
        classNames={{
          backdrop: "bg-slate-950/45 backdrop-blur-sm",
          base: "rounded-3xl border border-slate-200 shadow-2xl bg-white p-5",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-slate-950 font-bold p-0">
            Confirm Completion
          </ModalHeader>
          <ModalBody className="py-3 px-0 text-xs font-semibold text-slate-605">
            Are you sure to complete this test? (Check properly)
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2 p-0">
            <Button
              size="sm"
              radius="full"
              variant="flat"
              onPress={() => setShowConfirmCompleteModal(false)}
              isDisabled={isSaving}
              className="px-4 font-bold text-slate-700 h-8"
            >
              No
            </Button>
            <Button
              size="sm"
              radius="full"
              color="primary"
              onPress={async () => {
                setShowConfirmCompleteModal(false);
                await saveCompleted();
              }}
              isLoading={isSaving}
              className="px-4 font-bold text-white h-8 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800"
            >
              Yes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
