import { addToast, Button } from "@heroui/react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  useCreateClinicMutation,
  useGetAllClinicsQuery,
  useUpdateClinicMutation,
} from "../../redux/api/clinicApi";

import FigmaFileUpload from "../shared/FigmaFileUpload";
import { OnboardingInput } from "./OnboardingInput";
import { OnboardingCitySelect } from "./OnboardingCitySelect";
import InteractiveMap from "../shared/InteractiveMap";
import { OnboardingStepSkeleton } from "./OnboardingStepSkeleton";

type ClinicDetailsProps = {
  onNext?: () => void;
  onBack?: () => void;
  adminProfileData?: any;
  onFormChange?: (data: {
    clinicName?: string;
    clinicPhone?: string;
    tagline?: string;
    clinicAddress?: string;
    city?: string;
    logoPreviewUrl?: string;
  }) => void;
};

type ClinicFormValues = {
  clinicName: string;
  clinicPhone: string;
  tagline: string;
  zipCode: string;
  clinicAddress: string;
  city: string;
  state: string;
  country: string;
  clinicLogo: string;
  latitude: string;
  longitude: string;
};

const ClinicDetails: React.FC<ClinicDetailsProps> = ({
  onNext,
  onBack,
  adminProfileData,
  onFormChange,
}) => {
  const { data: clinics, isLoading: isClinicsLoading } = useGetAllClinicsQuery();
  const [updateClinic, { isLoading: isUpdating }] = useUpdateClinicMutation();
  const [createClinic, { isLoading: isCreating }] = useCreateClinicMutation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const clinic = clinics?.clinic;
  const isSubmitting = isUpdating || isCreating;
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const { control, handleSubmit, reset, setValue, watch } =
    useForm<ClinicFormValues>({
      defaultValues: {
        clinicName: "",
        clinicPhone: "",
        tagline: "",
        zipCode: "",
        clinicAddress: "",
        city: "",
        state: "",
        country: "India",
        clinicLogo: "",
        latitude: "",
        longitude: "",
      },
    });

  /* ── handlers — unchanged ────────────────────────────────────────────── */
  const handleCityStateChange = (city: string, state: string, shouldValidate = true) => {
    setValue("city", city, { shouldValidate, shouldDirty: true });
    setValue("state", state, { shouldValidate, shouldDirty: true });

    if (!city || !state) {
      setValue("zipCode", "", { shouldValidate: false, shouldDirty: true });
      return;
    }

    void (async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&country=India&email=contact@medisetu.com`;
        const res = await fetch(url, {
          headers: {
            "Accept-Language": "en-IN,en;q=0.9",
            "User-Agent": "MediSetu-Clinic-Setup",
          },
        });
        const data = await res.json();
        const addr = data?.[0]?.address;
        const zip = addr?.postcode || "";
        if (zip) setValue("zipCode", String(zip), { shouldValidate: true, shouldDirty: true });
      } catch (e) {
        console.error("Failed to auto-detect pincode from city/state:", e);
      }
    })();
  };

  const handleLocationChange = (
    location: { lat: number; lng: number },
    addressDetails: { address: string; city: string; state: string; pincode: string }
  ) => {
    setValue("latitude", String(location.lat), { shouldDirty: true });
    setValue("longitude", String(location.lng), { shouldDirty: true });
    if (addressDetails.address) setValue("clinicAddress", addressDetails.address, { shouldValidate: true, shouldDirty: true });
    if (addressDetails.city) setValue("city", addressDetails.city, { shouldValidate: true, shouldDirty: true });
    if (addressDetails.state) setValue("state", addressDetails.state, { shouldValidate: true, shouldDirty: true });
    if (addressDetails.pincode) setValue("zipCode", addressDetails.pincode, { shouldValidate: true, shouldDirty: true });
  };

  const clinicLogoValue = watch("clinicLogo");
  const watchedName = watch("clinicName");
  const watchedPhone = watch("clinicPhone");
  const watchedTagline = watch("tagline");
  const watchedAddress = watch("clinicAddress");
  const watchedCity = watch("city");

  useEffect(() => {
    onFormChange?.({
      clinicName: watchedName,
      clinicPhone: watchedPhone,
      tagline: watchedTagline,
      clinicAddress: watchedAddress,
      city: watchedCity,
      logoPreviewUrl: previewUrl || undefined,
    });
  }, [watchedName, watchedPhone, watchedTagline, watchedAddress, watchedCity, previewUrl, onFormChange]);

  useEffect(() => {
    if (clinic) {
      reset({
        clinicName: clinic.clinicName || "",
        clinicPhone: clinic.clinicPhone || "",
        tagline: clinic.Tagline || "",
        zipCode: clinic.ZipCode ? String(clinic.ZipCode) : "",
        clinicAddress: clinic.clinicAddress || "",
        city: clinic.City || "",
        state: clinic.State || "",
        country: clinic.Country || "India",
        clinicLogo: clinic.clinicLogo || "",
        latitude: clinic.latitude ? String(clinic.latitude) : "",
        longitude: clinic.longitude ? String(clinic.longitude) : "",
      });
      if (clinic.clinicLogo) setPreviewUrl(clinic.clinicLogo);
    }
  }, [clinic, reset]);

  useEffect(() => {
    if (clinicLogoValue && !selectedFile) setPreviewUrl(clinicLogoValue);
  }, [clinicLogoValue, selectedFile]);

  const handleFileUpload = async (file: File): Promise<string | null> => {
    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    return localUrl;
  };

  const onSubmit = async (data: ClinicFormValues) => {
    try {
      if (clinic?.id) {
        const payload: any = {
          clinicDetails: {
            clinicName: data.clinicName,
            clinicPhone: data.clinicPhone,
            Tagline: data.tagline || "",
            ZipCode: Number(data.zipCode),
            clinicAddress: data.clinicAddress,
            City: data.city,
            State: data.state,
            Country: data.country || "India",
            ...(data.latitude && { latitude: data.latitude }),
            ...(data.longitude && { longitude: data.longitude }),
          },
        };

        if (selectedFile) {
          const formData = new FormData();
          Object.keys(payload.clinicDetails).forEach((key) => {
            formData.append(`clinicDetails[${key}]`, String(payload.clinicDetails[key]));
          });
          formData.append("clinicLogo", selectedFile);
          await updateClinic({ clinicId: clinic.id, body: formData }).unwrap();
        } else {
          if (data.clinicLogo) payload.clinicDetails.clinicLogo = data.clinicLogo;
          await updateClinic({ clinicId: clinic.id, body: payload }).unwrap();
        }
      } else {
        const formData = new FormData();
        formData.append("clinicDetails[clinicName]", data.clinicName);
        formData.append("clinicDetails[clinicPhone]", data.clinicPhone);
        formData.append("clinicDetails[Tagline]", data.tagline || "");
        formData.append("clinicDetails[ZipCode]", data.zipCode);
        formData.append("clinicDetails[clinicAddress]", data.clinicAddress);
        formData.append("clinicDetails[City]", data.city);
        formData.append("clinicDetails[State]", data.state);
        formData.append("clinicDetails[Country]", data.country || "India");
        if (data.latitude) formData.append("clinicDetails[latitude]", data.latitude);
        if (data.longitude) formData.append("clinicDetails[longitude]", data.longitude);

        if (adminProfileData) {
          formData.append("adminProfile[name]", adminProfileData.name || "");
          formData.append("adminProfile[email]", adminProfileData.email || "");
          formData.append("adminProfile[mobile]", adminProfileData.mobile || "");
          formData.append("adminProfile[qualification]", adminProfileData.qualification || "");
          formData.append("adminProfile[licenseNumber]", adminProfileData.licenseNumber || "");
          formData.append("adminProfile[speciality]", adminProfileData.speciality || "");
          formData.append("adminProfile[yearsOfExperience]", adminProfileData.yearsOfExperience || "0");
          formData.append("adminProfile[isAdminDoctorAccess]", adminProfileData.isAdminDoctorAccess ? "true" : "false");
        }

        if (selectedFile) formData.append("clinicLogo", selectedFile);
        await createClinic(formData).unwrap();
      }

      if (onNext) onNext();
    } catch (error: any) {
      console.error("Clinic save error:", error);
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to save clinic details",
        color: "danger",
      });
    }
  };
  /* ── end handlers ────────────────────────────────────────────────────── */

  if (isClinicsLoading) {
    return <OnboardingStepSkeleton variant="clinic" />;
  }

  return (
    <div className="h-full w-full font-outfit">


      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6 pt-4 hide-scrollbar sm:px-6 sm:pb-7 sm:pt-5">
          <div className="flex flex-col gap-5 sm:gap-6">

        {/* ════════════════════════════════════════
            SECTION 1 — Basic Info (responsive grid)
        ════════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          <OnboardingInput
            name="clinicName"
            control={control}
            label="Clinic Name"
            placeholder="Enter clinic name"
            isRequired
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 21h18M5 21V7l8-4v18M19 21V10l-6-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <OnboardingInput
            name="clinicPhone"
            control={control}
            label="Clinic Contact Number"
            placeholder="Enter 10-digit mobile number"
            isRequired
            type="tel"
            inputMode="numeric"
            maxLength={10}
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
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <OnboardingInput
            name="tagline"
            control={control}
            label="Tagline"
            placeholder="e.g. Your health, our priority"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
        </div>

        {/* ════════════════════════════════════════
            SECTION 2 — Logo Upload (Responsive Layout)
        ════════════════════════════════════════ */}
        <div className="space-y-2">
          

          <div className="grid gap-4 lg:grid-cols-[minmax(0,520px)_minmax(240px,280px)] lg:items-end lg:gap-8">
            {/* Left: Logo Upload - Flex grow to take available space */}
            <div className="">
              <FigmaFileUpload
                name="clinicLogo"
                control={control}
                hint="Recommended size: 512x512px, Max 2MB"
                onUpload={handleFileUpload}
                previewUrl={previewUrl}
                onRemove={() => {
                  setValue("clinicLogo", "");
                  setPreviewUrl("");
                  setSelectedFile(null);
                }}
              />
            </div>

            {/* Right: Tip Card - Responsive width */}
            <div className="flex flex-col justify-end">
              <div className="flex min-h-[92px] items-center rounded-xl border border-teal-100 bg-teal-50/70 p-4 dark:border-teal-900 dark:bg-teal-950/30">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5 sm:w-5 sm:h-5">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div>
                    <h4 className="text-[12px] sm:text-[13px] font-semibold text-teal-900 dark:text-teal-100 mb-0.5 sm:mb-1">Tip</h4>
                    <p className="text-[11px] sm:text-[12px] text-teal-700 dark:text-teal-300 leading-relaxed">
                      A logo helps your patients recognize your clinic easily.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 3 — LOCATION (Map + Address Fields)
        ════════════════════════════════════════ */}
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold uppercase tracking-wide text-primary dark:text-primary-hover">
            Location
          </h3>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,520px)_1fr] lg:gap-10">
            {/* Left: Map */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-800">
              <div className="relative h-[224px]">
                <InteractiveMap
                  height="100%"
                  initialLocation={
                    clinic?.latitude && clinic?.longitude
                      ? { lat: Number(clinic.latitude), lng: Number(clinic.longitude) }
                      : null
                  }
                  initialAddress={{
                    address: clinic?.clinicAddress || "",
                    city: clinic?.City || "",
                    state: clinic?.State || "",
                    pincode: clinic?.ZipCode ? String(clinic.ZipCode) : "",
                  }}
                  onLocationChange={handleLocationChange}
                />
              </div>
              <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary flex-shrink-0 mt-0.5">
                    <path d="M12 22s-8-4.5-8-11.8A8 8 0 0120 10.2c0 7.3-8 11.8-8 11.8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    You can move the pin or drag on the map to set the exact location.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Address Fields */}
            <div className="space-y-8 lg:pt-3">
              <OnboardingInput
                name="clinicAddress"
                control={control}
                label="Complete Address"
                placeholder="House/Building, Road, Area"
                isRequired
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22s-8-4.5-8-11.8A8 8 0 0120 10.2c0 7.3-8 11.8-8 11.8z" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <OnboardingCitySelect
                  control={control}
                  onCityStateChange={handleCityStateChange}
                />
                <OnboardingInput
                  name="zipCode"
                  control={control}
                  label="Pincode"
                  placeholder="Enter 6-digit pincode"
                  isRequired
                  type="tel"
                  maxLength={6}
                  inputMode="numeric"
                  rules={{
                    required: "Pincode is required",
                    minLength: { value: 6, message: "Pincode must be 6 digits" },
                    maxLength: { value: 6, message: "Pincode must be 6 digits" },
                    pattern: {
                      value: /^[0-9]{6}$/,
                      message: "Enter a valid 6-digit pincode",
                    },
                  }}
                  parse={(val: string) => val.replace(/[^0-9]/g, "").slice(0, 6)}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                />
              </div>
            </div>
          </div>
        </div>

          </div>
        </div>

        {/* ════════════════════════════════════════
            FOOTER — Security Badge + Buttons (Responsive)
        ════════════════════════════════════════ */}
        <div className="flex shrink-0 flex-col items-stretch justify-between gap-3 border-t border-slate-200 bg-white px-5 py-2.5 shadow-[0_-10px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-3">
          {/* Left: Security Badge - Hidden on small mobile */}
          <div className="hidden items-center gap-3 text-[13px] text-slate-600 dark:text-slate-300 sm:flex">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#e9f4f3] text-primary shadow-sm dark:bg-primary-hover/15 dark:text-primary-hover">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 21s7-3.6 7-9.1V5.6L12 3 5 5.6v6.3C5 17.4 12 21 12 21Z"
                  fill="currentColor"
                  opacity="0.16"
                />
                <path
                  d="M12 21s7-3.6 7-9.1V5.6L12 3 5 5.6v6.3C5 17.4 12 21 12 21Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="m9.2 12 1.8 1.8 3.8-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Your data is 100% secure and private
            </span>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            {onBack && (
              <Button
                type="button"
                variant="light"
                radius="lg"
                className="h-10 sm:h-11 px-4 sm:px-6 text-[13px] sm:text-[14px] font-semibold text-slate-600 dark:text-slate-300"
                onPress={onBack}
              >
                <span className="hidden sm:inline">Save & Exit</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            )}

            <Button
              type="submit"
              radius="lg"
              className="h-10 sm:h-11 px-6 sm:px-8 text-[13px] sm:text-[14px] font-semibold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 flex-1 sm:flex-initial"
              isLoading={isSubmitting}
              endContent={
                !isSubmitting && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="sm:w-4 sm:h-4">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )
              }
            >
              Continue
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ClinicDetails;
