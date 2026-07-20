import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export type WorkflowStatus =
  | "INITIATED"
  | "PENDING"
  | "ON_HOLD"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED";

export type PaymentStatus = "PENDING" | "PAID" | "pending" | "paid" | "failed";

export type SampleStatus =
  | "NOT_STARTED"
  | "SAMPLE_COLLECTION_PENDING"
  | "SAMPLE_COLLECTED"
  | "SAMPLE_RECEIVED_AT_LAB"
  | "SAMPLE_PROCESSING"
  | "TESTING_IN_PROGRESS"
  | "QUALITY_CHECK"
  | "COMPLETED";

export type SampleAction =
  | "MARK_SAMPLE_COLLECTED"
  | "MARK_SAMPLE_RECEIVED_AT_LAB"
  | "START_SAMPLE_PROCESSING"
  | "START_TESTING"
  | "MARK_QUALITY_CHECK_DONE"
  | "MARK_COMPLETED"
  | "SET_EXPECTED_REPORT_READY_AT";

export type NextAction = {
  key: "MARK_PAYMENT_PAID" | SampleAction;
  label: string;
  requiredFields?: string[];
};

export type AppointmentTestListTab = "all" | "assigned" | "my" | "new";
export type LabDashboardDatePreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "custom";
export type LabDashboardTrendPeriod = "daily" | "weekly" | "monthly";


export type BarcodeInfo = {
  format: "CODE_128" | string;
  value: string;
  lookupPath: string;
};

export type AppointmentTestListItem = {
  appointmentTestId: string;
  resultId?: string | null;
  labResultId?: string | null;
  latestResultId?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  uniqueTestId?: string | null;
  barcode?: BarcodeInfo | null;
  patientName: string | null;
  patientId?: string | null;
  independentPatientId?: string | null;
  isIndependent?: boolean;
  patientAge?: string | number | null;
  patientDob?: string | null;
  patientGender?: string | null;
  patientEmail?: string | null;
  patientMobile?: string | null;
  patientPhone?: string | null;
  patientNumber?: string | null;
  doctorName: string | null;
  labId?: string | null;
  labName?: string | null;
  labAddress?: string | null;
  labContactNumber?: string | null;
  testName: string | null;
  category: string | null;
  price: number;
  dateTime: string;
  appointmentTime: string | null;
  workflowStatus: WorkflowStatus;
  paymentStatus: PaymentStatus;
  sampleStatus: SampleStatus;
  reportStatus?: "Initiated" | "InProgress" | "Completed";
  reportPdf?: string | null;
  labAssistantId?: string | null;
  createdAt: string;
  updatedAt: string | null;
  actions?: {
    isActiveLabTest?: boolean;
    canAccept?: boolean;
    canReject?: boolean;
    status?: string;
    unavailableReason?: string;
  };
  availability?: {
    isActiveLabTest?: boolean;
    matchedLabTest?: any;
    unavailableReason?: string;
  };
};

export type AppointmentTestPagination = {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage?: number | null;
  previousPage?: number | null;
};

export type AppointmentTestsArgs = {
  tab: AppointmentTestListTab;
  search?: string;
  status?: WorkflowStatus;
  category?: string;
  page?: number;
  limit?: number;
  datePreset?: LabDashboardDatePreset;
  startDate?: string;
  endDate?: string;
  trendPeriod?: LabDashboardTrendPeriod;
};

export type LabDashboardSummary = {
  totalTests?: number;
  newRequests?: number;
  acceptedRequests?: number;
  acceptedTests?: number;
  onHoldTests?: number;
  urgentOrHoldTests?: number;
  pendingTests?: number;
  inProgressTests?: number;
  readyForReport?: number;
  completedTests?: number;
  rejectedTests?: number;
  pendingReports?: number;
  reportsGenerated?: number;
  todayTests?: number;
  pendingPayments?: number;
  paidTests?: number;
  totalRevenue?: number;
  todayRevenue?: number;
  monthlyRevenue?: number;
};

export type LabDashboardTrendDirection = "up" | "down" | "neutral";

export type LabDashboardMetricTrend = {
  value?: number | string | null;
  previousValue?: number | string | null;
  change?: number | string | null;
  percentage?: number | string | null;
  trendPercentage?: number | string | null;
  direction?: LabDashboardTrendDirection | string | null;
  comparisonLabel?: string | null;
  comparisonStartDate?: string | null;
  comparisonEndDate?: string | null;
};

export type LabDashboardKpiTrends = {
  totalTests?: LabDashboardMetricTrend | null;
  newRequests?: LabDashboardMetricTrend | null;
  acceptedRequests?: LabDashboardMetricTrend | null;
  rejectedRequests?: LabDashboardMetricTrend | null;
  inProgressTests?: LabDashboardMetricTrend | null;
  completedTests?: LabDashboardMetricTrend | null;
  pendingReports?: LabDashboardMetricTrend | null;
  totalRevenue?: LabDashboardMetricTrend | null;
};

export type LabDashboardLabInsights = {
  turnaroundTime?: LabDashboardMetricTrend | number | string | null;
  reportAccuracy?: LabDashboardMetricTrend | number | string | null;
  sampleRejectionRate?: LabDashboardMetricTrend | number | string | null;
  reportsGenerated?: LabDashboardMetricTrend | number | string | null;
};

export type LabDashboardMeta = {
  comparisonLabel?: string | null;
  comparisonPeriod?: string | null;
  comparisonStartDate?: string | null;
  comparisonEndDate?: string | null;
};

export type LabDashboardBreakdownItem = {
  key?: string;
  label?: string;
  count?: number;
  value?: number;
  amount?: number;
  percentage?: number;
};

export type LabDashboardTrendPoint = {
  date?: string;
  day?: string;
  month?: string;
  label?: string;
  tests?: number;
  revenue?: number;
  volume?: number;
};

export type LabDashboardTopRequestedTest = {
  testName?: string;
  category?: string;
  count?: number;
  revenue?: number;
};

export type LabDashboardTopReferringDoctor = {
  doctorName?: string;
  department?: string;
  count?: number;
  revenue?: number;
};

export type LabDashboardCatalogGap = {
  testName?: string;
  category?: string;
  requestCount?: number;
};

export type LabDashboardRecentActivity = {
  appointmentTestId?: string;
  title?: string;
  patientName?: string;
  doctorName?: string;
  testName?: string;
  workflowStatus?: WorkflowStatus | string;
  paymentStatus?: PaymentStatus | string;
  sampleStatus?: SampleStatus | string;
  createdAt?: string;
  updatedAt?: string | null;
};

export type LabDashboardSlaAlerts = {
  overdueSamples?: number;
  overdueReports?: number;
  pendingPaymentOlderThan24h?: number;
};

export type LabDashboardRequestReviewCard = {
  key?: string;
  label?: string;
  value?: number | string | null;
  valueType?: "number" | "currency" | string;
};

export type LabDashboardRequestReview = {
  totalRequests?: number | string | null;
  newRequests?: number | string | null;
  todayRequests?: number | string | null;
  activeRequests?: number | string | null;
  acceptableRequests?: number | string | null;
  acceptedRequests?: number | string | null;
  acceptedToday?: number | string | null;
  unavailableRequests?: number | string | null;
  rejectedRequests?: number | string | null;
  todayPaymentTotal?: number | string | null;
  currentDatePaymentTotal?: number | string | null;
  pendingPaymentTotal?: number | string | null;
  cards?: LabDashboardRequestReviewCard[];
  recentRejectedRequests?: AppointmentTestListItem[];
};

export type LabDashboardUpcomingSampleCollection = {
  appointmentTestId: string;
  patientName?: string | null;
  testName?: string | null;
  sampleType?: string | null;
  collectionTime?: string | null;
  patientMobile?: string | null;
  patientPhone?: string | null;
  patientNumber?: string | null;
};

