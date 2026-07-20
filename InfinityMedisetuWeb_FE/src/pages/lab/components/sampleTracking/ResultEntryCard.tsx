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
import {
  Document,
  Image,
  Page,
  pdf,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { AnimatePresence, motion } from "framer-motion";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiCreditCard,
  FiDownload,
  FiDroplet,
  FiEdit,
  FiEye,
  FiFileText,
  FiInfo,
  FiLock,
  FiPlus,
  FiPrinter,
  FiSave,
  FiSearch,
  FiSettings,
  FiUploadCloud,
} from "react-icons/fi";

import CompactSelectDropdown from "../../../../components/shared/CompactSelectDropdown";
import {
  getLabApiErrorMessage,
  useAddLabCustomFieldMutation,
  useDeleteLabCustomFieldMutation,
  useDownloadLabResultReportMutation,
  useHideLabDefaultFieldMutation,
  useLazyGetLabResultReportQuery,
  useLazyGetLabTemplateParametersQuery,
  useOverrideLabDefaultFieldMutation,
  useResetLabDefaultFieldOverrideMutation,
  useSaveLabResultMutation,
  useUnhideLabDefaultFieldMutation,
  useUpdateLabCustomFieldMutation,
  useUploadAppointmentTestReportMutation,
  useUploadLabResultReportMutation,
  useVerifyLabResultMutation,
  type LabDefaultFieldOverrideInput,
  type LabReportActions,
  type LabResultFieldInput,
  type LabResultInputType,
  type LabResultReport,
  type LabResultSaveResponse,
  type LabResultTemplate,
  type LabResultTemplateParameter,
  type TrackingStep,
} from "../../../../redux/api/labAssistantApi";
import { LabUnitSelect } from "../LabUnitSelect";
import {
  LOCAL_MEDISETU_LOGO_URL,
  MEDISETU_LOGO_URL,
  calculateAgeFromDob,
  extractReportPdfUrl,
  firstReportDisplayText,
  formatTimestamp,
  reportTemplateScopeLabel,
  type ResultPreviewParameter,
} from "./trackingUtils";

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


