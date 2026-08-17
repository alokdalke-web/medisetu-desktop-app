// ✅ src/pages/user/pharmacy/AddMemberModal.tsx

import { useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
} from "@heroui/react";
import { Controller, useForm } from "react-hook-form";

import InputField from "../../../components/shared/InputField";
import AppButton from "../../../components/shared/AppButton";
import { useAddMemberMutation } from "../../../redux/api/pharmacyApi";
import { phoneValidation } from "../../../utils/validation";

type AddMemberFormValues = {
  name: string;
  contactNumber: string;
  email: string;
};

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacyId: string;
}

export default function AddMemberModal({
  isOpen,
  onClose,
  pharmacyId,
}: AddMemberModalProps) {
  const { control, handleSubmit, reset } = useForm<AddMemberFormValues>({
    defaultValues: {
      name: "",
      contactNumber: "",
      email: "",
    },
  });

  const [addMember, { isLoading }] = useAddMemberMutation();

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: AddMemberFormValues) => {
    try {
      await addMember({ pharmacyId, ...data }).unwrap();
      reset();
      onClose();
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" placement="center">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center justify-between border-b border-slate-100 py-4">
              <div className="text-[18px] font-semibold">Add Staff Member</div>
            </ModalHeader>

            <form onSubmit={handleSubmit(onSubmit)}>
              <ModalBody className="py-6">
                <div className="grid grid-cols-1 gap-5">
                  {/* Name */}
                  <InputField
                    control={control}
                    name="name"
                    label="Name"
                    placeholder="Enter name"
                    rules={{ required: "Name is required" }}
                  />

                  {/* Contact Number */}
                  {/* Contact Number (ONLY 10 digits) */}
                  <Controller
                    control={control}
                    name="contactNumber"
                    rules={phoneValidation}
                    render={({ field, fieldState }) => (
                      <Input
                        label="Mobile"
                        placeholder="Enter 10 digit number"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={field.value ?? ""}
                        onValueChange={(val) => {
                          const onlyDigits = val
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          field.onChange(onlyDigits);
                        }}
                        isInvalid={!!fieldState.error}
                        errorMessage={fieldState.error?.message}
                      />
                    )}
                  />

                  {/* Email */}
         <Controller
  control={control}
  name="email"
  rules={{
    required: "Email is required",
    pattern: {
      value: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,10}$/,
      message: "Enter a valid email address",
    },
    validate: (value) => {
      const email = value.trim().toLowerCase();

      if (email.includes("..")) {
        return "Enter a valid email address";
      }

      return true;
    },
  }}
  render={({ field, fieldState }) => (
    <Input
      label="Email"
      placeholder="Enter email address"
      type="email"
      inputMode="email"
      value={field.value ?? ""}
      onValueChange={(value) => field.onChange(value.trim().toLowerCase())}
      isInvalid={!!fieldState.error}
      errorMessage={fieldState.error?.message}
    />
  )}
/>
                </div>
              </ModalBody>

              <ModalFooter className="flex flex-col gap-3 sm:flex-row border-t border-slate-100 py-4">
                <AppButton
                  text="Cancel"
                  type="button"
                  onPress={onClose}
                  buttonVariant="outlined"
                  className="w-full sm:w-auto"
                  isDisabled={isLoading}
                />

                <AppButton
                  text={isLoading ? "Adding..." : "Add Member"}
                  type="submit"
                  buttonVariant="primary"
                  className="w-full sm:w-auto"
                  isDisabled={isLoading}
                />
              </ModalFooter>
            </form>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