export type LabDashboardData = {
  summary?: LabDashboardSummary;
  kpiTrends?: LabDashboardKpiTrends | null;
  labInsights?: LabDashboardLabInsights | null;
  meta?: LabDashboardMeta | null;
  statusBreakdown?: LabDashboardBreakdownItem[];
  paymentBreakdown?: LabDashboardBreakdownItem[];
  sampleWorkflowFunnel?: LabDashboardBreakdownItem[];
  dailyTrend?: LabDashboardTrendPoint[];
  weeklyTrend?: LabDashboardTrendPoint[];
  monthlyTrend?: LabDashboardTrendPoint[];
  topRequestedTests?: LabDashboardTopRequestedTest[];
  topReferringDoctors?: LabDashboardTopReferringDoctor[];
  catalogGaps?: LabDashboardCatalogGap[];
  recentActivity?: LabDashboardRecentActivity[];
  upcomingSampleCollections?: LabDashboardUpcomingSampleCollection[];
  slaAlerts?: LabDashboardSlaAlerts;
  requestReview?: LabDashboardRequestReview | null;
  pagination: AppointmentTestPagination;
  dashboard?: LabDashboardData | null;
};

export type AppointmentTestsResponse = {
  success: boolean;
  labName?: string | null;
  lab?: {
    id?: string | null;
    name?: string | null;
    address?: string | null;
    contactNo?: string | null;
    email?: string | null;
    logo?: string | null;
    labStatus?: string | null;
  } | null;
  data: AppointmentTestListItem[];
  pagination: AppointmentTestPagination;
  dashboard?: LabDashboardData | null;
};

export type CreateIndependentAppointmentTestsPayload = {
  testIds: string[];
  patientName: string;
  patientMobile: string;
  patientAge: number;
  patientGender: string;
  doctorName: string;
};

export type CreateIndependentAppointmentTestsResponse = {
  success: boolean;
  count: number;
  results: AppointmentTestListItem[];
};

export type TrackingStep = {
  key: "PAYMENT_COMPLETED" | SampleStatus;
  title: string;
  description: string;
  status: "COMPLETED" | "PENDING" | "LOCKED";
  timestamp: string | null;
  expectedReportReadyAt?: string | null;
};

export type TrackingEvent = {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  actorUserId: string | null;
  actorUserName?: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type TrackingDetail = {
  appointmentTest: {
    id: string;
    resultId?: string | null;
    labResultId?: string | null;
    latestResultId?: string | null;
    invoiceId?: string | null;
    invoiceNumber?: string | null;
    uniqueTestId?: string | null;
    barcode?: BarcodeInfo | null;
    patientName: string | null;
    patientId?: string | null;
    independentPatientId?: string | null;
    isIndependent?: boolean;
    patientAge?: string | number | null;
    patientDob?: string | null;
    patientGender?: string | null;
    patientEmail?: string | null;
    patientMobile?: string | null;
    doctorName: string | null;
    labId?: string | null;
    labName?: string | null;
    labAddress?: string | null;
    labContactNumber?: string | null;
    clinicName?: string | null;
    clinicAddress?: string | null;
    testName: string | null;
    category: string | null;
    price: number;
    dateTime: string;
    appointmentTime: string | null;
    workflowStatus: WorkflowStatus;
    paymentStatus: PaymentStatus;
    sampleStatus: SampleStatus;
    reportPdf?: string | null;
    expectedReportReadyAt?: string | null;
    readyForReportAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  payment: {
    status: PaymentStatus;
    amount: number;
    collectedAt: string | null;
    collectedBy: string | null;
  };
  steps: TrackingStep[];
  events: TrackingEvent[];
  nextAction: NextAction | null;
  reportSchedule?: {
    expectedReportReadyAt?: string | null;
  } | null;
};

export type TrackingResponse = {
  success: boolean;
  data: TrackingDetail;
};

export type LabMarkPaidResponse = {
  success: boolean;
  message?: string;
  data?: {
    appointmentTestId?: string;
    workflowStatus?: WorkflowStatus;
    paymentStatus?: PaymentStatus;
    paymentMethod?: string | null;
    transactionId?: string | null;
    sampleStatus?: SampleStatus;
    invoiceId?: string | null;
    invoiceNumber?: string | null;
  } | null;
};

export type LabInvoiceItem = {
  id: string;
  appointmentTestId?: string | null;
  testId?: string | null;
  testName: string | null;
  category?: string | null;
  sampleType?: string | null;
  barcodeValue?: string | null;
  quantity: number;
  price: string | number;
  discountPercent?: string | number | null;
  gstPercentage?: string | number | null;
  total: string | number;
  gstBreakdown?: {
    gstPercentage?: number;
    cgst?: number;
    sgst?: number;
    gstAmount?: number;
  } | null;
};

export type LabInvoice = {
  id: string;
  invoiceNumber?: string | null;
  appointmentTestId?: string | null;
  labId?: string | null;
  labName?: string | null;
  labAddress?: string | null;
  labContactNumber?: string | null;
  patientName?: string | null;
  patientMobile?: string | null;
  doctorName?: string | null;
  testId?: string | null;
  testName?: string | null;
  category?: string | null;
  sampleType?: string | null;
  barcodeValue?: string | null;
  quantity?: number | null;
  price?: string | number | null;
  discountPercent?: string | number | null;
  gstPercentage?: string | number | null;
  paymentMethod?: string | null;
  paymentNotes?: string | null;
  subtotal?: string | number | null;
  gstAmount?: string | number | null;
  discountAmount?: string | number | null;
  totalAmount?: string | number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  items?: LabInvoiceItem[];
};

export type LabInvoiceResponse = {
  success: boolean;
  data: LabInvoice | null;
};

export type ApiErrorShape =
  | {
      success: false;
      errors: Array<{ path: string; message: string; code: string }>;
    }
  | {
      success: false;
      status: number;
      message: string;
      details?: unknown;
    };

export type LabResultInputType =
  | "number"
  | "text"
  | "textarea"
  | "date"
  | "boolean"
  | "select";

export type LabResultParameterSourceType = "DEFAULT" | "CUSTOM" | string;

export type LabResultTemplateParameter = {
  id: string;
  parameterId: string;
  templateId: string | null;
  sectionName: string | null;
  parameterName: string;
  originalParameterName: string | null;
  inputType: LabResultInputType;
  unit: string | null;
  referenceRange: string | null;
  required: boolean;
  isRequired: boolean;
  sortOrder: number;
  sourceType: LabResultParameterSourceType;
  isCustom: boolean;
  isDefault: boolean;
  isHidden: boolean;
  hasOverride: boolean;
  canOverride: boolean;
  canHide: boolean;
  canEdit: boolean;
  canDelete: boolean;
  options: string[];
  value: string;
};

export type LabResultTemplate = {
  id: string;
  labId: string | null;
  labName?: string | null;
  labAddress?: string | null;
  labContactNumber?: string | null;
  patientName?: string | null;
  patientAge?: string | null;
  patientDob?: string | null;
  patientGender?: string | null;
  patientEmail?: string | null;
  patientMobile?: string | null;
  resultId?: string | null;
  resultStatus?: string | null;
  resultRemarks?: string | null;
  templateCode: string | null;
  templateName: string;
  testName: string;
  sampleType: string | null;
  parameters: LabResultTemplateParameter[];
  hiddenParameters: LabResultTemplateParameter[];
};

export type LabResultValuePayload = {
  parameterId: string;
  value: string;
};

export type LabResultSavePayload = {
  appointmentTestId: string;
  templateId: string;
  status: "Completed" | "Draft";
  remarks?: string;
  values: LabResultValuePayload[];
};

export type LabReportActions = {
  canDownload: boolean;
  downloadApiUrl: string | null;
  downloadUrl: string | null;
  canUpload: boolean;
  uploadUrl: string | null;
  uploadField: "reportPdf";
  allowedUploadFormats: string[];
  currentFileUrl: string | null;
};

export type LabResultSaveResponse = {
  id: string | null;
  status?: string | null;
  reportGenerated?: boolean;
  pdfUrl?: string | null;
  generatedAt?: string | null;
  reportActions: LabReportActions | null;
  report: LabResultReport | null;
  raw: unknown;
};

export type LabReportDownloadResponse = {
  pdfUrl: string | null;
  downloadUrl: string | null;
  reportGenerated: boolean;
  generatedAt: string | null;
  reportData: unknown;
  raw: unknown;
};

export type LabReportUploadResponse = {
  uploadedReport: {
    url: string | null;
    raw: unknown;
  } | null;
  reportActions: LabReportActions | null;
  raw: unknown;
};

export type LabResultReportValue = {
  parameterId: string | null;
  sectionName: string | null;
  parameterName: string;
  displayName: string;
  originalParameterName: string | null;
  sourceType: LabResultParameterSourceType | null;
  isCustom: boolean | null;
  inputType: LabResultInputType;
  sortOrder: number;
  isRequired: boolean;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  flag: string | null;
};

export type LabResultReport = {
  id: string | null;
  patient: string;
  doctor: string;
  clinic: string;
  testName: string;
  templateName: string;
  sampleType: string | null;
  status: string | null;
  remarks: string | null;
  values: LabResultReportValue[];
  verifiedBy: string | null;
  verifiedAt: string | null;
  generatedAt: string | null;
  reportGenerated: boolean;
  pdfUrl: string | null;
  reportActions: LabReportActions | null;
  raw: unknown;
};

export type LabResultFieldInput = {
  sectionName: string;
  parameterName: string;
  unit?: string | null;
  referenceRange?: string | null;
  inputType: LabResultInputType;
  sortOrder?: number;
  isRequired?: boolean;
};

export type LabDefaultFieldOverrideInput = {
  templateId: string;
  displayNameOverride?: string | null;
  unitOverride?: string | null;
  referenceRangeOverride?: string | null;
  inputTypeOverride?: LabResultInputType | null;
  sectionNameOverride?: string | null;
  sortOrderOverride?: number | null;
  isRequiredOverride?: boolean | null;
};

const emptyPagination: AppointmentTestPagination = {
  totalRecords: 0,
  totalPages: 1,
  currentPage: 1,
  pageSize: 10,
  hasNextPage: false,
  hasPreviousPage: false,
};

function normalizeListResponse(response: any): AppointmentTestsResponse {
  const root = unwrapApiData(response);
  const data = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(root?.tests)
      ? root.tests
      : Array.isArray(root)
        ? root
        : [];
  const pagination =
    response?.pagination && typeof response.pagination === "object"
      ? response.pagination
      : root?.pagination && typeof root.pagination === "object"
        ? root.pagination
        : {};

  return {
    success: Boolean(response?.success ?? true),
    labName: firstText(response?.labName, root?.labName) || null,
    lab:
      response?.lab && typeof response.lab === "object"
        ? response.lab
        : root?.lab && typeof root.lab === "object"
          ? root.lab
          : null,
    data,
    pagination: {
      ...emptyPagination,
      ...pagination,
    },
    dashboard: response?.dashboard ?? root?.dashboard ?? null,
  };
}

function normalizeLabInvoiceResponse(response: any): LabInvoiceResponse {
  const data = unwrapApiData(response);

  return {
    success: Boolean(response?.success ?? true),
    data: data && typeof data === "object" ? (data as LabInvoice) : null,
  };
}

export function getLabApiErrorMessage(error: unknown, fallback: string) {
  const payload: any = (error as any)?.data ?? error;

  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors
      .map((item: any) => item?.message)
      .filter(Boolean)
      .join(", ");
  }

  return payload?.message ?? (error as any)?.error ?? fallback;
}

function unwrapApiData(response: any) {
  return response?.data ?? response?.result ?? response;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }

  return "";
}

