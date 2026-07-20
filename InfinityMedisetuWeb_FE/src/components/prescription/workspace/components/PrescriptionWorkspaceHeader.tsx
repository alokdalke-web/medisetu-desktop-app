import { Button, Tooltip } from "@heroui/react";
import React from "react";
import { FiClock, FiDownload, FiEdit2 } from "react-icons/fi";

const PrescriptionWorkspaceHeader: React.FC<{
  hasManualPrescription: boolean;
  patientId: string;
  appointmentId: string;
  editSaveInProgress: boolean;
  onEditPrescription: () => void;
  onOpenHistory: () => void;
  hasHistory?: boolean;
  onViewDownload?: () => void;
  isViewDownloadLoading?: boolean;
  isViewDownloadDisabled?: boolean;
}> = ({
  hasManualPrescription,
  patientId,
  appointmentId,
  editSaveInProgress,
  onEditPrescription,
  onOpenHistory,
  hasHistory = true,
  onViewDownload,
  isViewDownloadLoading,
  isViewDownloadDisabled,
}) => (
    <div className="flex w-full items-center gap-2 px-4 py-2 flex-wrap justify-end">
      {!hasManualPrescription && (
        <Button
          size="sm"
          radius="sm"
          variant="bordered"
          className="h-9 rounded-lg border-slate-200 text-slate-700 text-[13px] font-semibold dark:border-[#38445a] dark:text-white dark:hover:bg-[#1a2535]"
          startContent={<FiEdit2 className="h-3.5 w-3.5" />}
          onPress={onEditPrescription}
          isDisabled={!patientId || !appointmentId || editSaveInProgress}
        >
          Edit Prescription
        </Button>
      )}

      {onViewDownload && (
        <Button
          size="sm"
          radius="sm"
          className="h-9 rounded-lg bg-primary text-white text-[13px] font-semibold shadow-sm hover:opacity-90 disabled:bg-slate-100 disabled:text-slate-400"
          startContent={!isViewDownloadLoading ? <FiDownload className="h-3.5 w-3.5" /> : null}
          isLoading={isViewDownloadLoading}
          isDisabled={isViewDownloadDisabled}
          onPress={onViewDownload}
        >
          {isViewDownloadLoading ? "Preparing..." : "View/Download"}
        </Button>
      )}

      {hasHistory && (
        <Tooltip content="Prescription History" placement="top">
          <Button
            size="sm"
            radius="sm"
            variant="bordered"
            isIconOnly
            className="h-9 w-9 min-w-9 rounded-lg border-primary/30 text-primary hover:bg-primary/5 dark:border-[#46beae]/40 dark:text-[#9be7dc] dark:hover:bg-[#1a3a35]"
            onPress={onOpenHistory}
            aria-label="Prescription History"
          >
            <FiClock className="h-4 w-4" />
          </Button>
        </Tooltip>
      )}
    </div>
  );

export default PrescriptionWorkspaceHeader;
