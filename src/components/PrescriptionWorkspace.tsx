import { Button, useDisclosure } from "@heroui/react";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiActivity, FiAlertCircle, FiCheckCircle, FiChevronDown, FiEye, FiFileText, FiRotateCw, FiSettings, FiX } from "react-icons/fi";

import {
  emptyPrescriptionDetails,
  type PrescriptionDetailsValue,
} from "./prescription/PrescriptionDetails";
import Tooltip from "./shared/Tooltip";
import { PrescriptionToast } from "./prescription/PrescriptionWorkspaceUi";
import PrescriptionCompletedList from "./prescription/workspace/components/PrescriptionCompletedList";
import PrescriptionMedicineSidebar from "./prescription/workspace/components/PrescriptionMedicineSidebar";
import ClinicalDrawer from "./prescription/workspace/components/ClinicalDrawer";
import PrescriptionRightPanel from "./prescription/workspace/components/PrescriptionRightPanel";
import PrescriptionSummarySection from "./prescription/workspace/components/PrescriptionSummarySection";
import PrescriptionClinicalContextBar from "./prescription/workspace/components/PrescriptionClinicalContextBar";
import PrescriptionWorkspaceHeader from "./prescription/workspace/components/PrescriptionWorkspaceHeader";
import PrescriptionPreviewSummary from "./prescription/workspace/components/PrescriptionPreviewSummary";
import AddMedicineModal from "./prescription/workspace/components/modals/AddMedicineModal";
import CompletedPrescriptionEditModal from "./prescription/workspace/components/modals/CompletedPrescriptionEditModal";
import PrescriptionHistoryModal from "./prescription/workspace/components/modals/PrescriptionHistoryModal";
import {
  applyQuickDose,
  getDefaultDoseForForm,
} from "./prescription/workspace/helpers/doseHelpers";
import { buildReportCardPayload } from "./prescription/workspace/helpers/reportPayloadHelpers";
import {
  dedupeMeds,
  extractAnyForm,
  extractAnyId,
  extractAnyName,
  extractAnyStrength,
  getMedicineDetailsForForm,
  isValidMedicineName,
  makeMedKey,
  medicineNameKey,
  medicineNameStrengthKey,
  normalizeKey,
  normalizeSelectedMedBasic,
} from "./prescription/workspace/helpers/medicineMappers";
import { parsePrescriptionInput } from "./prescription/workspace/helpers/prescriptionSyntax";
import { rankMedicines } from "./prescription/workspace/helpers/medicineSearch";
import type {
  PrescriptionWorkspaceProps,
  SelectedMed,
} from "./prescription/workspace/types";

import {
  useCreateReportCardMutation,
  useUpdateReportCardMutation,
} from "../redux/api/reportApi";

import {
  useCreateMedicineMutation,
  useGetDoctorTopUsedMedicinesQuery,
  useGetMedicinesQuery,
  useToggleFavoriteMedicineMutation,
  type CreateMedicineRequest,
  type MedicineDto,
} from "../redux/api/medicineApi";
import { useGetStockCacheQuery } from "../redux/api/pharmaciesApi";

/** ✅ appointment complete API */
import { useUpdateAppointmentMutation } from "../redux/api/appointmentApi";
import { useGetReportCardsByPatientIdQuery } from "../redux/api/patientApi";
import { useDebounce } from "use-debounce";

export type {
  Dose,
  DoseFrequency,
  MedicineDetails,
  SelectedMed,
} from "./prescription/workspace/types";

/* ----------------------------- Utils ---------------------------- */

const MIN_CHARS = 2;
const FORMS_REQUIRING_TIMING = new Set([
  "tablet",
  "capsule",
  "lozenge",
  "syrup",
  "suspension",
]);

const PRESCRIPTION_PREVIEW_DEFAULT_WIDTH = 794;
const PRESCRIPTION_PREVIEW_DEFAULT_HEIGHT = 1123;

const safeStateSignature = (value: unknown) => {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return String(value);
  }
};

const getSelectedMedsSignature = (meds: SelectedMed[]) =>
  safeStateSignature(
    meds.map((m) => ({
      id: String(m.id ?? ""),
      name: String(m.name ?? ""),
      dose: m.dose ?? null,
      details: m.details ?? null,
    })),
  );

const sanitizeSelectedMedicineList = (meds: SelectedMed[]) =>
  dedupeMeds(
    meds.filter((m) =>
      isValidMedicineName(m.details?.medicineName || m.name),
    ),
  );

const buildStockCacheKey = (name?: string | null) => normalizeKey(name || "");

