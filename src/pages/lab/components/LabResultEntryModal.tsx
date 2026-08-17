import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Spinner,
} from "@heroui/react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheckCircle, FiSettings, FiSave } from "react-icons/fi";
import CompactSelectDropdown from "../../../components/shared/CompactSelectDropdown";
import { LabUnitSelect } from "./LabUnitSelect";

const inputTypes = ["number", "text", "long_text", "options"];
const displayInputType = (type: string) => {
  switch (type) {
    case "number": return "Number";
    case "text": return "Short Text";
    case "long_text": return "Paragraph";
    case "options": return "Options";
    default: return type;
  }
};

import {
  useAddLabCustomFieldMutation,
  useUpdateLabCustomFieldMutation,
  useDeleteLabCustomFieldMutation,
  useOverrideLabDefaultFieldMutation,
  useHideLabDefaultFieldMutation,
  useUnhideLabDefaultFieldMutation,
  useResetLabDefaultFieldOverrideMutation,
} from "../../../redux/api/labAssistantApi";

import {
  getLabApiErrorMessage,
  useDownloadLabResultReportMutation,
  useLazyGetLabResultReportQuery,
  useLazyGetLabResultTemplateQuery,
  useSaveLabResultMutation,
  useUploadLabResultReportMutation,
  useVerifyLabResultMutation,
  type LabReportActions,
  type LabResultReport,
  type LabResultSaveResponse,
  type LabResultTemplate,
  type LabResultTemplateParameter,
} from "../../../redux/api/labAssistantApi";
import {
  getLabReportDownloadErrorMessage,
  getLabReportUploadAccept,
  isAllowedLabReportUploadFile,
  isCompletedOrVerifiedStatus,
} from "./labReportActions";
import { LabResultConfirmModals } from "./lab-result-entry/LabResultConfirmModals";
import { LabResultManageFieldsPanel } from "./lab-result-entry/LabResultManageFieldsPanel";
import { LabResultModalFooter } from "./lab-result-entry/LabResultModalFooter";
import { LabResultValuesPanel } from "./lab-result-entry/LabResultValuesPanel";
import { useLabResultFieldManagement } from "./lab-result-entry/useLabResultFieldManagement";
import { buildInitialValues } from "./sampleTracking/result-entry/fieldHelpers";

const fieldInputClass = "flex-1 border-default-200";
const fieldTextareaClass = "flex-1 border-default-200 min-h-[60px]";
const isTruthyResultValue = (val: unknown) => {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return ["true", "yes", "1", "positive", "reactive"].includes(val.toLowerCase());
  return false;
};

type FieldFormMode = "add-custom" | "edit-custom" | "override-default";
type FieldFormState = {
  mode: FieldFormMode;
  parameterId?: string;
  parameterName: string;
  originalParameterName?: string;
  unit: string;
  referenceRange: string;
  inputType: string;
  isRequired?: boolean;
  isHidden: boolean;
};

type LabResultEntryModalProps = {
  isOpen: boolean;
  appointmentTestId?: string;
  testName?: string;
  templateCode?: string | null;
  initialTemplate?: LabResultTemplate | null;
  existingResultId?: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: (saved?: LabResultSaveResponse) => void | Promise<void>;
  onTemplateUpdated?: () => void | Promise<void>;
  onTemplateReadyRace?: () => Promise<boolean>;
};

function reportTemplateScopeLabel(template: LabResultTemplate) {
  return template.labId ? "My Lab" : "Default";
}

function isResultTemplateReadyRaceError(error: unknown) {
  const payload = (error as { data?: { status?: unknown } })?.data;
  const status = String(
    (error as { status?: unknown })?.status ?? payload?.status ?? "",
  );
  const message = getLabApiErrorMessage(error, "");

  return status === "400" && /sample is ready/i.test(message);
}

