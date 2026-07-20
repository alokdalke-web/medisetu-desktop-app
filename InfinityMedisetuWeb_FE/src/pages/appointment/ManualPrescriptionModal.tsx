
import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  Spinner,
} from "@heroui/react";
import {
  FiUpload,
  FiX,
  FiCamera,
  FiRotateCw,
  FiFileText,
  FiExternalLink,
  FiCheckCircle,
  FiClock,
  FiSmartphone,
} from "react-icons/fi";
import Webcam from "react-webcam";

import { ScannerSessionBridgeCard } from "../../components/prescription-scanner";
import {
  useCreateScanSessionMutation,
  useLazyGetScanStatusQuery,
} from "../../redux/api/prescriptionScannerApi";
import { useSendManualPrescriptionNotificationMutation } from "../../redux/api/appointmentApi";
import type { ManualPrescriptionModalVariant } from "./hooks/useManualPrescription";

const POLL_INTERVAL_MS = 2500;

type ScannerBridgeStatus = "idle" | "session_ready" | "uploaded" | "error";
type Mode = "upload" | "camera";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pickedFiles: File[];
  setPickedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  appointmentId?: string;
  onSave: () => void;
  saveDisabled?: boolean;
  isSaving?: boolean;
  variant?: ManualPrescriptionModalVariant;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k)),
  );
  return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;

  if (error && typeof error === "object") {
    const err = error as {
      message?: unknown;
      error?: unknown;
      data?: unknown;
      status?: unknown;
    };

    if (typeof err.message === "string" && err.message.trim())
      return err.message;
    if (typeof err.error === "string" && err.error.trim()) return err.error;
    if (typeof err.data === "string" && err.data.trim()) return err.data;

    if (err.data && typeof err.data === "object") {
      const data = err.data as Record<string, unknown>;
      if (typeof data.message === "string" && data.message.trim())
        return data.message;
      if (typeof data.error === "string" && data.error.trim())
        return data.error;
    }

    if (err.status !== undefined)
      return `Request failed with status ${String(err.status)}`;
  }

  return fallback;
}

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const type = blob.type || "image/jpeg";
  return new File([blob], fileName, { type });
}

async function imageUrlToFile(
  imageUrl: string,
  fileName: string,
): Promise<File> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const type = blob.type || "image/jpeg";
  return new File([blob], fileName, { type });
}

