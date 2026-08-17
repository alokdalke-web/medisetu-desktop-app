import React from "react";
import SectionCard from "../../../components/shared/SectionCard";
import type { ClinicFacilitiesSectionProps } from "../../../types/profile/clinicDetailsSections";

const ClinicFacilitiesSection: React.FC<ClinicFacilitiesSectionProps> = ({ facilities }) => {
  if (!facilities || facilities.length === 0) return null;

  return (
    <SectionCard title="Facilities">
      <div className="flex flex-wrap gap-2">
        {facilities.map((facility) => (
          <span
            key={facility}
            className="rounded-full bg-surface-muted px-3 py-1.5 text-[12px] font-medium text-text"
          >
            {facility}
          </span>
        ))}
      </div>
    </SectionCard>
  );
};

export default ClinicFacilitiesSection;