function normalizeApiEndpointUrl(value: unknown) {
  const url = firstText(value);
  if (!url) return "";
  if (/^[a-z][a-z\d+\-.]*:/i.test(url)) return url;

  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;

  try {
    const basePath = new URL(import.meta.env.VITE_API_BASE_URL).pathname.replace(
      /\/$/,
      "",
    );

    if (basePath && normalizedUrl === basePath) return "/";
    if (basePath && normalizedUrl.startsWith(`${basePath}/`)) {
      return normalizedUrl.slice(basePath.length) || "/";
    }
  } catch (_err) {
    return normalizedUrl.replace(/^\/api\/v\d+(?=\/)/i, "");
  }

  return normalizedUrl;
}

function normalizeBarcodeInfo(value: unknown): BarcodeInfo | null {
  if (!value || typeof value !== "object") return null;

  const source = value as any;
  const barcodeValue = firstText(source.value, source.barcodeValue, source.code);
  if (!barcodeValue) return null;

  return {
    format: firstText(source.format, "CODE_128"),
    value: barcodeValue,
    lookupPath:
      normalizeApiEndpointUrl(source.lookupPath ?? source.lookupUrl) ||
      `/lab/appointment-tests/barcode/${encodeURIComponent(barcodeValue)}`,
  };
}

function normalizeLabResultInputType(value: unknown): LabResultInputType {
  const inputType = String(value ?? "text").toLowerCase();

  if (
    inputType === "number" ||
    inputType === "textarea" ||
    inputType === "date" ||
    inputType === "boolean" ||
    inputType === "select"
  ) {
    return inputType;
  }

  return "text";
}

function normalizeStringOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "object" && item !== null
          ? firstText(
              (item as any).value,
              (item as any).label,
              (item as any).name,
              (item as any).option,
            )
          : String(item ?? "").trim(),
      )
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeLabReportActions(response: any): LabReportActions | null {
  const root = unwrapApiData(response);
  const source =
    root?.reportActions ??
    root?.actions?.reportActions ??
    root?.report?.reportActions ??
    root?.reportData?.reportActions ??
    null;

  if (!source || typeof source !== "object") return null;

  const formats = normalizeStringOptions(source.allowedUploadFormats)
    .map((format) => format.toLowerCase())
    .filter(Boolean);

  return {
    canDownload: Boolean(source.canDownload),
    downloadApiUrl: normalizeApiEndpointUrl(source.downloadApiUrl) || null,
    downloadUrl: firstText(source.downloadUrl) || null,
    canUpload: Boolean(source.canUpload),
    uploadUrl: normalizeApiEndpointUrl(source.uploadUrl) || null,
    uploadField: "reportPdf",
    allowedUploadFormats:
      formats.length > 0 ? formats : ["pdf", "jpg", "jpeg", "png", "webp"],
    currentFileUrl: firstText(source.currentFileUrl) || null,
  };
}

function normalizeLabReportDownloadResponse(
  response: any,
): LabReportDownloadResponse {
  const root = unwrapApiData(response);

  return {
    pdfUrl: firstText(root?.pdfUrl, root?.reportData?.pdfUrl) || null,
    downloadUrl:
      firstText(
        root?.downloadUrl,
        root?.reportData?.downloadUrl,
        root?.reportData?.reportActions?.downloadUrl,
      ) || null,
    reportGenerated: Boolean(
      root?.reportGenerated ?? root?.reportData?.reportGenerated,
    ),
    generatedAt:
      firstText(root?.generatedAt, root?.reportData?.generatedAt) || null,
    reportData: root?.reportData ?? null,
    raw: response,
  };
}

function normalizeLabReportUploadResponse(
  response: any,
): LabReportUploadResponse {
  const root = unwrapApiData(response);
  const uploaded = root?.uploadedReport ?? root?.report ?? root?.file ?? null;
  const uploadedUrl =
    firstText(
      uploaded?.url,
      uploaded?.fileUrl,
      uploaded?.reportUrl,
      root?.uploadedReportUrl,
      root?.url,
      root?.reportActions?.currentFileUrl,
    ) || null;

  return {
    uploadedReport:
      uploaded || uploadedUrl
        ? {
            url: uploadedUrl,
            raw: uploaded ?? null,
          }
        : null,
    reportActions: normalizeLabReportActions(response),
    raw: response,
  };
}

