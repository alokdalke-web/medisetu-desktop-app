import { Button } from "@heroui/react";
import { FiDownload, FiFileText, FiUploadCloud } from "react-icons/fi";

import type { LabReportActions } from "../../../redux/api/labAssistantApi";
import { isCompletedOrVerifiedStatus } from "./labReportActions";

export function LabReportActionsPanel({
  actions,
  status,
  currentFileUrl,
  isDownloading,
  isUploading,
  onDownload,
  onUpload,
}: {
  actions: LabReportActions | null;
  status?: string | null;
  currentFileUrl?: string | null;
  isDownloading: boolean;
  isUploading: boolean;
  onDownload: () => void;
  onUpload: () => void;
}) {
  const canShowActions = isCompletedOrVerifiedStatus(status);
  const fileUrl = currentFileUrl ?? actions?.currentFileUrl ?? null;

  if (!canShowActions || (!actions?.canDownload && !actions?.canUpload && !fileUrl)) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-950">Lab Report</h3>
          {fileUrl ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex max-w-full items-center gap-2 truncate text-sm font-semibold text-primary hover:text-primary-active"
            >
              <FiFileText className="shrink-0" />
              <span className="truncate">Current uploaded report</span>
            </a>
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              Download the generated report or upload the finalized file.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {actions?.canDownload && (
            <Button
              radius="full"
              variant="flat"
              onPress={onDownload}
              isLoading={isDownloading}
              isDisabled={isUploading || !actions.downloadApiUrl}
              startContent={!isDownloading && <FiDownload />}
              className="font-semibold text-slate-700"
            >
              Download Report
            </Button>
          )}

          {actions?.canUpload && (
            <Button
              radius="full"
              color="primary"
              onPress={onUpload}
              isLoading={isUploading}
              isDisabled={isDownloading || !actions.uploadUrl}
              startContent={!isUploading && <FiUploadCloud />}
              className="font-semibold text-white"
            >
              Upload Report
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