/* --------- CollapsiblePanel for collapse mode ---------- */
const CollapsiblePanel: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, subtitle, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={[
      "rounded-lg border bg-white overflow-hidden transition-shadow duration-200",
      isOpen
        ? "border-teal-200 shadow-sm dark:border-teal-800/40"
        : "border-slate-100 dark:border-[#1e293b] hover:border-slate-200 dark:hover:border-[#273244]",
      "dark:bg-[#0f172a]",
    ].join(" ")}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-slate-25 dark:hover:bg-[#1e293b]/50"
      >
        <span className="shrink-0 grid h-7 w-7 place-items-center rounded-md bg-teal-50 dark:bg-teal-900/20">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-text leading-tight">{title}</div>
          <div className="text-[10px] text-text-subtle truncate leading-tight mt-0.5">{subtitle}</div>
        </div>
        <FiChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 dark:border-[#1e293b]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

/* --------- debounce helper ---------- */
const useDebounced = (value: string, delay = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

/* --------- Preview iframe — renders live with the doctor's selected template --------- */
const PreviewIframe: React.FC<{ appointmentId: string; meds?: SelectedMed[]; details?: any; patient?: any; doctor?: any; clinic?: any }> = ({ appointmentId, meds = [], details = {}, patient, doctor }) => {
  const [html, setHtml] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const previewViewportRef = React.useRef<HTMLDivElement | null>(null);
  const previewIframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const [previewViewportWidth, setPreviewViewportWidth] = React.useState(0);
  const [previewDocumentSize, setPreviewDocumentSize] = React.useState({
    width: PRESCRIPTION_PREVIEW_DEFAULT_WIDTH,
    height: PRESCRIPTION_PREVIEW_DEFAULT_HEIGHT,
  });

  // Debounce: only re-render after 600ms of inactivity
  const [debouncedMeds] = useDebounce(meds, 600);
  const [debouncedDetails] = useDebounce(details, 600);

  React.useEffect(() => {
    const element = previewViewportRef.current;

    if (!element) return;

    const updateWidth = () => {
      const nextWidth = Math.floor(element.getBoundingClientRect().width);

      setPreviewViewportWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);

      return () => window.removeEventListener("resize", updateWidth);
    }

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [html, loading]);

  React.useEffect(() => {
    setPreviewDocumentSize({
      width: PRESCRIPTION_PREVIEW_DEFAULT_WIDTH,
      height: PRESCRIPTION_PREVIEW_DEFAULT_HEIGHT,
    });
  }, [html]);

  const syncPreviewDocumentSize = React.useCallback(() => {
    const doc = previewIframeRef.current?.contentDocument;

    if (!doc) return;

    const body = doc.body;
    const root = doc.documentElement;
    const nextWidth = Math.ceil(Math.max(
      PRESCRIPTION_PREVIEW_DEFAULT_WIDTH,
      root?.scrollWidth || 0,
      body?.scrollWidth || 0,
      root?.offsetWidth || 0,
      body?.offsetWidth || 0,
    ));
    const nextHeight = Math.ceil(Math.max(
      PRESCRIPTION_PREVIEW_DEFAULT_HEIGHT,
      root?.scrollHeight || 0,
      body?.scrollHeight || 0,
      root?.offsetHeight || 0,
      body?.offsetHeight || 0,
    ));

    setPreviewDocumentSize((currentSize) =>
      currentSize.width === nextWidth && currentSize.height === nextHeight
        ? currentSize
        : { width: nextWidth, height: nextHeight },
    );
  }, []);

  const previewScale = React.useMemo(() => {
    if (!previewViewportWidth) return 0;

    return Math.min(1, previewViewportWidth / previewDocumentSize.width);
  }, [previewDocumentSize.width, previewViewportWidth]);

  const previewScaledWidth = Math.ceil(previewDocumentSize.width * previewScale);
  const previewScaledHeight = Math.ceil(previewDocumentSize.height * previewScale);
  const previewScrollbarReset = "<style>html,body{margin:0;overflow:hidden;background:#fff}::-webkit-scrollbar{display:none}*{scrollbar-width:none;-ms-overflow-style:none}</style>";
  const withPreviewStyles = React.useCallback((sourceHtml: string) => (
    sourceHtml.includes("</head>")
      ? sourceHtml.replace("</head>", `${previewScrollbarReset}</head>`)
      : `${previewScrollbarReset}${sourceHtml}`
  ), [previewScrollbarReset]);

  const renderScaledPreview = (sourceHtml: string, title: string) => (
    <div ref={previewViewportRef} className="no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden bg-white">
      {previewScale > 0 ? (
        <div
          className="mx-auto overflow-hidden bg-white"
          style={{
            width: previewScaledWidth,
            height: previewScaledHeight,
          }}
        >
          <iframe
            ref={previewIframeRef}
            srcDoc={withPreviewStyles(sourceHtml)}
            title={title}
            className="block border-0"
            scrolling="no"
            onLoad={syncPreviewDocumentSize}
            style={{
              backgroundColor: "white",
              width: previewDocumentSize.width,
              height: previewDocumentSize.height,
              transform: `scale(${previewScale})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-[11px] text-slate-400">
          Preparing preview...
        </div>
      )}
    </div>
  );

  React.useEffect(() => {
    let cancelled = false;
    const render = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || "";
        const baseUrl = (typeof window !== 'undefined' && window.localStorage?.getItem('API_BASE_URL') || import.meta.env.VITE_API_BASE_URL) || "";

        // Build prescriptions array matching the template's expected shape
        const prescriptions = debouncedMeds.map((m) => ({
          medicineName: m.details?.medicineName || m.name || "",
          form: m.details?.form || "",
          composition: m.details?.composition || "",
          strength: m.details?.strength || "",
          dosage: m.details?.dosage || "",
          frequency: m.details?.frequency || "",
          duration: m.details?.duration || "",
          notes: m.details?.notes || "",
        }));

        const patientData = patient ? {
          name: patient.name || "",
          age: String(patient.age || ""),
          gender: patient.gender || "",
          address: patient.address || "",
          mobile: patient.mobile || "",
        } : undefined;

        const res = await fetch(`${baseUrl}/reports/preview-prescription-template`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appointmentId: appointmentId || undefined,
            prescriptions: prescriptions.length > 0 ? prescriptions : undefined,
            patient: patientData,
            diagnosis: debouncedDetails.diagnosis || debouncedDetails.provisionalDiagnosis || undefined,
            advice: debouncedDetails.advice || undefined,
            followUpDate: debouncedDetails.followUpDate || undefined,
            vitals: debouncedDetails.vitals || undefined,
            additionalInformation:
              debouncedDetails.additionalInformation &&
                Object.keys(debouncedDetails.additionalInformation).length > 0
                ? debouncedDetails.additionalInformation
                : undefined,
          }),
        });

        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data?.html) setHtml(data.html);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    };

    render();
    return () => { cancelled = true; };
  }, [debouncedMeds, debouncedDetails, patient, appointmentId]);

  if (loading && !html) return <div className="flex items-center justify-center h-full text-[11px] text-slate-400">Loading preview...</div>;

  if (html) {
    return renderScaledPreview(html, "Prescription Preview");
  }

  // Fallback: basic draft if the endpoint fails
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const rows = meds.map((m, i) => `<tr style="border-bottom:1px solid #eee"><td style="padding:5px;color:#999">${i + 1}</td><td style="padding:5px"><b>${m.details?.medicineName || m.name || ""}</b></td><td style="padding:5px">${m.details?.dosage || ""}</td><td style="padding:5px">${m.details?.duration || ""}</td></tr>`).join("");
  const fallback = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:16px;font-size:11px;color:#333}.warn{background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:8px;margin-bottom:10px;font-size:10px;color:#9a3412;text-align:center}table{width:100%;border-collapse:collapse}th{text-align:left;padding:5px;border-bottom:1px solid #333;font-size:9px}</style></head><body><div class="warn">Draft preview — unable to load template</div><div style="font-weight:700;margin-bottom:4px">${patient?.name || ""} • ${today}</div>${meds.length > 0 ? `<div style="font-size:14px;margin:6px 0">℞</div><table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table>` : ""}<div style="text-align:right;margin-top:16px;font-weight:700">${doctor?.name || ""}</div></body></html>`;
  return renderScaledPreview(fallback, "Draft Preview");
};

/* ------------------------------- Component ------------------------------ */

const PrescriptionWorkspace: React.FC<PrescriptionWorkspaceProps> = ({
  ui = "classic",
  defaultSelected = [],
  defaultDetails = emptyPrescriptionDetails,
  onDone,
  patientId,
  appointmentId,
  doctorId,
  onRefreshAfterSave,
  appointmentStatus,
  onAddTest,
  addedTests,
  patient,
  doctor,
  clinic,
  onCompletionStateChange,
  hasManualPrescription = false,
  onViewManualPrescription,
  onReuploadManualPrescription,
  onMedicinesChange,
  onLiveStateChange,
  onViewDownload,
  isViewDownloadLoading,
  isViewDownloadDisabled,
  onDownloadPrescription,
  onPrintPrescription,
  prescribedAt,
  updatedAt,
  onOpenPreference,
}) => {
  /* ============================ MAIN STATES ============================ */
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [pendingAutoConfigureMedicineName, setPendingAutoConfigureMedicineName] =
    useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const defaultSelectedSignatureRef = useRef<string | null>(null);
  const defaultDetailsSignatureRef = useRef<string | null>(null);
  const liveStateSignatureRef = useRef<string | null>(null);
  const hasMedicinesRef = useRef<boolean | null>(null);

  const [selectedMeds, setSelectedMeds] = useState<SelectedMed[]>(() =>
    sanitizeSelectedMedicineList(
      (defaultSelected as any[]).map(normalizeSelectedMedBasic),
    ),
  );
  const [favoritePrescriptionName, setFavoritePrescriptionName] = useState("");
  // Lifted so the star trigger can sit in the search row while the dialog
  // stays in the summary section with the favourite-prescription logic.
  const [favouriteDialogOpen, setFavouriteDialogOpen] = useState(false);
  // Clinical sections live in an overlay drawer so the medicine table keeps
  // the full width whether it is open or closed.
  const [isClinicalDrawerOpen, setIsClinicalDrawerOpen] = useState(false);

  const [details, setDetails] =
    useState<PrescriptionDetailsValue>(defaultDetails);
  const [isPrescriptionHistoryOpen, setIsPrescriptionHistoryOpen] =
    useState(false);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);

  const { data: rxHistoryRes, isLoading: isRxHistoryLoading } =
    useGetReportCardsByPatientIdQuery(
      {
        patientId: patientId ?? "",
        pageNumber: 1,
        pageSize: 50,
        typeOfPaginations: "Prescriptions",
      },
      { skip: !patientId },
    );

  const rxHistory = useMemo(() => {
    const anyRes: any = rxHistoryRes;
    if (!anyRes) return [];

    const result = anyRes.result ?? anyRes;
    const raw = Array.isArray(result?.prescriptions)
      ? result.prescriptions
      : [];

    return raw.map((r: any) => ({
      id: r.id,
      appointmentId: r.appointmentId,
      date: r.appointmentDate
        ? new Date(r.appointmentDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
        : "—",
      appointmentTime: r.appointmentTime ?? "",
      prescriptionPdf: r.prescriptionPdf ?? null,
      doctorName: r.doctorName ?? null,
      doctorSpeciality: r.doctorSpeciality ?? null,
    }));
  }, [rxHistoryRes]);

  const resolvedDoctorId = useMemo(() => {
    const fromProp = String(doctorId ?? "").trim();
    if (fromProp) return fromProp;

    const detailsAny = defaultDetails as any;
    const fromDefaultDetails = String(
      detailsAny?.doctorId ??
      detailsAny?.appointmentDoctorId ??
      detailsAny?.appointment?.doctorId ??
      detailsAny?.reportCard?.doctorId ??
      "",
    ).trim();
    if (fromDefaultDetails) return fromDefaultDetails;

    const firstSelected: any = Array.isArray(defaultSelected)
      ? defaultSelected[0]
      : null;

    const fromSelected = String(
      firstSelected?.doctorId ??
      firstSelected?.appointmentDoctorId ??
      firstSelected?.appointment?.doctorId ??
      firstSelected?.reportCard?.doctorId ??
      "",
    ).trim();

    return fromSelected;
  }, [doctorId, defaultDetails, defaultSelected]);

  useEffect(() => {
    const hasMedicines = selectedMeds.length > 0;
    if (hasMedicinesRef.current === hasMedicines) return;

    hasMedicinesRef.current = hasMedicines;
    onMedicinesChange?.(hasMedicines);
  }, [selectedMeds.length, onMedicinesChange]);

  // Fire live state change for external preview panels
  useEffect(() => {
    if (!onLiveStateChange) return;

    const signature = safeStateSignature({
      details,
      meds: getSelectedMedsSignature(selectedMeds),
    });
    if (liveStateSignatureRef.current === signature) return;

    liveStateSignatureRef.current = signature;
    onLiveStateChange(selectedMeds, details);
  }, [selectedMeds, details, onLiveStateChange]);

  const [toast, setToast] = useState<{ show: boolean; msg: string }>({
    show: false,
    msg: "",
  });
  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 1600);
  };

  const statusLower = (appointmentStatus || "").trim().toLowerCase();
  const isCompleted = statusLower === "completed";
  const isConfirmed = statusLower === "confirmed" || statusLower === "completed";

  const [optimisticCompleted, setOptimisticCompleted] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState(false);

  const isCompletedView = (isCompleted || optimisticCompleted) && !isInlineEditing;
  const canEditPrescription = isInlineEditing || (isConfirmed && !isCompletedView);

  const lockMessage = isInlineEditing
    ? ""
    : !isConfirmed
      ? "Please confirm appointment first"
      : "Prescription editing is disabled";

  const showStockAvailability = clinic?.isPharmacyAvailable === true;

  const { data: stockCacheRes, isLoading: stockCacheLoading } =
    useGetStockCacheQuery(undefined, { skip: !showStockAvailability });

  const stockAvailabilityByName = useMemo(() => {
    const map = new Map<string, number>();
    if (!showStockAvailability) return map;

    const items = Array.isArray((stockCacheRes as any)?.data)
      ? ((stockCacheRes as any).data as any[])
      : [];

    items.forEach((item) => {
      const key = buildStockCacheKey(item?.medicineName);
      if (!key) return;
      map.set(key, Number(item?.availableQuantity ?? 0));
    });

    return map;
  }, [showStockAvailability, stockCacheRes]);
  /* ======================= IDs (create vs update) ======================= */
  const [reportCardId, setReportCardId] = useState<string | null>(null);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);

  useEffect(() => {
    if (reportCardId && prescriptionId) return;

    const d: any = defaultDetails as any;
    const fromDetailsReportCardId =
      d?.reportCardId || d?.reportCard?.id || d?.id || null;
    const fromDetailsPrescriptionId =
      d?.prescriptionId || d?.prescription?.id || null;

    const firstMed: any = (defaultSelected as any)?.[0];
    const fromMedsReportCardId =
      firstMed?.reportCardId || firstMed?.reportCard?.id || null;
    const fromMedsPrescriptionId =
      firstMed?.prescriptionId || firstMed?.prescription?.id || null;

    if (!reportCardId && (fromDetailsReportCardId || fromMedsReportCardId)) {
      setReportCardId(String(fromDetailsReportCardId || fromMedsReportCardId));
    }
    if (
      !prescriptionId &&
      (fromDetailsPrescriptionId || fromMedsPrescriptionId)
    ) {
      setPrescriptionId(
        String(fromDetailsPrescriptionId || fromMedsPrescriptionId),
      );
    }
  }, [defaultDetails, defaultSelected, reportCardId, prescriptionId]);

  /* ========================= SELECTION HELPERS ========================= */
  const selectedMedKeys = useMemo(() => {
    return new Set(
      selectedMeds.map((m) => makeMedKey({ id: m.id, name: m.name })),
    );
  }, [selectedMeds]);

  const isAlreadySelected = (m: { id?: any; name?: any; medicineId?: any }) => {
    const key = makeMedKey({
      id: extractAnyId(m),
      name: extractAnyName(m),
    });
    return key ? selectedMedKeys.has(key) : false;
  };

  /* ========================= RTK: TOP USED ========================= */
  const {
    data: topUsedRes,
    isLoading: topUsedLoading,
    isError: topUsedIsError,
    refetch: refetchTopUsed,
  } = useGetDoctorTopUsedMedicinesQuery();

  const [toggleFavorite] = useToggleFavoriteMedicineMutation();
  const [favoriteMedicineOverrides, setFavoriteMedicineOverrides] = useState<
    Record<string, boolean>
  >({});

  const topUsedMedicines: any[] = useMemo(() => {
    // Unwrapped inside the memo: the `?? []` fallback allocates a new array on
    // every render, so hoisting it out would break the memo it feeds.
    const rawTopUsed: any[] =
      (topUsedRes as any)?.data?.data ?? (topUsedRes as any)?.medicines ?? [];

    return rawTopUsed
      .map((x) => ({
        ...x,
        id: String(x?.medicineId ?? x?.id ?? ""), // keep for UI
        medicineId: String(x?.medicineId ?? x?.id ?? ""),
        name: (x?.medicineName ?? x?.name ?? "").toString(),
        medicineName: (x?.medicineName ?? x?.name ?? "").toString(),
        strength: (x?.strength ?? "").toString(),
      }))
      .filter((x) => isValidMedicineName(x.medicineName || x.name));
  }, [topUsedRes]);

  const topUsedIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const x of topUsedMedicines) {
      const id = String(x?.medicineId ?? x?.id ?? "").trim();
      const name = String(x?.medicineName ?? x?.name ?? "").trim();
      if (id && name) map.set(medicineNameKey(name), id);
    }
    return map;
  }, [topUsedMedicines]);

  const topUsedIdByNameStrength = useMemo(() => {
    const map = new Map<string, string>();
    for (const x of topUsedMedicines) {
      const id = String(x?.medicineId ?? x?.id ?? "").trim();
      const name = String(x?.medicineName ?? x?.name ?? "").trim();
      const st = String(x?.strength ?? "").trim();
      if (id && name) map.set(medicineNameStrengthKey(name, st), id);
    }
    return map;
  }, [topUsedMedicines]);

  /**
   * Memoised because an effect depends on it and two child components take it
   * as a prop — a fresh function each render would re-run the canonicalisation
   * effect on every render and defeat those children's memoisation. Its only
   * inputs are the two lookup maps, which are themselves memoised.
   */
  const canonicalizeMedicineId = useCallback(
    (rawId: string, name?: string, strength?: string) => {
      const keyNS = medicineNameStrengthKey(name || "", strength || "");
      const keyN = medicineNameKey(name || "");
      return (
        topUsedIdByNameStrength.get(keyNS) || topUsedIdByName.get(keyN) || rawId
      );
    },
    [topUsedIdByName, topUsedIdByNameStrength],
  );

  const getSelectedMedicineFavoriteKey = (medicine: SelectedMed) => {
    const rawId = String(
      medicine.details?.medicineId ?? medicine.id ?? "",
    ).trim();
    const rawName = String(
      medicine.details?.medicineName ?? medicine.name ?? "",
    ).trim();
    const rawStrength = String(medicine.details?.strength ?? "").trim();
    const canonicalId = canonicalizeMedicineId(rawId, rawName, rawStrength);

    return (
      canonicalId ||
      rawId ||
      medicineNameStrengthKey(rawName, rawStrength)
    );
  };

  const isSelectedMedicineFavorite = (medicine: SelectedMed) => {
    const key = getSelectedMedicineFavoriteKey(medicine);
    const override = favoriteMedicineOverrides[key];

    if (typeof override === "boolean") return override;

    const rawId = String(
      medicine.details?.medicineId ?? medicine.id ?? "",
    ).trim();
    const rawName = String(
      medicine.details?.medicineName ?? medicine.name ?? "",
    ).trim();
    const rawStrength = String(medicine.details?.strength ?? "").trim();
    const canonicalId = canonicalizeMedicineId(rawId, rawName, rawStrength);
    const selectedNameStrengthKey = medicineNameStrengthKey(
      rawName,
      rawStrength,
    );

    return topUsedMedicines.some((item) => {
      const itemId = String(item?.medicineId ?? item?.id ?? "").trim();
      const itemName = String(item?.medicineName ?? item?.name ?? "").trim();
      const itemStrength = String(item?.strength ?? "").trim();
      const itemCanonicalId = canonicalizeMedicineId(
        itemId,
        itemName,
        itemStrength,
      );

      const sameMedicine =
        (canonicalId && canonicalId === itemCanonicalId) ||
        (rawId && rawId === itemId) ||
        selectedNameStrengthKey === medicineNameStrengthKey(itemName, itemStrength);

      return sameMedicine && item?.isFavorite === true;
    });
  };

  const toggleSelectedMedicineFavorite = async (medicine: SelectedMed) => {
    if (!canEditPrescription) {
      showToast("Please confirm the appointment first");
      return;
    }

    const rawId = String(
      medicine.details?.medicineId ?? medicine.id ?? "",
    ).trim();
    const rawName = String(
      medicine.details?.medicineName ?? medicine.name ?? "",
    ).trim();
    const rawStrength = String(medicine.details?.strength ?? "").trim();
    const medicineId = canonicalizeMedicineId(rawId, rawName, rawStrength);

    if (!medicineId) {
      showToast("Medicine id missing");
      return;
    }

    const key = getSelectedMedicineFavoriteKey(medicine);
    const nextFavorite = !isSelectedMedicineFavorite(medicine);

    try {
      await toggleFavorite(medicineId).unwrap();
      setFavoriteMedicineOverrides((prev) => ({
        ...prev,
        [key]: nextFavorite,
      }));
      refetchTopUsed();
      showToast(
        nextFavorite ? "Added to favorites" : "Removed from favorites",
      );
    } catch (error: any) {
      const errorMsg = error?.error || error?.data?.message || "";
      if (errorMsg.includes("Medicine not found")) {
        showToast("You can only favorite medicines you have created");
      } else {
        showToast("Failed to update favorite");
      }
    }
  };

  // ✅ After top-used loads, canonicalize any duplicate ids by name/strength
  useEffect(() => {
    if (topUsedIdByName.size === 0) return;

    setSelectedMeds((prev) =>
      sanitizeSelectedMedicineList(
        prev.map((m) => {
          const name = m.details?.medicineName || m.name;
          const st = m.details?.strength || "";
          const cid = canonicalizeMedicineId(
            String(m.id),
            String(name),
            String(st),
          );
          if (cid && cid !== m.id) return { ...m, id: cid };
          return m;
        }),
      ),
    );
  }, [topUsedIdByName, topUsedIdByNameStrength]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ========================= RTK: SEARCH (MAIN) ========================= */
  const debouncedRawQuery = useDebounced(query, 250);

  // One-line syntax: "DOLO 650 1-1-1 5d af" searches for "DOLO 650" and carries
  // the rest as dose overrides. Only the medicine part ever reaches the API.
  const parsedInput = useMemo(
    () => parsePrescriptionInput(debouncedRawQuery),
    [debouncedRawQuery],
  );
  const parsedLiveInput = useMemo(() => parsePrescriptionInput(query), [query]);
  const debouncedQuery = parsedInput.medicineTerm;

  const queryReady =
    canEditPrescription &&
    (ui === "tab"
      ? debouncedQuery.trim().length >= MIN_CHARS
      : focused && debouncedQuery.trim().length >= MIN_CHARS);

  const {
    data: medicinesRes,
    isLoading: medicinesLoading,
    error: medicinesError,
    refetch: refetchMedicines,
  } = useGetMedicinesQuery({ q: debouncedQuery.trim() }, { skip: !queryReady });

  const serverMedicines: MedicineDto[] = (medicinesRes as any)?.medicines ?? [];

  const filteredMedicines = useMemo(() => {
    const q = debouncedQuery.trim();
    if (q.length < MIN_CHARS) return [];

    // Ranked rather than merely filtered: index 0 is what Enter adds, so the
    // best match has to sort first. `rankMedicines` also tolerates a typo or
    // two ("DINAPAR" → "Dynapar"), which a plain `includes` could not.
    // NOTE: this only reorders what the server already returned — a clinic
    // medicine the search endpoint itself missed still won't appear here.
    const ranked = rankMedicines(serverMedicines, q, {
      isValid: isValidMedicineName,
      limit: 25,
      extraFields: (m: any) => [m?.category, m?.strength],
    });

    // Already-prescribed medicines are dropped rather than shown with a tick:
    // they are not a valid choice, and leaving them in pushed real options down
    // the list. Filtered here (not in the picker) so the keyboard cursor and
    // Enter-to-add always index into the same array that is rendered.
    return ranked.filter((m: any) => {
      const rawId = extractAnyId(m);
      const rawName = extractAnyName(m);
      const cid = canonicalizeMedicineId(rawId, rawName, extractAnyStrength(m));
      return !isAlreadySelected({ id: cid, name: rawName, medicineId: rawId });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, serverMedicines, selectedMeds]);

  const DEFAULT_FORM = "Tablet";
  const MEDICINE_FORM_NAMES = [
    "Tablet",
    "Capsule",
    "Lozenge",
    "Sachet",
    "Granules",
    "Powder",
    "Syrup",
    "Suspension",
    "Liquid",
    "Drops",
    "Cream",
    "Ointment",
    "Gel",
    "Lotion",
    "Paste",
    "Spray",
    "Foam",
    "Mouthwash",
    "Oral Rinse",
    "Dental Cement",
    "Dental Varnish",
    "Injection",
    "Inhaler",
    "Patch",
    "Suppository",
    "Shampoo",
    "Soap",
    "Facewash",
    "Conditioner",
    "Toothpaste",
    "Mouth Gel",
    "Handwash",
    "Sanitizer",
    "Oil",
  ];

  const FORM_ALIASES: Record<string, string[]> = {
    Tablet: ["tablet", "tablets", "tab", "tabs"],
    Capsule: ["capsule", "capsules", "cap", "caps"],
    Injection: ["injection", "injections", "inj"],
    Mouthwash: ["mouthwash", "mouth wash"],
    Facewash: ["facewash", "face wash"],
    Handwash: ["handwash", "hand wash"],
    Toothpaste: ["toothpaste", "tooth paste"],
  };

  const normalizeFormText = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const inferMedicineFormFromName = (name: string, fallbackForm = DEFAULT_FORM) => {
    const normalizedName = ` ${normalizeFormText(name)} `;
    if (!normalizedName.trim()) return fallbackForm;

    const candidates = MEDICINE_FORM_NAMES.map((form) => {
      const baseAlias = normalizeFormText(form);
      const aliases = FORM_ALIASES[form] ?? [baseAlias];
      const pluralAliases = aliases
        .filter((alias) => alias && !alias.endsWith("s"))
        .map((alias) => `${alias}s`);
      // The reverse direction: a canonical form that's already plural
      // ("Drops", "Granules") never generated a singular alias above, so a
      // medicine literally named "... Drop" or "... Granule" matched nothing
      // and silently fell back to no form. Strip a trailing "s" too.
      const singularAliases = aliases
        .filter((alias) => alias && alias.length > 3 && alias.endsWith("s"))
        .map((alias) => alias.slice(0, -1));

      return {
        form,
        aliases: Array.from(
          new Set([baseAlias, ...aliases, ...pluralAliases, ...singularAliases]),
        )
          .filter(Boolean)
          .sort((a, b) => b.length - a.length),
      };
    }).sort((a, b) => b.aliases[0].length - a.aliases[0].length);

    for (const candidate of candidates) {
      const hasMatch = candidate.aliases.some((alias) => {
        const pattern = new RegExp(`\\s${escapeRegExp(alias)}\\s`);
        return pattern.test(normalizedName);
      });

      if (hasMatch) return candidate.form;
    }

    return fallbackForm;
  };

  /* ========================= ADD NEW MEDICINE MODAL ========================= */
  const addModal = useDisclosure();
  const [createMedicine, { isLoading: creatingMedicine }] =
    useCreateMedicineMutation();
  type CreateMedicineWithFormRequest = CreateMedicineRequest & {
    form: string; // ✅ ensure form always present
    composition?: string;
    manufacturer?: string;
  };

  const [createForm, setCreateForm] = useState<CreateMedicineWithFormRequest>({
    name: "",
    composition: "",
    manufacturer: "",
    form: DEFAULT_FORM,
  });

  const openAddNew = (
    nameForPrefill?: string,
    compositionForPrefill?: string,
    manufacturerForPrefill?: string,
  ) => {
    const name = (nameForPrefill || "").trim();

    setCreateForm({
      name,
      composition: (compositionForPrefill || "").trim(),
      manufacturer: (manufacturerForPrefill || "").trim(),
      form: inferMedicineFormFromName(name),
    });
    addModal.onOpen();
  };

  const submitCreateMedicine = async () => {
    const name = (createForm.name || "").trim().toUpperCase();
    const form = (createForm.form || DEFAULT_FORM).trim();
    const composition = (createForm.composition || "").trim();
    const manufacturer = (createForm.manufacturer || "").trim();

    if (!name) return showToast("Medicine name required");

    const body: CreateMedicineWithFormRequest = {
      name,
      form,
      composition: composition || undefined,
      manufacturer: manufacturer || undefined,
    };

    try {
      await createMedicine(body).unwrap();
      showToast("Medicine created");
      addModal.onClose();

      setCreateForm({
        name: "",
        composition: "",
        manufacturer: "",
        form: DEFAULT_FORM,
      });

      setQuery(name);
      setFocused(true);
      setHighlight(0);
      refetchTopUsed();
    } catch (e: any) {
      const msg = e?.data?.message || e?.error || e?.message || "Create failed";
      showToast(msg);
    }
  };

  /* ========================= DIRECT ADD (MAIN) ========================= */
  const [hasSavedReportCard, setHasSavedReportCard] = useState(false);

  // ✅ UPDATE this existing function
  const addMedicineDirect = (
    m: any,
    quick?: {
      pattern?: string;
      days?: number;
      timing?: string;
      frequency?: "daily" | "weekly";
      instruction?: string;
    },
  ) => {
    if (!canEditPrescription) {
      showToast("Please confirm the appointment first");
      return;
    }

    const rawId = extractAnyId(m);
    const rawName = extractAnyName(m).toUpperCase();
    const rawStrength = extractAnyStrength(m);
    const rawForm = extractAnyForm(m) || "Tablet";

    if (!isValidMedicineName(rawName)) {
      showToast("Invalid medicine result");
      return;
    }

    const medId = canonicalizeMedicineId(rawId, rawName, rawStrength);

    if (isAlreadySelected({ id: medId, name: rawName })) {
      showToast("Already added");
      return;
    }

    // Start from the form default, then apply any quick schedule/duration/
    // timing the doctor chose inline in the picker.
    const dose = applyQuickDose(getDefaultDoseForForm(rawForm), quick);

    const md = getMedicineDetailsForForm(
      { ...m, name: rawName, strength: rawStrength },
      rawForm,
      dose,
    );

    if (quick?.timing) {
      md.notes = quick.timing;
    }

    if (quick?.instruction && quick.instruction.trim()) {
      md.dosage = quick.instruction.trim();
    }

    const toAdd: SelectedMed = {
      id: String(medId),
      name: rawName,
      image: null,
      dose,
      details: md,
    };

    setSelectedMeds((prev) => dedupeMeds([toAdd, ...prev]));
    setHasSavedReportCard(false);
    showToast("Added");
  };

  const removeMedicineDirect = (m: any) => {
    if (!canEditPrescription) {
      showToast("Please confirm the appointment first");
      return;
    }

    const rawId = extractAnyId(m);
    const rawName = extractAnyName(m);
    const rawStrength = extractAnyStrength(m);
    const medId = canonicalizeMedicineId(rawId, rawName, rawStrength);
    const targetKey = makeMedKey({ id: medId, name: rawName });

    if (!targetKey) return;

    setSelectedMeds((prev) => {
      const next = prev.filter(
        (selected) =>
          makeMedKey({ id: selected.id, name: selected.name }) !== targetKey,
      );

      if (next.length === 0) {
        setFavoritePrescriptionName("");
      }

      return next;
    });
    setHasSavedReportCard(false);
  };

  /* ========================= SEARCH KEYBOARD (MAIN - classic) ========================= */
  // The highlighted row is now rendered by the picker (it previously moved an
  // invisible cursor), so these keys are the primary way to prescribe: type,
  // arrow to the right medicine, Enter. Enter deliberately keeps the field
  // focused and only clears the query, so the next medicine follows straight on
  // without a click back into the search box.
  const onKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (ui === "tab") return;
    if (!focused) return;

    if (["ArrowDown", "ArrowUp", "Enter", "Escape", "Home", "End"].includes(e.key))
      e.preventDefault();

    const lastIndex = Math.max(filteredMedicines.length - 1, 0);

    if (e.key === "ArrowDown") {
      setHighlight((h) => Math.min(h + 1, lastIndex));
    } else if (e.key === "ArrowUp") {
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Home") {
      setHighlight(0);
    } else if (e.key === "End") {
      setHighlight(lastIndex);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
    // Enter is handled by the picker itself — it owns the dose memory needed to
    // resolve a dose for the highlighted row.
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ui === "tab") return;
      if (!boxRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!boxRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [ui]);

  /* ========================= SYNC FROM PARENT ========================= */
  useEffect(() => {
    if (!defaultSelected) return;

    const normalized = (defaultSelected as any[]).map(
      normalizeSelectedMedBasic,
    );
    const signature = getSelectedMedsSignature(normalized);

    if (defaultSelectedSignatureRef.current === signature) return;
    defaultSelectedSignatureRef.current = signature;

    setSelectedMeds(sanitizeSelectedMedicineList(normalized));
  }, [defaultSelected]);

  useEffect(() => {
    if (!defaultDetails) return;

    const signature = safeStateSignature(defaultDetails);
    if (defaultDetailsSignatureRef.current === signature) return;

    defaultDetailsSignatureRef.current = signature;
    setDetails((prev) =>
      safeStateSignature(prev) === signature ? prev : defaultDetails,
    );
  }, [defaultDetails]);

  /* ========================= SAVE (reports/card) ========================= */
  const [createReportCard, { isLoading: creatingRC }] =
    useCreateReportCardMutation();
  const [updateReportCard, { isLoading: updatingRC }] =
    useUpdateReportCardMutation();

  const savingReportCard = creatingRC || updatingRC;

  const handleDetailsChange = useCallback((next: PrescriptionDetailsValue) => {
    if (!canEditPrescription) return;
    setDetails(next);
    setHasSavedReportCard(false);
  }, [canEditPrescription]);

  const validateMedicinesForSave = (
    medsToSave: SelectedMed[],
    opts?: { silent?: boolean; allowMissingDosage?: boolean },
  ) => {
    if (!opts?.allowMissingDosage) {
      const missingDosage = medsToSave.filter(
        (m) => !m.details?.dosage || m.details.dosage.trim() === "",
      );

      if (missingDosage.length > 0) {
        const medicineNames = missingDosage
          .map((m) => m.details?.medicineName || m.name)
          .join(", ");
        if (!opts?.silent) {
          showToast(`Please add dosage for: ${medicineNames}`);
        }
        return false;
      }
    }

    const missingCustomTiming = medsToSave.filter((m) => {
      const formKey = normalizeKey(
        m.details?.form ?? (m as any)?.form ?? "",
      );

      return (
        FORMS_REQUIRING_TIMING.has(formKey) &&
        (!m.details?.notes || m.details.notes.trim() === "")
      );
    });

    if (missingCustomTiming.length > 0) {
      const medicineNames = missingCustomTiming
        .map((m) => m.details?.medicineName || m.name)
        .join(", ");

      if (!opts?.silent) {
        showToast(`Please add custom timing for: ${medicineNames}`);
      }

      return false;
    }

    return true;
  };

  const saveReportCardFor = async (
    medsToSave: SelectedMed[],
    detailsToSave: PrescriptionDetailsValue,
    opts?: { silent?: boolean; allowMissingDosage?: boolean },
  ): Promise<boolean> => {
    if (!patientId || !appointmentId) {
      if (!opts?.silent) showToast("Missing patient / appointment id");
      return false;
    }
    if (!medsToSave.length) {
      if (!opts?.silent) showToast("Add at least one medicine");
      return false;
    }

    if (!validateMedicinesForSave(medsToSave, opts)) {
      return false;
    }

    const payload = {
      ...buildReportCardPayload(
        patientId,
        appointmentId,
        detailsToSave,
        medsToSave,
      ),
      favouritePrescriptionName: favoritePrescriptionName.trim(),
    };
    if (payload.prescriptions.length === 0) {
      if (!opts?.silent) {
        showToast("Please add dosage for all medicines before saving");
      }
      return false;
    }

    try {
      if (!reportCardId || !prescriptionId) {
        const res: any = await createReportCard(payload).unwrap();

        const rcId =
          res?.reportCardId ??
          res?.data?.reportCardId ??
          res?.data?.reportCard?.id ??
          res?.reportCard?.id ??
          null;

        const rxId =
          res?.prescriptionId ??
          res?.data?.prescriptionId ??
          res?.data?.prescription?.id ??
          res?.data?.prescriptions?.[0]?.id ??
          res?.prescriptions?.[0]?.id ??
          res?.prescription?.id ??
          null;

        if (rcId) setReportCardId(String(rcId));
        if (rxId) setPrescriptionId(String(rxId));
      } else {
        await updateReportCard({
          reportCardId,
          prescriptionId,
          body: payload,
        } as any).unwrap();
      }

      // ✅ After saving the report card, also sync vitals to the appointment
      // so doctor-side vitals are always stored/read from the appointments table.
      const v = (detailsToSave as any)?.vitals;
      if (v && appointmentId) {
        await updateAppointment({
          appointmentId,
          data: {
            vitals: {
              bpSys: v.bpSys ?? null,
              bpDia: v.bpDia ?? null,
              pulse: v.pulse ?? null,
              spo2: v.spo2 ?? null,
              temperatureC: v.temperatureC ?? null,
              heightCm: v.heightCm ?? null,
              weightKg: v.weightKg ?? null,
              bmi: v.bmi ?? null,
            },
          } as any,
        }).unwrap();
      }

      setHasSavedReportCard(true);
      onRefreshAfterSave?.();
      onDone?.(medsToSave, detailsToSave);
      if (!opts?.silent) showToast("Saved");
      return true;
    } catch (err: any) {
      const msg =
        err?.data?.message || err?.error || err?.message || "Failed to save";
      if (!opts?.silent) showToast(msg);
      return false;
    }
  };

  const saveReportCard = async () =>
    saveReportCardFor(selectedMeds, details, { allowMissingDosage: true });

  /* ========================= COMPLETE (appointments/:id) ========================= */
  const [updateAppointment, { isLoading: completingAppt }] =
    useUpdateAppointmentMutation();

  const completeAllInOne = async () => {
    if (!appointmentId) {
      showToast("Missing appointment id");
      return;
    }

    if (!isConfirmed) {
      showToast("Please confirm the appointment first");
      return;
    }

    // ✅ second screen turant dikhao
    setOptimisticCompleted(true);
    setIsInlineEditing(false);

    onCompletionStateChange?.({
      isProcessing: true,
      isSuccess: false,
      error: null,
    });

    const ok = await saveReportCard();

    if (!ok) {
      // ✅ fail hua to old editor screen par wapas
      setOptimisticCompleted(false);
      setIsInlineEditing(true); // Stay in editing mode on failure

      onCompletionStateChange?.({
        isProcessing: false,
        isSuccess: false,
        error: "Failed to save prescription",
      });
      return;
    }

    try {
      await updateAppointment({
        appointmentId,
        data: { appointmentStatus: "Completed" },
      } as any).unwrap();

      onRefreshAfterSave?.();

      onCompletionStateChange?.({
        isProcessing: false,
        isSuccess: true,
        error: null,
      });

      showToast("Appointment completed");
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.error ||
        err?.message ||
        "Failed to complete appointment";

      // ✅ fail hua to old editor screen par wapas
      setOptimisticCompleted(false);

      onCompletionStateChange?.({
        isProcessing: false,
        isSuccess: false,
        error: msg,
      });

      showToast(msg);
    }
  };
  /* ========================= RESET ========================= */

  const updateMedAt = (idx: number, next: SelectedMed) => {
    setSelectedMeds((prev) => prev.map((m, i) => (i === idx ? next : m)));
    setHasSavedReportCard(false);
  };

  const updateMedDosage = (idx: number, dosage: string) => {
    setSelectedMeds((prev) =>
      prev.map((m, i) => {
        if (i === idx) {
          return {
            ...m,
            details: {
              ...(m.details || {}),
              dosage: dosage,
            },
          };
        }
        return m;
      }),
    );
    setHasSavedReportCard(false);
  };

  /* =======================================================================
      ✅ COMPLETED EDIT MODAL
     ======================================================================= */
  const editModal = useDisclosure();

  const [editQuery, setEditQuery] = useState("");
  const [editFocused, setEditFocused] = useState(false);
  const [editSaveInProgress, setEditSaveInProgress] = useState(false);
  const [editHighlight, setEditHighlight] = useState(0);

  const [editSelectedMeds, setEditSelectedMeds] = useState<SelectedMed[]>([]);
  const [editDetails, setEditDetails] = useState<PrescriptionDetailsValue>(
    emptyPrescriptionDetails,
  );

  const canEditCompletedModal = true;

  const editSelectedMedKeys = useMemo(() => {
    return new Set(
      editSelectedMeds.map((m) => makeMedKey({ id: m.id, name: m.name })),
    );
  }, [editSelectedMeds]);

  const isAlreadySelectedEdit = (m: {
    id?: any;
    name?: any;
    medicineId?: any;
  }) => {
    const key = makeMedKey({
      id: extractAnyId(m),
      name: extractAnyName(m),
    });
    return key ? editSelectedMedKeys.has(key) : false;
  };

  const debouncedEditRawQuery = useDebounced(editQuery, 250);

  // The edit modal shares the picker, so it shares the one-line syntax too.
  const parsedEditInput = useMemo(
    () => parsePrescriptionInput(debouncedEditRawQuery),
    [debouncedEditRawQuery],
  );
  const parsedLiveEditInput = useMemo(
    () => parsePrescriptionInput(editQuery),
    [editQuery],
  );
  const debouncedEditQuery = parsedEditInput.medicineTerm;

  const editQueryReady =
    editModal.isOpen && debouncedEditQuery.trim().length >= MIN_CHARS;

  const {
    data: editMedicinesRes,
    isLoading: editMedicinesLoading,
    error: editMedicinesError,
    refetch: refetchEditMedicines,
  } = useGetMedicinesQuery(
    { q: debouncedEditQuery.trim() },
    { skip: !editQueryReady },
  );

  const editFilteredMedicines = useMemo(() => {
    const q = debouncedEditQuery.trim();
    if (q.length < MIN_CHARS) return [];

    // Unwrapped inside the memo for the same reason as `topUsedMedicines`: the
    // `?? []` fallback is a fresh array each render.
    const editServerMedicines: MedicineDto[] =
      (editMedicinesRes as any)?.medicines ?? [];

    // Same ranking as the main picker so the edit modal behaves identically.
    return rankMedicines(editServerMedicines, q, {
      isValid: isValidMedicineName,
      limit: 25,
      extraFields: (m: any) => [m?.category, m?.strength],
    });
  }, [debouncedEditQuery, editMedicinesRes]);

  const openEditModal = () => {
    // Switch to inline editing mode — show the full workspace editor
    // instead of navigating to a separate page
    setIsInlineEditing(true);
  };

  const handleEditDetailsChange = (next: PrescriptionDetailsValue) => {
    if (!canEditCompletedModal) return;
    setEditDetails(next);
  };

  const updateEditMedAt = (idx: number, next: SelectedMed) => {
    setEditSelectedMeds((prev) => prev.map((m, i) => (i === idx ? next : m)));
  };

  // ✅ canonicalize ids inside edit modal too (in case duplicates exist)
  useEffect(() => {
    if (!editModal.isOpen) return;
    if (topUsedIdByName.size === 0) return;

    setEditSelectedMeds((prev) =>
      dedupeMeds(
        prev.map((m) => {
          const name = m.details?.medicineName || m.name;
          const st = m.details?.strength || "";
          const cid = canonicalizeMedicineId(
            String(m.id),
            String(name),
            String(st),
          );
          if (cid && cid !== m.id) return { ...m, id: cid };
          return m;
        }),
      ),
    );
  }, [editModal.isOpen, topUsedIdByName, canonicalizeMedicineId]);

  // ✅ UPDATE this existing function
  const addMedicineDirectEdit = (
    m: any,
    quick?: {
      pattern?: string;
      days?: number;
      timing?: string;
      frequency?: "daily" | "weekly";
      instruction?: string;
    },
  ) => {
    if (!canEditCompletedModal) return;

    const rawId = extractAnyId(m);
    const rawName = extractAnyName(m).toUpperCase();
    const rawStrength = extractAnyStrength(m);
    const rawForm = extractAnyForm(m) || "Tablet";

    if (!isValidMedicineName(rawName)) {
      showToast("Invalid medicine result");
      return;
    }

    const medId = canonicalizeMedicineId(rawId, rawName, rawStrength);

    if (isAlreadySelectedEdit({ id: medId, name: rawName })) {
      showToast("Already added");
      return;
    }

    const defaultDose = applyQuickDose(getDefaultDoseForForm(rawForm), quick);
    const md = getMedicineDetailsForForm(
      { ...m, name: rawName, strength: rawStrength },
      rawForm,
      defaultDose,
    );

    if (quick?.timing) md.notes = quick.timing;
    if (quick?.instruction?.trim()) md.dosage = quick.instruction.trim();

    const toAdd: SelectedMed = {
      id: String(medId),
      name: rawName,
      image: null,
      dose: defaultDose,
      details: md,
    };

    setEditSelectedMeds((prev) => dedupeMeds([toAdd, ...prev]));
    showToast("Added");
  };

  const onKeyDownSearchEdit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!editFocused) return;

    if (
      ["ArrowDown", "ArrowUp", "Enter", "Escape", "Home", "End"].includes(e.key)
    )
      e.preventDefault();

    const lastIndex = Math.max(editFilteredMedicines.length - 1, 0);

    if (e.key === "ArrowDown") {
      setEditHighlight((h) => Math.min(h + 1, lastIndex));
    } else if (e.key === "ArrowUp") {
      setEditHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Home") {
      setEditHighlight(0);
    } else if (e.key === "End") {
      setEditHighlight(lastIndex);
    } else if (e.key === "Escape") {
      setEditFocused(false);
    }
    // Enter handled by the picker (see `onKeyDownSearch`).
  };

  const createGlobalMedicineDirect = async (item: {
    medicine_name?: string;
    composition?: string;
    manufacturer_name?: string;
  }) => {
    if (creatingMedicine) return;

    const rawName = String(item?.medicine_name ?? "").trim();
    const name = rawName.toUpperCase();
    const composition = String(item?.composition ?? "").trim();
    const manufacturer = String(item?.manufacturer_name ?? "").trim();

    if (!name) {
      showToast("Medicine name required");
      return;
    }

    // This flow saves straight to the clinic with no review modal — unlike
    // "Add new medicine" — so an unrecognised name must fall back to the
    // default form (matching `openAddNew` below), not the literal "-" this
    // used to save when inference failed.
    const body: CreateMedicineWithFormRequest = {
      name,
      form: inferMedicineFormFromName(rawName),
      composition: composition || undefined,
      manufacturer: manufacturer || undefined,
    };

    try {
      await createMedicine(body).unwrap();
      showToast("Medicine created");

      setQuery(name);
      setFocused(true);
      setHighlight(0);
      setPendingAutoConfigureMedicineName(name);

      if (editModal.isOpen) {
        setEditQuery(name);
        setEditFocused(true);
        setEditHighlight(0);
      }

      refetchTopUsed();
    } catch (e: any) {
      const msg = e?.data?.message || e?.error || e?.message || "Create failed";
      showToast(msg);
    }
  };

  const saveEditChanges = async () => {
    if (editSaveInProgress) return;

    if (
      !validateMedicinesForSave(editSelectedMeds, {
        allowMissingDosage: true,
      })
    ) {
      return;
    }

    setEditSaveInProgress(true);

    // ✅ modal turant close
    editModal.onClose();

    // ✅ parent ko bolo loader dikhao on View/Download button
    onCompletionStateChange?.({
      isProcessing: true,
      isSuccess: false,
      error: null,
    });

    const ok = await saveReportCardFor(editSelectedMeds, editDetails, {
      silent: true,
      allowMissingDosage: true,
    });

    if (!ok) {
      setEditSaveInProgress(false);

      onCompletionStateChange?.({
        isProcessing: false,
        isSuccess: false,
        error: "Failed to save prescription changes",
      });

      showToast("Failed to save prescription changes");
      return;
    }

    setSelectedMeds(dedupeMeds(editSelectedMeds));
    setDetails(editDetails);
    setHasSavedReportCard(true);
    setEditSaveInProgress(false);

    onCompletionStateChange?.({
      isProcessing: false,
      isSuccess: true,
      error: null,
    });

    showToast("Prescription updated");
  };
  /* ============================ RENDER ============================ */
  if (ui === "tab" || ui === "classic" || ui === "collapse") {
    const emptyPrescriptionImg = `${import.meta.env.BASE_URL}assets/images/PrescriptionSummary.svg`;

    /* -------------------- COMPLETED UI -------------------- */
    if (isCompletedView) {
      return (
        <div className="relative space-y-4 pb-4">
          {/* Summary and actions share one card rather than two side-by-side
              ones: a sparse summary used to leave a wide empty strip between
              its own card edge and the buttons. Vertically centred so a
              one-line summary and the button row read as a single toolbar. */}
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm lg:flex-row lg:items-start lg:gap-4">
            <div className="min-w-0 flex-1">
              <PrescriptionPreviewSummary
                reportCard={defaultDetails as any}
                patient={patient}
                bare
              />
            </div>

            <div className="shrink-0">
              <PrescriptionWorkspaceHeader
                hasManualPrescription={hasManualPrescription}
                patientId={patientId}
                appointmentId={appointmentId}
                editSaveInProgress={editSaveInProgress}
                onEditPrescription={openEditModal}
                onOpenHistory={() => setIsPrescriptionHistoryOpen(true)}
                hasHistory={rxHistory.length > 0}
                onViewDownload={onViewDownload}
                isViewDownloadLoading={isViewDownloadLoading}
                isViewDownloadDisabled={isViewDownloadDisabled}
                onDownload={onDownloadPrescription}
                onPrint={onPrintPrescription}
                prescribedByName={doctor?.name ? `Dr. ${String(doctor.name).replace(/^dr\.?\s*/i, "")}` : null}
                prescribedAt={prescribedAt}
                updatedAt={updatedAt}
              />
            </div>
          </div>

          <PrescriptionCompletedList
            selectedMeds={selectedMeds}
            hasManualPrescription={hasManualPrescription}
            onViewManualPrescription={onViewManualPrescription}
            onReuploadManualPrescription={onReuploadManualPrescription}
            onEditPrescription={hasManualPrescription ? undefined : openEditModal}
            isEditDisabled={!patientId || !appointmentId || editSaveInProgress}
            prescribedAt={prescribedAt}
          />


          <CompletedPrescriptionEditModal
            editModal={editModal}
            emptyPrescriptionImg={emptyPrescriptionImg}
            editQuery={editQuery}
            setEditQuery={setEditQuery}
            editFocused={editFocused}
            setEditFocused={setEditFocused}
            onKeyDownSearchEdit={onKeyDownSearchEdit}
            editHighlight={editHighlight}
            parsedEditQuick={parsedLiveEditInput.quick}
            parsedEditTokens={parsedLiveEditInput.tokens}
            editSearchTerm={debouncedEditQuery}
            setEditHighlight={setEditHighlight}
            topUsedLoading={topUsedLoading}
            topUsedIsError={topUsedIsError}
            topUsedMedicines={topUsedMedicines}
            refetchTopUsed={refetchTopUsed}
            toggleFavorite={toggleFavorite}
            showToast={showToast}
            isAlreadySelectedEdit={isAlreadySelectedEdit}
            canonicalizeMedicineId={canonicalizeMedicineId}
            addMedicineDirectEdit={addMedicineDirectEdit}
            editQueryReady={editQueryReady}
            editMedicinesLoading={editMedicinesLoading}
            editMedicinesError={editMedicinesError}
            refetchEditMedicines={refetchEditMedicines}
            editFilteredMedicines={editFilteredMedicines}
            openAddNew={openAddNew}
            createGlobalMedicineDirect={createGlobalMedicineDirect}
            isCreatingGlobalMedicine={creatingMedicine}
            autoConfigureMedicineName={pendingAutoConfigureMedicineName}
            onAutoConfigureMedicineHandled={() =>
              setPendingAutoConfigureMedicineName(null)
            }
            editSelectedMeds={editSelectedMeds}
            setEditSelectedMeds={setEditSelectedMeds}
            editDetails={editDetails}
            handleEditDetailsChange={handleEditDetailsChange}
            updateEditMedAt={updateEditMedAt}
            onAddTest={onAddTest}
            addedTests={addedTests}
            resolvedDoctorId={resolvedDoctorId}
            rxHistory={rxHistory}
            isRxHistoryLoading={isRxHistoryLoading}
            patient={patient}
            doctor={doctor}
            clinic={clinic}
            savingReportCard={savingReportCard}
            editSaveInProgress={editSaveInProgress}
            saveEditChanges={saveEditChanges}
            showStockAvailability={showStockAvailability}
            stockAvailabilityByName={stockAvailabilityByName}
            stockCacheLoading={stockCacheLoading}
          />
          <AddMedicineModal
            isOpen={addModal.isOpen}
            onOpenChange={addModal.onOpenChange}
            createForm={createForm}
            setCreateForm={setCreateForm}
            creatingMedicine={creatingMedicine}
            submitCreateMedicine={submitCreateMedicine}
            fieldWrapperClassName="col-span-1"
          />
          <PrescriptionToast toast={toast} />

          <PrescriptionHistoryModal
            isOpen={isPrescriptionHistoryOpen}
            onOpenChange={setIsPrescriptionHistoryOpen}
            rxHistory={rxHistory}
            isRxHistoryLoading={isRxHistoryLoading}
            patient={patient}
            doctor={doctor}
            clinic={clinic}
          />
        </div>
      );
    }

    /* -------------------- NORMAL EDITOR UI -------------------- */
    const showCompleteBtn = isInlineEditing || (isConfirmed && !isCompletedView);
    const hasLocalMedicines = selectedMeds.length > 0;
    const hasMissingRequiredTiming = selectedMeds.some((m) => {
      const formKey = normalizeKey(
        m.details?.form ?? (m as any)?.form ?? "",
      );

      return (
        FORMS_REQUIRING_TIMING.has(formKey) &&
        (!m.details?.notes || m.details.notes.trim() === "")
      );
    });
    const disableComplete =
      completingAppt ||
      savingReportCard ||
      !hasLocalMedicines ||
      hasMissingRequiredTiming;

    return (
      <>
        <div
          className={[
            ui === "collapse" ? "relative grid grid-cols-12 gap-2 lg:h-full lg:overflow-hidden" : "relative grid grid-cols-12 gap-3 mt-3 lg:h-[calc(100vh-250px)] lg:overflow-hidden",
          ].join(" ")}
          ref={boxRef}
        >
          {/* LEFT: Medicine Workspace */}
          <div className={[
            "col-span-12 flex min-h-0 flex-col overflow-hidden lg:h-full",
            ui === "collapse"
              ? "lg:col-span-12 rounded-xl border border-slate-100 bg-white dark:border-[#1e293b] dark:bg-[#0f172a]"
              : "lg:col-span-12 rounded-2xl border border-line bg-surface shadow-sm",
          ].join(" ")}>
            <PrescriptionMedicineSidebar
              query={query}
              setQuery={setQuery}
              canEditPrescription={canEditPrescription}
              lockMessage={lockMessage}
              isSearchActive={focused}
              onSearchFocus={() => setFocused(true)}
              onSearchClose={() => setFocused(false)}
              onKeyDownSearch={onKeyDownSearch}
              queryReady={queryReady}
              medicinesLoading={medicinesLoading}
              medicinesError={medicinesError}
              filteredMedicines={filteredMedicines}
              debouncedQuery={debouncedQuery}
              highlight={highlight}
              setHighlight={setHighlight}
              openAddNew={openAddNew}
              createGlobalMedicineDirect={createGlobalMedicineDirect}
              isCreatingGlobalMedicine={creatingMedicine}
              autoConfigureMedicineName={pendingAutoConfigureMedicineName}
              onAutoConfigureMedicineHandled={() =>
                setPendingAutoConfigureMedicineName(null)
              }
              refetchMedicines={refetchMedicines}
              topUsedLoading={topUsedLoading}
              topUsedIsError={topUsedIsError}
              refetchTopUsed={refetchTopUsed}
              topUsedMedicines={topUsedMedicines}
              isAlreadySelected={isAlreadySelected}
              canonicalizeMedicineId={canonicalizeMedicineId}
              addMedicineDirect={addMedicineDirect}
              removeMedicineDirect={removeMedicineDirect}
              toggleFavorite={toggleFavorite}
              showToast={showToast}
              isPrescriptionHistoryOpen={isPrescriptionHistoryOpen}
              setIsPrescriptionHistoryOpen={setIsPrescriptionHistoryOpen}
              rxHistory={rxHistory}
              isRxHistoryLoading={isRxHistoryLoading}
              patient={patient}
              doctor={doctor}
              clinic={clinic}
              showStockAvailability={showStockAvailability}
              stockAvailabilityByName={stockAvailabilityByName}
              stockCacheLoading={stockCacheLoading}
              doctorId={resolvedDoctorId}
              parsedQuick={parsedLiveInput.quick}
              parsedTokens={parsedLiveInput.tokens}
              onOpenFavourite={() => setFavouriteDialogOpen(true)}
              onOpenClinical={() => setIsClinicalDrawerOpen(true)}
              favouriteName={favoritePrescriptionName}
            />

            {/* Pinned above the medicine table, not inside the drawer: this is
                the context that decides what is safe to prescribe, and it has
                to be readable at the moment drugs are chosen.

                Only outside `collapse` mode — that layout keeps the clinical
                panels in a permanent right column (so the strip would repeat
                them) and renders no drawer for the strip to open. */}
            {ui !== "collapse" && (
              <PrescriptionClinicalContextBar
                details={details}
                onOpenClinical={() => setIsClinicalDrawerOpen(true)}
                isLocked={!canEditPrescription}
              />
            )}

            <PrescriptionSummarySection
              selectedMeds={selectedMeds}
              emptyPrescriptionImg={emptyPrescriptionImg}
              canEditPrescription={canEditPrescription}
              hasSavedReportCard={hasSavedReportCard}
              setSelectedMeds={setSelectedMeds}
              setHasSavedReportCard={setHasSavedReportCard}
              updateMedAt={updateMedAt}
              updateMedDosage={updateMedDosage}
              favoritePrescriptionName={favoritePrescriptionName}
              setFavoritePrescriptionName={setFavoritePrescriptionName}
              favouriteDialogOpen={favouriteDialogOpen}
              onFavouriteDialogOpenChange={setFavouriteDialogOpen}
              doctorId={resolvedDoctorId}
              isMedicineFavorite={isSelectedMedicineFavorite}
              onToggleMedicineFavorite={toggleSelectedMedicineFavorite}
              doctorSpeciality={doctor?.speciality}
              additionalInformation={details.additionalInformation ?? {}}
              onAdditionalInformationChange={(next) => {
                setDetails((prev) => ({ ...prev, additionalInformation: next }));
                setHasSavedReportCard(false);
              }}
            />
          </div>

          {ui === "collapse" ? (
            /* RIGHT: Collapsed Accordion Panels */
            <div className="col-span-12 min-h-0 overflow-y-auto lg:col-span-3 lg:h-full flex flex-col gap-1.5 pb-14">
              {/* Vitals Accordion */}
              <CollapsiblePanel
                title="Vitals"
                subtitle="Current health measurements"
                icon={<FiActivity className="h-4 w-4 text-teal-600 dark:text-[#46beae]" />}
              >
                <div className="grid grid-cols-2 gap-3 p-3">
                  {[
                    { key: "bpSys", label: "BP (mmHg)", placeholder: "Sys", unit: "mmHg" },
                    { key: "pulse", label: "Pulse (bpm)", placeholder: "bpm" },
                    { key: "temperatureF", label: "Temp (°F)", placeholder: "°F" },
                    { key: "spo2", label: "SpO₂ (%)", placeholder: "%" },
                    { key: "weightKg", label: "Weight (kg)", placeholder: "kg" },
                    { key: "heightCm", label: "Height (cm)", placeholder: "cm" },
                    { key: "respiratoryRate", label: "Resp. Rate", placeholder: "/min" },
                  ].map((v) => (
                    <div key={v.key}>
                      <label className="text-[10px] font-medium text-text-muted block mb-1">{v.label}</label>
                      <input
                        type="text"
                        disabled={!canEditPrescription}
                        value={(details.vitals as any)?.[v.key] ?? ""}
                        onChange={(e) => handleDetailsChange({ ...details, vitals: { ...details.vitals, [v.key]: e.target.value } })}
                        placeholder={v.placeholder}
                        className="w-full h-9 text-[12px] rounded-lg border border-line bg-surface px-3 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 disabled:opacity-50"
                      />
                    </div>
                  ))}
                </div>
                <div className="px-3 pb-3">
                  <label className="text-[10px] font-medium text-text-muted block mb-1">Notes (Optional)</label>
                  <textarea
                    disabled={!canEditPrescription}
                    value={(details as any).vitalNotes ?? ""}
                    onChange={(e) => handleDetailsChange({ ...details, vitalNotes: e.target.value } as any)}
                    placeholder="Add notes..."
                    rows={2}
                    className="w-full text-[12px] rounded-lg border border-line bg-surface px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 resize-none disabled:opacity-50"
                  />
                </div>
              </CollapsiblePanel>

              {/* Clinical Details Accordion */}
              <CollapsiblePanel
                title="Clinical Details"
                subtitle="Diagnosis, chief complaint, notes..."
                icon={<FiFileText className="h-4 w-4 text-teal-600 dark:text-[#46beae]" />}
              >
                <div className="p-3 space-y-3">
                  <div>
                    <label className="text-[10px] font-medium text-text-muted block mb-1">Chief Complaint</label>
                    <input
                      type="text"
                      disabled={!canEditPrescription}
                      value={(details as any).chiefComplaint ?? ""}
                      onChange={(e) => handleDetailsChange({ ...details, chiefComplaint: e.target.value } as any)}
                      placeholder="Enter chief complaint..."
                      className="w-full h-9 text-[12px] rounded-lg border border-line bg-surface px-3 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-text-muted block mb-1">Diagnosis</label>
                    <input
                      type="text"
                      disabled={!canEditPrescription}
                      value={details.diagnosis ?? ""}
                      onChange={(e) => handleDetailsChange({ ...details, diagnosis: e.target.value })}
                      placeholder="Enter diagnosis..."
                      className="w-full h-9 text-[12px] rounded-lg border border-line bg-surface px-3 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-text-muted block mb-1">Notes / Clinical Notes</label>
                    <textarea
                      disabled={!canEditPrescription}
                      value={details.clinicalNotes ?? ""}
                      onChange={(e) => handleDetailsChange({ ...details, clinicalNotes: e.target.value })}
                      placeholder="Add clinical notes..."
                      rows={3}
                      className="w-full text-[12px] rounded-lg border border-line bg-surface px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 resize-none disabled:opacity-50"
                    />
                  </div>
                </div>
              </CollapsiblePanel>

              {/* Preview Accordion */}
              <CollapsiblePanel
                title="Preview"
                subtitle="Live prescription preview"
                icon={<FiEye className="h-4 w-4 text-teal-600 dark:text-[#46beae]" />}
              >
                <div className="p-2 max-h-[400px] overflow-auto">
                  <PrescriptionPreviewSummary
                    reportCard={details as any}
                    patient={patient}
                    adviceText={details.advice}
                  />
                </div>
              </CollapsiblePanel>
            </div>
          ) : (
            <>
              {/* RIGHT: Clinical Details.
                  An overlay drawer from lg up, so the medicine table keeps all
                  12 columns and never reflows when this opens or closes. Below
                  lg it stays inline and simply stacks under the workspace. */}
              <ClinicalDrawer
                open={isClinicalDrawerOpen}
                onOpenChange={setIsClinicalDrawerOpen}
                headerAction={
                  onOpenPreference && (
                    <Tooltip
                      content="Choose which of these sections appear"
                      placement="bottom"
                      showArrow
                      delay={400}
                    >
                      <button
                        type="button"
                        onClick={onOpenPreference}
                        aria-label="Choose which sections appear"
                        className="grid h-9 w-9 place-items-center rounded-lg text-text-muted transition hover:bg-surface-muted hover:text-primary lg:h-8 lg:w-8"
                      >
                        <FiSettings className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  )
                }
                footer={
                  <button
                    type="button"
                    onClick={() => setIsClinicalDrawerOpen(false)}
                    className="h-10 w-full rounded-lg bg-primary text-[13px] font-bold text-white transition hover:bg-primary-active"
                  >
                    Done
                  </button>
                }
              >
                <div className="col-span-12 lg:h-full lg:min-h-0">
                  <PrescriptionRightPanel
                    details={details}
                    onChange={handleDetailsChange}
                    canEditPrescription={canEditPrescription}
                    lockMessage={lockMessage}
                    onAddTest={onAddTest}
                    addedTests={addedTests}
                    bordered={false}
                    resolvedDoctorId={resolvedDoctorId}
                  />
                </div>
              </ClinicalDrawer>
            </>
          )}
        </div>

        {/* Bottom sticky bar — aligns dynamically with the (collapsible) sidebar width */}
        {/* Opaque, not translucent: at 95% white with a blur the table rows
            scrolling underneath stayed visible through the bar, so the action
            row read as a smudge over the content instead of fixed chrome. The
            surface token also carries dark mode without a second hex. */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-surface shadow-[0_-6px_20px_rgba(15,23,42,0.08)] transition-[left] duration-300 ease-in-out xl:left-[var(--app-sidebar-w,16rem)] dark:shadow-[0_-6px_20px_rgba(0,0,0,0.35)]">
          <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 md:px-6">
            {/* Left — live status summary */}
            <div className="flex min-w-0 items-center gap-2 text-[12px]">
              {hasLocalMedicines ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0a6c74]/10 px-2.5 py-1 font-semibold text-[#0a6c74] dark:bg-[#46beae]/15 dark:text-[#46beae]">
                    <FiCheckCircle className="h-3.5 w-3.5" />
                    {selectedMeds.length} {selectedMeds.length === 1 ? "medicine" : "medicines"} added
                  </span>
                  {hasMissingRequiredTiming && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                      <FiAlertCircle className="h-3.5 w-3.5" />
                      Timing required
                    </span>
                  )}
                </>
              ) : (
                <span className="font-medium text-text-subtle">
                  No medicines added yet
                </span>
              )}
            </div>

            {/* Right — actions */}
            <div className="flex items-center gap-2">
              <Button
                radius="lg"
                variant="bordered"
                startContent={<FiEye className="h-3.5 w-3.5" />}
                className="h-9 px-4 text-[12px] font-semibold border-line text-text-muted hover:border-[#0a6c74]/40 hover:text-[#0a6c74] dark:hover:border-[#46beae]/40 dark:hover:text-[#46beae] shrink-0"
                onPress={() => setShowPreviewPanel(true)}
              >
                Preview
              </Button>
              {isInlineEditing && (
                <Button
                  radius="lg"
                  variant="bordered"
                  onPress={() => setIsInlineEditing(false)}
                  className="h-9 px-4 text-[12px] font-semibold border-line text-text-muted hover:border-rose-300 hover:text-rose-600 hover:bg-danger/10 dark:hover:border-rose-500/40 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 shrink-0"
                >
                  Cancel
                </Button>
              )}
              {showCompleteBtn && (
                <Button
                  radius="lg"
                  onPress={completeAllInOne}
                  isDisabled={disableComplete}
                  startContent={savingReportCard || completingAppt ? <FiRotateCw className="h-4 w-4 shrink-0 animate-spin" /> : <FiCheckCircle className="h-4 w-4 shrink-0" />}
                  className="h-9 gap-1.5 rounded-lg bg-[#0a6c74] px-5 text-[12px] font-bold text-white shadow-sm shadow-[#0a6c74]/30 transition-colors hover:bg-[#095a61] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#46beae] dark:text-[#04231f] dark:hover:bg-[#3aa898] shrink-0"
                >
                  {savingReportCard ? "Saving..." : completingAppt ? "Completing..." : "Complete Consultation"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <AddMedicineModal
          isOpen={addModal.isOpen}
          onOpenChange={addModal.onOpenChange}
          createForm={createForm}
          setCreateForm={setCreateForm}
          creatingMedicine={creatingMedicine}
          submitCreateMedicine={submitCreateMedicine}
        />

        {/* Preview Slide-Over — shows the actual prescription template */}
        {showPreviewPanel && (
          <>
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[60]" onClick={() => setShowPreviewPanel(false)} />
            <div className="fixed inset-y-0 right-0 z-[61] flex h-full w-full max-w-full flex-col border-l border-line bg-surface shadow-2xl sm:w-[560px] sm:max-w-[94vw]">
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <FiEye className="h-4 w-4 text-primary" />
                  <span className="text-[13px] font-semibold text-text">Prescription Preview</span>
                </div>
                <Button size="sm" variant="light" isIconOnly onPress={() => setShowPreviewPanel(false)} className="h-7 w-7">
                  <FiX className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
                <div className="h-full overflow-hidden rounded-lg border border-line bg-white shadow-sm">
                  <PreviewIframe appointmentId={appointmentId} meds={selectedMeds} details={details} patient={patient} doctor={doctor} clinic={clinic} />
                </div>
              </div>
              <div className="shrink-0 px-4 py-2 border-t border-line text-center">
                <span className="text-[9px] text-slate-400">Shows the exact prescription that will be sent to patient</span>
              </div>
            </div>
          </>
        )}
        <PrescriptionToast toast={toast} />
      </>
    );
  }

  return null;
};

export default PrescriptionWorkspace;
