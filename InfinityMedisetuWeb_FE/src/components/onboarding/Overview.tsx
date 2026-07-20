import {
  Button,
  addToast
} from "@heroui/react";
import React, { useEffect, useState } from "react";
import {
  useForm,
  useFieldArray
} from "react-hook-form";
import { DOCTOR_SPECIALITIES } from "../../constants/specialities";
import { useGetUserQuery } from "../../redux/api/authApi";
import {
  useGetAllClinicsQuery,
  useUpdateClinicMutation,
} from "../../redux/api/clinicApi";
import { useUpdateDoctorMutation } from "../../redux/api/doctorApi";
import { OnboardingInput } from "./OnboardingInput";
import { OnboardingSelect } from "./OnboardingSelect";
import { OnboardingStepSkeleton } from "./OnboardingStepSkeleton";
import { 
  FiPhone, 
  FiUser, 
  FiFileText, 
  FiActivity, 
  FiArrowLeft, 
  FiArrowRight,
  FiPlus,
  FiX,
  FiCreditCard
} from "react-icons/fi";

type OverviewProps = {
  onNext: () => void;
  onBack?: () => void;
  onComplete?: () => void;
  onTypeChange?: (isDoctor: boolean) => void;
  onProfileDataChange?: (data: any) => void;
};

type ProfileFormValues = {
  name: string;
  mobile: string;
  alternateMobile: string;
  isDoctor: string; // "yes" | "no"
  speciality: string;
  registrationNumber: string;
  upiIds: { value: string }[];
};

type ClinicProfileWithExtras = {
  id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  alternateMobile?: string;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  userType?: string;
  speciality?: string;
  isAdminDoctorAccess?: boolean;
  registrationNumber?: string;
  upiIds?: string[];
};

