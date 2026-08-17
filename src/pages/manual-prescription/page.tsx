

import type { ChangeEvent } from "react";
import Tooltip from "../../components/shared/Tooltip";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Code } from "@heroui/code";
import { Progress } from "@heroui/progress";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
} from "@heroui/modal";
import type { CornerPoints } from "jscanify/client";

import {
  ScannerDirectUploadCard,
  ScannerErrorCard,
  ScannerIdleCard,
  ScannerSessionBridgeCard,
} from "../../components/prescription-scanner";
import {
  useCreateScanSessionMutation,
  useLazyGetScanStatusQuery,
} from "../../redux/api/prescriptionScannerApi";
import {
  useGetManualTemplateQuery,
  useLazyGetManualTemplateQuery,
  useDeleteManualTemplateMutation,
  useUpdatePrescriptionPrintTypeMutation,
} from "../../redux/api/manualPrescriptionApi";
import type { ScanInputPayload } from "../../types/prescription-scanner";
import { fileToCanvas } from "../prescription_notepad_scanner/compressCanvas";
import { defCorners, getCv, normalizeCorners } from "../prescription_notepad_scanner/scannerUtils";
import SwitchToPhonePage from "../prescription_notepad_scanner/switchToPhone";
import { useOpenCV } from "../prescription_notepad_scanner/useOpenCV";

import ImageFilter from "./imageFilter";
import { Button, Spinner } from "@heroui/react";

const POLL_INTERVAL_MS = 2500;

type CapturePhase =
  | "idle"
  | "session_ready"
  | "processing"
  | "image_filter"
  | "error";

interface UploadCropSession {
  canvas: HTMLCanvasElement;
  frameSrc: string;
  corners: CornerPoints;
}

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

