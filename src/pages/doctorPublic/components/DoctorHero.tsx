import { FiAward, FiCheckCircle, FiHome, FiMapPin, FiUsers } from "react-icons/fi";

import type { PublicDoctorProfile } from "../../../types/doctor";
import { getDoctorDisplayName } from "../helpers/doctorPublicContent";
import Stars from "./Stars";

interface DoctorHeroProps {
  doctor: PublicDoctorProfile["doctor"];
  rating: PublicDoctorProfile["rating"];
  totalPatients: number;
  primaryCity: string | null;
  clinicCount: number;
}

const DoctorHero: React.FC<DoctorHeroProps> = ({
  doctor,
  rating,
  totalPatients,
  primaryCity,
  clinicCount,
}) => {
  const displayName = getDoctorDisplayName(doctor.name);

  return (
    <header className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {doctor.profileImage ? (
          <img
            src={doctor.profileImage}
            alt={displayName}
            className="h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-3xl font-semibold text-text-muted sm:h-28 sm:w-28">
            {(doctor.name ?? "D").trim().charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-text">{displayName}</h1>
            {doctor.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondarybtn px-2 py-0.5 text-xs font-medium text-primary">
                <FiCheckCircle size={12} /> Verified
              </span>
            )}
          </div>

          {doctor.speciality && (
            <p className="mt-1 text-[15px] text-primary">{doctor.speciality}</p>
          )}
          {doctor.qualification && (
            <p className="mt-1 text-sm text-text-muted">{doctor.qualification}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {rating.count > 0 && (
              <span className="flex items-center gap-2">
                <Stars value={rating.average} />
                <span className="font-medium text-text">{rating.average.toFixed(1)}</span>
                <span className="text-text-muted">({rating.count})</span>
              </span>
            )}
            {doctor.yearsOfExperience != null && (
              <span className="flex items-center gap-2 text-text-muted">
                <FiAward className="shrink-0" /> {doctor.yearsOfExperience} yrs experience
              </span>
            )}
            {totalPatients > 0 && (
              <span className="flex items-center gap-2 text-text-muted">
                <FiUsers className="shrink-0" /> {totalPatients} patients treated
              </span>
            )}
            {primaryCity && (
              <span className="flex items-center gap-2 text-text-muted">
                <FiMapPin className="shrink-0" /> {primaryCity}
              </span>
            )}
            {clinicCount > 0 && (
              <span className="flex items-center gap-2 text-text-muted">
                <FiHome className="shrink-0" /> In-clinic visits
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default DoctorHero;
