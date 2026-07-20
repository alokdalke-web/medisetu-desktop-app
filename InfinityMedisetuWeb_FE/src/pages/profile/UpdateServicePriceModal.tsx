// src/pages/profile/UpdateServicePriceModal.tsx

import React, { useEffect } from "react";
import { addToast } from "@heroui/react";
import { useForm } from "react-hook-form";

import UpdateModal from "../../components/shared/Modals/UpdateModal";
import InputField from "../../components/shared/InputField";
import SelectField from "../../components/shared/SelectField";
import TextareaField from "../../components/shared/TextareaField";
import {
  useUpdateDoctorMutation,
  useDeleteServiceMutation,
} from "../../redux/api/doctorApi";

type ServiceForm = {
  id?: string;
  serviceName: string;
  price: number | string;
  currency: string;
  additionalServices?: string;

  // ✅ form field now days
  durationDays: number | string;

  // ✅ optional: if your existing "service" object still comes with durationMonths,
  // we can read it safely while editing.
  durationMonths?: number | string;
};

type Props = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service: ServiceForm | null;
  onSaved: () => void;
};

const toNum = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const UpdateServicePriceModal: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  service,
  onSaved,
}) => {
  const [updateDoctor, { isLoading: isSaving }] = useUpdateDoctorMutation();
  const [deleteService, { isLoading: isDeleting }] = useDeleteServiceMutation();

  type UpdateDoctorArg = Parameters<typeof updateDoctor>[0];

  const { control, handleSubmit, reset } = useForm<ServiceForm>({
    defaultValues: {
      id: undefined,
      serviceName: "",
      price: "" as any,
      currency: "INR",
      additionalServices: "",
      durationDays: "" as any, // ✅
    },
  });

  const isEdit = Boolean(service?.id);

  useEffect(() => {
    if (!isOpen) return;

    if (service) {
      reset({
        id: service.id,
        serviceName: service.serviceName || "",
        price: (service.price as any) ?? ("" as any),
        currency: service.currency || "INR",
        additionalServices: service.additionalServices || "",

        // ✅ prefer durationDays, fallback to old durationMonths (edit-safe)
        durationDays:
          service.durationDays !== undefined
            ? (service.durationDays as any)
            : service.durationMonths !== undefined
              ? (service.durationMonths as any)
              : ("" as any),
      });
    } else {
      reset({
        id: undefined,
        serviceName: "",
        price: "" as any,
        currency: "INR",
        additionalServices: "",
        durationDays: "" as any,
      });
    }
  }, [isOpen, service, reset]);

  const handleDelete = async () => {
    const serviceId = service?.id;

    if (!serviceId) {
      addToast({
        title: "Cannot delete",
        description: "Service id missing. Please refresh and try again.",
        color: "warning",
      });
      return;
    }

    try {
      await deleteService(serviceId).unwrap();

      addToast({
        title: "Service deleted",
        description: "Service removed successfully.",
        color: "success",
      });

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Delete service failed:", error);
      addToast({
        title: "Delete failed",
        description: "Unable to delete service. Please try again.",
        color: "danger",
      });
    }
  };

  const onSubmit = async (values: ServiceForm) => {
    const durationDays = toNum(values.durationDays); // ✅
    const price = toNum(values.price);

    if (!values.serviceName?.trim()) {
      addToast({
        title: "Service name required",
        description: "Please enter service name.",
        color: "warning",
      });
      return;
    }

    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      addToast({
        title: "Invalid duration",
        description: "Please enter duration in days greater than 0.",
        color: "warning",
      });
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      addToast({
        title: "Invalid price",
        description: "Please enter a valid price (0 or greater).",
        color: "warning",
      });
      return;
    }

    if (isEdit && !values.id) {
      addToast({
        title: "Cannot edit",
        description: "Service id missing. Please refresh and try again.",
        color: "warning",
      });
      return;
    }

    const oneService = {
      ...(isEdit ? { id: values.id } : {}),
      serviceName: values.serviceName.trim(),
      price,
      currency: values.currency || "INR",

      // ✅ THIS is the main change: send durationDays in payload
      durationDays,

      ...(values.additionalServices?.trim()
        ? { additionalServices: values.additionalServices.trim() }
        : {}),
    };

    const payload = { clinicService: [oneService] };

    try {
      await updateDoctor(payload as unknown as UpdateDoctorArg).unwrap();

      addToast({
        title: isEdit ? "Service updated" : "Service added",
        description: "Your changes have been saved.",
        color: "success",
      });

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Update clinicService failed:", error);
      addToast({
        title: "Save failed",
        description: "Unable to save service. Please try again.",
        color: "danger",
      });
    }
  };

  return (
    <UpdateModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Services & Price" : "Add Services & Price"}
      onSubmit={handleSubmit(onSubmit)}
      isLoading={isSaving || isDeleting}
      body={
        <div className="space-y-5">
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 ">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Service details
              </h3>
              <span className="text-[11px] text-gray-400">
                Give a clear, patient-friendly name
              </span>
            </div>

            <InputField
              control={control}
              name="serviceName"
              label="Service Name"
              placeholder="e.g. Heart Checkup Package"
              disabled={isEdit}
            />
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="grid gap-3 md:grid-cols-3 items-end">
              <div className="md:col-span-1">
                <InputField
                  control={control}
                  name="price"
                  label="Price"
                  type="number"
                  placeholder="e.g. 2500"
                />
              </div>

              <div className="md:col-span-1">
                <SelectField
                  control={control}
                  name="currency"
                  label="Currency"
                  options={[
                    { label: "INR", value: "INR" },
                  ]}
                  className="w-full"
                />
              </div>

              <div className="md:col-span-1">
                <InputField
                  control={control}
                  name="durationDays"          // ✅ changed
                  label="Duration (days)"      // ✅ matches actual meaning now
                  type="number"
                  placeholder="e.g. 20"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Additional services (optional)
              </h3>
              <span className="text-[11px] text-gray-400">
                e.g. ECG, Lipid Profile, BP monitoring
              </span>
            </div>

            <TextareaField
              control={control}
              name="additionalServices"
              label="Additional Services"
              placeholder="Describe tests / add-ons included in this package"
            />
          </div>

          {isEdit ? (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete Service"}
              </button>
            </div>
          ) : null}
        </div>
      }
    />
  );
};

export default UpdateServicePriceModal;
