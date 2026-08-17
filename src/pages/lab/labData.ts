import type {
  AppointmentTestListItem,
  PaymentStatus,
  SampleStatus,
  WorkflowStatus,
} from "../../redux/api/labAssistantApi";

export type LabReportStatus = WorkflowStatus;

export type LabTestRow = {
  id: string;
  rawId: string;
  resultId?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  uniqueTestId?: string | null;
  barcode?: AppointmentTestListItem["barcode"];
  isIndependent?: boolean;
  independentPatientId?: string | null;
  patientName: string;
  patientMeta: string;
  patientMobile?: string | null;
  patientAge?: string | null;
  patientGender?: string | null;
  doctorName: string;
  doctorMeta: string;
  testName: string;
  testCategory: string;
  testPrice: number | null;
  date: string;
  time: string;
  sortTs: number;
  status: WorkflowStatus;
  paymentStatus: PaymentStatus;
  sampleStatus: SampleStatus;
  reportStatus?: "Initiated" | "InProgress" | "Completed";
  reportPdf?: string | null;
  isAvailableInLabCatalog?: boolean;
};

export type LabCollections = {
  allRows: LabTestRow[];
  initiatedRows: LabTestRow[];
  onHoldRows: LabTestRow[];
  inProgressRows: LabTestRow[];
  completedRows: LabTestRow[];
  rejectedRows: LabTestRow[];
};

