import { addToast, Button } from "@heroui/react";
import React from "react";
import {
  FiCalendar,
  FiClock,
  FiDownload,
  FiEye,
  FiUpload
} from "react-icons/fi";

import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import {
  useAssignAppointmentTestMutation,
  useCreateTestMutation,
  useGetAppointmentTestsByAppointmentIdQuery,
  useGetPatientTestHistoryByPatientIdQuery,
  useLazyGetAllTestsByClinicIdQuery,
  useUpdateAppointmentTestReportMutation,
} from "../../redux/api/testApi";

import AddNewTestModal, {
  type CreateTestInput,
  type TestSelectOption,
} from "./AddNewTestModal";
import UploadReportModal from "./UploadReportModal";

import {
  Document,
  Page,
  pdf,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

type ApiTest = {
  id?: string;
  name?: string;
  category?: string;
  status?: string;
};

type AppointmentTestItem = {
  Id?: string;
  id?: string;
  appointmentTestId: string;
  test: ApiTest;
  reportPdf: string | null;
  assignedAt: string;
  appointmentId?: string;
  doctorId?: string;
  patientId?: string;
  clinicId?: string;
  clinicName?: string;
  clinicAddress?: string;
  doctorName?: string;
  patientName?: string;
  patientAge?: string | number | null;
  patientGender?: string | null;
  patientEmail?: string | null;
  patientMobile?: string | null;
  patientDob?: string | null;
  labName?: string | null;
  labAddress?: string | null;
  labContactNumber?: string | null;

  // Optional statuses from backend
  status?: string;
  workflowStatus?: string;
  reportStatus?: string;
  resultStatus?: string;
  labResultStatus?: string;
  sampleStatus?: string;
  paymentStatus?: string;
};

type PatientHistoryItem = {
  appointmentTestId: string;
  appointmentId: string;
  appointmentDate: string;
  test: ApiTest;
  reportPdf: string | null;
  assignedAt: string;
  doctorId?: string;
  patientId?: string;
  clinicName?: string;
  clinicAddress?: string;
  doctorName?: string;
  patientName?: string;
  patientAge?: string | number | null;
  patientGender?: string | null;
  patientEmail?: string | null;
  patientMobile?: string | null;
  patientDob?: string | null;
  labName?: string | null;
  labAddress?: string | null;
  labContactNumber?: string | null;
  status?: string;
  workflowStatus?: string;
  reportStatus?: string;
  resultStatus?: string;
  labResultStatus?: string;
  sampleStatus?: string;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k)),
  );
  const value = bytes / Math.pow(k, i);
  return `${Math.round(value)} ${sizes[i]}`;
};

const formatDateShort = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const makeObjectUrl = (file: File) => URL.createObjectURL(file);

const isPresentText = (value: unknown): value is string => {
  const text = String(value ?? "").trim();
  return Boolean(text && !["null", "undefined"].includes(text.toLowerCase()));
};

const getReportUrl = (value: unknown): string | null => {
  const row = value as any;
  const candidates = [
    row?.reportPdf,
    row?.report_pdf,
    row?.pdfUrl,
    row?.downloadUrl,
    row?.report?.reportPdf,
    row?.report?.pdfUrl,
    row?.report?.downloadUrl,
    row?.appointmentTest?.reportPdf,
    row?.appointmentTest?.report_pdf,
  ];

  return candidates.find(isPresentText) ?? null;
};

