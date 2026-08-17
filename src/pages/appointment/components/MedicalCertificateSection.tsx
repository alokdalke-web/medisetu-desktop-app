import React from "react";

import MedicalCertificateFormModal from "./modals/MedicalCertificateFormModal";
import MedicalCertificatePreviewModal from "./modals/MedicalCertificatePreviewModal";

type MedicalCertificateSectionProps = {
  isFormOpen: boolean;
  onFormOpenChange: (open: boolean) => void;
  reason: string;
  restDays: string;
  restrictions: string;
  fieldClassNames: any;
  onReasonChange: (value: string) => void;
  onRestDaysChange: (value: string) => void;
  onRestrictionsChange: (value: string) => void;
  onPreview: () => void | Promise<void>;
  isSaving: boolean;
  isPreviewOpen: boolean;
  onPreviewOpenChange: (open: boolean) => void;
  previewHtml: string;
  isPrinting: boolean;
  onDownload: () => void;
  onPrint: () => void | Promise<void>;
};

const MedicalCertificateSection: React.FC<MedicalCertificateSectionProps> = ({
  isFormOpen,
  onFormOpenChange,
  reason,
  restDays,
  restrictions,
  fieldClassNames,
  onReasonChange,
  onRestDaysChange,
  onRestrictionsChange,
  onPreview,
  isSaving,
  isPreviewOpen,
  onPreviewOpenChange,
  previewHtml,
  isPrinting,
  onDownload,
  onPrint,
}) => (
  <>
    <MedicalCertificateFormModal
      isOpen={isFormOpen}
      onOpenChange={onFormOpenChange}
      reason={reason}
      restDays={restDays}
      restrictions={restrictions}
      fieldClassNames={fieldClassNames}
      onReasonChange={onReasonChange}
      onRestDaysChange={onRestDaysChange}
      onRestrictionsChange={onRestrictionsChange}
      onPreview={onPreview}
      isSaving={isSaving}
    />

    <MedicalCertificatePreviewModal
      isOpen={isPreviewOpen}
      onOpenChange={onPreviewOpenChange}
      previewHtml={previewHtml}
      isPrinting={isPrinting}
      onDownload={onDownload}
      onPrint={onPrint}
    />
  </>
);

export default MedicalCertificateSection;
