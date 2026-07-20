// ✅ src/components/modals/EditStaffUserModal.tsx

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

export type UserStatus = "Active" | "Inactive";

export type StaffFormValues = {
  id?: string;
  name: string;
  email?: string;
  mobileDigits: string;
  userStatus: UserStatus;
};

interface Props {
  editForm: StaffFormValues | null;
  isUpdating: boolean;
  closeEdit: () => void;
  saveEdit: (data: StaffFormValues) => void;
}

export default function EditStaffUserModal({
  editForm,
  isUpdating,
  closeEdit,
  saveEdit,
}: Props) {
  const { control, handleSubmit, reset } = useForm<StaffFormValues>({
    defaultValues: {
      name: "",
      mobileDigits: "",
      userStatus: "Active",
    },
  });

  // ✅ Prefill using reset
  useEffect(() => {
    if (editForm) {
      reset({
        name: editForm.name || "",
        mobileDigits: editForm.mobileDigits || "",
        userStatus: editForm.userStatus || "Active",
      });
    }
  }, [editForm, reset]);

  const onSubmit = (data: StaffFormValues) => {
    const updatedData = {
      ...(editForm || {}),
      ...data,
    } as StaffFormValues;

    saveEdit(updatedData);
  };

  return (
    <ModalContent>
      {() => (
        <>
          <ModalHeader className="flex items-center justify-between border-b border-slate-100 py-4">
            <div className="text-[18px] font-semibold">Edit Staff Member</div>
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

                {/* Mobile */}
                <InputField
                  control={control}
                  name="mobileDigits"
                  label="Mobile"
                  placeholder="Enter 10 digit number"
                  rules={phoneValidation}
                />

                {/* Status */}
                <SelectField
                  name="userStatus"
                  label="Status"
                  control={control}
                  options={[
                    { label: "Active", value: "Active" },
                    { label: "Inactive", value: "Inactive" },
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
                isDisabled={isUpdating || !editForm?.id}
              />
            </ModalFooter>
          </form>
        </>
      )}
    </ModalContent>
  );
}
