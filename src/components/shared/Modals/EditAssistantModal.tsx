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

type AssistantStatus = "Active" | "Inactive";

export type AssistantFormValues = {
  id?: string;
  name: string;
  email: string;
  mobileDigits: string;
  userStatus: AssistantStatus;
};

interface Props {
  editForm: AssistantFormValues | null;
  isUpdating: boolean;
  closeEdit: () => void;
  saveEdit: (data: AssistantFormValues) => void;
}

export default function EditAssistantModal({
  editForm,
  isUpdating,
  closeEdit,
  saveEdit,
}: Props) {
  const { control, handleSubmit, reset } = useForm<AssistantFormValues>({
    defaultValues: {
      name: "",
      email: "",
      mobileDigits: "",
      userStatus: "Active",
    },
  });

  // ✅ Prefill properly (important)
  useEffect(() => {
    if (editForm) {
      reset({
        id: editForm.id,
        name: editForm.name || "",
        email: editForm.email || "",
        mobileDigits: editForm.mobileDigits || "",
        userStatus: editForm.userStatus || "Active",
      });
    }
  }, [editForm, reset]);

  const onSubmit = (data: AssistantFormValues) => {
    const updatedData = {
      ...(editForm || {}),
      ...data,
      email: editForm?.email || "",
    } as AssistantFormValues;

    saveEdit(updatedData);
  };

  return (
    <ModalContent>
      {() => (
        <>
          <ModalHeader className="flex items-center justify-between border-b border-slate-100 py-4">
            <div className="text-[16px] sm:text-[18px] font-semibold text-slate-900">
              Edit Assistant
            </div>
          </ModalHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalBody className="py-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Name */}
                <InputField
                  control={control}
                  name="name"
                  label="Name"
                  placeholder="Enter name"
                  rules={{ required: "Name is required" }}
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

                {/* Email */}
                <InputField
                  control={control}
                  name="email"
                  label="Email"
                  placeholder="Enter email"
                  isDisabled
                  classNames={{
                    input: "cursor-not-allowed text-sm !text-slate-500",
                    inputWrapper:
                      "cursor-not-allowed border-1 border-border-color bg-slate-50 py-2 opacity-80",
                  }}
                  rules={{
                    required: "Email is required",
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "Enter valid email",
                    },
                  }}
                />

                {/* Mobile */}
                <InputField
                  control={control}
                  name="mobileDigits"
                  label="Mobile"
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
                isDisabled={isUpdating || !editForm?.id}
              />
            </ModalFooter>
          </form>
        </>
      )}
    </ModalContent>
  );
}
