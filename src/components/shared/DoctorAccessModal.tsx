

import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";

import { useUpdateAdminDoctorPermissionMutation } from "../../redux/api/authApi";
import { DOCTOR_SPECIALITIES } from "../../constants/specialities";

interface DoctorAccessModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const DoctorAccessModal: React.FC<DoctorAccessModalProps> = ({
  isOpen,
  onOpenChange,
  onSuccess,
}) => {
  const [speciality, setSpeciality] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | number | null>(null);
  const [error, setError] = useState("");

  const [updatePermission, { isLoading }] =
    useUpdateAdminDoctorPermissionMutation();

  const handleSubmit = async () => {
    const val = speciality.trim();
    if (!val) {
      setError("Please enter your speciality");
      return;
    }

    setError("");

    try {
      await updatePermission({
        isAdminDoctorAccess: true,
        speciality: val,
      }).unwrap();

      setSpeciality("");
      setSelectedKey(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Failed to update doctor permission:", err);
      const errorMessage =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to grant doctor access";
      setError(errorMessage);
    }
  };

  const handleClose = () => {
    setSpeciality("");
    setSelectedKey(null);
    setError("");
    onOpenChange(false);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Request Doctor Access
            </ModalHeader>

            <ModalBody>
              <p className="text-sm text-gray-600 mb-4">
                To access the Doctor role, please provide your medical speciality.
              </p>

              <Autocomplete
                label="Speciality"
                placeholder="Type or select speciality"
                variant="bordered"
                autoFocus
                isRequired
                className="w-full"
                allowsCustomValue
                inputValue={speciality}
                selectedKey={selectedKey ?? undefined}
                onInputChange={(val) => {
                  setSpeciality(val);
                  setSelectedKey(null);
                  setError("");
                }}
                onSelectionChange={(key) => {
                  const k =
                    key === null
                      ? null
                      : typeof key === "string" || typeof key === "number"
                      ? key
                      : String(key); // safety

                  setSelectedKey(k);
                  setSpeciality(k ? String(k) : "");
                  setError("");
                }}
                isInvalid={!!error}
                errorMessage={error}
              >
                {DOCTOR_SPECIALITIES.map((spec) => (
                  <AutocompleteItem key={spec}>{spec}</AutocompleteItem>
                ))}
              </Autocomplete>
            </ModalBody>

            <ModalFooter>
              <Button
                color="default"
                variant="light"
                onPress={handleClose}
                isDisabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleSubmit}
                isLoading={isLoading}
              >
                Submit Request
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default DoctorAccessModal;
