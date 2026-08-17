import { addToast, Button, Spinner } from "@heroui/react";
import React, { useEffect, useMemo } from "react";
import { flushSync } from "react-dom";
import { useForm, useWatch } from "react-hook-form";
import { FiActivity, FiArrowLeft } from "react-icons/fi";
import { useNavigate, useParams } from "react-router";

import CheckBox from "../../components/shared/CheckBox";
import InputField from "../../components/shared/InputField";

import {
  useGetDoctorQuery,
  useUpdateDoctorMutation,
  useUpdateServiceMutation,
} from "../../redux/api/doctorApi";

import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import type { EditServicePageServiceForm as ServiceForm } from "../../types/profile";

// Mirrors the input styling used on the Medicine Setup page so both
// profile setup screens read as one system.
const inputClassNames = {
  label:
    "mb-1.5 block text-sm font-medium text-text",
  inputWrapper:
    "h-[48px] sm:h-[52px] rounded-xl border border-slate-200 bg-surface px-4 shadow-none hover:bg-surface data-[hover=true]:bg-surface data-[hover=true]:border-slate-300 group-data-[focus=true]:bg-surface group-data-[focus=true]:border-line dark:bg-[#111a2c] dark:data-[hover=true]:bg-[#111a2c] dark:group-data-[focus=true]:bg-[#111a2c]",
  input:
    "text-sm text-text placeholder:text-text-muted dark:placeholder:text-text-muted",
  description: "text-xs text-text-muted pl-1",
};

