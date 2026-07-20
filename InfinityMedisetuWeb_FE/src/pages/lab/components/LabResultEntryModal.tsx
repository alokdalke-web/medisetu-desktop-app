import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@heroui/react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheckCircle,
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiInfo,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiSearch,
  FiSettings,
  FiShield,
  FiTrash2,
} from "react-icons/fi";

import {
  getLabApiErrorMessage,
  useAddLabCustomFieldMutation,
  useDeleteLabCustomFieldMutation,
  useHideLabDefaultFieldMutation,
  useDownloadLabResultReportMutation,
  useLazyGetLabResultReportQuery,
  useLazyGetLabResultTemplateQuery,
  useLazyGetLabTemplateParametersQuery,
  useOverrideLabDefaultFieldMutation,
  useResetLabDefaultFieldOverrideMutation,
  useSaveLabResultMutation,
  useUnhideLabDefaultFieldMutation,
  useUpdateLabCustomFieldMutation,
  useUploadLabResultReportMutation,
  useVerifyLabResultMutation,
  type LabReportActions,
  type LabDefaultFieldOverrideInput,
  type LabResultFieldInput,
  type LabResultInputType,
  type LabResultReport,
  type LabResultSaveResponse,
  type LabResultTemplate,
  type LabResultTemplateParameter,
} from "../../../redux/api/labAssistantApi";
import {
  getLabReportDownloadErrorMessage,
  getLabReportUploadAccept,
  isCompletedOrVerifiedStatus,
  isAllowedLabReportUploadFile,
} from "./labReportActions";
import { LabReportActionsPanel } from "./LabReportActionsPanel";
import CompactSelectDropdown from "../../../components/shared/CompactSelectDropdown";
import { LabUnitSelect } from "./LabUnitSelect";
type FieldFormMode = "add-custom" | "edit-custom" | "override-default";
type ManageFieldFilter = "all" | "default" | "override" | "custom" | "hidden";

type FieldFormState = {
  mode: FieldFormMode;
  parameterId?: string;
  baseline?: FieldFormBaseline;
  sectionName: string;
  parameterName: string;
  originalParameterName?: string | null;
  unit: string;
  referenceRange: string;
  inputType: LabResultInputType;
  sortOrder: string;
  isRequired: boolean;
};

type FieldFormBaseline = {
  sectionName: string;
  parameterName: string;
  unit: string;
  referenceRange: string;
  inputType: LabResultInputType;
  sortOrder: number;
  isRequired: boolean;
};

const inputTypes: LabResultInputType[] = [
  "number",
  "text",
  "textarea",
  "date",
  "boolean",
  "select",
];

const manageFieldFilters: Array<{
  key: ManageFieldFilter;
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "default", label: "Default" },
  { key: "override", label: "Override" },
  { key: "custom", label: "Custom" },
  { key: "hidden", label: "Hidden" },
];

const emptyFieldForm = (mode: FieldFormMode): FieldFormState => ({
  mode,
  sectionName: "-",
  parameterName: "",
  unit: "",
  referenceRange: "",
  inputType: "text",
  sortOrder: "100",
  isRequired: false,
});

function fieldBaselineFromParameter(
  parameter: LabResultTemplateParameter,
): FieldFormBaseline {
  return {
    sectionName: parameter.sectionName || "-",
    parameterName: parameter.parameterName,
    unit: parameter.unit ?? "-",
    referenceRange: parameter.referenceRange ?? "-",
    inputType: parameter.inputType,
    sortOrder: parameter.sortOrder,
    isRequired: parameter.required,
  };
}

function fieldFormFromParameter(
  parameter: LabResultTemplateParameter,
  mode: FieldFormMode,
): FieldFormState {
  const baseline = fieldBaselineFromParameter(parameter);

  return {
    mode,
    parameterId:
      mode === "override-default" ? parameter.parameterId : parameter.id,
    baseline,
    sectionName: baseline.sectionName,
    parameterName: baseline.parameterName,
    originalParameterName: parameter.originalParameterName,
    unit: baseline.unit,
    referenceRange: baseline.referenceRange,
    inputType: baseline.inputType,
    sortOrder: String(baseline.sortOrder),
    isRequired: baseline.isRequired,
  };
}

