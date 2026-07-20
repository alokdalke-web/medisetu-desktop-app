import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  addToast,
} from "@heroui/react";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  getLabApiErrorMessage,
  useLazyGetAppointmentTestByBarcodeQuery,
  type TrackingDetail,
} from "../../../redux/api/labAssistantApi";
import { safeDate } from "../labData";
import { PaymentBadge, SampleStatusBadge } from "./LabStatusBadge";

type BadgeTone = "teal" | "orange" | "green" | "red" | "gray" | "blue";

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function workflowTone(status: string): BadgeTone {
  if (status === "REJECTED") return "red";
  if (status === "ON_HOLD") return "orange";
  if (status === "COMPLETED") return "green";
  if (status === "IN_PROGRESS") return "blue";

  return "teal";
}

function TrackingStatusBadge({
  label,
  tone = "teal",
}: {
  label: string;
  tone?: BadgeTone;
}) {
  const classes: Record<BadgeTone, string> = {
    teal: "border-primary/15 bg-primary/10 text-primary",
    orange: "border-amber-100 bg-amber-50 text-amber-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    red: "border-red-100 bg-red-50 text-red-700",
    gray: "border-slate-200 bg-slate-50 text-slate-500",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-xs font-semibold leading-none",
        classes[tone],
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function formatTimestamp(value: string | null) {
  const date = safeDate(value);

  if (!date) return "Pending";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeScannedBarcodeValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "");
}

type DetectedBarcode = {
  rawValue?: string;
};

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

function getBarcodeDetectorConstructor() {
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
}

function BarcodeCameraScannerModal({
  isOpen,
  videoRef,
  errorMessage,
  isLoading,
  onOpenChange,
}: {
  isOpen: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  errorMessage: string;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      size="lg"
      backdrop="opaque"
      classNames={{
        backdrop: "bg-slate-950/45 backdrop-blur-sm",
        base: "rounded-3xl border border-slate-200 shadow-2xl bg-white",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 px-6 pt-6">
          <span className="text-lg font-bold text-slate-950">Scan Barcode</span>
          <span className="text-xs font-normal text-slate-500">
            Point the camera at the CODE_128 label. Lookup starts automatically.
          </span>
        </ModalHeader>
        <ModalBody className="px-6">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-video w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="h-24 w-[78%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.32)]" />
            </div>
            {isLoading && (
              <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/95 px-4 py-3 text-center text-xs font-bold text-slate-700 shadow-lg">
                Barcode detected. Loading details...
              </div>
            )}
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
              {errorMessage}
            </div>
          ) : (
            <p className="text-xs font-medium text-slate-500">
              Keep the full barcode inside the frame until the app detects it.
            </p>
          )}
        </ModalBody>
        <ModalFooter className="px-6 pb-6">
          <Button
            variant="bordered"
            radius="full"
            onPress={() => onOpenChange(false)}
            className="border-slate-200 px-5 font-semibold text-slate-600 cursor-pointer"
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function BarcodeLookupResult({
  detail,
}: {
  detail: TrackingDetail;
  onOpenTracking: (appointmentTestId: string) => void;
}) {
  const appointmentTest = detail.appointmentTest;

  const latestEvents = detail.events.slice(0, 3);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <p
            className="truncate text-sm font-bold text-slate-950"
            title={appointmentTest.testName ?? "-"}
          >
            {appointmentTest.testName ?? "-"}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            Patient: {appointmentTest.patientName ?? "-"}
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
            Doctor: {appointmentTest.doctorName ?? "-"}
          </p>
          <p className="mt-1 truncate font-mono text-[11px] font-bold text-primary">
            Test ID: {appointmentTest.uniqueTestId ?? "--"}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <TrackingStatusBadge
            label={humanize(appointmentTest.workflowStatus)}
            tone={workflowTone(appointmentTest.workflowStatus)}
          />
          <PaymentBadge status={appointmentTest.paymentStatus} />
          <SampleStatusBadge status={appointmentTest.sampleStatus} />
        </div>
      </div>

      {latestEvents.length > 0 && (
        <div className="space-y-2">
          {latestEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <p className="truncate text-xs font-bold text-slate-900">
                {event.title}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {formatTimestamp(event.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* {appointmentTest.id && (
        <button
          type="button"
          onClick={() => onOpenTracking(appointmentTest.id)}
          className="inline-flex h-9 w-full items-center justify-center rounded-full bg-primary px-4 text-xs font-bold text-white transition-colors hover:bg-primary-active cursor-pointer"
        >
          Open Tracking
        </button>
      )} */}
    </>
  );
}

export interface BarcodeLookupModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue?: string;
  onClose?: () => void;
}

export function BarcodeLookupModal({
  isOpen,
  onOpenChange,
  initialValue = "",
  onClose,
}: BarcodeLookupModalProps) {
  const navigate = useNavigate();
  const [barcodeScanValue, setBarcodeScanValue] = useState(initialValue);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [barcodeScannerError, setBarcodeScannerError] = useState("");

  const [
    lookupByBarcode,
    {
      data: barcodeLookupData,
      isFetching: isLookingUpBarcode,

      reset: resetBarcodeLookup,
    },
  ] = useLazyGetAppointmentTestByBarcodeQuery();

  const barcodeVideoRef = useRef<HTMLVideoElement | null>(null);
  const barcodeStreamRef = useRef<MediaStream | null>(null);
  const barcodeFrameRef = useRef<number | null>(null);
  const isBarcodeDetectionBusyRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (onClose) onClose();
    }
  }, [isOpen, onClose]);

  const stopBarcodeScanner = useCallback(() => {
    if (barcodeFrameRef.current != null) {
      cancelAnimationFrame(barcodeFrameRef.current);
      barcodeFrameRef.current = null;
    }

    barcodeStreamRef.current?.getTracks().forEach((track) => track.stop());
    barcodeStreamRef.current = null;
    isBarcodeDetectionBusyRef.current = false;

    if (barcodeVideoRef.current) {
      barcodeVideoRef.current.srcObject = null;
    }
  }, []);

  const lookupBarcodeValue = useCallback(
    async (value: string) => {
      const scannedValue = normalizeScannedBarcodeValue(value);

      if (!scannedValue) {
        addToast({
          title: "Barcode required",
          description: "Scan or enter a barcode value first.",
          color: "warning",
        });
        return false;
      }

      setBarcodeScanValue(scannedValue);

      try {
        await lookupByBarcode(scannedValue).unwrap();
        return true;
      } catch {
        return false;
      }
    },
    [lookupByBarcode],
  );

  useEffect(() => {
    if (isOpen) {
      setBarcodeScanValue(initialValue);
      resetBarcodeLookup();
      if (initialValue.trim()) {
        void lookupBarcodeValue(initialValue);
      }
    }
  }, [isOpen, initialValue, resetBarcodeLookup, lookupBarcodeValue]);

  useEffect(() => {
    return () => stopBarcodeScanner();
  }, [stopBarcodeScanner]);

  useEffect(() => {
    if (!isBarcodeScannerOpen) {
      stopBarcodeScanner();
      return;
    }

    let isCancelled = false;

    const startScanner = async () => {
      setBarcodeScannerError("");
      const BarcodeDetectorConstructor = getBarcodeDetectorConstructor();

      if (!BarcodeDetectorConstructor) {
        setBarcodeScannerError(
          "This browser does not support in-app barcode scanning. Copy the scanned value, such as HEM_162, into the lookup field instead.",
        );
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setBarcodeScannerError(
          "Camera access is not available in this browser. Enter the barcode value manually.",
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        barcodeStreamRef.current = stream;

        const video = barcodeVideoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }

        const detector = new BarcodeDetectorConstructor({
          formats: ["code_128"],
        });

        const scanFrame = async () => {
          if (isCancelled || !isBarcodeScannerOpen) return;

          const currentVideo = barcodeVideoRef.current;
          if (
            currentVideo &&
            currentVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            !isBarcodeDetectionBusyRef.current
          ) {
            try {
              const detections = await detector.detect(currentVideo);
              const scannedValue = normalizeScannedBarcodeValue(
                detections.find((item) => item.rawValue)?.rawValue,
              );

              if (scannedValue) {
                isBarcodeDetectionBusyRef.current = true;
                await lookupBarcodeValue(scannedValue);
                if (!isCancelled) setIsBarcodeScannerOpen(false);
                return;
              }
            } catch (_err) {
              setBarcodeScannerError(
                "Could not read the barcode yet. Keep the label centered and steady.",
              );
            }
          }

          barcodeFrameRef.current = requestAnimationFrame(scanFrame);
        };

        barcodeFrameRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        setBarcodeScannerError(
          getLabApiErrorMessage(
            err,
            "Camera permission was denied or the camera could not be opened.",
          ),
        );
      }
    };

    void startScanner();

    return () => {
      isCancelled = true;
      stopBarcodeScanner();
    };
  }, [isBarcodeScannerOpen, lookupBarcodeValue, stopBarcodeScanner]);

  const openTrackingByAppointmentTestId = (nextAppointmentTestId: string) => {
    if (!nextAppointmentTestId) return;
    onOpenChange(false);
    if (onClose) onClose();
    navigate(
      `/lab/tests/${encodeURIComponent(nextAppointmentTestId)}/sample-tracking`,
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="center"
        size="md"
        backdrop="opaque"
        classNames={{
          backdrop: "bg-slate-950/45 backdrop-blur-sm",
          base: "rounded-3xl border border-slate-200 shadow-2xl bg-white p-3",
        }}
      >
        <ModalContent>
          <ModalBody className="px-4 py-4 space-y-4">
            {barcodeLookupData?.data ? (
              <BarcodeLookupResult
                detail={barcodeLookupData.data}
                onOpenTracking={openTrackingByAppointmentTestId}
              />
            ) : isLookingUpBarcode ? (
              <div className="flex items-center justify-center py-6">
                <Spinner size="md" />
              </div>
            ) : (
              barcodeScanValue && (
                <p className="text-sm font-semibold text-slate-500 text-center py-4">
                  No lookup details available. Enter a barcode and click Lookup.
                </p>
              )
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <BarcodeCameraScannerModal
        isOpen={isBarcodeScannerOpen}
        videoRef={barcodeVideoRef}
        errorMessage={barcodeScannerError}
        isLoading={isLookingUpBarcode}
        onOpenChange={(open) => {
          setIsBarcodeScannerOpen(open);
          if (!open) setBarcodeScannerError("");
        }}
      />
    </>
  );
}
