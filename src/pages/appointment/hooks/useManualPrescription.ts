import { addToast } from "@heroui/react";
import React, { useState } from "react";

type UseManualPrescriptionArgs = {
  appointmentId?: string;
  updateDoctorManualPrescription: any;
  refetchAppointment: () => any;
  refetchReports: () => any;
};

export type ManualPrescriptionModalVariant = "upload" | "phone-link";

const useManualPrescription = ({
  appointmentId,
  updateDoctorManualPrescription,
  refetchAppointment,
  refetchReports,
}: UseManualPrescriptionArgs) => {
  const [isManualPrescriptionModalOpen, setIsManualPrescriptionModalOpen] =
    useState(false);
  const [manualPrescriptionModalVariant, setManualPrescriptionModalVariant] =
    useState<ManualPrescriptionModalVariant>("upload");
  const [manualPrescriptionFiles, setManualPrescriptionFiles] = useState<
    File[]
  >([]);

  const [isSavingManualPrescription, setIsSavingManualPrescription] =
    useState(false);

  const handleManualPrescriptionOpenChange = (open: boolean) => {
    setIsManualPrescriptionModalOpen(open);

    if (!open) {
      setManualPrescriptionFiles([]);
      setManualPrescriptionModalVariant("upload");
    }
  };

  const openManualPrescriptionModal = (
    variant: ManualPrescriptionModalVariant = "upload",
  ) => {
    setManualPrescriptionModalVariant(variant);
    setManualPrescriptionFiles([]);
    setIsManualPrescriptionModalOpen(true);
  };

  const handleManualPrescriptionFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setManualPrescriptionFiles(files.slice(0, 1));
  };

  const handleSaveManualPrescription = async () => {
    if (!manualPrescriptionFiles.length) {
      addToast({
        title: "File required",
        description: "Please upload or scan a manual prescription first.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    if (!appointmentId) {
      addToast({
        title: "Appointment not found",
        description:
          "Unable to save manual prescription without appointment ID.",
        color: "danger",
        variant: "flat",
      });
      return;
    }

    try {
      setIsSavingManualPrescription(true);

      await updateDoctorManualPrescription({
        appointmentId,
        file: manualPrescriptionFiles[0],
      }).unwrap();

      addToast({
        title: "Manual prescription saved",
        description: "Prescription uploaded successfully.",
        color: "success",
        variant: "flat",
      });

      setIsManualPrescriptionModalOpen(false);
      setManualPrescriptionFiles([]);

      await refetchAppointment();
      await refetchReports();
    } catch (e: any) {
      addToast({
        title: "Failed to save manual prescription",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setIsSavingManualPrescription(false);
    }
  };

  return {
    isManualPrescriptionModalOpen,
    setIsManualPrescriptionModalOpen,
    manualPrescriptionModalVariant,
    openManualPrescriptionModal,
    manualPrescriptionFiles,
    setManualPrescriptionFiles,
    isSavingManualPrescription,
    handleManualPrescriptionOpenChange,
    handleManualPrescriptionFileChange,
    handleSaveManualPrescription,
  };
};

export default useManualPrescription;
