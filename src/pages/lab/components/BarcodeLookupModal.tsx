// import {
//   Button,
//   Modal,
//   ModalBody,
//   ModalContent,
//   ModalFooter,
//   ModalHeader,
//   Spinner,
//   addToast,
// } from "@heroui/react";
// import { RefObject, useCallback, useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router";
// import {
//   getLabApiErrorMessage,
//   useLazyGetAppointmentTestByBarcodeQuery,
//   type TrackingDetail,
// } from "../../../redux/api/labAssistantApi";
// import { safeDate } from "../labData";
// import { LabScreenInfoTooltip } from "./LabScreenInfoTooltip";

// type BadgeTone = "teal" | "orange" | "green" | "red" | "gray" | "blue";

// function humanize(value: string | null | undefined) {
//   const status = String(value ?? "").trim();

//   if (!status) return "Pending";

//   return status
//     .replace(/([a-z])([A-Z])/g, "$1 $2")
//     .replace(/[_-]+/g, " ")
//     .toLowerCase()
//     .split(" ")
//     .filter(Boolean)
//     .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
//     .join(" ");
// }

// function workflowTone(status: string | null | undefined): BadgeTone {
//   const normalized = String(status ?? "").trim().toUpperCase();

//   if (normalized === "REJECTED") return "red";
//   if (normalized === "ON_HOLD") return "orange";
//   if (normalized === "COMPLETED") return "green";
//   if (normalized === "IN_PROGRESS") return "blue";

//   return "teal";
// }

// function paymentLabel(status: string | null | undefined) {
//   const normalized = String(status ?? "").trim().toLowerCase();

//   if (normalized === "paid") return "Paid";
//   if (normalized === "failed") return "Failed";
//   if (normalized === "pending") return "Pending";

//   return humanize(status);
// }

// function paymentTone(status: string | null | undefined): BadgeTone {
//   const normalized = String(status ?? "").trim().toLowerCase();

//   if (normalized === "paid") return "green";
//   if (normalized === "failed") return "red";

//   return "orange";
// }

// function sampleLabel(status: string | null | undefined) {
//   const normalized = String(status ?? "").trim().toUpperCase();
//   const labels: Record<string, string> = {
//     NOT_STARTED: "Not Started",
//     SAMPLE_COLLECTION_PENDING: "Collection Pending",
//     SAMPLE_COLLECTED: "Sample Collected",
//     SAMPLE_RECEIVED_AT_LAB: "Received At Lab",
//     SAMPLE_PROCESSING: "Processing",
//     TESTING_IN_PROGRESS: "Testing in Progress",
//     QUALITY_CHECK: "Result Verification",
//     COMPLETED: "Completed",
//   };

//   return labels[normalized] ?? humanize(status);
// }

// function sampleTone(status: string | null | undefined): BadgeTone {
//   const normalized = String(status ?? "").trim().toUpperCase();

//   if (normalized === "COMPLETED") return "green";
//   if (normalized === "QUALITY_CHECK" || normalized === "TESTING_IN_PROGRESS") {
//     return "blue";
//   }
//   if (normalized === "SAMPLE_COLLECTION_PENDING") return "orange";
//   if (normalized === "NOT_STARTED") return "gray";

//   return "teal";
// }

// function reportLabel(status: string | null | undefined) {
//   return humanize(status);
// }

// function reportTone(status: string | null | undefined): BadgeTone {
//   const normalized = String(status ?? "").trim().toUpperCase();

//   if (normalized === "COMPLETED") return "green";
//   if (normalized === "REJECTED") return "red";
//   if (normalized === "IN_PROGRESS" || normalized === "INPROGRESS") return "blue";
//   if (normalized === "PENDING") return "orange";

//   return "teal";
// }

// function LookupStatusBadge({
//   label,
//   value,
//   tone = "teal",
// }: {
//   label: string;
//   value: string;
//   tone?: BadgeTone;
// }) {
//   const classes: Record<BadgeTone, string> = {
//     teal: "border-primary/15 bg-primary/10 text-primary",
//     orange: "border-amber-100 bg-amber-50 text-amber-700",
//     green: "border-emerald-100 bg-emerald-50 text-emerald-700",
//     red: "border-red-100 bg-red-50 text-red-700",
//     gray: "border-slate-200 bg-slate-50 text-slate-500",
//     blue: "border-blue-100 bg-blue-50 text-blue-700",
//   };

//   return (
//     <span
//       className={[
//         "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
//         "text-xs font-semibold leading-none",
//         classes[tone],
//       ].join(" ")}
//     >
//       <span className="text-[10px] font-bold uppercase tracking-wide opacity-75">
//         {label}:
//       </span>
//       <span className="h-1.5 w-1.5 rounded-full bg-current" />
//       {value}
//     </span>
//   );
// }

