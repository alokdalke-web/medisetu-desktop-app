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
  if (!amount) return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `₹${num.toLocaleString("en-IN")}`;
};

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
  <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900">
    <button
      type="button"
      onClick={onEdit}
      className="absolute right-4 top-4 flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-500 transition-all hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
    >
      <FiEdit2 size={13} /> Edit
    </button>

    <div className="mb-5 flex items-center gap-3 pr-20">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-[16px] font-bold text-slate-950 dark:text-white">{title}</h3>
    </div>

    <div className="space-y-3">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; value?: string | null }> = ({ label, value }) =>
  (
    <div className="grid grid-cols-[42%_1fr] gap-4">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{value || "—"}</span>
    </div>
  );

const ReviewSubmitStep: React.FC<ReviewSubmitStepProps> = ({ onNext, onBack, onEdit, isSubmitting = false }) => {
  const { data: user, isLoading: isUserLoading } = useGetUserQuery();
  const { data: clinics, isLoading: isClinicsLoading } = useGetAllClinicsQuery();
  const isDoctorUser = user?.userType === "Doctor";
  const isAdminUser = user?.userType === "Admin";
  const { data: doctorData, isLoading: isDoctorLoading } = useGetDoctorQuery(undefined, { skip: !isDoctorUser && !isAdminUser });

  const clinic = clinics?.clinic;
  const profile = clinics?.profile;
  const doctorResult = doctorData?.result;
  const services = doctorResult?.services || [];
  const availability = useMemo(
    () => getDoctorAvailabilityList(doctorResult) || [],
    [doctorResult],
  );
  const firstService = (services[0] || {}) as any;
  const firstAvailable =
    availability.find((slot: any) => Boolean(slot?.isAvailable)) ?? availability[0];
  const availabilityBreaks =
    firstAvailable?.aivblityBreak ??
    firstAvailable?.availabilityBreak ??
    firstAvailable?.breaks ??
    [];

  const daysAvailable = useMemo(() => {
    const days = availability
      .filter((a: any) => a.isAvailable)
      .map((a: any) => a.dayOfWeek)
      .filter(Boolean);

    return days
      .sort((a: string, b: string) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
      .map((day: string) => day.substring(0, 3).toUpperCase());
  }, [availability]);

  const shiftsConfigured =
    firstAvailable?.startTime && firstAvailable?.endTime
      ? Math.max(1, (Array.isArray(availabilityBreaks) ? availabilityBreaks.length : 0) + 1)
      : 0;

  if (isUserLoading || isClinicsLoading || ((isDoctorUser || isAdminUser) && isDoctorLoading)) {
    return <OnboardingStepSkeleton variant="subscription" />;
  }

  return (
    <div className="h-full w-full font-outfit">
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6 pt-4 hide-scrollbar sm:px-6 sm:pb-7 sm:pt-5 mt-4">
          <div className="flex flex-col gap-5 sm:gap-6 ">
            <div className="flex items-start gap-4  rounded-2xl border border-[#CFE9E8] bg-[#F0FAF9] p-4 dark:border-primary/20 dark:bg-primary/10">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/20">
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

              <ReviewCard
                icon={FiUser}
                title="Your Profile"
                onEdit={() => onEdit("profile")}
              >
                <Field label="Name" value={user?.name || (profile as any)?.name} />
                <Field label="Email" value={user?.email || (profile as any)?.email} />
                <Field label="Mobile" value={(profile as any)?.mobile || user?.mobile} />
                <Field label="Speciality" value={(profile as any)?.speciality || doctorResult?.doctorProfile?.speciality} />
                <Field label="Registration No." value={(profile as any)?.registrationNumber || doctorResult?.doctorProfile?.registrationNumber} />
              </ReviewCard>

              <ReviewCard
                icon={FiActivity}
                title="Services & Pricing"
                onEdit={() => onEdit("services")}
              >
                <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-[#DCEEEE] bg-[#F7FCFC] dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-2">
                  <div className="border-b border-[#DCEEEE] p-4 dark:border-slate-700 sm:border-b-0 sm:border-r">
                    <p className="mb-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">Service Name</p>
                    <p className="text-[14px] font-bold text-slate-900 dark:text-white">{firstService.serviceName || "—"}</p>
                  </div>
                  <div className="p-4">
                    <p className="mb-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">Consultation Fee</p>
                    <p className="text-[14px] font-bold text-slate-900 dark:text-white">{formatCurrency(firstService.price)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 px-1 pt-1 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">Duration</p>
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                      {firstService.durationDays ? `${firstService.durationDays} days` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">Additional Notes</p>
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                      {firstService.additionalServices || "—"}
                    </p>
                  </div>
                </div>
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
                <Field
                  label="Slot Duration"
                  value={firstAvailable?.slotMinutes ? `${firstAvailable.slotMinutes} min` : null}
                />
                <Field
                  label="Working Shifts"
                  value={shiftsConfigured ? `${shiftsConfigured} Shifts configured` : null}
                />
              </ReviewCard>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 bg-white px-5 py-2.5 shadow-[0_-10px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900 sm:px-6 sm:py-3">
          {onBack ? (
            <Button 
              type="button" 
              variant="bordered"
              radius="lg"
              className="h-10 sm:h-11 border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              onPress={onBack}
              startContent={<FiArrowLeft className="h-4 w-4" />}
            >
              Back
            </Button>
          ) : <div />}

          <Button
            radius="lg"
            className="h-10 sm:h-11 min-w-[190px] justify-center bg-primary px-7 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover sm:min-w-[210px] sm:px-8"
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
  );
};

export default ReviewSubmitStep;
