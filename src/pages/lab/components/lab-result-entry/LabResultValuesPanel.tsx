import { Spinner } from "@heroui/react";

import {
  type LabReportActions,
  type LabResultReport,
  type LabResultTemplate,
} from "../../../../redux/api/labAssistantApi";
import { LabReportActionsPanel } from "../LabReportActionsPanel";
import {
  ResultValueInput,
  SourceBadge,
} from "../sampleTracking/result-entry/fieldControls";
import { LabResultReportPreview } from "./LabResultReportPreview";

type LabResultValuesPanelProps = {
  template: LabResultTemplate;
  values: Record<string, string>;
  isVerified: boolean;
  setParameterValue: (parameterId: string, value: string) => void;
  remarks: string;
  setRemarks: (value: string) => void;
  isLoadingReport: boolean;
  report: LabResultReport | null;
  reportActions: LabReportActions | null;
  reportActionStatus?: string | null;
  currentReportFileUrl: string | null;
  isDownloadingReport: boolean;
  isUploadingReportFile: boolean;
  onDownloadReport: () => void;
  onUploadReport: () => void;
};

export function LabResultValuesPanel({
  template,
  values,
  isVerified,
  setParameterValue,
  remarks,
  setRemarks,
  isLoadingReport,
  report,
  reportActions,
  reportActionStatus,
  currentReportFileUrl,
  isDownloadingReport,
  isUploadingReportFile,
  onDownloadReport,
  onUploadReport,
}: LabResultValuesPanelProps) {
  return (
    <>
      <div className="grid gap-3">
        {template.parameters.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No result parameters were returned for this template.
          </div>
        ) : (
          <>
            <div className="hidden lg:grid gap-3 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 lg:grid-cols-[0.85fr_1.1fr_1.25fr_0.6fr_0.9fr_0.55fr] lg:items-center">
              <span>Section</span>
              <span>Parameter</span>
              <span>Input</span>
              <span>Unit</span>
              <span>Reference Range</span>
              <span>Type</span>
            </div>

            {template.parameters.map((parameter) => (
              <label
                key={parameter.parameterId}
                className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[0.85fr_1.1fr_1.25fr_0.6fr_0.9fr_0.55fr] lg:items-center"
              >
                <span className="text-sm font-semibold text-slate-500">
                  {parameter.sectionName ?? "-"}
                </span>

                <span>
                  <span className="text-sm font-bold text-slate-900">
                    {parameter.parameterName}
                  </span>
                  {parameter.required && (
                    <span className="ml-1 text-sm font-bold text-red-500">
                      *
                    </span>
                  )}
                </span>

                <ResultValueInput
                  parameter={parameter}
                  value={values[parameter.parameterId] ?? ""}
                  disabled={isVerified}
                  onChange={(value) =>
                    setParameterValue(parameter.parameterId, value)
                  }
                />

                <span className="text-sm font-semibold text-slate-600">
                  {parameter.unit ?? "-"}
                </span>

                <span className="text-sm text-slate-500">
                  {parameter.referenceRange ?? "-"}
                </span>

                <SourceBadge parameter={parameter} />
              </label>
            ))}
          </>
        )}
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-slate-900">Remarks</span>
        <textarea
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          disabled={isVerified}
          rows={3}
          className="resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:text-slate-500"
          placeholder="Optional remarks"
        />
      </label>

      {isLoadingReport && (
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
          <Spinner size="sm" />
          Loading report preview...
        </div>
      )}

      {report && <LabResultReportPreview report={report} />}

      <LabReportActionsPanel
        actions={reportActions}
        status={reportActionStatus}
        currentFileUrl={currentReportFileUrl}
        isDownloading={isDownloadingReport}
        isUploading={isUploadingReportFile}
        onDownload={onDownloadReport}
        onUpload={onUploadReport}
      />
    </>
  );
}