const triggerReportDownload = (href: string, fileName = "report.pdf") => {
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName || "report.pdf";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const getFileNameFromUrl = (url: string) => {
  try {
    const clean = url.split("?")[0];
    const name = clean.substring(clean.lastIndexOf("/") + 1);
    return decodeURIComponent(name || "report.pdf");
  } catch {
    return "report.pdf";
  }
};

type PdfMeta = {
  patientId?: string;
  patientName?: string;
  patientEmail?: string;
  patientMobile?: string;
  patientGender?: string | null;
  patientAge?: number | string | null;
  patientDob?: string | null;
  patientAddress?: string | null;
  doctorName?: string;
  clinicName?: string;
  clinicAddress?: string | null;
  labContactNumber?: string | null;
  appointmentId?: string;
  appointmentDateISO?: string;
  appointmentTime?: string;
  appointmentType?: string;
  appointmentStatus?: string;
};

type Props = {
  patientId?: string;
  appointmentId?: string;
  appointmentStatus?: string;
  hideAddNewButton?: boolean;
  pdfMeta?: PdfMeta;
  doctorId?: string;
};

type PdfRow = {
  sr: number;
  testName: string;
  category: string;
  date: string;
};

type PdfHeaderMeta = {
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
  clinicName?: string;
  clinicAddress?: string;
  doctorName?: string;
  patientName?: string;
  generated?: string;
};

const pdfStyles = StyleSheet.create({
  page: {
    padding: 26,
    paddingBottom: 72,
    fontSize: 11,
    fontFamily: "Helvetica",
    backgroundColor: "#f1f5f9",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 18,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 18, fontWeight: 700, color: "#0f172a" },
  subtitle: { fontSize: 10, color: "#64748b" },

  metaCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  metaGrid: { flexDirection: "row", flexWrap: "wrap" },
  metaBox: { width: "50%", paddingRight: 10, paddingBottom: 8 },
  metaLabel: { fontSize: 9, color: "#64748b", marginBottom: 2 },
  metaValue: { fontSize: 11, color: "#0f172a", fontWeight: 700 },

  tableCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerRow: { backgroundColor: "#0f172a" },
  headerText: { color: "#ffffff", fontWeight: 700, fontSize: 10 },

  cellSr: { width: "8%" },
  cellTest: { width: "42%" },
  cellCat: { width: "26%" },
  cellDate: { width: "24%" },

  text: { color: "#0f172a" },
  muted: { color: "#64748b" },
  empty: { padding: 14, color: "#64748b" },
});

const TestsPdfDoc: React.FC<{
  heading: string;
  meta: PdfHeaderMeta;
  rows: PdfRow[];
}> = ({ heading, meta, rows }) => {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.sheet}>
          <View style={pdfStyles.titleRow}>
            <Text style={pdfStyles.title}>{heading}</Text>
            {!!meta.generated && (
              <Text style={pdfStyles.subtitle}>
                Generated: {meta.generated}
              </Text>
            )}
          </View>

          <View style={pdfStyles.metaCard}>
            <View style={pdfStyles.metaGrid}>
              <View style={pdfStyles.metaBox}>
                <Text style={pdfStyles.metaLabel}>Clinic</Text>
                <Text style={pdfStyles.metaValue}>
                  {meta.clinicName || "—"}
                </Text>
              </View>

              <View style={pdfStyles.metaBox}>
                <Text style={pdfStyles.metaLabel}>Address</Text>
                <Text style={pdfStyles.metaValue}>
                  {meta.clinicAddress || "—"}
                </Text>
              </View>

              <View style={pdfStyles.metaBox}>
                <Text style={pdfStyles.metaLabel}>Doctor Name</Text>
                <Text style={pdfStyles.metaValue}>
                  {meta.doctorName || "—"}
                </Text>
              </View>

              <View style={pdfStyles.metaBox}>
                <Text style={pdfStyles.metaLabel}>Patient Name</Text>
                <Text style={pdfStyles.metaValue}>
                  {meta.patientName || "—"}
                </Text>
              </View>
            </View>
          </View>

          <View style={pdfStyles.tableCard}>
            <View style={[pdfStyles.row, pdfStyles.headerRow]}>
              <Text style={[pdfStyles.cellSr, pdfStyles.headerText]}>#</Text>
              <Text style={[pdfStyles.cellTest, pdfStyles.headerText]}>
                Test
              </Text>
              <Text style={[pdfStyles.cellCat, pdfStyles.headerText]}>
                Category
              </Text>
              <Text style={[pdfStyles.cellDate, pdfStyles.headerText]}>
                Date
              </Text>
            </View>

            {rows.length ? (
              rows.map((r, i) => {
                const zebraBg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
                return (
                  <View
                    key={`${r.sr}-${r.testName}-${i}`}
                    style={[pdfStyles.row, { backgroundColor: zebraBg }]}
                  >
                    <Text style={[pdfStyles.cellSr, pdfStyles.text]}>
                      {r.sr}
                    </Text>
                    <Text style={[pdfStyles.cellTest, pdfStyles.text]}>
                      {r.testName || "—"}
                    </Text>
                    <Text style={[pdfStyles.cellCat, pdfStyles.muted]}>
                      {r.category || "—"}
                    </Text>
                    <Text style={[pdfStyles.cellDate, pdfStyles.muted]}>
                      {r.date || "—"}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={pdfStyles.empty}>No tests found.</Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};

type SelectOpt = { label: string; value: string; disabled?: boolean };

const getRowId = (row: AppointmentTestItem) =>
  String(row?.Id ?? row?.id ?? row?.appointmentTestId ?? "").trim();

const CardShell: React.FC<{
  title: string;
  category: string;
  dateText: string;
  statusLabel: "Uploaded" | "Pending";
  hasReport: boolean;
  fileName?: string;
  fileSizeLabel?: string;
  onBottomClick: () => void;
  onDownloadClick?: () => void;
  onReuploadClick?: () => void;
  onViewResultClick?: () => void;
  isViewResultLoading?: boolean;
  showViewResult?: boolean;
  viewActionLabel?: string;
  loadingActionLabel?: string;
  hideUploadAction?: boolean;
  showInProgress?: boolean;
}> = ({
  title,
  category,
  dateText,
  statusLabel,
  onBottomClick,
  onDownloadClick,
  onReuploadClick,
  onViewResultClick,
  isViewResultLoading = false,
  showViewResult = false,
  viewActionLabel = "View Result",
  loadingActionLabel = "Loading...",
  hideUploadAction = false,
  showInProgress = false,
}) => {
  const isUploaded = statusLabel === "Uploaded";

  const pillCls = isUploaded
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className="flex h-full min-h-[198px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[16px] font-semibold text-slate-900">
              {title}
            </div>

            <div className="mt-0.5 text-[13px] font-medium text-slate-500">
              {category}
            </div>
          </div>

          <div
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${pillCls}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isUploaded ? "bg-emerald-600" : "bg-amber-500"
              }`}
            />

            {statusLabel}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-slate-600">
          <FiCalendar className="shrink-0 text-[16px] text-slate-500" />

          <span className="text-[13px] font-medium">{dateText}</span>
        </div>
      </div>

      {/* Fixed Bottom Report Section */}
      <div className="mt-auto shrink-0 border-t border-slate-200 bg-slate-50">
        {showInProgress ? (
          <div className="flex min-h-[52px] w-full items-center justify-center gap-2 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-700 select-none">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            In progress
          </div>
        ) : showViewResult && onViewResultClick ? (
          <div className="flex min-h-[52px] w-full items-stretch justify-between">
            <button
              type="button"
              onClick={onViewResultClick}
              disabled={isViewResultLoading}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 px-4 py-3 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
            >
              <FiEye className="text-[15px]" />
              {isViewResultLoading ? loadingActionLabel : viewActionLabel}
            </button>
            {(onDownloadClick || onReuploadClick) && (
              <button
                type="button"
                onClick={() => {
                  (onDownloadClick ?? onReuploadClick)?.();
                }}
                className="flex items-center justify-center border-l border-slate-200 px-4 text-blue-600 hover:bg-blue-50 transition-colors"
                title={onDownloadClick ? "Download PDF" : "Reupload Report"}
                aria-label={onDownloadClick ? "Download PDF" : "Reupload report"}
              >
                {onDownloadClick ? (
                  <FiDownload className="text-[16px]" />
                ) : (
                  <FiUpload className="text-[16px]" />
                )}
              </button>
            )}
          </div>
        ) : hideUploadAction ? null : (
          <button
            type="button"
            onClick={onBottomClick}
            className="flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 px-4 py-3 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
          >
            <FiUpload className="text-[15px]" />
            Upload Report
          </button>
          )}

     
        </div>
      </div>
  );
};

const CurrentTestCard: React.FC<{
  row: AppointmentTestItem;
  idx: number;
  localReports: Record<string, File>;
  openUploadForRowId: (rowId: string) => void;
}> = ({
  row,
  localReports,
  openUploadForRowId,
}) => {
    const rowId = getRowId(row);

    const localFile = rowId ? localReports[rowId] : undefined;
    const reportUrl = getReportUrl(row);
    const hasReport = Boolean(reportUrl) || Boolean(localFile);

    const fileName = localFile
      ? localFile.name
      : reportUrl
        ? getFileNameFromUrl(reportUrl)
        : "";

    const fileSizeLabel = localFile ? formatBytes(localFile.size) : "";

    const openReport = () => {
      if (reportUrl) {
        window.open(reportUrl, "_blank", "noopener,noreferrer");
        return;
      }

      if (localFile) {
        const href = makeObjectUrl(localFile);
        window.open(href, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(href), 1000);
      }
    };

    const downloadReport = () => {
      if (reportUrl) {
        triggerReportDownload(reportUrl, fileName || getFileNameFromUrl(reportUrl));
        return;
      }

      if (localFile) {
        const href = makeObjectUrl(localFile);
        triggerReportDownload(href, localFile.name);
        setTimeout(() => URL.revokeObjectURL(href), 1000);
      }
    };

    const openUpload = () => {
      if (!rowId) return;
      openUploadForRowId(rowId);
    };

    const onBottom = () => {
      if (hasReport) {
        openReport();
        return;
      }
      openUpload();
    };

    const showViewReport = hasReport;
    const isQualityCheck = row.sampleStatus === "QUALITY_CHECK" && !hasReport;
    const showViewAction = !isQualityCheck && showViewReport;
    const hideUploadAction = isQualityCheck || showViewAction;

    return (
      <CardShell
        title={row.test?.name ?? "Test"}
        category={row.test?.category ?? "—"}
        dateText={formatDateShort(row.assignedAt)}
        statusLabel={hasReport ? "Uploaded" : "Pending"}
        hasReport={hasReport}
        fileName={fileName}
        fileSizeLabel={fileSizeLabel}
        onBottomClick={onBottom}
        onDownloadClick={hasReport ? downloadReport : undefined}
        onReuploadClick={hasReport ? openUpload : undefined}
        showViewResult={showViewAction}
        viewActionLabel="View Report"
        loadingActionLabel="Loading..."
        hideUploadAction={hideUploadAction}
        showInProgress={isQualityCheck}
        onViewResultClick={() => {
          if (showViewReport) {
            openReport();
          }
        }}
        isViewResultLoading={false}
      />
    );
  };

const HistoryTestCard: React.FC<{
  row: PatientHistoryItem;
  idx: number;
  openUploadForRowId: (rowId: string) => void;
}> = ({
  row,
 
  openUploadForRowId,
}) => {
    const reportUrl = getReportUrl(row);
    const hasReport = Boolean(reportUrl);
    const rowId = row.appointmentTestId;

    const openPdf = () => {
      if (reportUrl) {
        window.open(reportUrl, "_blank", "noopener,noreferrer");
      }
    };

    const downloadPdf = () => {
      if (reportUrl) {
        triggerReportDownload(reportUrl, getFileNameFromUrl(reportUrl));
      }
    };

    const reUpload = () => {
      if (!rowId) return;
      openUploadForRowId(rowId);
    };

    const showViewReport = hasReport;
    const isQualityCheck = row.sampleStatus === "QUALITY_CHECK" && !hasReport;
    const showViewAction = !isQualityCheck && showViewReport;
    const hideUploadAction = isQualityCheck || showViewAction;

    return (
      <CardShell
        title={row.test?.name ?? "Test"}
        category={row.test?.category ?? "—"}
        dateText={formatDateShort(row.assignedAt)}
        statusLabel={hasReport ? "Uploaded" : "Pending"}
        hasReport={hasReport}
        fileName={reportUrl ? getFileNameFromUrl(reportUrl) : ""}
        fileSizeLabel="PDF"
        onBottomClick={hasReport ? openPdf : reUpload}
        onDownloadClick={hasReport ? downloadPdf : undefined}
        onReuploadClick={hasReport ? reUpload : undefined}
        showViewResult={showViewAction}
        viewActionLabel="View Report"
        loadingActionLabel="Loading..."
        hideUploadAction={hideUploadAction}
        showInProgress={isQualityCheck}
        onViewResultClick={() => {
          if (showViewReport) {
            openPdf();
          }
        }}
        isViewResultLoading={false}
      />
    );
  };

const TestDetailsTab: React.FC<Props> = ({
  patientId,
  appointmentId,
  appointmentStatus,
  doctorId: doctorIdProp,
  pdfMeta,
}) => {
  const [subTab, setSubTab] = React.useState<"current" | "history">("current");

  const statusLower = String(
    appointmentStatus ?? pdfMeta?.appointmentStatus ?? "",
  ).toLowerCase();

  const isCancelledStatus =
    statusLower === "cancelled" || statusLower === "canceled";

  const { data: clinicData, isLoading: isClinicLoading } =
    useGetAllClinicsQuery();

  const clinicId: string | undefined = (clinicData as any)?.clinic?.id;

  const doctorId: string | undefined =
    doctorIdProp || (clinicData as any)?.profile?.id;

  const [
    fetchTests,
    {
      data: testsResp,
      isFetching: isTestsFetching,
      isUninitialized: isTestsUninitialized,
    },
  ] = useLazyGetAllTestsByClinicIdQuery();

  const apiTests: ApiTest[] = React.useMemo(() => {
    const arr = (testsResp as any)?.result;
    return Array.isArray(arr) ? arr : [];
  }, [testsResp]);

  const ensureTestsLoaded = React.useCallback(() => {
    if (!clinicId) return;
    fetchTests({ clinicId, page: 1, pageSize: 200 }, true);
  }, [clinicId, fetchTests]);

  const [createTest, { isLoading: isCreatingTest }] = useCreateTestMutation();

  const handleCreateTest = React.useCallback(
    async (payload: CreateTestInput): Promise<TestSelectOption> => {
      const res: any = await createTest(payload as any).unwrap();
      const t = res?.result ?? res;

      if (clinicId) {
        fetchTests({ clinicId, page: 1, pageSize: 200 }, false);
      }

      return {
        label: String(t?.name ?? payload.name),
        value: String(t?.id ?? t?._id ?? ""),
      };
    },
    [createTest, clinicId, fetchTests],
  );

  const {
    data: appointmentTestsRaw = [],
    isFetching: isApptTestsFetching,
    isError: isApptTestsError,
    refetch: refetchApptTests,
  } = useGetAppointmentTestsByAppointmentIdQuery(appointmentId ?? "", {
    skip: !appointmentId,
  });

  const appointmentTests: AppointmentTestItem[] = React.useMemo(() => {
    return Array.isArray(appointmentTestsRaw)
      ? (appointmentTestsRaw as any)
      : [];
  }, [appointmentTestsRaw]);

  const {
    data: historyRaw = [],
    isFetching: isHistoryFetching,
    isError: isHistoryError,
  } = useGetPatientTestHistoryByPatientIdQuery(patientId ?? "", {
    skip: !patientId || subTab !== "history",
  });

  const historyTests: PatientHistoryItem[] = React.useMemo(() => {
    return Array.isArray(historyRaw) ? (historyRaw as any) : [];
  }, [historyRaw]);

  const [assignAppointmentTest, { isLoading: isAssigning }] =
    useAssignAppointmentTestMutation();

  const [updateAppointmentTestReport, { isLoading: isUploadingReport }] =
    useUpdateAppointmentTestReportMutation();

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);

  const [pickedFiles, setPickedFiles] = React.useState<File[]>([]);
  const [attachToRowId, setAttachToRowId] = React.useState<string | null>(null);

  const [localReports, setLocalReports] = React.useState<Record<string, File>>(
    {},
  );

  const [selectedTestIds, setSelectedTestIds] = React.useState<string[]>([]);

  const assignedTestIds = React.useMemo(() => {
    const ids: string[] = [];
    appointmentTests.forEach((t) => {
      if (t?.test?.id) {
        ids.push(String(t.test.id));
      }
    });
    return ids;
  }, [appointmentTests]);

  const testSelectOptions = React.useMemo<SelectOpt[]>(() => {
    if (isClinicLoading) {
      return [{ label: "Loading clinic...", value: "", disabled: true }];
    }

    if (!clinicId) {
      return [{ label: "Clinic not found", value: "", disabled: true }];
    }

    if (isTestsUninitialized) {
      return [{ label: "Select to load tests", value: "", disabled: false }];
    }

    if (isTestsFetching) {
      return [{ label: "Loading tests...", value: "", disabled: true }];
    }

    if (!apiTests.length) {
      return [{ label: "No tests found", value: "", disabled: true }];
    }

    const mapped: SelectOpt[] = apiTests
      .filter((t) => t?.id && t?.name)
      .map((t) => {
        const status = String(t.status ?? "").toLowerCase();
        const inactive = Boolean(status && status !== "active");

        return {
          label: String(t.name),
          value: String(t.id),
          disabled: inactive,
        };
      });

    return [{ label: "Select Test", value: "", disabled: true }, ...mapped];
  }, [
    clinicId,
    apiTests,
    isClinicLoading,
    isTestsFetching,
    isTestsUninitialized,
  ]);

  const modalSelectOptions: TestSelectOption[] = React.useMemo(
    () =>
      testSelectOptions.map((o) => ({
        label: o.label,
        value: o.value,
        disabled: Boolean(o.disabled),
      })),
    [testSelectOptions],
  );

  const openUploadForRowId = (rowId: string) => {
    setAttachToRowId(rowId);
    setPickedFiles([]);
    setUploadOpen(true);
  };

  const handleUploadOpenChange = (open: boolean) => {
    setUploadOpen(open);
    if (!open) {
      setPickedFiles([]);
      setAttachToRowId(null);
    }
  };

  const saveReport = async () => {
    if (!pickedFiles.length) return;
    if (!attachToRowId) return;

    try {
      await updateAppointmentTestReport({
        id: attachToRowId,
        reportPdf: pickedFiles[0],
      } as any).unwrap();

      setLocalReports((prev) => ({ ...prev, [attachToRowId]: pickedFiles[0] }));
      setPickedFiles([]);
      setAttachToRowId(null);
      setUploadOpen(false);

      refetchApptTests();
      addToast({ title: "Report uploaded", color: "success" });
    } catch (err) {
      console.error("updateAppointmentTestReport failed:", err);
      addToast({ title: "Upload failed", color: "danger" });
    }
  };

  const addTest = async () => {
    if (!selectedTestIds.length) return;
    if (!patientId || !appointmentId) return;

    if (!doctorId) {
      addToast({ title: "Doctor not found", color: "danger" });
      return;
    }

    const validSelectedTestIds = selectedTestIds.filter((id) => {
      const match = apiTests.find((t) => String(t?.id) === String(id));
      if (!match) return false;

      const status = String(match.status ?? "").toLowerCase();
      return !status || status === "active";
    });

    if (!validSelectedTestIds.length) {
      addToast({ title: "No valid active tests selected", color: "danger" });
      return;
    }

    try {
      await assignAppointmentTest({
        patientId,
        appointmentId,
        testIds: validSelectedTestIds,
        doctorId,
      } as any).unwrap();

      setSelectedTestIds([]);
      setAddOpen(false);
      refetchApptTests();
      addToast({ title: "Tests added", color: "success" });
    } catch (err) {
      console.error("assignAppointmentTest failed:", err);
      addToast({ title: "Failed to add tests", color: "danger" });
    }
  };

  const handleAddOpenChange = (open: boolean) => {
    setAddOpen(open);
    if (!open) setSelectedTestIds([]);
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);

  const downloadTestsPdf = async () => {
    try {
      setIsDownloadingPdf(true);

      const rows: PdfRow[] =
        subTab === "current"
          ? appointmentTests.map((t, idx) => ({
            sr: idx + 1,
            testName: t.test?.name ?? "Test",
            category: t.test?.category ?? "—",
            date: formatDateShort(t.assignedAt),
          }))
          : historyTests.map((t, idx) => ({
            sr: idx + 1,
            testName: t.test?.name ?? "Test",
            category: t.test?.category ?? "—",
            date: formatDateShort(t.assignedAt),
          }));

      const heading =
        subTab === "current" ? "Appointment Tests" : "Patient Test History";

      const firstRow: any =
        subTab === "current" ? appointmentTests?.[0] : historyTests?.[0];

      const metaObj: PdfHeaderMeta = {
        appointmentId:
          firstRow?.appointmentId || appointmentId || pdfMeta?.appointmentId,
        patientId: firstRow?.patientId || patientId || pdfMeta?.patientId,
        doctorId: firstRow?.doctorId || doctorId,
        clinicName: firstRow?.clinicName || pdfMeta?.clinicName,
        clinicAddress:
          firstRow?.clinicAddress || (pdfMeta?.clinicAddress ?? undefined),
        doctorName: firstRow?.doctorName || pdfMeta?.doctorName,
        patientName: firstRow?.patientName || pdfMeta?.patientName,
        generated: formatDateShort(new Date().toISOString()),
      };

      const blob = await pdf(
        <TestsPdfDoc heading={heading} meta={metaObj} rows={rows} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateTag = new Date().toISOString().slice(0, 10);

      a.href = url;
      a.download = `${subTab}_tests_${appointmentId || patientId || "data"
        }_${dateTag}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download PDF failed:", e);
      addToast({ title: "PDF download failed", color: "danger" });
    } finally {
      setIsDownloadingPdf(false);
    }
  };




  const activeTabCls =
    "flex items-center gap-2 border-b-2 border-emerald-700 pb-2 text-emerald-700 font-semibold";
  const inactiveTabCls =
    "flex items-center gap-2 pb-2 text-slate-500 hover:text-slate-700";

  const listIsEmpty =
    subTab === "current"
      ? appointmentTests.length === 0
      : historyTests.length === 0;

  const listIsFetching =
    subTab === "current" ? isApptTestsFetching : isHistoryFetching;

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex justify-between">
          <div className="text-[15px] font-semibold text-slate-900 sm:text-base">
            Pathology Test Details
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="ml-auto flex w-auto flex-wrap items-center justify-end gap-3">
              <Button
                radius="full"
                size="sm"
                className="h-8 min-w-0 justify-center bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-black sm:h-10 sm:px-5 sm:text-sm"
                startContent={
                  <FiDownload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                }
                onPress={downloadTestsPdf}
                isDisabled={
                  isCancelledStatus ||
                  listIsFetching ||
                  isDownloadingPdf ||
                  listIsEmpty
                }
                isLoading={isDownloadingPdf}
              >
                <span className="sm:hidden">PDF</span>
                <span className="hidden sm:inline">Download PDF</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto whitespace-nowrap border-b border-gray-200 [-ms-overflow-style:none] [scrollbar-width:none] sm:mt-5 [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-4 sm:gap-8">
            <button
              type="button"
              className={subTab === "current" ? activeTabCls : inactiveTabCls}
              onClick={() => setSubTab("current")}
            >
              <FiUpload />
              <span className="text-sm sm:text-base">
                Current Pathology Test
              </span>
            </button>

            <button
              type="button"
              className={subTab === "history" ? activeTabCls : inactiveTabCls}
              onClick={() => setSubTab("history")}
            >
              <FiClock />
              <span className="text-sm sm:text-base">History</span>
            </button>
          </div>
        </div>

        <div className="mt-5 sm:mt-6">
          {subTab === "current" && (
            <>
              {isApptTestsFetching ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-slate-500 sm:p-6 sm:text-sm">
                  Loading pathology tests...
                </div>
              ) : isApptTestsError ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-slate-500 sm:p-6 sm:text-sm">
                  Failed to load pathology tests.
                </div>
              ) : appointmentTests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-slate-500 sm:p-6 sm:text-sm">
                  No pathology tests uploaded yet.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                    {appointmentTests.map((row, idx) => (
                      <CurrentTestCard
                        key={getRowId(row) || `${row.appointmentTestId || "row"}-${idx}`}
                        row={row}
                        idx={idx}
                        localReports={localReports}
                        openUploadForRowId={openUploadForRowId}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {subTab === "history" && (
            <>
              {isHistoryFetching ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-slate-500 sm:p-6 sm:text-sm">
                  Loading history...
                </div>
              ) : isHistoryError ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-slate-500 sm:p-6 sm:text-sm">
                  Failed to load history.
                </div>
              ) : historyTests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-slate-500 sm:p-6 sm:text-sm">
                  No history found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {historyTests.map((row, idx) => (
                    <HistoryTestCard
                      key={`${row.appointmentId}-${row.assignedAt}-${idx}`}
                      row={row}
                      idx={idx}
                      openUploadForRowId={openUploadForRowId}
                    />
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>

      <UploadReportModal
        isOpen={uploadOpen}
        onOpenChange={handleUploadOpenChange}
        pickedFiles={pickedFiles}
        setPickedFiles={setPickedFiles}
        onSave={saveReport}
        saveDisabled={!pickedFiles.length || isUploadingReport}
        isSaving={isUploadingReport}
        title="Upload PDF"
      />

      <AddNewTestModal
        isOpen={addOpen}
        onOpenChange={handleAddOpenChange}
        clinicId={clinicId}
        isClinicLoading={isClinicLoading}
        options={modalSelectOptions}
        values={selectedTestIds}
        onValuesChange={setSelectedTestIds}
        assignedValues={assignedTestIds}
        ensureTestsLoaded={ensureTestsLoaded}
        onAdd={addTest}
        isAddDisabled={
          selectedTestIds.length === 0 ||
          !patientId ||
          !appointmentId ||
          !doctorId
        }
        isAdding={isAssigning}
        onCreateTest={handleCreateTest}
        isCreatingTest={isCreatingTest}
      />
    </div>
  );
};

export default TestDetailsTab;
