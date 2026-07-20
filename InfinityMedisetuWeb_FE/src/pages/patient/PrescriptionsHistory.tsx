// src/pages/patient/PrescriptionsHistory.tsx
import React, { useMemo, useState } from "react";
import { Button, Modal, ModalBody, ModalContent, Spinner } from "@heroui/react";
import {
  FiCalendar,
  FiDownload,
  FiEye,
  FiFileText,
  FiUser,
  FiX,
} from "react-icons/fi";

export type PrescriptionHistoryItem = {
  id?: string;
  appointmentId?: string;
  date: string;
  appointmentTime?: string;
  prescriptionPdf?: string | null;
  doctorName?: string | null;
  doctorSpeciality?: string | null;

  // kept for backward compat
  medicineName?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  strength?: string;
  composition?: string;
  notes?: string | null;
  usesSummary?: string | null;
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
  addressLine1?: string | null;
  addressLine2?: string | null;
  phone?: string | null;
  timing?: string | null;
  logoUrl?: string | null;
};

type Props = {
  items?: PrescriptionHistoryItem[];
  loading?: boolean;
  patient?: PatientSummary;
  doctor?: DoctorSummary;
  clinic?: ClinicSummary;
};

const to12h = (hhmm?: string) => {
  if (!hhmm) return "";
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm;

  const [, hh, mm] = m;
  const d = new Date();
  d.setHours(Number(hh), Number(mm), 0, 0);

  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const PrescriptionsHistory: React.FC<Props> = ({
  items,
  loading = false,
}) => {
  const displayItems = useMemo(() => items ?? [], [items]);

  const [previewItem, setPreviewItem] = useState<PrescriptionHistoryItem | null>(
    null,
  );

  const handleView = (item: PrescriptionHistoryItem) => {
    if (!item?.prescriptionPdf) return;
    setPreviewItem(item);
  };

  const handleClosePreview = () => {
    setPreviewItem(null);
  };

  const handleDownload = (url: string, id?: string, date?: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `Prescription-${id || date || "document"}.pdf`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner label="Loading prescriptions..." />
      </div>
    );
  }

  if (!displayItems.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-slate-50/50 py-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 mb-3">
          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-700">No prescriptions yet</p>
        <p className="mt-1 text-xs text-[#677294]">Prescriptions will appear here after appointments</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {displayItems.map((rx, idx) => (
          <div
            key={rx.id ?? idx}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition-all duration-200 hover:border-teal-200 hover:shadow-md dark:border-[#273244] dark:bg-[#0b1321] dark:shadow-none dark:hover:border-[#46beae]/45"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Left */}
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#1a3a35] dark:text-[#9be7dc]">
                  <FiFileText className="h-5 w-5 text-current" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                    Prescription
                  </p>

                  <div className="mt-1 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                    {rx.date && (
                      <div className="flex flex-wrap items-center gap-2">
                        <FiCalendar className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <span>
                          {rx.date}
                          {rx.appointmentTime
                            ? ` • ${to12h(rx.appointmentTime)}`
                            : ""}
                        </span>
                      </div>
                    )}

                    {rx.doctorName && (
                      <div className="flex flex-wrap items-center gap-2">
                        <FiUser className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <span>
                          Dr. {rx.doctorName}
                          {rx.doctorSpeciality
                            ? ` (${rx.doctorSpeciality})`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right */}
              {rx.prescriptionPdf ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    radius="sm"
                    className="h-9 rounded-lg bg-primary text-white text-[13px] font-semibold shadow-sm hover:opacity-90"
                    startContent={<FiEye className="h-3.5 w-3.5 text-current" />}
                    onPress={() => handleView(rx)}
                  >
                    View/Download
                  </Button>

                </div>
              ) : (
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                  No PDF available
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={!!previewItem}
        onOpenChange={(open) => {
          if (!open) handleClosePreview();
        }}
        size="5xl"
        scrollBehavior="inside"
        hideCloseButton
        classNames={{
          base: "rounded-2xl border border-transparent bg-white text-slate-900 dark:border-[#273244] dark:bg-[#111726] dark:text-white",
          body: "p-0 bg-white dark:bg-[#111726]",
        }}
      >
        <ModalContent>
          {() => (
            <ModalBody>
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#273244]">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                    Prescription Preview
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {previewItem?.date || "Prescription"}
                    {previewItem?.appointmentTime
                      ? ` • ${to12h(previewItem.appointmentTime)}`
                      : ""}
                    {previewItem?.doctorName
                      ? ` • Dr. ${previewItem.doctorName}`
                      : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {previewItem?.prescriptionPdf && (
                    <Button
                      size="sm"
                      variant="flat"
                      radius="sm"
                      className="h-9 rounded-lg bg-slate-100 text-slate-700 text-[13px] font-semibold hover:bg-slate-200 dark:bg-[#151c2d] dark:text-slate-200 dark:hover:bg-[#1b2436]"
                      startContent={<FiDownload className="h-3.5 w-3.5 text-current" />}
                      onPress={() =>
                        handleDownload(
                          previewItem.prescriptionPdf!,
                          previewItem.id,
                          previewItem.date,
                        )
                      }
                    >
                      Download
                    </Button>
                  )}

                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    radius="sm"
                    className="h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-[#151c2d] dark:hover:text-white"
                    onPress={handleClosePreview}
                  >
                    <FiX className="h-5 w-5 text-current" />
                  </Button>
                </div>
              </div>

              <div className="h-[75vh] w-full bg-slate-100 dark:bg-[#0b1321]">
                {previewItem?.prescriptionPdf ? (
                  <iframe
                    src={previewItem.prescriptionPdf}
                    title="Prescription Preview"
                    className="h-full w-full rounded-b-2xl border-0"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    Prescription preview not available.
                  </div>
                )}
              </div>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default PrescriptionsHistory;
