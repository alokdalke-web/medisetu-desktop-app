import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Code } from "@heroui/code";
import { Input } from "@heroui/input";
import { Tab, Tabs } from "@heroui/tabs";
import { useSearchParams } from "react-router";

import {
  useLazyGetScanStatusQuery,
  useRunPrescriptionScanMutation,
  useUploadPrescriptionToBridgeMutation,
} from "../../redux/api/prescriptionScannerApi";
import DocumentScanner from "./DocumentScanner";
import { CropEditor } from "./CropEditor";
import { useOpenCV } from "./useOpenCV";
import { fileToCanvas } from "./compressCanvas";
import { defCorners, normalizeCorners, getCv } from "./scannerUtils";
import type { CornerPoints } from "jscanify/client";

type UploadPayload = {
  imageBase64?: string;
  imageUrl?: string;
};

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

/** Pending upload-image crop session */
interface UploadCropSession {
  canvas: HTMLCanvasElement;
  frameSrc: string;
  corners: CornerPoints;
}

const SwitchToPhonePage = () => {
  const [params] = useSearchParams();
  const otp = (params.get("otp") || "").trim();
  const otpDisplay = otp.toUpperCase();
  const hasOtp = Boolean(otp);

  const [imageBase64, setImageBase64] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingOtp, setIsValidatingOtp] = useState(false);
  const [isOtpExpired, setIsOtpExpired] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [isBridgeUploadComplete, setIsBridgeUploadComplete] = useState(false);
  const [error, setError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPreviewUrl, setScannedPreviewUrl] = useState<string | null>(null);

  // Upload-image crop flow
  const { scannerRef, cvReady, cvError } = useOpenCV();
  const [uploadCropSession, setUploadCropSession] = useState<UploadCropSession | null>(null);

  const [getScanStatus] = useLazyGetScanStatusQuery();
  const [runPrescriptionScan] = useRunPrescriptionScanMutation();
  const [uploadPrescriptionToBridge] = useUploadPrescriptionToBridgeMutation();

  const modeLabel = useMemo(
    () => (hasOtp ? "OTP Upload Mode" : "Direct Scan Mode"),
    [hasOtp],
  );

  useEffect(() => {
    if (!hasOtp) {
      setIsOtpExpired(false);
      return;
    }

    const validateOtp = async () => {
      setIsValidatingOtp(true);

      try {
        const response = await getScanStatus(otp).unwrap();
        setIsOtpExpired(
          response.status === "invalid" || response.status === "uploaded",
        );
      } catch {
        setIsOtpExpired(false);
      } finally {
        setIsValidatingOtp(false);
      }
    };

    void validateOtp();
  }, [hasOtp, otp, getScanStatus]);

  const payload: UploadPayload = {
    imageBase64: imageBase64 || undefined,
    imageUrl: imageUrl || undefined,
  };

  const hasPayload = Boolean(payload.imageBase64 || payload.imageUrl);

  /** Load gallery file → open CropEditor for adjustment */
  const onSelectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    event.target.value = "";
    setError("");

    try {
      const canvas = await fileToCanvas(file);
      const frameSrc = canvas.toDataURL("image/jpeg", 0.97);

      // Try auto-detect document corners
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
        } catch { /* fall back to default corners */ }
      }

      setUploadCropSession({ canvas, frameSrc, corners });
    } catch (fileError) {
      setError(getErrorMessage(fileError, "Failed to process image file."));
    }
  };

  /** Called when user confirms the crop on an uploaded image */
  const handleUploadCropConfirm = (base64: string) => {
    setImageBase64(base64);
    setScannedPreviewUrl(`data:image/jpeg;base64,${base64}`);
    setUploadCropSession(null);
  };

  const submit = async () => {
    if (!hasPayload) {
      setError("Provide at least one input: image file/base64 or image URL.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setResult(null);
    setIsBridgeUploadComplete(false);

    try {
      if (hasOtp) {
        const response = await uploadPrescriptionToBridge({
          otp,
          ...payload,
        }).unwrap();

        setResult(response);
        setIsBridgeUploadComplete(true);
      } else {
        const response = await runPrescriptionScan(payload).unwrap();
        setResult(response);
      }
    } catch (submitError) {
      const errorMessage = getErrorMessage(submitError, "Request failed.");

      if (hasOtp && /expired|invalid|used|already/i.test(errorMessage)) {
        setIsOtpExpired(true);
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScannerCapture = (base64: string) => {
    setImageBase64(base64);
    setScannedPreviewUrl(`data:image/jpeg;base64,${base64}`);
    setIsScanning(false);
  };

  // ── Guard screens ──────────────────────────────────────────────────────────

  if (hasOtp && isValidatingOtp) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
        <Card shadow="sm">
          <CardHeader className="flex flex-col items-start gap-2">
            <h1 className="text-3xl font-semibold">Checking OTP...</h1>
          </CardHeader>
          <CardBody>
            <p className="text-default-600">
              Please wait while we validate this QR/OTP session.
            </p>
          </CardBody>
        </Card>
      </section>
    );
  }

  if (hasOtp && isOtpExpired) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
        <Card shadow="sm">
          <CardHeader className="flex flex-col items-start gap-2">
            <h1 className="text-3xl font-semibold">OTP Expired</h1>
            <Chip color="danger" variant="flat">
              OTP: {otpDisplay}
            </Chip>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-default-700">
              This QR code or OTP has already been used or expired.
            </p>
            <p className="text-default-600">
              Please go back to your laptop and create a new scan session.
            </p>
          </CardBody>
        </Card>
      </section>
    );
  }

  // ── Full-screen camera scanner ────────────────────────────────────────────
  if (isScanning) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
        <DocumentScanner
          onCapture={handleScannerCapture}
          onCancel={() => setIsScanning(false)}
        />
      </section>
    );
  }

  // ── Full-screen crop editor for gallery uploads ───────────────────────────
  if (uploadCropSession && scannerRef.current) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
        <div className="w-full flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Adjust Document Crop</h2>
          {!cvReady && (
            <span className="text-xs text-default-400">
              {cvError ? "Engine failed" : "Loading engine…"}
            </span>
          )}
        </div>
        <CropEditor
          frameSrc={uploadCropSession.frameSrc}
          frameW={uploadCropSession.canvas.width}
          frameH={uploadCropSession.canvas.height}
          sourceCanvas={uploadCropSession.canvas}
          initialBoundary={uploadCropSession.corners}
          scanner={scannerRef.current}
          onConfirm={handleUploadCropConfirm}
          onRetake={() => setUploadCropSession(null)}
          confirmLabel="Use This Crop"
          retakeLabel="Cancel"
        />
      </section>
    );
  }

  // Waiting for OpenCV while upload crop session is pending
  if (uploadCropSession && !scannerRef.current) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
        <p className="text-sm text-default-500 text-center py-12">
          {cvError
            ? `OpenCV engine failed to load: ${cvError}`
            : "Loading OpenCV engine, please wait…"}
        </p>
      </section>
    );
  }

  // ── Main upload form ──────────────────────────────────────────────────────
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <Card shadow="sm">
        <CardHeader className="flex flex-col items-start gap-2">
          <h1 className="text-3xl font-semibold">Scan Upload From Phone</h1>
          <div className="flex items-center gap-2">
            <Chip color={hasOtp ? "secondary" : "primary"}>{modeLabel}</Chip>
            {hasOtp ? <Chip variant="flat">OTP: {otpDisplay}</Chip> : null}
          </div>
          <p className="text-default-600">
            {hasOtp
              ? "Upload data to bridge session. Desktop will process it via existing /scan pipeline."
              : "No OTP detected. This submits directly to existing /scan endpoint."}
          </p>
        </CardHeader>

        <CardBody className="space-y-4">
          <Tabs aria-label="Scan input modes" color="primary" variant="underlined">
            <Tab key="camera-file" title="Image File">
              <div className="pt-3 space-y-3">

                {/* Camera scanner button */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-default-700">
                    Capture using camera
                  </label>
                  <Button
                    color="primary"
                    fullWidth
                    onPress={() => setIsScanning(true)}
                    variant="flat"
                  >
                    {scannedPreviewUrl ? "Rescan Document" : "Open Document Scanner"}
                  </Button>
                </div>

                {/* Gallery upload → CropEditor */}
                <div>
                  <label
                    className="mb-2 block text-sm font-medium text-default-700"
                    htmlFor="phone-prescription-upload"
                  >
                    Upload from gallery/files
                  </label>
                  <input
                    accept="image/*"
                    className="block w-full cursor-pointer rounded-medium border border-default-200 bg-content1 px-3 py-2 text-sm file:mr-3 file:rounded-medium file:border-0 file:bg-default-100 file:px-3 file:py-2 file:text-sm file:font-medium"
                    id="phone-prescription-upload"
                    onChange={onSelectFile}
                    type="file"
                  />
                  <p className="mt-1 text-xs text-default-500">
                    Image will open in the crop editor before uploading.
                  </p>
                </div>

                {/* Preview of selected/scanned image */}
                {scannedPreviewUrl && (
                  <div className="rounded-large border border-success-200 bg-success-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-success-700">✓ Image ready</span>
                      <button
                        className="text-xs text-default-500 underline"
                        onClick={() => { setScannedPreviewUrl(null); setImageBase64(""); }}
                        type="button"
                      >
                        Clear
                      </button>
                    </div>
                    <img
                      src={scannedPreviewUrl}
                      alt="Selected document preview"
                      className="w-full max-h-64 object-contain rounded-medium border border-success-300"
                    />
                  </div>
                )}
              </div>
            </Tab>

            <Tab key="image-url" title="Image URL">
              <div className="pt-3">
                <Input
                  label="Image URL"
                  onValueChange={setImageUrl}
                  placeholder="https://example.com/prescription.jpg"
                  value={imageUrl}
                  variant="bordered"
                />
              </div>
            </Tab>
          </Tabs>

          <Button color="primary" isLoading={isSubmitting} onPress={submit}>
            {hasOtp ? "Upload To Bridge" : "Process Directly"}
          </Button>

          {error ? <Code color="danger">{error}</Code> : null}

          {hasOtp && isBridgeUploadComplete ? (
            <div className="rounded-large border border-success-200 bg-success-50 p-4 text-success-700">
              <p className="font-semibold">Upload successful.</p>
              <p className="mt-1 text-sm">
                Image was sent to your bridge session. Continue on your laptop;
                the scanner page should update automatically.
              </p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {result ? (
        <Card shadow="sm">
          <CardHeader>
            <h2 className="text-xl font-semibold">Response</h2>
          </CardHeader>
          <CardBody>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-large bg-default-100 p-4 text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardBody>
        </Card>
      ) : null}
    </section>
  );
};

export default SwitchToPhonePage;
