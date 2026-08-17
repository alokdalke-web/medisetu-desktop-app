import React from "react";
import { FiPhone, FiAlertCircle, FiMessageCircle, FiMail, FiGlobe } from "react-icons/fi";
import SectionCard from "../../../components/shared/SectionCard";
import type { ClinicContactSectionProps } from "../../../types/profile/clinicDetailsSections";

const ClinicContactSection: React.FC<ClinicContactSectionProps> = ({ contact }) => {
  if (!contact) return null;

  const rows = [
    contact.phone && { icon: FiPhone, label: "Phone", value: contact.phone, href: `tel:${contact.phone}` },
    contact.emergencyNumber && {
      icon: FiAlertCircle,
      label: "Emergency",
      value: contact.emergencyNumber,
      href: `tel:${contact.emergencyNumber}`,
    },
    contact.whatsapp && {
      icon: FiMessageCircle,
      label: "WhatsApp",
      value: contact.whatsapp,
      href: `https://wa.me/${String(contact.whatsapp).replace(/\D/g, "")}`,
    },
    contact.email && { icon: FiMail, label: "Email", value: contact.email, href: `mailto:${contact.email}` },
    contact.website && { icon: FiGlobe, label: "Website", value: contact.website, href: contact.website },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string; href: string }[];

  if (rows.length === 0) return null;

  return (
    <SectionCard title="Contact" icon={<FiPhone className="h-4 w-4" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((row) => (
          <a
            key={row.label}
            href={row.href}
            target={row.label === "Website" ? "_blank" : undefined}
            rel={row.label === "Website" ? "noreferrer" : undefined}
            className="flex items-center gap-3 rounded-lg bg-surface-muted px-3 py-2.5 hover:bg-surface-muted/70"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <row.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] text-text-muted">{row.label}</div>
              <div className="text-[13px] font-medium text-text truncate">{row.value}</div>
            </div>
          </a>
        ))}
      </div>
    </SectionCard>
  );
};

export default ClinicContactSection;
