import React from "react";
import SectionCard from "../../../components/shared/SectionCard";
import type { ClinicInsuranceSectionProps } from "../../../types/profile/clinicDetailsSections";

const ClinicInsuranceSection: React.FC<ClinicInsuranceSectionProps> = ({ insurance }) => {
  if (!insurance || insurance.length === 0) return null;

  return (
    <SectionCard title="Insurance Accepted">
      <div className="flex flex-wrap gap-2">
        {insurance.map((provider) => (
          <span
            key={provider}
            className="rounded-full bg-surface-muted px-3 py-1.5 text-[12px] font-medium text-text"
          >
            {provider}
          </span>
        ))}
      </div>
    </SectionCard>
  );
};

export default ClinicInsuranceSection;
