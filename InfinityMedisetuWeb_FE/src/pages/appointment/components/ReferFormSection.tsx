import { Button, Input, Modal, ModalBody, ModalContent, Textarea } from "@heroui/react";
import React from "react";
import { FiEye, FiX } from "react-icons/fi";
import Images from "../../../constants/images";

type ReferFormSectionProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
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
  addToast: (toast: any) => void;
  handleOpenReferPreview: () => void;
};

const ReferFormSection: React.FC<ReferFormSectionProps> = ({
  isOpen: isReferModalOpen,
  onOpenChange: setIsReferModalOpen,
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
}) => (
  <Modal
    hideCloseButton
    isOpen={isReferModalOpen}
    onOpenChange={setIsReferModalOpen}
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
          setIsReferModalOpen(false);
          onClose();
        };

        return (
          <>
            <div className="flex items-center justify-between border-b border-[#CFEAE5] bg-white px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-primary">
                  Patient Referral Form
                </h2>
              </div>

              <button
                aria-label="Close referral form"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100"
                type="button"
                onClick={handleClose}
              >
                <FiX size={20} />
              </button>
            </div>

            <ModalBody className="flex min-h-0 flex-col p-0">
              <div className="min-h-0 max-h-[calc(88dvh-68px)] flex-1 overflow-y-auto overscroll-contain bg-[#E8F6F4] sm:max-h-[calc(86dvh-68px)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#9ECBC4] [&::-webkit-scrollbar-thumb:hover]:bg-primary">
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
                                    src={
                                      (clinicData as any)?.clinic?.clinicLogo
                                    }
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
                                  {((clinicData as any)?.clinic
                                    ?.clinicAddress ||
                                    clinic?.addressLine1) && (
                                    <span>
                                      {(clinicData as any)?.clinic
                                        ?.clinicAddress || clinic?.addressLine1}
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

                          {/* Doctor Info Row with Date */}
                          <div className=" mt-3 rounded-lg border border-[#D8ECE7] bg-[#F4FBFA] p-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="text-left">
                                <p className="text-xs font-semibold uppercase text-primary">
                                  Referring Doctor
                                </p>
                                <p className="text-sm font-medium text-slate-800">
                                  {doctor.name ? `Dr. ${doctor.name}` : "—"}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {doctor.speciality ||
                                    doctor.qualification ||
                                    "Medical Specialist"}
                                </p>
                              </div>
                              <div className="text-left sm:text-right">
                                <p className="text-xs font-semibold uppercase text-primary">
                                  Date of Referral
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
                            Patient Referral Form
                          </h3>
                          <p className="mt-2 text-sm text-slate-600">
                            Referral to Doctor / Lab / Specialist
                          </p>
                        </div>

                        {/* Referred To Details */}
                        <div className="mt-2">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                            Referred To
                          </p>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Input
                              label="Name"
                              placeholder="Enter doctor / lab name / clinic name"
                              value={referredName}
                              onValueChange={setReferredName}
                              radius="lg"
                              variant="bordered"
                              classNames={{
                                inputWrapper:
                                  "border-[#D7ECE7] bg-white shadow-none data-[hover=true]:border-[#BFE0D9]",
                                label: "text-slate-700 text-xs font-semibold",
                                input: "text-slate-700",
                              }}
                            />

                            <Input
                              label="Speciality / Type"
                              placeholder="Enter speciality or lab type"
                              value={referredAddress}
                              onValueChange={setReferredAddress}
                              radius="lg"
                              variant="bordered"
                              classNames={{
                                inputWrapper:
                                  "border-[#D7ECE7] bg-white shadow-none data-[hover=true]:border-[#BFE0D9]",
                                label: "text-slate-700 text-xs font-semibold",
                                input: "text-slate-700",
                              }}
                            />

                            <Input
                              label="Clinic / Hospital / Lab Address"
                              placeholder="Enter facility name/address"
                              value={referredDoctorClinic}
                              onValueChange={setReferredDoctorClinic}
                              radius="lg"
                              variant="bordered"
                              classNames={{
                                inputWrapper:
                                  "border-[#D7ECE7] bg-white shadow-none data-[hover=true]:border-[#BFE0D9]",
                                label: "text-slate-700 text-xs font-semibold",
                                input: "text-slate-700",
                              }}
                            />

                            <Input
                              label="Phone Number"
                              placeholder="Enter 10 digit mobile number"
                              value={referredPhone}
                              onValueChange={(value) => {
                                // Allow only digits
                                const cleaned = value.replace(/\D/g, "");
                                // Limit to 10 digits
                                const limited = cleaned.slice(0, 10);
                                // Validate first digit (if length > 0)
                                if (limited.length > 0) {
                                  const firstDigit = limited[0];
                                  if (
                                    !["6", "7", "8", "9"].includes(firstDigit)
                                  ) {
                                    addToast({
                                      title: "Invalid Phone Number",
                                      description:
                                        "Mobile number must start with correct digit",
                                      color: "warning",
                                      variant: "flat",
                                      timeout: 2000,
                                    });
                                    return;
                                  }
                                }
                                setReferredPhone(limited);
                              }}
                              radius="lg"
                              variant="bordered"
                              classNames={{
                                inputWrapper:
                                  "border-[#D7ECE7] bg-white shadow-none data-[hover=true]:border-[#BFE0D9]",
                                label: "text-slate-700 text-xs font-semibold",
                                input: "text-slate-700",
                              }}
                            />
                          </div>
                        </div>

                        {/* Referral Declaration with Patient Name & Age */}
                        <div className="mt-4 rounded-[16px] border border-[#D8ECE7] bg-[#F4FBFA] p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                            Referral Declaration
                          </p>
                          <p className="text-sm leading-6 text-slate-700">
                            I,{" "}
                            <span className="font-semibold">
                              {" "}
                              {doctor.name
                                ? `Dr. ${doctor.name}`
                                : "________________"}
                            </span>
                            , hereby certify that{" "}
                            <span className="font-semibold">
                              {patient.name || "________________"}{" "}
                            </span>
                            ({patient.age || "—"} yrs, {patient.gender || "—"}),
                            has been examined by me and requires referral to{" "}
                            <span className="font-semibold">
                              {referredName || "________________"}
                            </span>
                            {referredAddress ? ` (${referredAddress})` : ""}
                            {referredDoctorClinic
                              ? ` at ${referredDoctorClinic}`
                              : ""}
                            . Kindly carry out the necessary evaluation,
                            including appropriate consultation/diagnostic tests,
                            and specialized treatment if indicated, and provide
                            your expert opinion for further management of the
                            patient.
                          </p>
                        </div>

                        {/* Additional Notes */}
                        <div className="pt-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                            Notes
                          </p>

                          <Textarea
                            labelPlacement="outside"
                            placeholder="Enter reason for referral, clinical findings, or special instructions..."
                            minRows={3}
                            variant="bordered"
                            radius="lg"
                            value={referNotes}
                            onValueChange={setReferNotes}
                            classNames={{
                              inputWrapper:
                                "bg-white border-[#D7ECE7] shadow-none data-[hover=true]:border-[#BFE0D9]",
                              input: "text-slate-700",
                            }}
                          />
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

                <Button
                  radius="full"
                  startContent={<FiEye size={16} />}
                  variant="flat"
                  className="h-10 border border-[#BFE0D9] bg-white px-5 text-primary sm:w-auto"
                  onPress={handleOpenReferPreview}
                >
                  Preview
                </Button>
              </div>
            </ModalBody>
          </>
        );
      }}
    </ModalContent>
  </Modal>
);

export default ReferFormSection;