const ManualPrescriptionModal: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  pickedFiles,
  setPickedFiles,
  appointmentId,
  onSave,
  saveDisabled,
  isSaving,
  variant = "upload",
}) => {
  const [mode, setMode] = useState<Mode>("upload");
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );

  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [scannerError, setScannerError] = useState("");
  const [scannerStatus, setScannerStatus] =
    useState<ScannerBridgeStatus>("idle");

  const pollTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const scannerStatusRef = useRef<ScannerBridgeStatus>("idle");
  const isCreatingSessionRef = useRef(false);
  const notifiedOtpRef = useRef("");

  const webcamRef = useRef<Webcam>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [createScanSession] = useCreateScanSessionMutation();
  const [getScanStatus] = useLazyGetScanStatusQuery();
  const [sendNotification] = useSendManualPrescriptionNotificationMutation();
  const isPhoneLinkMode = variant === "phone-link";

  const phoneLink = useMemo(() => {
    if (!otp || typeof window === "undefined") return "";
    return `${window.location.origin}/app/switch-to-phone?otp=${encodeURIComponent(otp)}`;
  }, [otp]);

  const qrCodeUrl = useMemo(() => {
    if (!phoneLink) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(phoneLink)}`;
  }, [phoneLink]);

  const clearScannerTimers = () => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const notifyManualPrescriptionSession = async (sessionOtp: string) => {
    if (!appointmentId || !sessionOtp || notifiedOtpRef.current === sessionOtp) {
      return;
    }

    notifiedOtpRef.current = sessionOtp;

    try {
      await sendNotification({ appointmentId, otp: sessionOtp }).unwrap();
      addToast({
        title: "Notification sent",
        description: "Manual prescription link sent to the device.",
        color: "success",
        variant: "flat",
      });
    } catch (error) {
      addToast({
        title: "Notification failed",
        description: getErrorMessage(error, "Failed to send notification."),
        color: "danger",
        variant: "flat",
      });
    }
  };

  const createScannerSession = async () => {
    if (isCreatingSessionRef.current) return;

    isCreatingSessionRef.current = true;
    setScannerError("");
    setScannerStatus("idle");

    try {
      const session = await createScanSession().unwrap();
      setOtp(session.otp);
      setCountdown(session.expiresIn);
      setScannerStatus("session_ready");
      void notifyManualPrescriptionSession(session.otp);
    } catch (error) {
      setScannerError(getErrorMessage(error, "Failed to create scan session."));
      setScannerStatus("error");
    } finally {
      isCreatingSessionRef.current = false;
    }
  };

  const resetScanner = () => {
    clearScannerTimers();
    notifiedOtpRef.current = "";
    setOtp("");
    setCountdown(0);
    setScannerError("");
    setScannerStatus("idle");
    void createScannerSession();
  };

  const consumeScannedImage = async (imageSrc: string) => {
    try {
      const file = imageSrc.startsWith("data:")
        ? await dataUrlToFile(imageSrc, `manual_prescription_${Date.now()}.jpg`)
        : await imageUrlToFile(
            imageSrc,
            `manual_prescription_${Date.now()}.jpg`,
          );

      setPickedFiles([file]);
      setMode("upload");
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to load scanned image."));
    }
  };

  const pollScannerStatus = async (currentOtp: string) => {
    if (scannerStatusRef.current !== "session_ready") return;

    try {
      const statusResp = await getScanStatus(currentOtp).unwrap();

      if (!statusResp || typeof statusResp.status === "undefined") return;
      if (scannerStatusRef.current !== "session_ready") return;

      if (statusResp.status === "invalid") {
        clearScannerTimers();
        setScannerError(
          "Bridge session expired or is invalid. Create a new session.",
        );
        setScannerStatus("error");
        return;
      }

      if (statusResp.status === "uploaded") {
        clearScannerTimers();

        const imageSrc = statusResp.imageBase64
          ? `data:image/jpeg;base64,${statusResp.imageBase64}`
          : statusResp.imageUrl || "";

        if (!imageSrc) {
          setScannerError("Uploaded image not found.");
          setScannerStatus("error");
          return;
        }

        try {
          await consumeScannedImage(imageSrc);
          setScannerStatus("uploaded");
          setScannerError("");
        } catch (error) {
          setScannerError(
            getErrorMessage(error, "Failed to load scanned image."),
          );
          setScannerStatus("error");
        }
      }
    } catch (error) {
      if (scannerStatusRef.current !== "session_ready") return;
      setScannerError(getErrorMessage(error, "Poll error. Will retry..."));
    }
  };

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;

    try {
      const file = await dataUrlToFile(
        imageSrc,
        `manual_prescription_${Date.now()}.jpg`,
      );
      setPickedFiles([file]);
      setMode("upload");
    } catch (error) {
      setScannerError(getErrorMessage(error, "Failed to capture image."));
    }
  }, [setPickedFiles]);

  const handleFiles = async (files: File[]) => {
    const firstFile = files[0];
    if (!firstFile) return;

    setPickedFiles([firstFile]);
    setMode("upload");
  };

  const onPicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) {
      await handleFiles(files);
    }
    e.target.value = "";
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) {
      await handleFiles(files);
    }
  };

  useEffect(() => {
    scannerStatusRef.current = scannerStatus;
  }, [scannerStatus]);

  useEffect(() => {
    if (isOpen && isPhoneLinkMode) {
      setMode("upload");
    }
  }, [isOpen, isPhoneLinkMode]);

  useEffect(() => {
    if (!isOpen) {
      clearScannerTimers();
      return;
    }

    if (mode !== "upload" || pickedFiles.length > 0) {
      clearScannerTimers();
      setOtp("");
      setCountdown(0);
      setScannerError("");
      setScannerStatus("idle");
      return;
    }

    if (!otp) {
      void createScannerSession();
    }
  }, [isOpen, mode, pickedFiles.length, otp]);

  useEffect(() => {
    if (
      !isOpen ||
      mode !== "upload" ||
      scannerStatus !== "session_ready" ||
      !otp ||
      pickedFiles.length > 0
    ) {
      clearScannerTimers();
      return;
    }

    void pollScannerStatus(otp);

    pollTimerRef.current = window.setInterval(() => {
      void pollScannerStatus(otp);
    }, POLL_INTERVAL_MS);

    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          clearScannerTimers();
          setScannerError("Session expired. Please create a new session.");
          setScannerStatus("error");
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearScannerTimers();
  }, [isOpen, mode, scannerStatus, otp, pickedFiles.length]);

  useEffect(() => {
    return () => clearScannerTimers();
  }, []);

  const handleClose = () => {
    clearScannerTimers();
    isCreatingSessionRef.current = false;
    notifiedOtpRef.current = "";
    setOtp("");
    setCountdown(0);
    setScannerError("");
    setScannerStatus("idle");
    setMode("upload");
    onOpenChange(false);
  };

  const modalBase = "rounded-[24px] my-4 max-h-[96vh] overflow-visible";
  const closeBtn =
    "absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors z-10";
  const pillCancel =
    "h-10 px-8 rounded-full border border-slate-200 text-slate-700 bg-white font-medium hover:bg-slate-50 transition-colors";
  const pillPrimary =
    "h-10 rounded-full bg-[#0a6c74] text-white font-medium hover:bg-[#085a61] transition-colors shadow-sm";

  const modalSize = mode === "camera" ? "2xl" : "lg";
  const uploadedFile = pickedFiles[0];
  const isSaveDisabled = saveDisabled ?? !pickedFiles.length;
  const phoneLinkHasError = scannerStatus === "error" && !uploadedFile;
  const phoneLinkTitle = uploadedFile
    ? "Prescription received"
    : phoneLinkHasError
      ? "Session needs attention"
      : otp
        ? "Waiting for response"
        : "Sending link";
  const phoneLinkDescription = uploadedFile
    ? "The prescription has been received from the device. Save it to attach it to this appointment."
    : phoneLinkHasError
      ? "The device upload session has expired or failed. Start a new session to send another link."
      : "The link has been sent to the device. This modal will pick up the prescription automatically after it is uploaded.";

  const prescriptionFilePreview = uploadedFile ? (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-50">
          <FiFileText className="text-lg text-rose-500" />
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-800">
            {uploadedFile.name}
          </div>
          <div className="text-xs text-slate-500">
            {formatBytes(uploadedFile.size)}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => window.open(URL.createObjectURL(uploadedFile), "_blank")}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          aria-label="Preview file"
        >
          <FiExternalLink className="text-base" />
        </button>
        <button
          type="button"
          onClick={() => setPickedFiles([])}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-100 hover:text-rose-600"
          aria-label="Remove file"
        >
          <FiX className="text-base" />
        </button>
      </div>
    </div>
  ) : null;

  const actionFooter = (
    <div className="sticky bottom-0 -mx-4 mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
      <Button
        radius="full"
        variant="bordered"
        className={`${pillCancel} w-full`}
        onPress={handleClose}
        isDisabled={!!isSaving}
      >
        Cancel
      </Button>

      <Button
        radius="full"
        className={`${pillPrimary} w-full`}
        onPress={onSave}
        isDisabled={isSaveDisabled}
        isLoading={!!isSaving}
      >
        Save Prescription
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleClose}
      size={modalSize}
      placement="center"
      hideCloseButton
      scrollBehavior="inside"
      classNames={{
        wrapper: "z-[9999] items-center px-3 py-3",
        backdrop: "z-[9998] bg-black/55",
        base: [
          modalBase,
          "my-0 w-full max-w-[520px] overflow-hidden rounded-[24px]",
          "max-h-[92dvh] sm:max-h-[90vh]",
        ].join(" "),
        body: "max-h-[92dvh] overflow-y-auto p-0 sm:max-h-[90vh]",
      }}
    >
      <ModalContent>
        {() => (
          <ModalBody>
            <div className="relative px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
              <button
                type="button"
                className={closeBtn}
                onClick={handleClose}
                aria-label="Close"
              >
                <FiX className="text-xl" />
              </button>

              {isPhoneLinkMode && mode === "upload" && (
                <>
                  <div className="mt-4">
                    <h3 className="mb-2 text-[15px] font-semibold text-slate-900">
                      Manual Prescription
                    </h3>

                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-5 text-center shadow-sm sm:px-5">
                      <div
                        className={[
                          "mx-auto grid h-12 w-12 place-items-center rounded-full",
                          uploadedFile
                            ? "bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50"
                            : phoneLinkHasError
                              ? "bg-rose-50 text-rose-500 ring-4 ring-rose-50"
                              : "bg-[#e6fbf7] text-[#0a6c74] ring-4 ring-[#e6fbf7]",
                        ].join(" ")}
                      >
                        {uploadedFile ? (
                          <FiCheckCircle className="text-xl" />
                        ) : phoneLinkHasError ? (
                          <FiClock className="text-xl" />
                        ) : otp ? (
                          <FiSmartphone className="text-xl" />
                        ) : (
                          <Spinner size="sm" />
                        )}
                      </div>

                      <h3 className="mt-3 text-base font-semibold text-slate-900">
                        {phoneLinkTitle}
                      </h3>
                      <p className="mx-auto mt-1.5 max-w-[320px] text-[12px] leading-5 text-slate-500">
                        {phoneLinkDescription}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        <span
                          className={[
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold",
                            uploadedFile
                              ? "bg-emerald-100 text-emerald-700"
                              : phoneLinkHasError
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-50 text-amber-700 border border-amber-200",
                          ].join(" ")}
                        >
                          {uploadedFile ? (
                            <FiCheckCircle className="text-[10px]" />
                          ) : null}
                          {uploadedFile
                            ? "Received"
                            : phoneLinkHasError
                              ? "Action needed"
                              : "Waiting..."}
                        </span>
                        {otp && (
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold tracking-wide text-slate-700">
                            OTP: {otp}
                          </span>
                        )}
                      </div>

                      {!uploadedFile && countdown > 0 && !phoneLinkHasError && (
                        <p className="mt-3 text-[11px] font-medium text-slate-400">
                          Expires in{" "}
                          <span className="font-bold text-slate-600">{countdown}s</span>
                        </p>
                      )}

                      {scannerError && (
                        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-600">
                          {scannerError}
                        </p>
                      )}

                      {phoneLinkHasError && (
                        <Button
                          radius="full"
                          size="sm"
                          variant="flat"
                          className="mt-3 bg-slate-100 px-5 font-semibold text-slate-700 hover:bg-slate-200 transition"
                          onPress={resetScanner}
                          startContent={<FiRotateCw className="text-xs" />}
                        >
                          New Session
                        </Button>
                      )}

                      {prescriptionFilePreview}
                    </div>
                  </div>

                  {actionFooter}
                </>
              )}

              {!isPhoneLinkMode && mode === "upload" && (
                <>
                  <div className="mt-4">
                    <h3 className="mb-2 text-[15px] font-semibold text-slate-900">
                      Manual Prescription
                    </h3>

                    <div
                      className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-4 text-center transition-colors hover:border-[#0a6c74]/30 hover:bg-[#e6fbf7]/30 sm:px-5"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                    >
                      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#e6fbf7] text-[#0a6c74]">
                        <FiUpload className="text-lg" />
                      </div>

                      <div className="mt-2 text-[13px] font-medium text-slate-700">
                        Drag your prescription file here, or{" "}
                        <button
                          type="button"
                          onClick={() => inputRef.current?.click()}
                          className="font-semibold text-[#0a6c74] underline underline-offset-4 hover:text-[#085a61]"
                        >
                          browse
                        </button>
                      </div>

                      <div className="mt-1 text-[11px] text-slate-400">
                        Supports JPG, PNG, JPEG, PDF • Max 10 MB
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 border-t border-slate-200" />
                        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">or</span>
                        <div className="flex-1 border-t border-slate-200" />
                      </div>

                      <button
                        type="button"
                        onClick={() => setMode("camera")}
                        className="mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-[#0a6c74]/20 bg-white px-4 py-2 text-[#0a6c74] shadow-sm transition hover:bg-[#e6fbf7] hover:border-[#0a6c74]/40"
                      >
                        <FiCamera className="shrink-0 text-base" />
                        <span className="text-[12px] font-semibold">
                          Take Photo with Camera
                        </span>
                      </button>

                      {!pickedFiles.length && (
                        <div className="mx-auto mt-3 w-full max-w-[260px] sm:max-w-[300px] [&_canvas]:max-w-full [&_img]:mx-auto [&_img]:h-auto [&_img]:max-w-full">
                          <ScannerSessionBridgeCard
                            countdown={countdown}
                            otp={otp}
                            phoneLink={phoneLink}
                            qrCodeUrl={qrCodeUrl}
                            onNewSession={resetScanner}
                          />

                          {scannerError && (
                            <p className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-600">
                              {scannerError}
                            </p>
                          )}
                        </div>
                      )}

                      <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,image/*"
                        multiple
                        className="hidden"
                        onChange={onPicked}
                      />

                      {prescriptionFilePreview}
                    </div>
                  </div>

                  {actionFooter}
                </>
              )}

              {!isPhoneLinkMode && mode === "camera" && (
                <>
                  <div className="mt-4 mb-4 text-center">
                    <h3 className="text-[18px] font-semibold text-slate-900">
                      Take a Photo
                    </h3>
                    <p className="mt-1 text-[13px] text-slate-500">
                      Position the prescription within the frame
                    </p>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl bg-black shadow-lg">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        width: 1280,
                        height: 720,
                        facingMode,
                      }}
                      className="w-full"
                      mirrored={facingMode === "user"}
                    />
                    <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-white/40" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>

                  <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:mt-6 sm:flex sm:justify-center sm:gap-4">
                    <Button
                      radius="full"
                      variant="bordered"
                      className={`${pillCancel} w-full sm:w-auto`}
                      onPress={() => setMode("upload")}
                    >
                      Back
                    </Button>

                    <Button
                      isIconOnly
                      radius="full"
                      className="h-10 w-10 bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                      onPress={() =>
                        setFacingMode((p) =>
                          p === "user" ? "environment" : "user",
                        )
                      }
                    >
                      <FiRotateCw />
                    </Button>

                    <Button
                      radius="full"
                      className={`${pillPrimary} w-full sm:w-auto`}
                      onPress={capture}
                      startContent={<FiCamera />}
                    >
                      Capture
                    </Button>
                  </div>
                </>
              )}
            </div>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ManualPrescriptionModal;
