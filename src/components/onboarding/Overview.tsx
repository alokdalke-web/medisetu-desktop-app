import { Button, addToast } from "@heroui/react";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { DOCTOR_SPECIALITIES } from "../../constants/specialities";
import { useGetUserQuery } from "../../redux/api/authApi";
import {
  useGetAllClinicsQuery,
  useUpdateClinicMutation,
} from "../../redux/api/clinicApi";
import {
  useGetDoctorQuery,
  useUpdateDoctorMutation,
} from "../../redux/api/doctorApi";
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
} from "react-icons/fi";

type OverviewProps = {
  onNext: () => void | Promise<void>;
  onBack?: () => void;
  onComplete?: () => void | Promise<void>;
  onTypeChange?: (isDoctor: boolean) => void;
  onProfileDataChange?: (data: any) => void;
  submitLabel?: string;
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

const FULL_NAME_MAX_LENGTH = 50;

const parseFullNameInput = (value: string) =>
  value.slice(0, FULL_NAME_MAX_LENGTH);

const Overview: React.FC<OverviewProps> = ({
  onNext,
  onBack,
  onComplete,
  onTypeChange,
  onProfileDataChange,
  submitLabel = "Save & Continue",
}) => {
  const { data: user } = useGetUserQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });

  const isAdmin = user?.userType === "Admin";
  const isDoctorUser = user?.userType === "Doctor";
  const { data: clinics, isLoading: isClinicsLoading } = useGetAllClinicsQuery(
    undefined,
    {
      skip: !isAdmin,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
    },
  );

  const [updateClinic, { isLoading: isClinicUpdating }] =
    useUpdateClinicMutation();
  const [updateDoctor, { isLoading: isDoctorUpdating }] =
    useUpdateDoctorMutation();
  const { data: doctorData, isLoading: isDoctorLoading } = useGetDoctorQuery(
    undefined,
    {
      skip: !isDoctorUser,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
    },
  );

  const clinic = clinics?.clinic;
  const clinicProfile = clinics?.profile as ClinicProfileWithExtras | undefined;
  const doctorProfile = doctorData?.result?.doctorProfile as
    | (ClinicProfileWithExtras & { licenseNumber?: string | null })
    | undefined;

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

  const isDoctorChoice = watch("isDoctor");
  const isDoctor = isAdmin || isDoctorUser || isDoctorChoice === "yes";

  useEffect(() => {
    onTypeChange?.(isDoctor);
  }, [isDoctor, onTypeChange]);

  useEffect(() => {
    if (user) {
      const existingUpiIds =
        clinicProfile?.upiIds || doctorProfile?.upiIds || [];
      reset({
        name: parseFullNameInput(
          clinicProfile?.name || doctorProfile?.name || user?.name || "",
        ),
        mobile: clinicProfile?.mobile || doctorProfile?.mobile || user?.mobile || "",
        alternateMobile:
          clinicProfile?.alternateMobile ||
          doctorProfile?.alternateMobile ||
          user?.alternateMobile ||
          "",
        isDoctor: "yes",
        speciality:
          clinicProfile?.speciality ||
          doctorProfile?.speciality ||
          user?.speciality ||
          "",
        registrationNumber:
          clinicProfile?.registrationNumber ||
          doctorProfile?.registrationNumber ||
          doctorProfile?.licenseNumber ||
          user?.registrationNumber ||
          user?.licenseNumber ||
          "",
        upiIds: existingUpiIds.map((id: string) => ({ value: id })),
      });
    }
  }, [user, clinicProfile, doctorProfile, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const name = data.name.trim();
      const registrationNumber = data.registrationNumber.trim();
      const upiIdsArray = data.upiIds.map((item) => item.value);

      if (!name || name.length > FULL_NAME_MAX_LENGTH) {
        addToast({
          title: "Invalid full name",
          description: `Full name must be 1 to ${FULL_NAME_MAX_LENGTH} characters.`,
          color: "warning",
        });
        return;
      }

      if (isAdmin) {
        const cleanData: any = {
          name,
          mobile: data.mobile,
          alternateMobile: data.alternateMobile || undefined,
          isAdminDoctorAccess: true,
        };

        if (data.speciality) cleanData.speciality = data.speciality;
        if (registrationNumber) {
          cleanData.registrationNumber = registrationNumber;
          cleanData.licenseNumber = registrationNumber;
        }
        if (upiIdsArray.length > 0) cleanData.upiIds = upiIdsArray; // NEW: Add upiIds if present

        if (clinic?.id) {
          await updateClinic({
            clinicId: clinic.id,
            body: { adminProfile: cleanData },
          }).unwrap();
        } else {
          if (onProfileDataChange) onProfileDataChange(cleanData);
        }
        await onComplete?.();
      } else {
        const cleanData: any = {
          name,
          mobile: data.mobile,
          alternateMobile: data.alternateMobile || undefined,
          speciality: data.speciality,
          registrationNumber: registrationNumber || undefined,
          licenseNumber: registrationNumber || undefined,
        };

        if (upiIdsArray.length > 0) cleanData.upiIds = upiIdsArray; // NEW: Add upiIds if present

        await updateDoctor({ doctorProfile: cleanData }).unwrap();
        await onComplete?.();
      }

      await onNext();
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
  const isSaveMode = submitLabel.trim().toLowerCase() === "save";

  if ((isAdmin && isClinicsLoading) || (isDoctorUser && isDoctorLoading)) {
    return <OnboardingStepSkeleton variant="profile" />;
  }

  return (
    <div className="w-full font-outfit">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col"
      >
        <div className="px-4 pb-5 pt-3 sm:px-5 sm:pb-6 sm:pt-4 lg:px-6">
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Personal Information - 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <OnboardingInput
                name="name"
                control={control}
                label="Full Name"
                placeholder="Enter your full name"
                maxLength={FULL_NAME_MAX_LENGTH}
                parse={parseFullNameInput}
                isRequired
                rules={{
                  required: "Full name is required",
                  validate: (value: any) => {
                    const name = String(value || "").trim();
                    if (!name) return "Full name is required";
                    if (name.length > FULL_NAME_MAX_LENGTH) {
                      return `Full name must be ${FULL_NAME_MAX_LENGTH} characters or less`;
                    }
                    return true;
                  },
                }}
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
                parse={(val: any) => val.replace(/[^0-9]/g, "").slice(0, 10)}
                rules={{
                  required: "Mobile number is required",
                  minLength: {
                    value: 10,
                    message: "Mobile number must be 10 digits",
                  },
                  maxLength: {
                    value: 10,
                    message: "Mobile number must be 10 digits",
                  },
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: "Enter a valid 10-digit mobile number ",
                  },
                }}
                icon={<FiPhone className="w-[18px] h-[18px]" />}
              />
              <OnboardingInput
                name="alternateMobile"
                control={control}
                label="Alternate Number (Optional)"
                placeholder="Enter alternate number"
                type="tel"
                maxLength={10}
                inputMode="numeric"
                parse={(val: any) => val.replace(/[^0-9]/g, "").slice(0, 10)}
                rules={{
                  minLength: {
                    value: 10,
                    message: "Must be 10 digits if provided",
                  },
                  maxLength: { value: 10, message: "Must be 10 digits" },
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: "Enter a valid 10-digit mobile number ",
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

                  {/* UPI IDs optional field temporarily hidden.
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1 text-[13px] font-semibold text-slate-700 dark:text-white sm:text-[14px]">
                      UPI IDs{" "}
                      <span className="text-[12px] font-medium text-gray-400">
                        (Optional)
                      </span>
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
                            className={`w-full h-11 rounded-lg border ${
                              upiError
                                ? "border-red-500"
                                : "border-slate-200 dark:border-slate-700"
                            } bg-white px-3 text-[13px] font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-primary-hover dark:focus:ring-primary-hover/30 dark:shadow-sm sm:px-4`}
                          />
                          {upiError && (
                            <p className="text-xs text-red-500 mt-1">
                              {upiError}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          radius="lg"
                          className="h-11 shrink-0 px-4 font-semibold text-white bg-primary hover:bg-primary-hover sm:px-6"
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
                  */}
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
                  We'll use it to send appointment notifications and important
                  updates. Make sure it's a number you check regularly.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className={`mt-4 flex items-center ${isSaveMode || !onBack ? "justify-end" : "justify-between"} gap-4 border-t border-slate-100 bg-white pt-4 dark:border-slate-700 dark:bg-slate-900`}>
          {onBack && !isSaveMode ? (
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
          ) : null}

          <Button
            type="submit"
            radius="lg"
            className="h-10 sm:h-11 px-6 sm:px-8 text-[13px] sm:text-[14px] font-semibold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center gap-2"
            isLoading={isUpdating}
            endContent={!isUpdating && <FiArrowRight className="w-4 h-4" />}
          >
            {submitLabel}
          </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Overview;