// function formatTimestamp(value: string | null) {
//   const date = safeDate(value);

//   if (!date) return "Pending";

//   return date.toLocaleString(undefined, {
//     month: "short",
//     day: "2-digit",
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// function normalizeScannedBarcodeValue(value: unknown) {
//   return String(value ?? "")
//     .trim()
//     .replace(/\s+/g, "");
// }

// type DetectedBarcode = {
//   rawValue?: string;
// };

// type BarcodeDetectorLike = {
//   detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
// };

// type BarcodeDetectorConstructor = new (options?: {
//   formats?: string[];
// }) => BarcodeDetectorLike;

// function getBarcodeDetectorConstructor() {
//   return (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
//     .BarcodeDetector;
// }

// function BarcodeCameraScannerModal({
//   isOpen,
//   videoRef,
//   errorMessage,
//   isLoading,
//   onOpenChange,
// }: {
//   isOpen: boolean;
//   videoRef: RefObject<HTMLVideoElement | null>;
//   errorMessage: string;
//   isLoading: boolean;
//   onOpenChange: (open: boolean) => void;
// }) {
//   return (
//     <Modal
//       isOpen={isOpen}
//       onOpenChange={onOpenChange}
//       placement="center"
//       size="lg"
//       backdrop="opaque"
//       classNames={{
//         backdrop: "bg-slate-950/45 backdrop-blur-sm",
//         base: "rounded-3xl border border-slate-200 shadow-2xl bg-white",
//       }}
//     >
//       <ModalContent>
//         <ModalHeader className="flex flex-col gap-1 px-6 pt-6">
//           <span className="text-lg font-bold text-slate-950">Scan Barcode</span>
//           <span className="text-xs font-normal text-slate-500">
//             Point the camera at the CODE_128 label. Lookup starts automatically.
//           </span>
//         </ModalHeader>
//         <ModalBody className="px-6">
//           <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
//             <video
//               ref={videoRef}
//               playsInline
//               muted
//               className="aspect-video w-full object-cover"
//             />
//             <div className="pointer-events-none absolute inset-0 grid place-items-center">
//               <div className="h-24 w-[78%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.32)]" />
//             </div>
//             {isLoading && (
//               <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/95 px-4 py-3 text-center text-xs font-bold text-slate-700 shadow-lg">
//                 Barcode detected. Loading details...
//               </div>
//             )}
//           </div>

//           {errorMessage ? (
//             <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
//               {errorMessage}
//             </div>
//           ) : (
//             <p className="text-xs font-medium text-slate-500">
//               Keep the full barcode inside the frame until the app detects it.
//             </p>
//           )}
//         </ModalBody>
//         <ModalFooter className="px-6 pb-6">
//           <Button
//             variant="bordered"
//             radius="full"
//             onPress={() => onOpenChange(false)}
//             className="border-slate-200 px-5 font-semibold text-slate-600 cursor-pointer"
//           >
//             Close
//           </Button>
//         </ModalFooter>
//       </ModalContent>
//     </Modal>
//   );
// }

// function BarcodeLookupResult({
//   detail,
// }: {
//   detail: TrackingDetail;
//   onOpenTracking: (appointmentTestId: string) => void;
// }) {
//   const appointmentTest = detail.appointmentTest;
//   const reportStatus =
//     appointmentTest.reportStatus ??
//     (appointmentTest.readyForReportAt ? "Completed" : "Pending");
//   const statusItems = [
//     {
//       label: "Test",
//       value: humanize(appointmentTest.workflowStatus),
//       tone: workflowTone(appointmentTest.workflowStatus),
//     },
//     {
//       label: "Payment",
//       value: paymentLabel(appointmentTest.paymentStatus),
//       tone: paymentTone(appointmentTest.paymentStatus),
//     },
//     {
//       label: "Sample",
//       value: sampleLabel(appointmentTest.sampleStatus),
//       tone: sampleTone(appointmentTest.sampleStatus),
//     },
//     {
//       label: "Report",
//       value: reportLabel(reportStatus),
//       tone: reportTone(reportStatus),
//     },
//   ];
//   const latestEvents = [...detail.events]
//     .sort((a, b) => {
//       const firstDate = safeDate(a.createdAt)?.getTime() ?? 0;
//       const secondDate = safeDate(b.createdAt)?.getTime() ?? 0;

//       return secondDate - firstDate;
//     })
//     .slice(0, 3);

