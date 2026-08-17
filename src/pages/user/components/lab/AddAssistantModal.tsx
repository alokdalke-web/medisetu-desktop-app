import React from "react";
import { Button, Input, Modal, ModalBody, ModalContent } from "@heroui/react";
import { FiX, FiUserPlus } from "react-icons/fi";
import { Controller, useForm } from "react-hook-form";

import { useAddUserMutation } from "../../../../redux/api/authApi";
import type { AddUserDto } from "../../../../schemas/auth";
import { phoneValidation } from "../../../../utils/validation";

type FormValues = {
  name: string;
  email: string;
  phone: string;
};

type AddUserWithExtras = AddUserDto & { mobile: string; labId: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AddAssistantModal = ({
  isOpen,
  onOpenChange,
  onCreated,
  labId, // ✅ NEW
  existingAssistants = [],
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  labId: string; // ✅ NEW
  existingAssistants?: any[];
}) => {
  const [addUser, { isLoading }] = useAddUserMutation();
  const [apiError, setApiError] = React.useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { name: "", email: "", phone: "" },
    mode: "onTouched",
  });

  const resetAll = () => {
    reset({ name: "", email: "", phone: "" });
    setApiError(null);
  };

  const onSubmit = (close: () => void) =>
    handleSubmit(async (values) => {
      try {
        setApiError(null);

        // ✅ EXACT payload (now includes labId)
        const payload: AddUserWithExtras = {
          name: values.name.trim(),
          email: values.email.trim(),
          userType: "Lab_Assistant" as any,
          mobile: values.phone.trim(),
          labId, // ✅ NEW
        };

        await addUser(payload).unwrap();

        onCreated?.();
        resetAll();
        close();
      } catch (err: any) {
        const msg =
          err?.data?.message ||
          err?.error ||
          "Failed to add assistant. Please try again.";
        setApiError(String(msg));
      }
    });

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) resetAll();
        onOpenChange(open);
      }}
      placement="center"
      size="md"
      hideCloseButton
      backdrop="opaque"
      classNames={{
        backdrop: "bg-slate-950/45 backdrop-blur-[2px]",
        base: "w-[calc(100%-2rem)] max-w-[410px] overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.26)]",
        body: "p-0",
      }}
    >
      <ModalContent>
        {(close) => (
          <ModalBody className="relative px-7 pb-7 pt-2 sm:px-8 ">
            <button
              type="button"
              onClick={() => {
                resetAll();
                close();
              }}
              className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
              aria-label="Close"
              disabled={isLoading}
            >
              <FiX />
            </button>

            <div className="mx-auto grid h-12 w-12 place-items-center  rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
              <FiUserPlus className="text-[20px]" />
            </div>

            <div className="mt-2 text-center ">
              <div className="text-[19px] font-bold leading-6 text-slate-950">
                Add New Assistant
              </div>
            </div>

            <form onSubmit={onSubmit(close)} className="mt-2 space-y-4">
              <Controller
                name="name"
                control={control}
                rules={{
                  required: "Name is required",
                  minLength: { value: 2, message: "Enter valid name" },
                  validate: (value) => {
                    const trimmed = value.trim().toLowerCase();
                    const isDuplicate = existingAssistants.some(
                      (asst) => String(asst.name ?? "").trim().toLowerCase() === trimmed
                    );
                    return isDuplicate ? "Name is already in use" : true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <div>
                    <div className="mb-2.5 text-[12px] font-bold text-slate-600">
                      Name
                    </div>
                    <Input
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Enter name"
                      radius="full"
                      variant="bordered"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      classNames={{
                        inputWrapper:
                          "h-11 border-slate-200 bg-white px-4 shadow-none transition-colors hover:border-slate-300 group-data-[focus=true]:border-primary group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-primary/10 sm:h-12",
                        input: "text-sm font-medium text-slate-900 placeholder:text-slate-400",
                        errorMessage: "text-[11px] font-medium",
                      }}
                    />
                  </div>
                )}
              />

              <Controller
                name="email"
                control={control}
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: emailPattern,
                    message: "Enter valid email",
                  },
                  validate: (value) => {
                    const trimmed = value.trim().toLowerCase();
                    const isDuplicate = existingAssistants.some(
                      (asst) => String(asst.email ?? "").trim().toLowerCase() === trimmed
                    );
                    return isDuplicate ? "Email is already in use" : true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <div>
                    <div className="mb-2.5 text-[12px] font-bold text-slate-600">
                      Email Address
                    </div>
                    <Input
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value.toLowerCase());
                      }}
                      placeholder="Enter email"
                      type="email"
                      radius="full"
                      variant="bordered"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      classNames={{
                        inputWrapper:
                          "h-11 border-slate-200 bg-white px-4 shadow-none transition-colors hover:border-slate-300 group-data-[focus=true]:border-primary group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-primary/10 sm:h-12",
                        input: "text-sm font-medium text-slate-900 placeholder:text-slate-400",
                        errorMessage: "text-[11px] font-medium",
                      }}
                    />
                  </div>
                )}
              />

              <Controller
                name="phone"
                control={control}
                rules={{
                  ...phoneValidation,
                  validate: (value) => {
                    const trimmed = value.trim();
                    const isDuplicate = existingAssistants.some(
                      (asst) => String(asst.mobile ?? asst.phone ?? "").trim() === trimmed
                    );
                    return isDuplicate ? "Contact number is already in use" : true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <div>
                    <div className="mb-2.5 text-[12px] font-bold text-slate-600">
                      Contact Number
                    </div>
                    <Input
                      value={field.value}
                      onValueChange={(v) => {
                        const onlyDigits = v.replace(/\D/g, "");
                        field.onChange(onlyDigits.slice(0, 10));
                      }}
                      placeholder="Enter 10-digit number"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      radius="full"
                      variant="bordered"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      classNames={{
                        inputWrapper:
                          "h-11 border-slate-200 bg-white px-4 shadow-none transition-colors hover:border-slate-300 group-data-[focus=true]:border-primary group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-primary/10 sm:h-12",
                        input: "text-sm font-medium text-slate-900 placeholder:text-slate-400",
                        errorMessage: "text-[11px] font-medium",
                      }}
                    />
                  </div>
                )}
              />

              {apiError ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[12px] font-semibold text-rose-600">
                  {apiError}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-4 pt-2">
                <Button
                  type="button"
                  radius="full"
                  variant="bordered"
                  className="h-10 min-w-[108px] border-2 border-primary px-7 font-semibold text-primary hover:bg-primary/10"
                  onPress={() => {
                    resetAll();
                    close();
                  }}
                  isDisabled={isLoading}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  radius="full"
                  className="h-10 min-w-[160px] bg-primary px-8 font-semibold text-white shadow-sm transition-colors hover:bg-primary-active"
                  isLoading={isLoading}
                  isDisabled={isLoading}
                >
                  Add Assistant
                </Button>
              </div>
            </form>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default AddAssistantModal;
