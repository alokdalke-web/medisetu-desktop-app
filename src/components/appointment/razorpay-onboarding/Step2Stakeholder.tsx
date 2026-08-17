import React from "react";
import type { Control } from "react-hook-form";
import InputField from "../../shared/InputField";
import type { OnboardRouteFormValues } from "../../../schemas/razorpayOnboarding";

interface Step2StakeholderProps {
  control: Control<OnboardRouteFormValues>;
}

const Step2Stakeholder: React.FC<Step2StakeholderProps> = ({ control }) => {
  return (
    <div className="space-y-4">
      <InputField
        name="stakeholder.name"
        label="Stakeholder Name"
        control={control}
        isRequired
        placeholder="As printed on PAN card"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          name="stakeholder.email"
          label="Email Address"
          control={control}
          type="email"
          isRequired
        />
        <InputField
          name="stakeholder.phone"
          label="Mobile Number"
          control={control}
          isRequired
          maxLength={10}
          inputMode="numeric"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          name="stakeholder.pan"
          label="PAN Number"
          control={control}
          isRequired
          maxLength={10}
          className="uppercase"
          placeholder="ABCDE1234F"
        />
        <InputField
          name="stakeholder.dob"
          label="Date of Birth"
          control={control}
          type="date"
          isRequired
        />
      </div>
    </div>
  );
};

export default Step2Stakeholder;
