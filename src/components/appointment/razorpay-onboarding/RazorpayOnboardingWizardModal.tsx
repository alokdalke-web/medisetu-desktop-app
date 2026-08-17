import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  addToast,
} from "@heroui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FiCheck } from "react-icons/fi";
import {
  onboardRouteFormSchema,
  ONBOARDING_STEP_FIELDS,
  type OnboardRouteFormValues,
} from "../../../schemas/razorpayOnboarding";
import {
  useSubmitOnboardingRouteMutation,
  useUploadOnboardingDocumentMutation,
} from "../../../redux/api/clinicApi";
import type {
  OnboardRouteRequestDto,
  OnboardingDocumentType,
} from "../../../types/razorpayOnboarding";
import { DOCUMENT_SLOTS, WIZARD_STEP_LABELS } from "./wizardConfig";
import Step1BusinessDetails from "./Step1BusinessDetails";
import Step2Stakeholder from "./Step2Stakeholder";
import Step3BankAccount, { type IfscLookupState } from "./Step3BankAccount";
import Step4Documents, { type DocumentUploadStatus } from "./Step4Documents";
import Step5Consent from "./Step5Consent";

const EMPTY_DOCUMENT_STATUS: Record<OnboardingDocumentType, DocumentUploadStatus> = {
  pan: { uploaded: false },
  aadhaar_front: { uploaded: false },
  aadhaar_back: { uploaded: false },
  cancelled_cheque: { uploaded: false },
};

const buildDefaultValues = (
  draft?: Partial<OnboardRouteRequestDto> | null,
): OnboardRouteFormValues =>
  ({
    legalBusinessName: draft?.legalBusinessName ?? "",
    businessType: draft?.businessType ?? "",
    address: {
      street: draft?.address?.street ?? "",
      city: draft?.address?.city ?? "",
      state: draft?.address?.state ?? "",
      postalCode: draft?.address?.postalCode ?? "",
    },
    stakeholder: {
      name: draft?.stakeholder?.name ?? "",
      email: draft?.stakeholder?.email ?? "",
      phone: draft?.stakeholder?.phone ?? "",
      pan: draft?.stakeholder?.pan ?? "",
      dob: draft?.stakeholder?.dob ?? "",
    },
    bankDetails: {
      beneficiaryName: draft?.bankDetails?.beneficiaryName ?? "",
      accountNumber: draft?.bankDetails?.accountNumber ?? "",
      ifscCode: draft?.bankDetails?.ifscCode ?? "",
      accountType: draft?.bankDetails?.accountType ?? "",
    },
    tncAccepted: false,
  }) as OnboardRouteFormValues;

const resolveErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as { data?: { message?: string } } | undefined)?.data;
  return typeof data?.message === "string" && data.message.trim()
    ? data.message
    : fallback;
};

interface RazorpayOnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft?: Partial<OnboardRouteRequestDto> | null;
  uploadedDocuments?: Partial<Record<OnboardingDocumentType, DocumentUploadStatus>>;
  onSubmitted: () => void;
}

