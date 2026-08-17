import React from "react";
import { FiActivity } from "react-icons/fi";
import SectionCard from "../../../components/shared/SectionCard";
import type { ClinicServicesSectionProps } from "../../../types/profile/clinicDetailsSections";

const ClinicServicesSection: React.FC<ClinicServicesSectionProps> = ({ services }) => {
  if (!services || services.length === 0) return null;

  return (
    <SectionCard title="Services Offered" icon={<FiActivity className="h-4 w-4" />}>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible [scrollbar-color:transparent_transparent] hover:[scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
        {services.map((service) => (
          <span
            key={service.serviceName}
            className="shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-3 py-1.5 text-[12px] font-medium text-primary"
          >
            {service.serviceName}
            {service.price != null && (
              <span className="text-text-muted"> · {service.currency || "₹"}{service.price}</span>
            )}
          </span>
        ))}
      </div>
    </SectionCard>
  );
};

export default ClinicServicesSection;
