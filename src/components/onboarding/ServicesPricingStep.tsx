import React, { useEffect } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Button, Tooltip, addToast } from "@heroui/react";
import { OnboardingInput } from "./OnboardingInput";
import CheckBox from "../shared/CheckBox";
import {
  useUpdateDoctorMutation,
  useUpdateServiceMutation,
  useGetDoctorQuery,
} from "../../redux/api/doctorApi";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiInfo,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { OnboardingStepSkeleton } from "./OnboardingStepSkeleton";

type ServicesPricingStepProps = {
  onNext: () => void | Promise<void>;
  onComplete?: () => void | Promise<void>;
  onBack: () => void;
  submitLabel?: string;
};

type ServiceRowFormValues = {
  serviceId?: string;
  serviceName: string;
  price: number | string;
  durationDays: number | string;
  additionalServices: string;
  canBeBookedByPatient: boolean;
};

type ServicesFormValues = {
  services: ServiceRowFormValues[];
};

type ServicePayload = {
  serviceName: string;
  price: number;
  durationDays: number;
  additionalServices: string;
  currency: "INR";
  canBeBookedByPatient: boolean;
};

const SERVICE_NAME_MAX_LENGTH = 50;

const parseServiceNameInput = (value: string) =>
  value.slice(0, SERVICE_NAME_MAX_LENGTH);

const parsePriceInput = (value: string) =>
  value.replace(/[^0-9]/g, "").slice(0, 4);

const parseDurationInput = (value: string) => {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 3);
  if (!digits) return ""; // Return empty string for no input
  
  const n = Number(digits);
  if (!Number.isFinite(n)) return "";
  if (n < 1) return "1"; // This is causing issues - let's change this
  if (n > 365) return "365";
  return String(n);
};

const createEmptyServiceRow = (): ServiceRowFormValues => ({
  serviceId: undefined,
  serviceName: "",
  price: "",
  durationDays: "",
  additionalServices: "",
  canBeBookedByPatient: true,
});

const normalizeBookable = (value: unknown) =>
  value === undefined ||
  value === null ||
  (value !== false && value !== "false" && value !== 0 && value !== "0");

const normalizeServiceRow = (svc: any): ServiceRowFormValues => ({
  serviceId: svc?.id || svc?._id ? String(svc.id || svc._id) : undefined,
  serviceName: parseServiceNameInput(String(svc?.serviceName || "")),
  price: svc?.price ?? "",
  durationDays: svc?.durationDays ?? svc?.durationDay ?? "",
  additionalServices: svc?.additionalServices || "",
  canBeBookedByPatient: normalizeBookable(svc?.canBeBookedByPatient),
});

const buildServicePayload = (row: ServiceRowFormValues): ServicePayload => ({
  serviceName: row.serviceName.trim(),
  price: Number(row.price),
  durationDays: Number(row.durationDays),
  additionalServices: String(row.additionalServices || "").trim(),
  currency: "INR",
  canBeBookedByPatient: row.canBeBookedByPatient,
});

