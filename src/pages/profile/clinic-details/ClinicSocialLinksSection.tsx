import React from "react";
import { FiLink } from "react-icons/fi";
import SectionCard from "../../../components/shared/SectionCard";
import type { ClinicSocialLinksSectionProps } from "../../../types/profile/clinicDetailsSections";

const ClinicSocialLinksSection: React.FC<ClinicSocialLinksSectionProps> = ({ socialLinks }) => {
  const entries = socialLinks ? Object.entries(socialLinks).filter(([, url]) => Boolean(url)) : [];
  if (entries.length === 0) return null;

  return (
    <SectionCard title="Social Links">
      <div className="flex flex-wrap gap-2">
        {entries.map(([platform, url]) => (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-[12px] font-medium text-text hover:bg-surface-muted/70"
          >
            <FiLink className="h-3.5 w-3.5" />
            {platform}
          </a>
        ))}
      </div>
    </SectionCard>
  );
};

export default ClinicSocialLinksSection;
