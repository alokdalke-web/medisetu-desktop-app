import React from "react";
import {
  FiEdit2,
  FiCheckCircle,
  FiMapPin,
  FiClock,
  FiAward,
} from "react-icons/fi";
import type { ClinicHeroSectionProps } from "../../../types/profile/clinicDetailsSections";

const ClinicHeroSection: React.FC<ClinicHeroSectionProps> = ({
  clinic,
  admin,
  stats,
  subscription,
  profileCompletion,
  onEdit,
}) => {
  const isActive = clinic.status === "Active";
  const locationLine = [clinic.city, clinic.state].filter(Boolean).join(", ");

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none">
      {/* Cover band — gives the page a profile-header silhouette rather than a plain card */}
      <div className="relative h-24 bg-gradient-to-r from-primary via-primary-active to-secondary sm:h-28">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:16px_16px]" />
      </div>

      {/* `relative` is required: the cover above is positioned, so without it this
          static content would paint underneath the cover instead of over it. */}
      <div className="relative px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="-mt-10 grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface ring-4 ring-surface sm:-mt-12 sm:h-24 sm:w-24">
              {clinic.logo ? (
                <img
                  src={clinic.logo}
                  alt={`${clinic.name} logo`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid h-full w-full place-items-center bg-primary/10 text-2xl font-semibold text-primary">
                  {clinic.name?.charAt(0)?.toUpperCase() || "C"}
                </span>
              )}
            </div>

            <div className="min-w-0 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[18px] font-semibold text-text sm:text-[22px]">
                  {clinic.name}
                </h1>
                {isActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-status-completed-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-status-completed)]">
                    <FiCheckCircle className="h-3 w-3" />
                    Verified
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    stats.isOpenNow
                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                      : "bg-red-500/10 text-red-700 dark:text-red-400"
                  }`}
                >
                  <FiClock className="h-3 w-3" />
                  {stats.isOpenNow ? "Open Now" : "Closed"}
                </span>
              </div>

              {clinic.tagline && (
                <p className="mt-1 truncate text-[13px] text-text-muted">
                  {clinic.tagline}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-text-subtle">
                {locationLine && (
                  <span className="inline-flex items-center gap-1">
                    <FiMapPin className="h-3.5 w-3.5" />
                    {locationLine}
                  </span>
                )}
                {admin?.speciality && (
                  <span className="inline-flex items-center gap-1">
                    <FiAward className="h-3.5 w-3.5" />
                    {admin.speciality}
                  </span>
                )}
                {clinic.registrationNumber && (
                  <span>Reg. No. {clinic.registrationNumber}</span>
                )}
              </div>
            </div>
          </div>

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-xl bg-primary px-4 text-[13px] font-medium text-white hover:bg-primary-hover sm:mt-3 lg:h-9"
            >
              <FiEdit2 className="h-4 w-4" />
              Edit Profile
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-line bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium text-text-muted">
                Profile completion
              </span>
              <span className="text-[11px] font-semibold text-text">
                {profileCompletion}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{
                  width: `${Math.min(100, Math.max(0, profileCompletion))}%`,
                }}
              />
            </div>
          </div>

          {subscription?.planName && (
            <div className="shrink-0 sm:border-l sm:border-line sm:pl-4">
              <div className="text-[11px] text-text-muted">Current plan</div>
              <div className="text-[13px] font-semibold text-text">
                {subscription.planName}
                {!subscription.active && (
                  <span className="ml-1.5 text-[11px] font-medium text-red-700 dark:text-red-400">
                    Expired
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicHeroSection;
