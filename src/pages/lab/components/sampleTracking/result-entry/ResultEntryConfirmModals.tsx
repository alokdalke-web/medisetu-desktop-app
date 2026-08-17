import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";

import { type LabResultTemplateParameter } from "../../../../../redux/api/labAssistantApi";

type ResultEntryConfirmModalsProps = {
  showConfirmSaveModal: boolean;
  setShowConfirmSaveModal: (open: boolean) => void;
  isSaving: boolean;
  saveCompleted: () => Promise<void>;
  showReEditConfirmModal: boolean;
  setShowReEditConfirmModal: (open: boolean) => void;
  isReEditAcknowledged: boolean;
  setIsReEditAcknowledged: (value: boolean) => void;
  handleConfirmEditResult: () => void;
  showUploadConfirmModal: boolean;
  setShowUploadConfirmModal: (open: boolean) => void;
  isGeneratedReportUploadLoading: boolean;
  isUploadAcknowledged: boolean;
  setIsUploadAcknowledged: (value: boolean) => void;
  handleUploadGeneratedReport: () => void;
  hasExistingUploadedReport: boolean;
  parameterToDelete: LabResultTemplateParameter | null;
  setParameterToDelete: (parameter: LabResultTemplateParameter | null) => void;
  performDeleteCustomParameter: (parameter: LabResultTemplateParameter) => void;
};

export function ResultEntryConfirmModals({
  showConfirmSaveModal,
  setShowConfirmSaveModal,
  isSaving,
  saveCompleted,
  showReEditConfirmModal,
  setShowReEditConfirmModal,
  isReEditAcknowledged,
  setIsReEditAcknowledged,
  handleConfirmEditResult,
  showUploadConfirmModal,
  setShowUploadConfirmModal,
  isGeneratedReportUploadLoading,
  isUploadAcknowledged,
  setIsUploadAcknowledged,
  handleUploadGeneratedReport,
  hasExistingUploadedReport,
  parameterToDelete,
  setParameterToDelete,
  performDeleteCustomParameter,
}: ResultEntryConfirmModalsProps) {
  return (
    <>      <Modal
        isOpen={showConfirmSaveModal}
        onOpenChange={setShowConfirmSaveModal}
        placement="center"
        size="md"
        backdrop="opaque"
        isDismissable={!isSaving}
        classNames={{
          backdrop: "bg-slate-950/45 backdrop-blur-sm",
          base: "rounded-xl border border-slate-200 shadow-2xl bg-white p-5",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-slate-950 font-bold p-0">
            Confirm Completion
          </ModalHeader>
          <ModalBody className="py-3 px-0 text-xs  text-slate-800">
            Please confirm that all required values, units, and reference ranges have been reviewed. Once completed, this report will be shared with the doctor and patient records.
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2 p-0">
            <Button
              size="sm"
              radius="full"
              variant="flat"
              onPress={() => setShowConfirmSaveModal(false)}
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
                setShowConfirmSaveModal(false);
                await saveCompleted();
              }}
              isLoading={isSaving}
              className="px-4 font-bold text-white h-8 bg-primary hover:bg-primary-active"
            >
              Yes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={showReEditConfirmModal}
        onOpenChange={(open) => {
          setShowReEditConfirmModal(open);
          if (!open) setIsReEditAcknowledged(false);
        }}
        placement="center"
        size="md"
        backdrop="opaque"
        classNames={{
          backdrop: "bg-slate-950/45 backdrop-blur-sm",
          base: "rounded-xl border border-slate-200 shadow-2xl bg-white p-5",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-slate-950 font-bold p-0">
            Re-edit Completed Result
          </ModalHeader>
          <ModalBody className="py-3 px-0 text-xs font-semibold text-slate-600">
            <p>
              This result has already been completed. Re-edit only when a verified correction is required, because the generated report may need to be uploaded again after saving.
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
              <input
                type="checkbox"
                checked={isReEditAcknowledged}
                onChange={(event) => setIsReEditAcknowledged(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <span>
                I understand this will reopen the completed result for correction and I will review/upload the revised report if needed.
              </span>
            </label>
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2 p-0">
            <Button
              size="sm"
              radius="full"
              variant="flat"
              onPress={() => setShowReEditConfirmModal(false)}
              className="px-4 font-bold text-slate-700 h-8"
            >
              Keep Locked
            </Button>
            <Button
              size="sm"
              radius="full"
              color="primary"
              onPress={handleConfirmEditResult}
              isDisabled={!isReEditAcknowledged}
              className={[
                "px-4 font-bold text-white h-8",
                isReEditAcknowledged
                  ? "bg-primary hover:bg-primary-active"
                  : "bg-slate-200 text-slate-400",
              ].join(" ")}
            >
              Continue Editing
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={showUploadConfirmModal}
        onOpenChange={(open) => {
          if (isGeneratedReportUploadLoading) return;
          setShowUploadConfirmModal(open);
          if (!open) setIsUploadAcknowledged(false);
        }}
        placement="center"
        size="md"
        backdrop="opaque"
        isDismissable={!isGeneratedReportUploadLoading}
        classNames={{
          backdrop: "bg-slate-950/45 backdrop-blur-sm",
          base: "rounded-xl border border-slate-200 shadow-2xl bg-white p-5",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-slate-950 font-bold p-0">
            {hasExistingUploadedReport ? "Replace Uploaded Report" : "Upload Final Report"}
          </ModalHeader>
          <ModalBody className="py-3 px-0 text-xs font-semibold text-slate-600">
            <p>
              {hasExistingUploadedReport
                ? "A report PDF is already attached to this test. Uploading again will replace the report visible to the doctor/admin side."
                : "This will upload the generated report PDF for the doctor side to view. Please upload only after reviewing the preview."}
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
              <input
                type="checkbox"
                checked={isUploadAcknowledged}
                disabled={isGeneratedReportUploadLoading}
                onChange={(event) => setIsUploadAcknowledged(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
              />
              <span>
                I have reviewed the report preview and confirm this PDF is ready to upload.
              </span>
            </label>
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2 p-0">
            <Button
              size="sm"
              radius="full"
              variant="flat"
              onPress={() => setShowUploadConfirmModal(false)}
              isDisabled={isGeneratedReportUploadLoading}
              className="px-4 font-bold text-slate-700 h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              radius="full"
              color="primary"
              onPress={handleUploadGeneratedReport}
              isLoading={isGeneratedReportUploadLoading}
              isDisabled={!isUploadAcknowledged}
              className={[
                "px-4 font-bold text-white h-8",
                isUploadAcknowledged
                  ? "bg-primary hover:bg-primary-active"
                  : "bg-slate-200 text-slate-400",
              ].join(" ")}
            >
              {hasExistingUploadedReport ? "Replace Report" : "Upload Report"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

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
          base: "rounded-xl border border-slate-200 shadow-2xl bg-white p-5",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-slate-950 font-bold p-0">
            Confirm Delete
          </ModalHeader>
          <ModalBody className="py-3 px-0 text-xs font-semibold text-slate-600">
            Are you sure you want to delete the field "{parameterToDelete?.parameterName}"?
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
    </>
  );
}
