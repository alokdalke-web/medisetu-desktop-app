import type {
  PagePhase,
  ScanInputPayload,
  PrescriptionData,
  ScanOutput,
} from "../../types/prescription-scanner";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Code } from "@heroui/code";
import { Divider } from "@heroui/divider";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
} from "@heroui/modal";
import { Progress } from "@heroui/progress";
import Tooltip from "../../components/shared/Tooltip";

import {
  ScannerDirectUploadCard,
  ScannerErrorCard,
  ScannerHtmlPreview,
  ScannerIdleCard,
  ScannerPayloadPreview,
  ScannerSessionBridgeCard,
  ScannerStepIndicator,
} from "../../components/prescription-scanner";
// import DefaultLayout from "@/layouts/default";

import SwitchToPhonePage from "../prescription_notepad_scanner/switchToPhone";
import {
  useCreateScanSessionMutation,
  useLazyGetDummyPrescriptionQuery,
  useLazyGetScanStatusQuery,
  useRunPrescriptionScanMutation,
} from "../../redux/api/prescriptionScannerApi";
import { useGetDoctorQuery } from "../../redux/api/doctorApi";
import {
  useDeleteDoctorPrescriptionTemplateMutation,
  useLazyGetDoctorPrescriptionTemplateQuery,
} from "../../redux/api/doctorPrescriptionTemplateApi";
import { useOpenCV } from "../prescription_notepad_scanner/useOpenCV";
import { fileToCanvas } from "../prescription_notepad_scanner/compressCanvas";
import { defCorners, normalizeCorners, getCv } from "../prescription_notepad_scanner/scannerUtils";
import type { CornerPoints } from "jscanify/client";

const POLL_INTERVAL_MS = 2500;

type GetDoctorResponse = {
  result?: {
    doctorProfile?: {
      id?: string;
    };
  };
  profile?: {
    id?: string;
  };
  doctorProfile?: {
    id?: string;
  };
};

function isMobileDevice(): boolean {
  const ua = navigator.userAgent || navigator.vendor || "";

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    ua,
  );
}

function isPayloadNonEmpty(payload: ScanInputPayload): boolean {
  return Boolean(payload.imageBase64 || payload.imageUrl);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const err = error as {
      message?: unknown;
      error?: unknown;
      data?: unknown;
      status?: unknown;
    };

    if (typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }

    if (typeof err.error === "string" && err.error.trim()) {
      return err.error;
    }

    if (typeof err.data === "string" && err.data.trim()) {
      return err.data;
    }

    if (err.data && typeof err.data === "object") {
      const data = err.data as Record<string, unknown>;

      if (typeof data.message === "string" && data.message.trim()) {
        return data.message;
      }

      if (typeof data.error === "string" && data.error.trim()) {
        return data.error;
      }
    }

    if (err.status !== undefined) {
      return `Request failed with status ${String(err.status)}`;
    }
  }

  return fallback;
}

function getTemplateActionErrorMessage(
  error: unknown,
  fallback = "Failed to fetch saved prescription template.",
): string {
  return getErrorMessage(error, fallback);
}

function extractTemplateHtmlFromResponse(response: unknown): string {
  const res = response as
    | {
        templateHtml?: string;
        template?: string;
        result?:
          | Array<{
              templateHtml?: string;
              template?: string;
            }>
          | {
              templateHtml?: string;
              template?: string;
              doctorPrescriptionTemplate?: {
                templateHtml?: string;
                template?: string;
              };
            };
      }
    | undefined;

  if (Array.isArray(res?.result)) {
    return res.result[0]?.templateHtml || res.result[0]?.template || "";
  }

  return (
    res?.result?.doctorPrescriptionTemplate?.templateHtml ||
    res?.result?.doctorPrescriptionTemplate?.template ||
    res?.result?.templateHtml ||
    res?.result?.template ||
    res?.templateHtml ||
    res?.template ||
    ""
  );
}

