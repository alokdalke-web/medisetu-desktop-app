import { Button, useDisclosure } from "@heroui/react";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiActivity, FiAlertCircle, FiCheckCircle, FiChevronDown, FiEye, FiFileText, FiRotateCw, FiX } from "react-icons/fi";

import {
  emptyPrescriptionDetails,
  type PrescriptionDetailsValue,
} from "./prescription/PrescriptionDetails";
import { PrescriptionToast } from "./prescription/PrescriptionWorkspaceUi";
import PrescriptionCompletedList from "./prescription/workspace/components/PrescriptionCompletedList";
import PrescriptionMedicineSidebar from "./prescription/workspace/components/PrescriptionMedicineSidebar";
import PrescriptionRightPanel from "./prescription/workspace/components/PrescriptionRightPanel";
import PrescriptionSummarySection from "./prescription/workspace/components/PrescriptionSummarySection";
import PrescriptionWorkspaceHeader from "./prescription/workspace/components/PrescriptionWorkspaceHeader";
import PrescriptionPreviewSummary from "./prescription/workspace/components/PrescriptionPreviewSummary";
import AddMedicineModal from "./prescription/workspace/components/modals/AddMedicineModal";
import CompletedPrescriptionEditModal from "./prescription/workspace/components/modals/CompletedPrescriptionEditModal";
import PrescriptionHistoryModal from "./prescription/workspace/components/modals/PrescriptionHistoryModal";
import { getDefaultDoseForForm } from "./prescription/workspace/helpers/doseHelpers";
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
          <div className="text-[12px] font-semibold text-slate-800 dark:text-white leading-tight">{title}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">{subtitle}</div>
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

  // Debounce: only re-render after 600ms of inactivity
  const [debouncedMeds] = useDebounce(meds, 600);
  const [debouncedDetails] = useDebounce(details, 600);

  React.useEffect(() => {
    let cancelled = false;
    const render = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || "";
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

        // Build prescriptions array matching the template's expected shape
        const prescriptions = debouncedMeds.map((m) => ({
          medicineName: m.details?.medicineName || m.name || "",
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
    // The prescription HTML is A4-width; scale it down so it fits the narrow
    // preview panel without a horizontal scrollbar.
    return (
      <div className="h-full w-full overflow-auto bg-white [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
        <iframe
          srcDoc={html.replace(
            "</head>",
            `<style>::-webkit-scrollbar{display:none}*{scrollbar-width:none;-ms-overflow-style:none}</style></head>`,
          )}
          title="Prescription Preview"
          className="border-0"
          style={{
            backgroundColor: "white",
            width: "160%",
            height: "160%",
            transform: "scale(0.625)",
            transformOrigin: "top left",
          }}
        />
      </div>
    );
  }

  // Fallback: basic draft if the endpoint fails
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const rows = meds.map((m, i) => `<tr style="border-bottom:1px solid #eee"><td style="padding:5px;color:#999">${i + 1}</td><td style="padding:5px"><b>${m.details?.medicineName || m.name || ""}</b></td><td style="padding:5px">${m.details?.dosage || ""}</td><td style="padding:5px">${m.details?.duration || ""}</td></tr>`).join("");
  const fallback = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:16px;font-size:11px;color:#333}.warn{background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:8px;margin-bottom:10px;font-size:10px;color:#9a3412;text-align:center}table{width:100%;border-collapse:collapse}th{text-align:left;padding:5px;border-bottom:1px solid #333;font-size:9px}</style></head><body><div class="warn">Draft preview — unable to load template</div><div style="font-weight:700;margin-bottom:4px">${patient?.name || ""} • ${today}</div>${meds.length > 0 ? `<div style="font-size:14px;margin:6px 0">℞</div><table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table>` : ""}<div style="text-align:right;margin-top:16px;font-weight:700">${doctor?.name || ""}</div></body></html>`;
  return <iframe srcDoc={fallback} className="w-full h-full border-0" title="Draft Preview" />;
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
}) => {
  /* ============================ MAIN STATES ============================ */
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [pendingAutoConfigureMedicineName, setPendingAutoConfigureMedicineName] =
    useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const defaultSelectedSignatureRef = useRef<string | null>(null);

  const [selectedMeds, setSelectedMeds] = useState<SelectedMed[]>(() =>
    sanitizeSelectedMedicineList(
      (defaultSelected as any[]).map(normalizeSelectedMedBasic),
    ),
  );
  const [favoritePrescriptionName, setFavoritePrescriptionName] = useState("");

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
    console.log("PrescriptionWorkspace doctorId prop =>", doctorId);
    console.log("PrescriptionWorkspace resolvedDoctorId =>", resolvedDoctorId);
    console.log("PrescriptionWorkspace defaultDetails =>", defaultDetails);
    console.log("PrescriptionWorkspace defaultSelected =>", defaultSelected);
  }, [doctorId, resolvedDoctorId, defaultDetails, defaultSelected]);

  useEffect(() => {
    onMedicinesChange?.(selectedMeds.length > 0);
  }, [selectedMeds, onMedicinesChange]);

  // Fire live state change for external preview panels
  useEffect(() => {
    onLiveStateChange?.(selectedMeds, details);
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

  const rawTopUsed: any[] =
    (topUsedRes as any)?.data?.data ?? (topUsedRes as any)?.medicines ?? [];

  const topUsedMedicines: any[] = useMemo(() => {
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
  }, [rawTopUsed]);

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

  const canonicalizeMedicineId = (
    rawId: string,
    name?: string,
    strength?: string,
  ) => {
    const keyNS = medicineNameStrengthKey(name || "", strength || "");
    const keyN = medicineNameKey(name || "");
    return (
      topUsedIdByNameStrength.get(keyNS) || topUsedIdByName.get(keyN) || rawId
    );
  };

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
    } catch (_error) {
      showToast("Failed to update favorite");
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
  const debouncedQuery = useDebounced(query, 250);

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
    const nq = normalizeKey(q);

    const hits = serverMedicines.filter((m: any) => {
      const medicineName = extractAnyName(m);
      if (!isValidMedicineName(medicineName)) return false;

      const fields = [medicineName, m?.category, m?.strength];
      return fields.some((f) => normalizeKey(f as any).includes(nq));
    });

    return hits.slice(0, 25);
  }, [debouncedQuery, serverMedicines]);

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

      return {
        form,
        aliases: Array.from(new Set([baseAlias, ...aliases, ...pluralAliases]))
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

    // ✅ Use new functions — start from the form default, then apply any
    // quick schedule/duration/timing chosen by the doctor at selection time.
    let dose = getDefaultDoseForForm(rawForm);

    if (quick?.pattern && /^[0-2]-[0-2]-[0-2]$/.test(quick.pattern)) {
      const [mo, no, ni] = quick.pattern
        .split("-")
        .map((n) => Math.max(0, Math.min(2, Number(n) || 0)));
      dose = {
        ...dose,
        morning: mo > 0,
        noon: no > 0,
        night: ni > 0,
        morningCount: mo,
        noonCount: no,
        nightCount: ni,
      };
    }

    if (quick?.days && quick.days > 0) {
      if (quick.frequency === "weekly") {
        dose = {
          ...dose,
          frequency: "weekly",
          weeklyWeeks: quick.days,
          days: quick.days * 7,
        };
      } else {
        dose = {
          ...dose,
          frequency: "daily",
          days: quick.days,
          dailyDays: quick.days,
        };
      }
    } else if (quick?.frequency === "weekly") {
      dose = { ...dose, frequency: "weekly" };
    }

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
  const onKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (ui === "tab") return;
    if (!focused) return;

    if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key))
      e.preventDefault();

    if (e.key === "ArrowDown") {
      setHighlight((h) =>
        Math.min(h + 1, Math.max(filteredMedicines.length - 1, 0)),
      );
    } else if (e.key === "ArrowUp") {
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      const picked = filteredMedicines[highlight] as any;
      if (picked) addMedicineDirect(picked);
      setFocused(false);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
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
    const signature = JSON.stringify(
      normalized.map((m) => ({
        id: String(m.id ?? ""),
        name: String(m.name ?? ""),
        dose: m.dose ?? null,
        details: m.details ?? null,
      })),
    );

    if (defaultSelectedSignatureRef.current === signature) return;
    defaultSelectedSignatureRef.current = signature;

    setSelectedMeds(sanitizeSelectedMedicineList(normalized));
  }, [defaultSelected]);

  useEffect(() => {
    if (defaultDetails) setDetails(defaultDetails);
  }, [defaultDetails]);

  /* ========================= SAVE (reports/card) ========================= */
  const [createReportCard, { isLoading: creatingRC }] =
    useCreateReportCardMutation();
  const [updateReportCard, { isLoading: updatingRC }] =
    useUpdateReportCardMutation();

  const savingReportCard = creatingRC || updatingRC;

  const handleDetailsChange = (next: PrescriptionDetailsValue) => {
    if (!canEditPrescription) return;
    setDetails(next);
    setHasSavedReportCard(false);
  };

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

  const debouncedEditQuery = useDebounced(editQuery, 250);

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

  const editServerMedicines: MedicineDto[] =
    (editMedicinesRes as any)?.medicines ?? [];

  const editFilteredMedicines = useMemo(() => {
    const q = debouncedEditQuery.trim();
    if (q.length < MIN_CHARS) return [];
    const nq = normalizeKey(q);

    const hits = editServerMedicines.filter((m: any) => {
      const medicineName = extractAnyName(m);
      if (!isValidMedicineName(medicineName)) return false;

      const fields = [medicineName, m?.category, m?.strength];
      return fields.some((f) => normalizeKey(f as any).includes(nq));
    });

    return hits.slice(0, 25);
  }, [debouncedEditQuery, editServerMedicines]);

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
  }, [editModal.isOpen, topUsedIdByName, topUsedIdByNameStrength]);

  // ✅ UPDATE this existing function
  const addMedicineDirectEdit = (m: any) => {
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

    // ✅ Use new functions
    const defaultDose = getDefaultDoseForForm(rawForm);
    const md = getMedicineDetailsForForm(
      { ...m, name: rawName, strength: rawStrength },
      rawForm,
      defaultDose,
    );

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

    if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key))
      e.preventDefault();

    if (e.key === "ArrowDown") {
      setEditHighlight((h) =>
        Math.min(h + 1, Math.max(editFilteredMedicines.length - 1, 0)),
      );
    } else if (e.key === "ArrowUp") {
      setEditHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      const picked = editFilteredMedicines[editHighlight] as any;
      if (picked) addMedicineDirectEdit(picked);
      setEditFocused(false);
    } else if (e.key === "Escape") {
      setEditFocused(false);
    }
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

    const body: CreateMedicineWithFormRequest = {
      name,
      form: inferMedicineFormFromName(rawName, "-"),
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
        <div className="relative">
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
          />

          <PrescriptionPreviewSummary
            reportCard={defaultDetails as any}
            patient={patient}
            adviceText={(defaultDetails as any)?.advice}
          />

          <PrescriptionCompletedList
            selectedMeds={selectedMeds}
            hasManualPrescription={hasManualPrescription}
            onViewManualPrescription={onViewManualPrescription}
            onReuploadManualPrescription={onReuploadManualPrescription}
          />

          <CompletedPrescriptionEditModal
            editModal={editModal}
            emptyPrescriptionImg={emptyPrescriptionImg}
            editQuery={editQuery}
            setEditQuery={setEditQuery}
            editFocused={editFocused}
            setEditFocused={setEditFocused}
            onKeyDownSearchEdit={onKeyDownSearchEdit}
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
            ui === "collapse" ? "grid grid-cols-12 gap-2 lg:h-full lg:overflow-hidden" : "grid grid-cols-12 gap-3 mt-3 lg:h-[calc(100vh-250px)] lg:overflow-hidden",
          ].join(" ")}
          ref={boxRef}
        >
          {/* LEFT: Medicine Workspace */}
          <div className={[
            "col-span-12 flex min-h-0 flex-col overflow-hidden lg:h-full",
            ui === "collapse"
              ? "lg:col-span-9 rounded-xl border border-slate-100 bg-white dark:border-[#1e293b] dark:bg-[#0f172a]"
              : "lg:col-span-9 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726]",
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
            />

            <PrescriptionSummarySection
              selectedMeds={selectedMeds}
              emptyPrescriptionImg={emptyPrescriptionImg}
              hasSavedReportCard={hasSavedReportCard}
              canEditPrescription={canEditPrescription}
              setSelectedMeds={setSelectedMeds}
              setHasSavedReportCard={setHasSavedReportCard}
              updateMedAt={updateMedAt}
              updateMedDosage={updateMedDosage}
              favoritePrescriptionName={favoritePrescriptionName}
              setFavoritePrescriptionName={setFavoritePrescriptionName}
              doctorId={resolvedDoctorId}
              isMedicineFavorite={isSelectedMedicineFavorite}
              onToggleMedicineFavorite={toggleSelectedMedicineFavorite}
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
                      <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-1">{v.label}</label>
                      <input
                        type="text"
                        disabled={!canEditPrescription}
                        value={(details.vitals as any)?.[v.key] ?? ""}
                        onChange={(e) => handleDetailsChange({ ...details, vitals: { ...details.vitals, [v.key]: e.target.value } })}
                        placeholder={v.placeholder}
                        className="w-full h-9 text-[12px] rounded-lg border border-slate-200 dark:border-[#273244] bg-white dark:bg-[#0f1728] px-3 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 disabled:opacity-50"
                      />
                    </div>
                  ))}
                </div>
                <div className="px-3 pb-3">
                  <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Notes (Optional)</label>
                  <textarea
                    disabled={!canEditPrescription}
                    value={(details as any).vitalNotes ?? ""}
                    onChange={(e) => handleDetailsChange({ ...details, vitalNotes: e.target.value } as any)}
                    placeholder="Add notes..."
                    rows={2}
                    className="w-full text-[12px] rounded-lg border border-slate-200 dark:border-[#273244] bg-white dark:bg-[#0f1728] px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 resize-none disabled:opacity-50"
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
                    <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Chief Complaint</label>
                    <input
                      type="text"
                      disabled={!canEditPrescription}
                      value={(details as any).chiefComplaint ?? ""}
                      onChange={(e) => handleDetailsChange({ ...details, chiefComplaint: e.target.value } as any)}
                      placeholder="Enter chief complaint..."
                      className="w-full h-9 text-[12px] rounded-lg border border-slate-200 dark:border-[#273244] bg-white dark:bg-[#0f1728] px-3 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Diagnosis</label>
                    <input
                      type="text"
                      disabled={!canEditPrescription}
                      value={details.diagnosis ?? ""}
                      onChange={(e) => handleDetailsChange({ ...details, diagnosis: e.target.value })}
                      placeholder="Enter diagnosis..."
                      className="w-full h-9 text-[12px] rounded-lg border border-slate-200 dark:border-[#273244] bg-white dark:bg-[#0f1728] px-3 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Notes / Clinical Notes</label>
                    <textarea
                      disabled={!canEditPrescription}
                      value={details.clinicalNotes ?? ""}
                      onChange={(e) => handleDetailsChange({ ...details, clinicalNotes: e.target.value })}
                      placeholder="Add clinical notes..."
                      rows={3}
                      className="w-full text-[12px] rounded-lg border border-slate-200 dark:border-[#273244] bg-white dark:bg-[#0f1728] px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 resize-none disabled:opacity-50"
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
              {/* RIGHT: Clinical Details */}
              <div className="col-span-12 lg:col-span-3 lg:h-full lg:min-h-0 lg:overflow-hidden">
                <PrescriptionRightPanel
                  details={details}
                  onChange={handleDetailsChange}
                  canEditPrescription={canEditPrescription}
                  lockMessage={lockMessage}
                  onAddTest={onAddTest}
                  addedTests={addedTests}
                  resolvedDoctorId={resolvedDoctorId}
                />
              </div>
            </>
          )}
        </div>

        {/* Bottom sticky bar — aligns dynamically with the (collapsible) sidebar width */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur transition-[left] duration-300 ease-in-out xl:left-[var(--app-sidebar-w,16rem)] dark:border-[#273244] dark:bg-[#0b1321]/95">
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
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                      <FiAlertCircle className="h-3.5 w-3.5" />
                      Timing required
                    </span>
                  )}
                </>
              ) : (
                <span className="font-medium text-slate-400 dark:text-slate-500">
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
                className="h-9 px-4 text-[12px] font-semibold border-slate-200 text-slate-600 hover:border-[#0a6c74]/40 hover:text-[#0a6c74] dark:border-[#273244] dark:text-slate-300 dark:hover:border-[#46beae]/40 dark:hover:text-[#46beae] shrink-0"
                onPress={() => setShowPreviewPanel(true)}
              >
                Preview
              </Button>
              {isInlineEditing && (
                <Button
                  radius="lg"
                  variant="bordered"
                  onPress={() => setIsInlineEditing(false)}
                  className="h-9 px-4 text-[12px] font-semibold border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 dark:border-[#273244] dark:text-slate-300 dark:hover:border-rose-500/40 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 shrink-0"
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
            <div className="fixed top-0 right-0 h-full w-[500px] max-w-[92vw] z-[61] shadow-2xl bg-white dark:bg-[#111726] flex flex-col border-l border-slate-200 dark:border-[#273244]">
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#273244]">
                <div className="flex items-center gap-2">
                  <FiEye className="h-4 w-4 text-primary" />
                  <span className="text-[13px] font-semibold text-slate-800 dark:text-white">Prescription Preview</span>
                </div>
                <Button size="sm" variant="light" isIconOnly onPress={() => setShowPreviewPanel(false)} className="h-7 w-7">
                  <FiX className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden p-3">
                <div className="h-full rounded-lg border border-slate-200 dark:border-[#273244] bg-white overflow-auto shadow-sm">
                  <PreviewIframe appointmentId={appointmentId} meds={selectedMeds} details={details} patient={patient} doctor={doctor} clinic={clinic} />
                </div>
              </div>
              <div className="shrink-0 px-4 py-2 border-t border-slate-100 dark:border-[#273244] text-center">
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
