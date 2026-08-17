import React from "react";
import SectionCard from "../../../components/shared/SectionCard";
import type { ClinicGallerySectionProps } from "../../../types/profile/clinicDetailsSections";

const ClinicGallerySection: React.FC<ClinicGallerySectionProps> = ({ gallery }) => {
  if (!gallery || gallery.length === 0) return null;

  return (
    <SectionCard title="Gallery">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {gallery.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt={`Clinic gallery ${i + 1}`}
            loading="lazy"
            className="h-28 w-full rounded-lg object-cover"
          />
        ))}
      </div>
    </SectionCard>
  );
};

export default ClinicGallerySection;
