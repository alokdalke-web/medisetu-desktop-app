import React, { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { addToast, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import AppButton from "../../../components/shared/AppButton";
import InputField from "../../../components/shared/InputField";
import { useUpdateAddUserMutation } from "../../../redux/api/usersApi";
import { roleLabel } from "./shared";
import { inputFieldClassNames, fieldRadius } from "./formFieldStyles";

type FormValues = {
  name: string;
  email: string;
  mobile: string;
};

const nameValidation = {
  required: "Name is required",
  validate: (value: string) => {
    const name = String(value ?? "").trim();
    if (!name) return "Name is required";
    if (name.length < 2) return "Invalid input";
    if (name.length > 80) return "Invalid input";
    if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name)) return "Invalid input";
    return true;
  },
};

const isValidName = (value: unknown) => {
  const name = String(value ?? "").trim();
  return name.length >= 2 && name.length <= 80 && /^[A-Za-z][A-Za-z .'-]*$/.test(name);
};

const isValidPhone = (value: unknown) => /^[6-9]\d{9}$/.test(String(value ?? "").trim());

interface UserEditModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  user: any;
  refetch: () => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onOpenChange,
  userId,
  user,
  refetch,
}) => {
  const [updateAddUser, { isLoading: isUpdating }] = useUpdateAddUserMutation();

  const { control, handleSubmit, reset, setValue } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: { name: "", email: "", mobile: "" },
  });

  useEffect(() => {
    if (!user) return;
    reset({
      name: user?.name ?? "",
      email: user?.email ?? "",
      mobile: user?.mobile ?? "",
    });
  }, [user, reset]);

  const nameValue = useWatch({ control, name: "name" });
  const mobileValue = useWatch({ control, name: "mobile" });

  useEffect(() => {
    const raw = String(mobileValue ?? "");
    const digits = raw.replace(/\D/g, "");
    const normalized = digits.length > 10 ? digits.slice(-10) : digits.slice(0, 10);
    if (raw !== normalized) {
      setValue("mobile", normalized, { shouldValidate: true, shouldDirty: true });
    }
  }, [mobileValue, setValue]);

  const canSave = isValidName(nameValue) && isValidPhone(mobileValue);

  const onSubmit = handleSubmit(async (v) => {
    if (!userId) return;

    try {
      await updateAddUser({
        id: userId,
        body: { name: v.name.trim(), mobile: v.mobile.trim() },
      }).unwrap();

      addToast({
        title: "User updated",
        description: "User details have been successfully updated.",
        color: "success",
        variant: "flat",
      });

      refetch();
      onOpenChange(false);
    } catch (err: any) {
      addToast({
        title: "Update failed",
        description: err?.data?.message || err?.message || "Unable to update user details.",
        color: "danger",
        variant: "flat",
      });
    }
  });

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md" placement="center" radius="lg" classNames={{ wrapper: "z-[9999]" }}>
      <ModalContent>
        {(onClose) => (
          <form onSubmit={onSubmit} noValidate>
            <ModalHeader className="flex flex-col gap-1">
              Edit {roleLabel(user?.userType)}
            </ModalHeader>
            <ModalBody className="space-y-4">
              <InputField
                control={control}
                name="name"
                label="Name"
                placeholder="Enter name"
                isRequired
                radius={fieldRadius}
                classNames={inputFieldClassNames}
                rules={nameValidation}
              />

              <InputField
                control={control}
                name="email"
                label="Email"
                placeholder="Enter email"
                isDisabled
                radius={fieldRadius}
                classNames={{
                  ...inputFieldClassNames,
                  input: "cursor-not-allowed text-sm !text-slate-500",
                  inputWrapper: `${inputFieldClassNames.inputWrapper} cursor-not-allowed !bg-slate-50 opacity-80`,
                }}
              />

              <InputField
                control={control}
                name="mobile"
                label="Mobile Number"
                placeholder="Enter mobile number"
                isRequired
                radius={fieldRadius}
                classNames={inputFieldClassNames}
                rules={{
                  required: "Mobile number is required",
                  validate: (value) => isValidPhone(value) || "Enter valid 10-digit mobile number starting with 6-9",
                }}
              />
            </ModalBody>
            <ModalFooter>
              <AppButton text="Cancel" buttonVariant="outlined" onClick={onClose} />
              <AppButton
                text="Save Changes"
                buttonVariant="primary"
                type="submit"
                isLoading={isUpdating}
                disabled={!canSave || isUpdating}
              />
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
};

export default UserEditModal;
