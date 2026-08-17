import {
  addToast,
  Button,
  Card,
  CardBody,
  Modal,
  ModalBody,
  ModalContent,
  Spinner,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import React from "react";
import { FiDownload, FiPrinter } from "react-icons/fi";

import PrescriptionWorkspace, {
  type SelectedMed,
} from "../../components/PrescriptionWorkspace";
import type { PrescriptionDetailsValue } from "../../components/prescription/PrescriptionDetails";

import { pdf } from "@react-pdf/renderer";

import TestDetailsTab from "../../components/prescription/TestDetailsTab";
import PrescriptionPdf from "./PrescriptionPdf";
import { useGetDoctorTemplateQuery } from "../../redux/api/prescriptionTemplateApi";
import {
  mapReportPrescriptionToSelectedMed,
  mergeReportCardToDetails,
} from "../appointment/helpers/appointmentDetailsHelpers";

/* ---------- Incoming API (your response shape) ---------- */
export type ApiClinic = {
  clinicName?: string | null;
  Tagline?: string | null;
  clinicAddress?: string | null;
  Country?: string | null;
  City?: string | null;
  State?: string | null;
  ZipCode?: number | string | null;
  clinicLogo?: string | null;
  isPharmacyAvailable?: boolean | null;
};

export type ApiReportCard = {
  petientId?: string | null;
  comorbidities?: string[];
  habits?: string[];
  vitals?: {
    bp?: string | null;
    pulse?: number | null;
    temperature?: number | null;
  };
  generalExamination?: string[];
  systemExamination?: string;
  provisionalDiagnosis?: string;
  differentialDiagnosis?: string;
  finalDiagnosis?: string;
  investigations?: string;
  advice?: string;
  clinicalNotes?: string;
  allergies?: string[];
  prescriptionPdf?: string | null;
  followUpInDays?: number | string | null;
  followUpDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ApiPrescription = {
  id?: string;
  reportCardId?: string;
  medicineId?: string;
  medicineName?: string;
  composition?: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  manufacturer?: string;
  medicineCount?: string;
  marketer?: string;
  imageUrl?: string | null;
  notes?: string | null;
  uses?: Record<string, string>;
  medicine?: {
    id?: string;
    name?: string;
    strength?: string | null;
    form?: string | null;
  } | null;
};

export type ApiReportResult = {
  clinic?: ApiClinic | null;
  reportCard?: ApiReportCard | null;
  prescriptions?: ApiPrescription[] | null;
};

type MedicineSuggestion = {
  id: string;
  name: string;
  image?: string | null;
};

export type PrescriptionHistoryItem = {
  id?: string;
  date: string;
  medicineName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  strength?: string;
  composition?: string;
  notes?: string | null;
  usesSummary?: string | null;
  medicineCount?: string | null;
  manufacturer?: string | null;
  marketer?: string | null;
  scheduleText?: string;
  noteText?: string;
  totalDoses?: number | null;
};

export type PatientSummary = {
  id?: string;
  patientId?: string | null;
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  dob?: string | null;
};

export type DoctorSummary = {
  id?: string;
  name?: string | null;
  speciality?: string | null;
  qualification?: string | null;
  licenseNumber?: string | null;
  mobile?: string | null;
  email?: string | null;
};

export type ClinicSummary = {
  name?: string | null;
  tagline?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  zipCode?: string | number | null;
  phone?: string | null;
  timing?: string | null;
  logoUrl?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  isPharmacyAvailable?: boolean | null;
};

type Props = {
  meds: SelectedMed[];
  details: PrescriptionDetailsValue;
  onRefreshAfterSave?: () => void;

  onChange: (meds: SelectedMed[], details: PrescriptionDetailsValue) => void;
  onSave: () => void;
  onClear: () => void;
  doctorId?: string;

  prescriptionProcessing?: boolean;
  onCompletionStateChange?: (payload: {
    isProcessing: boolean;
    isSuccess: boolean;
    error?: string | null;
  }) => void;

  isSaving?: boolean;
  editingAllowed?: boolean;
  disabledTooltip?: string;
  title?: string;

  onMedicinesChange?: (hasMedicines: boolean) => void;

  onMedicineSearch?: (query: string) => Promise<MedicineSuggestion[]>;

  patientId: string;
  appointmentId: string;
  appointmentTime?: string;

  patient?: PatientSummary;
  doctor?: DoctorSummary;
  clinic?: ClinicSummary;

  reportResult?: ApiReportResult | null;
  appointmentStatus?: string;

  onAddNewTestClick?: () => void;
  onUploadTestFiles?: (files: File[]) => void;
  onAddTest?: () => void;
  addedTests?: string[];

  hasManualPrescription?: boolean;
  onViewManualPrescription?: () => void;
  onReuploadManualPrescription?: () => void;

  /** Opens prescription-section preferences from the clinical-details drawer. */
  onOpenPreference?: () => void;
};

/* -------- small helpers -------- */

const safeFilePart = (v: string) =>
  (v || "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .replace(/\s+/g, "_");

const normalizePdfUrl = (raw?: string | null) => {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  return v
    .replace(/^[`'"]+/, "")
    .replace(/[`'"]+$/, "")
    .trim();
};

const revokeIfBlobUrl = (url: string | null) => {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

/* ================== MAIN COMPONENT ================== */

const PrescriptionSection: React.FC<Props> = ({
  meds,
  details,
  onChange,
  onSave: _onSave,
  onClear: _onClear,
  doctorId,
  isSaving: _isSaving,
  editingAllowed: _editingAllowed,
  disabledTooltip: _disabledTooltip,
  title: _title,
  patientId,
  appointmentId,
  appointmentTime,
  patient,
  doctor,
  clinic,
  appointmentStatus,
  reportResult,
  onRefreshAfterSave,
  onAddTest,
  addedTests,
  prescriptionProcessing,
  onCompletionStateChange,
  hasManualPrescription = false,
  onViewManualPrescription,
  onReuploadManualPrescription,
  onMedicinesChange,
  onOpenPreference,
}) => {
  const [activeTab] = React.useState<"prescription" | "tests" | "activity">(
    "prescription",
  );

  const preview = useDisclosure();
  const { isOpen, onOpen, onClose } = preview;

  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const { data: templateResponse } = useGetDoctorTemplateQuery();
  const templateConfig = templateResponse?.data?.defaultColors || templateResponse?.data;

  const prescriptionPdfUrl = React.useMemo(
    () => normalizePdfUrl(reportResult?.reportCard?.prescriptionPdf),
    [reportResult?.reportCard?.prescriptionPdf],
  );

  /** Who and when this preview is for — the title alone doesn't say. */
  const previewSubtitle = React.useMemo(() => {
    const demographics = [
      patient?.age ? `${patient.age}y` : "",
      patient?.gender || "",
    ]
      .filter(Boolean)
      .join(", ");

    return [
      patient?.name || "",
      demographics ? `(${demographics})` : "",
      appointmentTime || "",
    ]
      .filter(Boolean)
      .join(" • ");
  }, [patient?.name, patient?.age, patient?.gender, appointmentTime]);

  const isPending = (appointmentStatus || "").toLowerCase() === "pending";
  const isCompletedAppointment =
    (appointmentStatus || "").toLowerCase() === "completed";
  const hasExistingPrescription =
    Boolean(prescriptionPdfUrl) ||
    (reportResult?.prescriptions?.length || 0) > 0 ||
    meds.length > 0;

  const workspaceMeds = React.useMemo(() => {
    const reportPrescriptions = reportResult?.prescriptions ?? [];
    if (isCompletedAppointment && reportPrescriptions.length) {
      return reportPrescriptions.map(mapReportPrescriptionToSelectedMed);
    }

    return meds;
  }, [isCompletedAppointment, meds, reportResult?.prescriptions]);

  // The saved card hydrates the workspace once; it is not a live overlay.
  // `onLiveStateChange` pushes every edit back into `details`, so re-merging on
  // each change fed the server's values straight back down and any removal
  // snapped back. Re-hydrate only when a different card arrives (refetch after
  // save), and let edits stand in between.
  const hydratedReportCardRef = React.useRef<unknown>(null);
  const hydratedDetailsRef = React.useRef<PrescriptionDetailsValue | null>(
    null,
  );

  const workspaceDetails = React.useMemo(() => {
    const reportCard = reportResult?.reportCard;
    if (!isCompletedAppointment || !reportCard) return details;

    if (hydratedReportCardRef.current !== reportCard) {
      hydratedReportCardRef.current = reportCard;
      hydratedDetailsRef.current = mergeReportCardToDetails(
        reportCard,
        details,
      );
    }

    return hydratedDetailsRef.current ?? details;
  }, [details, isCompletedAppointment, reportResult?.reportCard]);

  const [derivedClinic, setDerivedClinic] = React.useState<
    ClinicSummary | undefined
  >(undefined);

  React.useEffect(() => {
    if (!reportResult?.clinic) return;
    const c = reportResult.clinic;
    setDerivedClinic({
      name: c.clinicName ?? null,
      tagline: c.Tagline ?? null,
      addressLine1: c.clinicAddress ?? null,
      addressLine2: [c.City, c.State, c.Country, c.ZipCode]
        .filter(Boolean)
        .join(", "),
      zipCode: c.ZipCode ?? null,
      logoUrl: c.clinicLogo || null,
      city: c.City ?? null,
      state: c.State ?? null,
      country: c.Country ?? null,
      isPharmacyAvailable: c.isPharmacyAvailable === true,
    });
  }, [reportResult]);

  const clinicToUse = clinic || derivedClinic;

  const resolvedDoctorId = React.useMemo(() => {
    return String(
      doctorId ||
      doctor?.id ||
      (reportResult as any)?.doctorId ||
      (reportResult as any)?.doctor?.id ||
      "",
    ).trim();
  }, [doctorId, doctor?.id, reportResult]);

  const adviceText =
    (details as any)?.advice || (details as any)?.instructions || null;

  const buildPdfItems = (): PrescriptionHistoryItem[] => {
    const baseDate = reportResult?.reportCard?.createdAt
      ? new Date(reportResult.reportCard.createdAt).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
      )
      : new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

    if (reportResult?.prescriptions && reportResult.prescriptions.length) {
      return reportResult.prescriptions.map((p, index) => ({
        id: p.id || String(index),
        date: baseDate,
        medicineName: p.medicineName || "-",
        dosage: p.dosage || "1 unit",
        frequency: p.frequency || undefined,
        duration: p.duration || undefined,
        strength: p.strength || undefined,
        composition: p.composition || undefined,
        notes: p.notes ?? null,
        medicineCount: p.medicineCount ?? null,
        manufacturer: p.manufacturer || null,
        marketer: p.marketer || null,
      }));
    }

    return meds.map((m: any, index: number) => {
      const d = m.details || {};
      return {
        id: String(m.id ?? index),
        date: baseDate,
        medicineName: d.medicineName || m.name || "-",
        dosage: d.dosage || "1 unit",
        frequency: d.frequency || undefined,
        duration: d.duration || undefined,
        strength: d.strength || undefined,
        composition: d.composition || undefined,
        notes: d.notes ?? null,
        medicineCount: d.medicineCount ?? null,
        manufacturer: d.manufacturer || null,
        marketer: d.marketer || null,
      };
    });
  };

  const getPdfBlob = async () => {
    const items = buildPdfItems();
    if (!items.length) {
      addToast({
        title: "No prescription",
        description: "There is no medicine in this prescription to print.",
        color: "warning",
        variant: "flat",
      });
      return null;
    }

    const doc = (
      <PrescriptionPdf
        items={items}
        patient={patient}
        doctor={doctor}
        clinic={clinicToUse}
        adviceText={adviceText}
        reportCard={reportResult?.reportCard ?? null}
        templateConfig={templateConfig as any}
      />
    );

    return await pdf(doc).toBlob();
  };

  const closePreview = React.useCallback(() => {
    setPdfUrl((prev) => {
      revokeIfBlobUrl(prev);
      return null;
    });
    onClose();
  }, [onClose]);

  const handlePreviewPdf = async () => {
    if (prescriptionProcessing) return;

    try {
      if (prescriptionPdfUrl) {
        setPdfUrl((prev) => {
          revokeIfBlobUrl(prev);
          return prescriptionPdfUrl;
        });
        onOpen();
        return;
      }

      setIsGenerating(true);
      const blob = await getPdfBlob();
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      setPdfUrl((prev) => {
        revokeIfBlobUrl(prev);
        return url;
      });

      onOpen();
    } catch (err) {
      console.error(err);
      addToast({
        title: "Preview failed",
        description: "Unable to generate prescription preview.",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      if (prescriptionPdfUrl) {
        window.open(prescriptionPdfUrl, "_blank", "noopener,noreferrer");
        return;
      }

      const blob = await getPdfBlob();
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const namePart = safeFilePart(String(patient?.name || ""));
      const timePart = safeFilePart(String(appointmentTime || ""));
      const fallback = appointmentId || patientId || "document";

      link.download = `Prescription-${namePart || fallback}${timePart ? `-${timePart}` : ""
        }.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      console.error(err);
      addToast({
        title: "Download failed",
        description: "Unable to download prescription PDF.",
        color: "danger",
        variant: "flat",
      });
    }
  };

  const handlePrintPdf = async () => {
    try {
      if (prescriptionPdfUrl) {
        const w = window.open(
          prescriptionPdfUrl,
          "_blank",
          "noopener,noreferrer",
        );
        if (w) {
          w.onload = () => {
            w.print();
          };
        }
        return;
      }

      const blob = await getPdfBlob();
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const w = window.open(url);
      if (w) {
        w.onload = () => {
          w.print();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        };
      } else {
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      addToast({
        title: "Print failed",
        description: "Unable to print prescription PDF.",
        color: "danger",
        variant: "flat",
      });
    }
  };

  const showTopActions =
    !isPending && (hasExistingPrescription || prescriptionProcessing);

  const isViewDownloadDisabled =
    prescriptionProcessing || isGenerating || !hasExistingPrescription;
  React.useEffect(() => {
    return () => {
      revokeIfBlobUrl(pdfUrl);
    };
  }, [pdfUrl]);

  return (
    <Card
      shadow="none"
      radius="lg"
      classNames={{
        base: "p-0 gap-0 bg-transparent border-0",
        body: "p-0",
      }}
    >
      <div className="flex items-center justify-end">
        {/* All prescription action buttons are rendered inside PrescriptionWorkspaceHeader */}
      </div>

      <CardBody className="p-0 bg-transparent">
        {activeTab === "tests" ? (
          <TestDetailsTab
            patientId={patientId}
            appointmentId={appointmentId}
            pdfMeta={{
              patientId,
              patientName: patient?.name ?? undefined,
              patientEmail: patient?.email ?? undefined,
              patientMobile: patient?.mobile ?? undefined,
              patientGender: patient?.gender ?? undefined,
              patientAge: patient?.age ?? undefined,
              patientDob: patient?.dob ?? undefined,
              patientAddress: [
                patient?.address,
                patient?.city,
                patient?.state,
                patient?.country,
              ]
                .filter(Boolean)
                .join(", ") || undefined,
              doctorName: doctor?.name ?? undefined,
              clinicName: clinicToUse?.name ?? undefined,
              clinicAddress: [
                clinicToUse?.addressLine1,
                clinicToUse?.addressLine2,
              ]
                .filter(Boolean)
                .join(", "),
              appointmentId,
              appointmentTime: appointmentTime ?? undefined,
              appointmentStatus: appointmentStatus ?? undefined,
            }}
          />
        ) : activeTab === "activity" ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Activity History
          </div>
        ) : (
          <PrescriptionWorkspace
            embedded
            ui="tab"
            defaultSelected={workspaceMeds}
            defaultDetails={workspaceDetails}
            patientId={patientId}
            appointmentStatus={appointmentStatus}
            appointmentId={appointmentId}
            doctorId={resolvedDoctorId}
            onDone={(m, d) => {
              onChange(m, d);
            }}
            onLiveStateChange={(m, d) => {
              onChange(m, d);
            }}
            onRefreshAfterSave={onRefreshAfterSave}
            keepEditingAfterSave
            onCompletionStateChange={onCompletionStateChange}
            onAddTest={onAddTest}
            addedTests={addedTests}
            hasManualPrescription={hasManualPrescription}
            onViewManualPrescription={onViewManualPrescription}
            onReuploadManualPrescription={onReuploadManualPrescription}
            onMedicinesChange={onMedicinesChange}
            onOpenPreference={onOpenPreference}
            patient={patient}
            doctor={doctor}
            clinic={clinicToUse}
            onViewDownload={showTopActions ? handlePreviewPdf : undefined}
            onDownloadPrescription={showTopActions ? handleDownloadPdf : undefined}
            onPrintPrescription={showTopActions ? handlePrintPdf : undefined}
            isViewDownloadLoading={prescriptionProcessing || isGenerating}
            isViewDownloadDisabled={isViewDownloadDisabled}
            prescribedAt={reportResult?.reportCard?.createdAt ?? null}
            updatedAt={reportResult?.reportCard?.updatedAt ?? null}
          />
        )}
      </CardBody>

      {/* Sized to the A4 aspect rather than the full 5xl width — a wide modal
          letterboxes the page in the browser's PDF viewer, which is what the
          dark gutters on either side of the sheet were. */}
      <Modal
        isOpen={isOpen}
        onClose={closePreview}
        size="3xl"
        scrollBehavior="inside"
        classNames={{ base: "h-[92vh] max-h-[92vh]", body: "p-0" }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-0 border-b border-line px-5 py-3">
                <div className="flex items-start justify-between gap-3 pr-8">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-tight">
                      Prescription Preview
                    </p>
                    {previewSubtitle && (
                      <p className="mt-0.5 truncate text-[12px] font-normal text-default-500">
                        {previewSubtitle}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      startContent={<FiPrinter />}
                      onPress={handlePrintPdf}
                      isDisabled={!pdfUrl}
                    >
                      Print
                    </Button>
                    <Button
                      size="sm"
                      color="primary"
                      startContent={<FiDownload />}
                      onPress={handleDownloadPdf}
                      isDisabled={!pdfUrl}
                    >
                      Download
                    </Button>
                  </div>
                </div>
              </ModalHeader>

              <ModalBody className="bg-default-100">
                {pdfUrl ? (
                  <div className="flex h-full w-full justify-center overflow-auto p-3">
                    <iframe
                      src={`${pdfUrl}#toolbar=0`}
                      title="Prescription PDF"
                      className="h-full w-full max-w-full border-0 bg-white shadow-sm"
                      style={{ aspectRatio: "210 / 297" }}
                    />
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <Spinner size="lg" color="primary" />
                    <p className="text-[13px] text-default-500">
                      {isGenerating
                        ? "Generating the prescription…"
                        : "Loading preview…"}
                    </p>
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </Card>
  );
};

export default PrescriptionSection;
