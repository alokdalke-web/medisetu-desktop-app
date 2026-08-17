import type { PublicDoctorProfile } from "../../../types/doctor";
import SectionCard from "./SectionCard";

interface CredentialsSectionProps {
  doctor: PublicDoctorProfile["doctor"];
}

const CredentialsSection: React.FC<CredentialsSectionProps> = ({ doctor }) => (
  <SectionCard title="Education & registration">
    {doctor.qualifications.length > 0 && (
      <ul className="space-y-4">
        {doctor.qualifications.map((q, i) => (
          <li key={`${q.qualificationTitle}-${i}`} className="flex gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
            <div>
              <p className="font-medium text-text">
                {q.qualificationTitle}
                {q.specialization ? ` — ${q.specialization}` : ""}
              </p>
              <p className="text-sm text-text-muted">
                {[q.boardOrUniversity, q.yearOfCompletion].filter(Boolean).join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    )}

    {doctor.registrationNumber && (
      <div
        className={
          doctor.qualifications.length > 0
            ? "mt-4 border-t border-line pt-4"
            : undefined
        }
      >
        <p className="text-sm text-text-muted">Medical council registration</p>
        <p className="font-medium text-text">{doctor.registrationNumber}</p>
      </div>
    )}
  </SectionCard>
);

export default CredentialsSection;
