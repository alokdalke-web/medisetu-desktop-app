// src/pages/user/pharmacy/CreatePharmacyModal.tsx

import { useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  addToast,
  Input,
} from "@heroui/react";
import { Controller, useForm } from "react-hook-form";

import InputField from "../../../components/shared/InputField";
import AppButton from "../../../components/shared/AppButton";
import TextareaField from "../../../components/shared/TextareaField"; // optional wrapper
import { useCreatePharmacyMutation } from "../../../redux/api/pharmacyApi";
import { phoneValidation } from "../../../utils/validation";

type PharmacyFormValues = {
  name: string;
  contactNumber: string;
  address: string;
};

interface CreatePharmacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePharmacyModal({
  isOpen,
  onClose,
}: CreatePharmacyModalProps) {
  const { control, handleSubmit, reset } = useForm<PharmacyFormValues>({
    defaultValues: {
      name: "",
      contactNumber: "",
      address: "",
    },
  });

  const [createPharmacy, { isLoading }] = useCreatePharmacyMutation();

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const onSubmit = async (data: PharmacyFormValues) => {
    try {
      const res = await createPharmacy(data).unwrap();

      addToast({
        title: "Success",
        description: res?.message || "Pharmacy created successfully",
        color: "success",
      });

      reset();
      onClose();
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to create pharmacy",
        color: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      placement="center"
      classNames={{
        base: "rounded-2xl border border-transparent bg-white text-slate-900 dark:border-[#273244] dark:bg-[#111726] dark:text-white",
        body: "bg-white dark:bg-[#111726]",
      }}
    >
      <ModalContent className="!bg-white !text-slate-900 dark:!bg-[#111726] dark:!text-white">
        {() => (
          <>
            <ModalHeader className="flex items-center justify-between border-b border-slate-100 bg-white py-4 dark:border-[#273244] dark:bg-[#111726]">
              <div className="text-[18px] font-semibold text-slate-900 dark:text-white">
                Create New Pharmacy
              </div>
            </ModalHeader>

            <form onSubmit={handleSubmit(onSubmit)}>
              <ModalBody className="bg-white py-6 dark:bg-[#111726]">
                <div className="grid grid-cols-1 gap-5">
                  {/* Name */}
                  <InputField
                    control={control}
                    name="name"
                    label="Pharmacy Name"
                    placeholder="Enter pharmacy name"
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
                        label="Contact Number"
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

                  {/* Address */}
                  <TextareaField
                    control={control}
                    name="address"
                    label="Address"
                    placeholder="Enter address"
                    rules={{ required: "Address is required" }}
                    minRows={3}
                    className="custom-no-radius" // add a custom class
                  />
                </div>
              </ModalBody>

              <ModalFooter className="flex flex-col gap-3 border-t border-slate-100 bg-white py-4 dark:border-[#273244] dark:bg-[#111726] sm:flex-row">
                <AppButton
                  text="Cancel"
                  type="button"
                  onPress={onClose}
                  buttonVariant="outlined"
                  className="w-full sm:w-auto"
                  isDisabled={isLoading}
                />

                <AppButton
                  text={isLoading ? "Adding..." : "Add Pharmacy"}
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
