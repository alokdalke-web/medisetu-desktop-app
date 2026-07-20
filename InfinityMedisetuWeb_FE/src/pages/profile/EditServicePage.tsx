import { addToast, Button, Spinner } from "@heroui/react";
import React, { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FiActivity } from "react-icons/fi";
import { flushSync } from "react-dom";
import { useNavigate, useParams } from "react-router";

import InputField from "../../components/shared/InputField";
import CheckBox from "../../components/shared/CheckBox";

import {
  useGetDoctorQuery,
  useUpdateDoctorMutation,
  useUpdateServiceMutation,
} from "../../redux/api/doctorApi";

import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

type ServiceForm = {
  id?: string;
  serviceName: string;
  price: number | string;
  currency: string;
  durationDays: number | string;
  canBeBookedByPatient: boolean;
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
    <div className="mx-auto p-6 font-['Outfit']">
      <div className="grid grid-cols-1">
        <div className="bg-white p-0">
          <div className="flex items-center justify-between border-b border-[#ECECEC] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center text-[#0A6C74]">
                <FiActivity size={24} />
              </div>
              <h2 className="text-[20px] font-bold text-[#100E1C] leading-[1.26]">
                Services & Pricing
              </h2>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-6 p-6"
          >
            <div className="flex flex-col gap-4">
              <InputField
                control={control}
                name="serviceName"
                label="Service Name"
                placeholder="Enter service name"
                disabled={false}
                classNames={{
                  label: "text-[#100E1C] font-semibold text-base",
                  inputWrapper:
                    "bg-white border-[#ECECEC] hover:border-[#0A6C74] focus-within:border-[#0A6C74] h-[56px]",
                  input: "text-[#100E1C] text-base placeholder:text-[#94A3B8]",
                }}
                variant="bordered"
              />
              <div className="flex items-center pl-1">
                <CheckBox
                  control={control}
                  name="canBeBookedByPatient"
                  label="Can be booked by patient"
                  classNames={{
                    label: "text-[#100E1C] font-medium text-base select-none cursor-pointer",
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row sm:gap-4">
              <div className="flex-1">
                <InputField
                  control={control}
                  name="price"
                  label="Price"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter price"
                  endContent={
                    <span className="text-[#100E1C] font-normal text-base mr-2">
                      ₹
                    </span>
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
                  classNames={{
                    label: "text-[#100E1C] font-semibold text-base",
                    inputWrapper:
                      "bg-white border-[#ECECEC] hover:border-[#0A6C74] focus-within:border-[#0A6C74] h-[56px]",
                    input:
                      "text-[#100E1C] text-base placeholder:text-[#94A3B8]",
                  }}
                  variant="bordered"
                />
              </div>

              <div className="flex-1">
                <InputField
                  control={control}
                  name="durationDays"
                  label={
                    <div className="flex items-center gap-1">
                      <span>Duration</span>
                      <span className="text-[#94A3B8] font-normal text-sm">
                        (days)
                      </span>
                    </div>
                  }
                  type="text"
                  inputMode="numeric"
                  placeholder="1 to 365"
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
                  classNames={{
                    label: "text-[#100E1C] font-semibold text-base",
                    inputWrapper:
                      "bg-white border-[#ECECEC] hover:border-[#0A6C74] focus-within:border-[#0A6C74] h-[56px]",
                    input:
                      "text-[#100E1C] text-base placeholder:text-[#94A3B8]",
                  }}
                  variant="bordered"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-5 sm:flex-row sm:justify-end mt-2">
              <Button
                variant="bordered"
                onPress={handleBack}
                isDisabled={isSaving}
                className="border-[#0A6C74] text-[#0A6C74] font-semibold text-base px-6 h-[48px] rounded-[48px]"
              >
                Cancel Changes
              </Button>

              <Button
                type="submit"
                isLoading={isSaving}
                className="bg-[#0A6C74] text-white font-semibold text-base px-6 h-[48px] rounded-[48px]"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditServicePage;
