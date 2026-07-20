import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  Textarea,
} from "@heroui/react";
import React from "react";
import { FiCheckCircle, FiX } from "react-icons/fi";

import ConsentUploadModal from "../../../components/appointment/ConsentUploadModal";
import AddNewTestModal from "../../../components/prescription/AddNewTestModal";
import AppButton from "../../../components/shared/AppButton";
import AddMultipleServicesModal from "../AddMultipleServicesModal";
import AppointmentInvoicePreviewModal from "../appointmentInvoice";
import ManualPrescriptionModal from "../ManualPrescriptionModal";
import MarkNoShowModal from "../MarkNoShowModal";
import PayLaterModal from "../PayLaterModal";
import RefundPaymentModal from "../RefundPaymentModal";
import type { ManualPrescriptionModalVariant } from "../hooks/useManualPrescription";
import ConsentFormSection from "./ConsentFormSection";
import MedicalCertificateSection from "./MedicalCertificateSection";
import ReferFormSection from "./ReferFormSection";
import CancelAppointmentModal from "../CancelAppointmentModal";
import FormTypeSelectModal from "./modals/FormTypeSelectModal";
import ManualPrescriptionPreviewModal from "./modals/ManualPrescriptionPreviewModal";
import ManualPrescriptionUploadModal from "./modals/ManualPrescriptionUploadModal";

type AppointmentDetailsModalsProps = {
  appointment: any;
  appointmentData: any;
  addTestOpen: boolean;
  onAddTestOpenChange: (open: boolean) => void;
  clinicId?: string;
  isClinicLoading: boolean;
  addTestModalOptions: any[];
  assignedTestIds?: string[];
  selectedTestIds: string[];
  setSelectedTestIds: (value: string[]) => void;
  ensureTestsLoadedFromModal: () => void;
  handleAddTestFromPrescription: () => void | Promise<void>;
  isAddTestDisabled: boolean;
  isAssigning: boolean;
  handleCreateTestFromPrescription: (payload: any) => Promise<any>;
  isCreatingTest: boolean;
  isNoShowModalOpen: boolean;
  setIsNoShowModalOpen: (open: boolean) => void;
  handleNoShowSuccess: () => void;
  isRefundModalOpen: boolean;
  setIsRefundModalOpen: (open: boolean) => void;
  handleRefundSubmit: (data: {
    refundMode: string;
    refundAmount: number;
    refundNotes: string;
  }) => Promise<void>;
  isRefundProcessing: boolean;
  maxRefundAmount: number;
  isCancelConfirmOpen: boolean;
  setIsCancelConfirmOpen: (open: boolean) => void;
  closeCancelModal: () => void;
  handleCancel: () => Promise<void>;
  actionLoading: "cancel" | "confirm" | null;
  isManualPrescriptionModalOpen: boolean;
  manualPrescriptionModalVariant: ManualPrescriptionModalVariant;
  handleManualPrescriptionOpenChange: (open: boolean) => void;
  manualPrescriptionFiles: File[];
  setManualPrescriptionFiles: React.Dispatch<React.SetStateAction<File[]>>;
  handleManualPrescriptionFileChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  handleSaveManualPrescription: () => void | Promise<void>;
  isSavingManualPrescription: boolean;
  isMedicalCertificateModalOpen: boolean;
  setIsMedicalCertificateModalOpen: (open: boolean) => void;
  medicalCertificateReason: string;
  medicalCertificateRestDays: string;
  medicalCertificateRestrictions: string;
  fieldClassNames: any;
  setMedicalCertificateReason: (value: string) => void;
  setMedicalCertificateRestDays: (value: string) => void;
  setMedicalCertificateRestrictions: (value: string) => void;
  handleOpenMedicalCertificatePreview: () => void | Promise<void>;
  isSavingCertificate: boolean;
  isMedicalCertificatePreviewOpen: boolean;
  setIsMedicalCertificatePreviewOpen: (open: boolean) => void;
  medicalCertificatePreviewHtml: string;
  isMedicalCertificatePrinting: boolean;
  handleDownloadMedicalCertificate: () => void;
  handlePrintMedicalCertificate: () => void | Promise<void>;
  isReferModalOpen: boolean;
  setIsReferModalOpen: (open: boolean) => void;
  clinicData: any;
  clinic: any;
  doctor: any;
  patient: any;
  referredName: string;
  setReferredName: (value: string) => void;
  referredAddress: string;
  setReferredAddress: (value: string) => void;
  referredDoctorClinic: string;
  setReferredDoctorClinic: (value: string) => void;
  referredPhone: string;
  setReferredPhone: (value: string) => void;
  referNotes: string;
  setReferNotes: (value: string) => void;
  addToast: any;
  handleOpenReferPreview: () => void;
  isReferPreviewOpen: boolean;
  setIsReferPreviewOpen: (open: boolean) => void;
  referPreviewHtml: string;
  handlePrintReferForm: () => void | Promise<void>;
  isConsentPrinting: boolean;
  isAdminConfirmReasonModalOpen: boolean;
  setIsAdminConfirmReasonModalOpen: (open: boolean) => void;
  adminConfirmReason: string;
  setAdminConfirmReason: (value: string) => void;
  adminConfirmError: string;
  setAdminConfirmError: (value: string) => void;
  handleConfirmWithReason: () => void | Promise<void>;
  isConsentUploadModalOpen: boolean;
  handleConsentUploadOpenChange: (open: boolean) => void;
  pickedConsentFiles: File[];
  setPickedConsentFiles: React.Dispatch<React.SetStateAction<File[]>>;
  consentUploadNote: string;
  setConsentUploadNote: React.Dispatch<React.SetStateAction<string>>;
  handleSaveConsentUpload: () => void | Promise<void>;
  isUploadingConsent: boolean;
  isAddServiceModalOpen: boolean;
  setIsAddServiceModalOpen: (open: boolean) => void;
  handleAddMultipleServicesSuccess: () => void;
  showConsentForm: boolean;
  setShowConsentForm: (open: boolean) => void;
  isEditingConsent: boolean;
  setIsEditingConsent: (open: boolean) => void;
  consentNotes: string;
  setConsentNotes: (value: string) => void;
  hasConsentNotes: boolean;
  handleSaveAndPrintConsent: () => void | Promise<void>;
  handlePrintConsentForm: () => void | Promise<void>;
  isFormTypeModalOpen: boolean;
  setIsFormTypeModalOpen: (open: boolean) => void;
  handleSelectConsentFormType: () => void;
  handleSelectReferFormType: () => void;
  selectedInvoice: any;
  isInvoiceModalOpen: boolean;
  handleCloseInvoice: () => void;
  isPayLaterModalOpen: boolean;
  setIsPayLaterModalOpen: (open: boolean) => void;
  handlePayLaterSubmit: (data: {
    paymentMode: string;
    paymentNotes?: string;
  }) => Promise<void>;
  isPaymentProcessing: boolean;
  isManualPrescriptionPreviewOpen: boolean;
  setIsManualPrescriptionPreviewOpen: (open: boolean) => void;
  manualPrescriptionImageUrl: string;
};

