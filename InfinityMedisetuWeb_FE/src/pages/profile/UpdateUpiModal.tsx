import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  addToast,
} from "@heroui/react";
import { FiCreditCard, FiPlus, FiX } from "react-icons/fi";
import { useUpdateClinicMutation } from "../../redux/api/clinicApi";
import { useUpdateDoctorMutation } from "../../redux/api/doctorApi";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentUpiIds: string[];
  userType: string;
  clinicId?: string;
  onSaved: () => void;
};

const validateUpiId = (value: string): boolean => {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/;
  return upiRegex.test(value);
};

const UpdateUpiModal: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  currentUpiIds,
  userType,
  clinicId,
  onSaved,
}) => {
  const [updateClinic, { isLoading: isClinicUpdating }] = useUpdateClinicMutation();
  const [updateDoctor, { isLoading: isDoctorUpdating }] = useUpdateDoctorMutation();

  const [upiList, setUpiList] = useState<string[]>([]);
  const [newUpiId, setNewUpiId] = useState("");
  const [upiError, setUpiError] = useState("");

  const isAdmin = userType === "Admin";
  const isLoading = isClinicUpdating || isDoctorUpdating;

  useEffect(() => {
    if (isOpen) {
      setUpiList(currentUpiIds || []);
      setNewUpiId("");
      setUpiError("");
    }
  }, [isOpen, currentUpiIds]);

  const handleAddUpiId = () => {
    const trimmedId = newUpiId.trim();

    if (!trimmedId) {
      setUpiError("Please enter a UPI ID");
      return;
    }

    if (!validateUpiId(trimmedId)) {
      setUpiError("Invalid UPI ID format (e.g. username@paytm)");
      return;
    }

    if (upiList.includes(trimmedId)) {
      setUpiError("This UPI ID already exists");
      return;
    }

    setUpiList((prev) => [...prev, trimmedId]);
    setNewUpiId("");
    setUpiError("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddUpiId();
    }
  };

  const handleRemoveUpiId = (indexToRemove: number) => {
    setUpiList((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSave = async () => {
    try {
      if (isAdmin) {
        if (!clinicId) {
          addToast({
            title: "Error",
            description: "Clinic ID not found for Admin profile",
            color: "danger",
          });
          return;
        }

        await updateClinic({
          clinicId,
          body: {
            adminProfile: {
              upiIds: upiList,
            },
          },
        }).unwrap();
      } else {
        await updateDoctor({
          doctorProfile: {
            upiIds: upiList,
          } as any,
        }).unwrap();
      }

      addToast({
        title: "Success",
        description: "UPI IDs updated successfully",
        color: "success",
      });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to update UPI IDs:", error);
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to update UPI IDs",
        color: "danger",
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex gap-2 items-center text-slate-900">
              <FiCreditCard className="text-primary h-5 w-5" />
              Manage UPI IDs
            </ModalHeader>

            <ModalBody className="gap-4 pb-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Add UPI ID
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      value={newUpiId}
                      onChange={(e) => {
                        setNewUpiId(e.target.value);
                        if (upiError) setUpiError("");
                      }}
                      onKeyDown={handleKeyPress}
                      placeholder="e.g. doctor@oksbi"
                      isInvalid={!!upiError}
                      errorMessage={upiError}
                      classNames={{
                        inputWrapper: "border border-slate-200 bg-white",
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    color="primary"
                    onPress={handleAddUpiId}
                    className="h-10 px-4 text-white"
                  >
                    <FiPlus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {upiList.length > 0 ? (
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Current UPI IDs
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {upiList.map((upi, index) => (
                      <div
                        key={upi}
                        className="flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1.5 text-sm border border-primary/20"
                      >
                        <FiCreditCard className="w-4 h-4 shrink-0" />
                        <span className="font-medium">{upi}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUpiId(index)}
                          className="hover:bg-primary/25 rounded-full p-0.5 transition-colors"
                          aria-label={`Remove ${upi}`}
                        >
                          <FiX className="w-4 h-4 text-primary" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 mt-2">
                  No UPI IDs added yet. Add one above to get started.
                </div>
              )}
            </ModalBody>

            <ModalFooter>
              <Button variant="flat" onPress={close}>
                Cancel
              </Button>
              <Button color="primary" isLoading={isLoading} onPress={handleSave} className="text-white">
                Save Changes
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default UpdateUpiModal;
