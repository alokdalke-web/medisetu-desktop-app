import { addToast } from "@heroui/react";

type UseMedicalCertificateActionsArgs = {
  appointmentId: string;
  medicalCertificateReason: string;
  medicalCertificateRestDays: string;
  medicalCertificateRestrictions: string;
  patient: any;
  buildMedicalCertificatePrintHtml: () => string;
  saveMedicalCertificate: any;
  refetchMedicalCertificate: () => any;
  isMedicalCertificatePrinting: boolean;
  setIsMedicalCertificatePrinting: (value: boolean) => void;
  setMedicalCertificatePreviewHtml: (value: string) => void;
  setIsMedicalCertificatePreviewOpen: (value: boolean) => void;
};

const useMedicalCertificateActions = ({
  appointmentId,
  medicalCertificateReason,
  medicalCertificateRestDays,
  medicalCertificateRestrictions,
  patient,
  buildMedicalCertificatePrintHtml,
  saveMedicalCertificate,
  refetchMedicalCertificate,
  isMedicalCertificatePrinting,
  setIsMedicalCertificatePrinting,
  setMedicalCertificatePreviewHtml,
  setIsMedicalCertificatePreviewOpen,
}: UseMedicalCertificateActionsArgs) => {
  const validateMedicalCertificate = () => {
    if (!medicalCertificateReason.trim()) {
      addToast({
        title: "Reason required",
        description: "Please enter illness / reason.",
        color: "warning",
        variant: "flat",
      });
      return false;
    }

    const restDaysNum = parseInt(medicalCertificateRestDays);
    if (isNaN(restDaysNum)) {
      addToast({
        title: "Rest days required",
        description: "Please enter rest days.",
        color: "warning",
        variant: "flat",
      });
      return false;
    }

    if (restDaysNum < 0 || restDaysNum > 365) {
      addToast({
        title: "Invalid rest days",
        description: "Rest days must be between 0 and 365.",
        color: "warning",
        variant: "flat",
      });
      return false;
    }

    return true;
  };

  const handleDownloadMedicalCertificate = () => {
    if (!validateMedicalCertificate()) return;

    try {
      const html = buildMedicalCertificatePrintHtml();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      const safePatientName = String(patient.name || "patient")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_");

      link.href = url;
      link.download = `medical_certificate_${safePatientName || "patient"}.html`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      addToast({
        title: "Certificate downloaded",
        description: "Medical certificate downloaded successfully.",
        color: "success",
        variant: "flat",
      });
    } catch (e: any) {
      addToast({
        title: "Download failed",
        description: e?.message || "Unable to download medical certificate.",
        color: "danger",
        variant: "flat",
      });
    }
  };

  const handleOpenMedicalCertificatePreview = async () => {
    if (!medicalCertificateReason.trim()) {
      addToast({
        title: "Reason required",
        description: "Please enter medical reason / condition.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    if (!medicalCertificateRestDays.trim()) {
      addToast({
        title: "Rest days required",
        description: "Please enter recommended rest days.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    // Parse notes from textarea (split by newline, filter empty)
    const notesArray = medicalCertificateRestrictions
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    try {
      // Save the medical certificate data via POST API with appointmentId in URL
      await saveMedicalCertificate({
        appointmentId,
        medicalCondition: medicalCertificateReason.trim(),
        restDays: parseInt(medicalCertificateRestDays) || 0,
        notes: notesArray,
      }).unwrap();

      addToast({
        title: "Medical certificate saved",
        description: "Certificate data has been saved successfully.",
        color: "success",
        variant: "flat",
      });

      // After saving, generate preview
      setMedicalCertificatePreviewHtml(buildMedicalCertificatePrintHtml());
      setIsMedicalCertificatePreviewOpen(true);

      // Refresh the data
      refetchMedicalCertificate();
    } catch (e: any) {
      addToast({
        title: "Failed to save medical certificate",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    }
  };

  const handlePrintMedicalCertificate = async () => {
    if (isMedicalCertificatePrinting) return;

    const html = buildMedicalCertificatePrintHtml();
    const printWindow = window.open("", "_blank", "width=900,height=1000");

    if (!printWindow) {
      addToast({
        title: "Popup blocked",
        description: "Please allow popups to print the medical certificate.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    try {
      setIsMedicalCertificatePrinting(true);

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch {}
        }, 250);
      };

      printWindow.onafterprint = () => {
        try {
          printWindow.close();
        } catch {}
      };
    } catch (e: any) {
      try {
        printWindow.close();
      } catch {}

      addToast({
        title: "Print failed",
        description: e?.message || "Unable to print medical certificate.",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setTimeout(() => {
        setIsMedicalCertificatePrinting(false);
      }, 500);
    }
  };

  return {
    handleDownloadMedicalCertificate,
    handleOpenMedicalCertificatePreview,
    handlePrintMedicalCertificate,
  };
};

export default useMedicalCertificateActions;
