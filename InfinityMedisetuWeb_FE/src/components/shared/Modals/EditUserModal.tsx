import { useEffect } from "react";
import {
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { useForm, useWatch } from "react-hook-form"; // ✅ useWatch add
import InputField from "../../../components/shared/InputField";
import AppButton from "../AppButton";
import SelectField from "../SelectField";
import { phoneValidation } from "../../../utils/validation";

type FormValues = {
  name: string;
  email: string;
  mobile: string;
  userStatus: "Active" | "Inactive";
};

const nameValidation = {
  required: "Name is required",
  validate: (value: string) => {
    const name = String(value ?? "").trim();
    if (!name) return "Name is required";
    if (name.length < 2) return "Invalid input";
    if (name.length > 80) return "Invalid input";
    if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name)) {
      return "Invalid input";
    }
    return true;
  },
};

const isValidName = (value: unknown) => {
  const name = String(value ?? "").trim();
  return (
    name.length >= 2 &&
    name.length <= 80 &&
    /^[A-Za-z][A-Za-z .'-]*$/.test(name)
  );
};

const isValidPhone = (value: unknown) =>
  /^[6-9]\d{9}$/.test(String(value ?? "").trim());

interface Props {
  editForm: any;
  userType?: string;
  isUpdating: boolean;
  closeEdit: () => void;
  saveEdit: (data: any) => void;
}

export default function EditUserModal({
  editForm,
  userType,
  isUpdating,
  closeEdit,
  saveEdit,
}: Props) {
  const { control, handleSubmit, reset, setValue } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      userStatus: "Active",
    },
  });

  // ✅ Prefill when editing
  useEffect(() => {
    if (editForm) {
      reset({
        name: editForm.name || "",
        email: editForm.email || "",
        mobile: editForm.mobile || "",
        userStatus: editForm.userStatus || "Active",
      });
    }
  }, [editForm, reset]);

  // ✅ NEW: Mobile ko digits-only + 10 digits max (paste +91 etc safe)
  const nameValue = useWatch({ control, name: "name" });
  const mobileValue = useWatch({ control, name: "mobile" });

  useEffect(() => {
    const raw = String(mobileValue ?? "");
    const digits = raw.replace(/\D/g, ""); // remove alpha/symbols
    const normalized =
      digits.length > 10 ? digits.slice(-10) : digits.slice(0, 10); // keep last 10 if +91 etc

    if (raw !== normalized) {
      setValue("mobile", normalized, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [mobileValue, setValue]);

  const canSave = isValidName(nameValue) && isValidPhone(mobileValue);

  // ✅ Submit handler
  const onSubmit = (data: FormValues) => {
    const updatedData = {
      ...editForm,
      name: data.name,
      email: editForm?.email,
      mobile: data.mobile,
      userStatus: data.userStatus,
    };

    saveEdit(updatedData);
  };

  return (
    <ModalContent>
      {() => (
        <>
          <ModalHeader className="flex items-center justify-between border-b border-slate-100 py-4">
            <div className="text-[16px] sm:text-[18px] font-semibold text-slate-900">
              Edit {userType || "User"}
            </div>
          </ModalHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalBody className="py-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <InputField
                  control={control}
                  name="name"
                  label="Name"
                  placeholder="Enter name"
                  isRequired
                  rules={nameValidation}
                />

                <SelectField
                  name="userStatus"
                  label="User Status"
                  control={control}
                  options={[
                    { label: "Active", value: "Active" },
                    { label: "Inactive", value: "Inactive" },
                  ]}
                  selectionMode="single"
                  className="mt-1.5"
                />

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
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter valid email",
                    },
                  }}
                />
                <InputField
                  control={control}
                  name="mobile"
                  label="Mobile"
                  placeholder="Enter 10 digit mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  isRequired
                  rules={{
                    ...phoneValidation,
                    required: "Please give phone number",
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: "Invalid input",
                    },
                  }}
                />

              </div>
            </ModalBody>

            <ModalFooter className="gap-3 border-t border-slate-100 py-4">
              <AppButton
                text="Cancel"
                type="button"
                onPress={closeEdit}
                buttonVariant="outlined"
                className="w-full sm:w-[130px]"
                isDisabled={isUpdating}
              />

              <AppButton
                text={isUpdating ? "Saving..." : "Save Changes"}
                type="submit"
                buttonVariant="primary"
                className="w-full sm:w-[130px]"
                isDisabled={isUpdating || !canSave}
              />
            </ModalFooter>
          </form>
        </>
      )}
    </ModalContent>
  );
}
