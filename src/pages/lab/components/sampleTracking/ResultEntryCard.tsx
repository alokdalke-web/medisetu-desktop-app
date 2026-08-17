import {
  addToast,
  Button,
  Spinner,
} from "@heroui/react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  FiFileText,
  FiSettings,
} from "react-icons/fi";

import {
  getLabApiErrorMessage,
  useDownloadLabResultReportMutation,
  useSaveLabResultMutation,
  useVerifyLabResultMutation,
  type LabReportActions,
  type LabResultReport,
  type LabResultSaveResponse,
  type LabResultTemplate,
} from "../../../../redux/api/labAssistantApi";
import { reportTemplateScopeLabel } from "./trackingUtils";
import {
  useGetLabReportTemplateQuery,
  useListLabReportTemplatesQuery,
} from "../../../../redux/api/labReportTemplateApi";

import { buildInitialValues } from "./result-entry/fieldHelpers";
import { ResultReportPreviewModal } from "./result-entry/ResultReportPreviewModal";
import { ResultEntryConfirmModals } from "./result-entry/ResultEntryConfirmModals";
import { ResultEntryManageFieldsPanel } from "./result-entry/ResultEntryManageFieldsPanel";
import { ResultEntryValuesPanel } from "./result-entry/ResultEntryValuesPanel";
import { useResultFieldManagement } from "./result-entry/useResultFieldManagement";
export { ResultNotAvailablePlaceholder } from "./result-entry/ResultNotAvailablePlaceholder";

