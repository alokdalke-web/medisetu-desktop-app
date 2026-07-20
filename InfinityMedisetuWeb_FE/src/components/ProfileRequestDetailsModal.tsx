import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
} from "@heroui/react";
import { FiUser } from "react-icons/fi";

interface ProfileRequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  displayValue: (value?: string | number | null) => string;
  getStatusColor: (status?: string | null) => any;
  getStatusLabel: (status?: string | null) => string;
}

const DetailSection: React.FC<{
  title: string;
  items: { label: string; value: React.ReactNode }[];
}> = ({ title, items }) => (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
      {title}
    </h3>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items
        .filter((item) => item.value !== "—")
        .map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <p className="text-xs font-semibold text-slate-500 uppercase">
              {item.label}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {item.value}
            </p>
          </div>
        ))}
    </div>
  </div>
);

const ProfileRequestDetailsModal: React.FC<
  ProfileRequestDetailsModalProps
> = ({
  isOpen,
  onClose,
  request,
  displayValue,
  getStatusColor,
  getStatusLabel,
}) => {
  if (!request) return null;

  const profile = request.requestedData?.doctorProfile;
  const qualifications = request.requestedData?.qualifications ?? [];
  const status = request.status ?? "pending";

  const doctorDetails = [
    {
      label: "Doctor Name",
      value: displayValue(profile?.name ?? request.doctorName),
    },
    { label: "Email", value: displayValue(request.doctorEmail) },
    { label: "Mobile", value: displayValue(profile?.mobile ?? request.doctorMobile) },
    {
      label: "Alternate Mobile",
      value: displayValue(profile?.alternateMobile ?? "—"),
    },
    { label: "Speciality", value: displayValue(profile?.speciality) },
    { label: "Qualification", value: displayValue(profile?.qualification) },
    {
      label: "Registration Number",
      value: displayValue(profile?.registrationNumber),
    },
  ];

  const clinicDetails = [
    { label: "Clinic Name", value: displayValue(request.clinicName) },
    { label: "Clinic City", value: displayValue(request.clinicCity ?? "—") },
    { label: "Clinic State", value: displayValue(request.clinicState ?? "—") },
  ];

  const requestDetails = [
    {
      label: "Request ID",
      value: displayValue(request.id ?? request._id ?? request.requestId),
    },
    { label: "Status", value: getStatusLabel(status) },
    { label: "Reason", value: displayValue(request.reason ?? request.notes ?? "—") },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent className="max-h-[90vh]">
        {(onCloseInner) => (
          <>
            <ModalHeader className="flex items-center justify-between gap-2 border-b border-slate-200">
              <div className="flex flex-1 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FiUser size={18} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {displayValue(profile?.name ?? request.doctorName)}
                  </h2>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={getStatusColor(status)}
                    className="mt-1 font-semibold capitalize"
                  >
                    {getStatusLabel(status)}
                  </Chip>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="space-y-6 py-6 scrollbar-hide overflow-y-auto">
              {/* Doctor Information */}
              <DetailSection title="Doctor Information" items={doctorDetails} />

              {/* Clinic Information */}
              <DetailSection title="Clinic Information" items={clinicDetails} />

              {/* Request Information */}
              <DetailSection title="Request Information" items={requestDetails} />

              {/* Qualifications */}
              {qualifications.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                    Qualifications
                  </h3>
                  <div className="space-y-3">
                    {qualifications.map((qual: any, index: number) => (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-200 bg-white p-4"
                      >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">
                              Qualification Title
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {displayValue(qual.qualificationTitle)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">
                              Qualification Type
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {displayValue(qual.qualificationType)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">
                              Specialization
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {displayValue(qual.specialization)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">
                              Year Of Completion
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {displayValue(qual.yearOfCompletion)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">
                              Board Or University
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {displayValue(qual.boardOrUniversity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection Reason (if applicable) */}
              {request.rejectionReason && (
                <div className="space-y-3 rounded-lg border border-danger-200 bg-danger-50 p-4">
                  <h3 className="text-sm font-semibold text-danger-900">
                    Rejection Reason
                  </h3>
                  <p className="text-sm text-danger-800">
                    {displayValue(request.rejectionReason)}
                  </p>
                </div>
              )}
            </ModalBody>

            <ModalFooter className="border-t border-slate-200">
              <Button
                variant="light"
                color="default"
                onPress={onCloseInner}
                className="font-semibold"
              >
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ProfileRequestDetailsModal;