function normalizeLabResultParameter(
  item: any,
  forcedHidden?: boolean,
): LabResultTemplateParameter {
  const sortOrder = Number(item?.sortOrder ?? item?.order ?? 0);
  const sourceType = firstText(item?.sourceType, item?.type, "DEFAULT");
  const isCustom = Boolean(item?.isCustom ?? sourceType === "CUSTOM");
  const parameterId = firstText(
    item?.parameterId,
    item?.fieldId,
    item?.id,
    item?._id,
  );
  const isRequired = Boolean(item?.required ?? item?.isRequired);

  return {
    id: parameterId,
    parameterId,
    templateId: firstText(item?.templateId, item?.reportTemplateId) || null,
    sectionName: firstText(item?.sectionName, item?.section) || null,
    parameterName: firstText(item?.parameterName, item?.name, "Parameter"),
    originalParameterName:
      firstText(item?.originalParameterName, item?.originalName) || null,
    inputType: normalizeLabResultInputType(item?.input ?? item?.inputType),
    unit: firstText(item?.unit, item?.parameterUnit) || null,
    referenceRange:
      firstText(item?.referenceRange, item?.range, item?.normalRange) || null,
    required: isRequired,
    isRequired,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    sourceType,
    isCustom,
    isDefault: Boolean(item?.isDefault ?? (!isCustom && sourceType === "DEFAULT")),
    isHidden: Boolean(forcedHidden ?? item?.isHidden ?? item?.hidden),
    hasOverride: Boolean(item?.hasOverride ?? item?.isOverridden ?? item?.overridden),
    canOverride: Boolean(item?.canOverride),
    canHide: Boolean(item?.canHide),
    canEdit: Boolean(item?.canEdit),
    canDelete: Boolean(item?.canDelete),
    options: normalizeStringOptions(
      item?.options ?? item?.selectOptions ?? item?.allowedValues,
    ),
    value: firstText(item?.value, item?.defaultValue),
  };
}