export function safeDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fmtDate(date: Date | null) {
  if (!date) return "-";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function fmtTime(date: Date | null, fallback?: string | null) {
  if (!date) return fallback || "-";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortId(value: unknown, n = 6) {
  const text = String(value ?? "");
  if (!text) return "-";
  return text.slice(0, n);
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function normalizePaymentStatus(value: unknown): PaymentStatus {
  const status = String(value ?? "PENDING").toLowerCase();
  if (status === "paid") return "PAID";
  if (status === "failed") return "failed";
  return "PENDING";
}

function fallbackText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function optionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }

  return "";
}

export function mapAppointmentTestRow(
  item: AppointmentTestListItem,
): LabTestRow {
  const source = item as any;
  const independentPatient =
    source.independentPatient ??
    source.independentPatientData ??
    source.walkInPatient ??
    source.walkInPatientData ??
    {};
  const patient =
    source.patient ??
    source.patientDetails ??
    source.appointment?.patient ??
    source.appointmentPatient ??
    {};
  const testDetails =
    source.test ??
    source.testDetails ??
    source.labTest ??
    source.patientTest ??
    {};
  const isIndependent = Boolean(
    item.isIndependent ??
      source.independent ??
      source.isWalkIn ??
      source.isWalkInPatient ??
      item.independentPatientId ??
      independentPatient?.id ??
      independentPatient?._id,
  );
  const independentPatientId =
    firstText(
      item.independentPatientId,
      source.independent_patient_id,
      independentPatient?.id,
      independentPatient?._id,
    ) || null;
  const patientName = fallbackText(
    firstText(
      item.patientName,
      independentPatient?.patientName,
      independentPatient?.name,
      patient?.name,
      patient?.fullName,
      patient?.displayName,
    ),
  );
  const patientMobile =
    firstText(
      item.patientMobile,
      item.patientPhone,
      item.patientNumber,
      source.mobile,
      source.phone,
      independentPatient?.patientMobile,
      independentPatient?.mobile,
      independentPatient?.phone,
      patient?.mobile,
      patient?.phone,
      patient?.contactNumber,
    ) || null;
  const patientAge =
    firstText(
      item.patientAge,
      source.age,
      independentPatient?.patientAge,
      independentPatient?.age,
      patient?.age,
    ) || null;
  const patientGender =
    firstText(
      item.patientGender,
      source.gender,
      independentPatient?.patientGender,
      independentPatient?.gender,
      patient?.gender,
    ) || null;
  const doctorName = fallbackText(
    firstText(
      item.doctorName,
      source.referringDoctorName,
      independentPatient?.doctorName,
      source.doctor?.name,
      source.appointment?.doctor?.name,
    ),
  );
  const testName = fallbackText(
    firstText(
      item.testName,
      source.name,
      testDetails?.testName,
      testDetails?.name,
      testDetails?.title,
    ),
  );
  const testCategory = fallbackText(
    firstText(
      item.category,
      source.testCategory,
      testDetails?.category,
      testDetails?.testCategory,
      testDetails?.departmentName,
    ),
  );
  const dateTime = safeDate(item.dateTime ?? item.createdAt);
  const price = Number(item.price ?? testDetails?.price);

  return {
    id: item.appointmentTestId
      ? `Ord#${shortId(item.appointmentTestId, 5)}`
      : "-",
    rawId: item.appointmentTestId,
    resultId:
      item.resultId ??
      (item as any).labResultId ??
      (item as any).latestResultId ??
      null,
    invoiceId:
      item.invoiceId ??
      (item as any).invoice?.id ??
      (item as any).labInvoiceId ??
      null,
    invoiceNumber:
      item.invoiceNumber ??
      (item as any).invoice?.invoiceNumber ??
      (item as any).labInvoiceNumber ??
      null,
    uniqueTestId: optionalText(
      item.uniqueTestId ??
        (item as any).unique_test_id ??
        (item as any).test?.uniqueTestId ??
        (item as any).test?.unique_test_id,
    ),
    barcode:
      item.barcode ??
      (item as any).test?.barcode ??
      (item as any).labTest?.barcode ??
      null,
    isIndependent,
    independentPatientId,
    patientName,
    patientMeta: isIndependent
      ? independentPatientId
        ? `Walk-in ID: ${shortId(independentPatientId, 10)}`
        : "Walk-in patient"
      : item.appointmentTestId
        ? `ID: ${shortId(item.appointmentTestId, 10)}`
        : "-",
    patientMobile,
    patientAge,
    patientGender,
    doctorName,
    doctorMeta: isIndependent ? "Referring Doctor" : "Consultation",
    testName,
    testCategory,
    testPrice: Number.isFinite(price) ? price : null,
    date: fmtDate(dateTime),
    time: fmtTime(dateTime, item.appointmentTime),
    sortTs: dateTime?.getTime() ?? safeDate(item.createdAt)?.getTime() ?? 0,
    status: item.workflowStatus,
    paymentStatus: normalizePaymentStatus(item.paymentStatus),
    sampleStatus: item.sampleStatus,
    reportStatus: item.reportStatus,
    reportPdf: item.reportPdf ?? null,
  };
}

export function buildLabCollections(
  items: AppointmentTestListItem[] = [],
): LabCollections {
  const allRows = items
    .map(mapAppointmentTestRow)
    .sort((a, b) => b.sortTs - a.sortTs);

  return {
    allRows,
    initiatedRows: allRows.filter((row) => row.status === "INITIATED"),
    onHoldRows: allRows.filter((row) => row.status === "ON_HOLD"),
    inProgressRows: allRows.filter((row) => row.status === "IN_PROGRESS"),
    completedRows: allRows.filter((row) => row.status === "COMPLETED"),
    rejectedRows: allRows.filter((row) => row.status === "REJECTED"),
  };
}

export function filterLabRows(rows: LabTestRow[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return rows;

  return rows.filter((row) =>
    [
      row.patientName,
      row.patientMeta,
      row.independentPatientId,
      row.patientMobile,
      row.patientAge,
      row.patientGender,
      row.doctorName,
      row.doctorMeta,
      row.testName,
      row.uniqueTestId,
      row.barcode?.value,
      row.testCategory,
      row.status,
      row.paymentStatus,
      row.sampleStatus,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

export function getGreetingName(user: any) {
  return (
    user?.name ??
    user?.user?.name ??
    user?.result?.name ??
    user?.profile?.name ??
    "Kylie"
  );
}

export function canUploadReport(
  paymentStatus: PaymentStatus,
  sampleStatus: SampleStatus,
) {
  return (
    normalizePaymentStatus(paymentStatus) === "PAID" &&
    sampleStatus === "COMPLETED"
  );
}

export function isLabSampleReadyForReport(test: {
  sampleStatus?: unknown;
  workflowStatus?: unknown;
  status?: unknown;
}) {
  return (
    test.sampleStatus === "COMPLETED" ||
    test.workflowStatus === "COMPLETED" ||
    test.status === "COMPLETED"
  );
}
