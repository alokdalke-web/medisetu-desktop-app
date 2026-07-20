import { addToast } from "@heroui/react";
import { useState } from "react";

type FormType = "consent" | "refer";

type UseConsentUploadArgs = {
  appointmentId?: string;
  uploadAppointmentConsent: any;
  refetchAppointment: () => any;
  refetchReports: () => any;
  setActiveFormType: (formType: FormType) => void;
};

const useConsentUpload = ({
  appointmentId,
  uploadAppointmentConsent,
  refetchAppointment,
  refetchReports,
  setActiveFormType,
}: UseConsentUploadArgs) => {
  const [isConsentUploadModalOpen, setIsConsentUploadModalOpen] =
    useState(false);
  const [pickedConsentFiles, setPickedConsentFiles] = useState<File[]>([]);
  const [consentUploadNote, setConsentUploadNote] = useState("");
  const [isUploadingConsent, setIsUploadingConsent] = useState(false);

  const handleConsentUploadOpenChange = (open: boolean) => {
    setIsConsentUploadModalOpen(open);

    if (!open) {
      setPickedConsentFiles([]);
      setConsentUploadNote("");
    }
  };

  const handleSaveConsentUpload = async () => {
    if (!appointmentId) {
      addToast({
        title: "Appointment not found",
        description: "Unable to upload consent without appointment ID.",
        color: "danger",
        variant: "flat",
      });
      return;
    }

    if (!pickedConsentFiles.length) {
      addToast({
        title: "No file selected",
        description: "Please select or scan a consent file first.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    try {
      setIsUploadingConsent(true);

      await uploadAppointmentConsent({
        appointmentId,
        file: pickedConsentFiles[0],
        note: consentUploadNote,
      }).unwrap();

      addToast({
        title: "Consent uploaded",
        description: "Consent file uploaded successfully.",
        color: "success",
        variant: "flat",
      });

      setIsConsentUploadModalOpen(false);
      setPickedConsentFiles([]);
      setConsentUploadNote("");
      setActiveFormType("consent");

      refetchAppointment();
      refetchReports();
    } catch (e: any) {
      addToast({
        title: "Failed to upload consent",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setIsUploadingConsent(false);
    }
  };

  return {
    isConsentUploadModalOpen,
    setIsConsentUploadModalOpen,
    pickedConsentFiles,
    setPickedConsentFiles,
    consentUploadNote,
    setConsentUploadNote,
    isUploadingConsent,
    handleConsentUploadOpenChange,
    handleSaveConsentUpload,
  };
};

export default useConsentUpload;
