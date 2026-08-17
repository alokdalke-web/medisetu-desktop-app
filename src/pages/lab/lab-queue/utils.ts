import type {
  LabDepartmentDto,
  LabTestsStatsOption,
} from "../../../redux/api/labApi";
import type {
  DepartmentOption,
  FilterOption,
  LabTestStatus,
} from "./types";

export const statusFilterOptions: FilterOption[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Deactive", value: "deactive" },
];

export const pageSizeOptions = [6, 10, 15];

export function normalizeStatus(value: unknown): LabTestStatus {
  const status = String(value ?? "").toLowerCase();
  return status === "active" ? "active" : "deactive";
}

export function getDepartmentOption(
  department: LabDepartmentDto,
): DepartmentOption | null {
  const value = String(department.id ?? department._id ?? "").trim();
  const label = String(
    department.departmentName ?? department.name ?? "Department",
  ).trim();

  if (!value) return null;
  return { value, label: label || "Department" };
}

export function getTestDepartmentId(test: any) {
  return String(
    test?.departmentId ??
      test?.department?.id ??
      test?.department?._id ??
      test?.labDepartment?.id ??
      test?.labDepartment?._id ??
      "",
  ).trim();
}

export function getTestDepartmentName(test: any) {
  return String(
    test?.departmentName ??
      test?.department?.departmentName ??
      test?.department?.name ??
      test?.labDepartment?.departmentName ??
      test?.labDepartment?.name ??
      test?.category ??
      "-",
  );
}

export function getSourceLabel(value: unknown) {
  const source = String(value ?? "").toLowerCase();
  if (source === "master") return "Master";
  if (source === "custom") return "Custom";
  return "-";
}

export function getStatsOptionLabel(option: LabTestsStatsOption) {
  if (typeof option === "string") return option.trim();

  return String(
    option.label ??
      option.departmentName ??
      option.name ??
      option.category ??
      option.sampleType ??
      option.value ??
      "",
  ).trim();
}

export function getStatsOptionValue(
  option: LabTestsStatsOption,
  fallback?: string,
) {
  if (typeof option === "string") return String(fallback ?? option).trim();

  return String(
    option.departmentId ??
      option.id ??
      option._id ??
      option.value ??
      fallback ??
      "",
  ).trim();
}

export function getFriendlyTestError(err: any) {
  const raw =
    err?.data?.message ||
    err?.data?.error ||
    err?.error?.message ||
    err?.message ||
    "";
  const lower = String(raw).toLowerCase();
  const statusCode = Number(err?.status ?? err?.originalStatus ?? 0);

  if (
    (statusCode === 409 ||
      lower.includes("duplicate") ||
      lower.includes("already") ||
      lower.includes("exist") ||
      lower.includes("conflict")) &&
    (lower.includes("testcode") ||
      lower.includes("test code") ||
      lower.includes("code"))
  ) {
    return "This test code is already in use. Please use a unique test code.";
  }

  if (
    statusCode === 409 ||
    lower.includes("duplicate") ||
    lower.includes("already") ||
    lower.includes("exist") ||
    lower.includes("conflict")
  ) {
    return "This test already exists in this department.";
  }

  return raw || "Something went wrong";
}

export function getUniqueOptions(values: string[]) {
  return Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value && value !== "-"),
    ),
  )
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ label: value, value }));
}

export function formatListPreview(values: string[]) {
  const cleanValues = Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value && value !== "-"),
    ),
  ).sort((a, b) => a.localeCompare(b));

  if (cleanValues.length === 0) return "-";

  const visible = cleanValues.slice(0, 3).join(", ");
  const remaining = cleanValues.length - 3;

  return remaining > 0 ? `${visible} +${remaining}` : visible;
}

export const normalizeCode = (value: string) => {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/__+/g, "_")
    .replace(/^_+|_+$/g, "");
};

export const firstNonEmptyText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const text = String(value).trim();
    if (text && !["null", "undefined"].includes(text.toLowerCase())) {
      return text;
    }
  }

  return "";
};

export const pickTemplateId = (source: any) => {
  return firstNonEmptyText(
    source?.templateId,
    source?.reportTemplateId,
    source?.resultTemplateId,
    source?.template?.id,
    source?.template?._id,
    source?.reportTemplate?.id,
    source?.reportTemplate?._id,
    source?.resultTemplate?.id,
    source?.resultTemplate?._id,
    source?.data?.templateId,
    source?.data?.reportTemplateId,
    source?.data?.resultTemplateId,
    source?.result?.templateId,
    source?.result?.reportTemplateId,
    source?.result?.resultTemplateId,
  );
};

export const pickLabOrderId = (source: any) => {
  return firstNonEmptyText(
    source?.labOrderId,
    source?.orderId,
    source?.appointmentTestId,
    source?.labOrder?.id,
    source?.labOrder?._id,
    source?.order?.id,
    source?.order?._id,
    source?.appointmentTest?.id,
    source?.appointmentTest?._id,
    source?.data?.labOrderId,
    source?.data?.orderId,
    source?.data?.appointmentTestId,
    source?.result?.labOrderId,
    source?.result?.orderId,
    source?.result?.appointmentTestId,
  );
};

export const pickTemplateName = (source: any, fallback: string) => {
  return (
    firstNonEmptyText(
      source?.templateName,
      source?.reportTemplateName,
      source?.resultTemplateName,
      source?.template?.templateName,
      source?.template?.name,
      source?.reportTemplate?.templateName,
      source?.reportTemplate?.name,
      source?.resultTemplate?.templateName,
      source?.resultTemplate?.name,
      source?.data?.templateName,
      source?.data?.reportTemplateName,
      source?.data?.resultTemplateName,
      source?.result?.templateName,
      source?.result?.reportTemplateName,
      source?.result?.resultTemplateName,
    ) || `${fallback} Result Template`
  );
};

export const pickTestId = (source: any) => {
  return firstNonEmptyText(
    source?.id,
    source?._id,
    source?.data?.id,
    source?.result?.id,
  );
};

export const getTemplateList = (response: any) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.templates)) return response.templates;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

export const findMatchingTemplate = (
  templates: any[],
  context: { testName: string; testCode?: string; masterTestId?: string },
) => {
  const normalizedName = normalizeCode(context.testName);
  const normalizedTestCode = normalizeCode(context.testCode ?? "");
  const testNameLower = context.testName.trim().toLowerCase();

  return templates.find((template) => {
    const templateIdMatch =
      context.masterTestId &&
      firstNonEmptyText(template?.masterTestId, template?.testId) ===
        context.masterTestId;

    if (templateIdMatch) return true;

    const templateCodes = [
      template?.code,
      template?.templateCode,
      template?.testCode,
      template?.reportCode,
    ].map((value) => normalizeCode(String(value ?? "")));

    if (normalizedTestCode && templateCodes.includes(normalizedTestCode)) {
      return true;
    }

    if (templateCodes.includes(`CUSTOM_${normalizedName}`)) {
      return true;
    }

    const templateNames = [
      template?.name,
      template?.templateName,
      template?.testName,
    ]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean);

    return templateNames.includes(testNameLower);
  });
};