function formToFieldInput(form: FieldFormState): LabResultFieldInput {
  const sortOrder = Number(form.sortOrder);

  return {
    sectionName: form.sectionName.trim() || "-",
    parameterName: form.parameterName.trim(),
    unit: form.unit.trim() || "-",
    referenceRange: form.referenceRange.trim() || "-",
    inputType: form.inputType,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : undefined,
    isRequired: form.isRequired,
  };
}

function isCustomParameter(parameter: LabResultTemplateParameter) {
  return (
    parameter.isCustom ||
    String(parameter.sourceType ?? "").toUpperCase() === "CUSTOM"
  );
}

function managedParameterActionKey(parameter: LabResultTemplateParameter) {
  return isCustomParameter(parameter) ? parameter.id : parameter.parameterId;
}

function fieldFormParameterId(
  parameter: LabResultTemplateParameter,
  mode: FieldFormMode,
) {
  return mode === "override-default" ? parameter.parameterId : parameter.id;
}

function buildChangedOverrideInput(
  form: FieldFormState,
  templateId: string,
): LabDefaultFieldOverrideInput | null {
  const baseline = form.baseline;
  const parsedSortOrder = Number(form.sortOrder);
  const next = {
    sectionName: form.sectionName.trim() || "-",
    parameterName: form.parameterName.trim(),
    unit: form.unit.trim() || "-",
    referenceRange: form.referenceRange.trim() || "-",
    inputType: form.inputType,
    sortOrder: Number.isFinite(parsedSortOrder) ? parsedSortOrder : undefined,
    isRequired: form.isRequired,
  };
  const override: LabDefaultFieldOverrideInput = { templateId };
  let hasChanges = false;

  const changed = <K extends keyof typeof next>(key: K) =>
    !baseline || next[key] !== baseline[key];

  if (changed("parameterName")) {
    override.displayNameOverride = next.parameterName;
    hasChanges = true;
  }

  if (changed("unit")) {
    override.unitOverride = next.unit;
    hasChanges = true;
  }

  if (changed("referenceRange")) {
    override.referenceRangeOverride = next.referenceRange;
    hasChanges = true;
  }

  if (changed("inputType")) {
    override.inputTypeOverride = next.inputType;
    hasChanges = true;
  }

  if (changed("sectionName")) {
    override.sectionNameOverride = next.sectionName;
    hasChanges = true;
  }

  if (next.sortOrder !== undefined && changed("sortOrder")) {
    override.sortOrderOverride = next.sortOrder;
    hasChanges = true;
  }

  if (changed("isRequired")) {
    override.isRequiredOverride = next.isRequired;
    hasChanges = true;
  }

  return hasChanges ? override : null;
}

function displayInputType(inputType: LabResultInputType) {
  return inputType.charAt(0).toUpperCase() + inputType.slice(1);
}

function reportTemplateScopeLabel(template: LabResultTemplate) {
  return template.labId ? "My Lab" : "Default";
}

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

function buildInitialValues(
  parameters: LabResultTemplateParameter[],
  previous: Record<string, string> = {},
) {
  return parameters.reduce<Record<string, string>>((acc, parameter) => {
    const nextValue =
      previous[parameter.parameterId] ??
      previous[parameter.id] ??
      parameter.value;
    acc[parameter.parameterId] =
      nextValue || (parameter.inputType === "boolean" ? "false" : "");
    return acc;
  }, {});
}

function formatReportDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ResultReportPreview({ report }: { report: LabResultReport }) {
  const summary = [
    ["Patient", report.patient],
    ["Doctor", report.doctor],
    ["Clinic", report.clinic],
    ["Test", report.testName],
    ["Template", report.templateName],
    ["Status", report.status ?? "-"],
    ["Verified By", report.verifiedBy ?? "-"],
    ["Verified At", formatReportDate(report.verifiedAt)],
    ["Generated At", formatReportDate(report.generatedAt)],
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-slate-950">Report Preview</h3>
        <p className="text-xs text-slate-500">
          Review the generated structured result details.
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-100 bg-white px-3 py-2"
          >
            <p className="text-[11px] font-semibold uppercase text-slate-400">
              {label}
            </p>
            <p className="mt-1 truncate text-sm font-bold text-slate-900">
              {value || "-"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">Parameter</th>
              <th className="px-4 py-3 font-bold">Value</th>
              <th className="px-4 py-3 font-bold">Unit</th>
              <th className="px-4 py-3 font-bold">Reference Range</th>
              <th className="px-4 py-3 font-bold">Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.values.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No result values returned.
                </td>
              </tr>
            ) : (
              report.values.map((value, index) => (
                <tr key={`${value.parameterId ?? value.displayName}-${index}`}>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <div className="flex flex-col gap-1">
                      <span>{value.displayName || value.parameterName}</span>
                      {value.originalParameterName &&
                        value.originalParameterName !==
                          (value.displayName || value.parameterName) && (
                          <span className="text-xs font-medium text-slate-400">
                            Original: {value.originalParameterName}
                          </span>
                        )}
                      <span className="text-xs font-medium text-slate-500">
                        {value.sectionName ?? "-"}
                      </span>
                      <span className="inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-500">
                        {value.isCustom
                          ? "CUSTOM"
                          : (value.sourceType ?? "DEFAULT")}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{value.value}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {value.unit ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {value.referenceRange ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {value.flag ?? "-"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const fieldInputClass =
  "h-9 w-full rounded-xl border border-slate-200 bg-slate-50/30 hover:border-slate-300 focus:bg-white px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const fieldTextareaClass =
  "min-h-[50px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/30 hover:border-slate-300 focus:bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function SourceBadge({ parameter }: { parameter: LabResultTemplateParameter }) {
  const isCustom = isCustomParameter(parameter);

  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        isCustom
          ? "bg-violet-50 text-violet-700"
          : "bg-slate-100 text-slate-500",
      ].join(" ")}
    >
      {isCustom ? "CUSTOM" : parameter.sourceType || "DEFAULT"}
    </span>
  );
}

function StatusBadge({
  children,
  tone = "slate",
}: {
  children: string;
  tone?: "slate" | "primary" | "red" | "violet";
}) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-600",
    primary: "bg-primary/10 text-primary",
    red: "bg-red-50 text-red-600",
    violet: "bg-violet-50 text-violet-700",
  }[tone];

  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        toneClass,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function isTruthyResultValue(value: string | undefined) {
  return ["true", "1", "yes", "y", "checked"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
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
            onChange={(unit) => setValue("unit", unit)}
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
  const [reportActions, setReportActions] = useState<LabReportActions | null>(
    null,
  );
  const [uploadedReportUrl, setUploadedReportUrl] = useState<string | null>(
    null,
  );
  const [isVerified, setIsVerified] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isManagingFields, setIsManagingFields] = useState(false);
  const [parameterToDelete, setParameterToDelete] = useState<LabResultTemplateParameter | null>(null);
  const [showConfirmCompleteModal, setShowConfirmCompleteModal] = useState(false);
  const [fieldForm, setFieldForm] = useState<FieldFormState | null>(null);
  const [fieldActionId, setFieldActionId] = useState<string | null>(null);
  const [managedParameters, setManagedParameters] = useState<
    LabResultTemplateParameter[]
  >([]);
  const [isLoadingManagedParameters, setIsLoadingManagedParameters] =
    useState(false);
  const [isRefreshingFields, setIsRefreshingFields] = useState(false);
  const [manageFieldSearch, setManageFieldSearch] = useState("");
  const [manageFieldFilter, setManageFieldFilter] =
    useState<ManageFieldFilter>("all");

  const [loadTemplate] = useLazyGetLabResultTemplateQuery();
  const [loadTemplateParameters] = useLazyGetLabTemplateParametersQuery();
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

  const isSavingField =
    isAddingCustomField || isUpdatingCustomField || isOverridingDefaultField;

  const isMutatingField =
    isSavingField ||
    isDeletingCustomField ||
    isHidingDefaultField ||
    isUnhidingDefaultField ||
    isResettingDefaultField;

  const managedFieldStats = useMemo(() => {
    const custom = managedParameters.filter(isCustomParameter).length;
    const override = managedParameters.filter(
      (parameter) => parameter.hasOverride,
    ).length;
    const hidden = managedParameters.filter(
      (parameter) => parameter.isHidden,
    ).length;
    const defaultCount = managedParameters.length - custom;

    return {
      custom,
      override,
      hidden,
      defaultCount,
      total: managedParameters.length,
    };
  }, [managedParameters]);

  const managedStatsText = useMemo(() => {
    const defaultLabel =
      managedFieldStats.defaultCount === 1 ? "default field" : "default fields";
    const overrideLabel =
      managedFieldStats.override === 1 ? "override" : "overrides";
    const customLabel =
      managedFieldStats.custom === 1 ? "custom field" : "custom fields";

    const hiddenPart =
      managedFieldStats.hidden > 0
        ? `, ${managedFieldStats.hidden} hidden`
        : "";

    return `${managedFieldStats.defaultCount} ${defaultLabel}, ${managedFieldStats.override} ${overrideLabel}, ${managedFieldStats.custom} ${customLabel}${hiddenPart}`;
  }, [managedFieldStats]);

  const visibleManagedParameters = useMemo(() => {
    const search = manageFieldSearch.trim().toLowerCase();

    return managedParameters.filter((parameter) => {
      const isCustom = isCustomParameter(parameter);

      const matchesFilter =
        manageFieldFilter === "all" ||
        (manageFieldFilter === "default" && !isCustom) ||
        (manageFieldFilter === "override" && parameter.hasOverride) ||
        (manageFieldFilter === "custom" && isCustom) ||
        (manageFieldFilter === "hidden" && parameter.isHidden);

      if (!matchesFilter) return false;

      if (!search) return true;

      const searchText = [
        parameter.parameterName,
        parameter.originalParameterName,
        parameter.sectionName,
        parameter.unit,
        parameter.referenceRange,
        parameter.sourceType,
        parameter.inputType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchText.includes(search);
    });
  }, [manageFieldFilter, manageFieldSearch, managedParameters]);

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
      setIsManagingFields(false);
      setFieldForm(null);
      setFieldActionId(null);
      setManagedParameters([]);
      setIsLoadingManagedParameters(false);
      setIsRefreshingFields(false);
      setManageFieldSearch("");
      setManageFieldFilter("all");
      return;
    }

    setSavedResultId(existingResultId ?? null);
    setSavedStatus(null);
    setIsVerified(false);
    setReport(null);
    setReportActions(null);
    setUploadedReportUrl(null);
    setFieldForm(null);
    setFieldActionId(null);
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
    onOpenChange,
  ]);

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

  const reloadManagedParameters = async (
    templateId?: string,
    options: { silent?: boolean } = {},
  ) => {
    const id = templateId ?? template?.id;
    if (!id) return;

    if (options.silent) {
      setIsRefreshingFields(true);
    } else {
      setIsLoadingManagedParameters(true);
    }

    try {
      const parameters = await loadTemplateParameters({
        templateId: id,
        appointmentTestId,
      }).unwrap();
      setManagedParameters(parameters);
    } catch (err) {
      addToast({
        title: "Fields load failed",
        description: getLabApiErrorMessage(
          err,
          "Could not load the template fields.",
        ),
        color: "danger",
      });
    } finally {
      if (options.silent) {
        setIsRefreshingFields(false);
      } else {
        setIsLoadingManagedParameters(false);
      }
    }
  };

  useEffect(() => {
    if (!isManagingFields || !template?.id) return;

    void reloadManagedParameters(template.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManagingFields, template?.id]);

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

  const refreshFieldData = async (
    options: { silent?: boolean } = { silent: true },
  ) => {
    await Promise.all([
      reloadTemplate(options),
      reloadManagedParameters(undefined, options),
      refreshOpenResultReport(options),
    ]);
  };

  const openManageFields = () => {
    setIsManagingFields(true);
    setFieldForm(null);
    setManageFieldSearch("");
    setManageFieldFilter("all");
  };

  const closeManageFields = () => {
    setIsManagingFields(false);
    setFieldForm(null);
    setManageFieldSearch("");
    setManageFieldFilter("all");
  };

  const handleFieldFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!template || !fieldForm) return;

    const parsedSortOrder = Number(fieldForm.sortOrder);
    if (fieldForm.sortOrder && (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0 || parsedSortOrder > 99999)) {
      addToast({
        title: "Invalid sort order",
        description: "Sort order must be an integer between 0 and 99999.",
        color: "warning",
      });
      return;
    }

    if (fieldForm.sectionName && fieldForm.sectionName.length > 50) {
      addToast({
        title: "Section name too long",
        description: "Section name must be 50 characters or less.",
        color: "warning",
      });
      return;
    }
    if (fieldForm.parameterName && fieldForm.parameterName.length > 100) {
      addToast({
        title: "Field name too long",
        description: "Field name must be 100 characters or less.",
        color: "warning",
      });
      return;
    }
    if (fieldForm.unit && fieldForm.unit.length > 20) {
      addToast({
        title: "Unit too long",
        description: "Unit must be 20 characters or less.",
        color: "warning",
      });
      return;
    }
    if (fieldForm.referenceRange && fieldForm.referenceRange.length > 50) {
      addToast({
        title: "Reference range too long",
        description: "Reference range must be 50 characters or less.",
        color: "warning",
      });
      return;
    }

    const field = formToFieldInput(fieldForm);

    if (!field.parameterName || field.parameterName === "-") {
      addToast({
        title: "Parameter Name required",
        description: "Please enter a valid parameter name.",
        color: "warning",
      });
      return;
    }

    if (!field.unit || field.unit === "-") {
      addToast({
        title: "Unit required",
        description: "Please enter a valid unit.",
        color: "warning",
      });
      return;
    }

    if (!field.referenceRange || field.referenceRange === "-") {
      addToast({
        title: "Reference Range required",
        description: "Please enter a valid reference range.",
        color: "warning",
      });
      return;
    }

    try {
      if (fieldForm.mode === "add-custom") {
        await addCustomField({
          templateId: template.id,
          appointmentTestId,
          resultId: report ? savedResultId : undefined,
          field,
        }).unwrap();
      } else if (fieldForm.mode === "edit-custom" && fieldForm.parameterId) {
        await updateCustomField({
          fieldId: fieldForm.parameterId,
          templateId: template.id,
          appointmentTestId,
          resultId: report ? savedResultId : undefined,
          field,
        }).unwrap();
      } else if (
        fieldForm.mode === "override-default" &&
        fieldForm.parameterId
      ) {
        const override = buildChangedOverrideInput(fieldForm, template.id);

        if (!override) {
          addToast({
            title: "No changes to save",
            description: "Update at least one field before saving an override.",
            color: "warning",
          });
          return;
        }

        await overrideDefaultField({
          parameterId: fieldForm.parameterId,
          appointmentTestId,
          resultId: report ? savedResultId : undefined,
          override,
        }).unwrap();
      }

      addToast({
        title: "Field saved",
        description: "The result template fields were updated.",
        color: "success",
      });
      setFieldForm(null);
      await refreshFieldData({ silent: true });
    } catch (err) {
      addToast({
        title: "Field save failed",
        description: getLabApiErrorMessage(err, "Could not save this field."),
        color: "danger",
      });
    }
  };

  const runFieldAction = async (
    parameter: LabResultTemplateParameter,
    action: () => Promise<unknown>,
    successTitle: string,
    optimisticUpdate?: (
      parameters: LabResultTemplateParameter[],
    ) => LabResultTemplateParameter[],
  ) => {
    if (!template) return;

    const previousManagedParameters = managedParameters;
    const actionKey = managedParameterActionKey(parameter);

    try {
      setFieldActionId(actionKey);

      if (optimisticUpdate) {
        setManagedParameters((prev) => optimisticUpdate(prev));
      }

      await action();

      addToast({
        title: successTitle,
        description: "The result template fields were updated.",
        color: "success",
      });

      setFieldForm(null);
      await refreshFieldData({ silent: true });
    } catch (err) {
      if (optimisticUpdate) {
        setManagedParameters(previousManagedParameters);
      }

      addToast({
        title: "Field update failed",
        description: getLabApiErrorMessage(err, "Could not update this field."),
        color: "danger",
      });
    } finally {
      setFieldActionId(null);
    }
  };

  const deleteCustomParameter = (parameter: LabResultTemplateParameter) => {
    setParameterToDelete(parameter);
  };

  const performDeleteCustomParameter = (parameter: LabResultTemplateParameter) => {
    if (!template) return;

    void runFieldAction(
      parameter,
      () =>
        deleteCustomField({
          fieldId: parameter.id,
          templateId: template.id,
          appointmentTestId,
          resultId: report ? savedResultId : undefined,
        }).unwrap(),
      "Custom field deleted",
      (parameters) => parameters.filter((item) => item.id !== parameter.id),
    );
  };

  const hideDefaultParameter = (parameter: LabResultTemplateParameter) => {
    if (!template) return;

    void runFieldAction(
      parameter,
      () =>
        hideDefaultField({
          parameterId: parameter.parameterId,
          templateId: template.id,
          appointmentTestId,
          resultId: report ? savedResultId : undefined,
        }).unwrap(),
      "Default field hidden",
      (parameters) =>
        parameters.map((item) =>
          item.parameterId === parameter.parameterId
            ? {
                ...item,
                isHidden: true,
              }
            : item,
        ),
    );
  };

  const unhideDefaultParameter = (parameter: LabResultTemplateParameter) => {
    if (!template) return;

    void runFieldAction(
      parameter,
      () =>
        unhideDefaultField({
          parameterId: parameter.parameterId,
          templateId: template.id,
          appointmentTestId,
          resultId: report ? savedResultId : undefined,
        }).unwrap(),
      "Default field restored",
      (parameters) =>
        parameters.map((item) =>
          item.parameterId === parameter.parameterId
            ? {
                ...item,
                isHidden: false,
              }
            : item,
        ),
    );
  };

  const resetDefaultParameter = (parameter: LabResultTemplateParameter) => {
    if (!template) return;

    void runFieldAction(
      parameter,
      () =>
        resetDefaultFieldOverride({
          parameterId: parameter.parameterId,
          templateId: template.id,
          appointmentTestId,
          resultId: report ? savedResultId : undefined,
        }).unwrap(),
      "Default override reset",
      (parameters) =>
        parameters.map((item) =>
          item.parameterId === parameter.parameterId
            ? {
                ...item,
                hasOverride: false,
                isHidden: false,
              }
            : item,
        ),
    );
  };

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

  const canUseTemplate = Boolean(appointmentTestId) && Boolean(template);

  const canVerifyResult =
    Boolean(savedResultId) &&
    savedStatus?.toUpperCase() === "COMPLETED" &&
    !isVerified;

  const reportActionStatus = savedStatus ?? report?.status;
  const canUseReportUpload =
    Boolean(savedResultId) && isCompletedOrVerifiedStatus(reportActionStatus);

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
                {testName ? ` • Ordered test: ${testName}` : ""}
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
                        {" • "}
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
                <div className="grid gap-4">
                  <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="relative w-full lg:max-w-xs">
                        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                        <input
                          value={manageFieldSearch}
                          onChange={(event) =>
                            setManageFieldSearch(event.target.value)
                          }
                          className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10"
                          placeholder="Search fields..."
                        />
                      </div>

                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        {manageFieldFilters.map((filter) => {
                          const isActive = manageFieldFilter === filter.key;

                          return (
                            <Button
                              key={filter.key}
                              size="sm"
                              radius="full"
                              variant={isActive ? "solid" : "flat"}
                              color={isActive ? "primary" : "default"}
                              onPress={() => setManageFieldFilter(filter.key)}
                              className={[
                                "h-8 px-4 text-xs font-bold",
                                isActive
                                  ? "text-white shadow-sm"
                                  : "text-slate-600",
                              ].join(" ")}
                            >
                              {filter.label}
                            </Button>
                          );
                        })}
                      </div>

                      {isRefreshingFields && (
                        <span className="inline-flex h-8 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-500">
                          <Spinner size="sm" />
                          Syncing...
                        </span>
                      )}

                      <Button
                        size="sm"
                        radius="full"
                        color="primary"
                        onPress={() =>
                          setFieldForm(emptyFieldForm("add-custom"))
                        }
                        startContent={<FiPlus />}
                        isDisabled={isMutatingField}
                        className="h-10 px-5 font-bold text-white"
                      >
                        Add Custom Field
                      </Button>
                    </div>

                    {fieldForm?.mode === "add-custom" && (
                      <FieldFormPanel
                        form={fieldForm}
                        isSaving={isSavingField}
                        onChange={setFieldForm}
                        onCancel={() => setFieldForm(null)}
                        onSubmit={handleFieldFormSubmit}
                      />
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-3">
                    {isLoadingManagedParameters &&
                    managedParameters.length === 0 ? (
                      <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-2">
                          <Spinner size="sm" />
                          Loading fields...
                        </span>
                      </div>
                    ) : visibleManagedParameters.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                        No fields found for this filter.
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {visibleManagedParameters.map((parameter) => {
                          const isCustom = isCustomParameter(parameter);
                          const actionKey =
                            managedParameterActionKey(parameter);
                          const isActionLoading =
                            isMutatingField && fieldActionId === actionKey;
                          const canOverride = parameter.canOverride;
                          const canHide = parameter.canHide;
                          const canEdit = parameter.canEdit;
                          const canDelete = parameter.canDelete;
                          const canResetDefault =
                            !isCustom &&
                            (parameter.hasOverride || parameter.isHidden);

                          const hasAnyAction = isCustom
                            ? canEdit || canDelete || canOverride || canHide
                            : canOverride || canHide || canResetDefault;

                          return (
                            <div
                              key={actionKey}
                              className={[
                                "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.02)]",
                                "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md",
                                isActionLoading
                                  ? "pointer-events-none opacity-70"
                                  : "",
                              ].join(" ")}
                            >
                              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="hidden text-slate-400 sm:inline">
                                      ⋮⋮
                                    </span>

                                    <p className="truncate text-sm font-bold text-slate-950">
                                      {parameter.parameterName}
                                    </p>

                                    {parameter.hasOverride && (
                                      <StatusBadge tone="primary">
                                        Override
                                      </StatusBadge>
                                    )}

                                    {parameter.required && (
                                      <StatusBadge tone="red">
                                        Required
                                      </StatusBadge>
                                    )}

                                    {parameter.isHidden && (
                                      <StatusBadge tone="slate">
                                        Hidden
                                      </StatusBadge>
                                    )}

                                    {isCustom ? (
                                      <StatusBadge tone="violet">
                                        Custom
                                      </StatusBadge>
                                    ) : (
                                      <SourceBadge parameter={parameter} />
                                    )}
                                  </div>

                                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                    Section: {parameter.sectionName ?? "-"}{" "}
                                    <span className="mx-1 text-slate-300">
                                      •
                                    </span>
                                    Type:{" "}
                                    {displayInputType(parameter.inputType)}{" "}
                                    <span className="mx-1 text-slate-300">
                                      •
                                    </span>
                                    Unit: {parameter.unit ?? "-"}{" "}
                                    <span className="mx-1 text-slate-300">
                                      •
                                    </span>
                                    Range: {parameter.referenceRange ?? "-"}
                                  </p>

                                  {parameter.originalParameterName &&
                                    parameter.originalParameterName !==
                                      parameter.parameterName && (
                                      <p className="mt-1 truncate text-xs font-medium text-slate-400">
                                        Original:{" "}
                                        {parameter.originalParameterName}
                                      </p>
                                    )}
                                </div>

                                <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
                                  {!hasAnyAction && (
                                    <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                                      No actions available
                                    </span>
                                  )}

                                  {isCustom ? (
                                    <>
                                      {canEdit && (
                                        <Button
                                          size="sm"
                                          radius="full"
                                          variant="flat"
                                          onPress={() =>
                                            setFieldForm(
                                              fieldFormFromParameter(
                                                parameter,
                                                "edit-custom",
                                              ),
                                            )
                                          }
                                          isDisabled={isMutatingField}
                                          startContent={<FiEdit3 />}
                                          className="h-9 px-4 font-bold text-slate-700"
                                        >
                                          Edit
                                        </Button>
                                      )}

                                      {canDelete && (
                                        <Button
                                          size="sm"
                                          radius="full"
                                          variant="flat"
                                          color="danger"
                                          onPress={() =>
                                            deleteCustomParameter(parameter)
                                          }
                                          isLoading={isActionLoading}
                                          isDisabled={isMutatingField}
                                          startContent={
                                            !isActionLoading && <FiTrash2 />
                                          }
                                          className="h-9 px-4 font-bold"
                                        >
                                          Delete
                                        </Button>
                                      )}

                                      {canOverride && (
                                        <Button
                                          size="sm"
                                          radius="full"
                                          variant="flat"
                                          onPress={() =>
                                            setFieldForm(
                                              fieldFormFromParameter(
                                                parameter,
                                                "override-default",
                                              ),
                                            )
                                          }
                                          isDisabled={isMutatingField}
                                          startContent={<FiEdit3 />}
                                          className="h-9 px-4 font-bold text-slate-700"
                                        >
                                          Override
                                        </Button>
                                      )}

                                      {canHide &&
                                        (parameter.isHidden ? (
                                          <Button
                                            size="sm"
                                            radius="full"
                                            variant="flat"
                                            onPress={() =>
                                              unhideDefaultParameter(parameter)
                                            }
                                            isLoading={isActionLoading}
                                            isDisabled={isMutatingField}
                                            startContent={
                                              !isActionLoading && <FiEye />
                                            }
                                            className="h-9 px-4 font-bold text-slate-700"
                                          >
                                            Unhide
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            radius="full"
                                            variant="flat"
                                            onPress={() =>
                                              hideDefaultParameter(parameter)
                                            }
                                            isLoading={isActionLoading}
                                            isDisabled={isMutatingField}
                                            startContent={
                                              !isActionLoading && <FiEyeOff />
                                            }
                                            className="h-9 px-4 font-bold text-slate-700"
                                          >
                                            Hide
                                          </Button>
                                        ))}
                                    </>
                                  ) : (
                                    <>
                                      {canOverride && (
                                        <Button
                                          size="sm"
                                          radius="full"
                                          variant="flat"
                                          onPress={() =>
                                            setFieldForm(
                                              fieldFormFromParameter(
                                                parameter,
                                                "override-default",
                                              ),
                                            )
                                          }
                                          isDisabled={isMutatingField}
                                          startContent={<FiEdit3 />}
                                          className="h-9 px-4 font-bold text-slate-700"
                                        >
                                          Override
                                        </Button>
                                      )}

                                      {canHide &&
                                        (parameter.isHidden ? (
                                          <Button
                                            size="sm"
                                            radius="full"
                                            variant="flat"
                                            onPress={() =>
                                              unhideDefaultParameter(parameter)
                                            }
                                            isLoading={isActionLoading}
                                            isDisabled={isMutatingField}
                                            startContent={
                                              !isActionLoading && <FiEye />
                                            }
                                            className="h-9 px-4 font-bold text-slate-700"
                                          >
                                            Unhide
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            radius="full"
                                            variant="flat"
                                            onPress={() =>
                                              hideDefaultParameter(parameter)
                                            }
                                            isLoading={isActionLoading}
                                            isDisabled={isMutatingField}
                                            startContent={
                                              !isActionLoading && <FiEyeOff />
                                            }
                                            className="h-9 px-4 font-bold text-slate-700"
                                          >
                                            Hide
                                          </Button>
                                        ))}

                                      {canResetDefault && (
                                        <Button
                                          size="sm"
                                          radius="full"
                                          variant="flat"
                                          onPress={() =>
                                            resetDefaultParameter(parameter)
                                          }
                                          isLoading={isActionLoading}
                                          isDisabled={isMutatingField}
                                          startContent={
                                            !isActionLoading && <FiRotateCcw />
                                          }
                                          className="h-9 px-4 font-bold text-slate-700"
                                        >
                                          Reset Override
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {fieldForm &&
                                fieldForm.mode !== "add-custom" &&
                                fieldForm.parameterId ===
                                  fieldFormParameterId(
                                    parameter,
                                    fieldForm.mode,
                                  ) && (
                                  <div className="mt-4 border-t border-slate-100 pt-4">
                                    <FieldFormPanel
                                      form={fieldForm}
                                      isSaving={isSavingField}
                                      onChange={setFieldForm}
                                      onCancel={() => setFieldForm(null)}
                                      onSubmit={handleFieldFormSubmit}
                                    />
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
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
                      ))}</>
                    )}
                  </div>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Remarks
                    </span>
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

                  {report && <ResultReportPreview report={report} />}

                  <LabReportActionsPanel
                    actions={reportActions}
                    status={reportActionStatus}
                    currentFileUrl={currentReportFileUrl}
                    isDownloading={isDownloadingReport}
                    isUploading={isUploadingReportFile}
                    onDownload={() => void downloadGeneratedReport()}
                    onUpload={openReportUploadPicker}
                  />
                </>
              )}
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Result template could not be loaded.
            </div>
          )}
        </ModalBody>

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
                  onPress={() => onOpenChange(false)}
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
                onPress={() => onOpenChange(false)}
                isDisabled={isSaving || isVerifying || isReportActionLoading}
                className="border-slate-200 px-5 font-semibold text-slate-600"
              >
                Close
              </Button>

              {savedResultId && (
                <Button
                  variant="flat"
                  radius="full"
                  onPress={() => void viewReport()}
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
                  onPress={() => void verify()}
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
                onPress={() => void save("Draft")}
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
                  !canUseTemplate ||
                  isVerifying ||
                  isVerified ||
                  isReportActionLoading
                }
                startContent={!isSaving && <FiCheckCircle />}
                className="px-6 font-semibold text-white"
              >
                Save Completed
              </Button>
            </div>
          )}
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
        base: "rounded-3xl border border-slate-200 shadow-2xl bg-white p-5",
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
              await save("Completed");
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
