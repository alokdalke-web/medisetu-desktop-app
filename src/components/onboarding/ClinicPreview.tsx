import React, { useCallback, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { FiMapPin, FiPhone, FiList, FiEye } from "react-icons/fi";
import SectionCard from "../shared/SectionCard";
import TipsList from "../shared/TipsList";

interface ClinicPreviewProps {
  clinicName?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  services?: string[];
  logoUrl?: string;
  onPreviewProfile?: () => void;
}

const TIPS = [
  { text: "Choose a clear clinic name that patients can easily remember." },
  { text: "Add a professional logo to build trust and brand identity." },
  { text: "Use your exact address for accurate location detection." },
  { text: "You can edit all details later from clinic settings." },
];

const ClinicPreview: React.FC<ClinicPreviewProps> = ({
  clinicName,
  tagline,
  address,
  phone,
  services,
  logoUrl,
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState(false);

  const handlePreviewClick = useCallback(() => {
    // Scroll the preview card into view and briefly highlight it
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlight(true);
    setTimeout(() => setHighlight(false), 1500);
  }, []);

  return (
    <aside className="hidden lg:block w-[260px] shrink-0 space-y-4 lg:sticky lg:top-[72px] lg:self-start">
      {/* Clinic Preview Card */}
      <div
        ref={previewRef}
        className={`transition-all duration-500 rounded-2xl ${
          highlight ? "ring-2 ring-[#0A6C74] ring-offset-2" : ""
        }`}
      >
        <SectionCard padding="none" className="overflow-hidden">
          <div className="px-4 pt-4 pb-4">
            <h3 className="text-sm font-bold text-[#100E1C] mb-3">
              Clinic Preview
            </h3>

            {/* Preview header with gradient */}
            <div className="rounded-xl bg-gradient-to-br from-[#0A6C74] to-[#0E8A94] p-3.5 text-white">
              <div className="flex items-center gap-2.5">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Clinic Logo"
                    className="h-9 w-9 rounded-lg object-cover bg-white/20"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white">
                    <span className="text-base font-bold">+</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate">
                    {clinicName || "Your Clinic Name"}
                  </p>
                  <p className="text-[11px] opacity-80 truncate">
                    {tagline || "Your tagline will appear here"}
                  </p>
                </div>
              </div>
            </div>

            {/* Preview details */}
            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-start gap-2">
                <FiMapPin className="h-3.5 w-3.5 text-[#0A6C74] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-medium text-[#100E1C]">Address</p>
                  <p className="text-[11px] text-[#677294]">
                    {address || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <FiPhone className="h-3.5 w-3.5 text-[#0A6C74] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-medium text-[#100E1C]">Contact</p>
                  <p className="text-[11px] text-[#677294]">
                    {phone || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <FiList className="h-3.5 w-3.5 text-[#0A6C74] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-medium text-[#100E1C]">Services</p>
                  <p className="text-[11px] text-[#677294]">
                    {services && services.length > 0
                      ? services.join(", ")
                      : "Not added yet"}
                  </p>
                </div>
              </div>
            </div>

            {/* Preview button */}
            <Button
              size="sm"
              variant="bordered"
              radius="full"
              className="mt-3.5 w-full border-[#0A6C74] text-[#0A6C74] font-medium text-[11px] h-8"
              startContent={<FiEye className="h-3 w-3" />}
              onPress={handlePreviewClick}
            >
              Preview Public Profile
            </Button>
          </div>
        </SectionCard>
      </div>

      {/* Tips for Success */}
      <SectionCard padding="md">
        <TipsList title="Tips for Success" tips={TIPS} />
        {/* Decorative illustration */}
        <div className="mt-4 rounded-lg overflow-hidden -mx-5 -mb-5">
          <img
            src={`${import.meta.env.BASE_URL}assets/images/tips-success-illustration.png`}
            alt="Tips illustration"
            className="w-full h-auto scale-125 object-cover"
          />
        </div>
      </SectionCard>
    </aside>
  );
};

export default ClinicPreview;
