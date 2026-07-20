import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  Textarea,
} from "@heroui/react";
import React from "react";
import Images from "../../../constants/images";
import { FiX } from "react-icons/fi";

type ConsentFormSectionProps = {
  isOpen: boolean;
  setShowConsentForm: (open: boolean) => void;
  isEditingConsent: boolean;
  setIsEditingConsent: (open: boolean) => void;
  consentNotes: string;
  setConsentNotes: (value: string) => void;
  appointmentData: any;
  clinicData: any;
  clinic: any;
  patient: any;
  doctor: any;
  hasConsentNotes: boolean;
  isConsentPrinting: boolean;
  handleSaveAndPrintConsent: () => void | Promise<void>;
  handlePrintConsentForm: () => void | Promise<void>;
};

const ConsentFormSection: React.FC<ConsentFormSectionProps> = ({
  isOpen: showConsentForm,
  setShowConsentForm,
  isEditingConsent,
  setIsEditingConsent,
  consentNotes,
  setConsentNotes,
  appointmentData: a,
  clinicData,
  clinic,
  patient,
  doctor,
  hasConsentNotes,
  isConsentPrinting,
  handleSaveAndPrintConsent,
  handlePrintConsentForm,
}) => (
  <Modal
    hideCloseButton
    isOpen={showConsentForm}
    onOpenChange={(open) => {
      setShowConsentForm(open);
      if (!open) {
        setIsEditingConsent(false);
        // Reset to original notes if cancelled
        setConsentNotes(String(a?.consentNotes ?? ""));
      }
    }}
    placement="center"
    scrollBehavior="inside"
    size="5xl"
    classNames={{
      wrapper: "items-center p-3 sm:p-4",
      base: "m-0 max-h-[88dvh] w-[calc(100vw-24px)] max-w-[980px] overflow-hidden rounded-[22px] bg-[#E8F6F4] shadow-xl sm:max-h-[86dvh] sm:rounded-[26px]",
      body: "min-h-0 overflow-hidden p-0",
    }}
  >
    <ModalContent>
      {(onClose) => {
        const handleClose = () => {
          setShowConsentForm(false);
          setIsEditingConsent(false);
          setConsentNotes(String(a?.consentNotes ?? ""));
          onClose();
        };

        return (
          <>
            <div className="flex items-center justify-between border-b border-[#CFEAE5] bg-white px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-primary">
                  Consent Form
                </h2>
              </div>

              <button
                aria-label="Close consent form"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100"
                type="button"
                onClick={handleClose}
              >
                <FiX size={20} />
              </button>
            </div>

            <ModalBody className="flex min-h-0 flex-col p-0">
              <div className="min-h-0 max-h-[calc(88dvh-68px)] flex-1 overflow-y-auto overscroll-contain bg-[#E8F6F4] sm:max-h-[calc(86dvh-68px)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#9ECBC4] [&::-webkit-scrollbar-thumb]:hover:bg-primary">
                <div className="p-2.5 sm:p-3">
                  <div className="rounded-[20px] border border-[#D7ECE7] bg-white p-4 pr-12 shadow-sm sm:rounded-[22px] sm:p-5 sm:pr-14 lg:p-6 lg:pr-14">
                    {/* Top row with Clinic and Doctor Info */}
                    <div className="pb-3">
                      <div className="border-b border-[#CFEAE5] p-2 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        {/* Left: MediSetu Logo */}
                        <div className="flex-shrink-0">
                          <img
                            src={Images.mediSetuLogo}
                            alt="Infinity MediSetu"
                            className="w-50 object-contain"
                          />
                        </div>

                        {/* Right: Clinic Info */}
                        <div className="flex-1 text-left md:text-right">
                          <div className="flex flex-wrap items-center gap-3 md:justify-end">
                            {(clinicData as any)?.clinic?.clinicLogo && (
                              <img
                                src={(clinicData as any)?.clinic?.clinicLogo}
                                alt="Clinic Logo"
                                className="h-9 w-auto object-contain"
                              />
                            )}
                            <p className="text-lg font-semibold text-primary sm:text-[20px]">
                              {clinic?.name ||
                                (clinicData as any)?.clinic?.clinicName ||
                                "Infinity MediSetu"}
                            </p>
                          </div>

                          {/* Clinic contact and address */}
                          <div className="mt-1 space-y-1">
                            {((clinicData as any)?.clinic?.clinicPhone ||
                              clinic?.phone) && (
                              <p className="text-xs text-slate-600">
                                Tel:{" "}
                                {(clinicData as any)?.clinic?.clinicPhone ||
                                  clinic?.phone}
                              </p>
                            )}
                            <p className="text-xs text-slate-600">
                              {((clinicData as any)?.clinic?.clinicAddress ||
                                clinic?.addressLine1) && (
                                <span>
                                  {(clinicData as any)?.clinic?.clinicAddress ||
                                    clinic?.addressLine1}
                                </span>
                              )}
                              {(clinicData as any)?.clinic?.ZipCode && (
                                <span>
                                  , {(clinicData as any)?.clinic?.ZipCode}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-600">
                              {(clinicData as any)?.clinic?.City && (
                                <span>
                                  {(clinicData as any)?.clinic?.City}
                                </span>
                              )}
                              {(clinicData as any)?.clinic?.State && (
                                <span>
                                  , {(clinicData as any)?.clinic?.State}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Patient Details Row */}
                      <div className="mt-3 rounded-lg border border-[#D8ECE7] bg-[#F4FBFA] p-3">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div>
                            <p className="text-xs font-semibold uppercase text-primary">
                              Patient Name
                            </p>
                            <p className="text-sm font-medium text-slate-800">
                              {patient.name || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-primary">
                              Age
                            </p>
                            <p className="text-sm font-medium text-slate-800">
                              {patient.age || "—"} yrs
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-primary">
                              Gender
                            </p>
                            <p className="text-sm font-medium text-slate-800">
                              {patient.gender || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-primary">
                              Date
                            </p>
                            <p className="text-sm font-medium text-slate-800">
                              {new Date().toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="py-4 text-center">
                      <h3 className="text-2xl font-bold leading-tight text-primary sm:text-[28px]">
                        Consent Form
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Consent for Checkup / Procedure / Surgery
                      </p>
                    </div>

                    {/* Declaration */}
                    <div className="rounded-[16px] border border-[#D8ECE7] bg-[#F4FBFA] p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                        Declaration
                      </p>
                      <p className="text-sm leading-6 text-slate-700">
                        I,{" "}
                        <span className="font-semibold">
                          {patient.name || "________________"}
                        </span>
                        , hereby confirm that I have been informed about the
                        nature of the checkup / procedure / surgery, its
                        expected benefits, possible risks, and available
                        alternatives. I understand that no guarantee has been
                        given regarding the outcome of the treatment. I
                        voluntarily give my consent to proceed with the advised
                        medical evaluation / procedure / treatment under the
                        supervision of{" "}
                        <span className="font-semibold">
                          {doctor.name
                            ? `Dr. ${doctor.name}`
                            : "________________"}
                        </span>
                        .
                      </p>
                    </div>

                    {/* Notes */}
                    <div className="pt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                        Notes
                      </p>

                      <Textarea
                        labelPlacement="outside"
                        placeholder="Enter consent notes..."
                        minRows={3}
                        variant="bordered"
                        radius="lg"
                        value={consentNotes}
                        onValueChange={setConsentNotes}
                        classNames={{
                          inputWrapper: `bg-white border-[#D7ECE7] shadow-none data-[hover=true]:border-[#BFE0D9] ${
                            !isEditingConsent && hasConsentNotes
                              ? "bg-slate-50"
                              : ""
                          }`,
                          input: "text-slate-700",
                        }}
                        isReadOnly={!isEditingConsent && hasConsentNotes}
                      />
                    </div>

                    {/* Signatures */}
                    <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="text-center">
                        <div className="border-t-2 border-slate-400 pt-3">
                          <p className="text-sm font-medium text-slate-700">
                            {patient.name
                              ? `${patient.name}`
                              : "Patient Signature"}
                          </p>
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="border-t-2 border-slate-400 pt-3">
                          <p className="text-sm font-medium text-slate-700">
                            {doctor.name
                              ? `Dr. ${doctor.name}`
                              : "Doctor Signature"}
                          </p>
                          {doctor.speciality && (
                            <p className="mt-1 text-xs font-medium text-slate-600">
                              ({doctor.speciality})
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                      <p className="text-xs text-slate-400">
                        This is a legally binding document. Please read
                        carefully before signing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex flex-col-reverse gap-2 border-t border-[#CFEAE5] bg-white/95 px-3 py-3 shadow-[0_-10px_24px_rgba(15,23,42,0.05)] sm:flex-row sm:justify-end sm:px-4">
                <Button
                  radius="full"
                  variant="flat"
                  className="h-10 min-w-[108px] border border-[#D7ECE7] bg-white px-5 text-slate-700 shadow-none sm:w-auto"
                  onPress={handleClose}
                >
                  Close
                </Button>

                {/* Save button - shows when in edit mode */}
                {isEditingConsent && (
                  <Button
                    radius="full"
                    variant="flat"
                    className="h-10 border border-[#BFE0D9] bg-white px-5 text-primary sm:w-auto"
                    onPress={handleSaveAndPrintConsent}
                    isLoading={isConsentPrinting}
                    isDisabled={isConsentPrinting}
                  >
                    Save Consent
                  </Button>
                )}

                {/* Print button - shows when not editing and consent exists */}
                {!isEditingConsent && hasConsentNotes && (
                  <Button
                    radius="full"
                    variant="flat"
                    className="h-10 border border-[#BFE0D9] bg-white px-5 text-primary sm:w-auto"
                    onPress={handlePrintConsentForm}
                    isLoading={isConsentPrinting}
                    isDisabled={isConsentPrinting}
                  >
                    Print
                  </Button>
                )}
              </div>
            </ModalBody>
          </>
        );
      }}
    </ModalContent>
  </Modal>
);

export default ConsentFormSection;