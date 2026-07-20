import { useEffect } from "react";
import {
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { useForm } from "react-hook-form";
import InputField from "../../../components/shared/InputField";
import SelectField from "../SelectField";
import AppButton from "../AppButton";
import { phoneValidation } from "../../../utils/validation";

type PharmacyStatus = "active" | "deactive";

type FormValues = {
  name: string;
  address: string;
  contactDigits: string;
  status: PharmacyStatus;
};

interface Props {
  editForm: FormValues | null;
  isUpdating: boolean;
  pharmacyRealId?: string;
  closeEdit: () => void;
  saveEdit: (data: FormValues) => void;
}

export default function EditPharmacyModal({
  editForm,
  isUpdating,
  pharmacyRealId,
  closeEdit,
  saveEdit,
}: Props) {
  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      name: "",
      address: "",
      contactDigits: "",
      status: "active",
    },
  });

  // ✅ Prefill using reset (cleaner than setValue)
  useEffect(() => {
    if (editForm) {
      reset({
        name: editForm.name || "",
        address: editForm.address || "",
        contactDigits: editForm.contactDigits || "",
        status: editForm.status || "active",
      });
    }
  }, [editForm, reset]);

  const onSubmit = (data: FormValues) => {
    const updatedData = {
      ...(editForm || {}),
      ...data,
    } as FormValues;

    saveEdit(updatedData);
  };

  return (
    <ModalContent>
      {() => (
        <>
          <ModalHeader className="flex items-center justify-between border-b border-slate-100 py-4">
            <div className="text-[18px] font-semibold">Edit Pharmacy</div>
          </ModalHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalBody className="py-6">
              <div className="grid grid-cols-1 gap-5">
                {/* Name */}
                <InputField
                  control={control}
                  name="name"
                  label="Pharmacy Name"
                  placeholder="Enter pharmacy name"
                  rules={{ required: "Name is required" }}
                />

                {/* Address */}
                <InputField
                  control={control}
                  name="address"
                  label="Address"
                  placeholder="Enter address"
                  rules={{ required: "Address is required" }}
                />

                {/* Contact Number */}
                <InputField
                  control={control}
                  name="contactDigits"
                  label="Contact Number"
                  placeholder="Enter 10 digit number"
                  rules={phoneValidation}
                />

                {/* Status */}
                <SelectField
                  name="status"
                  label="Status"
                  control={control}
                  options={[
                    { label: "Active", value: "active" },
                    { label: "Deactive", value: "deactive" },
                  ]}
                  selectionMode="single"
                  className="mt-1.5"
                />
              </div>
            </ModalBody>

            <ModalFooter className="flex flex-col gap-3 sm:flex-row border-t border-slate-100 py-4">
              <AppButton
                text="Cancel"
                type="button"
                onPress={closeEdit}
                buttonVariant="outlined"
                className="w-full sm:w-auto"
                isDisabled={isUpdating}
              />

              <AppButton
                text={isUpdating ? "Saving..." : "Save Changes"}
                type="submit"
                buttonVariant="primary"
                className="w-full sm:w-auto"
                isDisabled={isUpdating || !pharmacyRealId}
              />
            </ModalFooter>
          </form>
        </>
      )}
    </ModalContent>
  );
}