function firstArray(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

function normalizeLabResultTemplateResponse(
  response: any,
): LabResultTemplate {
  const root = unwrapApiData(response);
  const template = root?.template ?? root?.resultTemplate ?? root;
  const patient = root?.patient ?? root?.patientDetails ?? template?.patient ?? {};
  const lab = root?.lab ?? root?.laboratory ?? template?.lab ?? {};
  const clinic = root?.clinic ?? template?.clinic ?? {};
  const rawParameters = firstArray(
    template?.parameters,
    root?.parameters,
    root?.templateParameters,
    root?.resultParameters,
  );
  const rawHiddenParameters = firstArray(
    template?.hiddenParameters,
    template?.hiddenDefaultParameters,
    root?.hiddenParameters,
    root?.hiddenDefaultParameters,
  );

  const parameterMap = new Map<string, LabResultTemplateParameter>();

  rawParameters.forEach((item) => {
    const parameter = normalizeLabResultParameter(item);
    parameterMap.set(parameter.id, parameter);
  });

  rawHiddenParameters.forEach((item) => {
    const parameter = normalizeLabResultParameter(item, true);
    parameterMap.set(parameter.id, parameter);
  });

  const parameters = [...parameterMap.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return {
    id: firstText(template?.templateId, template?.id, root?.templateId),
    labId: firstText(template?.labId, root?.labId) || null,
    labName:
      firstText(
        template?.labName,
        root?.labName,
        lab?.name,
        lab?.labName,
        clinic?.name,
        clinic?.clinicName,
      ) || null,
    labAddress:
      firstText(
        template?.labAddress,
        root?.labAddress,
        lab?.address,
        lab?.labAddress,
        clinic?.address,
        clinic?.clinicAddress,
      ) || null,
    labContactNumber:
      firstText(
        template?.labContactNumber,
        root?.labContactNumber,
        lab?.contactNumber,
        lab?.mobile,
        lab?.phone,
        clinic?.mobile,
        clinic?.phone,
      ) || null,
    patientName:
      firstText(
        root?.patientName,
        template?.patientName,
        patient?.name,
        patient?.fullName,
        patient?.displayName,
      ) || null,
    patientAge:
      firstText(root?.patientAge, template?.patientAge, patient?.age) || null,
    patientDob:
      firstText(
        root?.patientDob,
        template?.patientDob,
        patient?.dob,
        patient?.dateOfBirth,
      ) || null,
    patientGender:
      firstText(root?.patientGender, template?.patientGender, patient?.gender) ||
      null,
    patientEmail:
      firstText(root?.patientEmail, template?.patientEmail, patient?.email) ||
      null,
    patientMobile:
      firstText(
        root?.patientMobile,
        root?.patientPhone,
        template?.patientMobile,
        template?.patientPhone,
        patient?.mobile,
        patient?.phone,
        patient?.contactNumber,
      ) || null,
    resultId: findLabResultId(response),
    resultStatus: firstText(root?.result?.status, root?.status) || null,
    resultRemarks: firstText(root?.result?.remarks, root?.remarks) || null,
    templateCode:
      firstText(template?.templateCode, template?.code, root?.templateCode) ||
      null,
    templateName: firstText(
      template?.templateName,
      template?.name,
      root?.templateName,
      root?.name,
      "Result Template",
    ),
    testName: firstText(
      template?.testName,
      template?.test?.name,
      root?.testName,
      root?.test?.name,
      template?.templateName,
      "Lab Result",
    ),
    sampleType:
      firstText(
        template?.sampleType,
        root?.sampleType,
        template?.sample?.type,
        root?.sample?.type,
      ) || null,
    parameters: parameters.filter((parameter) => !parameter.isHidden),
    hiddenParameters: parameters.filter((parameter) => parameter.isHidden),
  };
}

function normalizeLabTemplateParametersResponse(
  response: any,
): LabResultTemplateParameter[] {
  const root = unwrapApiData(response);
  const rawParameters = firstArray(
    root,
    root?.parameters,
    root?.templateParameters,
    root?.data?.parameters,
    response?.data,
    response?.parameters,
  );

  return rawParameters
    .map((item) => normalizeLabResultParameter(item))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function normalizeTrackingResponse(response: any): TrackingResponse {
  const root = unwrapApiData(response);
  const appointmentTest = root?.appointmentTest ?? root?.labOrder ?? root ?? {};
  const test =
    appointmentTest?.test ??
    appointmentTest?.testDetails ??
    appointmentTest?.labTest ??
    appointmentTest?.patientTest ??
    root?.test ??
    root?.testDetails ??
    {};
  const result =
    appointmentTest?.result ??
    appointmentTest?.labResult ??
    root?.result ??
    root?.labResult ??
    {};
  const patient =
    appointmentTest?.patient ??
    appointmentTest?.patientDetails ??
    root?.patient ??
    root?.patientDetails ??
    {};
  const lab =
    appointmentTest?.lab ??
    appointmentTest?.laboratory ??
    root?.lab ??
    root?.laboratory ??
    {};
  const clinic =
    appointmentTest?.clinic ??
    root?.clinic ??
    root?.clinicDetails ??
    {};
  const sample = root?.sample ?? appointmentTest?.sample ?? {};
  const payment = root?.payment ?? {};

  return {
    success: Boolean(response?.success ?? true),
    data: {
      ...root,
      appointmentTest: {
        ...appointmentTest,
        id: firstText(
          appointmentTest?.id,
          appointmentTest?.appointmentTestId,
          appointmentTest?._id,
          root?.appointmentTestId,
        ),
        resultId:
          firstText(
            appointmentTest?.resultId,
            appointmentTest?.labResultId,
            appointmentTest?.latestResultId,
            result?.id,
            result?.resultId,
            result?._id,
          ) || null,
        invoiceId:
          firstText(
            appointmentTest?.invoiceId,
            appointmentTest?.invoice?.id,
            root?.invoiceId,
            root?.invoice?.id,
          ) || null,
        invoiceNumber:
          firstText(
            appointmentTest?.invoiceNumber,
            appointmentTest?.invoice?.invoiceNumber,
            root?.invoiceNumber,
            root?.invoice?.invoiceNumber,
          ) || null,
        uniqueTestId:
          firstText(
            appointmentTest?.uniqueTestId,
            appointmentTest?.unique_test_id,
            test?.uniqueTestId,
            test?.unique_test_id,
            root?.uniqueTestId,
            root?.unique_test_id,
          ) || null,
        barcode: normalizeBarcodeInfo(
          appointmentTest?.barcode ?? test?.barcode ?? root?.barcode,
        ),
        patientName:
          firstText(
            appointmentTest?.patientName,
            appointmentTest?.independentPatient?.patientName,
            appointmentTest?.independentPatient?.name,
            appointmentTest?.patient?.name,
            patient?.name,
            patient?.fullName,
            patient?.displayName,
            root?.patientName,
            root?.independentPatient?.patientName,
            root?.independentPatient?.name,
            root?.patient?.name,
          ) || null,
        patientId:
          firstText(
            appointmentTest?.patientId,
            patient?.id,
            patient?._id,
            root?.patientId,
            sample?.patientId,
          ) || null,
        independentPatientId:
          firstText(
            appointmentTest?.independentPatientId,
            appointmentTest?.independentPatient?.id,
            appointmentTest?.independentPatient?._id,
            root?.independentPatientId,
            root?.independentPatient?.id,
            root?.independentPatient?._id,
          ) || null,
        isIndependent: Boolean(
          appointmentTest?.isIndependent ??
            appointmentTest?.independentPatientId ??
            appointmentTest?.independentPatient ??
            root?.isIndependent ??
            root?.independentPatientId ??
            root?.independentPatient,
        ),
        patientAge:
          firstText(
            appointmentTest?.patientAge,
            appointmentTest?.age,
            appointmentTest?.independentPatient?.patientAge,
            appointmentTest?.independentPatient?.age,
            patient?.age,
            root?.patientAge,
            root?.age,
            root?.independentPatient?.patientAge,
            root?.independentPatient?.age,
          ) || null,
        patientDob:
          firstText(
            appointmentTest?.patientDob,
            appointmentTest?.dob,
            patient?.dob,
            patient?.dateOfBirth,
            root?.patientDob,
            root?.dob,
          ) || null,
        patientGender:
          firstText(
            appointmentTest?.patientGender,
            appointmentTest?.gender,
            appointmentTest?.independentPatient?.patientGender,
            appointmentTest?.independentPatient?.gender,
            patient?.gender,
            root?.patientGender,
            root?.gender,
            root?.independentPatient?.patientGender,
            root?.independentPatient?.gender,
          ) || null,
        patientEmail:
          firstText(
            appointmentTest?.patientEmail,
            appointmentTest?.email,
            patient?.email,
            root?.patientEmail,
            root?.email,
          ) || null,
        patientMobile:
          firstText(
            appointmentTest?.patientMobile,
            appointmentTest?.patientPhone,
            appointmentTest?.mobile,
            appointmentTest?.phone,
            appointmentTest?.independentPatient?.patientMobile,
            appointmentTest?.independentPatient?.mobile,
            appointmentTest?.independentPatient?.phone,
            patient?.mobile,
            patient?.phone,
            patient?.contactNumber,
            root?.patientMobile,
            root?.patientPhone,
            root?.mobile,
            root?.phone,
            root?.independentPatient?.patientMobile,
            root?.independentPatient?.mobile,
            root?.independentPatient?.phone,
          ) || null,
        doctorName:
          firstText(
            appointmentTest?.doctorName,
            appointmentTest?.referringDoctorName,
            appointmentTest?.independentPatient?.doctorName,
            appointmentTest?.doctor?.name,
            root?.doctorName,
            root?.referringDoctorName,
            root?.independentPatient?.doctorName,
            root?.doctor?.name,
          ) || null,
        labId:
          firstText(
            appointmentTest?.labId,
            lab?.id,
            lab?._id,
            root?.labId,
            sample?.labId,
          ) || null,
        labName:
          firstText(
            appointmentTest?.labName,
            appointmentTest?.laboratoryName,
            lab?.name,
            lab?.labName,
            lab?.laboratoryName,
            root?.labName,
            root?.laboratoryName,
          ) || null,
        labAddress:
          firstText(
            appointmentTest?.labAddress,
            lab?.address,
            lab?.labAddress,
            root?.labAddress,
            root?.laboratoryAddress,
          ) || null,
        labContactNumber:
          firstText(
            appointmentTest?.labContactNumber,
            appointmentTest?.labPhone,
            lab?.contactNumber,
            lab?.mobile,
            lab?.phone,
            root?.labContactNumber,
            root?.labPhone,
          ) || null,
        clinicName:
          firstText(
            appointmentTest?.clinicName,
            clinic?.name,
            clinic?.clinicName,
            root?.clinicName,
          ) || null,
        clinicAddress:
          firstText(
            appointmentTest?.clinicAddress,
            clinic?.address,
            clinic?.clinicAddress,
            root?.clinicAddress,
          ) || null,
        testName:
          firstText(
            appointmentTest?.testName,
            appointmentTest?.name,
            test?.testName,
            test?.name,
            test?.title,
            root?.testName,
          ) || null,
        category:
          firstText(
            appointmentTest?.category,
            test?.category,
            test?.testCategory,
            root?.category,
          ) || null,
        price: Number(appointmentTest?.price ?? test?.price ?? root?.price ?? 0),
        dateTime: firstText(
          appointmentTest?.dateTime,
          appointmentTest?.createdAt,
          root?.dateTime,
          root?.createdAt,
        ),
        appointmentTime:
          firstText(appointmentTest?.appointmentTime, root?.appointmentTime) ||
          null,
        workflowStatus: firstText(
          appointmentTest?.workflowStatus,
          appointmentTest?.status,
          root?.workflowStatus,
        ) as WorkflowStatus,
        paymentStatus: firstText(
          appointmentTest?.paymentStatus,
          payment?.status,
          root?.paymentStatus,
          "PENDING",
        ) as PaymentStatus,
        sampleStatus: firstText(
          appointmentTest?.sampleStatus,
          appointmentTest?.sample_status,
          root?.sampleStatus,
        ) as SampleStatus,
        reportPdf:
          firstText(
            appointmentTest?.reportPdf,
            appointmentTest?.report_pdf,
            root?.reportPdf,
            root?.report_pdf,
          ) || null,
        expectedReportReadyAt:
          firstText(
            appointmentTest?.expectedReportReadyAt,
            root?.reportSchedule?.expectedReportReadyAt,
            root?.expectedReportReadyAt,
          ) || null,
        readyForReportAt:
          firstText(
            appointmentTest?.readyForReportAt,
            root?.reportSchedule?.readyForReportAt,
            sample?.reportReadyAt,
            root?.readyForReportAt,
          ) || null,
        createdAt:
          firstText(appointmentTest?.createdAt, root?.createdAt) || null,
        updatedAt:
          firstText(appointmentTest?.updatedAt, root?.updatedAt) || null,
      },
      payment: {
        status: firstText(
          payment?.status,
          appointmentTest?.paymentStatus,
          root?.paymentStatus,
          "PENDING",
        ) as PaymentStatus,
        amount: Number(
          payment?.amount ?? appointmentTest?.price ?? test?.price ?? root?.price ?? 0,
        ),
        collectedAt: firstText(payment?.collectedAt, root?.collectedAt) || null,
        collectedBy: firstText(payment?.collectedBy, root?.collectedBy) || null,
      },
      steps: Array.isArray(root?.steps) ? root.steps : [],
      events: Array.isArray(root?.events) ? root.events : [],
      nextAction: root?.nextAction ?? null,
    },
  };
}

function findLabResultId(value: any): string | null {
  const root = unwrapApiData(value);

  return (
    firstText(
      root?.resultId,
      root?.id,
      root?._id,
      root?.labResultId,
      root?.reportData?.id,
      root?.reportData?.resultId,
      root?.report?.id,
      root?.report?.resultId,
      root?.result?.id,
      root?.result?.resultId,
      root?.data?.id,
      root?.data?.resultId,
    ) || null
  );
}

function normalizeLabResultSaveResponse(response: any): LabResultSaveResponse {
  const root = unwrapApiData(response);
  const reportRoot = root?.reportData ?? root?.report ?? root?.result ?? (root?.values ? root : null);
  const report =
    reportRoot && typeof reportRoot === "object"
      ? normalizeLabResultReportResponse(response)
      : null;

  return {
    id: findLabResultId(response),
    status:
      firstText(root?.status, reportRoot?.status, root?.result?.status) || null,
    reportGenerated:
      typeof root?.reportGenerated === "boolean"
        ? root.reportGenerated
        : Boolean(report?.reportGenerated),
    pdfUrl: firstText(root?.pdfUrl, report?.pdfUrl) || null,
    generatedAt: firstText(root?.generatedAt, report?.generatedAt) || null,
    reportActions: normalizeLabReportActions(response),
    report,
    raw: response,
  };
}

function normalizeLabResultReportValue(item: any): LabResultReportValue {
  const parameter = item?.parameter ?? item?.templateParameter ?? {};
  const sortOrder = Number(item?.sortOrder ?? parameter?.sortOrder ?? 0);
  const sourceType =
    firstText(item?.sourceType, parameter?.sourceType, parameter?.type) || null;
  const parameterName = firstText(
    item?.parameterName,
    parameter?.parameterName,
    item?.name,
    parameter?.name,
    item?.displayName,
    parameter?.displayName,
    "Parameter",
  );
  const displayName = firstText(
    item?.displayName,
    item?.parameterName,
    parameter?.displayName,
    parameter?.parameterName,
    item?.name,
    parameter?.name,
    "Parameter",
  );

  return {
    parameterId:
      firstText(
        item?.parameterId,
        item?.fieldId,
        parameter?.parameterId,
        parameter?.fieldId,
        parameter?.id,
      ) ||
      null,
    sectionName: firstText(item?.sectionName, parameter?.sectionName) || null,
    parameterName,
    displayName,
    originalParameterName:
      firstText(
        item?.originalParameterName,
        parameter?.originalParameterName,
        item?.originalName,
        parameter?.originalName,
      ) || null,
    sourceType,
    isCustom:
      item?.isCustom == null && parameter?.isCustom == null
        ? sourceType
          ? sourceType === "CUSTOM"
          : null
        : Boolean(item?.isCustom ?? parameter?.isCustom),
    inputType: normalizeLabResultInputType(
      item?.input ?? item?.inputType ?? parameter?.input ?? parameter?.inputType,
    ),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isRequired: Boolean(
      item?.isRequired ?? item?.required ?? parameter?.isRequired ?? parameter?.required,
    ),
    value: firstText(item?.value, item?.resultValue, item?.enteredValue, "-"),
    unit: firstText(item?.unit, parameter?.unit) || null,
    referenceRange:
      firstText(
        item?.referenceRange,
        parameter?.referenceRange,
        item?.range,
        parameter?.range,
      ) || null,
    flag: firstText(item?.flag, item?.resultFlag, item?.statusFlag) || null,
  };
}

function normalizeLabResultReportResponse(response: any): LabResultReport {
  const root = unwrapApiData(response);
  const reportRoot = root?.reportData ?? root?.report ?? root?.result ?? root;
  const template =
    reportRoot?.template ??
    reportRoot?.resultTemplate ??
    root?.template ??
    root?.resultTemplate ??
    {};
  const order = reportRoot?.order ?? root?.order ?? {};
  const test = order?.test ?? reportRoot?.test ?? root?.test ?? {};
  const patient =
    reportRoot?.patient ??
    reportRoot?.appointment?.patient ??
    root?.patient ??
    root?.appointment?.patient ??
    {};
  const doctor =
    reportRoot?.doctor ??
    reportRoot?.appointment?.doctor ??
    root?.doctor ??
    root?.appointment?.doctor ??
    {};
  const clinic =
    reportRoot?.clinic ??
    reportRoot?.appointment?.clinic ??
    root?.clinic ??
    root?.appointment?.clinic ??
    {};
  const rawValues =
    reportRoot?.values ??
    reportRoot?.resultValues ??
    reportRoot?.parameters ??
    reportRoot?.results ??
    root?.values ??
    root?.resultValues ??
    root?.parameters ??
    root?.results ??
    [];
  const values = Array.isArray(rawValues)
    ? rawValues
        .map(normalizeLabResultReportValue)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  return {
    id: findLabResultId(response),
    patient: firstText(
      reportRoot?.patientName,
      patient?.name,
      patient?.fullName,
      patient?.displayName,
      "-",
    ),
    doctor: firstText(
      reportRoot?.doctorName,
      doctor?.name,
      doctor?.fullName,
      doctor?.displayName,
      "-",
    ),
    clinic: firstText(
      reportRoot?.clinicName,
      clinic?.name,
      clinic?.clinicName,
      "-",
    ),
    testName: firstText(
      reportRoot?.testName,
      test?.name,
      template?.testName,
      template?.name,
      "-",
    ),
    templateName: firstText(
      reportRoot?.templateName,
      template?.templateName,
      template?.name,
      reportRoot?.testName,
      "-",
    ),
    sampleType: firstText(reportRoot?.sampleType, template?.sampleType) || null,
    status: firstText(reportRoot?.status, root?.status) || null,
    remarks: firstText(reportRoot?.remarks, root?.remarks) || null,
    values,
    verifiedBy:
      firstText(
        reportRoot?.verifiedBy?.name,
        reportRoot?.verifiedBy,
        reportRoot?.verifiedByName,
        reportRoot?.verifiedByUser?.name,
      ) || null,
    verifiedAt:
      firstText(reportRoot?.verifiedAt, reportRoot?.verificationDate) || null,
    generatedAt: firstText(root?.generatedAt, reportRoot?.generatedAt) || null,
    reportGenerated: Boolean(root?.reportGenerated ?? reportRoot?.reportGenerated),
    pdfUrl: firstText(root?.pdfUrl, reportRoot?.pdfUrl) || null,
    reportActions: normalizeLabReportActions(response),
    raw: response,
  };
}

export const labAssistantApi = createApi({
  reducerPath: "labAssistantApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["LabAppointmentTests", "LabTracking", "LabResults", "LabInvoices"],
  endpoints: (builder) => ({
    getLabAppointmentTests: builder.query<
      AppointmentTestsResponse,
      AppointmentTestsArgs
    >({
      query: ({
        tab,
        search,
        status,
        category,
        page = 1,
        limit = 10,
        datePreset,
        startDate,
        endDate,
        trendPeriod,
      }) => {
        const params = new URLSearchParams();

        params.set("tab", tab);
        params.set("page", String(page));
        params.set("limit", String(limit));

        const trimmedSearch = search?.trim();
        const trimmedCategory = category?.trim();
        if (trimmedSearch) params.set("search", trimmedSearch);
        if (status) params.set("status", status);
        if (trimmedCategory) params.set("category", trimmedCategory);
        if (datePreset) params.set("datePreset", datePreset);
        if (datePreset === "custom") {
          if (startDate) params.set("startDate", startDate);
          if (endDate) params.set("endDate", endDate);
        }
        if (trendPeriod) params.set("trendPeriod", trendPeriod);

        return {
          url: `/lab/appointment-tests?${params.toString()}`,
        };
      },
      transformResponse: normalizeListResponse,
      providesTags: (_result, _error, arg) => [
        { type: "LabAppointmentTests", id: arg.tab },
      ],
    }),

    createIndependentAppointmentTests: builder.mutation<
      CreateIndependentAppointmentTestsResponse,
      CreateIndependentAppointmentTestsPayload
    >({
      query: (body) => ({
        url: `/lab/appointment-tests/independent`,
        method: "POST",
        body: {
          testIds: body.testIds,
          patientName: body.patientName.trim(),
          patientMobile: body.patientMobile.trim(),
          patientAge: body.patientAge,
          patientGender: body.patientGender.trim(),
          doctorName: body.doctorName.trim(),
        },
      }),
      invalidatesTags: [
        { type: "LabAppointmentTests", id: "all" },
        { type: "LabAppointmentTests", id: "new" },
        { type: "LabAppointmentTests", id: "assigned" },
        { type: "LabAppointmentTests", id: "my" },
      ],
    }),

    moveAppointmentTestOnHold: builder.mutation<
      any,
      { appointmentTestId: string; reason?: string }
    >({
      query: ({ appointmentTestId, reason }) => ({
        url: `/lab/appointment-tests/${appointmentTestId}/on-hold`,
        method: "PATCH",
        body: reason?.trim() ? { reason: reason.trim() } : {},
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "LabAppointmentTests", id: "all" },
        { type: "LabAppointmentTests", id: "new" },
        { type: "LabAppointmentTests", id: "assigned" },
        { type: "LabAppointmentTests", id: "my" },
        { type: "LabTracking", id: arg.appointmentTestId },
      ],
    }),

    rejectAppointmentTest: builder.mutation<
      any,
      { appointmentTestId: string; reason?: string }
    >({
      query: ({ appointmentTestId, reason }) => ({
        url: `/lab/appointment-tests/${appointmentTestId}/reject`,
        method: "PATCH",
        body: reason?.trim() ? { reason: reason.trim() } : {},
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "LabAppointmentTests", id: "all" },
        { type: "LabAppointmentTests", id: "new" },
        { type: "LabAppointmentTests", id: "assigned" },
        { type: "LabAppointmentTests", id: "my" },
        { type: "LabTracking", id: arg.appointmentTestId },
      ],
    }),

    getAppointmentTestTracking: builder.query<TrackingResponse, string>({
      query: (appointmentTestId) =>
        `/lab/appointment-tests/${appointmentTestId}/tracking`,
      transformResponse: normalizeTrackingResponse,
      providesTags: (_result, _error, appointmentTestId) => [
        { type: "LabTracking", id: appointmentTestId },
      ],
    }),

    getAppointmentTestByBarcode: builder.query<TrackingResponse, string>({
      query: (uniqueTestId) =>
        `/lab/appointment-tests/barcode/${encodeURIComponent(uniqueTestId)}`,
      transformResponse: normalizeTrackingResponse,
      providesTags: (result, _error, uniqueTestId) => [
        { type: "LabTracking", id: `barcode-${uniqueTestId}` },
        ...(result?.data.appointmentTest.id
          ? [
              {
                type: "LabTracking" as const,
                id: result.data.appointmentTest.id,
              },
            ]
          : []),
      ],
    }),

    markAppointmentTestPaymentPaid: builder.mutation<
      LabMarkPaidResponse,
      {
        appointmentTestId: string;
        amount: number;
        paymentMethod?: string;
        transactionId?: string;
      }
    >({
      query: ({ appointmentTestId, amount, paymentMethod, transactionId }) => ({
        url: `/lab/appointment-tests/${appointmentTestId}/payment/mark-paid`,
        method: "PATCH",
        body: {
          amount,
          ...(paymentMethod ? { paymentMethod } : {}),
          ...(transactionId ? { transactionId } : {}),
        },
      }),
      invalidatesTags: (result, _error, arg) => [
        { type: "LabAppointmentTests", id: "assigned" },
        { type: "LabAppointmentTests", id: "my" },
        { type: "LabTracking", id: arg.appointmentTestId },
        { type: "LabInvoices", id: arg.appointmentTestId },
        ...(result?.data?.invoiceId
          ? [{ type: "LabInvoices" as const, id: result.data.invoiceId }]
          : []),
      ],
    }),

    getLabAppointmentTestInvoice: builder.query<
      LabInvoiceResponse,
      { appointmentTestId?: string; invoiceId?: string | null }
    >({
      async queryFn(arg, _api, _extraOptions, baseQuery) {
        if (arg.appointmentTestId) {
          const result = await baseQuery(
            `/lab/appointment-tests/${arg.appointmentTestId}/invoice`,
          );

          if (!result.error) {
            return { data: normalizeLabInvoiceResponse(result.data) };
          }

          if (!arg.invoiceId) return { error: result.error };
        }

        if (arg.invoiceId) {
          const result = await baseQuery(`/lab/invoices/${arg.invoiceId}`);

          if (!result.error) {
            return { data: normalizeLabInvoiceResponse(result.data) };
          }

          return { error: result.error };
        }

        return {
          error: {
            status: 400,
            data: { message: "Missing lab invoice identifier." },
          },
        };
      },
      providesTags: (_result, _error, arg) => [
        ...(arg.appointmentTestId
          ? [{ type: "LabInvoices" as const, id: arg.appointmentTestId }]
          : []),
        ...(arg.invoiceId
          ? [{ type: "LabInvoices" as const, id: arg.invoiceId }]
          : []),
      ],
    }),

    updateAppointmentTestSampleStatus: builder.mutation<
      any,
      { appointmentTestId: string; action: SampleAction; expectedReportReadyAt?: string; note?: string }
    >({
      query: ({ appointmentTestId, action, expectedReportReadyAt, note }) => {
        const body: Record<string, unknown> = { action };
        if (expectedReportReadyAt) body.expectedReportReadyAt = expectedReportReadyAt;
        if (note) body.note = note;
        return {
          url: `/lab/appointment-tests/${appointmentTestId}/sample-status`,
          method: "PATCH",
          body,
        };
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "LabAppointmentTests", id: "assigned" },
        { type: "LabAppointmentTests", id: "my" },
        { type: "LabTracking", id: arg.appointmentTestId },
      ],
    }),

    uploadAppointmentTestReport: builder.mutation<
      any,
      { appointmentTestId: string; reportPdf: File }
    >({
      query: ({ appointmentTestId, reportPdf }) => {
        const formData = new FormData();
        formData.append("reportPdf", reportPdf);

        return {
          url: `/test/appointment-test/report/${appointmentTestId}`,
          method: "PUT",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "LabAppointmentTests", id: "assigned" },
        { type: "LabAppointmentTests", id: "my" },
        { type: "LabTracking", id: arg.appointmentTestId },
      ],
    }),

    getLabResultTemplate: builder.query<
      LabResultTemplate,
      { appointmentTestId: string }
    >({
      query: ({ appointmentTestId }) =>
        `/lab/orders/${appointmentTestId}/result-template`,
      transformResponse: normalizeLabResultTemplateResponse,
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, arg) => [
        { type: "LabResults", id: `template-${arg.appointmentTestId}` },
      ],
    }),
    getActiveReportTemplates: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => `/lab/report-templates`,
    }),

    getLabTemplateParameters: builder.query<
      LabResultTemplateParameter[],
      { templateId: string; appointmentTestId?: string }
    >({
      query: ({ templateId }) =>
        `/lab/report-templates/${templateId}/parameters`,
      transformResponse: normalizeLabTemplateParametersResponse,
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, arg) => [
        { type: "LabResults", id: `parameters-${arg.templateId}` },
        ...(arg.appointmentTestId
          ? [
              {
                type: "LabResults" as const,
                id: `template-${arg.appointmentTestId}`,
              },
            ]
          : []),
      ],
    }),

    saveLabResult: builder.mutation<
      LabResultSaveResponse,
      LabResultSavePayload
    >({
      query: ({ appointmentTestId, ...body }) => ({
        url: `/lab/orders/${appointmentTestId}/results`,
        method: "POST",
        body: {
          ...body,
          appointmentTestId,
        },
      }),
      transformResponse: normalizeLabResultSaveResponse,
      invalidatesTags: (result, _error, arg) => [
        { type: "LabAppointmentTests", id: "all" },
        { type: "LabAppointmentTests", id: "assigned" },
        { type: "LabAppointmentTests", id: "my" },
        { type: "LabTracking", id: arg.appointmentTestId },
        { type: "LabResults", id: arg.appointmentTestId },
        { type: "LabResults", id: `template-${arg.appointmentTestId}` },
        ...(result?.id ? [{ type: "LabResults" as const, id: result.id }] : []),
      ],
    }),

    verifyLabResult: builder.mutation<
      LabResultSaveResponse,
      { resultId: string }
    >({
      query: ({ resultId }) => ({
        url: `/lab/results/${resultId}/verify`,
        method: "PATCH",
      }),
      transformResponse: normalizeLabResultSaveResponse,
      invalidatesTags: (_result, _error, arg) => [
        { type: "LabResults", id: arg.resultId },
        { type: "LabAppointmentTests", id: "all" },
        { type: "LabAppointmentTests", id: "assigned" },
        { type: "LabAppointmentTests", id: "my" },
      ],
    }),

    downloadLabResultReport: builder.mutation<
      LabReportDownloadResponse,
      { downloadApiUrl: string }
    >({
      query: ({ downloadApiUrl }) => ({
        url: normalizeApiEndpointUrl(downloadApiUrl),
        method: "GET",
      }),
      transformResponse: normalizeLabReportDownloadResponse,
    }),

    uploadLabResultReport: builder.mutation<
      LabReportUploadResponse,
      { uploadUrl: string; uploadField?: "reportPdf"; reportPdf: File }
    >({
      query: ({ uploadUrl, uploadField = "reportPdf", reportPdf }) => {
        const formData = new FormData();
        formData.append(uploadField, reportPdf);

        return {
          url: normalizeApiEndpointUrl(uploadUrl),
          method: "POST",
          body: formData,
        };
      },
      transformResponse: normalizeLabReportUploadResponse,
      invalidatesTags: [{ type: "LabResults", id: "all" }],
    }),

    getLabResultReport: builder.query<
      LabResultReport,
      { resultId: string }
    >({
      query: ({ resultId }) => `/lab/results/${resultId}/report`,
      transformResponse: normalizeLabResultReportResponse,
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, arg) => [
        { type: "LabResults", id: arg.resultId },
      ],
    }),

    getLabResult: builder.query<LabResultReport, { resultId: string }>({
      query: ({ resultId }) => `/lab/results/${resultId}`,
      transformResponse: normalizeLabResultReportResponse,
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, arg) => [
        { type: "LabResults", id: arg.resultId },
      ],
    }),

    addLabCustomField: builder.mutation<
      any,
      {
        templateId: string;
        field: LabResultFieldInput;
        appointmentTestId?: string;
        resultId?: string | null;
      }
    >({
      query: ({ templateId, field }) => ({
        url: `/lab/report-templates/${templateId}/custom-fields`,
        method: "POST",
        body: field,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "LabResults", id: `parameters-${arg.templateId}` },
        ...(arg.appointmentTestId
          ? [{ type: "LabResults" as const, id: `template-${arg.appointmentTestId}` }]
          : []),
        ...(arg.resultId ? [{ type: "LabResults" as const, id: arg.resultId }] : []),
      ],
    }),

    updateLabCustomField: builder.mutation<
      any,
      {
        fieldId: string;
        field: LabResultFieldInput;
        templateId?: string;
        appointmentTestId?: string;
        resultId?: string | null;
      }
    >({
      query: ({ fieldId, field }) => ({
        url: `/lab/custom-fields/${fieldId}`,
        method: "PUT",
        body: field,
      }),
      invalidatesTags: (_result, _error, arg) => [
        ...(arg.templateId
          ? [{ type: "LabResults" as const, id: `parameters-${arg.templateId}` }]
          : []),
        ...(arg.appointmentTestId
          ? [{ type: "LabResults" as const, id: `template-${arg.appointmentTestId}` }]
          : []),
        ...(arg.resultId ? [{ type: "LabResults" as const, id: arg.resultId }] : []),
      ],
    }),

    deleteLabCustomField: builder.mutation<
      any,
      {
        fieldId: string;
        templateId?: string;
        appointmentTestId?: string;
        resultId?: string | null;
      }
    >({
      query: ({ fieldId }) => ({
        url: `/lab/custom-fields/${fieldId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [
        ...(arg.templateId
          ? [{ type: "LabResults" as const, id: `parameters-${arg.templateId}` }]
          : []),
        ...(arg.appointmentTestId
          ? [{ type: "LabResults" as const, id: `template-${arg.appointmentTestId}` }]
          : []),
        ...(arg.resultId ? [{ type: "LabResults" as const, id: arg.resultId }] : []),
      ],
    }),

    overrideLabDefaultField: builder.mutation<
      any,
      {
        parameterId: string;
        override: LabDefaultFieldOverrideInput;
        appointmentTestId?: string;
        resultId?: string | null;
      }
    >({
      query: ({ parameterId, override }) => ({
        url: `/lab/report-template-parameters/${parameterId}/override`,
        method: "PUT",
        body: override,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "LabResults", id: `parameters-${arg.override.templateId}` },
        ...(arg.appointmentTestId
          ? [{ type: "LabResults" as const, id: `template-${arg.appointmentTestId}` }]
          : []),
        ...(arg.resultId ? [{ type: "LabResults" as const, id: arg.resultId }] : []),
      ],
    }),

    hideLabDefaultField: builder.mutation<
      any,
      {
        parameterId: string;
        templateId?: string;
        appointmentTestId?: string;
        resultId?: string | null;
      }
    >({
      query: ({ parameterId, templateId }) => ({
        url: `/lab/report-template-parameters/${parameterId}/hide`,
        method: "PATCH",
        body: {
          ...(templateId ? { templateId } : {}),
          isHidden: true,
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        ...(arg.templateId
          ? [{ type: "LabResults" as const, id: `parameters-${arg.templateId}` }]
          : []),
        ...(arg.appointmentTestId
          ? [{ type: "LabResults" as const, id: `template-${arg.appointmentTestId}` }]
          : []),
        ...(arg.resultId ? [{ type: "LabResults" as const, id: arg.resultId }] : []),
      ],
    }),

    unhideLabDefaultField: builder.mutation<
      any,
      {
        parameterId: string;
        templateId?: string;
        appointmentTestId?: string;
        resultId?: string | null;
      }
    >({
      query: ({ parameterId, templateId }) => ({
        url: `/lab/report-template-parameters/${parameterId}/unhide`,
        method: "PATCH",
        body: templateId ? { templateId } : {},
      }),
      invalidatesTags: (_result, _error, arg) => [
        ...(arg.templateId
          ? [{ type: "LabResults" as const, id: `parameters-${arg.templateId}` }]
          : []),
        ...(arg.appointmentTestId
          ? [{ type: "LabResults" as const, id: `template-${arg.appointmentTestId}` }]
          : []),
        ...(arg.resultId ? [{ type: "LabResults" as const, id: arg.resultId }] : []),
      ],
    }),

    resetLabDefaultFieldOverride: builder.mutation<
      any,
      {
        parameterId: string;
        templateId?: string;
        appointmentTestId?: string;
        resultId?: string | null;
      }
    >({
      query: ({ parameterId, templateId }) => ({
        url: `/lab/report-template-parameters/${parameterId}/override`,
        method: "DELETE",
        body: templateId ? { templateId } : {},
      }),
      invalidatesTags: (_result, _error, arg) => [
        ...(arg.templateId
          ? [{ type: "LabResults" as const, id: `parameters-${arg.templateId}` }]
          : []),
        ...(arg.appointmentTestId
          ? [{ type: "LabResults" as const, id: `template-${arg.appointmentTestId}` }]
          : []),
        ...(arg.resultId ? [{ type: "LabResults" as const, id: arg.resultId }] : []),
      ],
    }),
  }),
});

export const {
  useGetLabAppointmentTestsQuery,
  useCreateIndependentAppointmentTestsMutation,
  useMoveAppointmentTestOnHoldMutation,
  useRejectAppointmentTestMutation,
  useGetAppointmentTestTrackingQuery,
  useLazyGetAppointmentTestByBarcodeQuery,
  useMarkAppointmentTestPaymentPaidMutation,
  useGetLabAppointmentTestInvoiceQuery,
  useLazyGetLabAppointmentTestInvoiceQuery,
  useUpdateAppointmentTestSampleStatusMutation,
  useUploadAppointmentTestReportMutation,
  useGetLabResultTemplateQuery,
  useLazyGetLabResultTemplateQuery,
  useGetActiveReportTemplatesQuery,
  useLazyGetActiveReportTemplatesQuery,
  useLazyGetLabTemplateParametersQuery,
  useSaveLabResultMutation,
  useVerifyLabResultMutation,
  useDownloadLabResultReportMutation,
  useUploadLabResultReportMutation,
  useLazyGetLabResultReportQuery,
  useLazyGetLabResultQuery,
  useAddLabCustomFieldMutation,
  useUpdateLabCustomFieldMutation,
  useDeleteLabCustomFieldMutation,
  useOverrideLabDefaultFieldMutation,
  useHideLabDefaultFieldMutation,
  useUnhideLabDefaultFieldMutation,
  useResetLabDefaultFieldOverrideMutation,
} = labAssistantApi;
