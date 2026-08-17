import React from "react";
import { FiAward } from "react-icons/fi";

import { InfoField } from "../shared";
import type { DoctorQualificationItem } from "../../../../types/doctor";

type OverviewTabProps = {
  user: any;
  isDoctorLike: boolean;
};

const QualificationCard: React.FC<{ q: DoctorQualificationItem }> = ({ q }) => (
  <div className="flex items-start gap-3 rounded-xl border border-default-200 px-4 py-3 dark:border-default-100">
    <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
      <FiAward className="text-[16px]" />
    </div>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-default-900 dark:text-white">
          {q.qualificationTitle}
        </span>
        {q.qualificationType && (
          <span className="rounded-full bg-default-100 px-2 py-0.5 text-[10px] font-medium text-default-500 dark:bg-default-50/50">
            {q.qualificationType}
          </span>
        )}
      </div>
      <div className="mt-0.5 text-xs text-default-400">
        {[q.specialization, q.boardOrUniversity, q.yearOfCompletion]
          .filter(Boolean)
          .join(" • ") || "—"}
      </div>
    </div>
  </div>
);

const OverviewTab: React.FC<OverviewTabProps> = ({ user, isDoctorLike }) => {
  const qualifications: DoctorQualificationItem[] = Array.isArray(user?.qualifications)
    ? user.qualifications
    : [];

  return (
    <div className="space-y-6">
      {/* Contact / personal */}
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <InfoField label="Email" value={user?.email} />
        <InfoField label="Mobile" value={user?.mobile} />
        <InfoField label="Alternate Mobile" value={user?.alternateMobile} />
        <InfoField label="Gender" value={user?.gender} />
        <InfoField label="Address" value={user?.address} />
        <InfoField label="City" value={user?.city} />
        {isDoctorLike && (
          <>
            <InfoField label="Speciality" value={user?.speciality} />
            <InfoField
              label="Experience"
              value={user?.yearsOfExperience ? `${user.yearsOfExperience} yrs` : null}
            />
            <InfoField label="License Number" value={user?.licenseNumber} />
            <InfoField label="Registration Number" value={user?.registrationNumber} />
          </>
        )}
      </div>

      {isDoctorLike && user?.about && (
        <div className="border-t border-default-200 pt-5 dark:border-default-100">
          <div className="text-xs font-semibold uppercase tracking-wide text-default-400">About</div>
          <p className="mt-1.5 text-sm leading-relaxed text-default-700 dark:text-default-200">
            {user.about}
          </p>
        </div>
      )}

      {/* Multiple qualifications */}
      {isDoctorLike && (
        <div className="border-t border-default-200 pt-5 dark:border-default-100">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-default-400">
            Qualifications
          </div>
          {qualifications.length === 0 ? (
            <p className="text-sm text-default-400">
              {user?.qualification || "No qualifications added yet."}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {qualifications.map((q) => (
                <QualificationCard key={q.id} q={q} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OverviewTab;