//   return (
//     <>
//       <div className="flex flex-col gap-3">
//         <div className="min-w-0">
//           <p
//             className="truncate text-sm font-bold text-slate-950"
//             title={appointmentTest.testName ?? "-"}
//           >
//             {appointmentTest.testName ?? "-"}
//           </p>
//           <p className="mt-1 truncate text-xs font-semibold text-slate-500">
//             Patient: {appointmentTest.patientName ?? "-"}
//           </p>
//           <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
//             Doctor: {appointmentTest.doctorName ?? "-"}
//           </p>
//           <p className="mt-1 truncate font-mono text-[11px] font-bold text-primary">
//             Test ID: {appointmentTest.uniqueTestId ?? "--"}
//           </p>
//         </div>

//         <div className="flex flex-wrap gap-1.5">
//           {statusItems.map((item) => (
//             <LookupStatusBadge
//               key={item.label}
//               label={item.label}
//               value={item.value}
//               tone={item.tone}
//             />
//           ))}
//         </div>
//       </div>

//       {latestEvents.length > 0 && (
//         <div className="space-y-2">
//           <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
//             Recent activity
//           </p>
//           {latestEvents.map((event) => (
//             <div
//               key={event.id}
//               className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
//             >
//               <p className="truncate text-xs font-bold text-slate-900">
//                 {event.title}
//               </p>
//               <p className="mt-0.5 text-[11px] font-medium text-slate-500">
//                 {formatTimestamp(event.createdAt)}
//               </p>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* {appointmentTest.id && (
//         <button
//           type="button"
//           onClick={() => onOpenTracking(appointmentTest.id)}
//           className="inline-flex h-9 w-full items-center justify-center rounded-full bg-primary px-4 text-xs font-bold text-white transition-colors hover:bg-primary-active cursor-pointer"
//         >
//           Open Tracking
//         </button>
//       )} */}
//     </>
//   );
// }

// export interface BarcodeLookupModalProps {
//   isOpen: boolean;
//   onOpenChange: (open: boolean) => void;
//   initialValue?: string;
//   onClose?: () => void;
// }

// export function BarcodeLookupModal({
//   isOpen,
//   onOpenChange,
//   initialValue = "",
//   onClose,
// }: BarcodeLookupModalProps) {
//   const navigate = useNavigate();
//   const [barcodeScanValue, setBarcodeScanValue] = useState(initialValue);
//   const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
//   const [barcodeScannerError, setBarcodeScannerError] = useState("");

//   const [
//     lookupByBarcode,
//     {
//       data: barcodeLookupData,
//       isFetching: isLookingUpBarcode,

//       reset: resetBarcodeLookup,
//     },
//   ] = useLazyGetAppointmentTestByBarcodeQuery();

//   const barcodeVideoRef = useRef<HTMLVideoElement | null>(null);
//   const barcodeStreamRef = useRef<MediaStream | null>(null);
//   const barcodeFrameRef = useRef<number | null>(null);
//   const isBarcodeDetectionBusyRef = useRef(false);

//   useEffect(() => {
//     if (!isOpen) {
//       if (onClose) onClose();
//     }
//   }, [isOpen, onClose]);

//   const stopBarcodeScanner = useCallback(() => {
//     if (barcodeFrameRef.current != null) {
//       cancelAnimationFrame(barcodeFrameRef.current);
//       barcodeFrameRef.current = null;
//     }

//     barcodeStreamRef.current?.getTracks().forEach((track) => track.stop());
//     barcodeStreamRef.current = null;
//     isBarcodeDetectionBusyRef.current = false;

//     if (barcodeVideoRef.current) {
//       barcodeVideoRef.current.srcObject = null;
//     }
//   }, []);

//   const lookupBarcodeValue = useCallback(
//     async (value: string) => {
//       const scannedValue = normalizeScannedBarcodeValue(value);

//       if (!scannedValue) {
//         addToast({
//           title: "Barcode required",
//           description: "Scan or enter a barcode value first.",
//           color: "warning",
//         });
//         return false;
//       }

//       setBarcodeScanValue(scannedValue);

//       try {
//         await lookupByBarcode(scannedValue).unwrap();
//         return true;
//       } catch {
//         return false;
//       }
//     },
//     [lookupByBarcode],
//   );

//   useEffect(() => {
//     if (isOpen) {
//       setBarcodeScanValue(initialValue);
//       resetBarcodeLookup();
//       if (initialValue.trim()) {
//         void lookupBarcodeValue(initialValue);
//       }
//     }
//   }, [isOpen, initialValue, resetBarcodeLookup, lookupBarcodeValue]);

//   useEffect(() => {
//     return () => stopBarcodeScanner();
//   }, [stopBarcodeScanner]);

//   useEffect(() => {
//     if (!isBarcodeScannerOpen) {
//       stopBarcodeScanner();
//       return;
//     }

//     let isCancelled = false;

//     const startScanner = async () => {
//       setBarcodeScannerError("");
//       const BarcodeDetectorConstructor = getBarcodeDetectorConstructor();

