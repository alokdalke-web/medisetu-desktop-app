import React from "react";
import { FiFileText } from "react-icons/fi";
import SectionCard from "../../../components/shared/SectionCard";
import type { ClinicDetailsSectionProps } from "../../../types/profile/clinicDetailsSections";

const ClinicDetailsSection: React.FC<ClinicDetailsSectionProps> = ({ clinic, admin }) => {
  const rows = [
    clinic.registrationNumber && { label: "Registration No.", value: clinic.registrationNumber },
    admin?.speciality && { label: "Speciality", value: admin.speciality },
    admin?.qualification && { label: "Qualification", value: admin.qualification },
  ].filter(Boolean) as { label: string; value: string }[];

  if (rows.length === 0) return null;

  return (
    <SectionCard title="Clinic Details" icon={<FiFileText className="h-4 w-4" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <div className="text-[11px] text-text-muted">{row.label}</div>
            <div className="text-[13px] font-medium text-text truncate">{row.value}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

export default ClinicDetailsSection;
