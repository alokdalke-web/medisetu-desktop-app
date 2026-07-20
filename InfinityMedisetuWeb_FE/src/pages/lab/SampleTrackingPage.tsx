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
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiCreditCard,
  FiDollarSign,
  FiEdit,
  FiFileText,
  FiPrinter,
  FiSmartphone,
  FiUploadCloud,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router";

import {
  getLabApiErrorMessage,
  useGetAppointmentTestTrackingQuery,
  useLazyGetLabResultReportQuery,
  useLazyGetLabResultTemplateQuery,
  useMarkAppointmentTestPaymentPaidMutation,
  useSaveLabResultMutation,
  useUpdateAppointmentTestSampleStatusMutation,
  useUploadAppointmentTestReportMutation,
  type LabResultReport,
  type LabResultSaveResponse,
  type LabResultTemplate,
  type NextAction,
  type SampleAction,
  type SampleStatus,
} from "../../redux/api/labAssistantApi";
import UploadReportModal from "../../components/prescription/UploadReportModal";
import { Code128Barcode } from "./components/Code128Barcode";
import { LabInvoiceModal } from "./components/LabInvoiceModal";
import {
  ActionValidationModal,
  BarcodeAffixAnimation,
  EventsCard,
  ManualReportCard,
  ResultEntryCard,
  ResultNotAvailablePlaceholder,
  SampleTimeline,
  TestSummaryCard,
  extractReportPdfUrl,
  extractSampleStatusFromResponse,
  printBarcodeLabel,
} from "./components/sampleTracking";
import { normalizePaymentStatus } from "./labData";