//       if (!BarcodeDetectorConstructor) {
//         setBarcodeScannerError(
//           "This browser does not support in-app barcode scanning. Copy the scanned value, such as HEM_162, into the lookup field instead.",
//         );
//         return;
//       }

//       if (!navigator.mediaDevices?.getUserMedia) {
//         setBarcodeScannerError(
//           "Camera access is not available in this browser. Enter the barcode value manually.",
//         );
//         return;
//       }

//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           audio: false,
//           video: {
//             facingMode: { ideal: "environment" },
//           },
//         });

//         if (isCancelled) {
//           stream.getTracks().forEach((track) => track.stop());
//           return;
//         }

//         barcodeStreamRef.current = stream;

//         const video = barcodeVideoRef.current;
//         if (video) {
//           video.srcObject = stream;
//           await video.play();
//         }

//         const detector = new BarcodeDetectorConstructor({
//           formats: ["code_128"],
//         });

//         const scanFrame = async () => {
//           if (isCancelled || !isBarcodeScannerOpen) return;

//           const currentVideo = barcodeVideoRef.current;
//           if (
//             currentVideo &&
//             currentVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
//             !isBarcodeDetectionBusyRef.current
//           ) {
//             try {
//               const detections = await detector.detect(currentVideo);
//               const scannedValue = normalizeScannedBarcodeValue(
//                 detections.find((item) => item.rawValue)?.rawValue,
//               );

//               if (scannedValue) {
//                 isBarcodeDetectionBusyRef.current = true;
//                 await lookupBarcodeValue(scannedValue);
//                 if (!isCancelled) setIsBarcodeScannerOpen(false);
//                 return;
//               }
//             } catch (_err) {
//               setBarcodeScannerError(
//                 "Could not read the barcode yet. Keep the label centered and steady.",
//               );
//             }
//           }

//           barcodeFrameRef.current = requestAnimationFrame(scanFrame);
//         };

//         barcodeFrameRef.current = requestAnimationFrame(scanFrame);
//       } catch (err) {
//         setBarcodeScannerError(
//           getLabApiErrorMessage(
//             err,
//             "Camera permission was denied or the camera could not be opened.",
//           ),
//         );
//       }
//     };

//     void startScanner();

//     return () => {
//       isCancelled = true;
//       stopBarcodeScanner();
//     };
//   }, [isBarcodeScannerOpen, lookupBarcodeValue, stopBarcodeScanner]);

//   const openTrackingByAppointmentTestId = (nextAppointmentTestId: string) => {
//     if (!nextAppointmentTestId) return;
//     onOpenChange(false);
//     if (onClose) onClose();
//     navigate(
//       `/lab/tests/${encodeURIComponent(nextAppointmentTestId)}/sample-tracking`,
//     );
//   };

//   return (
//     <>
//       <Modal
//         isOpen={isOpen}
//         onOpenChange={onOpenChange}
//         placement="center"
//         size="md"
//         backdrop="opaque"
//         classNames={{
//           backdrop: "bg-slate-950/45 backdrop-blur-sm",
//           base: "rounded-3xl border border-slate-200 shadow-2xl bg-white p-3",
//         }}
//       >
//         <ModalContent>
//           <ModalHeader className="flex flex-col gap-1 px-4 pt-4 pb-0">
//             <div className="flex items-center gap-2">
//               <span className="text-base font-bold text-slate-950">
//                 Barcode Lookup
//               </span>
//               <LabScreenInfoTooltip
//                 title="Barcode Lookup"
//                 description="Use barcode lookup to find a lab test by its printed CODE_128 label and open the matching sample tracking workflow."
//                 items={[
//                   "Scan labels from sample tubes or printed reports when you need to confirm the current workflow status.",
//                   "If scanning is unavailable, paste or enter the barcode value and run lookup from the sidebar field.",
//                 ]}
//                 placement="bottom"
//                 guideSection="lab"
//                 linkLabel="Read full lab guide"
//               />
//             </div>
//             <span className="text-xs font-medium text-slate-500">
//               Review scanned label details before continuing sample work.
//             </span>
//           </ModalHeader>
//           <ModalBody className="px-4 py-4 space-y-4">
//             {barcodeLookupData?.data ? (
//               <BarcodeLookupResult
//                 detail={barcodeLookupData.data}
//                 onOpenTracking={openTrackingByAppointmentTestId}
//               />
//             ) : isLookingUpBarcode ? (
//               <div className="flex items-center justify-center py-6">
//                 <Spinner size="md" />
//               </div>
//             ) : (
//               barcodeScanValue && (
//                 <p className="text-sm font-semibold text-slate-500 text-center py-4">
//                   No lookup details available. Enter a barcode and click Lookup.
//                 </p>
//               )
//             )}
//           </ModalBody>
//         </ModalContent>
//       </Modal>

