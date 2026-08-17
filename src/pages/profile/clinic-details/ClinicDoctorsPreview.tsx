import React from "react";
import { useNavigate } from "react-router";
import { FiUsers, FiArrowRight } from "react-icons/fi";
import SectionCard from "../../../components/shared/SectionCard";
import type { ClinicDoctorsPreviewProps } from "../../../types/profile/clinicDetailsSections";

const ClinicDoctorsPreview: React.FC<ClinicDoctorsPreviewProps> = ({
  doctors,
}) => {
  const navigate = useNavigate();

  if (!doctors || doctors.length === 0) return null;

  return (
    <SectionCard
      title="Doctors"
      icon={<FiUsers className="h-4 w-4" />}
      action={
        <button
          type="button"
          onClick={() => navigate("/doctors")}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
        >
          View all
          <FiArrowRight className="h-3.5 w-3.5" />
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {doctors.map((doctor) => (
          <div
            key={doctor.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface-muted p-3 transition-colors hover:border-primary/30"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">
              {doctor.profileImage ? (
                <img
                  src={doctor.profileImage}
                  alt={doctor.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold">
                  {doctor.name?.charAt(0)?.toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-text">
                {doctor.name}
              </div>
              {doctor.speciality && (
                <div className="truncate text-[11px] text-text-muted">
                  {doctor.speciality}
                </div>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {doctor.yearsOfExperience != null && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {doctor.yearsOfExperience} yrs
                  </span>
                )}
                {doctor.availability && (
                  <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400">
                    {doctor.availability}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

export default ClinicDoctorsPreview;