const RazorpayOnboardingWizardModal: React.FC<RazorpayOnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  draft,
  uploadedDocuments,
  onSubmitted,
}) => {
  const [activeStep, setActiveStep] = useState(1);
  const [documents, setDocuments] = useState(EMPTY_DOCUMENT_STATUS);
  const [uploadingType, setUploadingType] = useState<OnboardingDocumentType | null>(
    null,
  );
  const [ifscLookupState, setIfscLookupState] = useState<IfscLookupState>("idle");

  const [submitOnboardingRoute, { isLoading: isSubmitting }] =
    useSubmitOnboardingRouteMutation();
  const [uploadOnboardingDocument] = useUploadOnboardingDocumentMutation();

  const { control, handleSubmit, trigger, reset } =
    useForm<OnboardRouteFormValues>({
      resolver: zodResolver(onboardRouteFormSchema),
      defaultValues: buildDefaultValues(draft),
      mode: "onBlur",
    });

  useEffect(() => {
    if (isOpen) {
      reset(buildDefaultValues(draft));
      setDocuments({ ...EMPTY_DOCUMENT_STATUS, ...uploadedDocuments });
      setActiveStep(1);
      setIfscLookupState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const allDocumentsUploaded = DOCUMENT_SLOTS.every(
    (slot) => documents[slot.documentType]?.uploaded,
  );

  const handleUploadDocument = useCallback(
    async (documentType: OnboardingDocumentType, file: File) => {
      setUploadingType(documentType);
      try {
        await uploadOnboardingDocument({ file, documentType }).unwrap();
        setDocuments((prev) => ({
          ...prev,
          [documentType]: { uploaded: true, fileName: file.name },
        }));
        addToast({
          title: "Document uploaded",
          description: `${file.name} was uploaded successfully.`,
          color: "success",
        });
      } catch (error) {
        addToast({
          title: "Upload failed",
          description: resolveErrorMessage(
            error,
            "Could not upload this document. Please try again.",
          ),
          color: "danger",
        });
      } finally {
        setUploadingType(null);
      }
    },
    [uploadOnboardingDocument],
  );

  const handleNext = async () => {
    if (activeStep === 1) {
      const valid = await trigger(ONBOARDING_STEP_FIELDS[1]);
      if (!valid) return;
    } else if (activeStep === 2) {
      const valid = await trigger(ONBOARDING_STEP_FIELDS[2]);
      if (!valid) return;
    } else if (activeStep === 3) {
      const valid = await trigger(ONBOARDING_STEP_FIELDS[3]);
      if (!valid || ifscLookupState === "invalid") return;
    } else if (activeStep === 4) {
      if (!allDocumentsUploaded) {
        addToast({
          title: "Documents pending",
          description: "Please upload all four documents before continuing.",
          color: "warning",
        });
        return;
      }
    }
    setActiveStep((s) => Math.min(s + 1, WIZARD_STEP_LABELS.length));
  };

  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 1));

  const onValidSubmit = async (values: OnboardRouteFormValues) => {
    if (!allDocumentsUploaded) {
      addToast({
        title: "Documents pending",
        description: "Please upload all four documents before submitting.",
        color: "warning",
      });
      setActiveStep(4);
      return;
    }

    try {
      const result = await submitOnboardingRoute(
        values as OnboardRouteRequestDto,
      ).unwrap();
      addToast({
        title: "Application submitted",
        description:
          result?.message ??
          "Your onboarding application was submitted for verification.",
        color: "success",
      });
      onSubmitted();
      onClose();
    } catch (error) {
      addToast({
        title: "Submission failed",
        description: resolveErrorMessage(
          error,
          "Failed to submit onboarding application. Please try again.",
        ),
        color: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      isDismissable={!isSubmitting}
      classNames={{
        base: "rounded-2xl max-h-[90vh]",
        header: "border-b border-slate-100 dark:border-[#273244]",
        footer: "border-t border-slate-100 dark:border-[#273244]",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-3 pb-4">
          <span className="text-[15px] font-bold text-slate-800 dark:text-white">
            Connect Razorpay Account
          </span>
          <div className="flex items-center w-full">
            {WIZARD_STEP_LABELS.map((label, idx) => {
              const step = idx + 1;
              const isDone = step < activeStep;
              const isActive = step === activeStep;
              return (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-semibold border-2 transition-colors
                        ${isDone ? "bg-[#0D9488] border-[#0D9488] text-white" : isActive ? "border-[#0D9488] text-[#0D9488]" : "border-slate-200 text-slate-400 dark:border-[#273244]"}
                      `}
                    >
                      {isDone ? <FiCheck size={13} /> : step}
                    </div>
                    <span
                      className={`text-[9px] font-medium text-center leading-tight max-w-[64px] ${isActive ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}`}
                    >
                      {label}
                    </span>
                  </div>
                  {step < WIZARD_STEP_LABELS.length && (
                    <div
                      className={`flex-1 h-[2px] mx-1 mb-4 rounded-full ${isDone ? "bg-[#0D9488]" : "bg-slate-200 dark:bg-[#273244]"}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </ModalHeader>

        <ModalBody className="py-5">
          {activeStep === 1 && <Step1BusinessDetails control={control} />}
          {activeStep === 2 && <Step2Stakeholder control={control} />}
          {activeStep === 3 && (
            <Step3BankAccount
              control={control}
              onIfscLookupStateChange={setIfscLookupState}
            />
          )}
          {activeStep === 4 && (
            <Step4Documents
              documents={documents}
              uploadingType={uploadingType}
              onUpload={handleUploadDocument}
            />
          )}
          {activeStep === 5 && <Step5Consent control={control} />}
        </ModalBody>

        <ModalFooter className="flex items-center justify-between">
          <Button
            variant="light"
            onPress={activeStep === 1 ? onClose : handleBack}
            isDisabled={isSubmitting}
            className="text-[13px]"
          >
            {activeStep === 1 ? "Cancel" : "Back"}
          </Button>

          {activeStep < WIZARD_STEP_LABELS.length ? (
            <Button
              color="primary"
              onPress={handleNext}
              className="text-[13px] font-medium"
            >
              Next
            </Button>
          ) : (
            <Button
              color="primary"
              onPress={() => handleSubmit(onValidSubmit)()}
              isLoading={isSubmitting}
              className="text-[13px] font-medium"
            >
              Submit Application
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RazorpayOnboardingWizardModal;
