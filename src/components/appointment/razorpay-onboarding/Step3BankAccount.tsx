import React, { useEffect } from "react";
import { type Control, useWatch } from "react-hook-form";
import { FiCheckCircle, FiXCircle, FiLoader } from "react-icons/fi";
import InputField from "../../shared/InputField";
import SelectField from "../../shared/SelectField";
import {
  bankAccountTypeOptions,
  type OnboardRouteFormValues,
} from "../../../schemas/razorpayOnboarding";
import { useIfscLookup, type IfscLookupState } from "./useIfscLookup";

export type { IfscLookupState };

interface Step3BankAccountProps {
  control: Control<OnboardRouteFormValues>;
  onIfscLookupStateChange?: (state: IfscLookupState) => void;
}

const accountTypeSelectOptions = bankAccountTypeOptions.map((o) => ({
  label: o.label,
  value: o.value,
}));

const Step3BankAccount: React.FC<Step3BankAccountProps> = ({
  control,
  onIfscLookupStateChange,
}) => {
  const ifscCode = useWatch({ control, name: "bankDetails.ifscCode" });
  const { state: lookupState, branchInfo } = useIfscLookup(ifscCode);

  useEffect(() => {
    onIfscLookupStateChange?.(lookupState);
  }, [lookupState, onIfscLookupStateChange]);

  return (
    <div className="space-y-4">
      <InputField
        name="bankDetails.beneficiaryName"
        label="Beneficiary Name"
        control={control}
        isRequired
        placeholder="Exactly as it appears on your bank record"
      />
      <InputField
        name="bankDetails.accountNumber"
        label="Account Number"
        control={control}
        isRequired
        inputMode="numeric"
      />

      <div>
        <InputField
          name="bankDetails.ifscCode"
          label="IFSC Code"
          control={control}
          isRequired
          maxLength={11}
          placeholder="e.g. HDFC0001234"
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
        name="bankDetails.accountType"
        label="Account Type"
        control={control}
        options={accountTypeSelectOptions}
        isRequired
        placeholder="Select account type"
      />
    </div>
  );
};

export default Step3BankAccount;
