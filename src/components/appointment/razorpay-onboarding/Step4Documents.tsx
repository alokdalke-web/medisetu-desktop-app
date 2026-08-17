import React from "react";
import DocumentUploadSlot from "./DocumentUploadSlot";
import { DOCUMENT_SLOTS } from "./wizardConfig";
import type { OnboardingDocumentType } from "../../../types/razorpayOnboarding";

export type DocumentUploadStatus = {
  uploaded: boolean;
  fileName?: string | null;
};

interface Step4DocumentsProps {
  documents: Record<OnboardingDocumentType, DocumentUploadStatus>;
  uploadingType: OnboardingDocumentType | null;
  onUpload: (documentType: OnboardingDocumentType, file: File) => void;
}

const Step4Documents: React.FC<Step4DocumentsProps> = ({
  documents,
  uploadingType,
  onUpload,
}) => {
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
        Upload clear copies of the following documents. Each file uploads as
        soon as it's selected — PDF, PNG or JPG, max 5MB per file.
      </p>
      {DOCUMENT_SLOTS.map((slot) => (
        <DocumentUploadSlot
          key={slot.documentType}
          label={slot.label}
          isUploaded={documents[slot.documentType]?.uploaded ?? false}
          fileName={documents[slot.documentType]?.fileName}
          isUploading={uploadingType === slot.documentType}
          isDisabled={uploadingType !== null && uploadingType !== slot.documentType}
          onSelectFile={(file) => onUpload(slot.documentType, file)}
        />
      ))}
    </div>
  );
};

export default Step4Documents;