const toNum = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const EditServicePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { setDirty } = useUnsavedChanges();

  const { data: doctorData, isLoading: isLoadingDoctor } = useGetDoctorQuery();
  const [updateDoctor, { isLoading: isSavingDoctor }] = useUpdateDoctorMutation();
  const [updateService, { isLoading: isSavingService }] = useUpdateServiceMutation();

  const isSaving = isSavingDoctor || isSavingService;

  type UpdateDoctorArg = Parameters<typeof updateDoctor>[0];

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isDirty },
  } = useForm<ServiceForm>({
    defaultValues: {
      id: undefined,
      serviceName: "",
      price: "",
      currency: "INR",
      durationDays: "",
      canBeBookedByPatient: true,
    },
  });

  useEffect(() => {
    setDirty(Boolean(isDirty));
  }, [isDirty, setDirty]);

  const priceWatch = useWatch({ control, name: "price" });
  useEffect(() => {
    const raw = String(priceWatch ?? "");
    const digitsOnly = raw.replace(/\D/g, "").slice(0, 4);

    if (raw !== digitsOnly) {
      setValue("price", digitsOnly, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [priceWatch, setValue]);

  const durationWatch = useWatch({ control, name: "durationDays" });
  useEffect(() => {
    const raw = String(durationWatch ?? "");
    let digitsOnly = raw.replace(/\D/g, "").slice(0, 3);

    if (digitsOnly === "0") digitsOnly = "";

    if (digitsOnly) {
      const n = Number(digitsOnly);
      if (Number.isFinite(n) && n > 365) digitsOnly = "365";
    }

    if (raw !== digitsOnly) {
      setValue("durationDays", digitsOnly, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [durationWatch, setValue]);

  const service = useMemo(() => {
    if (!isEdit || !doctorData?.result?.services) return null;
    return (doctorData.result.services as any[]).find(
      (s: any) => String(s.id) === id,
    );
  }, [isEdit, doctorData, id]);

  const normalizedExistingServiceNames = useMemo(() => {
    const services = doctorData?.result?.services ?? [];
    return services.map((s: any) => ({
      id: String(s.id ?? ""),
      name: String(s.serviceName ?? "")
        .trim()
        .toLowerCase(),
    }));
  }, [doctorData]);

  useEffect(() => {
    if (isEdit && service) {
      reset({
        id: service.id,
        serviceName: service.serviceName || "",
        price: service.price ?? "",
        currency: service.currency || "INR",
        durationDays:
          service.durationDays !== undefined
            ? service.durationDays
            : service.durationMonths !== undefined
              ? service.durationMonths
              : "",
        canBeBookedByPatient: service.canBeBookedByPatient !== false && (service.canBeBookedByPatient as any) !== "false" && (service.canBeBookedByPatient as any) !== 0 && (service.canBeBookedByPatient as any) !== "0",
      });

      setDirty(false);
    } else if (!isEdit) {
      reset({
        id: undefined,
        serviceName: "",
        price: "",
        currency: "INR",
        durationDays: "",
        canBeBookedByPatient: true,
      });

      setDirty(false);
    }
  }, [isEdit, service, reset, setDirty]);

  const handleBack = () => {
    navigate("/profile/services");
  };

 const onSubmit = async (values: ServiceForm) => {
  const durationDays = toNum(values.durationDays);
  const price = toNum(values.price);

  if (!values.serviceName?.trim()) {
    addToast({
      title: "Service name required",
      description: "Please enter service name.",
      color: "warning",
    });
    return;
  }

  const trimmedServiceName = values.serviceName.trim();
  const normalizedServiceName = trimmedServiceName.toLowerCase();

  const isDuplicateService = normalizedExistingServiceNames.some((service) => {
    if (isEdit && String(service.id) === String(values.id)) return false;
    return service.name === normalizedServiceName;
  });

  if (isDuplicateService) {
    addToast({
      title: "Duplicate service name",
      description: "This service name already exists. Please enter a different name.",
      color: "warning",
    });
    return;
  }

  if (
    !Number.isFinite(durationDays) ||
    durationDays < 1 ||
    durationDays > 365
  ) {
    addToast({
      title: "Invalid duration",
      description: "Duration must be between 1 and 365 days.",
      color: "warning",
    });
    return;
  }

  if (!Number.isFinite(price) || price < 0 || price > 9999) {
    addToast({
      title: "Invalid price",
      description: "Price must be 0 to 9999 (max 4 digits).",
      color: "warning",
    });
    return;
  }

  const oneService = {
    ...(isEdit ? { id: values.id } : {}),
    serviceName: trimmedServiceName,
    price,
    currency: values.currency || "INR",
    durationDays,
    canBeBookedByPatient: values.canBeBookedByPatient,
  };

  try {
    if (isEdit && values.id) {
      // Use the single-service update endpoint
      await updateService({
        serviceId: values.id,
        body: {
          serviceName: trimmedServiceName,
          price,
          currency: values.currency || "INR",
          durationDays,
          canBeBookedByPatient: values.canBeBookedByPatient,
        },
      }).unwrap();
    } else {
      // Use the bulk endpoint for creating new services
      const payload = { clinicService: [oneService] };
      await updateDoctor(payload as unknown as UpdateDoctorArg).unwrap();
    }

    addToast({
      title: isEdit ? "Service updated" : "Service added",
      description: "Your changes have been saved.",
      color: "success",
    });

    flushSync(() => {
      reset(
        {
          ...values,
          serviceName: trimmedServiceName,
          currency: values.currency || "INR",
          durationDays,
          price,
          canBeBookedByPatient: values.canBeBookedByPatient,
        },
        {
          keepDirty: false,
          keepTouched: false,
        }
      );

      setDirty(false);
    });

    navigate("/profile/services");
  } catch (error) {
    console.error("Update clinicService failed:", error);
    addToast({
      title: "Save failed",
      description: "Unable to save service. Please try again.",
      color: "danger",
    });
  }
};

  if (isEdit && isLoadingDoctor) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={handleBack}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-slate-100 dark:hover:bg-[#17233a]"
          aria-label="Go back"
        >
          <FiArrowLeft className="h-4 w-4 text-text-muted" />
        </button>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15 dark:text-[#9be7dc]">
          <FiActivity className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-tight text-text sm:text-[18px]">
            {isEdit ? "Edit Service" : "Add Service"}
          </h2>
          <p className="mt-0.5 text-[13px] leading-snug text-text-muted">
            {isEdit
              ? "Update the name, price and validity of this service."
              : "Add a service patients can book, with its price and validity."}
          </p>
        </div>
      </div>
      <div className="h-px w-full bg-slate-100 dark:bg-[#273244]" />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 px-4 py-4 sm:px-5"
      >
        <div className="rounded-2xl border border-slate-200 bg-surface p-4 dark:border-[#334158] dark:bg-[#0f1728] sm:p-5">
          <div className="grid grid-cols-1 items-start gap-4 sm:gap-x-6 sm:gap-y-5 md:grid-cols-2">
            <div className="md:col-span-2">
            <InputField
              control={control}
              name="serviceName"
              label="Service Name"
              isRequired
              autoFocus
              placeholder="e.g. General Consultation"
              maxLength={60}
              rules={{
                required: "Service name is required",
                validate: (v: any) =>
                  String(v ?? "").trim().length > 0 ||
                  "Service name is required",
              }}
              classNames={inputClassNames}
              variant="bordered"
            />
            </div>

            <div>
              <InputField
                control={control}
                name="price"
                label="Price"
                isRequired
                type="text"
                inputMode="numeric"
                placeholder="0"
                description="Between 0 and 9999"
                startContent={
                  <span className="text-sm text-text-muted">₹</span>
                }
                rules={{
                    pattern: {
                      value: /^\d{0,4}$/,
                      message: "Max 4 digits only",
                    },
                    validate: (v: any) => {
                      if (v === "" || v === undefined) return true;
                      const n = Number(v);
                      if (!Number.isFinite(n)) return "Enter valid price";
                      if (n < 0) return "Price must be 0 or more";
                      if (n > 9999) return "Max 4 digits (0-9999)";
                      return true;
                    },
                }}
                classNames={inputClassNames}
                variant="bordered"
              />
            </div>

            <div>
              <InputField
                control={control}
                name="durationDays"
                label={
                  <>
                    Duration{" "}
                    <span className="font-normal text-text-muted">(days)</span>
                  </>
                }
                isRequired
                type="text"
                inputMode="numeric"
                placeholder="30"
                description="How long the service stays valid (1–365)"
                endContent={
                  <span className="text-sm text-text-muted">days</span>
                }
                rules={{
                    validate: (v: any) => {
                      if (v === "" || v === undefined) return true;
                      const n = Number(v);
                      if (!Number.isFinite(n)) return "Enter valid duration";
                      if (n < 1) return "Minimum duration is 1 day";
                      if (n > 365) return "Maximum duration is 365 days";
                      return true;
                    },
                }}
                classNames={inputClassNames}
                variant="bordered"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 dark:border-[#334158] sm:px-4">
            <div className="mr-3">
              <div className="text-sm font-medium text-text">
                Patient booking
              </div>
              <div className="text-xs text-text-muted">
                Let patients pick this service when booking online.
              </div>
            </div>
            <CheckBox
              control={control}
              name="canBeBookedByPatient"
              label=""
              aria-label="Can be booked by patient"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse items-stretch gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <Button
            variant="bordered"
            onPress={handleBack}
            isDisabled={isSaving}
            className="w-full rounded-xl border-slate-200 px-6 text-slate-700 dark:border-[#334158] dark:text-white sm:w-auto sm:px-8"
          >
            Cancel Changes
          </Button>

          <Button
            type="submit"
            isLoading={isSaving}
            isDisabled={isSaving || !isDirty}
            className="w-full rounded-xl bg-primary px-8 font-semibold text-white shadow-sm disabled:bg-gray-200 disabled:text-gray-500 sm:w-auto sm:px-10"
          >
            {isSaving ? "Saving..." : isEdit ? "Save Changes" : "Add Service"}
          </Button>
        </div>
      </form>
    </>
  );
};

export default EditServicePage;
