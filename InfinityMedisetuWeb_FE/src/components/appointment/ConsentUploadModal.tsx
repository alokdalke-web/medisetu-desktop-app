import {
    Button,
    Card,
    CardBody,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader
} from "@heroui/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiExternalLink, FiFileText, FiUpload, FiX } from "react-icons/fi";
import { ScannerSessionBridgeCard } from "../../components/prescription-scanner";
import {
    useCreateScanSessionMutation,
    useLazyGetScanStatusQuery,
} from "../../redux/api/prescriptionScannerApi";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pickedFiles: File[];
  setPickedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  consentUploadNote: string;
  setConsentUploadNote: React.Dispatch<React.SetStateAction<string>>;
  onSave: () => void | Promise<void>;
  saveDisabled?: boolean;
  isSaving?: boolean;
};

type ScannerBridgeStatus = "idle" | "session_ready" | "uploaded" | "error";

const POLL_INTERVAL_MS = 2500;

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

const dataUrlToFile = async (
  dataUrl: string,
  filename = `consent_${Date.now()}.jpg`,
): Promise<File> => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const mimeType = blob.type || "image/jpeg";

  return new File([blob], filename, {
    type: mimeType,
  });
};

const ConsentUploadModal: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  pickedFiles,
  setPickedFiles,
  onSave,
  saveDisabled = false,
  isSaving = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [scannerStatus, setScannerStatus] =
    useState<ScannerBridgeStatus>("idle");
  const [scannerError, setScannerError] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  const pollTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const scannerStatusRef = useRef<ScannerBridgeStatus>("idle");

  const [createScanSession] = useCreateScanSessionMutation();
  const [getScanStatus] = useLazyGetScanStatusQuery();

  const pickedFile = useMemo(() => pickedFiles?.[0] ?? null, [pickedFiles]);

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

  const createScannerSession = async () => {
    setScannerError("");
    setScannerStatus("idle");

    try {
      const session = await createScanSession().unwrap();
      setOtp(session.otp);
      setCountdown(session.expiresIn);
      setScannerStatus("session_ready");
    } catch (error) {
      setScannerError(
        getErrorMessage(error, "Failed to create scan session."),
      );
      setScannerStatus("error");
    }
  };

  const resetScanner = () => {
    clearScannerTimers();
    setOtp("");
    setCountdown(0);
    setScannerError("");
    setScannerStatus("idle");
    void createScannerSession();
  };

  const consumeScannedImage = async (imageSrc: string) => {
    const file = await dataUrlToFile(
      imageSrc,
      `consent_scan_${Date.now()}.jpg`,
    );
    setPickedFiles([file]);
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
          "Bridge session expired or is invalid. Please create a new session.",
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

  const handlePickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setPickedFiles([files[0]]);
    event.target.value = "";
  };

  const removePickedFile = () => {
    setPickedFiles([]);
    setScannerError("");
    setScannerStatus("idle");
    setOtp("");
    setCountdown(0);
  };

  useEffect(() => {
    scannerStatusRef.current = scannerStatus;
  }, [scannerStatus]);

  useEffect(() => {
    if (!isOpen) {
      clearScannerTimers();
      return;
    }

    if (pickedFiles.length > 0) {
      clearScannerTimers();
      return;
    }

    if (!otp) {
      void createScannerSession();
    }

    return () => {
      if (!isOpen) clearScannerTimers();
    };
  }, [isOpen, pickedFiles.length, otp]);

  useEffect(() => {
    if (
      !isOpen ||
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
  }, [isOpen, scannerStatus, otp, pickedFiles.length]);

  useEffect(() => {
    return () => clearScannerTimers();
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="3xl"
      placement="center"
      scrollBehavior="inside"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="border-b border-slate-200 pb-4">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  Upload Consent
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Upload signed consent file or scan it from your phone.
                </p>
              </div>
            </ModalHeader>

            <ModalBody className="py-5">
              <div className="space-y-5">
                {!pickedFile && (
                  <Card shadow="sm" className="border border-slate-200">
                    <CardBody className="space-y-4 p-5">
                      <div className="text-center">
                        <p className="text-base font-semibold text-slate-900">
                          Scan from Phone
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Use the same QR scanner flow to upload consent from
                          your phone.
                        </p>
                      </div>

                      <ScannerSessionBridgeCard
                        countdown={countdown}
                        otp={otp}
                        phoneLink={phoneLink}
                        qrCodeUrl={qrCodeUrl}
                        onNewSession={resetScanner}
                      />

                      {scannerError && (
                        <p className="text-sm text-danger">{scannerError}</p>
                      )}
                    </CardBody>
                  </Card>
                )}

                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={handlePickFile}
                />

                <Card shadow="sm" className="border border-slate-200">
                  <CardBody className="space-y-5 p-5">
                    <div className="rounded-2xl border border-dashed border-[#BFE0D9] bg-[#F4FBFA] p-5">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-primary shadow-sm">
                          <FiUpload className="text-[22px]" />
                        </div>

                        <p className="mt-4 text-sm font-semibold text-slate-900">
                          Upload consent file
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Supported: PDF, PNG, JPG, JPEG, WEBP
                        </p>

                        <Button
                          className="mt-4 bg-primary text-white"
                          radius="full"
                          onPress={() => inputRef.current?.click()}
                        >
                          Choose File
                        </Button>
                      </div>
                    </div>

                    {pickedFile && (
                      <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
                            <FiFileText className="text-[18px]" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {pickedFile.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatBytes(pickedFile.size)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              window.open(
                                URL.createObjectURL(pickedFile),
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            aria-label="Preview file"
                          >
                            <FiExternalLink />
                          </button>

                          <button
                            type="button"
                            onClick={removePickedFile}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            aria-label="Remove file"
                          >
                            <FiX />
                          </button>
                        </div>
                      </div>
                    )}


                  </CardBody>
                </Card>
              </div>
            </ModalBody>

            <ModalFooter className="border-t border-slate-200 pt-4">
              <Button
                variant="flat"
                radius="full"
                className="h-11 min-w-[110px] border border-[#D7ECE7] bg-white px-6 text-slate-700 shadow-none"
                onPress={() => {
                  onOpenChange(false);
                  onClose();
                }}
              >
                Close
              </Button>

              <Button
                radius="full"
                className="bg-primary px-6 text-white"
                onPress={onSave}
                isDisabled={saveDisabled || !pickedFile}
                isLoading={isSaving}
              >
                Upload Consent
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ConsentUploadModal;