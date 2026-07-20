import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button, addToast } from "@heroui/react";
import { OnboardingInput } from "./OnboardingInput";
import CheckBox from "../shared/CheckBox";
import {
  useUpdateDoctorMutation,
  useGetDoctorQuery,
} from "../../redux/api/doctorApi";
import { FiArrowLeft, FiArrowRight, FiCalendar } from "react-icons/fi";
import { OnboardingStepSkeleton } from "./OnboardingStepSkeleton";


type ServicesPricingStepProps = {
  onNext: () => void;
  onComplete?: () => void;
  onBack: () => void;
};

type ServicesFormValues = {
  serviceName: string;
  price: number | string;
  durationDays: number | string;
  additionalServices: string;
  canBeBookedByPatient: boolean;
};

const ServicesPricingStep: React.FC<ServicesPricingStepProps> = ({
  onNext,
  onComplete,
  onBack,
}) => {
  const { data: doctorData, isLoading: isDoctorLoading } = useGetDoctorQuery(undefined, {
    // ✅ OPTIMIZED: Prevent unnecessary refetching
    refetchOnMountOrArgChange: false,
  });
  const [updateDoctor, { isLoading: isSaving }] = useUpdateDoctorMutation();

  const { control, handleSubmit, reset } = useForm<ServicesFormValues>({
    defaultValues: {
      serviceName: "",
      price: "",
      durationDays: "",
      additionalServices: "",
      canBeBookedByPatient: true,
    },
  });

  useEffect(() => {
    const services = doctorData?.result?.services;
    if (services && Array.isArray(services) && services.length > 0) {
      const svc = services[0];
      reset({
        serviceName: svc.serviceName || "",
        price: svc.price || "",
        durationDays: (svc as any).durationDays || (svc as any).durationDay || "",
        additionalServices: svc.additionalServices || "",
        canBeBookedByPatient:
          svc?.canBeBookedByPatient === undefined ||
          svc?.canBeBookedByPatient === null
            ? true
            : Boolean(svc.canBeBookedByPatient),
      });
    }
  }, [doctorData, reset]);

  const onSubmit = async (data: ServicesFormValues) => {
    const priceNum = Number(data.price);
    const durNum = Number(data.durationDays);

    if (!Number.isFinite(priceNum) || priceNum < 1 || priceNum > 9999) {
      addToast({
        title: "Invalid price",
        description: "Price must be between 1 and 9999 (max 4 digits).",
        color: "warning",
      });
      return;
    }

    if (!Number.isFinite(durNum) || durNum < 1 || durNum > 365) {
      addToast({
        title: "Invalid duration",
        description: "Duration must be between 1 and 365 days.",
        color: "warning",
      });
      return;
    }

    try {
      const oneService = {
        serviceName: data.serviceName,
        price: priceNum,
        durationDays: durNum,
        additionalServices: data.additionalServices,
        currency: "INR",
        canBeBookedByPatient: data.canBeBookedByPatient,
      };

      const payload = { clinicService: [oneService] };
      const res = await updateDoctor(payload as any).unwrap();
      if (res.success) {
        onComplete?.();
        onNext();
      }
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to update services",
        color: "danger",
      });
    }
  };

  if (isDoctorLoading) {
    return <OnboardingStepSkeleton variant="services" />;
  }

  return (
    <div className="h-full w-full font-outfit">
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6 pt-4 hide-scrollbar sm:px-6 sm:pb-7 sm:pt-5">
          <div className="flex flex-col gap-5 sm:gap-6">
        
     
        {/* ── Service Details Grid ── */}
        <section className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="flex flex-col gap-3">
              <OnboardingInput
                control={control}
                name="serviceName"
                label="Service Name"
                placeholder="e.g. General Consultation"
                isRequired
                rules={{ required: "Service name is required" }}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 9h6M9 12h6M9 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }
              />
              <div className="flex items-center pl-1 py-1">
                <CheckBox
                  control={control}
                  name="canBeBookedByPatient"
                  label="Can be booked by patient"
                  classNames={{
                    label: "text-slate-700 dark:text-slate-300 font-medium text-sm select-none cursor-pointer",
                  }}
                />
              </div>
            </div>

            <Controller
              name="price"
              control={control}
              rules={{
                required: "Consultation fee is required",
                validate: (v: any) => {
                  const n = Number(v);
                  if (!Number.isFinite(n)) return "Enter a valid amount";
                  if (n < 1) return "Fee must be at least ₹1";
                  if (n > 9999) return "Maximum fee is ₹9999";
                  return true;
                },
                pattern: { value: /^[0-9]{1,4}$/, message: "Enter amount in digits only" },
              }}
              render={({ field: { onChange, value, ...field }, fieldState: { error } }) => (
                <div className="flex flex-col gap-1 sm:gap-1.5">
                  <label className="flex items-center gap-1 text-[13px] font-semibold text-slate-700 dark:text-white sm:text-[14px]">
                    Consultation Fee (₹)
                    <span className="text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <input
                      {...field}
                      type="tel"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="500"
                      value={value || ""}
                      onChange={(event) => {
                        onChange(event.target.value.replace(/[^0-9]/g, "").slice(0, 4));
                      }}
                      className={[
                        "h-11 w-full rounded-lg border bg-white px-4 pr-11 text-[13px] font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500",
                        error
                          ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                          : "border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:focus:border-primary-hover dark:focus:ring-primary-hover/30",
                      ].join(" ")}
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-slate-500 dark:text-slate-400">
                      ₹
                    </span>
                  </div>

                  {error && (
                    <span className="ml-1 text-[11px] text-red-500 sm:text-[12px]">
                      {error.message}
                    </span>
                  )}
                </div>
              )}
            />

            <OnboardingInput
              control={control}
              name="durationDays"
              label="Duration (days)"
              placeholder="30"
              icon={<FiCalendar className="h-[18px] w-[18px]" />}
              type="tel"
              inputMode="numeric"
              maxLength={3}
              isRequired
              rules={{
                required: "Duration is required",
                validate: (v: any) => {
                  const n = Number(v);
                  if (!Number.isFinite(n)) return "Enter a valid number";
                  if (n < 1) return "Minimum 1 day required";
                  if (n > 365) return "Maximum 365 days allowed";
                  return true;
                },
                pattern: { value: /^[0-9]{1,3}$/, message: "Enter number of days" },
              }}
              parse={(val) => {
                const digits = val.replace(/[^0-9]/g, "").slice(0, 3);
                if (!digits) return "";
                const n = Number(digits);
                if (!Number.isFinite(n)) return "";
                if (n < 1) return "1";
                if (n > 365) return "365";
                return String(n);
              }}
            />
          </div>

          <div>
            <OnboardingInput
              control={control}
              name="additionalServices"
              label="Additional notes"
              placeholder="Follow-up, ECG, Blood tests, etc."
              isTextarea
              minRows={4}
            />
          </div>
        </section>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 bg-white px-5 py-2.5 shadow-[0_-10px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900 sm:px-6 sm:py-3">
          <Button
            type="button"
            variant="bordered"
            radius="lg"
            className="h-10 sm:h-11 border-slate-200 bg-white px-5 sm:px-6 text-[14px] font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            onPress={onBack}
            startContent={<FiArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>

          <Button
            type="submit"
            radius="lg"
            className="h-10 sm:h-11 bg-primary px-7 text-[14px] font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover sm:px-9"
            isLoading={isSaving}
            endContent={!isSaving && <FiArrowRight className="h-4 w-4" />}
          >
            Save & Continue
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ServicesPricingStep;
