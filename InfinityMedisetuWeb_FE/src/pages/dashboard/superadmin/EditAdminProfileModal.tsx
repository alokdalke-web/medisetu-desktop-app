// // src/pages/dashboard/superadmin/EditAdminProfileModal.tsx
import { addToast } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import InputField from "../../../components/shared/InputField";
import UpdateModal from "../../../components/shared/Modals/UpdateModal";
import { useUpdateClinicMutation } from "../../../redux/api/clinicApi";
import {
  updateClinicRequestSchema,
  type UpdateClinicRequestDto,
} from "../../../schemas/clinic";

interface EditAdminProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  initialData: {
    name: string;
    // ✅ allow what your API/UI may be passing (null/number/etc.)
    mobile: string | number | null | undefined;
    alternateMobile?: string | number | null | undefined;
  };
}

const toStr = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const toOptStr = (v: unknown) =>
  v === null || v === undefined || v === "" ? undefined : String(v);

const EditAdminProfileModal: React.FC<EditAdminProfileModalProps> = ({
  isOpen,
  onOpenChange,
  clinicId,
  initialData,
}) => {
  const [updateClinic, { isLoading }] = useUpdateClinicMutation();

  const { control, handleSubmit, reset } = useForm<UpdateClinicRequestDto>({
    resolver: zodResolver(updateClinicRequestSchema),
    defaultValues: {
      adminProfile: {
        name: initialData.name,
        mobile: toStr(initialData.mobile),
        alternateMobile: toOptStr(initialData.alternateMobile),
      },
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        adminProfile: {
          name: initialData.name,
          mobile: toStr(initialData.mobile),
          alternateMobile: toOptStr(initialData.alternateMobile),
        },
      });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: UpdateClinicRequestDto) => {
    try {
      const res = await updateClinic({ clinicId, body: data }).unwrap();
      if (res.success) {
        addToast({
          title: "Success",
          description: "Admin profile updated successfully",
          color: "success",
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to update admin profile",
        color: "danger",
      });
    }
  };

  return (
    <UpdateModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Edit Admin Profile"
      isLoading={isLoading}
      onSubmit={handleSubmit(onSubmit)}
      body={
        <div className="space-y-6">
          {/* Personal Information */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold border border-primary/20">
                1
              </div>
              <h2 className="text-xs md:text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Personal Information
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                control={control}
                name="adminProfile.name"
                label="Full Name"
                placeholder="Enter full name"
              />
            </div>
          </section>

          {/* Contact Details */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold border border-primary/20">
                2
              </div>
              <h2 className="text-xs md:text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Contact Details
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                control={control}
                name="adminProfile.mobile"
                label="Mobile Number"
                placeholder="Enter mobile number"
              />
              <InputField
                control={control}
                name="adminProfile.alternateMobile"
                label="Alternate Mobile"
                placeholder="Enter alternate mobile"
                isOptional
              />
            </div>
          </section>
        </div>
      }
    />
  );
};

export default EditAdminProfileModal;