function base64ToFile(base64: string): File {
  const mimeMatch = base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const mimeType = mimeMatch?.[1] || "image/jpeg";
  const normalizedBase64 = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");

  const binary = atob(normalizedBase64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const ext = mimeType.includes("png") ? "png" : "jpg";

  return new File([bytes], `manual-scan-${Date.now()}.${ext}`, {
    type: mimeType,
  });
}

const ManualPrescription = () => {
  const [isMobileView] = useState(() => isMobileDevice());
  const [phase, setPhase] = useState<CapturePhase>("idle");

  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const [directImageBase64, setDirectImageBase64] = useState("");
  const [directImageUrl, setDirectImageUrl] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(
    null,
  );

  const { cvReady, scannerRef } = useOpenCV();
  const [uploadCropSession, setUploadCropSession] =
    useState<UploadCropSession | null>(null);

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
  const phaseRef = useRef<CapturePhase>("idle");
  const hasAutoSessionStartedRef = useRef(false);
  const noTemplateTooltipTimerRef = useRef<number | null>(null);

  const [createScanSession] = useCreateScanSessionMutation();
  const [getScanStatus] = useLazyGetScanStatusQuery();
  const { data: manualTemplateData, isLoading: isFetchingSavedTemplate } =
    useGetManualTemplateQuery(undefined);
  const [getManualTemplate, { isFetching: isFetchingManualTemplate }] =
    useLazyGetManualTemplateQuery();
  const [deleteManualTemplate, { isLoading: isDeletingSavedTemplate }] =
    useDeleteManualTemplateMutation();
  const [updatePrintType, { isLoading: isUpdatingPrintType }] =
    useUpdatePrescriptionPrintTypeMutation();


  const includeImageInHtml = useMemo(() => {
    const container = manualTemplateData?.data ?? manualTemplateData?.result;
    const template = Array.isArray(container) ? container[0] : container;

    return template?.printType === "With Background";
  }, [manualTemplateData]);

  const phoneLink = useMemo(() => {
    if (!otp) return "";

    return `${window.location.origin}/app/switch-to-phone?otp=${encodeURIComponent(otp)}`;
  }, [otp]);

  const qrCodeUrl = useMemo(() => {
    if (!phoneLink) return "";

    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(phoneLink)}`;
  }, [phoneLink]);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

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
    setSelectedImageFile(null);
    setDirectImageBase64("");
    setDirectImageUrl("");

    try {
      const session = await createScanSession().unwrap();

      setOtp(session.otp);
      setCountdown(session.expiresIn);
      setPhase("session_ready");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to create scan session."));
      setPhase("error");
    }
  }, [createScanSession]);

  const payloadToFile = useCallback(
    async (payload: ScanInputPayload): Promise<File> => {
      if (payload.imageBase64) {
        return base64ToFile(payload.imageBase64);
      }

      if (payload.imageUrl) {
        const response = await fetch(payload.imageUrl);

        if (!response.ok) {
          throw new Error("Failed to fetch image from URL.");
        }

        const blob = await response.blob();
        const ext = blob.type.includes("png") ? "png" : "jpg";

        return new File([blob], `manual-scan-${Date.now()}.${ext}`, {
          type: blob.type || "image/jpeg",
        });
      }

      throw new Error("No image payload found.");
    },
    [],
  );

  const proceedToImageFilter = useCallback(
    async (payload: ScanInputPayload) => {
      if (!isPayloadNonEmpty(payload)) {
        setErrorMessage("Provide at least one input: image file or image URL.");
        return;
      }

      setErrorMessage("");
      setPhase("processing");

      try {
        const file = await payloadToFile(payload);

        setSelectedImageFile(file);
        setPhase("image_filter");
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Failed to prepare image."));
        setPhase("session_ready");
      }
    },
    [payloadToFile],
  );

  const handleViewSavedTemplate = async () => {
    setSavedTemplateFeedback(null);
    setSavedTemplateHtml("");
    setShowSavedTemplatePreview(false);
    setShowNoTemplateTooltip(false);

    try {
      const container = manualTemplateData?.data ?? manualTemplateData?.result;
      const template = Array.isArray(container) ? container[0] : container;
      const templateHtml = template?.templateHtml;

      if (!templateHtml?.trim()) {
        showNoTemplateMessage();
        return;
      }

      setSavedTemplateHtml(templateHtml);
      setShowSavedTemplatePreview(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch saved template.";

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

    try {
      const response = await deleteManualTemplate(undefined).unwrap();

      setSavedTemplateHtml("");
      setShowSavedTemplatePreview(false);

      setSavedTemplateFeedback({
        type: "success",
        message:
          response?.message || "Manual template deleted successfully.",
      });

      // Refetch template to update the query cache
      setTimeout(() => {
        // Force refetch by triggering a new query
        window.location.reload();
      }, 1500);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete saved template.";

      setSavedTemplateFeedback({
        type: "danger",
        message,
      });
    }
  };

  const handleUpdatePrintType = async (checked: boolean) => {
    try {
      const container = manualTemplateData?.data ?? manualTemplateData?.result;
      const template = Array.isArray(container) ? container[0] : container;
      const printType = checked ? "With Background" : "Without Background";

      // IMPORTANT: Always use `rawHtml` (the actual stored template) for the update.
      // The backend GET endpoint returns two fields:
      //   - templateHtml: preview-rendered HTML with all Handlebars tokens stripped (for display)
      //   - rawHtml:      the real template stored in the DB (with valid {{#if}}...{{/if}} blocks)
      // Using templateHtml/savedTemplateHtml here would write the mangled preview back
      // to the DB, causing Handlebars parse errors in PDF generation.
      await updatePrintType({
        printType,
        templateHtml: template?.rawHtml,
        templateImage:
          template?.templateImage ||
          template?.templateImageUrl ||
          template?.imageUrl,
      }).unwrap();

      // Refetch to update local state — use templateHtml (preview) only for display
      const response = await getManualTemplate(undefined).unwrap();
      const updatedContainer = response?.data ?? response?.result;
      const updatedTemplate = Array.isArray(updatedContainer)
        ? updatedContainer[0]
        : updatedContainer;
      // Use templateHtml for the preview iframe display only
      const updatedDisplayHtml = updatedTemplate?.templateHtml;

      if (updatedDisplayHtml) {
        setSavedTemplateHtml(updatedDisplayHtml);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update print type.";

      setSavedTemplateFeedback({
        type: "danger",
        message,
      });
    }
  };

  const resetToCapture = useCallback(() => {
    clearTimers();
    setErrorMessage("");
    setSelectedImageFile(null);
    setDirectImageBase64("");
    setDirectImageUrl("");
    setUploadCropSession(null);
    setSavedTemplateFeedback(null);
    setShowSavedTemplatePreview(false);
    setSavedTemplateHtml("");
    setShowNoTemplateTooltip(false);

    if (noTemplateTooltipTimerRef.current !== null) {
      window.clearTimeout(noTemplateTooltipTimerRef.current);
      noTemplateTooltipTimerRef.current = null;
    }

    void createSession();
  }, [clearTimers, createSession]);

  const onSelectDirectFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) return;

      event.target.value = "";
      setErrorMessage("");

      try {
        const canvas = await fileToCanvas(file);
        const frameSrc = canvas.toDataURL("image/jpeg", 0.97);

        let corners = defCorners(canvas.width, canvas.height);

        if (scannerRef.current) {
          try {
            const cv = getCv();

            if (cv?.imread) {
              const mat = cv.imread(canvas);
              const contour = scannerRef.current.findPaperContour(mat);

              if (contour) {
                const detected = scannerRef.current.getCornerPoints(
                  contour,
                  mat,
                );

                corners = normalizeCorners(
                  detected,
                  canvas.width,
                  canvas.height,
                );
                (contour as { delete?: () => void }).delete?.();
              }

              mat.delete?.();
            }
          } catch {
            // Fall back to default corners.
          }
        }

        setUploadCropSession({ canvas, frameSrc, corners });
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Failed to process image file."));
      }
    },
    [scannerRef],
  );

  const confirmDirectPayload = useCallback(() => {
    const payload: ScanInputPayload = {
      imageBase64: directImageBase64 || undefined,
      imageUrl: directImageUrl || undefined,
    };

    void proceedToImageFilter(payload);
  }, [directImageBase64, directImageUrl, proceedToImageFilter]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (isMobileView || hasAutoSessionStartedRef.current) return;

    hasAutoSessionStartedRef.current = true;
    void createSession();
  }, [createSession, isMobileView]);

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
            "Bridge session expired or invalid. Create a new session.",
          );
          setPhase("error");
          return;
        }

        if (statusResp.status === "uploaded") {
          const uploadedPayload: ScanInputPayload = {
            imageBase64: statusResp.imageBase64,
            imageUrl: statusResp.imageUrl,
          };

          if (!isPayloadNonEmpty(uploadedPayload)) return;
          clearTimers();
          void proceedToImageFilter(uploadedPayload);
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
  }, [
    clearTimers,
    getScanStatus,
    isMobileView,
    otp,
    phase,
    proceedToImageFilter,
  ]);

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
  }, [clearTimers, countdown, isMobileView, phase]);

  useEffect(() => {
    return () => {
      clearTimers();

      if (noTemplateTooltipTimerRef.current !== null) {
        window.clearTimeout(noTemplateTooltipTimerRef.current);
        noTemplateTooltipTimerRef.current = null;
      }
    };
  }, [clearTimers]);

  if (isMobileView) {
    return <SwitchToPhonePage />;
  }

  if (phase === "image_filter" && selectedImageFile) {
    return (
      <ImageFilter
        imageFile={selectedImageFile}
        onBack={() => {
          resetToCapture();
        }}
      />
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-full flex-col gap-6 pb-10">
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
        hideCloseButton
        isDismissable={false}
      >
        <ModalContent>
          <ModalHeader className="flex items-center justify-between gap-3">
            <span className="text-xl font-semibold">
              👁 Saved Manual Template
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
              <label
                className={`flex items-center gap-2 rounded-lg border border-default-200 bg-default-50 px-3 py-1.5 text-xs font-medium text-default-600 ${isUpdatingPrintType ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
                htmlFor="include-image-html"
              >
                <div className="flex h-3.5 w-3.5 items-center justify-center">
                  {isUpdatingPrintType ? (
                    <Spinner size="sm" color="current" />
                  ) : (
                    <input
                      checked={includeImageInHtml}
                      className="h-3.5 w-3.5 cursor-pointer rounded border-default-300 text-primary focus:ring-primary"
                      id="include-image-html"
                      type="checkbox"
                      disabled={isDeletingSavedTemplate}
                      onChange={(event) =>
                        void handleUpdatePrintType(event.target.checked)
                      }
                    />
                  )}
                </div>
                Include image
              </label>
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

          <ModalBody className="relative pb-4">
            {(isUpdatingPrintType || isFetchingManualTemplate) && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-3">
                  <Spinner size="lg" color="primary" />
                  <p className="animate-pulse text-sm font-medium text-default-600">
                    Updating template preview...
                  </p>
                </div>
              </div>
            )}
            {savedTemplateHtml ? (
              <iframe
                className="h-[75vh] w-full rounded-large border border-default-200 bg-white"
                sandbox=""
                srcDoc={savedTemplateHtml}
                title="Saved manual template preview"
              />
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>

      <div className="space-y-2">
        <div className="flex items-center gap-3 justify-between">
          <h1 className="text-2xl font-semibold">Manual Prescription</h1>
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
                isLoading={isFetchingSavedTemplate}
                isDisabled={isDeletingSavedTemplate}
                onPress={() => void handleViewSavedTemplate()}
                className="transition-all duration-200"
              >
                View Template
              </Button>
            </div>
          </Tooltip>
        </div>
        <p className="text-sm text-default-500">
          Step 1: Scan/Crop. Step 2: Image Filter. Step 3: Place Handlebars.
        </p>

        {savedTemplateFeedback && (
          <Code
            className="block w-full rounded-large p-3"
            color={savedTemplateFeedback.type}
          >
            {savedTemplateFeedback.message}
          </Code>
        )}

        {errorMessage && phase !== "error" && (
          <Code className="block w-full rounded-large p-3" color="warning">
            {errorMessage}
          </Code>
        )}
      </div>

      {phase === "idle" && <ScannerIdleCard />}

      {phase === "error" && (
        <ScannerErrorCard
          errorMessage={errorMessage || "Something went wrong."}
          onStartOver={resetToCapture}
        />
      )}

      {phase === "processing" && (
        <Card shadow="sm">
          <CardHeader>
            <h2 className="text-xl font-semibold">Preparing image...</h2>
          </CardHeader>
          <CardBody>
            <Progress
              isIndeterminate
              aria-label="Preparing image"
              color="primary"
              label="Loading cropped image into Image Filter..."
              size="sm"
            />
          </CardBody>
        </Card>
      )}

      {phase === "session_ready" && (
        <div className="grid gap-6 md:grid-cols-2">
          <ScannerSessionBridgeCard
            countdown={countdown}
            otp={otp}
            phoneLink={phoneLink}
            qrCodeUrl={qrCodeUrl}
            onNewSession={resetToCapture}
          />

          <ScannerDirectUploadCard
            cvLoading={!cvReady}
            directImageBase64={directImageBase64}
            directImageUrl={directImageUrl}
            onScannerCapture={setDirectImageBase64}
            onCropCancel={() => setUploadCropSession(null)}
            onCropConfirm={(base64) => {
              setDirectImageBase64(base64);
              setUploadCropSession(null);
            }}
            onImageUrlChange={setDirectImageUrl}
            onProcessNow={confirmDirectPayload}
            onSelectDirectFile={onSelectDirectFile}
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
          />
        </div>
      )}
    </section>
  );
};

export default ManualPrescription;