function isTruthyResultValue(value: string | undefined) {
  return ["true", "1", "yes", "y", "checked"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
}

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

  function fieldFormTitle(mode: FieldFormMode) {
    if (mode === "add-custom") return "Add Custom Field";
    if (mode === "edit-custom") return "Edit Custom Field";
    return "Override Default Field";
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-primary/15 bg-primary/5 p-4 mt-3 text-left"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-950">
            {fieldFormTitle(form.mode)}
          </h4>
          {form.originalParameterName && (
            <p className="mt-0.5 text-[10px] font-medium text-slate-500">
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
          className="font-semibold h-7 text-[10px]"
        >
          Cancel
        </Button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">

        <label className="grid gap-1">
          <span className="text-[10px] font-bold text-slate-600">Parameter Name</span>
          <input
            value={form.parameterName}
            onChange={(event) => setValue("parameterName", event.target.value)}
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-primary/45 focus:bg-white"
            placeholder="e.g. TLC,RBC,Platelets"
            required
            maxLength={100}
          />
        </label>

        <div className="grid gap-1">
          <span className="text-[10px] font-bold text-slate-600">Input Type</span>
          <CompactSelectDropdown
            ariaLabel="Input type"
            value={form.inputType}
            options={inputTypes.map((inputType) => ({
              value: inputType,
              label: displayInputType(inputType),
            }))}
            onChange={(inputType) => setValue("inputType", inputType)}
            triggerClassName="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-primary/45 focus:bg-white"
          />
        </div>

        <div className="grid gap-1">
          <span className="text-[10px] font-bold text-slate-600">Unit</span>
          <LabUnitSelect
            key={`${form.mode}-${form.parameterId ?? "new"}-unit`}
            value={form.unit}
            onChange={(unit) => setValue("unit", unit)}
            triggerClassName="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-primary/45 focus:bg-white"
            customInputClassName="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-primary/45 focus:bg-white"
            customPlaceholder="Unit (e.g. mg/dL)"
            maxLength={20}
          />
        </div>

        <label className="grid gap-1">
          <span className="text-[10px] font-bold text-slate-600">
            Reference Range
          </span>
          <input
            value={form.referenceRange}
            onChange={(event) => setValue("referenceRange", event.target.value)}
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-primary/45 focus:bg-white"
            placeholder="e.g. 70 - 100"
            maxLength={50}
            required
          />
        </label>
      </div>

      <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isRequired}
          onChange={(event) => setValue("isRequired", event.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary/20"
        />
        Required field
      </label>

      <div className="mt-3 flex justify-end">
        <Button
          type="submit"
          color="primary"
          radius="full"
          size="sm"
          isLoading={isSaving}
          startContent={!isSaving && <FiSave />}
          className="px-4 font-semibold text-white h-8 text-[11px]"
        >
          Save Field
        </Button>
      </div>
    </form>
  );
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
        className="min-h-[50px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/30 hover:border-slate-300 focus:bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
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

  if (parameter.inputType === "select" && parameter.options && parameter.options.length > 0) {
    return (
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/30 hover:border-slate-300 focus:bg-white px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
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
      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/30 hover:border-slate-300 focus:bg-white px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      placeholder="Enter value"
    />
  );
}

function evaluateFlag(valueStr: string | null, rangeStr: string | null): "High" | "Low" | "Normal" | null {
  if (!rangeStr || !valueStr) return null;
  const val = parseFloat(valueStr);
  if (Number.isNaN(val)) return null;

  const cleanRange = rangeStr.trim().toLowerCase();

  // Case: < 200 or <200
  if (cleanRange.startsWith("<")) {
    const limit = parseFloat(cleanRange.replace("<", "").trim());
    if (!Number.isNaN(limit)) {
      return val >= limit ? "High" : "Normal";
    }
  }

  // Case: > 40 or >40
  if (cleanRange.startsWith(">")) {
    const limit = parseFloat(cleanRange.replace(">", "").trim());
    if (!Number.isNaN(limit)) {
      return val <= limit ? "Low" : "Normal";
    }
  }

  // Case: 13.0 - 17.0 or 13-17 or 13.0-17.0
  if (cleanRange.includes("-")) {
    const parts = cleanRange.split("-").map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      if (val < parts[0]) return "Low";
      if (val > parts[1]) return "High";
      return "Normal";
    }
  }

  return "Normal";
}

let medisetuPdfLogoDataUrlPromise: Promise<string | null> | null = null;

async function fetchLogoSvgText() {
  const urls = [MEDISETU_LOGO_URL, LOCAL_MEDISETU_LOGO_URL];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
    } catch (_err) {
      // Try the next known logo source.
    }
  }

  return null;
}

function renderSvgToPngDataUrl(svgText: string) {
  return new Promise<string | null>((resolve) => {
    const img = new window.Image();
    const visibleSvgText = svgText
      .replace(/fill="white"/gi, 'fill="#0f172a"')
      .replace(/fill="#ffffff"/gi, 'fill="#0f172a"');
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(visibleSvgText)}`;

    img.onload = () => {
      const naturalWidth = img.naturalWidth || 2133;
      const naturalHeight = img.naturalHeight || 600;
      const canvasWidth = 260;
      const canvasHeight = Math.round((canvasWidth * naturalHeight) / naturalWidth);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        resolve(null);
        return;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => resolve(null);
    img.src = svgDataUrl;
  });
}

function getMediSetuPdfLogoDataUrl() {
  if (!medisetuPdfLogoDataUrlPromise) {
    medisetuPdfLogoDataUrlPromise = fetchLogoSvgText().then((svgText) =>
      svgText ? renderSvgToPngDataUrl(svgText) : null,
    );
  }

  return medisetuPdfLogoDataUrlPromise;
}

function downloadGeneratedReportFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = file.name || "lab_result_report.pdf";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const generatedReportPdfStyles = StyleSheet.create({
  page: {
    padding: 34,
    paddingBottom: 82,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#047857",
    paddingBottom: 12,
    marginBottom: 18,
  },
  labTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#047857",
  },
  labSubtitle: {
    marginTop: 3,
    fontSize: 9,
    color: "#64748b",
  },
  labInfo: {
    maxWidth: 230,
    fontSize: 8,
    color: "#64748b",
    textAlign: "right",
    lineHeight: 1.35,
  },
  title: {
    marginBottom: 18,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: "#020617",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  patientCard: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    marginBottom: 22,
    backgroundColor: "#f8fafc",
  },
  patientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  patientCol: {
    width: "48%",
  },
  infoText: {
    fontSize: 9,
    lineHeight: 1.35,
    color: "#334155",
  },
  label: {
    fontWeight: "bold",
    color: "#475569",
  },
  sectionHeader: {
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: "#f1f5f9",
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  sectionHeaderText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#334155",
    textTransform: "uppercase",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 7,
    paddingHorizontal: 9,
    backgroundColor: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 9,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#64748b",
  },
  cellText: {
    fontSize: 9,
    color: "#1e293b",
  },
  valueText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#020617",
  },
  colParameter: {
    width: "40%",
  },
  colValue: {
    width: "24%",
  },
  colUnit: {
    width: "15%",
  },
  colRange: {
    width: "21%",
  },
  emptyText: {
    paddingVertical: 24,
    textAlign: "center",
    fontSize: 9,
    color: "#64748b",
  },
  footer: {
    marginTop: 34,
    alignItems: "center",
    paddingBottom: 2,
  },
  logo: {
    width: 76,
    height: 22,
    objectFit: "contain",
  },
});

function GeneratedResultReportPdfDoc({
  report,
  appointmentTest,
  template,
  previewParameters,
  logoDataUrl,
}: {
  report: LabResultReport | null;
  appointmentTest: any;
  template: LabResultTemplate | null;
  previewParameters: ResultPreviewParameter[];
  logoDataUrl?: string | null;
}) {
  const reportDateValue =
    report?.generatedAt ||
    (report as any)?.verifiedAt ||
    appointmentTest?.readyForReportAt ||
    appointmentTest?.updatedAt ||
    appointmentTest?.dateTime;

  const reportDate = reportDateValue
    ? new Date(reportDateValue).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const labName = firstReportDisplayText(
    template?.labName,
    appointmentTest?.labName,
    appointmentTest?.lab?.name,
    appointmentTest?.clinicName,
    appointmentTest?.clinic?.name,
    (report as any)?.labName,
    (report as any)?.clinicName,
    report?.clinic,
    "Infinity Medisetu",
  );

  const labAddress = firstReportDisplayText(
    template?.labAddress,
    appointmentTest?.labAddress,
    appointmentTest?.lab?.address,
    appointmentTest?.clinicAddress,
    appointmentTest?.clinic?.address,
    appointmentTest?.address,
    (report as any)?.labAddress,
    (report as any)?.clinicAddress,
    (report as any)?.address,
  );

  const labContact = firstReportDisplayText(
    template?.labContactNumber,
    appointmentTest?.labContactNumber,
    appointmentTest?.lab?.contactNumber,
    appointmentTest?.lab?.mobile,
    appointmentTest?.lab?.phone,
    (report as any)?.labContactNumber,
  );

  const patientName = firstReportDisplayText(
    appointmentTest?.patientName,
    appointmentTest?.patient?.name,
    template?.patientName,
    (report as any)?.patientName,
    report?.patient,
    "—",
  );

  const patientAge = firstReportDisplayText(
    appointmentTest?.patientAge,
    appointmentTest?.patient?.age,
    appointmentTest?.age,
    template?.patientAge,
    (report as any)?.patientAge,
    (report as any)?.age,
    calculateAgeFromDob(
      appointmentTest?.patientDob ??
      appointmentTest?.patient?.dob ??
      appointmentTest?.patient?.dateOfBirth ??
      appointmentTest?.dob ??
      template?.patientDob ??
      (report as any)?.patientDob ??
      (report as any)?.dob,
    ),
  );

  const patientAgeDisplay = patientAge
    ? /year|yrs?|y\b/i.test(patientAge)
      ? patientAge
      : `${patientAge} Yrs`
    : "—";

  const patientGender = firstReportDisplayText(
    appointmentTest?.patientGender,
    appointmentTest?.patient?.gender,
    appointmentTest?.gender,
    template?.patientGender,
    (report as any)?.patientGender,
    (report as any)?.gender,
    "—",
  );

  const patientEmail = firstReportDisplayText(
    appointmentTest?.patientEmail,
    appointmentTest?.patient?.email,
    appointmentTest?.email,
    template?.patientEmail,
    (report as any)?.patientEmail,
    (report as any)?.email,
    "—",
  );

  const patientMobile = firstReportDisplayText(
    appointmentTest?.patientMobile,
    appointmentTest?.patient?.mobile,
    appointmentTest?.patient?.phone,
    appointmentTest?.patient?.contactNumber,
    appointmentTest?.mobile,
    appointmentTest?.phone,
    template?.patientMobile,
    (report as any)?.patientMobile,
    (report as any)?.mobile,
    (report as any)?.phone,
    "—",
  );

  const doctorDisplay = firstReportDisplayText(
    appointmentTest?.doctorName,
    appointmentTest?.doctor?.name,
    report?.doctor,
    "—",
  );

  const sampleType = firstReportDisplayText(
    template?.sampleType,
    report?.sampleType,
    appointmentTest?.sampleType,
    appointmentTest?.category,
    "—",
  );

  const testNameDisplay = firstReportDisplayText(
    appointmentTest?.testName,
    report?.testName,
    template?.testName,
    template?.templateName,
    "Laboratory Test",
  );

  const evaluatedParameters = previewParameters.map((param) => {
    const flag = param.flag || evaluateFlag(param.value, param.referenceRange);

    return {
      ...param,
      flag: flag === "Normal" ? null : flag,
    };
  });

  const groupedParameters = evaluatedParameters.reduce<Record<string, typeof evaluatedParameters>>(
    (acc, parameter) => {
      const sectionName =
        firstReportDisplayText(parameter.sectionName, testNameDisplay) ||
        "Result Parameters";
      if (!acc[sectionName]) acc[sectionName] = [];
      acc[sectionName].push(parameter);
      return acc;
    },
    {},
  );

  const sectionEntries = Object.entries(groupedParameters);

  return (
    <Document>
      <Page size="A4" style={generatedReportPdfStyles.page}>
        <View style={generatedReportPdfStyles.header}>
          <View>
            <Text style={generatedReportPdfStyles.labTitle}>{labName}</Text>
            <Text style={generatedReportPdfStyles.labSubtitle}>
              Pathology & Diagnostic Laboratory
            </Text>
          </View>

          <View style={generatedReportPdfStyles.labInfo}>
            {labAddress && <Text>{labAddress}</Text>}
            {labContact && <Text>Contact: {labContact}</Text>}
            <Text>Report Date: {reportDate}</Text>
          </View>
        </View>

        <Text style={generatedReportPdfStyles.title}>{testNameDisplay}</Text>

        <View style={generatedReportPdfStyles.patientCard}>
          <View style={generatedReportPdfStyles.patientRow}>
            <View style={generatedReportPdfStyles.patientCol}>
              <Text style={generatedReportPdfStyles.infoText}>
                <Text style={generatedReportPdfStyles.label}>Patient Name: </Text>
                {patientName}
              </Text>
            </View>
            <View style={generatedReportPdfStyles.patientCol}>
              <Text style={generatedReportPdfStyles.infoText}>
                <Text style={generatedReportPdfStyles.label}>Referral Doctor: </Text>
                {doctorDisplay}
              </Text>
            </View>
          </View>

          <View style={generatedReportPdfStyles.patientRow}>
            <View style={generatedReportPdfStyles.patientCol}>
              <Text style={generatedReportPdfStyles.infoText}>
                <Text style={generatedReportPdfStyles.label}>Age / Gender: </Text>
                {patientAgeDisplay} / {patientGender}
              </Text>
            </View>
            <View style={generatedReportPdfStyles.patientCol}>
              <Text style={generatedReportPdfStyles.infoText}>
                <Text style={generatedReportPdfStyles.label}>Mobile Number: </Text>
                {patientMobile}
              </Text>
            </View>
          </View>

          <View style={generatedReportPdfStyles.patientRow}>
            <View style={generatedReportPdfStyles.patientCol}>
              <Text style={generatedReportPdfStyles.infoText}>
                <Text style={generatedReportPdfStyles.label}>Email Address: </Text>
                {patientEmail}
              </Text>
            </View>
            <View style={generatedReportPdfStyles.patientCol}>
              <Text style={generatedReportPdfStyles.infoText}>
                <Text style={generatedReportPdfStyles.label}>Sample Type: </Text>
                {sampleType}
              </Text>
            </View>
          </View>
        </View>

        {sectionEntries.length > 0 ? (
          sectionEntries.map(([sectionName, parameters]) => (
            <View key={sectionName}>
              <View style={generatedReportPdfStyles.sectionHeader}>
                <Text style={generatedReportPdfStyles.sectionHeaderText}>
                  {sectionName}
                </Text>
              </View>
              <View style={generatedReportPdfStyles.tableHeader}>
                <Text style={[generatedReportPdfStyles.headerText, generatedReportPdfStyles.colParameter]}>
                  Parameter
                </Text>
                <Text style={[generatedReportPdfStyles.headerText, generatedReportPdfStyles.colValue]}>
                  Value
                </Text>
                <Text style={[generatedReportPdfStyles.headerText, generatedReportPdfStyles.colUnit]}>
                  Unit
                </Text>
                <Text style={[generatedReportPdfStyles.headerText, generatedReportPdfStyles.colRange]}>
                  Reference Range
                </Text>
              </View>

              {parameters.map((parameter) => (
                <View key={parameter.parameterId || parameter.parameterName} style={generatedReportPdfStyles.tableRow}>
                  <Text style={[generatedReportPdfStyles.cellText, generatedReportPdfStyles.colParameter]}>
                    {parameter.parameterName}
                  </Text>
                  <Text style={[generatedReportPdfStyles.valueText, generatedReportPdfStyles.colValue]}>
                    {parameter.value || "—"}
                  </Text>
                  <Text style={[generatedReportPdfStyles.cellText, generatedReportPdfStyles.colUnit]}>
                    {parameter.unit || "—"}
                  </Text>
                  <Text style={[generatedReportPdfStyles.cellText, generatedReportPdfStyles.colRange]}>
                    {parameter.referenceRange || "—"}
                  </Text>
                </View>
              ))}
            </View>
          ))
        ) : (
          <Text style={generatedReportPdfStyles.emptyText}>
            No result parameters to display.
          </Text>
        )}

        {logoDataUrl && (
          <View wrap={false} style={generatedReportPdfStyles.footer}>
            <Image src={logoDataUrl} style={generatedReportPdfStyles.logo} />
          </View>
        )}
      </Page>
    </Document>
  );
}

async function buildGeneratedResultReportPdfFile({
  report,
  appointmentTest,
  template,
  previewParameters,
  logoDataUrl,
}: {
  report: LabResultReport | null;
  appointmentTest: any;
  template: LabResultTemplate | null;
  previewParameters: ResultPreviewParameter[];
  logoDataUrl?: string | null;
}) {
  const blob = await pdf(
    <GeneratedResultReportPdfDoc
      report={report}
      appointmentTest={appointmentTest}
      template={template}
      previewParameters={previewParameters}
      logoDataUrl={logoDataUrl}
    />,
  ).toBlob();
  const cleanTestName =
    firstReportDisplayText(appointmentTest?.testName, report?.testName, template?.templateName, "lab_result")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase() || "lab_result";
  const dateTag = new Date().toISOString().slice(0, 10);

  return new File([blob], `lab_result_${cleanTestName}_${dateTag}.pdf`, {
    type: "application/pdf",
  });
}

function ResultReportPreviewModal({
  isOpen,
  onOpenChange,
  report,
  appointmentTest,
  template,
  remarks: _remarks,
  previewParameters,
  onDownload,
  isDownloading,
  onUploadGeneratedReport,
  isUploadingGeneratedReport,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  report: LabResultReport | null;
  appointmentTest: any;
  template: LabResultTemplate | null;
  remarks?: string;
  previewParameters: ResultPreviewParameter[];
  onDownload: () => void | Promise<void>;
  isDownloading?: boolean;
  onUploadGeneratedReport?: () => void | Promise<void>;
  isUploadingGeneratedReport?: boolean;
}) {
  if (!appointmentTest) return null;

  const handleClose = (onClose: () => void) => {
    onOpenChange(false);
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  const reportDateValue =
    report?.generatedAt ||
    (report as any)?.verifiedAt ||
    appointmentTest.readyForReportAt ||
    appointmentTest.updatedAt ||
    appointmentTest.dateTime;

  const reportDate = reportDateValue
    ? new Date(reportDateValue).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const labName = firstReportDisplayText(
    template?.labName,
    appointmentTest.labName,
    appointmentTest.lab?.name,
    appointmentTest.clinicName,
    appointmentTest.clinic?.name,
    (report as any)?.labName,
    (report as any)?.clinicName,
    report?.clinic,
    "Infinity Medisetu",
  );

  const labAddress = firstReportDisplayText(
    template?.labAddress,
    appointmentTest.labAddress,
    appointmentTest.lab?.address,
    appointmentTest.clinicAddress,
    appointmentTest.clinic?.address,
    appointmentTest.address,
    (report as any)?.labAddress,
    (report as any)?.clinicAddress,
    (report as any)?.address,
  );

  const labContact = firstReportDisplayText(
    template?.labContactNumber,
    appointmentTest.labContactNumber,
    appointmentTest.lab?.contactNumber,
    appointmentTest.lab?.mobile,
    appointmentTest.lab?.phone,
    (report as any)?.labContactNumber,
  );

  const doctorDisplay = firstReportDisplayText(
    appointmentTest.doctorName,
    appointmentTest.doctor?.name,
    report?.doctor,
    "—",
  );

  const patientName = firstReportDisplayText(
    appointmentTest.patientName,
    appointmentTest.patient?.name,
    template?.patientName,
    (report as any)?.patientName,
    report?.patient,
    "—",
  );

  const patientAge = firstReportDisplayText(
    appointmentTest.patientAge,
    appointmentTest.patient?.age,
    appointmentTest.age,
    template?.patientAge,
    (report as any)?.patientAge,
    (report as any)?.age,
    calculateAgeFromDob(
      appointmentTest.patientDob ??
      appointmentTest.patient?.dob ??
      appointmentTest.patient?.dateOfBirth ??
      appointmentTest.dob ??
      template?.patientDob ??
      (report as any)?.patientDob ??
      (report as any)?.dob,
    ),
  );

  const patientAgeDisplay = patientAge
    ? /year|yrs?|y\b/i.test(patientAge)
      ? patientAge
      : `${patientAge} Yrs`
    : "—";

  const patientGender = firstReportDisplayText(
    appointmentTest.patientGender,
    appointmentTest.patient?.gender,
    appointmentTest.gender,
    template?.patientGender,
    (report as any)?.patientGender,
    (report as any)?.gender,
    "—",
  );

  const patientEmail = firstReportDisplayText(
    appointmentTest.patientEmail,
    appointmentTest.patient?.email,
    appointmentTest.email,
    template?.patientEmail,
    (report as any)?.patientEmail,
    (report as any)?.email,
    "—",
  );

  const patientMobile = firstReportDisplayText(
    appointmentTest.patientMobile,
    appointmentTest.patient?.mobile,
    appointmentTest.patient?.phone,
    appointmentTest.patient?.contactNumber,
    appointmentTest.mobile,
    appointmentTest.phone,
    template?.patientMobile,
    (report as any)?.patientMobile,
    (report as any)?.mobile,
    (report as any)?.phone,
    "—",
  );

  const sampleType = firstReportDisplayText(
    template?.sampleType,
    report?.sampleType,
    appointmentTest.sampleType,
    appointmentTest.category,
    "—",
  );

  const testNameDisplay = firstReportDisplayText(
    appointmentTest.testName,
    report?.testName,
    template?.testName,
    template?.templateName,
    "Laboratory Test",
  );

  const evaluatedParameters = previewParameters.map(param => {
    const flag = param.flag || evaluateFlag(param.value, param.referenceRange);

    return {
      ...param,
      flag: flag === "Normal" ? null : flag,
    };
  });

  return (
    <Modal
      hideCloseButton
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      scrollBehavior="inside"
      size="5xl"
      classNames={{
        wrapper: "items-center p-3 sm:p-4",
        base: "m-0 max-h-[92dvh] w-[calc(100vw-24px)] max-w-[820px] overflow-hidden rounded-xl bg-white shadow-xl sm:max-h-[90dvh]",
        body: "min-h-0 overflow-hidden p-0",
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-report-area, #print-report-area * {
            visibility: visible !important;
          }
          .no-print {
            display: none !important;
          }
          #print-report-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            padding: 24px !important;
            margin: 0 !important;
          }
        }
      `}</style>
      <ModalContent>
        {(onClose) => (
          <ModalBody className="flex min-h-0 flex-col bg-white p-0">
            <div className="min-h-0 max-h-[calc(92dvh-68px)] flex-1 overflow-y-auto overscroll-contain bg-slate-100 [scrollbar-gutter:stable] [scrollbar-width:thin] sm:max-h-[calc(90dvh-68px)]">
              <div className="p-3 sm:p-4">
                <div id="print-report-area" className="mx-auto flex min-h-[780px] flex-col max-w-[760px] bg-white px-10 py-9 text-[#14213d] shadow-sm ring-1 ring-slate-200 sm:px-12">
                  <div className="flex items-start justify-between gap-6 border-b-2 border-emerald-700 pb-4">
                    <div>
                      <h2 className="text-2xl font-extrabold leading-none text-emerald-700">
                        {labName}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Pathology & Diagnostic Laboratory
                      </p>
                    </div>

                    <div className="max-w-[360px] pt-1 text-right text-[11px] font-medium leading-snug text-slate-500">
                      {labAddress && <p>{labAddress}</p>}
                      {labContact && <p>Contact: {labContact}</p>}
                      <p>Report Date: {reportDate}</p>
                    </div>
                  </div>

                  <h1 className="mt-5 text-center text-lg font-black uppercase tracking-[0.18em] text-slate-950">
                    {testNameDisplay}
                  </h1>

                  <div className="mt-5 rounded-lg border border-slate-300 bg-slate-50/40 p-4">
                    <div className="grid gap-x-8 gap-y-2 text-xs font-bold text-slate-700 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p>
                          Patient Name:{" "}
                          <span className="font-semibold">
                            {patientName}
                          </span>
                        </p>
                        <p>
                          Age / Gender:{" "}
                          <span className="font-semibold">
                            {patientAgeDisplay} / {patientGender}
                          </span>
                        </p>
                        <p>
                          Email Address:{" "}
                          <span className="font-semibold">{patientEmail}</span>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p>
                          Referral Doctor:{" "}
                          <span className="font-semibold">{doctorDisplay}</span>
                        </p>
                        <p>
                          Mobile Number:{" "}
                          <span className="font-semibold">{patientMobile}</span>
                        </p>
                        <p>
                          Sample Type:{" "}
                          <span className="font-semibold">{sampleType}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="rounded-t-md bg-slate-100 px-3 py-2 text-xs font-extrabold uppercase text-slate-700">
                      {testNameDisplay}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-300 text-[11px] font-extrabold text-slate-600">
                            <th className="w-[40%] px-3 py-2">Parameter</th>
                            <th className="w-[24%] px-3 py-2">Value</th>
                            <th className="w-[15%] px-3 py-2">Unit</th>
                            <th className="w-[21%] px-3 py-2">Reference Range</th>
                          </tr>
                        </thead>

                        <tbody>
                          {evaluatedParameters.length > 0 ? (
                            evaluatedParameters.map((param) => (
                              <tr key={param.parameterId} className="border-b border-slate-100">
                                <td className="px-3 py-2.5 font-medium text-slate-900">
                                  {param.parameterName}
                                </td>
                                <td className="px-3 py-2.5 font-extrabold text-slate-950">
                                  {param.value || "—"}
                                </td>
                                <td className="px-3 py-2.5 font-medium text-slate-900">
                                  {param.unit || "—"}
                                </td>
                                <td className="px-3 py-2.5 font-medium text-slate-900">
                                  {param.referenceRange || "—"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-3 py-8 text-center font-semibold text-slate-500">
                                No result parameters to display.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-auto flex justify-center pt-12 pb-4">
                    <img
                      src="https://infinitymedisetu.com/assets/images/logoDark.svg"
                      alt="MediSetu Logo"
                      className="w-20 object-contain grayscale"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col-reverse gap-2 border-t border-[#CFEAE5] bg-white/95 px-3 py-3 shadow-[0_-10px_24px_rgba(15,23,42,0.05)] sm:flex-row sm:justify-end sm:px-4 no-print">
              <Button
                radius="full"
                variant="flat"
                className="h-10 min-w-[108px] border border-[#D7ECE7] bg-white px-5 text-slate-700 shadow-none sm:w-auto font-bold"
                onPress={() => handleClose(onClose)}
              >
                Close
              </Button>

              <Button
                radius="full"
                startContent={<FiPrinter size={16} />}
                className="h-10 border border-[#BFE0D9] bg-white px-5 text-[#0f766e] hover:bg-slate-50 transition active:scale-95 sm:w-auto font-bold animate-fade-in"
                onPress={handlePrint}
              >
                Print Report
              </Button>

              {onUploadGeneratedReport && (
                <Button
                  radius="full"
                  isLoading={isUploadingGeneratedReport}
                  startContent={!isUploadingGeneratedReport && <FiUploadCloud size={16} />}
                  className="h-10 border border-[#0f766e] bg-[#0f766e] px-5 text-white shadow-md hover:bg-[#0b5f59] transition active:scale-95 sm:w-auto font-bold animate-fade-in"
                  onPress={onUploadGeneratedReport}
                >
                  Upload Report
                </Button>
              )}

              <Button
                radius="full"
                isLoading={isDownloading}
                startContent={!isDownloading && <FiDownload size={16} />}
                className="h-10 border border-emerald-600 bg-emerald-600 px-5 text-white shadow-md hover:bg-emerald-700 transition active:scale-95 sm:w-auto font-bold animate-fade-in"
                onPress={onDownload}
              >
                Download PDF
              </Button>
            </div>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
}

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
  const [isPreparingGeneratedReportUpload, setIsPreparingGeneratedReportUpload] = useState(false);
  const [isGeneratingReportDownload, setIsGeneratingReportDownload] = useState(false);

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

  const [isManagingFields, setIsManagingFields] = useState(false);
  const [parameterToDelete, setParameterToDelete] = useState<LabResultTemplateParameter | null>(null);
  const [fieldForm, setFieldForm] = useState<FieldFormState | null>(null);
  const [fieldActionId, setFieldActionId] = useState<string | null>(null);
  const [managedParameters, setManagedParameters] = useState<LabResultTemplateParameter[]>([]);
  const [isLoadingManagedParameters, setIsLoadingManagedParameters] = useState(false);
  const [isRefreshingFields, setIsRefreshingFields] = useState(false);
  const [manageFieldSearch, setManageFieldSearch] = useState("");
  const [manageFieldFilter, setManageFieldFilter] = useState<ManageFieldFilter>("all");

  const [loadTemplateParameters] = useLazyGetLabTemplateParametersQuery();
  const [loadReport] = useLazyGetLabResultReportQuery();
  const [saveResult, { isLoading: isSaving }] = useSaveLabResultMutation();
  const [downloadReport, { isLoading: isDownloadingReport }] = useDownloadLabResultReportMutation();
  const [, { isLoading: isUploadingReportFile }] = useUploadLabResultReportMutation();
  const [uploadAppointmentTestReport, { isLoading: isUploadingGeneratedReport }] =
    useUploadAppointmentTestReportMutation();
  const [, { isLoading: isVerifying }] = useVerifyLabResultMutation();
  const [addCustomField, { isLoading: isAddingCustomField }] = useAddLabCustomFieldMutation();
  const [updateCustomField, { isLoading: isUpdatingCustomField }] = useUpdateLabCustomFieldMutation();
  const [deleteCustomField, { isLoading: isDeletingCustomField }] = useDeleteLabCustomFieldMutation();
  const [overrideDefaultField, { isLoading: isOverridingDefaultField }] = useOverrideLabDefaultFieldMutation();
  const [hideDefaultField, { isLoading: isHidingDefaultField }] = useHideLabDefaultFieldMutation();
  const [unhideDefaultField, { isLoading: isUnhidingDefaultField }] = useUnhideLabDefaultFieldMutation();
  const [resetDefaultFieldOverride, { isLoading: isResettingDefaultField }] = useResetLabDefaultFieldOverrideMutation();

  const isSavingField = isAddingCustomField || isUpdatingCustomField || isOverridingDefaultField;
  const isMutatingField = isSavingField || isDeletingCustomField || isHidingDefaultField || isUnhidingDefaultField || isResettingDefaultField;

  const handleDownload = async () => {
    if (appointmentTest && previewParameters.length > 0) {
      try {
        setIsGeneratingReportDownload(true);
        const logoDataUrl = await getMediSetuPdfLogoDataUrl();
        const reportPdf = await buildGeneratedResultReportPdfFile({
          report: effectiveReport,
          appointmentTest,
          template,
          previewParameters,
          logoDataUrl,
        });

        downloadGeneratedReportFile(reportPdf);
        return;
      } catch (err) {
        console.error("Generated report download failed:", err);
      } finally {
        setIsGeneratingReportDownload(false);
      }
    }

    const pdfUrl = effectiveReport?.pdfUrl || (effectiveReport as any)?.downloadUrl || appointmentTest?.reportPdf;
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
      return;
    }

    const downloadApiUrl = effectiveReport?.reportActions?.downloadApiUrl || `/lab/results/${effectiveReport?.id}/report`;
    try {
      const res = await downloadReport({ downloadApiUrl }).unwrap();
      if (res.pdfUrl) {
        window.open(res.pdfUrl, "_blank");
      } else {
        window.print();
      }
    } catch (_err) {
      window.print();
    }
  };

  const handleUploadGeneratedReport = async () => {
    if (isPreparingGeneratedReportUpload || isUploadingGeneratedReport) {
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

    try {
      setIsPreparingGeneratedReportUpload(true);
      const logoDataUrl = await getMediSetuPdfLogoDataUrl();
      const reportPdf = await buildGeneratedResultReportPdfFile({
        report: effectiveReport,
        appointmentTest,
        template,
        previewParameters,
        logoDataUrl,
      });

      const uploaded = await uploadAppointmentTestReport({
        appointmentTestId,
        reportPdf,
      }).unwrap();
      const uploadedUrl = extractReportPdfUrl(uploaded);

      if (uploadedUrl) {
        setUploadedReportUrl(uploadedUrl);
        setReport((prev) =>
          prev
            ? {
              ...prev,
              pdfUrl: uploadedUrl,
            }
            : prev,
        );
      }

      addToast({
        title: "Report uploaded",
        description: "The generated report was uploaded successfully.",
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
        title: "Upload failed",
        description: getLabApiErrorMessage(err, "Could not upload the generated report."),
        color: "danger",
      });
    } finally {
      setIsPreparingGeneratedReportUpload(false);
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
      setIsManagingFields(true);
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
  }, [template, initialReport]);

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

  const reloadManagedParameters = useCallback(async (
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
        description: getLabApiErrorMessage(err, "Could not load the template fields."),
        color: "danger",
      });
    } finally {
      if (options.silent) {
        setIsRefreshingFields(false);
      } else {
        setIsLoadingManagedParameters(false);
      }
    }
  }, [appointmentTestId, loadTemplateParameters, template?.id]);

  useEffect(() => {
    if (!isManagingFields || !template?.id) return;
    void reloadManagedParameters(template.id);
  }, [isManagingFields, reloadManagedParameters, template?.id]);

  useEffect(() => {
    if (!isEditable) {
      setIsManagingFields(false);
    }
  }, [isEditable]);

  const refreshOpenResultReport = async () => {
    if (!savedResultId) return;

    try {
      const nextReport = await loadReport({ resultId: savedResultId }).unwrap();
      setReport(nextReport);
      setReportActions(nextReport.reportActions);
      setUploadedReportUrl(
        nextReport.reportActions?.currentFileUrl ?? nextReport.pdfUrl ?? null,
      );
    } catch (err) {
      addToast({
        title: "Saved result refresh failed",
        description: getLabApiErrorMessage(err, "Could not refresh the saved result preview."),
        color: "danger",
      });
    }
  };

  const refreshFieldData = async () => {
    if (template?.id) {
      await reloadManagedParameters(template.id, { silent: true });
    }
    await refreshOpenResultReport();
    if (onTemplateUpdated) {
      await onTemplateUpdated();
    }
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
          resultId: report ? savedResultId ?? undefined : undefined,
          field,
        }).unwrap();
      } else if (fieldForm.mode === "edit-custom" && fieldForm.parameterId) {
        await updateCustomField({
          fieldId: fieldForm.parameterId,
          templateId: template.id,
          appointmentTestId,
          resultId: report ? savedResultId ?? undefined : undefined,
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
          resultId: report ? savedResultId ?? undefined : undefined,
          override,
        }).unwrap();
      }

      addToast({
        title: "Field saved",
        description: "The result template fields were updated.",
        color: "success",
      });
      setFieldForm(null);
      await refreshFieldData();
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
      await refreshFieldData();
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
          resultId: report ? savedResultId ?? undefined : undefined,
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
          resultId: report ? savedResultId ?? undefined : undefined,
        }).unwrap(),
      "Default field hidden",
      (parameters) =>
        parameters.map((item) =>
          item.parameterId === parameter.parameterId
            ? { ...item, isHidden: true }
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
          resultId: report ? savedResultId ?? undefined : undefined,
        }).unwrap(),
      "Default field restored",
      (parameters) =>
        parameters.map((item) =>
          item.parameterId === parameter.parameterId
            ? { ...item, isHidden: false }
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
          resultId: report ? savedResultId ?? undefined : undefined,
        }).unwrap(),
      "Default override reset",
      (parameters) =>
        parameters.map((item) =>
          item.parameterId === parameter.parameterId
            ? { ...item, hasOverride: false, isHidden: false }
            : item,
        ),
    );
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
  const isGeneratedReportUploadLoading =
    isPreparingGeneratedReportUpload || isUploadingGeneratedReport;
  const isReportActionLoading =
    isGeneratingReportDownload ||
    isDownloadingReport ||
    isUploadingReportFile ||
    isGeneratedReportUploadLoading;

  const reportValues = effectiveReport?.values ?? [];
  const hasReportValues = reportValues.length > 0;
  const displayedName = effectiveReport?.templateName ?? template?.templateName ?? "Result Template";
  const displayedTemplateName = template
    ? `${displayedName} (${reportTemplateScopeLabel(template)})`
    : displayedName;
  const displayedSampleType = effectiveReport?.sampleType ?? template?.sampleType ?? null;
  const displayedCount = hasReportValues ? reportValues.length : (template?.parameters.length ?? 0);

  const managedFieldStats = useMemo(() => {
    const custom = managedParameters.filter(isCustomParameter).length;
    const override = managedParameters.filter((parameter) => parameter.hasOverride).length;
    const hidden = managedParameters.filter((parameter) => parameter.isHidden).length;
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
    const defaultLabel = managedFieldStats.defaultCount === 1 ? "default field" : "default fields";
    const overrideLabel = managedFieldStats.override === 1 ? "override" : "overrides";
    const customLabel = managedFieldStats.custom === 1 ? "custom field" : "custom fields";
    const hiddenPart = managedFieldStats.hidden > 0 ? `, ${managedFieldStats.hidden} hidden` : "";

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

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="rounded-[8px] border border-slate-200/80 bg-white p-5 text-left shadow-[0_10px_28px_rgba(15,23,42,0.045)]"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-left">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
            <FiFileText />
          </div>
          <h2 className="text-base font-black tracking-tight text-slate-950 sm:text-lg">
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
              <Spinner size="sm" color="success" />
              Loading template...
            </div>
          ) : template || hasReportValues ? (
            <>
              {isManagingFields ? (
                <div className="grid gap-4">
                  <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="relative w-full lg:max-w-xs">
                        <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 z-10" />
                        <input
                          value={manageFieldSearch}
                          onChange={(event) => setManageFieldSearch(event.target.value)}
                          className="h-9 w-full rounded-full border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                          placeholder="Search fields..."
                        />
                      </div>

                      <div className="flex flex-1 flex-wrap items-center gap-1.5 justify-start text-left">
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
                                "h-8 px-4 text-[10px] font-bold transition-all duration-150 active:scale-95",
                                isActive
                                  ? "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-sm"
                                  : "bg-slate-100 hover:bg-slate-200/75 text-slate-600 hover:text-slate-800",
                              ].join(" ")}
                            >
                              {filter.label}
                            </Button>
                          );
                        })}
                      </div>

                      {isRefreshingFields && (
                        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100 px-3 text-[10px] font-bold text-slate-500">
                          <Spinner size="sm" color="success" />
                          Syncing...
                        </span>
                      )}

                      <Button
                        size="sm"
                        radius="full"
                        onPress={() => setFieldForm(emptyFieldForm("add-custom"))}
                        startContent={<FiPlus />}
                        isDisabled={isMutatingField}
                        className="h-9 px-4 text-[10px] font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-[0_4px_14px_rgba(16,185,129,0.2)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.3)] transition-all duration-200 active:scale-95"
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

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3">
                    {isLoadingManagedParameters && managedParameters.length === 0 ? (
                      <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Spinner size="sm" color="success" />
                          Loading fields...
                        </span>
                      </div>
                    ) : visibleManagedParameters.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-400 font-semibold">
                        No fields found.
                      </div>
                    ) : (
                      <div className="grid gap-2.5">
                        {visibleManagedParameters.map((parameter) => {
                          const isCustom = isCustomParameter(parameter);
                          const actionKey = managedParameterActionKey(parameter);
                          const isActionLoading = isMutatingField && fieldActionId === actionKey;
                          const canOverride = parameter.canOverride;
                          const canHide = parameter.canHide;
                          const canEdit = parameter.canEdit;
                          const canDelete = parameter.canDelete;
                          const canResetDefault = !isCustom && (parameter.hasOverride || parameter.isHidden);
                          const hasAnyAction = isCustom
                            ? canEdit || canDelete || canOverride || canHide
                            : canOverride || canHide || canResetDefault;

                          return (
                            <div
                              key={actionKey}
                              className={[
                                "rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200 text-left",
                                isActionLoading ? "pointer-events-none opacity-70" : "",
                              ].join(" ")}
                            >
                              <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-slate-400 text-xs">⋮⋮</span>
                                    <p className="truncate text-xs font-bold text-slate-800">
                                      {parameter.parameterName}
                                    </p>
                                    {parameter.hasOverride && <StatusBadge tone="primary">Override</StatusBadge>}
                                    {parameter.required && <StatusBadge tone="red">Required</StatusBadge>}
                                    {parameter.isHidden && <StatusBadge tone="slate">Hidden</StatusBadge>}
                                    {isCustom ? (
                                      <StatusBadge tone="violet">Custom</StatusBadge>
                                    ) : (
                                      <SourceBadge parameter={parameter} />
                                    )}
                                  </div>

                                  <p className="mt-1.5 truncate text-[10px] font-semibold text-slate-400">
                                    Section: <strong className="text-slate-600">{parameter.sectionName ?? "-"}</strong>{" "}
                                    <span className="mx-1.5 text-slate-200">•</span>
                                    Type: <strong className="text-slate-600">{displayInputType(parameter.inputType)}</strong>{" "}
                                    <span className="mx-1.5 text-slate-200">•</span>
                                    Unit: <strong className="text-slate-600">{parameter.unit ?? "-"}</strong>{" "}
                                    <span className="mx-1.5 text-slate-200">•</span>
                                    Range: <strong className="text-slate-600">{parameter.referenceRange ?? "-"}</strong>
                                  </p>
                                </div>

                                <div className="flex shrink-0 flex-wrap gap-1.5 xl:justify-end">
                                  {!hasAnyAction && (
                                    <span className="rounded-full bg-slate-50 border border-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400">
                                      No actions
                                    </span>
                                  )}

                                  {isCustom ? (
                                    <>
                                      {canEdit && (
                                        <Button
                                          size="sm"
                                          radius="full"
                                          variant="flat"
                                          onPress={() => setFieldForm(fieldFormFromParameter(parameter, "edit-custom"))}
                                          isDisabled={isMutatingField}
                                          className="h-8 px-4 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95"
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
                                          onPress={() => deleteCustomParameter(parameter)}
                                          isLoading={isActionLoading}
                                          isDisabled={isMutatingField}
                                          className="h-8 px-4 text-[10px] font-bold active:scale-95"
                                        >
                                          Delete
                                        </Button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {canOverride && (
                                        <Button
                                          size="sm"
                                          radius="full"
                                          variant="flat"
                                          onPress={() => setFieldForm(fieldFormFromParameter(parameter, "override-default"))}
                                          isDisabled={isMutatingField}
                                          className="h-8 px-4 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95"
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
                                            onPress={() => unhideDefaultParameter(parameter)}
                                            isLoading={isActionLoading}
                                            isDisabled={isMutatingField}
                                            className="h-8 px-4 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95"
                                          >
                                            Unhide
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            radius="full"
                                            variant="flat"
                                            onPress={() => hideDefaultParameter(parameter)}
                                            isLoading={isActionLoading}
                                            isDisabled={isMutatingField}
                                            className="h-8 px-4 text-[10px] font-bold text-slate-600 hover:text-slate-850 bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95"
                                          >
                                            Hide
                                          </Button>
                                        ))}
                                      {canResetDefault && (
                                        <Button
                                          size="sm"
                                          radius="full"
                                          variant="flat"
                                          onPress={() => resetDefaultParameter(parameter)}
                                          isLoading={isActionLoading}
                                          isDisabled={isMutatingField}
                                          className="h-8 px-4 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95"
                                        >
                                          Reset
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {fieldForm &&
                                fieldForm.mode !== "add-custom" &&
                                fieldForm.parameterId === fieldFormParameterId(parameter, fieldForm.mode) && (
                                  <FieldFormPanel
                                    form={fieldForm}
                                    isSaving={isSavingField}
                                    onChange={setFieldForm}
                                    onCancel={() => setFieldForm(null)}
                                    onSubmit={handleFieldFormSubmit}
                                  />
                                )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-3.5 text-[11px] font-semibold text-slate-400">
                    <span>{managedStatsText}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {effectiveReport && !isEditModeOverride ? (
                    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50/40 hover:bg-slate-50 transition-colors text-left focus:outline-none"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                          <p className="text-sm font-bold text-slate-800 tracking-tight">{displayedTemplateName}</p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
                            <span className="flex items-center gap-1.5 bg-white border border-slate-100 px-2.5 py-0.5 rounded-full shadow-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Sample Type: <strong className="text-slate-700">{displayedSampleType ?? "-"}</strong>
                            </span>
                            {report?.status && (
                              <span className="flex items-center gap-1.5 bg-white border border-slate-100 px-2.5 py-0.5 rounded-full shadow-sm">
                                Status: <strong className="text-slate-700">{report.status}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="w-fit inline-flex items-center gap-1 rounded-full bg-emerald-50/80 border border-emerald-100/50 px-3 py-1 text-[11px] font-bold text-emerald-800 shadow-sm">
                            {displayedCount} {displayedCount === 1 ? 'Parameter' : 'Parameters'}
                          </span>
                          <span className="text-slate-400">
                            {isDetailsExpanded ? (
                              <FiChevronUp className="h-5 w-5" />
                            ) : (
                              <FiChevronDown className="h-5 w-5" />
                            )}
                          </span>
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isDetailsExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="border-t border-slate-100 overflow-hidden bg-white"
                          >
                            <div className="p-4 bg-white">
                              <div
                                className="max-h-[460px] overflow-auto rounded-2xl border border-slate-100 bg-white"
                                style={{ scrollbarWidth: "thin" }}
                              >
                                <table className="w-full min-w-[760px] text-left text-xs">
                                  <thead className="sticky top-0 z-10 bg-slate-50/85 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                    <tr>
                                      <th className="px-4 py-3 font-bold w-[25%]">Parameter</th>
                                      <th className="px-4 py-3 font-bold w-[35%]">Value / Input</th>
                                      <th className="px-4 py-3 font-bold w-[12%]">Unit</th>
                                      <th className="px-4 py-3 font-bold w-[15%]">Reference Range</th>
                                      <th className="px-4 py-3 font-bold w-[13%]">Type</th>
                                      {hasReportValues && <th className="px-4 py-3 font-bold">Flag</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100/80">
                                    {reportValues.map((value) => (
                                      <tr key={value.parameterId ?? value.parameterName} className="hover:bg-slate-50/30 transition-all duration-150">
                                        <td className="px-4 py-3 font-bold text-slate-800">
                                          <div className="flex flex-col gap-0.5">
                                            <span>{value.displayName || value.parameterName}</span>
                                            {value.originalParameterName &&
                                              value.originalParameterName !== (value.displayName || value.parameterName) && (
                                                <span className="text-[10px] font-medium text-slate-450">
                                                  Original: {value.originalParameterName}
                                                </span>
                                              )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <input
                                            type={value.inputType === "number" ? "number" : "text"}
                                            value={value.value}
                                            disabled
                                            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold text-slate-500"
                                          />
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 font-semibold">{value.unit ?? "-"}</td>
                                        <td className="px-4 py-3 text-slate-600 font-semibold">{value.referenceRange ?? "-"}</td>
                                        <td className="px-4 py-3">
                                          <span className="inline-flex w-fit items-center rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                            {value.isCustom ? "CUSTOM" : value.sourceType || "DEFAULT"}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span
                                            className={[
                                              "rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                                              value.flag === "High" || value.flag === "Low"
                                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                                : "bg-emerald-50 text-emerald-700 border-emerald-100",
                                            ].join(" ")}
                                          >
                                            {value.flag ?? "-"}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl bg-slate-50/40 border border-slate-100 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                          <p className="text-sm font-bold text-slate-800 tracking-tight">{displayedTemplateName}</p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
                            <span className="flex items-center gap-1.5 bg-white border border-slate-100 px-2.5 py-0.5 rounded-full shadow-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Sample Type: <strong className="text-slate-700">{displayedSampleType ?? "-"}</strong>
                            </span>
                            {report?.status && (
                              <span className="flex items-center gap-1.5 bg-white border border-slate-100 px-2.5 py-0.5 rounded-full shadow-sm">
                                Status: <strong className="text-slate-700">{report.status}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="w-fit inline-flex items-center gap-1 rounded-full bg-emerald-50/80 border border-emerald-100/50 px-3 py-1 text-[11px] font-bold text-emerald-800 shadow-sm">
                          {displayedCount} {displayedCount === 1 ? 'Parameter' : 'Parameters'}
                        </span>
                      </div>

                      <div
                        className="max-h-[460px] overflow-auto rounded-2xl border border-slate-100 bg-white shadow-sm"
                        style={{ scrollbarWidth: "thin" }}
                      >
                        <table className="w-full min-w-[760px] text-left text-xs">
                          <thead className="sticky top-0 z-10 bg-slate-50/85 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                            <tr>
                              <th className="px-4 py-3 font-bold w-[25%]">Parameter</th>
                              <th className="px-4 py-3 font-bold w-[35%]">Value / Input</th>
                              <th className="px-4 py-3 font-bold w-[12%]">Unit</th>
                              <th className="px-4 py-3 font-bold w-[15%]">Reference Range</th>
                              <th className="px-4 py-3 font-bold w-[13%]">Type</th>
                              {hasReportValues && !isEditable && <th className="px-4 py-3 font-bold">Flag</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/80">
                            {isEditable
                              ? template?.parameters.map((parameter) => (
                                <tr key={parameter.parameterId} className="hover:bg-slate-50/30 transition-all duration-150">
                                  <td className="px-4 py-3 font-bold text-slate-800">
                                    {parameter.parameterName}
                                    {parameter.required && <span className="ml-1 text-red-500 font-bold">*</span>}
                                  </td>
                                  <td className="px-4 py-3 min-w-[200px]">
                                    <ResultValueInput
                                      parameter={parameter}
                                      value={values[parameter.parameterId] ?? ""}
                                      disabled={isVerified}
                                      onChange={(value) => setParameterValue(parameter.parameterId, value)}
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-slate-600 font-semibold">{parameter.unit ?? "-"}</td>
                                  <td className="px-4 py-3 text-slate-600 font-semibold">{parameter.referenceRange ?? "-"}</td>
                                  <td className="px-4 py-3">
                                    <SourceBadge parameter={parameter} />
                                  </td>
                                </tr>
                              ))
                              : hasReportValues
                                ? reportValues.map((value) => (
                                  <tr key={value.parameterId ?? value.parameterName} className="hover:bg-slate-50/30 transition-all duration-150">
                                    <td className="px-4 py-3 font-bold text-slate-800">
                                      <div className="flex flex-col gap-0.5">
                                        <span>{value.displayName || value.parameterName}</span>
                                        {value.originalParameterName &&
                                          value.originalParameterName !== (value.displayName || value.parameterName) && (
                                            <span className="text-[10px] font-medium text-slate-450">
                                              Original: {value.originalParameterName}
                                            </span>
                                          )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        type={value.inputType === "number" ? "number" : "text"}
                                        value={value.value}
                                        disabled
                                        className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold text-slate-500"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 font-semibold">{value.unit ?? "-"}</td>
                                    <td className="px-4 py-3 text-slate-600 font-semibold">{value.referenceRange ?? "-"}</td>
                                    <td className="px-4 py-3">
                                      <span className="inline-flex w-fit items-center rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                        {value.isCustom ? "CUSTOM" : value.sourceType || "DEFAULT"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={[
                                          "rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                                          value.flag === "High" || value.flag === "Low"
                                            ? "bg-amber-50 text-amber-700 border-amber-100"
                                            : "bg-emerald-50 text-emerald-700 border-emerald-100",
                                        ].join(" ")}
                                      >
                                        {value.flag ?? "-"}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                                : template?.parameters.map((parameter) => (
                                  <tr key={parameter.parameterId} className="hover:bg-slate-50/30 transition-all duration-150">
                                    <td className="px-4 py-3 font-bold text-slate-800">
                                      {parameter.parameterName}
                                      {parameter.required && <span className="ml-1 text-red-500">*</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        type={parameter.inputType === "number" ? "number" : "text"}
                                        value={values[parameter.parameterId] ?? ""}
                                        disabled
                                        placeholder="No result entered"
                                        className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-400"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 font-semibold">{parameter.unit ?? "-"}</td>
                                    <td className="px-4 py-3 text-slate-600 font-semibold">{parameter.referenceRange ?? "-"}</td>
                                    <td className="px-4 py-3">
                                      <SourceBadge parameter={parameter} />
                                    </td>
                                  </tr>
                                ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  <div className="mt-5 flex w-full flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
                    {effectiveReport && (
                      <Button
                        onPress={() => setIsPreviewModalOpen(true)}
                        startContent={<FiEye className="text-sm" />}
                        className="h-10 px-6 font-bold text-primary border border-[#BFE0D9] bg-white shadow-sm transition-all duration-200 active:scale-95 text-xs rounded-full hover:bg-slate-50"
                      >
                        Preview
                      </Button>
                    )}

                    {canEnter && effectiveReport && !isEditModeOverride && (
                      <Button
                        onPress={handleRequestEditResult}
                        startContent={<FiEdit className="text-sm" />}
                        className="h-10 px-6 font-bold text-white shadow-md bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-[0_4px_14px_rgba(16,185,129,0.2)] transition-all duration-200 active:scale-95 text-xs rounded-full"
                      >
                        Edit Result
                      </Button>
                    )}

                    {isEditable && (
                      <Button
                        onPress={handleSaveCompletedPress}
                        isLoading={isSaving}
                        isDisabled={!canUseTemplate || isVerifying || isVerified || isReportActionLoading || !isDirty}
                        startContent={!isSaving && <FiCheckCircle className="text-sm" />}
                        className={[
                          "h-10 px-6 font-bold text-white shadow-md transition-all duration-200 active:scale-95 text-xs rounded-full",
                          (!canUseTemplate || isVerifying || isVerified || isReportActionLoading || !isDirty)
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                            : "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)]",
                        ].join(" ")}
                      >
                        Save Completed
                      </Button>
                    )}

                    {isEditModeOverride && (
                      <Button
                        onPress={() => {
                          setIsEditModeOverride(false);
                          setValues({ ...initialLoadedValues });
                          setRemarks(initialRemarks);
                        }}
                        className="h-10 px-6 font-bold text-slate-700 border border-slate-200 bg-white shadow-sm transition-all duration-200 active:scale-95 text-xs rounded-full hover:bg-slate-50"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-500 font-bold">
              Result template could not be loaded.
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showConfirmSaveModal}
        onOpenChange={setShowConfirmSaveModal}
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
          base: "rounded-3xl border border-slate-200 shadow-2xl bg-white p-5",
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
            <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
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
                  ? "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800"
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
          base: "rounded-3xl border border-slate-200 shadow-2xl bg-white p-5",
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
            <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
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
                  ? "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800"
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

      <ResultReportPreviewModal
        isOpen={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        report={effectiveReport}
        appointmentTest={appointmentTest}
        template={template}
        remarks={remarks}
        previewParameters={previewParameters}
        onDownload={handleDownload}
        isDownloading={isGeneratingReportDownload || isDownloadingReport}
        onUploadGeneratedReport={handleRequestGeneratedReportUpload}
        isUploadingGeneratedReport={isGeneratedReportUploadLoading}
      />
    </motion.section>
  );
}

export function ResultNotAvailablePlaceholder({
  isPaid,
  sampleStatus,
  nextActionLabel,
  steps,
}: {
  isPaid: boolean;
  sampleStatus?: string;
  nextActionLabel?: string | null;
  steps?: TrackingStep[];
}) {
  const isPaymentCompleted = isPaid;
  const isProcessingCompleted =
    sampleStatus &&
    !["PENDING", "SAMPLE_COLLECTED", "COLLECTED", "RECEIVED_AT_LAB"].includes(
      sampleStatus,
    );
  const isWaitingForReportReady = true;

  const sampleProcessingStep = steps?.find((s) => s.key === "SAMPLE_PROCESSING");
  const processingTimestamp = sampleProcessingStep?.timestamp;
  const expectedReportReadyAt = sampleProcessingStep?.expectedReportReadyAt;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col items-center justify-center text-center min-h-[420px]"
    >
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100">
        <FiLock className="text-2xl" />
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white border-2 border-white">
          <FiDroplet className="text-[8px]" />
        </span>
      </div>

      <h2 className="mt-5 text-lg font-bold text-slate-900">
        Result Entry Not Available Yet
      </h2>
      <p className="mt-1.5 max-w-md text-xs font-medium text-slate-500">
        Result details will appear once the workflow reaches Report Ready.
      </p>

      <div className="mt-8 grid gap-4 w-full sm:grid-cols-3">
        <div
          className={`rounded-2xl border p-4 text-left flex flex-col justify-between min-h-[120px] transition-all ${isPaymentCompleted
            ? "border-emerald-200 bg-emerald-50/20"
            : "border-slate-200 bg-slate-50/50"
            }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <div
                className={`grid h-7 w-7 place-items-center rounded-lg ${isPaymentCompleted
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-slate-200 text-slate-500"
                  }`}
              >
                <FiCreditCard className="text-sm" />
              </div>
              <h3 className="text-xs font-semibold text-slate-900">
                Payment Completed
              </h3>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500 leading-normal">
              Payment has been successfully verified for this test.
            </p>
          </div>
          <span
            className={`mt-3 inline-flex items-center gap-1.5 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ${isPaymentCompleted
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
              }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isPaymentCompleted ? "bg-emerald-500" : "bg-slate-400"
                }`}
            />
            {isPaymentCompleted ? "Completed" : "Pending"}
          </span>
        </div>

        <div
          className={`rounded-2xl border p-4 text-left flex flex-col justify-between min-h-[120px] transition-all ${isProcessingCompleted
            ? "border-blue-200 bg-blue-50/20"
            : "border-slate-200 bg-slate-50/50"
            }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <div
                className={`grid h-7 w-7 place-items-center rounded-lg ${isProcessingCompleted
                  ? "bg-blue-500/10 text-blue-600"
                  : "bg-slate-200 text-slate-500"
                  }`}
              >
                <FiSettings className="text-sm" />
              </div>
              <h3 className="text-xs font-semibold text-slate-900">
                Sample Processing
              </h3>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500 leading-normal">
              The sample has been processed and is ready for testing.
            </p>
            {isProcessingCompleted && processingTimestamp && (
              <p className="mt-2 text-[10px] font-semibold text-slate-550 text-slate-500">
                Processed: <span className="text-slate-700">{formatTimestamp(processingTimestamp)}</span>
              </p>
            )}
            {expectedReportReadyAt && (
              <p className="mt-1 text-[10px] font-semibold text-slate-550 text-slate-500">
                Expected: <span className="text-amber-600 font-bold">{formatTimestamp(expectedReportReadyAt)}</span>
              </p>
            )}
          </div>
          <span
            className={`mt-3 inline-flex items-center gap-1.5 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ${isProcessingCompleted
              ? "bg-blue-50 text-blue-700"
              : "bg-slate-100 text-slate-500"
              }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isProcessingCompleted ? "bg-blue-500" : "bg-slate-400"
                }`}
            />
            {isProcessingCompleted ? "Completed" : "Pending"}
          </span>
        </div>

        <div
          className={`rounded-2xl border p-4 text-left flex flex-col justify-between min-h-[120px] transition-all ${isWaitingForReportReady
            ? "border-amber-200 bg-amber-50/20"
            : "border-slate-200 bg-slate-50/50"
            }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
                <FiClock className="text-sm" />
              </div>
              <h3 className="text-xs font-semibold text-slate-900">
                Waiting for Report Ready
              </h3>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500 leading-normal">
              Results are locked until verification is completed.
            </p>
            {expectedReportReadyAt && (
              <p className="mt-2 text-[10px] font-semibold text-slate-550 text-slate-500">
                Expected Ready: <span className="text-amber-600 font-bold">{formatTimestamp(expectedReportReadyAt)}</span>
              </p>
            )}
          </div>
          <span className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            In Progress
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 w-full rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between text-left">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <FiInfo className="text-sm" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-900">
              Current next step:{" "}
              <span className="font-semibold text-primary">
                {nextActionLabel || "Process Sample"}
              </span>
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              Waiting for verification completion.
            </p>
          </div>
        </div>

      </div>

      <p className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
        <FiLock className="text-[9px]" />
        For data integrity, results cannot be viewed or edited until the report
        is marked as ready.
      </p>
    </motion.section>
  );
}