export function ResultEntryCard({
  isResultStageAvailable,
  canEnter,
  template,
  report: initialReport,
  isLoadingTemplate,
  appointmentTestId,
  appointmentTest,
  onSaved,
  onTemplateUpdated,
}: {
  isResultStageAvailable: boolean;
  canEnter: boolean;
  template: LabResultTemplate | null;
  report: LabResultReport | null;
  isLoadingTemplate: boolean;
  appointmentTestId: string;
  testName?: string;
  appointmentTest?: any;
  onSaved?: (saved?: LabResultSaveResponse) => void | Promise<void>;
  onTemplateUpdated?: () => void | Promise<void>;
}) {

  const [values, setValues] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const [initialRemarks, setInitialRemarks] = useState("");
  const [savedResultId, setSavedResultId] = useState<string | null>(null);
  const [, setSavedStatus] = useState<string | null>(null);
  const [showConfirmSaveModal, setShowConfirmSaveModal] = useState(false);
  const [showReEditConfirmModal, setShowReEditConfirmModal] = useState(false);
  const [showUploadConfirmModal, setShowUploadConfirmModal] = useState(false);
  const [isReEditAcknowledged, setIsReEditAcknowledged] = useState(false);
  const [isUploadAcknowledged, setIsUploadAcknowledged] = useState(false);
  const [initialLoadedValues, setInitialLoadedValues] = useState<Record<string, string>>({});
  const [report, setReport] = useState<LabResultReport | null>(null);
  const [, setReportActions] = useState<LabReportActions | null>(null);
  const [uploadedReportUrl, setUploadedReportUrl] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);


  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isEditModeOverride, setIsEditModeOverride] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const { data: visualTemplateConfig } = useGetLabReportTemplateQuery();
  const { data: templatesList } = useListLabReportTemplatesQuery();

  // Same display name the Report Template designer shows for this layout,
  // so the report preview never disagrees with the settings page about
  // what the lab actually picked.
  const templateDisplayName = templatesList?.data?.find(
    (tmpl) => tmpl.id === (visualTemplateConfig?.data?.templateName || "template1"),
  )?.displayName;

  // If report is null, but template?.resultId or appointmentTestResultId is present,
  // we can construct a client-side fallback LabResultReport object so that the
  // preview and edit buttons are available.
  const appointmentTestResultId =
    appointmentTest?.resultId ??
    appointmentTest?.labResultId ??
    appointmentTest?.latestResultId ??
    null;

  const effectiveReport = useMemo(() => {
    if (report) return report;
    const resultId = appointmentTestResultId || template?.resultId || savedResultId;
    if (!resultId) return null;

    const fallbackValues = template?.parameters.map(param => ({
      parameterId: param.parameterId,
      sectionName: param.sectionName,
      parameterName: param.parameterName,
      displayName: param.parameterName,
      originalParameterName: param.originalParameterName || null,
      sourceType: param.sourceType,
      isCustom: param.isCustom,
      inputType: param.inputType,
      sortOrder: param.sortOrder,
      isRequired: param.isRequired,
      value: values[param.parameterId] || param.value || "",
      unit: param.unit,
      referenceRange: param.referenceRange,
      flag: null,
    })) || [];

    const fallback: LabResultReport = {
      id: resultId,
      patient: appointmentTest?.patientName || "-",
      doctor: appointmentTest?.doctorName || "-",
      clinic: "-",
      testName: appointmentTest?.testName || template?.testName || "-",
      templateName: template?.templateName || "-",
      sampleType: template?.sampleType || null,
      status: template?.resultStatus || appointmentTest?.workflowStatus || "Completed",
      remarks: remarks || template?.resultRemarks || null,
      values: fallbackValues,
      verifiedBy: null,
      verifiedAt: null,
      generatedAt: null,
      reportGenerated: false,
      pdfUrl: null,
      reportActions: null,
      raw: null,
    };
    return fallback;
  }, [report, appointmentTestResultId, template, savedResultId, appointmentTest, values, remarks]);

  const isEditable = canEnter && (!effectiveReport || isEditModeOverride);

  const previewParameters = useMemo(() => {
    if (effectiveReport && effectiveReport.values && effectiveReport.values.length > 0) {
      return effectiveReport.values.map(val => ({
        parameterId: val.parameterId || "",
        parameterName: val.displayName || val.parameterName || "",
        sectionName: val.sectionName,
        value: val.value || "",
        unit: val.unit || "",
        referenceRange: val.referenceRange || "",
      })).filter(p => p.value.trim() !== "");
    }

    if (template && template.parameters) {
      return template.parameters.map(param => ({
        parameterId: param.parameterId,
        parameterName: param.parameterName,
        sectionName: param.sectionName,
        value: values[param.parameterId] || "",
        unit: param.unit || "",
        referenceRange: param.referenceRange || "",
      })).filter(p => p.value.trim() !== "");
    }

    return [];
  }, [effectiveReport, template, values]);

  const hasExistingUploadedReport = Boolean(
    uploadedReportUrl ||
    effectiveReport?.pdfUrl ||
    (effectiveReport as any)?.downloadUrl ||
    appointmentTest?.reportPdf,
  );

  const handleRequestEditResult = () => {
    setIsReEditAcknowledged(false);
    setShowReEditConfirmModal(true);
  };

  const handleConfirmEditResult = () => {
    setShowReEditConfirmModal(false);
    setIsReEditAcknowledged(false);
    setIsEditModeOverride(true);
    addToast({
      title: "Editing enabled",
      description: "Review the values carefully and save again only if a correction is required.",
      color: "primary",
    });
  };

  const handleRequestGeneratedReportUpload = () => {
    if (!appointmentTestId || !appointmentTest) {
      addToast({
        title: "Report upload unavailable",
        description: "Could not find the lab order for this report.",
        color: "warning",
      });
      return;
    }

    if (previewParameters.length === 0) {
      addToast({
        title: "No report values",
        description: "Save at least one result value before uploading the report.",
        color: "warning",
      });
      return;
    }

    setIsUploadAcknowledged(false);
    setShowUploadConfirmModal(true);
  };

  const [saveResult, { isLoading: isSaving }] = useSaveLabResultMutation();
  const [downloadReport, { isLoading: isDownloadingReport }] = useDownloadLabResultReportMutation();
  const [, { isLoading: isVerifying }] = useVerifyLabResultMutation();
  const {
    isManagingFields,
    openManageFields,
    closeManageFields,
    parameterToDelete,
    setParameterToDelete,
    fieldForm,
    setFieldForm,
    fieldActionId,
    managedParameters,
    isLoadingManagedParameters,
    isRefreshingFields,
    manageFieldSearch,
    setManageFieldSearch,
    manageFieldFilter,
    setManageFieldFilter,
    isSavingField,
    isMutatingField,
    managedStatsText,
    visibleManagedParameters,
    handleFieldFormSubmit,
    deleteCustomParameter,
    performDeleteCustomParameter,
    hideDefaultParameter,
    unhideDefaultParameter,
    resetDefaultParameter,
  } = useResultFieldManagement({
    template,
    appointmentTestId,
    report,
    savedResultId,
    isEditable,
    onTemplateUpdated,
    setReport,
    setReportActions,
    setUploadedReportUrl,
  });

  // Applies a freshly rendered report URL to local state so "View Report" /
  // "Download PDF" always point at the backend's template-rendered PDF —
  // never a client-built blob — and mirrors what the backend already saved
  // onto the lab order's `reportPdf` field.
  const applyGeneratedReportUrl = (generatedUrl: string) => {
    setUploadedReportUrl(generatedUrl);
    setReport((prev) =>
      prev
        ? {
          ...prev,
          pdfUrl: generatedUrl,
          reportGenerated: true,
        }
        : prev,
    );
  };

  const resolveReportDownloadApiUrl = () => {
    const resultId = effectiveReport?.id || savedResultId;
    return (
      effectiveReport?.reportActions?.downloadApiUrl ||
      (resultId ? `/lab/results/${resultId}/report` : null)
    );
  };

  const handleDownload = async () => {
    const existingUrl =
      effectiveReport?.pdfUrl ||
      (effectiveReport as any)?.downloadUrl ||
      appointmentTest?.reportPdf;

    if (existingUrl) {
      window.open(existingUrl, "_blank");
      return;
    }

    const downloadApiUrl = resolveReportDownloadApiUrl();
    if (!downloadApiUrl) {
      addToast({
        title: "Report not ready",
        description: "Save the result before downloading the report.",
        color: "warning",
      });
      return;
    }

    try {
      const res = await downloadReport({ downloadApiUrl }).unwrap();
      const generatedUrl = res.pdfUrl || res.downloadUrl;

      if (!generatedUrl) {
        addToast({
          title: "Report unavailable",
          description: "The server did not return a report file.",
          color: "danger",
        });
        return;
      }

      applyGeneratedReportUrl(generatedUrl);
      window.open(generatedUrl, "_blank");

      if (onSaved) {
        await onSaved();
      }
    } catch (err) {
      addToast({
        title: "Download failed",
        description: getLabApiErrorMessage(err, "Could not download the report."),
        color: "danger",
      });
    }
  };

  const handleUploadGeneratedReport = async () => {
    if (isDownloadingReport) {
      return;
    }

    if (!appointmentTestId || !appointmentTest) {
      addToast({
        title: "Report upload unavailable",
        description: "Could not find the lab order for this report.",
        color: "warning",
      });
      return;
    }

    if (previewParameters.length === 0) {
      addToast({
        title: "No report values",
        description: "Save at least one result value before uploading the report.",
        color: "warning",
      });
      return;
    }

    const downloadApiUrl = resolveReportDownloadApiUrl();
    if (!downloadApiUrl) {
      addToast({
        title: "Report not ready",
        description: "Save the result before generating the report.",
        color: "warning",
      });
      return;
    }

    try {
      const res = await downloadReport({ downloadApiUrl }).unwrap();
      const generatedUrl = res.pdfUrl || res.downloadUrl;

      if (!generatedUrl) {
        throw new Error("The server did not return a report file.");
      }

      applyGeneratedReportUrl(generatedUrl);

      addToast({
        title: "Report generated",
        description: "The report was generated from your saved template and is now available.",
        color: "success",
      });
      setShowUploadConfirmModal(false);
      setIsUploadAcknowledged(false);
      setIsPreviewModalOpen(false);

      if (onSaved) {
        await onSaved();
      }
    } catch (err) {
      addToast({
        title: "Report generation failed",
        description: getLabApiErrorMessage(err, "Could not generate the report."),
        color: "danger",
      });
    }
  };



  useEffect(() => {
    setReport(initialReport);
    if (initialReport) {
      setSavedResultId(initialReport.id);
      setSavedStatus(initialReport.status);
      setIsVerified(initialReport.status?.toUpperCase() === "VERIFIED");
      setRemarks(initialReport.remarks ?? "");
      setInitialRemarks(initialReport.remarks ?? "");
      setReportActions(initialReport.reportActions ?? null);
      setUploadedReportUrl(initialReport.pdfUrl ?? null);
    } else {
      setSavedResultId(null);
      setSavedStatus(null);
      setIsVerified(false);
      setRemarks("");
      setInitialRemarks("");
      setReportActions(null);
      setUploadedReportUrl(null);
    }
  }, [initialReport]);

  useEffect(() => {
    if (!template) {
      setValues({});
      setInitialLoadedValues({});
      if (!initialReport) {
        setSavedResultId(null);
        setSavedStatus(null);
        setRemarks("");
        setInitialRemarks("");
      }
      return;
    }

    if ((template.parameters ?? []).length === 0) {
      openManageFields();
    }

    const initialValues = buildInitialValues(template.parameters);
    let loaded = { ...initialValues };

    if (initialReport && initialReport.values && initialReport.values.length > 0) {
      const mappedValues = initialReport.values.reduce<Record<string, string>>((acc, val) => {
        if (val.parameterId) {
          acc[val.parameterId] = val.value || "";
        }
        return acc;
      }, {});
      loaded = { ...loaded, ...mappedValues };
    }

    setValues(loaded);
    setInitialLoadedValues(loaded);
    if (!initialReport) {
      setSavedResultId(template.resultId ?? null);
      setSavedStatus(template.resultStatus ?? null);
      setRemarks(template.resultRemarks ?? "");
      setInitialRemarks(template.resultRemarks ?? "");
    }
  }, [template, initialReport, openManageFields]);

  const isDirty = useMemo(() => {
    if (remarks.trim() !== initialRemarks.trim()) return true;

    const allKeys = new Set([...Object.keys(values), ...Object.keys(initialLoadedValues)]);
    for (const key of allKeys) {
      if ((values[key] ?? "").trim() !== (initialLoadedValues[key] ?? "").trim()) {
        return true;
      }
    }
    return false;
  }, [values, initialLoadedValues, remarks, initialRemarks]);

  const setParameterValue = (parameterId: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [parameterId]: value,
    }));
  };









































































































































































































































































  const save = async (status: "Completed" | "Draft") => {
    if (!appointmentTestId) {
      addToast({
        title: "Missing lab order",
        description: "Could not find the lab order for this result.",
        color: "warning",
      });
      return;
    }

    if (!template) {
      addToast({
        title: "Template not ready",
        description: "Please wait for the result template to load.",
        color: "warning",
      });
      return;
    }

    if (status === "Completed") {
      const missing = template.parameters.find(
        (parameter) =>
          parameter.required && !values[parameter.parameterId]?.trim(),
      );

      if (missing) {
        addToast({
          title: "Required result missing",
          description: `${missing.parameterName} is required.`,
          color: "warning",
        });
        return;
      }
    }

    const resultValuesInput = template.parameters.flatMap((parameter) => {
      const value = values[parameter.parameterId]?.trim() ?? "";
      if (!value) return [];

      return {
        parameterId: parameter.parameterId,
        value,
      };
    });

    try {
      const saved = await saveResult({
        appointmentTestId,
        templateId: template.id,
        status,
        remarks: remarks.trim() || undefined,
        values: resultValuesInput,
      }).unwrap();

      if (saved.id) setSavedResultId(saved.id);
      setSavedStatus(saved.status ?? status);
      setInitialLoadedValues({ ...values });
      setInitialRemarks(remarks);
      setIsEditModeOverride(false);

      const nextActions = saved.reportActions ?? saved.report?.reportActions ?? null;
      setReportActions(nextActions);
      setUploadedReportUrl(
        nextActions?.currentFileUrl ?? saved.pdfUrl ?? saved.report?.pdfUrl ?? null,
      );

      if (saved.report) {
        setReport(saved.report);
        setIsVerified(saved.report.status?.toUpperCase() === "VERIFIED");
      } else {
        setIsVerified(false);
      }

      addToast({
        title: status === "Draft" ? "Draft saved" : "Result saved",
        description:
          status === "Draft"
            ? "The lab result draft was saved successfully."
            : "The lab result was completed successfully.",
        color: "success",
      });

      if (status === "Completed") {
        setIsPreviewModalOpen(true);
      }

      if (onSaved) {
        await onSaved(saved);
      }
    } catch (err) {
      addToast({
        title: status === "Draft" ? "Draft save failed" : "Result save failed",
        description: getLabApiErrorMessage(err, "Could not save the result."),
        color: "danger",
      });
    }
  };

  const handleSaveCompletedPress = () => {
    if (!appointmentTestId) {
      addToast({
        title: "Missing lab order",
        description: "Could not find the lab order for this result.",
        color: "warning",
      });
      return;
    }

    if (!template) {
      addToast({
        title: "Template not ready",
        description: "Please wait for the result template to load.",
        color: "warning",
      });
      return;
    }

    const missing = template.parameters.find(
      (parameter) =>
        parameter.required && !values[parameter.parameterId]?.trim(),
    );

    if (missing) {
      addToast({
        title: "Required result missing",
        description: `${missing.parameterName} is required.`,
        color: "warning",
      });
      return;
    }

    setShowConfirmSaveModal(true);
  };



  const canUseTemplate =
    Boolean(appointmentTestId) &&
    Boolean(template) &&
    (template?.parameters ?? []).length > 0;
  const isGeneratedReportUploadLoading = isDownloadingReport;
  const isReportActionLoading = isDownloadingReport;

  const reportValues = effectiveReport?.values ?? [];
  const hasReportValues = reportValues.length > 0;
  const displayedName = effectiveReport?.templateName ?? template?.templateName ?? "Result Template";
  const displayedTemplateName = template
    ? `${displayedName} (${reportTemplateScopeLabel(template)})`
    : displayedName;
  const displayedSampleType = effectiveReport?.sampleType ?? template?.sampleType ?? null;
  const displayedCount = hasReportValues ? reportValues.length : (template?.parameters.length ?? 0);

























































  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="rounded-xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_10px_28px_rgba(15,23,42,0.045)]"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-left">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
            <FiFileText />
          </div>
          <h2 className=" truncate text-lg font-semibold leading-tight text-slate-950">
            Result Entry
          </h2>
        </div>

        {template && isEditable && (
          <div className="inline-flex w-fit items-center rounded-xl border border-slate-200/80 bg-white p-0.5 shadow-sm">
            <Button
              size="sm"
              radius="full"
              variant={!isManagingFields ? "solid" : "light"}
              color={!isManagingFields ? "primary" : "default"}
              onPress={closeManageFields}
              className={[
                "h-7 px-3.5 text-[10.5px] font-bold transition-all duration-200 active:scale-95",
                !isManagingFields
                  ? "bg-primary text-white shadow-sm hover:bg-primary-active"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
            >
              Result Entry
            </Button>

            <Button
              size="sm"
              radius="full"
              variant={isManagingFields ? "solid" : "light"}
              color={isManagingFields ? "primary" : "default"}
              onPress={openManageFields}
              startContent={<FiSettings className="text-[11px]" />}
              className={[
                "h-7 px-3.5 text-[10.5px] font-bold transition-all duration-200 active:scale-95",
                isManagingFields
                  ? "bg-primary text-white shadow-sm hover:bg-primary-active"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
            >
              Manage Fields
            </Button>
          </div>
        )}
      </div>

      {isResultStageAvailable && (
        <div className="mt-5">
          {isLoadingTemplate ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold text-slate-500 shadow-sm">
              <Spinner size="sm" color="primary" />
              Loading template...
            </div>
          ) : template || hasReportValues ? (
            <>
              {isManagingFields ? (
                <ResultEntryManageFieldsPanel
                  manageFieldSearch={manageFieldSearch}
                  setManageFieldSearch={setManageFieldSearch}
                  manageFieldFilter={manageFieldFilter}
                  setManageFieldFilter={setManageFieldFilter}
                  isRefreshingFields={isRefreshingFields}
                  fieldForm={fieldForm}
                  setFieldForm={setFieldForm}
                  isSavingField={isSavingField}
                  isMutatingField={isMutatingField}
                  handleFieldFormSubmit={handleFieldFormSubmit}
                  isLoadingManagedParameters={isLoadingManagedParameters}
                  managedParameters={managedParameters}
                  visibleManagedParameters={visibleManagedParameters}
                  fieldActionId={fieldActionId}
                  deleteCustomParameter={deleteCustomParameter}
                  hideDefaultParameter={hideDefaultParameter}
                  unhideDefaultParameter={unhideDefaultParameter}
                  resetDefaultParameter={resetDefaultParameter}
                  managedStatsText={managedStatsText}
                />
              ) : (
                <ResultEntryValuesPanel
                  effectiveReport={effectiveReport}
                  report={report}
                  template={template}
                  isEditModeOverride={isEditModeOverride}
                  isDetailsExpanded={isDetailsExpanded}
                  setIsDetailsExpanded={setIsDetailsExpanded}
                  displayedTemplateName={displayedTemplateName}
                  displayedSampleType={displayedSampleType}
                  displayedCount={displayedCount}
                  hasReportValues={hasReportValues}
                  reportValues={reportValues}
                  isEditable={isEditable}
                  values={values}
                  isVerified={isVerified}
                  setParameterValue={setParameterValue}
                  canEnter={canEnter}
                  setIsPreviewModalOpen={setIsPreviewModalOpen}
                  handleRequestEditResult={handleRequestEditResult}
                  handleSaveCompletedPress={handleSaveCompletedPress}
                  isSaving={isSaving}
                  canUseTemplate={canUseTemplate}
                  isVerifying={isVerifying}
                  isReportActionLoading={isReportActionLoading}
                  isDirty={isDirty}
                  setIsEditModeOverride={setIsEditModeOverride}
                  setValues={setValues}
                  initialLoadedValues={initialLoadedValues}
                  setRemarks={setRemarks}
                  initialRemarks={initialRemarks}
                />
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-500 font-bold">
              Result template could not be loaded.
            </div>
          )}
        </div>
      )}
      <ResultEntryConfirmModals
        showConfirmSaveModal={showConfirmSaveModal}
        setShowConfirmSaveModal={setShowConfirmSaveModal}
        isSaving={isSaving}
        saveCompleted={() => save("Completed")}
        showReEditConfirmModal={showReEditConfirmModal}
        setShowReEditConfirmModal={setShowReEditConfirmModal}
        isReEditAcknowledged={isReEditAcknowledged}
        setIsReEditAcknowledged={setIsReEditAcknowledged}
        handleConfirmEditResult={handleConfirmEditResult}
        showUploadConfirmModal={showUploadConfirmModal}
        setShowUploadConfirmModal={setShowUploadConfirmModal}
        isGeneratedReportUploadLoading={isGeneratedReportUploadLoading}
        isUploadAcknowledged={isUploadAcknowledged}
        setIsUploadAcknowledged={setIsUploadAcknowledged}
        handleUploadGeneratedReport={handleUploadGeneratedReport}
        hasExistingUploadedReport={hasExistingUploadedReport}
        parameterToDelete={parameterToDelete}
        setParameterToDelete={setParameterToDelete}
        performDeleteCustomParameter={performDeleteCustomParameter}
      />

      <ResultReportPreviewModal
        isOpen={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        report={effectiveReport}
        appointmentTest={appointmentTest}
        template={template}
        remarks={remarks}
        previewParameters={previewParameters}
        onDownload={handleDownload}
        isDownloading={isDownloadingReport}
        onUploadGeneratedReport={handleRequestGeneratedReportUpload}
        isUploadingGeneratedReport={isGeneratedReportUploadLoading}
        visualTemplate={visualTemplateConfig?.data}
        templateDisplayName={templateDisplayName}
      />
    </motion.section>
  );
}
