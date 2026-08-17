import { Button, ModalFooter } from "@heroui/react";
import { FiCheckCircle, FiEye, FiInfo, FiSave, FiShield } from "react-icons/fi";

type LabResultModalFooterProps = {
  isManagingFields: boolean;
  managedStatsText: string;
  isMutatingField: boolean;
  onClose: () => void;
  closeManageFields: () => void;
  isSaving: boolean;
  isVerifying: boolean;
  isReportActionLoading: boolean;
  savedResultId: string | null;
  viewReport: () => void;
  isLoadingReport: boolean;
  canVerifyResult: boolean;
  verify: () => void;
  canUseTemplate: boolean;
  isVerified: boolean;
  saveDraft: () => void;
  handleSaveCompletedPress: () => void;
};

export function LabResultModalFooter({
  isManagingFields,
  managedStatsText,
  isMutatingField,
  onClose,
  closeManageFields,
  isSaving,
  isVerifying,
  isReportActionLoading,
  savedResultId,
  viewReport,
  isLoadingReport,
  canVerifyResult,
  verify,
  canUseTemplate,
  isVerified,
  saveDraft,
  handleSaveCompletedPress,
}: LabResultModalFooterProps) {
  return (
    <ModalFooter className="sticky bottom-0 z-20 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
      {isManagingFields ? (
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
            <FiInfo className="text-slate-400" />
            <span>{managedStatsText}</span>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="bordered"
              radius="full"
              onPress={onClose}
              isDisabled={isMutatingField}
              className="border-slate-200 px-5 font-bold text-slate-600"
            >
              Close
            </Button>

            <Button
              color="primary"
              radius="full"
              onPress={closeManageFields}
              isDisabled={isMutatingField}
              className="px-7 font-bold text-white"
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button
            variant="bordered"
            radius="full"
            onPress={onClose}
            isDisabled={isSaving || isVerifying || isReportActionLoading}
            className="border-slate-200 px-5 font-semibold text-slate-600"
          >
            Close
          </Button>

          {savedResultId && (
            <Button
              variant="flat"
              radius="full"
              onPress={viewReport}
              isLoading={isLoadingReport}
              isDisabled={isReportActionLoading}
              startContent={!isLoadingReport && <FiEye />}
              className="px-5 font-semibold text-slate-700"
            >
              View Report
            </Button>
          )}

          {canVerifyResult && (
            <Button
              variant="flat"
              color="success"
              radius="full"
              onPress={verify}
              isLoading={isVerifying}
              isDisabled={isReportActionLoading}
              startContent={!isVerifying && <FiShield />}
              className="px-5 font-semibold text-emerald-700"
            >
              Verify Result
            </Button>
          )}

          <Button
            variant="flat"
            radius="full"
            onPress={saveDraft}
            isDisabled={
              !canUseTemplate ||
              isSaving ||
              isVerifying ||
              isVerified ||
              isReportActionLoading
            }
            startContent={!isSaving && <FiSave />}
            className="px-5 font-semibold text-slate-700"
          >
            Save Draft
          </Button>

          <Button
            color="primary"
            radius="full"
            onPress={handleSaveCompletedPress}
            isLoading={isSaving}
            isDisabled={
              !canUseTemplate || isVerifying || isVerified || isReportActionLoading
            }
            startContent={!isSaving && <FiCheckCircle />}
            className="px-6 font-semibold text-white"
          >
            Save Completed
          </Button>
        </div>
      )}
    </ModalFooter>
  );
}