const SampleTrackingPage = () => {
  const { id } = useParams();
  const appointmentTestId = decodeURIComponent(id ?? "");
  const navigate = useNavigate();

  const [sampleStatusOverride, setSampleStatusOverride] =
    useState<SampleStatus | null>(null);
  const [isRefreshingAfterSampleUpdate, setIsRefreshingAfterSampleUpdate] =
    useState(false);
  const [pendingNextAction, setPendingNextAction] = useState<NextAction | null>(
    null,
  );
  const [resultReport, setResultReport] = useState<LabResultReport | null>(
    null,
  );
  const [activeResultTemplate, setActiveResultTemplate] =
    useState<LabResultTemplate | null>(null);
  const [manualReportUrlOverride, setManualReportUrlOverride] = useState<
    string | null
  >(null);
  const [activeReportTab, setActiveReportTab] = useState<string>("result");
  const [isReportUploadOpen, setIsReportUploadOpen] = useState(false);
  const [pickedReportFiles, setPickedReportFiles] = useState<File[]>([]);
  const [showBarcodeReminderModal, setShowBarcodeReminderModal] = useState(false);
  const [expectedReportReadyAtInput, setExpectedReportReadyAtInput] = useState<string>("");
  const [reportNoteInput, setReportNoteInput] = useState<string>("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethodSelection, setPaymentMethodSelection] = useState<"CASH" | "UPI">("CASH");
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [transactionIdInput, setTransactionIdInput] = useState<string>("");
  const [invoiceTarget, setInvoiceTarget] = useState<{
    appointmentTestId: string;
    invoiceId?: string | null;
    invoiceNumber?: string | null;
  } | null>(null);
  const [paidInvoiceMeta, setPaidInvoiceMeta] = useState<{
    invoiceId?: string | null;
    invoiceNumber?: string | null;
  } | null>(null);

  const { data, isLoading, isError, error, refetch } =
    useGetAppointmentTestTrackingQuery(appointmentTestId, {
      skip: !appointmentTestId,
    });

  const [markPaid, { isLoading: isMarkingPaid }] =
    useMarkAppointmentTestPaymentPaidMutation();

  const [updateSampleStatus, { isLoading: isUpdatingSample }] =
    useUpdateAppointmentTestSampleStatusMutation();

  const [uploadAppointmentTestReport, { isLoading: isUploadingManualReport }] =
    useUploadAppointmentTestReportMutation();
  const [
    loadResultTemplate,
    {
      isLoading: isLoadingResultTemplate,
      isFetching: isFetchingResultTemplate,
    },
  ] = useLazyGetLabResultTemplateQuery();
  const [loadResultReport] = useLazyGetLabResultReportQuery();
  const [saveResult, { isLoading: isSavingResult }] = useSaveLabResultMutation();

  const detail = data?.data;
  const rawAppointmentTest = detail?.appointmentTest;
  const appointmentTest = rawAppointmentTest
    ? {
      ...rawAppointmentTest,
      ...(sampleStatusOverride ? { sampleStatus: sampleStatusOverride } : {}),
    }
    : undefined;
  const barcodeValue = appointmentTest?.barcode?.value?.trim();
  const payment = detail?.payment;
  const nextAction = isRefreshingAfterSampleUpdate ? null : detail?.nextAction;
  const expectedReportReadyAt =
    appointmentTest?.expectedReportReadyAt ??
    detail?.reportSchedule?.expectedReportReadyAt ??
    null;
  // Result/template can be viewed from Result Verification onward,
  // but the result modal can only be opened at Report Ready.
  const isPaid = payment
    ? normalizePaymentStatus(payment.status) === "PAID"
    : false;
  const isSampleReadyForReport =
    appointmentTest?.sampleStatus === "QUALITY_CHECK" ||
    appointmentTest?.sampleStatus === "COMPLETED";
  const canEnterResult = appointmentTest
    ? isSampleReadyForReport && isPaid && !isRefreshingAfterSampleUpdate
    : false;
  const canUploadManualReport = appointmentTest
    ? isPaid &&
    (appointmentTest.sampleStatus === "QUALITY_CHECK" ||
      appointmentTest.sampleStatus === "COMPLETED") &&
    !isRefreshingAfterSampleUpdate
    : false;
  const manualReportUrl =
    manualReportUrlOverride ?? appointmentTest?.reportPdf ?? null;
  const showManualReportCard =
    canUploadManualReport || Boolean(manualReportUrl);
  const appointmentTestResultId =
    appointmentTest?.resultId ??
    appointmentTest?.labResultId ??
    appointmentTest?.latestResultId ??
    null;
  const isResultStageAvailable = Boolean(
    isSampleReadyForReport || appointmentTestResultId || resultReport,
  );

  const resultEntered = Boolean(
    (appointmentTestResultId || activeResultTemplate?.resultId || resultReport?.id) &&
    !manualReportUrl
  );

  const showResultEntryTab = (canEnterResult || isResultStageAvailable) && !manualReportUrl;
  const showUploadReportTab = showManualReportCard && !resultEntered;
  const readyActionMessage = canEnterResult
    ? "Result editing is available below."
    : isRefreshingAfterSampleUpdate
      ? "Refreshing the latest sample details..."
      : "Result editing becomes available after payment and Report Ready status.";
  const trackingInvoiceMeta = {
    invoiceId: paidInvoiceMeta?.invoiceId ?? appointmentTest?.invoiceId ?? null,
    invoiceNumber:
      paidInvoiceMeta?.invoiceNumber ?? appointmentTest?.invoiceNumber ?? null,
  };

  useEffect(() => {
    setSampleStatusOverride(null);
    setIsRefreshingAfterSampleUpdate(false);
    setActiveResultTemplate(null);
    setResultReport(null);
    setManualReportUrlOverride(null);
    setActiveReportTab("result");
    setIsReportUploadOpen(false);
    setPickedReportFiles([]);
    setPendingNextAction(null);
    setExpectedReportReadyAtInput("");
    setReportNoteInput("");
    setShowBarcodeReminderModal(false);
    setIsPaymentModalOpen(false);
    setPaymentMethodSelection("CASH");
    setPaymentAmountInput(0);
    setTransactionIdInput("");
    setInvoiceTarget(null);
    setPaidInvoiceMeta(null);
  }, [appointmentTestId]);

  useEffect(() => {
    if (!showResultEntryTab && activeReportTab === "result") {
      setActiveReportTab("upload");
    } else if (!showUploadReportTab && activeReportTab === "upload") {
      setActiveReportTab("result");
    }
  }, [showResultEntryTab, showUploadReportTab, activeReportTab]);

  useEffect(() => {
    if (!isResultStageAvailable || !appointmentTestResultId) return;
    if (resultReport?.id === appointmentTestResultId) return;

    void loadResultReport({ resultId: appointmentTestResultId })
      .unwrap()
      .then((report) => {
        setResultReport(report);
      })
      .catch(() => {
        setResultReport(null);
      });
  }, [
    appointmentTestResultId,
    isResultStageAvailable,
    loadResultReport,
    resultReport?.id,
  ]);

  useEffect(() => {
    if (!appointmentTestId) return;
    if (!canEnterResult && !isResultStageAvailable) return;
    if (activeResultTemplate) return;

    let ignore = false;
    void loadResultTemplate({ appointmentTestId })
      .unwrap()
      .then((template) => {
        if (!ignore) {
          setActiveResultTemplate(template);
        }
      })
      .catch(() => {
        if (!ignore) {
          setActiveResultTemplate(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, [
    appointmentTestId,
    canEnterResult,
    isResultStageAvailable,
    loadResultTemplate,
    activeResultTemplate,
  ]);

  const syncSavedResult = async (saved?: LabResultSaveResponse) => {
    if (saved?.report) {
      setResultReport(saved.report);
    } else if (saved?.id) {
      try {
        const report = await loadResultReport({ resultId: saved.id }).unwrap();
        setResultReport(report);
      } catch (_err) {
        setResultReport(null);
      }
    }

    await refetch();
  };

  const onTemplateUpdated = async () => {
    try {
      const template = await loadResultTemplate({ appointmentTestId }).unwrap();
      setActiveResultTemplate(template);
      if (appointmentTestResultId) {
        const report = await loadResultReport({ resultId: appointmentTestResultId }).unwrap();
        setResultReport(report);
      }
    } catch (_err) {
      // ignore
    }
    await refetch();
  };



  const onMarkPaid = async (
    paymentMethod: "CASH" | "UPI",
    amount: number,
    transactionId?: string,
  ) => {
    if (!appointmentTest || !payment) return false;

    try {
      const response = await markPaid({
        appointmentTestId,
        amount,
        paymentMethod,
        transactionId: transactionId || undefined,
      }).unwrap();
      const invoiceId = response.data?.invoiceId ?? null;
      const invoiceNumber = response.data?.invoiceNumber ?? null;

      setPaidInvoiceMeta({
        invoiceId,
        invoiceNumber,
      });

      addToast({
        title: "Payment marked as paid",
        description: invoiceNumber
          ? `Invoice ${invoiceNumber} is ready.`
          : "Sample tracking is now unlocked.",
        color: "success",
      });

      await refetch();
      return true;
    } catch (err) {
      addToast({
        title: "Payment update failed",
        description: getLabApiErrorMessage(err, "Could not mark payment paid."),
        color: "danger",
      });
      return false;
    }
  };

  const openInvoice = () => {
    setInvoiceTarget({
      appointmentTestId,
      invoiceId: trackingInvoiceMeta.invoiceId,
      invoiceNumber: trackingInvoiceMeta.invoiceNumber,
    });
  };

  const executeNextAction = async (action: NextAction) => {
    if (action.key === "MARK_PAYMENT_PAID") {
      return await onMarkPaid("CASH", payment?.amount ?? appointmentTest?.price ?? 0);
    }

    try {
      if (action.key === "SET_EXPECTED_REPORT_READY_AT") {
        const isoDateTime = expectedReportReadyAtInput
          ? new Date(expectedReportReadyAtInput).toISOString()
          : "";
        const response = await updateSampleStatus({
          appointmentTestId,
          action: "SET_EXPECTED_REPORT_READY_AT",
          expectedReportReadyAt: isoDateTime,
          note: reportNoteInput || undefined,
        }).unwrap();
        const nextSampleStatus = extractSampleStatusFromResponse(response);

        if (nextSampleStatus) setSampleStatusOverride(nextSampleStatus);
        setIsRefreshingAfterSampleUpdate(true);
        setExpectedReportReadyAtInput("");
        setReportNoteInput("");

        addToast({
          title: action.label,
          description: "Expected report time set successfully.",
          color: "success",
        });

        try {
          await refetch();
        } finally {
          setSampleStatusOverride(null);
          setIsRefreshingAfterSampleUpdate(false);
        }
        return true;
      }

      const response = await updateSampleStatus({
        appointmentTestId,
        action: action.key as SampleAction,
      }).unwrap();
      const nextSampleStatus = extractSampleStatusFromResponse(response);

      if (nextSampleStatus) setSampleStatusOverride(nextSampleStatus);
      setIsRefreshingAfterSampleUpdate(true);

      addToast({
        title: action.label,
        description: "Sample status updated successfully.",
        color: "success",
      });

      if (action.key === "MARK_SAMPLE_COLLECTED") {
        setShowBarcodeReminderModal(true);
      }

      try {
        await refetch();
      } finally {
        setSampleStatusOverride(null);
        setIsRefreshingAfterSampleUpdate(false);
      }
      return true;
    } catch (err) {
      setIsRefreshingAfterSampleUpdate(false);
      addToast({
        title: "Sample update failed",
        description: getLabApiErrorMessage(
          err,
          "Could not update sample status.",
        ),
        color: "danger",
      });
      return false;
    }
  };

  const closeActionValidation = () => {
    if (isUpdatingSample || isMarkingPaid || isRefreshingAfterSampleUpdate)
      return;
    setPendingNextAction(null);
    setExpectedReportReadyAtInput("");
    setReportNoteInput("");
  };

  const confirmNextAction = async () => {
    if (!pendingNextAction) return;

    const didComplete = await executeNextAction(pendingNextAction);
    if (didComplete) setPendingNextAction(null);
  };

  const handleNextActionClick = (action: NextAction) => {
    if (action.key === "MARK_PAYMENT_PAID") {
      setPaymentAmountInput(payment?.amount ?? appointmentTest?.price ?? 0);
      setPaymentMethodSelection("CASH");
      setTransactionIdInput("");
      setIsPaymentModalOpen(true);
      return;
    }

    const keysRequiringModal = [
      "MARK_SAMPLE_COLLECTED",
      "MARK_SAMPLE_RECEIVED_AT_LAB",
      "MARK_QUALITY_CHECK_DONE",
      "SET_EXPECTED_REPORT_READY_AT",
    ];

    if (keysRequiringModal.includes(action.key)) {
      setPendingNextAction(action);
    } else {
      void executeNextAction(action);
    }
  };



  const openManualReportUploadModal = () => {
    if (!canUploadManualReport) {
      addToast({
        title: "Report upload locked",
        description:
          "Report upload is enabled after payment and completed result verification.",
        color: "warning",
      });
      return;
    }

    setPickedReportFiles([]);
    setIsReportUploadOpen(true);
  };

  const handleReportUploadOpenChange = (open: boolean) => {
    setIsReportUploadOpen(open);
    if (!open) {
      setPickedReportFiles([]);
    }
  };

  const saveManualReport = async () => {
    const file = pickedReportFiles[0];

    if (!file) return;

    try {
      if (!canUploadManualReport) {
        addToast({
          title: "Report upload locked",
          description:
            "Report upload is enabled after payment and completed result verification.",
          color: "warning",
        });
        return;
      }

      const isPdf =
        file.type === "application/pdf" ||
        file.name.trim().toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        addToast({
          title: "Invalid report file",
          description:
            "Use the image editor to convert photos into a PDF, or upload a PDF file.",
          color: "danger",
        });
        return;
      }

      const uploaded = await uploadAppointmentTestReport({
        appointmentTestId,
        reportPdf: file,
      }).unwrap();
      const uploadedUrl = extractReportPdfUrl(uploaded);
      if (uploadedUrl) setManualReportUrlOverride(uploadedUrl);

      // Automatically mark the test as completed using the save results API
      let templateId = activeResultTemplate?.id;
      if (!templateId) {
        try {
          const fetchedTemplate = await loadResultTemplate({ appointmentTestId }).unwrap();
          templateId = fetchedTemplate?.id;
        } catch (templateErr) {
          console.error("Failed to load template for completion:", templateErr);
        }
      }

      if (templateId) {
        try {
          await saveResult({
            appointmentTestId,
            templateId,
            status: "Completed",
            values: [],
          }).unwrap();
        } catch (saveErr) {
          console.error("Failed to mark test as completed:", saveErr);
        }
      }

      // Automatically advance sample status to Completed (MARK_COMPLETED)
      try {
        const statusResponse = await updateSampleStatus({
          appointmentTestId,
          action: "MARK_COMPLETED",
        }).unwrap();
        const nextSampleStatus = extractSampleStatusFromResponse(statusResponse);
        if (nextSampleStatus) setSampleStatusOverride(nextSampleStatus);
      } catch (statusErr) {
        console.error("Failed to auto-advance sample status to completed:", statusErr);
        addToast({
          title: "Status update failed",
          description: getLabApiErrorMessage(statusErr, "Could not mark the test completed."),
          color: "warning",
        });
      }

      const refreshed = await refetch();
      const refreshedUrl =
        refreshed.data?.data.appointmentTest.reportPdf ?? uploadedUrl;
      setManualReportUrlOverride(refreshedUrl ?? null);

      addToast({
        title: "Report uploaded",
        description: "The report PDF was uploaded successfully.",
        color: "success",
      });
      setPickedReportFiles([]);
      setIsReportUploadOpen(false);
    } catch (err) {
      addToast({
        title: "Upload failed",
        description: getLabApiErrorMessage(
          err,
          "Could not upload the report PDF.",
        ),
        color: "danger",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
          <Spinner size="sm" />
          Loading sample tracking...
        </div>
      </div>
    );
  }

  if (isError || !detail || !appointmentTest || !payment) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-950">Sample Tracking</h1>

        <p className="mt-2 text-sm text-slate-500">
          {getLabApiErrorMessage(
            error,
            "This test could not be loaded from the backend.",
          )}
        </p>

        <button
          type="button"
          onClick={() => navigate("/lab/all-tests")}
          className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white"
        >
          Back to All Tests
        </button>
      </div>
    );
  }

  const resultEntryPanel =
    canEnterResult || isResultStageAvailable ? (
      <ResultEntryCard
        isResultStageAvailable={isResultStageAvailable}
        canEnter={canEnterResult}
        template={activeResultTemplate}
        report={resultReport}
        isLoadingTemplate={
          isLoadingResultTemplate || isFetchingResultTemplate
        }
        appointmentTestId={appointmentTestId}
        testName={appointmentTest?.testName ?? undefined}
        appointmentTest={appointmentTest}
        onSaved={syncSavedResult}
        onTemplateUpdated={onTemplateUpdated}
      />
    ) : (
      <ResultNotAvailablePlaceholder
        isPaid={isPaid}
        sampleStatus={appointmentTest?.sampleStatus}
        nextActionLabel={nextAction?.label}
        steps={detail.steps}
      />
    );
  const uploadReportPanel = (
    <ManualReportCard
      canUpload={canUploadManualReport}
      fileUrl={manualReportUrl}
      isUploading={isUploadingManualReport || isSavingResult}
      onUploadClick={openManualReportUploadModal}
    />
  );

  const reportWorkspaceTabs = [
    ...(showResultEntryTab ? [{ key: "result", label: "Result Entry", icon: FiEdit }] : []),
    ...(showUploadReportTab
      ? [
        {
          key: "upload",
          label: "Upload Report",
          icon: FiUploadCloud,
          badge: manualReportUrl ? "Uploaded" : "Pending",
        },
      ]
      : []),
  ];
  const hidePendingUploadPanel = showUploadReportTab && !manualReportUrl;


  return (
    <div className="mx-auto flex w-full flex-col gap-4">
      <TestSummaryCard
        appointmentTest={appointmentTest}
        payment={payment}
        expectedReportReadyAt={expectedReportReadyAt}
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <SampleTimeline
            steps={detail.steps}
            expectedReportReadyAt={expectedReportReadyAt}
          />

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="overflow-hidden rounded-[8px] border border-slate-200/80 bg-gradient-to-r from-primary/5 via-white to-white shadow-[0_10px_28px_rgba(15,23,42,0.045)]"
          >
            <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
                  <FiFileText />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-primary/80">
                    Actions for Current Step
                  </h2>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                    {nextAction
                      ? nextAction.key === "MARK_COMPLETED"
                        ? "Enter and save completed results below to advance the workflow."
                        : "Review this step, view the invoice, or proceed to the next sample action."
                      : "No sample action is currently available."}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap sm:items-center">
                {isPaid && (
                  <button
                    type="button"
                    onClick={openInvoice}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/25 bg-white px-4 text-xs font-bold text-primary shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus:ring-3 focus:ring-primary/15"
                  >
                    <FiFileText className="text-sm" />
                    View Invoice
                  </button>
                )}

                {nextAction ? (
                  <button
                    type="button"
                    onClick={() => handleNextActionClick(nextAction)}
                    disabled={
                      isUpdatingSample ||
                      isMarkingPaid ||
                      isRefreshingAfterSampleUpdate ||
                      Boolean(pendingNextAction) ||
                      nextAction.key === "MARK_COMPLETED"
                    }
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-primary-active hover:shadow-md focus:outline-none focus:ring-3 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdatingSample || isMarkingPaid || isRefreshingAfterSampleUpdate ? (
                      <>
                        <Spinner size="sm" color="white" className="mr-1" /> Updating...
                      </>
                    ) : (
                      <>
                        <FiCheckCircle className="text-xs" /> {nextAction.label}
                      </>
                    )}
                  </button>
                ) : (
                  !isPaid && !nextAction && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-2 text-[11px] font-bold text-sky-700">
                      {readyActionMessage}
                    </div>
                  )
                )}

                {!isPaid && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentAmountInput(payment?.amount ?? appointmentTest?.price ?? 0);
                      setPaymentMethodSelection("CASH");
                      setTransactionIdInput("");
                      setIsPaymentModalOpen(true);
                    }}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-3 focus:ring-slate-200"
                  >
                    <FiCreditCard className="text-sm" />
                    Mark as Paid
                  </button>
                )}
              </div>
            </div>
          </motion.section>

          {showManualReportCard ? (
            <div className="flex min-w-0 flex-col gap-3">
              {(reportWorkspaceTabs.length > 1 || showUploadReportTab) && (
                <div className="inline-flex max-w-full rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm">
                  <div
                    role="tablist"
                    aria-label="Lab report workflow"
                    className="flex max-w-full flex-wrap items-center gap-1"
                  >
                    {reportWorkspaceTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeReportTab === tab.key;

                      return (
                        <button
                          key={tab.key}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => {
                            setActiveReportTab(tab.key);
                            if (tab.key === "upload") {
                              openManualReportUploadModal();
                            }
                          }}
                          className={[
                            "inline-flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-xl px-3 text-left transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-primary/15",
                            isActive
                              ? "bg-primary text-white shadow-sm"
                              : "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                          ].join(" ")}
                        >
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <span
                              className={[
                                "grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs",
                                isActive
                                  ? "bg-white/15 text-white"
                                  : "bg-slate-50 text-primary",
                              ].join(" ")}
                            >
                              <Icon />
                            </span>
                            <span className="truncate text-xs font-bold">
                              {tab.label}
                            </span>
                          </span>

                          {"badge" in tab && tab.badge && (
                            <span
                              className={[
                                "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold",
                                isActive
                                  ? "bg-white/15 text-white"
                                  : manualReportUrl
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700",
                              ].join(" ")}
                            >
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {showResultEntryTab && (
                <div
                  role="tabpanel"
                  aria-label="Result Entry"
                  className={activeReportTab === "result" ? "block" : "hidden"}
                >
                  {resultEntryPanel}
                </div>
              )}
              {showUploadReportTab && !hidePendingUploadPanel && (
                <div
                  role="tabpanel"
                  aria-label="Upload Report"
                  className={activeReportTab === "upload" ? "block" : "hidden"}
                >
                  {uploadReportPanel}
                </div>
              )}
            </div>
          ) : (
            showResultEntryTab && resultEntryPanel
          )}
        </div>

        <aside className="min-w-0 xl:sticky xl:top-4">
          <EventsCard events={detail.events} />
        </aside>
      </div>

      <Modal
        isOpen={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        placement="center"
        size="md"
        backdrop="opaque"
        isDismissable={!isMarkingPaid}
        classNames={{
          backdrop: "bg-slate-950/45 backdrop-blur-[2px]",
          base: "w-[calc(100%-2rem)] max-w-[420px] rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]",
          closeButton:
            "right-4 top-4 h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:bg-slate-50 hover:text-slate-700",
        }}
      >
        <ModalContent>
          <ModalHeader className="px-5 pb-2 pt-5">
            <div className="flex min-w-0 items-start gap-3 pr-8">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-xl text-white shadow-[0_10px_24px_rgba(10,108,116,0.22)]">
                <FiCreditCard />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold leading-6 text-slate-950">
                  Confirm Payment
                </h2>
                <p className="mt-0.5 text-xs font-medium leading-4 text-slate-500">
                  Select payment method to continue.
                </p>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="gap-4 px-5 py-3">
            {/* Payment Method Selector Grid */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Cash Card */}
              <button
                type="button"
                disabled={isMarkingPaid}
                onClick={() => setPaymentMethodSelection("CASH")}
                className={[
                  "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group cursor-pointer focus:outline-none disabled:cursor-not-allowed",
                  paymentMethodSelection === "CASH"
                    ? "border-emerald-500 bg-emerald-50/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                ].join(" ")}
              >
                {paymentMethodSelection === "CASH" && (
                  <span className="absolute top-2 right-2 text-emerald-600 bg-emerald-50 rounded-full p-0.5 border border-emerald-100/50">
                    <FiCheckCircle className="h-4.5 w-4.5 stroke-[2.5]" />
                  </span>
                )}
                <div className={[
                  "grid h-12 w-12 place-items-center rounded-2xl text-xl mb-2.5 transition-all duration-300",
                  paymentMethodSelection === "CASH"
                    ? "bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)]"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                ].join(" ")}
                >
                  <FiDollarSign />
                </div>
                <span className="text-sm font-bold text-slate-900 leading-tight">Cash</span>
                <span className="text-[10px] font-medium text-slate-400 mt-1">Physical Currency</span>
              </button>

              {/* UPI Card */}
              <button
                type="button"
                disabled={isMarkingPaid}
                onClick={() => setPaymentMethodSelection("UPI")}
                className={[
                  "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group cursor-pointer focus:outline-none disabled:cursor-not-allowed",
                  paymentMethodSelection === "UPI"
                    ? "border-emerald-500 bg-emerald-50/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                ].join(" ")}
              >
                {paymentMethodSelection === "UPI" && (
                  <span className="absolute top-2 right-2 text-emerald-600 bg-emerald-50 rounded-full p-0.5 border border-emerald-100/50">
                    <FiCheckCircle className="h-4.5 w-4.5 stroke-[2.5]" />
                  </span>
                )}
                <div className={[
                  "grid h-12 w-12 place-items-center rounded-2xl text-xl mb-2.5 transition-all duration-300",
                  paymentMethodSelection === "UPI"
                    ? "bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)]"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                ].join(" ")}
                >
                  <FiSmartphone />
                </div>
                <span className="text-sm font-bold text-slate-900 leading-tight">UPI</span>
                <span className="text-[10px] font-medium text-slate-400 mt-1">Digital Payment</span>
              </button>
            </div>

            {/* Transaction ID Input (UPI Only) */}
            {paymentMethodSelection === "UPI" && (
              <div className="grid gap-1.5 transition-all duration-300">
                <label
                  htmlFor="transaction-id"
                  className="text-[11px] font-bold uppercase tracking-wide text-slate-600"
                >
                  Transaction ID{" "}
                  <span className="text-[10px] font-medium normal-case text-slate-400">
                    (optional)
                  </span>
                </label>
                <input
                  id="transaction-id"
                  type="text"
                  disabled={isMarkingPaid}
                  value={transactionIdInput}
                  onChange={(e) => setTransactionIdInput(e.target.value)}
                  placeholder="e.g. UPI1234567890"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
                <p className="text-[10px] text-slate-400 leading-normal">
                  Suggested: Enter UPI transaction reference ID for easier reconciliation.
                </p>
              </div>
            )}
          </ModalBody>

          <ModalFooter className="justify-end gap-3 px-5 pb-5 pt-3">
            <Button
              variant="bordered"
              radius="full"
              onPress={() => setIsPaymentModalOpen(false)}
              isDisabled={isMarkingPaid}
              className="h-9 min-w-[86px] border-slate-300 bg-white px-5 text-xs font-semibold text-slate-600 shadow-sm"
            >
              Cancel
            </Button>
            <Button
              color="primary"
              radius="full"
              onPress={async () => {
                const success = await onMarkPaid(
                  paymentMethodSelection,
                  paymentAmountInput,
                  transactionIdInput
                );
                if (success) {
                  setIsPaymentModalOpen(false);
                }
              }}
              isLoading={isMarkingPaid}
              className="h-9 min-w-[130px] bg-primary px-5 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(10,108,116,0.22)]"
            >
              Confirm Payment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ActionValidationModal
        isOpen={Boolean(pendingNextAction)}
        action={pendingNextAction}
        appointmentTest={appointmentTest}
        isLoading={
          isUpdatingSample || isMarkingPaid || isRefreshingAfterSampleUpdate
        }
        onOpenChange={(open) => {
          if (!open) closeActionValidation();
        }}
        onCancel={closeActionValidation}
        onConfirm={confirmNextAction}
        expectedReportReadyAt={expectedReportReadyAtInput}
        onExpectedReportReadyAtChange={setExpectedReportReadyAtInput}
        reportNote={reportNoteInput}
        onReportNoteChange={setReportNoteInput}
      />

      <LabInvoiceModal
        isOpen={Boolean(invoiceTarget)}
        onOpenChange={(open) => {
          if (!open) setInvoiceTarget(null);
        }}
        appointmentTestId={invoiceTarget?.appointmentTestId}
        invoiceId={invoiceTarget?.invoiceId}
        invoiceNumber={invoiceTarget?.invoiceNumber}
      />

      <UploadReportModal
        isOpen={isReportUploadOpen}
        onOpenChange={handleReportUploadOpenChange}
        pickedFiles={pickedReportFiles}
        setPickedFiles={setPickedReportFiles}
        onSave={saveManualReport}
        saveDisabled={!pickedReportFiles.length || isUploadingManualReport || isSavingResult}
        isSaving={isUploadingManualReport || isSavingResult}
        title={manualReportUrl ? "Replace PDF" : "Upload PDF"}
      />

      <Modal
        isOpen={showBarcodeReminderModal}
        onOpenChange={setShowBarcodeReminderModal}
        placement="center"
        size="md"
        backdrop="opaque"
        classNames={{
          backdrop: "bg-slate-950/45 backdrop-blur-[2px]",
          base: "w-[calc(100%-2rem)] max-w-[420px] rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.28)]",
          closeButton:
            "right-4 top-4 h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:bg-slate-50 hover:text-slate-700",
        }}
      >
        <ModalContent>
          <ModalHeader className="px-5 pb-2 pt-5 flex flex-col gap-1 text-center">
            <h2 className="text-lg font-bold leading-6 text-slate-950">
              Affix Barcode Reminder
            </h2>
            <p className="mt-0.5 text-xs font-medium leading-4 text-slate-505 text-slate-500">
              Please put this barcode label on the collected sample.
            </p>
          </ModalHeader>
          <ModalBody className="gap-4 px-5 py-3 text-center">
            <BarcodeAffixAnimation />

            {barcodeValue && (
              <div className="space-y-2 mt-2">
                <div className="mx-auto w-full max-w-[260px] border border-slate-200 rounded-2xl p-4 bg-slate-50/70 shadow-inner flex flex-col items-center gap-1.5">
                  <div className="h-10 w-full overflow-hidden">
                    <Code128Barcode
                      value={barcodeValue}
                      showText={false}
                      className="h-full w-auto mx-auto block"
                    />
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-700 leading-none">
                    {barcodeValue}
                  </span>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter className="justify-stretch gap-3 px-5 pb-5 pt-3">
            <Button
              variant="bordered"
              radius="full"
              onPress={() => setShowBarcodeReminderModal(false)}
              className="h-9 flex-1 border-slate-300 bg-white px-5 text-xs font-semibold text-slate-600 shadow-sm"
            >
              Done / Close
            </Button>
            {barcodeValue && (
              <Button
                color="primary"
                radius="full"
                onPress={() => {
                  printBarcodeLabel({
                    barcodeValue,
                    testName: appointmentTest?.testName,
                    patientName: appointmentTest?.patientName,
                    doctorName: appointmentTest?.doctorName,
                    uniqueTestId: appointmentTest?.uniqueTestId
                  });
                }}
                className="h-9 flex-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 px-5 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(10,108,116,0.22)]"
                startContent={<FiPrinter className="text-xs" />}
              >
                Print Label
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* LabResultEntryModal is bypassed and inline editor is used directly inside ResultEntryCard */}

    </div>
  );
};

export default SampleTrackingPage;
