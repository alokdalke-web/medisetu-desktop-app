import React from "react";
import type { Control } from "react-hook-form";
import InputField from "../../shared/InputField";
import SelectField from "../../shared/SelectField";
import {
  onboardingBusinessTypeOptions,
  type OnboardRouteFormValues,
} from "../../../schemas/razorpayOnboarding";

interface Step1BusinessDetailsProps {
  control: Control<OnboardRouteFormValues>;
}

const businessTypeSelectOptions = onboardingBusinessTypeOptions.map((o) => ({
  label: o.label,
  value: o.value,
}));

const Step1BusinessDetails: React.FC<Step1BusinessDetailsProps> = ({
  control,
}) => {
  return (
    <div className="space-y-4">
      <InputField
        name="legalBusinessName"
        label="Legal Business Name"
        control={control}
        isRequired
        placeholder="As registered / on your PAN card"
      />

      <SelectField
        name="businessType"
        label="Business Type"
        control={control}
        options={businessTypeSelectOptions}
        isRequired
        placeholder="Select business type"
      />

      <div className="pt-1">
        <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-3">
          Business Address
        </p>
        <div className="space-y-4">
          <InputField
            name="address.street"
            label="Street Address"
            control={control}
            isRequired
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              name="address.city"
              label="City"
              control={control}
              isRequired
            />
            <InputField
              name="address.state"
              label="State"
              control={control}
              isRequired
            />
          </div>
          <InputField
            name="address.postalCode"
            label="PIN Code"
            control={control}
            isRequired
            maxLength={6}
            inputMode="numeric"
          />
        </div>
      </div>
    </div>
  );
};

export default Step1BusinessDetails;
