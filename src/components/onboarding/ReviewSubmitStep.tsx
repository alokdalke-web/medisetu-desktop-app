import React, { useMemo } from "react";
import {
  FiActivity,
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiHome,
  FiSend,
  FiUser,
} from "react-icons/fi";
import { Button } from "@heroui/react";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import { useGetDoctorQuery } from "../../redux/api/doctorApi";
import { getDoctorAvailabilityList } from "../../utils/clinicSetupStatus";
import type { StepKey } from "./types";
import { OnboardingStepSkeleton } from "./OnboardingStepSkeleton";

type ReviewSubmitStepProps = {
  onNext: () => void;
  onBack?: () => void;
  onEdit: (step: StepKey) => void;
  isSubmitting?: boolean;
};

const formatCurrency = (amount: number | string | undefined) => {
  if (amount === undefined || amount === null || amount === "") return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(num)) return "—";
  return `₹${num.toLocaleString("en-IN")}`;
};

const formatDuration = (days: unknown) => {
  const num = Number(days);
  if (!Number.isFinite(num) || num <= 0) return "—";
  return `${num} day${num === 1 ? "" : "s"}`;
};

const formatPatientBooking = (value: unknown) =>
  value === false || value === "false" || value === 0 || value === "0"
    ? "Disabled"
    : "Enabled";

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const getTokenCount = (slot: any): number | null => {
  if (slot?.noOfPatients === undefined || slot?.noOfPatients === null) {
    return null;
  }

  const count = Number(slot.noOfPatients);
  return Number.isFinite(count) && count > 0 ? count : null;
};

const ReviewCard: React.FC<{
  icon: React.ElementType;
  iconTone?: string;
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}> = ({
  icon: Icon,
  iconTone = "bg-[#E8F6F4] text-primary dark:bg-primary/20 dark:text-primary-hover",
  title,
  onEdit,
  children,
}) => (
  <div className="relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all dark:border-slate-700 dark:bg-slate-900">
    <button
      type="button"
      onClick={onEdit}
      className="absolute right-4 cursor-pointer top-4 flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-500 transition-all hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
    >
      <FiEdit2 size={13} /> Edit
    </button>

    <div className="mb-5 flex items-center gap-3 pr-20">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-[16px] font-bold text-slate-950 dark:text-white">{title}</h3>
    </div>

    <div className="flex-1 space-y-3">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; value?: string | null }> = ({ label, value }) =>
  (
    <div className="grid grid-cols-[42%_1fr] gap-4">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</span>
      <span className="min-w-0 break-words text-[13px] font-semibold text-slate-800 dark:text-slate-100">{value || "—"}</span>
    </div>
  );