const ServicesPricingStep: React.FC<ServicesPricingStepProps> = ({
  onNext,
  onComplete,
  onBack,
  submitLabel = "Save & Continue",
}) => {
  const { data: doctorData, isLoading: isDoctorLoading } = useGetDoctorQuery(
    undefined,
    {
      // ✅ OPTIMIZED: Prevent unnecessary refetching
      refetchOnMountOrArgChange: false,
    },
  );
  const [updateDoctor, { isLoading: isSavingDoctor }] =
    useUpdateDoctorMutation();
  const [updateService, { isLoading: isSavingService }] =
    useUpdateServiceMutation();
  const isSaving = isSavingDoctor || isSavingService;
  const isSaveMode = submitLabel.trim().toLowerCase() === "save";
  const existingServices = React.useMemo(() => {
    const services = doctorData?.result?.services;
    return Array.isArray(services) ? services : [];
  }, [doctorData]);

  const { control, handleSubmit, reset } = useForm<ServicesFormValues>({
    defaultValues: {
      services: [createEmptyServiceRow()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "services",
    keyName: "fieldKey",
  });

  useEffect(() => {
    reset({
      services:
        existingServices.length > 0
          ? existingServices.map((svc) => normalizeServiceRow(svc))
          : [createEmptyServiceRow()],
    });
  }, [existingServices, reset]);

  const onSubmit = async (data: ServicesFormValues) => {
    const serviceRows = data.services.map((row) => ({
      ...row,
      serviceName: row.serviceName.trim(),
      additionalServices: String(row.additionalServices || "").trim(),
    }));

    if (serviceRows.length === 0) {
      addToast({
        title: "Service required",
        description: "Please add at least one service.",
        color: "warning",
      });
      return;
    }

    const duplicateNames = serviceRows
      .map((row) => row.serviceName.toLowerCase())
      .filter((name, index, names) => name && names.indexOf(name) !== index);

    if (duplicateNames.length > 0) {
      addToast({
        title: "Duplicate service name",
        description: "Each service should have a different name.",
        color: "warning",
      });
      return;
    }

    try {
      const existingPayloads = serviceRows
        .filter((row) => row.serviceId)
        .map((row) => ({
          serviceId: row.serviceId!,
          body: buildServicePayload(row),
        }));

      const newPayloads = serviceRows
        .filter((row) => !row.serviceId)
        .map(buildServicePayload);

      if (existingPayloads.length > 0) {
        await Promise.all(
          existingPayloads.map((payload) => updateService(payload).unwrap()),
        );
      }

      if (newPayloads.length > 0) {
        await updateDoctor({ clinicService: newPayloads } as any).unwrap();
      }

      await onComplete?.();
      await onNext();
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
    <div className="w-full font-outfit">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
        <div className="px-4 pb-5 pt-3 sm:px-5 sm:pb-6 sm:pt-4 lg:px-6">
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* ── Service Details Grid ── */}
            <section className="flex flex-col gap-4">
              {fields.map((field, index) => {
                const canRemoveRow = fields.length > 1 && !field.serviceId;

                return (
                  <div
                    key={field.fieldKey}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40 sm:p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 sm:text-[14px]">
                        Service {index + 1}
                      </h3>

                      {canRemoveRow && (
                        <Button
                          type="button"
                          size="sm"
                          variant="light"
                          className="h-8 px-2 text-[12px] font-semibold text-red-500"
                          onPress={() => remove(index)}
                          startContent={<FiTrash2 className="h-3.5 w-3.5" />}
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                      <div className="flex flex-col gap-3">
                        <OnboardingInput
                          control={control}
                          name={`services.${index}.serviceName`}
                          label="Service Name"
                          placeholder="e.g. General Consultation"
                          maxLength={SERVICE_NAME_MAX_LENGTH}
                          parse={parseServiceNameInput}
                          isRequired
                          rules={{
                            required: "Service name is required",
                            validate: (value: any) => {
                              const name = String(value || "").trim();
                              if (!name) return "Service name is required";
                              if (name.length > SERVICE_NAME_MAX_LENGTH) {
                                return `Service name must be ${SERVICE_NAME_MAX_LENGTH} characters or less`;
                              }
                              return true;
                            },
                          }}
                          icon={
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M9 9h6M9 12h6M9 15h6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          }
                        />
                        <div className="flex items-center py-1 pl-1">
                          <CheckBox<ServicesFormValues>
                            control={control}
                            name={`services.${index}.canBeBookedByPatient`}
                            label="Can be booked by patient"
                            classNames={{
                              label:
                                "text-slate-700 dark:text-slate-300 font-medium text-sm select-none cursor-pointer",
                            }}
                          />
                        </div>
                      </div>

                      <Controller
                        name={`services.${index}.price`}
                        control={control}
                        rules={{
                          required: "Consultation fee is required",
                          validate: (v: any) => {
                            const n = Number(v);
                            if (!Number.isFinite(n))
                              return "Enter a valid amount";
                            if (n < 1) return "Fee must be at least ₹1";
                            if (n > 9999) return "Maximum fee is ₹9999";
                            return true;
                          },
                          pattern: {
                            value: /^[0-9]{1,4}$/,
                            message: "Enter amount in digits only",
                          },
                        }}
                        render={({
                          field: { onChange, value, ...fieldProps },
                          fieldState: { error },
                        }) => (
                          <div className="flex flex-col gap-1 sm:gap-1.5">
                            <label className="flex items-center gap-1 text-[13px] font-semibold text-slate-700 dark:text-white sm:text-[14px]">
                              Consultation Fee (₹)
                              <span className="text-red-500">*</span>
                            </label>

                            <div className="relative">
                              <input
                                {...fieldProps}
                                type="tel"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="500"
                                value={value || ""}
                                onChange={(event) => {
                                  onChange(parsePriceInput(event.target.value));
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

                      {/* <OnboardingInput
                        control={control}
                        name={`services.${index}.durationDays`}
                        label="Free Follow-up Duration (Days)"
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
                            if (!Number.isFinite(n))
                              return "Enter a valid number";
                            if (n < 1) return "Minimum 1 day required";
                            if (n > 365) return "Maximum 365 days allowed";
                            return true;
                          },
                          pattern: {
                            value: /^[0-9]{1,3}$/,
                            message: "Enter number of days",
                          },
                        }}
                        parse={parseDurationInput}
                      /> */}
                      <div className="flex flex-col gap-1 sm:gap-1.5">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-[13px] font-semibold text-slate-700 dark:text-white sm:text-[14px]">
                            Follow-up Duration (Days)
                            <span className="text-red-500">*</span>
                          </label>
                          <Tooltip
                            placement="top"
                            showArrow
                            className="max-w-xs"
                            content="Patients can consult again for this service without additional charges for the specified number of days after their appointment."
                          >
                            <button
                              type="button"
                              className="text-slate-400 transition-colors hover:text-primary"
                            >
                              <FiInfo className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        </div>
                        
                        <Controller
                          name={`services.${index}.durationDays`}
                          control={control}
                          rules={{
                            required: "Duration is required",
                            validate: (v: any) => {
                              if (!v || v === "") return "Duration is required";
                              const n = Number(v);
                              if (!Number.isFinite(n) || isNaN(n)) return "Enter a valid number";
                              if (n < 1) return "Minimum 1 day required";
                              if (n > 365) return "Maximum 365 days allowed";
                              return true;
                            },
                          }}
                          render={({
                            field: { onChange, value, ...fieldProps },
                            fieldState: { error },
                          }) => (
                            <>
                              <div className="relative">
                                <input
                                  {...fieldProps}
                                  type="tel"
                                  inputMode="numeric"
                                  maxLength={3}
                                  placeholder="30"
                                  value={value || ""}
                                  onChange={(e) => {
                                    onChange(parseDurationInput(e.target.value));
                                  }}
                                  className={[
                                    "h-11 w-full rounded-lg border bg-white px-4 pr-11 text-[13px] font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500",
                                    error
                                      ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                      : "border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:focus:border-primary-hover dark:focus:ring-primary-hover/30",
                                  ].join(" ")}
                                />
                                <FiCalendar className="absolute right-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
                              </div>
                              
                              {error && (
                                <span className="ml-1 text-[11px] text-red-500 sm:text-[12px]">
                                  {error.message}
                                </span>
                              )}
                            </>
                          )}
                        />
                      </div>
                    </div>

                    {/* <div className="mt-3">
                  <OnboardingInput
                    control={control}
                    name={`services.${index}.additionalServices`}
                    label="Additional notes"
                    placeholder="Follow-up, ECG, Blood tests, etc."
                    isTextarea
                    minRows={3}
                  />
                </div> */}
                  </div>
                );
              })}

              <div>
                <Button
                  type="button"
                  variant="bordered"
                  radius="lg"
                  className="h-10 border-slate-200 bg-white px-4 text-[13px] font-semibold text-primary shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-primary-hover"
                  onPress={() => append(createEmptyServiceRow())}
                  startContent={<FiPlus className="h-4 w-4" />}
                >
                  Add Service
                </Button>
              </div>
            </section>
          </div>

          <div
            className={`mt-4 flex items-center ${isSaveMode ? "justify-end" : "justify-between"} gap-4 border-t border-slate-100 bg-white pt-4 dark:border-slate-700 dark:bg-slate-900`}
          >
            {!isSaveMode && (
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
            )}

            <Button
              type="submit"
              radius="lg"
              className="h-10 sm:h-11 bg-primary px-7 text-[14px] font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover sm:px-9"
              isLoading={isSaving}
              endContent={!isSaving && <FiArrowRight className="h-4 w-4" />}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ServicesPricingStep;
