import React from "react";
import { FiExternalLink, FiMapPin } from "react-icons/fi";
import SectionCard from "../../../components/shared/SectionCard";
import InteractiveMap from "../../../components/shared/InteractiveMap";
import type { ClinicAddressMapSectionProps } from "../../../types/profile/clinicDetailsSections";

const noop = () => {
  // read-only map — location edits happen on the Edit Profile page
};

const ClinicAddressMapSection: React.FC<ClinicAddressMapSectionProps> = ({ clinic }) => {
  const hasAddress = Boolean(clinic.address || clinic.city || clinic.state || clinic.zipCode);
  const hasCoords = typeof clinic.latitude === "number" && typeof clinic.longitude === "number";

  if (!hasAddress && !hasCoords) return null;

  return (
    <SectionCard title="Address" icon={<FiMapPin className="h-4 w-4" />} padding="none" className="overflow-hidden">
      <div className="p-4 sm:p-5 space-y-2">
        {clinic.address && <p className="text-[13px] text-text">{clinic.address}</p>}
        <p className="text-[13px] text-text-muted">
          {[clinic.city, clinic.state, clinic.zipCode].filter(Boolean).join(", ")}
        </p>
        {hasCoords && (
          <a
            href={`https://www.google.com/maps?q=${clinic.latitude},${clinic.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline"
          >
            View on Map
            <FiExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {hasCoords && (
        <div className="h-[260px] w-full">
          <InteractiveMap
            initialLocation={{ lat: clinic.latitude as number, lng: clinic.longitude as number }}
            onLocationChange={noop}
            readOnly
            height="260px"
          />
        </div>
      )}
    </SectionCard>
  );
};

export default ClinicAddressMapSection;