const ReviewSubmitStep: React.FC<ReviewSubmitStepProps> = ({ onNext, onBack, onEdit, isSubmitting = false }) => {
  const { data: user, isLoading: isUserLoading } = useGetUserQuery();
  const isDoctorUser = user?.userType === "Doctor";
  const isAdminUser = user?.userType === "Admin";
  const { data: clinics, isLoading: isClinicsLoading } = useGetAllClinicsQuery(undefined, {
    skip: !isAdminUser,
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });
  const { data: doctorData, isLoading: isDoctorLoading } = useGetDoctorQuery(undefined, {
    skip: !isDoctorUser && !isAdminUser,
    refetchOnMountOrArgChange: true,
  });

  const clinic = clinics?.clinic;
  const profile = clinics?.profile;
  const doctorResult = doctorData?.result;
  const doctorProfile = doctorResult?.doctorProfile;
  const profileName = isDoctorUser
    ? doctorProfile?.name || user?.name
    : (profile as any)?.name || doctorProfile?.name || user?.name;
  const profileEmail = isDoctorUser
    ? doctorProfile?.email || user?.email
    : (profile as any)?.email || doctorProfile?.email || user?.email;
  const profileMobile = isDoctorUser
    ? doctorProfile?.mobile || user?.mobile
    : (profile as any)?.mobile || doctorProfile?.mobile || user?.mobile;
  const profileSpeciality =
    (isDoctorUser ? doctorProfile?.speciality : (profile as any)?.speciality) ||
    doctorProfile?.speciality ||
    (user as any)?.speciality;
  const profileRegistrationNumber =
    (isDoctorUser
      ? doctorProfile?.registrationNumber || doctorProfile?.licenseNumber
      : (profile as any)?.registrationNumber || (profile as any)?.licenseNumber) ||
    doctorProfile?.registrationNumber ||
    doctorProfile?.licenseNumber ||
    (user as any)?.registrationNumber ||
    (user as any)?.licenseNumber;
  const serviceItems = useMemo<any[]>(() => {
    const services = doctorResult?.services;
    return Array.isArray(services) ? services : [];
  }, [doctorResult]);
  const singleService = serviceItems.length === 1 ? serviceItems[0] : null;
  const singleServiceName = String(singleService?.serviceName || "—");
  const singleServiceDuration =
    singleService?.durationDays ?? singleService?.durationDay;
  const singleServiceAdditional = String(singleService?.additionalServices || "").trim();
  const availability = useMemo(
    () => getDoctorAvailabilityList(doctorResult) || [],
    [doctorResult],
  );
  const availableSlots = useMemo(
    () => availability.filter((slot: any) => Boolean(slot?.isAvailable)),
    [availability],
  );
  const firstAvailable = availableSlots[0];
  const availabilityBreaks =
    firstAvailable?.aivblityBreak ??
    firstAvailable?.availabilityBreak ??
    firstAvailable?.breaks ??
    [];
  const tokenCount = useMemo(() => {
    for (const slot of availableSlots) {
      const count = getTokenCount(slot);
      if (count !== null) return count;
    }
    return null;
  }, [availableSlots]);
  const isTokenBased = tokenCount !== null;

  const daysAvailable = useMemo(() => {
    const days = availableSlots
      .map((a: any) => a.dayOfWeek)
      .filter(Boolean);

    return days
      .sort((a: string, b: string) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
      .map((day: string) => day.substring(0, 3).toUpperCase());
  }, [availableSlots]);

  const shiftsConfigured =
    firstAvailable?.startTime && firstAvailable?.endTime
      ? Math.max(1, (Array.isArray(availabilityBreaks) ? availabilityBreaks.length : 0) + 1)
      : 0;

  if (isUserLoading || (isAdminUser && isClinicsLoading) || ((isDoctorUser || isAdminUser) && isDoctorLoading)) {
    return <OnboardingStepSkeleton variant="subscription" />;
  }

  return (
    <div className="w-full font-outfit">
      <div className="flex flex-col">
        <div className="px-4 pb-5 pt-3 sm:px-5 sm:pb-6 sm:pt-4 lg:px-6">
          <div className="flex flex-col gap-4 sm:gap-5 ">
            <div className="flex items-start gap-4 rounded-2xl border border-[#CFE9E8] bg-[#F0FAF9] p-4 dark:border-primary/20 dark:bg-primary/10">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                <FiCheckCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="mb-1 text-[15px] font-bold text-slate-950 dark:text-white">
                  Almost there!
                </p>
                <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
                  Review your details below. You can edit any section before submitting.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
              {!isDoctorUser && (
                <ReviewCard
                  icon={FiHome}
                  title="Clinic Details"
                  onEdit={() => onEdit("clinic")}
                >
                  <Field label="Clinic Name" value={clinic?.clinicName} />
                  <Field label="Phone" value={clinic?.clinicPhone} />
                  <Field label="Tagline" value={clinic?.Tagline || (clinic as any)?.tagline} />
                  <Field label="Address" value={clinic?.clinicAddress || (clinic as any)?.address} />
                  <Field
                    label="Pincode"
                    value={
                      clinic?.ZipCode || (clinic as any)?.zipCode || (clinic as any)?.pincode
                        ? String(clinic?.ZipCode || (clinic as any)?.zipCode || (clinic as any)?.pincode)
                        : null
                    }
                  />
                </ReviewCard>
              )}

              <ReviewCard
                icon={FiUser}
                title="Your Profile"
                onEdit={() => onEdit("profile")}
              >
                <Field label="Name" value={profileName} />
                <Field label="Email" value={profileEmail} />
                <Field label="Mobile" value={profileMobile} />
                <Field label="Speciality" value={profileSpeciality} />
                <Field label="Registration No." value={profileRegistrationNumber} />
              </ReviewCard>

              <ReviewCard
                icon={FiActivity}
                title="Services & Pricing"
                onEdit={() => onEdit("services")}
              >
                {singleService ? (
                  <div className="flex h-full min-h-[176px] flex-col justify-center rounded-xl border border-[#DCEEEE] bg-[#F7FCFC] p-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                          Service Name
                        </p>
                        <p
                          title={singleServiceName}
                          className="break-words text-[15px] font-bold leading-snug text-slate-950 dark:text-white"
                        >
                          {singleServiceName}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                          Price
                        </p>
                        <p className="text-[14px] font-bold text-slate-900 dark:text-white">
                          {formatCurrency(singleService.price)}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                          Validity
                        </p>
                        <p className="text-[14px] font-bold text-slate-900 dark:text-white">
                          {formatDuration(singleServiceDuration)}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                          Patient Booking
                        </p>
                        <p className="text-[14px] font-bold text-slate-900 dark:text-white">
                          {formatPatientBooking(singleService.canBeBookedByPatient)}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                          Add-ons
                        </p>
                        <p className="break-words text-[14px] font-bold text-slate-900 dark:text-white">
                          {singleServiceAdditional || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : serviceItems.length > 0 ? (
                  <div className="max-h-[176px] overflow-y-auto pr-1">
                    <div className="space-y-2">
                      {serviceItems.map((service, index) => {
                        const serviceName = String(service.serviceName || "—");
                        const durationDays =
                          service.durationDays ?? service.durationDay;

                        return (
                          <div
                            key={String(service.id ?? service._id ?? index)}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#DCEEEE] bg-[#F7FCFC] px-4 py-3 dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-[minmax(0,1fr)_90px_92px]"
                          >
                            <p
                              title={serviceName}
                              className="min-w-0 truncate text-[13px] font-bold leading-snug text-slate-900 dark:text-white"
                            >
                              {serviceName}
                            </p>

                            <p className="whitespace-nowrap text-right text-[13px] font-bold text-slate-900 dark:text-white">
                              {formatCurrency(service.price)}
                            </p>

                            <p className="col-span-2 whitespace-nowrap text-left text-[12px] font-semibold text-slate-600 dark:text-slate-300 sm:col-span-1 sm:text-right">
                              {formatDuration(durationDays)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#DCEEEE] bg-[#F7FCFC] p-4 text-[13px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    —
                  </div>
                )}
              </ReviewCard>

              <ReviewCard
                icon={FiClock}
                title="Availability"
                onEdit={() => onEdit("availability")}
              >
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Available Days</p>
                  {daysAvailable.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {daysAvailable.map((day: string) => (
                        <span
                          key={day}
                          className="inline-flex h-8 items-center justify-center rounded-lg bg-[#E8F6F4] px-3 text-[12px] font-bold tracking-wide text-primary dark:bg-primary/15 dark:text-primary-hover"
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">—</p>
                  )}
                </div>
                {isTokenBased ? (
                  <>
                    <Field label="Booking Mode" value="Token Based" />
                    <Field label="Daily Tokens" value={`${tokenCount} tokens`} />
                  </>
                ) : (
                  <>
                    <Field
                      label="Slot Duration"
                      value={firstAvailable?.slotMinutes ? `${firstAvailable.slotMinutes} min` : null}
                    />
                    <Field
                      label="Working Shifts"
                      value={shiftsConfigured ? `${shiftsConfigured} Shifts configured` : null}
                    />
                  </>
                )}
              </ReviewCard>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-200 bg-white pt-4 dark:border-slate-700 dark:bg-slate-900">
          {onBack ? (
            <Button 
              type="button" 
              variant="bordered"
              radius="lg"
              className="h-10 sm:h-11 border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              onPress={onBack}
              startContent={<FiArrowLeft className="h-4 w-4" />}
            >
              Back
            </Button>
          ) : <div />}

          <Button
            radius="lg"
            className="h-10 sm:h-11 min-w-[190px] justify-center bg-primary px-7 text-sm font-semibold text-white transition-all hover:bg-primary-hover sm:min-w-[210px] sm:px-8"
            onPress={onNext}
            isLoading={isSubmitting}
            isDisabled={isSubmitting}
            endContent={!isSubmitting && <FiSend className="h-4 w-4" />}
          >
            Submit for Approval
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewSubmitStep;
