import { useEffect } from "react";
import {
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import {
  useForm,
  type SubmitHandler,
  type Control,
  type FieldValues,
} from "react-hook-form";

import InputField from "../../../components/shared/InputField";
import SelectField from "../SelectField";
import AppButton from "../AppButton";
import { phoneValidation } from "../../../utils/validation";

import type { LabStatus } from "../../../redux/api/labApi";

type FormValues = {
  name: string;
  address: string;
  contactDigits: string;
  labStatus: LabStatus;
};

interface Props {
  editForm: FormValues | null;
  isUpdating: boolean;
  closeEdit: () => void;
  saveEdit: (data: FormValues) => void;
}

export default function EditLabModal({
  editForm,
  isUpdating,
  closeEdit,
  saveEdit,
}: Props) {
  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      name: "",
      address: "",
      contactDigits: "",
      labStatus: "Active" as LabStatus,
    },
  });

  // ✅ InputField / SelectField expects Control<FieldValues>
  const rhfControl = control as unknown as Control<FieldValues>;

  useEffect(() => {
    if (editForm) {
      reset({
        name: editForm.name || "",
        address: editForm.address || "",
        contactDigits: editForm.contactDigits || "",
        labStatus: (editForm.labStatus ?? "Active") as LabStatus,
      });
    }
  }, [editForm, reset]);

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const updatedData = { ...(editForm || {}), ...data } as FormValues;
    saveEdit(updatedData);
  };

  return (
    <ModalContent>
      {() => (
        <>
          <ModalHeader className="flex items-center justify-between border-b border-slate-100 py-4">
            <div className="text-[16px] sm:text-[18px] font-semibold text-slate-900">
              Edit Lab
            </div>
          </ModalHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalBody className="py-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <InputField
                  control={rhfControl}
                  name="name"
                  label="Lab Name"
                  placeholder="Enter lab name"
                  rules={{ required: "Lab name is required" }}
                />

                <SelectField
                  name="labStatus"
                  label="Lab Status"
                  control={rhfControl}
                  options={[
                    { label: "Active", value: "Active" },
                    { label: "Inactive", value: "Inactive" },
                  ]}
                  selectionMode="single"
                  className="mt-1.5"
                />

                <InputField
                  control={rhfControl}
                  name="address"
                  label="Address"
                  placeholder="Enter address"
                  rules={{ required: "Address is required" }}
                />

                <InputField
                  control={rhfControl}
                  name="contactDigits"
                  label="Contact Number"
                  placeholder="Enter 10 digit number"
                  rules={phoneValidation}
                />
              </div>
            </ModalBody>

            <ModalFooter className="gap-3 border-t border-slate-100 py-4">
              <AppButton
                text="Cancel"
                type="button"
                onPress={() => {
                  reset();
                  closeEdit();
                }}
                buttonVariant="outlined"
                className="w-full sm:w-[130px]"
                isDisabled={isUpdating}
              />

              <AppButton
                text={isUpdating ? "Saving..." : "Save Changes"}
                type="submit"
                buttonVariant="primary"
                className="w-full sm:w-[130px]"
                isDisabled={isUpdating}
              />
            </ModalFooter>
          </form>
        </>
      )}
    </ModalContent>
  );
}
