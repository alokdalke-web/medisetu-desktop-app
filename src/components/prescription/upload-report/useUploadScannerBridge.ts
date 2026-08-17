import { useCallback, useEffect, useRef, useState } from "react";
import {
  useCreateScanSessionMutation,
  useLazyGetScanStatusQuery,
} from "../../../redux/api/prescriptionScannerApi";
import {
  getErrorMessage,
  POLL_INTERVAL_MS,
} from "./helpers";
import type {
  ScannerBridgeStatus,
  UploadReportMode,
} from "./types";

type UseUploadScannerBridgeArgs = {
  isOpen: boolean;
  mode: UploadReportMode;
  pickedFileCount: number;
  pageCount: number;
  consumeScannedImage: (imageSrc: string) => Promise<void>;
};

export const useUploadScannerBridge = ({
  isOpen,
  mode,
  pickedFileCount,
  pageCount,
  consumeScannedImage,
}: UseUploadScannerBridgeArgs) => {
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [scannerError, setScannerError] = useState("");
  const [scannerStatus, setScannerStatus] =
    useState<ScannerBridgeStatus>("idle");

  const pollTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const scannerStatusRef = useRef<ScannerBridgeStatus>("idle");

  const [createScanSession] = useCreateScanSessionMutation();
  const [getScanStatus] = useLazyGetScanStatusQuery();

  const clearScannerTimers = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const resetScannerState = useCallback(() => {
    clearScannerTimers();
    setOtp("");
    setCountdown(0);
    setScannerError("");
    setScannerStatus("idle");
  }, [clearScannerTimers]);

  const createScannerSession = useCallback(async () => {
    setScannerError("");
    setScannerStatus("idle");

    try {
      const session = await createScanSession().unwrap();
      setOtp(session.otp);
      setCountdown(session.expiresIn);
      setScannerStatus("session_ready");
    } catch (error) {
      setScannerError(getErrorMessage(error, "Failed to create scan session."));
      setScannerStatus("error");
    }
  }, [createScanSession]);

  const resetScanner = useCallback(() => {
    resetScannerState();
    void createScannerSession();
  }, [createScannerSession, resetScannerState]);

  const pollScannerStatus = useCallback(
    async (currentOtp: string) => {
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
    },
    [clearScannerTimers, consumeScannedImage, getScanStatus],
  );

  useEffect(() => {
    scannerStatusRef.current = scannerStatus;
  }, [scannerStatus]);

  useEffect(() => {
    if (!isOpen) {
      clearScannerTimers();
      return;
    }

    if (mode !== "upload" || pickedFileCount > 0 || pageCount > 0) {
      resetScannerState();
      return;
    }

    if (!otp) {
      void createScannerSession();
    }
  }, [
    clearScannerTimers,
    createScannerSession,
    isOpen,
    mode,
    otp,
    pageCount,
    pickedFileCount,
    resetScannerState,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      mode !== "upload" ||
      scannerStatus !== "session_ready" ||
      !otp ||
      pickedFileCount > 0 ||
      pageCount > 0
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
  }, [
    clearScannerTimers,
    isOpen,
    mode,
    otp,
    pageCount,
    pickedFileCount,
    pollScannerStatus,
    scannerStatus,
  ]);

  useEffect(() => {
    return () => clearScannerTimers();
  }, [clearScannerTimers]);

  return {
    countdown,
    otp,
    scannerError,
    clearScannerTimers,
    resetScanner,
    resetScannerState,
  };
};