//       <BarcodeCameraScannerModal
//         isOpen={isBarcodeScannerOpen}
//         videoRef={barcodeVideoRef}
//         errorMessage={barcodeScannerError}
//         isLoading={isLookingUpBarcode}
//         onOpenChange={(open) => {
//           setIsBarcodeScannerOpen(open);
//           if (!open) setBarcodeScannerError("");
//         }}
//       />
//     </>
//   );
// }

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
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FiActivity,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiPackage,
  FiPrinter,
  FiSearch,
  FiTag,
  FiUser,
} from "react-icons/fi";
import { useNavigate } from "react-router";
import {
  getLabApiErrorMessage,
  useLazyGetAppointmentTestByBarcodeQuery,
  type TrackingDetail,
} from "../../../redux/api/labAssistantApi";
import { safeDate } from "../labData";
import { LabScreenInfoTooltip } from "./LabScreenInfoTooltip";

type BadgeTone = "teal" | "orange" | "green" | "red" | "gray" | "blue";

function humanize(value: string | null | undefined) {
  const status = String(value ?? "").trim();

  if (!status) return "Pending";

  return status
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function workflowTone(status: string | null | undefined): BadgeTone {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (normalized === "REJECTED") return "red";
  if (normalized === "ON_HOLD") return "orange";
  if (normalized === "COMPLETED") return "green";
  if (normalized === "IN_PROGRESS") return "blue";

  return "teal";
}

function paymentLabel(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toLowerCase();

  if (normalized === "paid") return "Paid";
  if (normalized === "failed") return "Failed";
  if (normalized === "pending") return "Pending";

  return humanize(status);
}

function paymentTone(status: string | null | undefined): BadgeTone {
  const normalized = String(status ?? "").trim().toLowerCase();

  if (normalized === "paid") return "green";
  if (normalized === "failed") return "red";

  return "orange";
}

function sampleLabel(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();

  const labels: Record<string, string> = {
    NOT_STARTED: "Not Started",
    SAMPLE_COLLECTION_PENDING: "Collection Pending",
    SAMPLE_COLLECTED: "Sample Collected",
    SAMPLE_RECEIVED_AT_LAB: "Received At Lab",
    SAMPLE_PROCESSING: "Processing",
    TESTING_IN_PROGRESS: "Testing in Progress",
    QUALITY_CHECK: "Result Verification",
    COMPLETED: "Completed",
  };

  return labels[normalized] ?? humanize(status);
}

function sampleTone(status: string | null | undefined): BadgeTone {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (normalized === "COMPLETED") return "green";

  if (
    normalized === "QUALITY_CHECK" ||
    normalized === "TESTING_IN_PROGRESS"
  ) {
    return "blue";
  }

  if (normalized === "SAMPLE_COLLECTION_PENDING") return "orange";
  if (normalized === "NOT_STARTED") return "gray";

  return "teal";
}

function reportLabel(status: string | null | undefined) {
  return humanize(status);
}

function reportTone(status: string | null | undefined): BadgeTone {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (normalized === "COMPLETED") return "green";
  if (normalized === "REJECTED") return "red";

  if (normalized === "IN_PROGRESS" || normalized === "INPROGRESS") {
    return "blue";
  }

  if (normalized === "PENDING") return "orange";

  return "teal";
}

function formatTimestamp(value: string | null) {
  const date = safeDate(value);

  if (!date) return "Pending";

  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
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
  return (
    window as unknown as {
      BarcodeDetector?: BarcodeDetectorConstructor;
    }
  ).BarcodeDetector;
}

function LookupStatusCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: BadgeTone;
  icon: ReactNode;
}) {
  const styles: Record<
    BadgeTone,
    {
      wrapper: string;
      icon: string;
      value: string;
      dot: string;
    }
  > = {
    teal: {
      wrapper: "border-primary/15 bg-primary/[0.04]",
      icon: "bg-primary/10 text-primary",
      value: "text-primary",
      dot: "bg-primary",
    },
    orange: {
      wrapper: "border-amber-100 bg-amber-50/70",
      icon: "bg-amber-100/70 text-amber-600",
      value: "text-amber-700",
      dot: "bg-amber-500",
    },
    green: {
      wrapper: "border-emerald-100 bg-emerald-50/70",
      icon: "bg-emerald-100/70 text-emerald-600",
      value: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    red: {
      wrapper: "border-red-100 bg-red-50/70",
      icon: "bg-red-100/70 text-red-600",
      value: "text-red-700",
      dot: "bg-red-500",
    },
    gray: {
      wrapper: "border-slate-200 bg-slate-50",
      icon: "bg-slate-200/70 text-slate-500",
      value: "text-slate-600",
      dot: "bg-slate-400",
    },
    blue: {
      wrapper: "border-blue-100 bg-blue-50/70",
      icon: "bg-blue-100/70 text-blue-600",
      value: "text-blue-700",
      dot: "bg-blue-500",
    },
  };

  const selectedStyle = styles[tone];

  return (
    <div
      className={[
        "flex min-w-0 items-center gap-1.5 rounded-xl border px-2 py-2 sm:gap-2 sm:px-2.5 sm:py-2.5",
        selectedStyle.wrapper,
      ].join(" ")}
    >
      <div
        className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8",
          selectedStyle.icon,
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="truncate text-[8px] font-bold uppercase tracking-[0.06em] text-slate-500 sm:text-[9px]">
          {label}
        </p>

        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          <span
            className={[
              "h-1.5 w-1.5 shrink-0 rounded-full",
              selectedStyle.dot,
            ].join(" ")}
          />

          <p
            className={[
              "truncate text-[10px] font-bold sm:text-[11px]",
              selectedStyle.value,
            ].join(" ")}
            title={value}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
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
      scrollBehavior="inside"
      classNames={{
        backdrop: "bg-slate-950/45 backdrop-blur-sm",
        base: [
          "max-h-[calc(100vh-24px)] overflow-hidden",
          "rounded-3xl border border-slate-200 bg-white shadow-2xl",
        ].join(" "),
        closeButton: [
          "right-4 top-4",
          "h-9 w-9 rounded-xl border border-slate-200 bg-white",
          "text-slate-500 shadow-sm",
          "hover:bg-slate-50 hover:text-slate-900",
        ].join(" "),
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 pr-14">
          <span className="text-lg font-bold text-slate-950">
            Scan Barcode
          </span>

          <span className="text-xs font-medium leading-5 text-slate-500">
            Point the camera at the CODE_128 label. Lookup starts
            automatically.
          </span>
        </ModalHeader>

        <ModalBody className="gap-3 px-5 py-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
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
              <div className="absolute inset-x-4 bottom-4 rounded-xl bg-white/95 px-4 py-3 text-center text-xs font-bold text-slate-700 shadow-lg">
                Barcode detected. Loading details...
              </div>
            )}
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-700">
              {errorMessage}
            </div>
          ) : (
            <p className="text-xs font-medium leading-5 text-slate-500">
              Keep the complete barcode inside the frame until the app detects
              it.
            </p>
          )}
        </ModalBody>

        <ModalFooter className="border-t border-slate-100 px-5 py-3">
          <Button
            size="sm"
            variant="bordered"
            radius="lg"
            onPress={() => onOpenChange(false)}
            className="border-slate-200 px-5 font-semibold text-slate-600"
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function BarcodeLookupResult({ detail }: { detail: TrackingDetail }) {
  const appointmentTest = detail.appointmentTest;

  const reportStatus =
    appointmentTest.reportStatus ??
    (appointmentTest.readyForReportAt ? "Completed" : "Pending");

  const statusItems = [
    {
      label: "Workflow",
      value: humanize(appointmentTest.workflowStatus),
      tone: workflowTone(appointmentTest.workflowStatus),
      icon: <FiActivity className="h-4 w-4" />,
    },
    {
      label: "Payment",
      value: paymentLabel(appointmentTest.paymentStatus),
      tone: paymentTone(appointmentTest.paymentStatus),
      icon: <FiCreditCard className="h-4 w-4" />,
    },
    {
      label: "Sample",
      value: sampleLabel(appointmentTest.sampleStatus),
      tone: sampleTone(appointmentTest.sampleStatus),
      icon: <FiPackage className="h-4 w-4" />,
    },
    {
      label: "Report",
      value: reportLabel(reportStatus),
      tone: reportTone(reportStatus),
      icon: <FiFileText className="h-4 w-4" />,
    },
  ];

  const latestEvents = [...detail.events]
    .sort((firstEvent, secondEvent) => {
      const firstDate = safeDate(firstEvent.createdAt)?.getTime() ?? 0;
      const secondDate = safeDate(secondEvent.createdAt)?.getTime() ?? 0;

      return secondDate - firstDate;
    })
    .slice(0, 3);

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid gap-3 p-3 min-[560px]:grid-cols-[minmax(0,1fr)_minmax(250px,300px)] sm:gap-4 sm:p-4">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 sm:h-14 sm:w-14">
              <FiActivity className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>

            <div className="min-w-0">
              <p
                className="truncate text-sm font-bold text-slate-950 sm:text-base"
                title={appointmentTest.testName ?? "-"}
              >
                {appointmentTest.testName ?? "-"}
              </p>

              <div className="mt-1.5 space-y-1.5 sm:mt-2">
                <div className="flex min-w-0 items-center gap-2 text-xs">
                  <FiUser className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                  <span className="shrink-0 font-medium text-slate-500">
                    Patient:
                  </span>

                  <span
                    className="truncate font-semibold text-slate-800"
                    title={appointmentTest.patientName ?? "-"}
                  >
                    {appointmentTest.patientName ?? "-"}
                  </span>
                </div>

                <div className="flex min-w-0 items-center gap-2 text-xs">
                  <FiUser className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                  <span className="shrink-0 font-medium text-slate-500">
                    Doctor:
                  </span>

                  <span
                    className="truncate font-semibold text-slate-800"
                    title={appointmentTest.doctorName ?? "-"}
                  >
                    {appointmentTest.doctorName ?? "-"}
                  </span>
                </div>

                <div className="flex min-w-0 items-center gap-2 text-xs">
                  <FiTag className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                  <span className="shrink-0 font-medium text-slate-500">
                    Test ID:
                  </span>

                  <span className="truncate font-mono text-[11px] font-bold text-primary">
                    {appointmentTest.uniqueTestId ?? "--"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            {statusItems.map((item) => (
              <LookupStatusCard
                key={item.label}
                label={item.label}
                value={item.value}
                tone={item.tone}
                icon={item.icon}
              />
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <FiClock className="h-4 w-4" />
          </div>

          <p className="shrink-0 text-sm font-bold text-slate-950">
            Recent Activity
          </p>

          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {latestEvents.length > 0 ? (
          <div className="space-y-2">
            {latestEvents.map((event) => (
              <div
                key={`${event.id}-${event.createdAt}`}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2.5 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 sm:h-9 sm:w-9">
                    <FiCheckCircle className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p
                      className="truncate text-xs font-bold text-slate-900"
                      title={event.title}
                    >
                      {event.title}
                    </p>

                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                      Workflow status updated successfully.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 pl-10 text-[11px] font-semibold text-slate-500 sm:pl-0">
                  <FiCalendar className="h-3.5 w-3.5" />
                  {formatTimestamp(event.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <FiClock className="mx-auto h-5 w-5 text-slate-300" />

            <p className="mt-2 text-xs font-semibold text-slate-600">
              No recent activity
            </p>

            <p className="mt-1 text-[11px] font-medium text-slate-400">
              Workflow updates will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
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

  const lookupDetail = barcodeLookupData?.data;
  const appointmentTestId = lookupDetail?.appointmentTest.id;

  useEffect(() => {
    if (!isOpen) {
      onClose?.();
    }
  }, [isOpen, onClose]);

  const stopBarcodeScanner = useCallback(() => {
    if (barcodeFrameRef.current !== null) {
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
    if (!isOpen) return;

    setBarcodeScanValue(initialValue);
    resetBarcodeLookup();

    if (initialValue.trim()) {
      void lookupBarcodeValue(initialValue);
    }
  }, [
    isOpen,
    initialValue,
    resetBarcodeLookup,
    lookupBarcodeValue,
  ]);

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
            facingMode: {
              ideal: "environment",
            },
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
            currentVideo.readyState >=
              HTMLMediaElement.HAVE_CURRENT_DATA &&
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

                if (!isCancelled) {
                  setIsBarcodeScannerOpen(false);
                }

                return;
              }
            } catch {
              setBarcodeScannerError(
                "Could not read the barcode yet. Keep the label centered and steady.",
              );
            }
          }

          barcodeFrameRef.current = requestAnimationFrame(scanFrame);
        };

        barcodeFrameRef.current = requestAnimationFrame(scanFrame);
      } catch (error) {
        setBarcodeScannerError(
          getLabApiErrorMessage(
            error,
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
  }, [
    isBarcodeScannerOpen,
    lookupBarcodeValue,
    stopBarcodeScanner,
  ]);

  const openTrackingByAppointmentTestId = (
    nextAppointmentTestId: string,
  ) => {
    if (!nextAppointmentTestId) return;

    onOpenChange(false);

    navigate(
      `/lab/tests/${encodeURIComponent(
        nextAppointmentTestId,
      )}/sample-tracking`,
    );
  };

  const handlePrintLabel = () => {
    if (!lookupDetail) return;

    window.print();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="center"
        size="xl"
        backdrop="opaque"
        scrollBehavior="inside"
        classNames={{
          backdrop: "bg-slate-950/50 backdrop-blur-sm",
          wrapper: "items-center p-2 sm:p-4",
          base: [
            "mx-2 w-[calc(100vw-16px)] max-w-[680px] sm:mx-0",
            "max-h-[calc(100dvh-16px)] overflow-hidden",
            "rounded-2xl border border-slate-200 bg-white sm:rounded-3xl",
            "shadow-[0_24px_70px_-20px_rgba(15,23,42,0.45)]",
          ].join(" "),
          closeButton: [
            "right-3 top-3 z-20 sm:right-4 sm:top-4",
            "h-8 w-8 rounded-xl sm:h-9 sm:w-9",
            "border border-slate-200 bg-white",
            "text-slate-500 shadow-sm",
            "hover:bg-slate-50 hover:text-slate-950",
            "active:scale-95",
          ].join(" "),
        }}
      >
        <ModalContent>
          <ModalHeader className="shrink-0 border-b border-slate-100 px-4 py-3 pr-12 sm:px-5 sm:py-4 sm:pr-14">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FiSearch className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-950">
                    Barcode Lookup
                  </h2>

                  <LabScreenInfoTooltip
                    title="Barcode Lookup"
                    description="Use barcode lookup to find a lab test by its printed CODE_128 label and open the matching sample tracking workflow."
                    items={[
                      "Scan labels from sample tubes or printed reports when you need to confirm the current workflow status.",
                      "If scanning is unavailable, paste or enter the barcode value and run lookup from the sidebar field.",
                    ]}
                    placement="bottom"
                    guideSection="lab"
                    linkLabel="Read full lab guide"
                  />
                </div>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="overflow-x-hidden px-3 py-3 sm:px-5 sm:py-4">
            {lookupDetail ? (
              <BarcodeLookupResult detail={lookupDetail} />
            ) : isLookingUpBarcode ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-8">
                <Spinner size="md" color="primary" />

                <p className="mt-3 text-sm font-bold text-slate-700">
                  Loading barcode details
                </p>

                <p className="mt-1 text-center text-xs font-medium text-slate-500">
                  Please wait while the test information is retrieved.
                </p>
              </div>
            ) : barcodeScanValue ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <FiSearch className="h-5 w-5" />
                </div>

                <p className="mt-3 text-sm font-bold text-slate-800">
                  No lookup details available
                </p>

                <p className="mt-1 max-w-sm text-xs font-medium leading-5 text-slate-500">
                  Check the barcode value and try scanning the label again.
                </p>

                <Button
                  size="sm"
                  variant="bordered"
                  radius="lg"
                  startContent={<FiSearch className="h-4 w-4" />}
                  onPress={() => setIsBarcodeScannerOpen(true)}
                  className="mt-3 border-slate-200 font-semibold text-slate-700"
                >
                  Scan Again
                </Button>
              </div>
            ) : (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FiSearch className="h-5 w-5" />
                </div>

                <p className="mt-3 text-sm font-bold text-slate-800">
                  Scan a barcode to continue
                </p>

                <p className="mt-1 max-w-sm text-xs font-medium leading-5 text-slate-500">
                  Scan a printed CODE_128 label to view its workflow, payment,
                  sample and report status.
                </p>

                <Button
                  size="sm"
                  color="primary"
                  radius="lg"
                  startContent={<FiSearch className="h-4 w-4" />}
                  onPress={() => setIsBarcodeScannerOpen(true)}
                  className="mt-3 font-semibold"
                >
                  Open Camera Scanner
                </Button>
              </div>
            )}
          </ModalBody>

          {lookupDetail && (
            <ModalFooter className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/40 px-3 py-2 sm:flex sm:items-center sm:justify-between sm:px-5 sm:py-3">
              <Button
                size="sm"
                variant="bordered"
                radius="lg"
                startContent={<FiPrinter className="h-4 w-4" />}
                onPress={handlePrintLabel}
                className="order-2 w-full cursor-pointer border-slate-200 bg-white font-semibold text-slate-700 sm:order-1 sm:w-auto"
              >
                Print Label
              </Button>

              <Button
                size="sm"
                variant="bordered"
                radius="lg"
                onPress={() => onOpenChange(false)}
                className="order-3 w-full cursor-pointer border-slate-200 bg-white px-5 font-semibold text-slate-600 sm:order-2 sm:ml-auto sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                color="primary"
                radius="lg"
                isDisabled={!appointmentTestId}
                endContent={<FiArrowRight className="h-4 w-4" />}
                onPress={() => {
                  if (appointmentTestId) {
                    openTrackingByAppointmentTestId(appointmentTestId);
                  }
                }}
                className="order-1 col-span-2 w-full cursor-pointer px-5 font-semibold text-white shadow-sm sm:order-3 sm:col-span-1 sm:w-auto"
              >
                Continue to Sample Work
              </Button>
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>

      <BarcodeCameraScannerModal
        isOpen={isBarcodeScannerOpen}
        videoRef={barcodeVideoRef}
        errorMessage={barcodeScannerError}
        isLoading={isLookingUpBarcode}
        onOpenChange={(open) => {
          setIsBarcodeScannerOpen(open);

          if (!open) {
            setBarcodeScannerError("");
          }
        }}
      />
    </>
  );
}