function ResultValueInput({
  parameter,
  value,
  disabled,
  onChange,
}: {
  parameter: LabResultTemplateParameter;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (parameter.inputType === "textarea") {
    return (
      <textarea
        value={value}
        disabled={disabled}
        rows={2}
        onChange={(event) => onChange(event.target.value)}
        className={fieldTextareaClass}
        placeholder="Enter value"
      />
    );
  }

  if (parameter.inputType === "boolean") {
    return (
      <label className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-slate-50/50 hover:bg-slate-100 px-4 text-xs font-semibold text-slate-700 cursor-pointer transition-all duration-150 active:scale-95 shadow-sm">
        <input
          type="checkbox"
          checked={isTruthyResultValue(value)}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.checked ? "true" : "false")
          }
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 disabled:cursor-not-allowed transition duration-150"
        />
        <span>{isTruthyResultValue(value) ? "Yes" : "No"}</span>
      </label>
    );
  }

  if (parameter.inputType === "select" && parameter.options.length > 0) {
    return (
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={fieldInputClass}
      >
        <option value="">Select value</option>
        {parameter.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={parameter.inputType === "date" ? "date" : "text"}
      inputMode={parameter.inputType === "number" ? "decimal" : undefined}
      value={value}
      disabled={disabled}
      onChange={(event) => {
        let val = event.target.value;
        if (parameter.inputType === "number") {
          val = val.replace(/[^0-9.-]/g, "");
          if (val.startsWith("-")) {
            val = "-" + val.slice(1).replace(/-/g, "");
          } else {
            val = val.replace(/-/g, "");
          }
          const parts = val.split(".");
          if (parts.length > 2) {
            val = parts[0] + "." + parts.slice(1).join("");
          }
        }
        onChange(val.slice(0, 10));
      }}
      maxLength={10}
      className={fieldInputClass}
      placeholder="Enter value"
    />
  );
}

function fieldFormTitle(mode: FieldFormMode) {
  if (mode === "add-custom") return "Add Custom Field";
  if (mode === "edit-custom") return "Edit Custom Field";
  return "Override Default Field";
}

function FieldFormPanel({
  form,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: {
  form: FieldFormState;
  isSaving: boolean;
  onChange: (form: FieldFormState) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const setValue = <K extends keyof FieldFormState>(
    key: K,
    value: FieldFormState[K],
  ) => onChange({ ...form, [key]: value });

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-primary/15 bg-primary/5 p-4"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-950">
            {fieldFormTitle(form.mode)}
          </h4>
          {form.originalParameterName && (
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Default: {form.originalParameterName}
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          radius="full"
          variant="flat"
          onPress={onCancel}
          isDisabled={isSaving}
          className="font-semibold"
        >
          Cancel
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">Parameter Name</span>
          <input
            value={form.parameterName}
            onChange={(event) => setValue("parameterName", event.target.value)}
            className={fieldInputClass}
            placeholder="Test name (e.g. Hemoglobin)"
            required
            maxLength={100}
          />
        </label>

        <div className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">Input</span>
          <CompactSelectDropdown
            ariaLabel="Input type"
            value={form.inputType}
            options={inputTypes.map((inputType) => ({
              value: inputType,
              label: displayInputType(inputType),
            }))}
            onChange={(inputType) => setValue("inputType", inputType)}
            triggerClassName={fieldInputClass}
          />
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">Unit</span>
          <LabUnitSelect
            key={`${form.mode}-${form.parameterId ?? "new"}-unit`}
            value={form.unit}
            onChange={(unit: string) => setValue("unit", unit)}
            triggerClassName={fieldInputClass}
            customInputClassName={fieldInputClass}
            customPlaceholder="Unit (e.g. mg/dL)"
            maxLength={20}
          />
        </div>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">
            Reference Range
          </span>
          <input
            value={form.referenceRange}
            onChange={(event) => setValue("referenceRange", event.target.value)}
            className={fieldInputClass}
            placeholder="Reference range (e.g. 70 - 100)"
            maxLength={50}
            required
          />
        </label>
      </div>

      <label className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={form.isRequired}
          onChange={(event) => setValue("isRequired", event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
        />
        Required field
      </label>

      <div className="mt-4 flex justify-end">
        <Button
          type="submit"
          color="primary"
          radius="full"
          isLoading={isSaving}
          startContent={!isSaving && <FiSave />}
          className="px-5 font-semibold text-white"
        >
          Save Field
        </Button>
      </div>
    </form>
  );
}

export function LabResultEntryModal({
  isOpen,
  appointmentTestId,
  testName,
  initialTemplate,
  existingResultId,
  onOpenChange,
  onSaved,
  onTemplateUpdated,
  onTemplateReadyRace,
}: LabResultEntryModalProps) {
  const reportUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [template, setTemplate] = useState<LabResultTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const [savedResultId, setSavedResultId] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [report, setReport] = useState<LabResultReport | null>(null);
  const [reportActions, setReportActions] =
    useState<LabReportActions | null>(null);
  const [uploadedReportUrl, setUploadedReportUrl] = useState<string | null>(
    null,
  );
  const [isVerified, setIsVerified] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [showConfirmCompleteModal, setShowConfirmCompleteModal] =
    useState(false);

  const [loadTemplate] = useLazyGetLabResultTemplateQuery();
  const [loadReport] = useLazyGetLabResultReportQuery();
  const [saveResult, { isLoading: isSaving }] = useSaveLabResultMutation();
  const [downloadReport, { isLoading: isDownloadingReport }] =
    useDownloadLabResultReportMutation();
  const [uploadReportFile, { isLoading: isUploadingReportFile }] =
    useUploadLabResultReportMutation();
  const [verifyResult, { isLoading: isVerifying }] =
    useVerifyLabResultMutation();
  const [addCustomField, { isLoading: isAddingCustomField }] =
    useAddLabCustomFieldMutation();
  const [updateCustomField, { isLoading: isUpdatingCustomField }] =
    useUpdateLabCustomFieldMutation();
  const [deleteCustomField, { isLoading: isDeletingCustomField }] =
    useDeleteLabCustomFieldMutation();
  const [overrideDefaultField, { isLoading: isOverridingDefaultField }] =
    useOverrideLabDefaultFieldMutation();
  const [hideDefaultField, { isLoading: isHidingDefaultField }] =
    useHideLabDefaultFieldMutation();
  const [unhideDefaultField, { isLoading: isUnhidingDefaultField }] =
    useUnhideLabDefaultFieldMutation();
  const [resetDefaultFieldOverride, { isLoading: isResettingDefaultField }] =
    useResetLabDefaultFieldOverrideMutation();

  const templateTitle = useMemo(() => {
    const title =
      template?.templateName ||
      template?.templateCode ||
      template?.testName ||
      "Result Template";

    if (template?.templateName && template?.templateCode) {
      return `${template.templateName} (${template.templateCode}) (${reportTemplateScopeLabel(template)})`;
    }

    return template
      ? `${title} (${reportTemplateScopeLabel(template)})`
      : title;
  }, [template]);

  const setParameterValue = (parameterId: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [parameterId]: value,
    }));
  };

  const reloadTemplate = async (options: { silent?: boolean } = {}) => {
    if (!appointmentTestId) return;

    if (!options.silent) {
      setIsLoadingTemplate(true);
    }

    try {
      const nextTemplate = await loadTemplate({ appointmentTestId }).unwrap();
      setTemplate(nextTemplate);
      setValues((prev) => buildInitialValues(nextTemplate.parameters, prev));
      await onTemplateUpdated?.();
    } catch (err) {
      addToast({
        title: "Template refresh failed",
        description: getLabApiErrorMessage(
          err,
          "Could not refresh the result template.",
        ),
        color: "danger",
      });
    } finally {
      if (!options.silent) {
        setIsLoadingTemplate(false);
      }
    }
  };

  const refreshOpenResultReport = async (
    options: { silent?: boolean } = {},
  ) => {
    if (!report || !savedResultId) return;

    try {
      if (!options.silent) {
        setIsLoadingReport(true);
      }

      const nextReport = await loadReport({ resultId: savedResultId }).unwrap();
      setReport(nextReport);
      setReportActions(nextReport.reportActions);
      setUploadedReportUrl(
        nextReport.reportActions?.currentFileUrl ?? nextReport.pdfUrl ?? null,
      );
    } catch (err) {
      addToast({
        title: "Saved result refresh failed",
        description: getLabApiErrorMessage(
          err,
          "Could not refresh the saved result preview.",
        ),
        color: "danger",
      });
    } finally {
      if (!options.silent) {
        setIsLoadingReport(false);
      }
    }
  };

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
  } = useLabResultFieldManagement({
    isOpen,
    template,
    appointmentTestId,
    report,
    savedResultId,
    reloadTemplate,
    refreshOpenResultReport,
  });

  useEffect(() => {
    if (!isOpen) {
      setTemplate(null);
      setValues({});
      setRemarks("");
      setSavedResultId(null);
      setSavedStatus(null);
      setReport(null);
      setReportActions(null);
      setUploadedReportUrl(null);
      setIsVerified(false);
      setIsLoadingTemplate(false);
      setIsLoadingReport(false);
      setShowConfirmCompleteModal(false);
      return;
    }

    setSavedResultId(existingResultId ?? null);
    setSavedStatus(null);
    setIsVerified(false);
    setReport(null);
    setReportActions(null);
    setUploadedReportUrl(null);
    setFieldForm(null);
    setManageFieldSearch("");
    setManageFieldFilter("all");

    if (!appointmentTestId) return;

    let ignore = false;

    if (initialTemplate) {
      setTemplate(initialTemplate);
      setValues(buildInitialValues(initialTemplate.parameters));
      setIsLoadingTemplate(false);
      return;
    }

    setTemplate(null);
    setValues({});
    setIsLoadingTemplate(true);

    void loadTemplate({ appointmentTestId })
      .unwrap()
      .then((nextTemplate) => {
        if (ignore) return;
        setTemplate(nextTemplate);
        setValues(buildInitialValues(nextTemplate.parameters));
      })
      .catch(async (err) => {
        if (ignore) return;
        let visibleError = err;

        if (isResultTemplateReadyRaceError(err) && onTemplateReadyRace) {
          try {
            const shouldRetry = await onTemplateReadyRace();

            if (ignore) return;

            if (shouldRetry) {
              const nextTemplate = await loadTemplate({
                appointmentTestId,
              }).unwrap();

              if (ignore) return;

              setTemplate(nextTemplate);
              setValues(buildInitialValues(nextTemplate.parameters));
              return;
            }
          } catch (retryErr) {
            visibleError = retryErr;
          }
        }

        addToast({
          title: "Template load failed",
          description: getLabApiErrorMessage(
            visibleError,
            "Could not load the result template.",
          ),
          color: "danger",
        });
      })
      .finally(() => {
        if (!ignore) setIsLoadingTemplate(false);
      });

    return () => {
      ignore = true;
    };
  }, [
    appointmentTestId,
    existingResultId,
    initialTemplate,
    isOpen,
    loadTemplate,
    onTemplateReadyRace,
  ]);

  const viewReport = async (resultId = savedResultId) => {
    if (!resultId) {
      addToast({
        title: "Report unavailable",
        description: "Save the result before viewing the report.",
        color: "warning",
      });
      return;
    }

    try {
      setIsLoadingReport(true);
      const nextReport = await loadReport({ resultId }).unwrap();
      setReport(nextReport);
      setReportActions(nextReport.reportActions);
      setUploadedReportUrl(
        nextReport.reportActions?.currentFileUrl ?? nextReport.pdfUrl ?? null,
      );
    } catch (err) {
      addToast({
        title: "Report load failed",
        description: getLabApiErrorMessage(
          err,
          "Could not load the result report.",
        ),
        color: "danger",
      });
    } finally {
      setIsLoadingReport(false);
    }
  };

  const downloadGeneratedReport = async () => {
    if (!reportActions?.downloadApiUrl) {
      addToast({
        title: "Download unavailable",
        description: "The generated report download link is not available yet.",
        color: "warning",
      });
      return;
    }

    try {
      const download = await downloadReport({
        downloadApiUrl: reportActions.downloadApiUrl,
      }).unwrap();
      const targetUrl = download.pdfUrl ?? download.downloadUrl;

      if (!targetUrl) {
        addToast({
          title: "Report file not available",
          color: "warning",
        });
        return;
      }

      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      addToast({
        title: "Download failed",
        description: getLabReportDownloadErrorMessage(err),
        color: "danger",
      });
    }
  };

  const canUseTemplate = Boolean(appointmentTestId) && Boolean(template);
  const reportActionStatus = savedStatus ?? report?.status;
  const canUseReportUpload =
    Boolean(savedResultId) && isCompletedOrVerifiedStatus(reportActionStatus);

  const openReportUploadPicker = () => {
    if (!canUseReportUpload) {
      addToast({
        title: "Upload unavailable",
        description: "Complete or verify the result before uploading a report.",
        color: "warning",
      });
      return;
    }

    if (!reportActions?.uploadUrl) {
      addToast({
        title: "Upload unavailable",
        description: "The report upload link is not available yet.",
        color: "warning",
      });
      return;
    }

    reportUploadInputRef.current?.click();
  };

  const uploadSelectedReport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      if (!canUseReportUpload) {
        addToast({
          title: "Upload unavailable",
          description:
            "Complete or verify the result before uploading a report.",
          color: "warning",
        });
        return;
      }

      if (!reportActions?.uploadUrl) {
        addToast({
          title: "Upload unavailable",
          description: "The report upload link is not available yet.",
          color: "warning",
        });
        return;
      }

      if (!isAllowedLabReportUploadFile(file, reportActions)) {
        addToast({
          title: "Invalid report file",
          description: "Upload a PDF, JPG, JPEG, PNG, or WEBP report file.",
          color: "danger",
        });
        return;
      }

      const uploaded = await uploadReportFile({
        uploadUrl: reportActions.uploadUrl,
        uploadField: reportActions.uploadField,
        reportPdf: file,
      }).unwrap();

      const uploadedUrl =
        uploaded.uploadedReport?.url ??
        uploaded.reportActions?.currentFileUrl ??
        null;

      const nextActions =
        uploaded.reportActions ??
        (uploadedUrl
          ? { ...reportActions, currentFileUrl: uploadedUrl }
          : reportActions);

      setReportActions(nextActions);
      setUploadedReportUrl(uploadedUrl ?? nextActions.currentFileUrl);
      setReport((prev) =>
        prev
          ? {
              ...prev,
              pdfUrl: uploadedUrl ?? nextActions.currentFileUrl ?? prev.pdfUrl,
              reportActions: nextActions,
            }
          : prev,
      );

      addToast({
        title: "Lab report uploaded successfully",
        color: "success",
      });

      await onSaved?.({
        id: savedResultId,
        status: savedStatus,
        reportGenerated: report?.reportGenerated,
        pdfUrl: uploadedUrl ?? nextActions.currentFileUrl ?? report?.pdfUrl,
        generatedAt: report?.generatedAt,
        reportActions: nextActions,
        report,
        raw: uploaded.raw,
      });
    } catch (err) {
      addToast({
        title: "Upload failed",
        description: getLabApiErrorMessage(err, "Could not upload the report."),
        color: "danger",
      });
    } finally {
      event.target.value = "";
    }
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

    const resultValues = template.parameters.flatMap((parameter) => {
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
        values: resultValues,
      }).unwrap();

      if (saved.id) setSavedResultId(saved.id);
      setSavedStatus(saved.status ?? status);

      const nextActions =
        saved.reportActions ?? saved.report?.reportActions ?? null;

      setReportActions(nextActions);
      setUploadedReportUrl(
        nextActions?.currentFileUrl ??
          saved.pdfUrl ??
          saved.report?.pdfUrl ??
          null,
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
        onOpenChange(false);
      }

      await onSaved?.(saved);
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

    setShowConfirmCompleteModal(true);
  };

  const verify = async () => {
    if (!savedResultId) {
      addToast({
        title: "Verification unavailable",
        description: "Save the result before verifying it.",
        color: "warning",
      });
      return;
    }

    try {
      const verified = await verifyResult({ resultId: savedResultId }).unwrap();

      addToast({
        title: "Result verified",
        description: "The lab result was verified successfully.",
        color: "success",
      });

      setSavedStatus(verified.status ?? "Verified");
      setIsVerified(true);

      const nextActions =
        verified.reportActions ?? verified.report?.reportActions ?? null;

      setReportActions(nextActions);
      setUploadedReportUrl(
        nextActions?.currentFileUrl ??
          verified.pdfUrl ??
          verified.report?.pdfUrl ??
          null,
      );

      if (verified.report) setReport(verified.report);
      await onSaved?.(verified);
      if (!verified.report) await viewReport(savedResultId);
    } catch (err) {
      addToast({
        title: "Verification failed",
        description: getLabApiErrorMessage(err, "Could not verify the result."),
        color: "danger",
      });
    }
  };

  const canVerifyResult =
    Boolean(savedResultId) &&
    savedStatus?.toUpperCase() === "COMPLETED" &&
    !isVerified;

  const currentReportFileUrl =
    uploadedReportUrl ??
    reportActions?.currentFileUrl ??
    report?.pdfUrl ??
    null;

  const isReportActionLoading = isDownloadingReport || isUploadingReportFile;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="center"
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        classNames={{
          backdrop: "bg-slate-950/45 backdrop-blur-sm",
          base: "max-h-[92vh] overflow-hidden rounded-[2rem] border border-slate-200 shadow-2xl",
          closeButton:
            "right-5 top-5 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
        }}
      >
        <ModalContent>
          <ModalHeader className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
            <div className="flex w-full flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-lg font-bold text-slate-950">
                  Enter Result
                </span>
                <span className="mt-1 block text-xs font-medium text-slate-500">
                  {template
                    ? `Template: ${templateTitle}`
                    : "Loading result template"}
                  {testName ? ` - Ordered test: ${testName}` : ""}
                </span>
              </div>

              {template && (
                <div className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 p-1">
                  <Button
                    size="sm"
                    radius="full"
                    variant={!isManagingFields ? "solid" : "light"}
                    color={!isManagingFields ? "primary" : "default"}
                    onPress={closeManageFields}
                    className={[
                      "h-9 px-5 text-xs font-bold",
                      !isManagingFields
                        ? "text-white shadow-sm"
                        : "text-slate-600",
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
                    startContent={<FiSettings />}
                    className={[
                      "h-9 px-5 text-xs font-bold",
                      isManagingFields
                        ? "text-white shadow-sm"
                        : "text-slate-600",
                    ].join(" ")}
                  >
                    Manage Fields
                  </Button>
                </div>
              )}
            </div>
          </ModalHeader>

          <ModalBody className="gap-4 bg-white px-6 py-4">
            <input
              ref={reportUploadInputRef}
              type="file"
              accept={getLabReportUploadAccept(reportActions)}
              className="hidden"
              onChange={uploadSelectedReport}
            />

            {isLoadingTemplate ? (
              <div className="grid min-h-72 place-items-center rounded-3xl border border-slate-100 bg-slate-50 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" />
                  Loading result template...
                </span>
              </div>
            ) : template ? (
              <>
                <div className="rounded-3xl border border-primary/15 bg-primary/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <FiCheckCircle className="text-xl" />
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase text-primary">
                          Result Template
                        </p>
                        <h3 className="mt-1 text-base font-bold text-slate-950">
                          {templateTitle}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {testName
                            ? `Ordered test: ${testName}`
                            : "Ordered test: -"}
                          {" - "}
                          Sample type: {template.sampleType ?? "-"}
                        </p>
                      </div>
                    </div>

                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                      {template.parameters.length} parameters
                    </span>
                  </div>
                </div>

                {isManagingFields ? (
                  <LabResultManageFieldsPanel
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
                  />
                ) : (
                  <LabResultValuesPanel
                    template={template}
                    values={values}
                    isVerified={isVerified}
                    setParameterValue={setParameterValue}
                    remarks={remarks}
                    setRemarks={setRemarks}
                    isLoadingReport={isLoadingReport}
                    report={report}
                    reportActions={reportActions}
                    reportActionStatus={reportActionStatus}
                    currentReportFileUrl={currentReportFileUrl}
                    isDownloadingReport={isDownloadingReport}
                    isUploadingReportFile={isUploadingReportFile}
                    onDownloadReport={() => void downloadGeneratedReport()}
                    onUploadReport={openReportUploadPicker}
                  />
                )}
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Result template could not be loaded.
              </div>
            )}
          </ModalBody>

          <LabResultModalFooter
            isManagingFields={isManagingFields}
            managedStatsText={managedStatsText}
            isMutatingField={isMutatingField}
            onClose={() => onOpenChange(false)}
            closeManageFields={closeManageFields}
            isSaving={isSaving}
            isVerifying={isVerifying}
            isReportActionLoading={isReportActionLoading}
            savedResultId={savedResultId}
            viewReport={() => void viewReport()}
            isLoadingReport={isLoadingReport}
            canVerifyResult={canVerifyResult}
            verify={() => void verify()}
            canUseTemplate={canUseTemplate}
            isVerified={isVerified}
            saveDraft={() => void save("Draft")}
            handleSaveCompletedPress={handleSaveCompletedPress}
          />
        </ModalContent>
      </Modal>

      <LabResultConfirmModals
        parameterToDelete={parameterToDelete}
        setParameterToDelete={setParameterToDelete}
        performDeleteCustomParameter={performDeleteCustomParameter}
        showConfirmCompleteModal={showConfirmCompleteModal}
        setShowConfirmCompleteModal={setShowConfirmCompleteModal}
        isSaving={isSaving}
        saveCompleted={() => save("Completed")}
      />
    </>
  );
}