const PrescriptionNotepadScannerPage = () => {
  const [isMobileView] = useState(() => isMobileDevice());

  const [phase, setPhase] = useState<PagePhase>("idle");
  const [otp, setOtp] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);
  const [payload, setPayload] = useState<ScanInputPayload | null>(null);
  const [scanResult, setScanResult] = useState<ScanOutput | null>(null);
  const [dummyData, setDummyData] = useState<PrescriptionData | null>(null);
  const [dummyError, setDummyError] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [directImageBase64, setDirectImageBase64] = useState<string>("");
  const [directImageUrl, setDirectImageUrl] = useState<string>("");

  const [showDebugJson, setShowDebugJson] = useState<boolean>(false);

  // Desktop crop-editor session (for gallery uploads)
  const { cvReady, cvError, scannerRef } = useOpenCV();
  interface UploadCropSession {
    canvas: HTMLCanvasElement;
    frameSrc: string;
    corners: CornerPoints;
  }
  const [uploadCropSession, setUploadCropSession] = useState<UploadCropSession | null>(null);

  const [savedTemplateHtml, setSavedTemplateHtml] = useState<string>("");
  const [savedTemplateFeedback, setSavedTemplateFeedback] = useState<{
    type: "success" | "danger";
    message: string;
  } | null>(null);
  const [showSavedTemplatePreview, setShowSavedTemplatePreview] =
    useState<boolean>(false);
  const [showNoTemplateTooltip, setShowNoTemplateTooltip] =
    useState<boolean>(false);

  const pollTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const scanFiredRef = useRef(false);
  const phaseRef = useRef<PagePhase>("idle");
  const hasAutoSessionStartedRef = useRef(false);
  const noTemplateTooltipTimerRef = useRef<number | null>(null);

  const [createScanSession] = useCreateScanSessionMutation();
  const [getScanStatus] = useLazyGetScanStatusQuery();
  const [runPrescriptionScan] = useRunPrescriptionScanMutation();
  const [getDummyPrescription] = useLazyGetDummyPrescriptionQuery();

  const { data: doctorResponse, isLoading: isLoadingDoctorProfile } = useGetDoctorQuery();

  const doctorId =
    (doctorResponse as GetDoctorResponse | undefined)?.result?.doctorProfile
      ?.id ||
    (doctorResponse as GetDoctorResponse | undefined)?.profile?.id ||
    (doctorResponse as GetDoctorResponse | undefined)?.doctorProfile?.id ||
    "";

  const [
    getDoctorPrescriptionTemplate,
    { isFetching: isFetchingSavedTemplate },
  ] = useLazyGetDoctorPrescriptionTemplateQuery();

  const [deleteDoctorPrescriptionTemplate, { isLoading: isDeletingSavedTemplate }] =
    useDeleteDoctorPrescriptionTemplateMutation();

  const phoneLink = useMemo(() => {
    if (!otp) return "";

    return `${window.location.origin}/app/switch-to-phone?otp=${encodeURIComponent(
      otp,
    )}`;
  }, [otp]);

  const qrCodeUrl = useMemo(() => {
    if (!phoneLink) return "";

    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
      phoneLink,
    )}`;
  }, [phoneLink]);

  function clearTimers() {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }

  function showNoTemplateMessage() {
    if (noTemplateTooltipTimerRef.current !== null) {
      window.clearTimeout(noTemplateTooltipTimerRef.current);
      noTemplateTooltipTimerRef.current = null;
    }

    setShowNoTemplateTooltip(true);

    noTemplateTooltipTimerRef.current = window.setTimeout(() => {
      setShowNoTemplateTooltip(false);
      noTemplateTooltipTimerRef.current = null;
    }, 2200);
  }

  const createSession = useCallback(async () => {
    setPhase("idle");
    setErrorMessage("");
    setDummyError("");
    setPayload(null);
    setScanResult(null);
    setDummyData(null);
    setShowDebugJson(false);

    try {
      const session = await createScanSession().unwrap();

      setOtp(session.otp);
      setCountdown(session.expiresIn);
      scanFiredRef.current = false;
      setPhase("session_ready");
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Failed to create scan session."),
      );
      setPhase("error");
    }
  }, [createScanSession]);

  function resetToCapture() {
    clearTimers();
    setPayload(null);
    setScanResult(null);
    setDummyData(null);
    setDummyError("");
    setErrorMessage("");
    scanFiredRef.current = false;
    setDirectImageBase64("");
    setDirectImageUrl("");
    setShowDebugJson(false);
    setSavedTemplateFeedback(null);
    setShowSavedTemplatePreview(false);
    setSavedTemplateHtml("");
    setShowNoTemplateTooltip(false);

    if (noTemplateTooltipTimerRef.current !== null) {
      window.clearTimeout(noTemplateTooltipTimerRef.current);
      noTemplateTooltipTimerRef.current = null;
    }

    void createSession();
  }

  const runScan = useCallback(
    async (scanPayload: ScanInputPayload) => {
      if (scanFiredRef.current) return;

      scanFiredRef.current = true;
      clearTimers();

      setPhase("scanning");
      setErrorMessage("");
      setDummyError("");
      setShowDebugJson(false);

      async function loadDummyData() {
        setDummyError("");

        try {
          const data = await getDummyPrescription(undefined).unwrap();
          setDummyData(data);
        } catch (error) {
          setDummyData(null);
          setDummyError(
            getErrorMessage(error, "Failed to load dummy prescription data."),
          );
        }
      }

      try {
        const result = await runPrescriptionScan(scanPayload).unwrap();

        setScanResult(result);
        await loadDummyData();
        setPhase("result");
      } catch (error) {
        setErrorMessage(
          getErrorMessage(error, "Failed to process scan payload."),
        );
        scanFiredRef.current = false;
        setPhase("uploaded");
      }
    },
    [runPrescriptionScan, getDummyPrescription],
  );

  const onSelectDirectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-selected
    event.target.value = "";
    setErrorMessage("");
    try {
      const canvas = await fileToCanvas(file);
      const frameSrc = canvas.toDataURL("image/jpeg", 0.97);
      // Auto-detect corners if OpenCV is ready
      let corners = defCorners(canvas.width, canvas.height);
      if (scannerRef.current) {
        try {
          const cv = getCv();
          if (cv?.imread) {
            const mat = cv.imread(canvas);
            const contour = scannerRef.current.findPaperContour(mat);
            if (contour) {
              const detected = scannerRef.current.getCornerPoints(contour, mat);
              corners = normalizeCorners(detected, canvas.width, canvas.height);
              (contour as { delete?: () => void }).delete?.();
            }
            mat.delete?.();
          }
        } catch { /* use default corners */ }
      }
      setUploadCropSession({ canvas, frameSrc, corners });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to process image file."));
    }
  };

  function confirmDirectPayload() {
    const nextPayload: ScanInputPayload = {
      imageBase64: directImageBase64 || undefined,
      imageUrl: directImageUrl || undefined,
    };

    if (!isPayloadNonEmpty(nextPayload)) {
      setErrorMessage("Provide at least one input: image file or image URL.");
      return;
    }

    setPayload(nextPayload);
    void runScan(nextPayload);
  }

  const handleViewSavedTemplate = async () => {
    setSavedTemplateFeedback(null);
    setSavedTemplateHtml("");
    setShowSavedTemplatePreview(false);
    setShowNoTemplateTooltip(false);

    if (!doctorId) {
      if (isLoadingDoctorProfile) {
        setSavedTemplateFeedback({
          type: "danger",
          message: "Doctor profile is still loading. Please try again in a moment.",
        });
        return;
      }

      setSavedTemplateFeedback({
        type: "danger",
        message: "Doctor id not found from doctor profile response.",
      });
      return;
    }

    try {
      const response = await getDoctorPrescriptionTemplate(doctorId).unwrap();
      const fetchedTemplateHtml = extractTemplateHtmlFromResponse(response);

      if (!fetchedTemplateHtml?.trim()) {
        showNoTemplateMessage();
        return;
      }

      setSavedTemplateHtml(fetchedTemplateHtml);
      setShowSavedTemplatePreview(true);
    } catch (error) {
      const message = getTemplateActionErrorMessage(error, "No template saved.");

      if (message.toLowerCase().includes("no template")) {
        showNoTemplateMessage();
        return;
      }

      setSavedTemplateFeedback({
        type: "danger",
        message,
      });
    }
  };

  const handleDeleteSavedTemplate = async () => {
    setSavedTemplateFeedback(null);

    if (!doctorId) {
      if (isLoadingDoctorProfile) {
        setSavedTemplateFeedback({
          type: "danger",
          message: "Doctor profile is still loading. Please try again in a moment.",
        });
        return;
      }

      setSavedTemplateFeedback({
        type: "danger",
        message: "Doctor id not found from doctor profile response.",
      });
      return;
    }

    try {
      const response = await deleteDoctorPrescriptionTemplate(doctorId).unwrap();

      setSavedTemplateHtml("");
      setShowSavedTemplatePreview(false);

      setSavedTemplateFeedback({
        type: "success",
        message:
          response?.message || "Prescription template deleted successfully.",
      });
    } catch (error) {
      setSavedTemplateFeedback({
        type: "danger",
        message: getTemplateActionErrorMessage(
          error,
          "Failed to delete saved template.",
        ),
      });
    }
  };

  useEffect(() => {
    if (isMobileView || hasAutoSessionStartedRef.current) return;

    hasAutoSessionStartedRef.current = true;

    void createSession();
  }, [createSession, isMobileView]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (isMobileView || phase !== "session_ready" || !otp) return;

    async function pollStatus(currentOtp: string) {
      if (phaseRef.current !== "session_ready") return;

      try {
        const statusResp = await getScanStatus(currentOtp).unwrap();

        if (!statusResp || typeof statusResp.status === "undefined") return;

        if (phaseRef.current !== "session_ready") return;

        if (statusResp.status === "invalid") {
          clearTimers();
          setErrorMessage(
            "Bridge session expired or is invalid. Create a new session.",
          );
          setPhase("error");
          return;
        }

        if (statusResp.status === "uploaded") {
          const uploadedPayload: ScanInputPayload = {
            imageBase64: statusResp.imageBase64,
            imageUrl: statusResp.imageUrl,
          };

          if (scanFiredRef.current) return;

          setPayload(uploadedPayload);
          void runScan(uploadedPayload);
        }
      } catch (error) {
        if (phaseRef.current !== "session_ready") return;

        setErrorMessage(getErrorMessage(error, "Poll error. Will retry..."));
      }
    }

    clearTimers();

    void pollStatus(otp);

    pollTimerRef.current = window.setInterval(() => {
      void pollStatus(otp);
    }, POLL_INTERVAL_MS);

    return () => clearTimers();
  }, [phase, otp, isMobileView, getScanStatus, runScan]);

  useEffect(() => {
    if (isMobileView || phase !== "session_ready" || countdown <= 0) return;

    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          clearTimers();
          setErrorMessage("Session expired. Please create a new session.");
          setPhase("error");
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current !== null) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [phase, countdown, isMobileView]);

  useEffect(() => {
    return () => {
      clearTimers();

      if (noTemplateTooltipTimerRef.current !== null) {
        window.clearTimeout(noTemplateTooltipTimerRef.current);
        noTemplateTooltipTimerRef.current = null;
      }
    };
  }, []);

  if (isMobileView) return <SwitchToPhonePage />;

  return (
    // <DefaultLayout>
    <section className="mx-auto flex w-full max-w-full flex-col gap-6 pb-10">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Prescription Scanner</h1>

          <Tooltip
            content={
              <div className="px-2 py-1 text-xs font-medium">
                No template saved
              </div>
            }
            placement="top"
            color="warning"
            isOpen={showNoTemplateTooltip}
            closeDelay={0}
            showArrow
            classNames={{
              base: "animate-in fade-in zoom-in-95 duration-200",
            }}
          >
            <div className="inline-block">
              <Button
                size="sm"
                variant="flat"
                color="secondary"
                isLoading={isFetchingSavedTemplate || isLoadingDoctorProfile}
                isDisabled={isDeletingSavedTemplate || (isLoadingDoctorProfile && !doctorId)}
                onPress={() => void handleViewSavedTemplate()}
                className="transition-all duration-200"
              >
                View Template
              </Button>
            </div>
          </Tooltip>
        </div>

        <ScannerStepIndicator phase={phase} />

        {savedTemplateFeedback && (
          <Code
            className="block w-full rounded-large p-3"
            color={savedTemplateFeedback.type}
          >
            {savedTemplateFeedback.message}
          </Code>
        )}
      </div>

      <Modal
        isOpen={showSavedTemplatePreview}
        onOpenChange={(open) => {
          if (!open && !isDeletingSavedTemplate) {
            setShowSavedTemplatePreview(false);
          }
        }}
        size="5xl"
        scrollBehavior="inside"
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="flex items-center justify-between gap-3">
            <span className="text-xl font-semibold">
              👁 Saved Prescription Template
            </span>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                color="danger"
                variant="flat"
                isLoading={isDeletingSavedTemplate}
                isDisabled={!savedTemplateHtml || isDeletingSavedTemplate}
                onPress={() => void handleDeleteSavedTemplate()}
              >
                Delete
              </Button>

              <Button
                size="sm"
                color="default"
                variant="flat"
                isDisabled={isDeletingSavedTemplate}
                onPress={() => setShowSavedTemplatePreview(false)}
              >
                Close
              </Button>
            </div>
          </ModalHeader>

          <ModalBody className="pb-4">
            {savedTemplateHtml ? (
              <iframe
                className="h-[75vh] w-full rounded-large border border-default-200 bg-white"
                sandbox=""
                srcDoc={savedTemplateHtml}
                title="Saved prescription template preview"
              />
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>

      {phase === "idle" && <ScannerIdleCard />}

      {phase === "error" && (
        <ScannerErrorCard
          errorMessage={errorMessage}
          onStartOver={resetToCapture}
        />
      )}

      {phase === "session_ready" && (
        <>
          {errorMessage && (
            <Code className="block w-full rounded-large p-3" color="warning">
              {errorMessage}
            </Code>
          )}

          {cvError && (
            <Code className="block w-full rounded-large p-3" color="danger">
              Document detection engine failed to load: {cvError}
            </Code>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <ScannerSessionBridgeCard
              countdown={countdown}
              otp={otp}
              phoneLink={phoneLink}
              qrCodeUrl={qrCodeUrl}
              onNewSession={resetToCapture}
            />

            <ScannerDirectUploadCard
              directImageBase64={directImageBase64}
              directImageUrl={directImageUrl}
              onScannerCapture={setDirectImageBase64}
              onImageUrlChange={setDirectImageUrl}
              onProcessNow={confirmDirectPayload}
              onSelectDirectFile={onSelectDirectFile}
              cvLoading={!cvReady && !cvError}
              cropSession={
                uploadCropSession && scannerRef.current
                  ? {
                      frameSrc: uploadCropSession.frameSrc,
                      frameW: uploadCropSession.canvas.width,
                      frameH: uploadCropSession.canvas.height,
                      sourceCanvas: uploadCropSession.canvas,
                      initialBoundary: uploadCropSession.corners,
                      scanner: scannerRef.current,
                    }
                  : null
              }
              onCropConfirm={(base64) => {
                setDirectImageBase64(base64);
                setUploadCropSession(null);
              }}
              onCropCancel={() => setUploadCropSession(null)}
            />
          </div>
        </>
      )}

      {(phase === "uploaded" || phase === "scanning") && (
        <Card shadow="sm">
          <CardHeader>
            <h2 className="text-xl font-semibold">
              {phase === "scanning"
                ? "Processing Prescription…"
                : "Payload Ready"}
            </h2>
          </CardHeader>

          <CardBody className="space-y-4">
            {payload && <ScannerPayloadPreview payload={payload} />}

            {phase === "scanning" && (
              <Progress
                isIndeterminate
                aria-label="Scanning"
                color="primary"
                label="Running through /scan endpoint…"
                size="sm"
              />
            )}

            {phase === "uploaded" && errorMessage && (
              <div className="space-y-2">
                <Code color="danger">{errorMessage}</Code>

                <div className="flex gap-2">
                  <Button
                    color="primary"
                    onPress={() => {
                      if (payload) void runScan(payload);
                    }}
                  >
                    Retry Scan
                  </Button>

                  <Button
                    color="default"
                    variant="flat"
                    onPress={resetToCapture}
                  >
                    Start Over
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {phase === "result" && (
        <Card shadow="sm">
          <CardHeader className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">✅ Scan Result</h2>

              {(dummyData || dummyError) && (
                <Button
                  size="sm"
                  variant="flat"
                  color="secondary"
                  onPress={() => setShowDebugJson((prev) => !prev)}
                >
                  {showDebugJson ? "Hide Debug JSON" : "Show Debug JSON"}
                </Button>
              )}
            </div>

            <Button color="primary" size="sm" onPress={resetToCapture}>
              Scan Another
            </Button>
          </CardHeader>

          <CardBody className="space-y-4">
            {payload && (
              <>
                <p className="text-sm font-medium text-default-600">
                  Input used:
                </p>
                <ScannerPayloadPreview payload={payload} />
                <Divider />
              </>
            )}

            {showDebugJson && dummyData && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-default-700">
                  Debug JSON Data
                </p>

                <pre className="overflow-x-auto whitespace-pre-wrap rounded-large bg-default-100 p-4 text-sm">
                  {JSON.stringify(dummyData, null, 2)}
                </pre>
              </div>
            )}

            {showDebugJson && dummyError && (
              <Code className="block w-full rounded-large p-3" color="warning">
                Could not load dummy structured data: {dummyError}
              </Code>
            )}

            {scanResult?.template && (
              <ScannerHtmlPreview
                data={dummyData ?? undefined}
                templateHtml={scanResult.template}
                onTemplateChange={(nextTemplate) => {
                  setScanResult((prev) => {
                    if (!prev) return prev;

                    return {
                      ...prev,
                      template: nextTemplate,
                    };
                  });
                }}
                onSaveSuccess={resetToCapture}
              />
            )}
          </CardBody>
        </Card>
      )}
    </section>
    // </DefaultLayout>
  );
};

export default PrescriptionNotepadScannerPage;
