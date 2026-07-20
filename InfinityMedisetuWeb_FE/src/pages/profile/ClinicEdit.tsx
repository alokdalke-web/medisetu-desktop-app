// src/pages/profile/ClinicEdit.tsx
import React, { useEffect } from "react";
import { FiHome, FiUploadCloud, FiCamera, FiNavigation } from "react-icons/fi";
import { Button, addToast } from "@heroui/react";
import { useDropzone } from "react-dropzone";
import { useForm, type Control, type FieldValues } from "react-hook-form";
import { useNavigate } from "react-router";

import InputField from "../../components/shared/InputField";
import TextareaField from "../../components/shared/TextareaField";
import CitySelector from "../../components/shared/CitySelector";
import InteractiveMap from "../../components/shared/InteractiveMap";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import { optionalPhoneValidation } from "../../utils/validation";

import {
  useGetAllClinicsQuery,
  useUpdateClinicMutation,
} from "../../redux/api/clinicApi";
import AddClinicModal from "./AddClinicModal";
import SubscriptionModal from "./SubscriptionModal";
import { useDisclosure } from "@heroui/react";

// ✅ Step 3: global unsaved changes hook
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

/* ---------------- Types ---------------- */




type Clinic = {
  id: string;
  clinicName?: string;
  clinicPhone?: string;
  Tagline?: string;

  // ✅ UI-only for now
  phoneNo?: string;
  alternatePhoneNo?: string;

  ZipCode?: number | string;
  clinicAddress?: string;
  City?: string;
  State?: string;
  Country?: string;
  clinicLogo?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type ClinicFormValues = {
  clinicName: string;
  clinicPhone: string;
  Tagline: string;

  // ✅ UI-only for now (not sent to API)
  phoneNo: string;
  alternatePhoneNo: string;

  clinicAddress: string;
  city?: string;
  City: string;
  State: string;
  Country: string;
  ZipCode: string;
  clinicLogo: string;
  latitude: string;
  longitude: string;
};

const ClinicEdit: React.FC = () => {
  const navigate = useNavigate();

  // ✅ Step 3: get setDirty
  const { setDirty } = useUnsavedChanges();

  const { data: clinics, refetch } = useGetAllClinicsQuery();
  const base: any = (clinics as any)?.result ?? clinics ?? {};
  const clinic: Clinic | undefined =
    base?.clinic ?? base?.clinicDetails ?? base ?? undefined;

  const hasClinic = !!clinic?.id;

  const [updateClinic, { isLoading }] = useUpdateClinicMutation();

  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const darkFieldClassNames = {
    label: "dark:!text-white",
    input: "dark:!text-white dark:placeholder:!text-slate-300",
    inputWrapper: "dark:!border-[#38445a] dark:!bg-[#0f1728]",
    helperWrapper: "dark:!text-slate-200",
    errorMessage: "dark:!text-rose-300",
  };
  const darkTextareaClassNames = {
    label: "dark:!text-white",
    input: "dark:!text-white dark:placeholder:!text-slate-300",
    inputWrapper: "dark:!border-[#38445a] dark:!bg-[#0f1728]",
    helperWrapper: "dark:!text-slate-200",
    errorMessage: "dark:!text-rose-300",
  };

  const {
    isOpen: isAddOpen,
    onOpen: onAddOpen,
    onOpenChange: onAddOpenChange,
  } = useDisclosure();

  const {
    isOpen: isSubsModalOpen,
    onOpen: onSubsModalOpen,
    onOpenChange: onSubsModalOpenChange,
  } = useDisclosure();

  const {
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { isSubmitting, isDirty },
  } = useForm<ClinicFormValues>({
    mode: "onBlur",
    defaultValues: {
      clinicName: clinic?.clinicName || "",
      clinicPhone: clinic?.clinicPhone || "",
      Tagline: clinic?.Tagline || "",

      // ✅ UI-only
      phoneNo: clinic?.phoneNo || "",
      alternatePhoneNo: clinic?.alternatePhoneNo || "",

      clinicAddress: clinic?.clinicAddress || "",
      city: clinic?.City || "",
      City: clinic?.City || "",
      State: clinic?.State || "",
      Country: clinic?.Country || "India",
      ZipCode: clinic?.ZipCode ? String(clinic.ZipCode) : "",
      clinicLogo: clinic?.clinicLogo || "",
      latitude: clinic?.latitude ? String(clinic.latitude) : "",
      longitude: clinic?.longitude ? String(clinic.longitude) : "",
    },
  });

  // ✅ Step 3: whenever form becomes dirty OR logo file selected -> mark global dirty
  useEffect(() => {
    setDirty(Boolean(isDirty || selectedFile));
  }, [isDirty, selectedFile, setDirty]);

  useEffect(() => {
    if (!clinic) return;

    reset({
      clinicName: clinic?.clinicName || "",
      clinicPhone: clinic?.clinicPhone || "",
      Tagline: clinic?.Tagline || "",

      // ✅ UI-only
      phoneNo: clinic?.phoneNo || "",
      alternatePhoneNo: clinic?.alternatePhoneNo || "",

      clinicAddress: clinic?.clinicAddress || "",
      city: clinic?.City || "",
      City: clinic?.City || "",
      State: clinic?.State || "",
      Country: clinic?.Country || "India",
      ZipCode: clinic?.ZipCode ? String(clinic.ZipCode) : "",
      clinicLogo: clinic?.clinicLogo || "",
      latitude: clinic?.latitude ? String(clinic.latitude) : "",
      longitude: clinic?.longitude ? String(clinic.longitude) : "",
    });

    setPhotoPreview(clinic?.clinicLogo || null);
    setSelectedFile(null);

    // ✅ Step 3: reset means nothing unsaved now
    setDirty(false);
  }, [clinic, reset, setDirty]);

  const handleCityStateChange = (city: string, state: string, shouldValidate = true) => {
    setValue("city", city, { shouldValidate, shouldDirty: true });
    setValue("City", city, { shouldValidate, shouldDirty: true });
    setValue("State", state, { shouldValidate, shouldDirty: true });

    if (!city || !state) {
      setValue("ZipCode", "", { shouldValidate: false, shouldDirty: true });
      return;
    }

    void (async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&city=${encodeURIComponent(
          city,
        )}&state=${encodeURIComponent(state)}&country=India&email=contact@medisetu.com`;

        const res = await fetch(url, {
          headers: {
            "Accept-Language": "en-IN,en;q=0.9",
            "User-Agent": "MediSetu-Clinic-Edit",
          },
        });

        const data = await res.json();
        const addr = data?.[0]?.address;
        const zip = addr?.postcode || "";

        if (zip) {
          setValue("ZipCode", String(zip), {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      } catch (e) {
        console.error("Failed to auto-detect pincode from city/state:", e);
      }
    })();
  };

  const [isLocating, setIsLocating] = React.useState(false);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      addToast({ title: "Geolocation not supported", color: "danger" });
      return;
    }

    setIsLocating(true);
    addToast({ title: "Fetching location...", color: "primary" });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const url =
            `https://nominatim.openstreetmap.org/reverse?` +
            `format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1&email=contact@medisetu.com`;

          const response = await fetch(url, {
            headers: {
              "Accept-Language": "en-US,en;q=0.9",
            },
          });

          const data = await response.json();
          const addr = data.address;

          if (addr) {
            const addressFields = [
              addr.house_number,
              addr.road,
              addr.suburb,
              addr.neighbourhood,
              addr.village,
              addr.town,
            ]
              .filter(Boolean)
              .join(", ");

            setValue("clinicAddress", addressFields || data.display_name || "", {
              shouldValidate: true,
              shouldDirty: true,
            });

            const detectedCity =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.district ||
              addr.county;
            if (detectedCity) {
              setValue("City", detectedCity, { shouldValidate: true, shouldDirty: true });
              setValue("city", detectedCity, { shouldValidate: true, shouldDirty: true });
            }
            if (addr.state || addr.region) {
              setValue("State", addr.state || addr.region, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }
            if (addr.postcode) {
              setValue("ZipCode", addr.postcode, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }
          }

          setValue("latitude", String(latitude), { shouldDirty: true });
          setValue("longitude", String(longitude), { shouldDirty: true });

          addToast({
            title: "Location detected",
            description: "Address fields have been auto-filled.",
            color: "success",
          });
        } catch (error) {
          addToast({
            title: "Geocoding failed",
            description: "Could not convert coordinates to address.",
            color: "danger",
          });
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        addToast({
          title: "Location error",
          description: "Could not fetch current location.",
          color: "danger",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleLocationChange = (
    location: { lat: number; lng: number },
    addressDetails: { address: string; city: string; state: string; pincode: string }
  ) => {
    setValue("latitude", String(location.lat), { shouldDirty: true });
    setValue("longitude", String(location.lng), { shouldDirty: true });
    if (addressDetails.address) setValue("clinicAddress", addressDetails.address, { shouldValidate: true, shouldDirty: true });
    if (addressDetails.city) setValue("City", addressDetails.city, { shouldValidate: true, shouldDirty: true });
    if (addressDetails.state) setValue("State", addressDetails.state, { shouldValidate: true, shouldDirty: true });
    if (addressDetails.pincode) setValue("ZipCode", addressDetails.pincode, { shouldValidate: true, shouldDirty: true });
  };

  const handleFile = React.useCallback((file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      addToast({
        title: "File too large",
        description: "Logo must be less than 2MB",
        color: "danger",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    setSelectedFile(file);

    // ✅ Step 3: logo change also counts as unsaved change
    setDirty(true);
  }, [setDirty]);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) handleFile(acceptedFiles[0]);
  }, [handleFile]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    multiple: false,
  });

  const rhfControl = control as unknown as Control<FieldValues, FieldValues>;

  const onSubmit = async (values: ClinicFormValues) => {
    if (!clinic?.id) return;

    try {
      const formData = new FormData();

      // ✅ keep existing API fields
      formData.append("clinicDetails[clinicName]", values.clinicName);
      formData.append("clinicDetails[clinicPhone]", values.clinicPhone);
      formData.append("clinicDetails[Tagline]", values.Tagline);
      formData.append("clinicDetails[clinicAddress]", values.clinicAddress);
      formData.append("clinicDetails[Country]", values.Country || "India");
      formData.append("clinicDetails[State]", values.State);
      formData.append("clinicDetails[City]", values.City);

      if (values.ZipCode)
        formData.append("clinicDetails[ZipCode]", values.ZipCode);
      if (values.latitude)
        formData.append("clinicDetails[latitude]", values.latitude);
      if (values.longitude)
        formData.append("clinicDetails[longitude]", values.longitude);
      if (selectedFile) formData.append("clinicLogo", selectedFile);

      await updateClinic({ clinicId: clinic.id, body: formData }).unwrap();

      addToast({
        title: "Clinic updated",
        description: "Clinic details have been saved successfully.",
        color: "success",
      });

      // ✅ Step 3: clear dirty immediately (so navigation doesn't prompt)
      reset({
        ...values,
        city: values.City || values.city || "",
      });
      setSelectedFile(null);
      setDirty(false);

      await refetch();
      navigate("/profile/clinic");
    } catch (error) {
      console.error("Update clinic failed:", error);
      addToast({
        title: "Update failed",
        description: "Unable to update clinic. Please try again.",
        color: "danger",
      });
    }
  };

  if (!hasClinic) {
    return (
      <div className="min-w-0">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-[#273244] sm:px-6">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-[#1a3a35] dark:text-[#9be7dc]">
                <FiHome className="h-4 w-4" />
              </span>
              <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white sm:text-[15px]">
                Clinic Information
              </h3>
            </div>

            <Button
              variant="flat"
              className="rounded-full dark:text-white"
              onPress={() => navigate("/profile/clinic")}
            >
              Back
            </Button>
          </div>

          <div className="px-5 py-6 text-sm text-slate-500 dark:text-slate-300 sm:px-6">
            No clinic found yet. Please add clinic first.
            <div className="mt-4">
              <button
                type="button"
                onClick={onAddOpen}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 dark:border-[#46beae]/50 dark:bg-[#0f1728] dark:text-[#9be7dc] dark:hover:bg-[#1a3a35]"
              >
                + Add Clinic
              </button>
            </div>
          </div>
        </div>

        <AddClinicModal
          isOpen={isAddOpen}
          onOpenChange={onAddOpenChange}
          onCreated={refetch}
          onSubsModalOpen={onSubsModalOpen}
        />

        <SubscriptionModal
          isOpen={isSubsModalOpen}
          onOpenChange={onSubsModalOpenChange}
        />
      </div>
    );
  }

  return (
    <div className="clinic-edit-dark-fix min-w-0">
      <style>{`
        .dark .clinic-edit-dark-fix label,
        .dark .clinic-edit-dark-fix label *,
        .dark .clinic-edit-dark-fix [class*="100E1C"],
        .dark .clinic-edit-dark-fix [class*="text-slate-900"],
        .dark .clinic-edit-dark-fix [class*="text-slate-800"],
        .dark .clinic-edit-dark-fix [class*="text-slate-700"],
        .dark .clinic-edit-dark-fix [data-slot="label"],
        .dark .clinic-edit-dark-fix [data-slot="label"] *,
        .dark .clinic-edit-dark-fix [data-slot="label-wrapper"],
        .dark .clinic-edit-dark-fix [data-slot="label-wrapper"] *,
        .dark .clinic-edit-dark-fix [data-slot="main-wrapper"] > label,
        .dark .clinic-edit-dark-fix [data-slot="main-wrapper"] > label *,
        .dark .clinic-edit-dark-fix [data-slot="description"],
        .dark .clinic-edit-dark-fix [data-slot="description"] *,
        .dark .clinic-edit-dark-fix [data-slot="helper-wrapper"] {
          color: #f8fafc !important;
          -webkit-text-fill-color: #f8fafc !important;
          opacity: 1 !important;
        }

        .dark .clinic-edit-dark-fix input,
        .dark .clinic-edit-dark-fix textarea,
        .dark .clinic-edit-dark-fix [data-slot="input"] {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
        }

        .dark .clinic-edit-dark-fix input::placeholder,
        .dark .clinic-edit-dark-fix textarea::placeholder,
        .dark .clinic-edit-dark-fix [data-slot="input"]::placeholder {
          color: #cbd5e1 !important;
          -webkit-text-fill-color: #cbd5e1 !important;
          opacity: 1 !important;
        }

        .clinic-edit-dark-fix .clinic-address-fields [data-slot="base"],
        .clinic-edit-dark-fix .clinic-address-fields [data-slot="main-wrapper"],
        .clinic-edit-dark-fix .clinic-address-fields [data-slot="input-wrapper"] {
          width: 100%;
        }

        .clinic-edit-dark-fix .clinic-address-fields [data-slot="input-wrapper"] {
          min-height: 48px !important;
          height: 48px !important;
          align-items: center !important;
        }

        .clinic-edit-dark-fix .clinic-address-fields input,
        .clinic-edit-dark-fix .clinic-address-fields [data-slot="input"] {
          min-height: 44px !important;
          height: 44px !important;
          line-height: 44px !important;
        }

        .clinic-edit-dark-fix .clinic-address-fields label {
          display: inline-flex !important;
          min-height: 20px !important;
          align-items: center !important;
          padding-bottom: 8px !important;
        }
      `}</style>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
        <ProfilePageHeader
          icon={<FiHome className="h-4 w-4" />}
          title="Clinic Information"
        />

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-5 sm:px-6 py-5 space-y-5">
            {/* Top grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
              <InputField
                control={rhfControl}
                label="Clinic Name"
                name="clinicName"
                rules={{ required: "Clinic name is required" }}
                classNames={darkFieldClassNames}
              />

              <InputField
                control={rhfControl}
                label="Phone No."
                name="clinicPhone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="e.g. 00000 00000"
                rules={optionalPhoneValidation}
                parse={(val) => val.replace(/\D/g, "").slice(0, 10)}
                classNames={darkFieldClassNames}
              />

              <InputField
                control={rhfControl}
                label="Tagline"
                name="Tagline"
                classNames={darkFieldClassNames}
              />
            </div>

            {/* ✅ Logo (square) */}
            <div>
              <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                Clinic Logo
              </div>

              <div className="mt-2 flex items-start gap-4">
                <div
                  {...getRootProps()}
                  className={`relative group cursor-pointer h-28 w-28 rounded-2xl overflow-hidden flex items-center justify-center
                    ${isDragActive
                      ? "ring-2 ring-primary"
                      : "bg-slate-200/70 hover:bg-slate-200 dark:bg-[#0f1728] dark:hover:bg-[#151c2d]"
                    }`}
                >
                  <input {...getInputProps()} />
                  {photoPreview ? (
                    <>
                      <img
                        src={photoPreview}
                        alt="Clinic logo preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <FiCamera className="text-white text-xl" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-slate-500 dark:text-slate-300">
                      <FiUploadCloud className="text-2xl mb-1" />
                      <span className="text-[10px] text-center px-2">
                        Upload Logo
                      </span>
                    </div>
                  )}
                </div>

                {/* ✅ Right side: info + button */}
                <div className="pt-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-300">
                    JPG, PNG or WebP < br /> Max 2MB
                  </div>

                  <Button
                    size="sm"
                    variant="bordered"
                    className="mt-3 rounded-full border-primary text-primary dark:border-[#46beae] dark:text-[#9be7dc]"
                    onPress={() => open()}
                  >
                    {photoPreview ? "Change Logo" : "Select Logo"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Smart Address */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-[#273244] dark:bg-[#0f1728]/70 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-slate-900 dark:text-white">
                    Smart Address
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-300">
                    Auto-detect or manually enter your clinic location
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-[12px] font-semibold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#46beae] dark:bg-[#111726] dark:text-[#9be7dc] dark:hover:bg-[#1a3a35]"
                >
                  <FiNavigation className="h-4 w-4" />
                  {isLocating ? "Detecting..." : "Use Current Location"}
                </button>
              </div>

              {/* Interactive Map */}
              <div className="mt-4">
                <InteractiveMap
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

              <div className="mt-4">
                <TextareaField
                  control={rhfControl}
                  label="Clinic Address"
                  name="clinicAddress"
                  rules={{ required: "Clinic address is required" }}
                  classNames={darkTextareaClassNames}
                />
              </div>

              <div className="clinic-address-fields mt-4 grid grid-cols-1 items-start gap-x-4 gap-y-4 md:grid-cols-2">
                <div className="min-w-0">
                  <CitySelector
                    control={rhfControl}
                    onCityStateChange={handleCityStateChange}
                  />
                </div>

                <InputField
                  control={rhfControl}
                  label="Pincode"
                  name="ZipCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="Enter 6 digit pincode"
                  maxLength={6}
                  rules={{
                    required: "Pincode is required",
                    pattern: {
                      value: /^\d{6}$/,
                      message: "Pincode must be exactly 6 digits",
                    },
                  }}
                  parse={(val) => val.replace(/\D/g, "").slice(0, 6)}
                  classNames={darkFieldClassNames}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-5 py-4 dark:border-[#273244] sm:px-6">
            <div className="w-full flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="bordered"
                className="w-full rounded-full border-primary text-primary dark:border-[#46beae] dark:text-[#9be7dc] sm:w-auto"
                disabled={isLoading || isSubmitting}
                onPress={() => navigate("/profile/clinic")}
              >
                Cancel Changes
              </Button>

              <Button
                type="submit"
                color="primary"
                className="w-full sm:w-auto rounded-full"
                isLoading={isLoading || isSubmitting}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>

      <AddClinicModal
        isOpen={isAddOpen}
        onOpenChange={onAddOpenChange}
        onCreated={refetch}
        onSubsModalOpen={onSubsModalOpen}
      />

      <SubscriptionModal
        isOpen={isSubsModalOpen}
        onOpenChange={onSubsModalOpenChange}
      />
    </div>
  );
};

export default ClinicEdit;
