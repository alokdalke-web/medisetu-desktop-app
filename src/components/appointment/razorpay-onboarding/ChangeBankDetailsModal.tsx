import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  addToast,
} from "@heroui/react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FiCheckCircle, FiXCircle, FiLoader } from "react-icons/fi";
import InputField from "../../shared/InputField";
import SelectField from "../../shared/SelectField";
import {
  bankAccountTypeOptions,
  updateBankDetailsSchema,
  type UpdateBankDetailsFormValues,
} from "../../../schemas/razorpayOnboarding";
import { useUpdateBankDetailsMutation } from "../../../redux/api/clinicApi";
import { useIfscLookup } from "./useIfscLookup";

const accountTypeSelectOptions = bankAccountTypeOptions.map((o) => ({
  label: o.label,
  value: o.value,
}));

const resolveErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as { data?: { message?: string } } | undefined)?.data;
  return typeof data?.message === "string" && data.message.trim()
    ? data.message
    : fallback;
};

interface ChangeBankDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const ChangeBankDetailsModal: React.FC<ChangeBankDetailsModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [updateBankDetails, { isLoading }] = useUpdateBankDetailsMutation();

  const { control, handleSubmit, reset } = useForm<UpdateBankDetailsFormValues>({
    resolver: zodResolver(updateBankDetailsSchema),
    defaultValues: {
      beneficiaryName: "",
      accountNumber: "",
      ifscCode: "",
      accountType: "" as UpdateBankDetailsFormValues["accountType"],
    },
  });

  const ifscCode = useWatch({ control, name: "ifscCode" });
  const { state: lookupState, branchInfo } = useIfscLookup(ifscCode);

  React.useEffect(() => {
    if (isOpen) {
      reset({
        beneficiaryName: "",
        accountNumber: "",
        ifscCode: "",
        accountType: "" as UpdateBankDetailsFormValues["accountType"],
      });
    }
  }, [isOpen, reset]);

  const onSubmit = async (values: UpdateBankDetailsFormValues) => {
    if (lookupState === "invalid") return;
    try {
      await updateBankDetails(values).unwrap();
      addToast({
        title: "Bank change submitted",
        description:
          "Payouts are temporarily frozen until the new bank details are verified by penny-test validation.",
        color: "success",
      });
      onUpdated();
      onClose();
    } catch (error) {
      addToast({
        title: "Update failed",
        description: resolveErrorMessage(
          error,
          "Failed to update bank details. Please try again.",
        ),
        color: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      scrollBehavior="inside"
      isDismissable={!isLoading}
      classNames={{
        base: "rounded-2xl",
        header: "border-b border-slate-100 dark:border-[#273244]",
        footer: "border-t border-slate-100 dark:border-[#273244]",
      }}
    >
      <ModalContent>
        <ModalHeader>
          <span className="text-[15px] font-bold text-slate-800 dark:text-white">
            Change Settlement Bank Account
          </span>
        </ModalHeader>
        <ModalBody className="py-5 space-y-4">
          <InputField
            name="beneficiaryName"
            label="Beneficiary Name"
            control={control}
            isRequired
          />
          <InputField
            name="accountNumber"
            label="Account Number"
            control={control}
            isRequired
            inputMode="numeric"
          />
          <div>
            <InputField
              name="ifscCode"
              label="IFSC Code"
              control={control}
              isRequired
              maxLength={11}
            />
            {lookupState === "loading" && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <FiLoader className="animate-spin" size={12} /> Looking up branch…
              </p>
            )}
            {lookupState === "valid" && branchInfo && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400">
                <FiCheckCircle size={12} />
                {branchInfo.BANK}
                {branchInfo.BRANCH ? `, ${branchInfo.BRANCH} Branch` : ""}
              </p>
            )}
            {lookupState === "invalid" && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-red-500">
                <FiXCircle size={12} /> Invalid IFSC code or branch does not exist.
              </p>
            )}
          </div>
          <SelectField
            name="accountType"
            label="Account Type"
            control={control}
            options={accountTypeSelectOptions}
            isRequired
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={() => handleSubmit(onSubmit)()}
            isLoading={isLoading}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ChangeBankDetailsModal;