const Overview: React.FC<OverviewProps> = ({
  onNext,
  onBack,
  onComplete,
  onTypeChange,
  onProfileDataChange,
}) => {
  const {
    data: clinics,
    isLoading: isClinicsLoading,
  } = useGetAllClinicsQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const { data: user } = useGetUserQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });

  const [updateClinic, { isLoading: isClinicUpdating }] =
    useUpdateClinicMutation();
  const [updateDoctor, { isLoading: isDoctorUpdating }] =
    useUpdateDoctorMutation();

  const clinic = clinics?.clinic;
  const clinicProfile = clinics?.profile as ClinicProfileWithExtras | undefined;

  const isAdmin = user?.userType === "Admin";
  const isDoctorUser = user?.userType === "Doctor";

  const {
    control,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    clearErrors,
    formState: { isSubmitting },
  } = useForm<ProfileFormValues>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      mobile: "",
      alternateMobile: "",
      isDoctor: "yes",
      speciality: "",
      registrationNumber: "",
      upiIds: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "upiIds",
  });

  const [newUpiId, setNewUpiId] = useState("");
  const [upiError, setUpiError] = useState<string>("");

  const isDoctorChoice = watch("isDoctor");
  const isDoctor = isAdmin || isDoctorUser || isDoctorChoice === "yes";

  const validateUpiId = (value: string): boolean => {
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/;
    return upiRegex.test(value);
  };

  const handleAddUpiId = () => {
    const trimmedId = newUpiId.trim();
    
    if (!trimmedId) {
      setUpiError("Please enter a UPI ID");
      return;
    }

    if (!validateUpiId(trimmedId)) {
      setUpiError("Invalid UPI ID format. Example: username@paytm");
      return;
    }

    const currentUpiIds = getValues("upiIds").map(item => item.value);
    if (currentUpiIds.includes(trimmedId)) {
      setUpiError("This UPI ID already exists");
      return;
    }

    append({ value: trimmedId });
    setNewUpiId("");
    setUpiError("");
  };

  const handleUpiKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddUpiId();
    }
  };

  const handleRemoveUpiId = (index: number) => {
    remove(index);
  };

  useEffect(() => {
    onTypeChange?.(isDoctor);
  }, [isDoctor, onTypeChange]);

  useEffect(() => {
    if (user) {
      const existingUpiIds = clinicProfile?.upiIds || [];
      reset({
        name: clinicProfile?.name || user?.name || "",
        mobile: clinicProfile?.mobile || user?.mobile || "",
        alternateMobile: clinicProfile?.alternateMobile || "",
        isDoctor: "yes",
        speciality: clinicProfile?.speciality || "",
        registrationNumber: clinicProfile?.registrationNumber || "",
        upiIds: existingUpiIds.map((id: string) => ({ value: id })),
      });
    }
  }, [user, clinicProfile, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const upiIdsArray = data.upiIds.map(item => item.value);

      if (isAdmin) {
        const cleanData: any = {
          name: data.name,
          mobile: data.mobile,
          alternateMobile: data.alternateMobile || undefined,
          isAdminDoctorAccess: true,
        };

        if (data.speciality) cleanData.speciality = data.speciality;
        if (data.registrationNumber) cleanData.registrationNumber = data.registrationNumber;
        if (upiIdsArray.length > 0) cleanData.upiIds = upiIdsArray; // NEW: Add upiIds if present

        if (clinic?.id) {
          await updateClinic({
            clinicId: clinic.id,
            body: { adminProfile: cleanData },
          }).unwrap();
        } else {
          if (onProfileDataChange) onProfileDataChange(cleanData);
        }
        onComplete?.();
      } else {
        const cleanData: any = {
          name: data.name,
          mobile: data.mobile,
          alternateMobile: data.alternateMobile || undefined,
          speciality: data.speciality,
          registrationNumber: data.registrationNumber || undefined,
        };

        if (upiIdsArray.length > 0) cleanData.upiIds = upiIdsArray; // NEW: Add upiIds if present

        await updateDoctor({ doctorProfile: cleanData }).unwrap();
        onComplete?.();
      }

      onNext();
    } catch (error: any) {
      console.error("Profile update failed:", error);
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to update profile",
        color: "danger",
      });
    }
  };

  const isUpdating = isClinicUpdating || isDoctorUpdating || isSubmitting;

  if (isClinicsLoading) {
    return <OnboardingStepSkeleton variant="profile" />;
  }

  return (
    <div className="h-full w-full font-outfit">
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6 pt-4 hide-scrollbar sm:px-6 sm:pb-7 sm:pt-5">
          <div className="flex flex-col gap-5 sm:gap-6">
        {/* Personal Information - 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <OnboardingInput
            name="name"
            control={control}
            label="Full Name"
            placeholder="Enter your full name"
            isRequired
            rules={{ required: "Full name is required" }}
            icon={<FiUser className="w-[18px] h-[18px]" />}
          />
          <OnboardingInput
            name="mobile"
            control={control}
            label="Personal Contact Number"
            placeholder="10-digit mobile number"
            isRequired
            type="tel"
            maxLength={10}
            inputMode="numeric"
            parse={(val) => val.replace(/[^0-9]/g, "").slice(0, 10)}
            rules={{
              required: "Mobile number is required",
              minLength: { value: 10, message: "Mobile number must be 10 digits" },
              maxLength: { value: 10, message: "Mobile number must be 10 digits" },
              pattern: {
                value: /^[6-9]\d{9}$/,
                message: "Enter a valid 10-digit mobile number starting with 6-9",
              },
            }}
            icon={<FiPhone className="w-[18px] h-[18px]" />}
          />
          <OnboardingInput
            name="alternateMobile"
            control={control}
            label="Alternate Number"
            placeholder="Optional alternate number"
            type="tel"
            maxLength={10}
            inputMode="numeric"
            parse={(val) => val.replace(/[^0-9]/g, "").slice(0, 10)}
            rules={{
              minLength: { value: 10, message: "Must be 10 digits if provided" },
              maxLength: { value: 10, message: "Must be 10 digits" },
              pattern: {
                value: /^[6-9]\d{9}$/,
                message: "Enter a valid 10-digit mobile number starting with 6-9",
              },
            }}
            icon={<FiPhone className="w-[18px] h-[18px]" />}
          />
        </div>

        {isDoctor && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <OnboardingInput
                name="registrationNumber"
                control={control}
                label="Registration Number"
                placeholder="e.g. MH-12345"
                isRequired
                rules={{ required: "Registration number is required" }}
                icon={<FiFileText className="w-[18px] h-[18px]" />}
              />
              
              <OnboardingSelect
                name="speciality"
                control={control}
                label="Speciality"
                placeholder="Select your speciality"
                isRequired
                rules={{ required: "Speciality is required for doctors" }}
                icon={<FiActivity className="w-[18px] h-[18px]" />}
                onChange={(value) => {
                  setValue("speciality", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });

                  if (value) clearErrors("speciality");
                }}
                options={[...DOCTOR_SPECIALITIES]
                  .sort((a, b) => a.localeCompare(b))
                  .map((spec) => ({ value: spec, label: spec }))}
              />

              <div className="flex flex-col gap-1.5">
                <label className=" text-xs sm:text-base font-medium text-slate-700 dark:text-white flex items-center gap-1">
                  {/* <FiCreditCard className="w-[18px] h-[18px]" /> */}
                 
                  UPI IDs <span className="text-xs text-gray-400">(Optional)</span> 
                </label>
                
                <div className="flex flex-col gap-2">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newUpiId}
                        onChange={(e) => {
                          setNewUpiId(e.target.value);
                          if (upiError) setUpiError("");
                        }}
                        onKeyPress={handleUpiKeyPress}
                        placeholder="doctor@paytm"
                        className={`w-full h-11 sm:h-12 rounded-lg border ${
                          upiError ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                        } bg-white dark:bg-slate-800 px-4 text-[13px] sm:text-[14px] text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200`}
                      />
                      {upiError && (
                        <p className="text-xs text-red-500 mt-1">{upiError}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      radius="lg"
                      className="h-11 sm:h-12 px-4 sm:px-6 bg-primary hover:bg-primary-hover text-white font-semibold flex items-center gap-2 shrink-0"
                      onPress={handleAddUpiId}
                    >
                      <FiPlus className="w-4 h-4" />
                      Add
                    </Button>
                  </div>

                  {fields.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1.5 text-sm border border-primary/20"
                        >
                          <FiCreditCard className="w-4 h-4" />
                          <span className="font-medium">{field.value}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveUpiId(index)}
                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                          >
                            <FiX className="w-4 h-4 text-primary" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add your UPI IDs for receiving payments
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Info Box */}
        <div className="flex items-start gap-3 rounded-xl bg-[#F0FAF9] dark:bg-slate-800/50 border border-[#D4EAEA] dark:border-slate-700 px-4 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FiPhone className="w-[18px] h-[18px] text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-[12px] sm:text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Why do we need your mobile number?
            </p>
            <p className="text-[11px] sm:text-[12px] text-slate-600 dark:text-white leading-relaxed">
              We'll use it to send appointment notifications and important updates. Make sure it's a number you check regularly.
            </p>
          </div>
        </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 bg-white px-5 py-2.5 shadow-[0_-10px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900 sm:px-6 sm:py-3">
          {onBack ? (
            <Button
              type="button"
              variant="light"
              radius="lg"
              className="h-10 sm:h-11 px-5 sm:px-6 text-[13px] sm:text-[14px] font-semibold text-slate-600 dark:text-white flex items-center gap-2"
              onPress={onBack}
            >
              <FiArrowLeft className="w-4 h-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="submit"
            radius="lg"
            className="h-10 sm:h-11 px-6 sm:px-8 text-[13px] sm:text-[14px] font-semibold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center gap-2"
            isLoading={isUpdating}
            endContent={!isUpdating && <FiArrowRight className="w-4 h-4" />}
          >
            Save & Continue
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Overview;