const referralPreviewScrollbarCss = `
  html {
    scrollbar-gutter: stable;
  }

  html,
  body {
    scrollbar-width: thin;
    scrollbar-color: #9ecbc4 transparent;
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: #9ecbc4;
    border: 2px solid #ffffff;
    border-radius: 999px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #0f766e;
  }
`;

const buildReferralPreviewSrcDoc = (html: string) => {
  if (!html) return "";

  if (html.includes("</style>")) {
    return html.replace("</style>", `${referralPreviewScrollbarCss}</style>`);
  }

  return html.replace(
    "</head>",
    `<style>${referralPreviewScrollbarCss}</style></head>`,
  );
};

const AppointmentDetailsModals: React.FC<AppointmentDetailsModalsProps> = ({
  appointment,
  appointmentData,
  addTestOpen,
  onAddTestOpenChange,
  clinicId,
  isClinicLoading,
  addTestModalOptions,
  assignedTestIds,
  selectedTestIds,
  setSelectedTestIds,
  ensureTestsLoadedFromModal,
  handleAddTestFromPrescription,
  isAddTestDisabled,
  isAssigning,
  handleCreateTestFromPrescription,
  isCreatingTest,
  isNoShowModalOpen,
  setIsNoShowModalOpen,
  handleNoShowSuccess,
  isRefundModalOpen,
  setIsRefundModalOpen,
  handleRefundSubmit,
  isRefundProcessing,
  maxRefundAmount,
  isCancelConfirmOpen,
  setIsCancelConfirmOpen,
  closeCancelModal,
  handleCancel,
  actionLoading,
  isManualPrescriptionModalOpen,
  manualPrescriptionModalVariant,
  handleManualPrescriptionOpenChange,
  manualPrescriptionFiles,
  setManualPrescriptionFiles,
  handleManualPrescriptionFileChange,
  handleSaveManualPrescription,
  isSavingManualPrescription,
  isMedicalCertificateModalOpen,
  setIsMedicalCertificateModalOpen,
  medicalCertificateReason,
  medicalCertificateRestDays,
  medicalCertificateRestrictions,
  fieldClassNames,
  setMedicalCertificateReason,
  setMedicalCertificateRestDays,
  setMedicalCertificateRestrictions,
  handleOpenMedicalCertificatePreview,
  isSavingCertificate,
  isMedicalCertificatePreviewOpen,
  setIsMedicalCertificatePreviewOpen,
  medicalCertificatePreviewHtml,
  isMedicalCertificatePrinting,
  handleDownloadMedicalCertificate,
  handlePrintMedicalCertificate,
  isReferModalOpen,
  setIsReferModalOpen,
  clinicData,
  clinic,
  doctor,
  patient,
  referredName,
  setReferredName,
  referredAddress,
  setReferredAddress,
  referredDoctorClinic,
  setReferredDoctorClinic,
  referredPhone,
  setReferredPhone,
  referNotes,
  setReferNotes,
  addToast,
  handleOpenReferPreview,
  isReferPreviewOpen,
  setIsReferPreviewOpen,
  referPreviewHtml,
  handlePrintReferForm,
  isConsentPrinting,
  isAdminConfirmReasonModalOpen,
  setIsAdminConfirmReasonModalOpen,
  adminConfirmReason,
  setAdminConfirmReason,
  adminConfirmError,
  setAdminConfirmError,
  handleConfirmWithReason,
  isConsentUploadModalOpen,
  handleConsentUploadOpenChange,
  pickedConsentFiles,
  setPickedConsentFiles,
  consentUploadNote,
  setConsentUploadNote,
  handleSaveConsentUpload,
  isUploadingConsent,
  isAddServiceModalOpen,
  setIsAddServiceModalOpen,
  handleAddMultipleServicesSuccess,
  showConsentForm,
  setShowConsentForm,
  isEditingConsent,
  setIsEditingConsent,
  consentNotes,
  setConsentNotes,
  hasConsentNotes,
  handleSaveAndPrintConsent,
  handlePrintConsentForm,
  isFormTypeModalOpen,
  setIsFormTypeModalOpen,
  handleSelectConsentFormType,
  handleSelectReferFormType,
  selectedInvoice,
  isInvoiceModalOpen,
  handleCloseInvoice,
  isPayLaterModalOpen,
  setIsPayLaterModalOpen,
  handlePayLaterSubmit,
  isPaymentProcessing,
  isManualPrescriptionPreviewOpen,
  setIsManualPrescriptionPreviewOpen,
  manualPrescriptionImageUrl,
}) => (
  <>
    <AddNewTestModal
      isOpen={addTestOpen}
      onOpenChange={onAddTestOpenChange}
      clinicId={clinicId}
      isClinicLoading={isClinicLoading}
      options={addTestModalOptions}
      values={selectedTestIds}
      onValuesChange={setSelectedTestIds}
      assignedValues={assignedTestIds}
      ensureTestsLoaded={ensureTestsLoadedFromModal}
      onAdd={handleAddTestFromPrescription}
      isAddDisabled={isAddTestDisabled}
      isAdding={isAssigning}
      onCreateTest={handleCreateTestFromPrescription}
      isCreatingTest={isCreatingTest}
    />
    <MarkNoShowModal
      isOpen={isNoShowModalOpen}
      onOpenChange={setIsNoShowModalOpen}
      appointmentId={String(appointment.id)}
      onSuccess={handleNoShowSuccess}
    />
    <RefundPaymentModal
      isOpen={isRefundModalOpen}
      onOpenChange={setIsRefundModalOpen}
      onSubmit={handleRefundSubmit}
      isLoading={isRefundProcessing}
      maxRefundAmount={maxRefundAmount}
    />

    <CancelAppointmentModal
      isOpen={isCancelConfirmOpen}
      onOpenChange={setIsCancelConfirmOpen}
      appointmentId={String(appointment.id)}
      patientName={appointment?.patient?.name || appointment?.name || "Patient"}
      onSuccess={async () => {
        closeCancelModal();
        await handleCancel();
      }}
    />

    <ManualPrescriptionUploadModal
      isOpen={
        isManualPrescriptionModalOpen &&
        manualPrescriptionModalVariant === "upload"
      }
      onOpenChange={handleManualPrescriptionOpenChange}
      files={manualPrescriptionFiles}
      onFileChange={handleManualPrescriptionFileChange}
      onSave={handleSaveManualPrescription}
    />

    <MedicalCertificateSection
      isFormOpen={isMedicalCertificateModalOpen}
      onFormOpenChange={setIsMedicalCertificateModalOpen}
      reason={medicalCertificateReason}
      restDays={medicalCertificateRestDays}
      restrictions={medicalCertificateRestrictions}
      fieldClassNames={fieldClassNames}
      onReasonChange={setMedicalCertificateReason}
      onRestDaysChange={(value) => {
        const numValue = parseInt(value);
        if (value === "" || value === null) {
          setMedicalCertificateRestDays("");
        } else if (!isNaN(numValue) && numValue >= 0) {
          setMedicalCertificateRestDays(numValue.toString());
        }
      }}
      onRestrictionsChange={setMedicalCertificateRestrictions}
      onPreview={handleOpenMedicalCertificatePreview}
      isSaving={isSavingCertificate}
      isPreviewOpen={isMedicalCertificatePreviewOpen}
      onPreviewOpenChange={setIsMedicalCertificatePreviewOpen}
      previewHtml={medicalCertificatePreviewHtml}
      isPrinting={isMedicalCertificatePrinting}
      onDownload={handleDownloadMedicalCertificate}
      onPrint={handlePrintMedicalCertificate}
    />

    <ReferFormSection
      isOpen={isReferModalOpen}
      onOpenChange={setIsReferModalOpen}
      clinicData={clinicData}
      clinic={clinic}
      doctor={doctor}
      patient={patient}
      referredName={referredName}
      setReferredName={setReferredName}
      referredAddress={referredAddress}
      setReferredAddress={setReferredAddress}
      referredDoctorClinic={referredDoctorClinic}
      setReferredDoctorClinic={setReferredDoctorClinic}
      referredPhone={referredPhone}
      setReferredPhone={setReferredPhone}
      referNotes={referNotes}
      setReferNotes={setReferNotes}
      addToast={addToast}
      handleOpenReferPreview={handleOpenReferPreview}
    />

    <Modal
      hideCloseButton
      isOpen={isReferPreviewOpen}
      onOpenChange={setIsReferPreviewOpen}
      placement="center"
      scrollBehavior="inside"
      size="5xl"
      classNames={{
        wrapper: "items-center p-3 sm:p-4",
        base: "relative m-0 max-h-[90dvh] w-[calc(100vw-24px)] max-w-[1024px] overflow-hidden rounded-[22px] bg-white shadow-xl sm:max-h-[88dvh] sm:rounded-[26px]",
        body: "min-h-0 overflow-hidden p-0",
      }}
    >
      <ModalContent>
        {(onClose) => {
          const handlePreviewClose = () => {
            setIsReferPreviewOpen(false);
            onClose();
          };

          return (
            <>
              <button
                aria-label="Close referral preview"
                className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-[#D7ECE7] bg-white text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.12)] transition hover:bg-[#F4FBFA] hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                type="button"
                onClick={handlePreviewClose}
              >
                <FiX size={18} />
              </button>

              <ModalBody className="flex min-h-0 flex-col p-0">
                <div className="border-b border-[#D7ECE7] bg-[#F8FCFB] px-4 py-3 pr-16 sm:px-6 sm:py-4">
                 
                  <h3 className="mt-1 text-lg font-semibold text-slate-800">
                    Patient Referral Form
                  </h3>
                </div>

                <div className="min-h-0 flex-1 bg-[#EEF7F6] p-3 sm:p-4">
                  <div className="h-[calc(90dvh-156px)] overflow-hidden rounded-[18px] border border-[#D7ECE7] bg-white shadow-sm sm:h-[calc(88dvh-164px)]">
                    <iframe
                      title="Referral Preview"
                      srcDoc={buildReferralPreviewSrcDoc(referPreviewHtml)}
                      className="h-full w-full border-0 bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-[#D7ECE7] bg-white px-4 py-3 shadow-[0_-10px_24px_rgba(15,23,42,0.05)] sm:flex-row sm:justify-end sm:px-6">
                  <Button
                    radius="full"
                    variant="bordered"
                    className="h-10 min-w-[108px] border-slate-300 text-slate-700 sm:w-auto"
                    onPress={handlePreviewClose}
                  >
                    Close
                  </Button>

                  <Button
                    radius="full"
                    variant="flat"
                    className="h-10 min-w-[124px] bg-primary px-5 text-white sm:w-auto"
                    isLoading={isConsentPrinting}
                    onPress={handlePrintReferForm}
                  >
                    Print & Save
                  </Button>
                </div>
              </ModalBody>
            </>
          );
        }}
      </ModalContent>
    </Modal>

    <Modal
      isOpen={isAdminConfirmReasonModalOpen}
      onOpenChange={setIsAdminConfirmReasonModalOpen}
      size="md"
      classNames={{ base: "rounded-2xl" }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalBody className="p-6">
              <div className="flex justify-center mt-2">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <FiCheckCircle className="text-amber-600" size={22} />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-center mt-2">
                Confirm Appointment for Another Doctor
              </h2>
              <p className="text-sm text-slate-500 text-center mt-1">
                Please provide a reason for this action before proceeding.
              </p>

              <Textarea
                placeholder="Enter confirmation reason"
                value={adminConfirmReason}
                onValueChange={setAdminConfirmReason}
                radius="lg"
                variant="bordered"
                className="mt-4"
                minRows={4}
                classNames={{
                  inputWrapper:
                    "border-slate-200 bg-white shadow-none data-[hover=true]:border-slate-300",
                }}
              />
              {adminConfirmError && (
                <p className="text-sm text-danger mt-2">
                  {adminConfirmError}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <AppButton
                  text="Cancel"
                  onPress={() => {
                    setIsAdminConfirmReasonModalOpen(false);
                    setAdminConfirmReason("");
                    setAdminConfirmError("");
                    onClose();
                  }}
                  className="w-1/2 bg-white border border-neutral-300 text-slate-600"
                />
                <AppButton
                  text="Confirm with Reason"
                  onPress={handleConfirmWithReason}
                  isLoading={actionLoading === "confirm"}
                  className="w-1/2"
                />
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
    <ConsentUploadModal
      isOpen={isConsentUploadModalOpen}
      onOpenChange={handleConsentUploadOpenChange}
      pickedFiles={pickedConsentFiles}
      setPickedFiles={setPickedConsentFiles}
      consentUploadNote={consentUploadNote}
      setConsentUploadNote={setConsentUploadNote}
      onSave={handleSaveConsentUpload}
      isSaving={isUploadingConsent}
      saveDisabled={!pickedConsentFiles.length}
    />
    <ManualPrescriptionModal
      isOpen={isManualPrescriptionModalOpen}
      onOpenChange={handleManualPrescriptionOpenChange}
      variant={manualPrescriptionModalVariant}
      pickedFiles={manualPrescriptionFiles}
      setPickedFiles={setManualPrescriptionFiles}
      appointmentId={appointment.id ? String(appointment.id) : undefined}
      onSave={handleSaveManualPrescription}
      saveDisabled={!manualPrescriptionFiles.length}
      isSaving={isSavingManualPrescription}
    />
    <AddMultipleServicesModal
      isOpen={isAddServiceModalOpen}
      onOpenChange={setIsAddServiceModalOpen}
      appointmentId={appointment.id}
      onSuccess={handleAddMultipleServicesSuccess}
    />
    <ConsentFormSection
      isOpen={showConsentForm}
      setShowConsentForm={setShowConsentForm}
      isEditingConsent={isEditingConsent}
      setIsEditingConsent={setIsEditingConsent}
      consentNotes={consentNotes}
      setConsentNotes={setConsentNotes}
      appointmentData={appointmentData}
      clinicData={clinicData}
      clinic={clinic}
      patient={patient}
      doctor={doctor}
      hasConsentNotes={hasConsentNotes}
      isConsentPrinting={isConsentPrinting}
      handleSaveAndPrintConsent={handleSaveAndPrintConsent}
      handlePrintConsentForm={handlePrintConsentForm}
    />

    <FormTypeSelectModal
      isOpen={isFormTypeModalOpen}
      onOpenChange={setIsFormTypeModalOpen}
      onSelectConsent={handleSelectConsentFormType}
      onSelectRefer={handleSelectReferFormType}
    />

    {selectedInvoice && (
      <AppointmentInvoicePreviewModal
        isOpen={isInvoiceModalOpen}
        onClose={handleCloseInvoice}
        invoiceData={selectedInvoice}
      />
    )}
    <PayLaterModal
      isOpen={isPayLaterModalOpen}
      onOpenChange={setIsPayLaterModalOpen}
      onSubmit={handlePayLaterSubmit}
      isLoading={isPaymentProcessing}
    />
    <ManualPrescriptionPreviewModal
      isOpen={isManualPrescriptionPreviewOpen}
      onOpenChange={setIsManualPrescriptionPreviewOpen}
      imageUrl={manualPrescriptionImageUrl}
    />
  </>
);

export default AppointmentDetailsModals;
