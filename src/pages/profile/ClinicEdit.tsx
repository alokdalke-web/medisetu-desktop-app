// src/pages/profile/ClinicEdit.tsx
import React, { useEffect } from "react";
import { FiHome, FiUploadCloud, FiCamera } from "react-icons/fi";
import { Button, addToast } from "@heroui/react";
import { useDropzone } from "react-dropzone";
import { useForm, type Control, type FieldValues } from "react-hook-form";
import { useNavigate } from "react-router";
import { ImageCropperModal } from "../../components/shared/ImageCropperModal";

import InputField from "../../components/shared/InputField";
import TextareaField from "../../components/shared/TextareaField";
import CitySelector from "../../components/shared/CitySelector";
import InteractiveMap from "../../components/shared/InteractiveMap";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import PageBackNav from "../../components/shared/PageBackNav";
import { buildNominatimUrl, getNominatimHeaders } from "../../utils/nominatim";
import { optionalPhoneValidation } from "../../utils/validation";


const darkTextareaClassNames = {
  input: "bg-transparent text-white",
  inputWrapper: "bg-default-100/50 hover:bg-default-200/50 group-data-[focus=true]:bg-default-200/50",
};

import {
  useGetAllClinicsQuery,
  useUpdateClinicProfileMutation,
} from "../../redux/api/clinicApi";
import AddClinicModal from "./AddClinicModal";
import SubscriptionModal from "./SubscriptionModal";
import { useDisclosure } from "@heroui/react";

import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import type {
  Clinic,
  ClinicEditFormValues as ClinicFormValues,
} from "../../types/profile";

const ClinicEdit: React.FC = () => {
  const navigate = useNavigate();

  // ✅ Step 3: get setDirty
  const { setDirty } = useUnsavedChanges();

  const { data: clinics, refetch } = useGetAllClinicsQuery();
  const base: any = (clinics as any)?.result ?? clinics ?? {};
  const clinic: Clinic | undefined =
    base?.clinic ?? base?.clinicDetails ?? base ?? undefined;

  const hasClinic = !!clinic?.id;

  const profile = (clinics as any)?.profile;
  const userType = profile?.userType;

  useEffect(() => {
    if (clinics && userType && userType !== "Admin" && userType !== "Super_Admin") {
      navigate("/profile/clinic", { replace: true });
    }
  }, [clinics, userType, navigate]);

  const [updateClinicProfile, { isLoading }] = useUpdateClinicProfileMutation();

  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = React.useState(false);

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
    watch,
    formState: { isSubmitting, isDirty },
  } = useForm<ClinicFormValues>({
    mode: "onBlur",
    defaultValues: {
      clinicName: clinic?.clinicName || "",
      clinicPhone: clinic?.clinicPhone || "",
      Tagline: clinic?.Tagline || "",

      // UI-only fields, not part of the update payload built in onSubmit
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

  // Shown beside the city in the selector: the map fills State, but a city that
  // wasn't picked from the dropdown carries no state of its own.
  const watchedState = watch("State");

  // Combine RHF dirty state with the logo file pick, which isn't tracked by RHF
  useEffect(() => {
    setDirty(Boolean(isDirty || selectedFile));
  }, [isDirty, selectedFile, setDirty]);

  useEffect(() => {
    if (!clinic) return;

    reset({
      clinicName: clinic?.clinicName || "",
      clinicPhone: clinic?.clinicPhone || "",
      Tagline: clinic?.Tagline || "",

      // UI-only fields, not part of the update payload built in onSubmit
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
        const url = buildNominatimUrl("search", {
          format: "jsonv2",
          addressdetails: "1",
          limit: "1",
          city,
          state,
          country: "India",
        });

        const res = await fetch(url, {
          headers: getNominatimHeaders(),
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
    // `city` as well as `City`: the payload reads `City`, but the City & State
    // selector is bound to lowercase `city`, so setting only `City` left the
    // dropdown showing whatever was there before the pin moved.
    if (addressDetails.city) {
      setValue("City", addressDetails.city, { shouldValidate: true, shouldDirty: true });
      setValue("city", addressDetails.city, { shouldValidate: true, shouldDirty: true });
    }
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

    setPendingFile(file);
    setIsCropModalOpen(true);
  }, []);

  const handleCropSave = (croppedFile: File, croppedUrl: string) => {
    setPhotoPreview(croppedUrl);
    setSelectedFile(croppedFile);
    setDirty(true);
    setIsCropModalOpen(false);
    setPendingFile(null);
  };

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

    if (!values.latitude || !values.longitude) {
      addToast({
        title: "Location required",
        description:
          "Pin your clinic's exact location on the map before saving.",
        color: "danger",
      });
      return;
    }

    try {
      const formData = new FormData();

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

      await updateClinicProfile(formData).unwrap();

      addToast({
        title: "Clinic updated",
        description: "Clinic details have been saved successfully.",
        color: "success",
      });

      // Clear dirty immediately so the unsaved-changes guard doesn't prompt on navigate
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
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FiHome className="h-4 w-4" />
              </span>
              <h3 className="text-[14px] font-semibold text-text sm:text-[15px]">
                Clinic Information
              </h3>
            </div>

            <Button
              variant="flat"
              className="rounded-xl dark:text-white"
              onPress={() => navigate("/profile/clinic")}
            >
              Back
            </Button>
          </div>

          <div className="px-5 py-6 text-sm text-text-muted sm:px-6">
            No clinic found yet. Please add clinic first.
            <div className="mt-4">
              <button
                type="button"
                onClick={onAddOpen}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 dark:border-primary-hover/50"
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
        /*
         * HeroUI's Input/Textarea/Autocomplete render label/description/input text via
         * data-slot elements whose color comes from HeroUI's own CSS vars, not our
         * Tailwind classes — CitySelector (an internal Autocomplete) in particular has no
         * classNames prop wired here, so its label/input text is otherwise stuck at
         * HeroUI's default near-black and unreadable on our dark surface. Token values
         * are used below (not raw picks) so this stays in sync with index.css's .dark palette.
         */
        .dark .clinic-edit-dark-fix label,
        .dark .clinic-edit-dark-fix label *,
        .dark .clinic-edit-dark-fix [data-slot="label"],
        .dark .clinic-edit-dark-fix [data-slot="label"] *,
        .dark .clinic-edit-dark-fix [data-slot="label-wrapper"],
        .dark .clinic-edit-dark-fix [data-slot="label-wrapper"] *,
        .dark .clinic-edit-dark-fix [data-slot="main-wrapper"] > label,
        .dark .clinic-edit-dark-fix [data-slot="main-wrapper"] > label *,
        .dark .clinic-edit-dark-fix [data-slot="description"],
        .dark .clinic-edit-dark-fix [data-slot="description"] *,
        .dark .clinic-edit-dark-fix [data-slot="helper-wrapper"] {
          color: var(--color-text) !important;
          -webkit-text-fill-color: var(--color-text) !important;
          opacity: 1 !important;
        }

        .dark .clinic-edit-dark-fix input,
        .dark .clinic-edit-dark-fix textarea,
        .dark .clinic-edit-dark-fix [data-slot="input"] {
          color: var(--color-white) !important;
          -webkit-text-fill-color: var(--color-white) !important;
        }

        /* No token covers a dedicated placeholder tint; kept as a literal deliberately lighter than text-subtle. */
        .dark .clinic-edit-dark-fix input::placeholder,
        .dark .clinic-edit-dark-fix textarea::placeholder,
        .dark .clinic-edit-dark-fix [data-slot="input"]::placeholder {
          color: #cbd5e1 !important;
          -webkit-text-fill-color: #cbd5e1 !important;
          opacity: 1 !important;
        }

        /* CitySelector is a HeroUI Autocomplete whose wrapper doesn't stretch on its own;
           width only — sizing/height is left to the shared field components so these match
           every other form in the app. */
        .clinic-edit-dark-fix .clinic-address-fields [data-slot="base"],
        .clinic-edit-dark-fix .clinic-address-fields [data-slot="main-wrapper"],
        .clinic-edit-dark-fix .clinic-address-fields [data-slot="input-wrapper"] {
          width: 100%;
        }

        /* City & State sits beside Pincode, so the two have to share a baseline.
           CitySelector hardcodes a 38px control while InputField renders HeroUI's
           40px md field, which left the pair a couple of pixels out on both the
           label and the box. Scoped here rather than in CitySelector because the
           other six screens using it are built around its own height. */
        .clinic-edit-dark-fix .clinic-address-fields [data-slot="input-wrapper"] {
          height: 40px !important;
          min-height: 40px !important;
        }
      `}</style>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none">
        <ProfilePageHeader
          icon={<FiHome className="h-4 w-4" />}
          title="Clinic Information"
          description="Update your clinic's contact details, address and branding."
        />

        <PageBackNav
          backTo="/profile/clinic"
          crumbs={[
            { label: "Clinic Information", to: "/profile/clinic" },
            { label: "Edit" },
          ]}
          className="border-b border-line px-5 py-3 sm:px-6"
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
                radius="lg"
                rules={{ required: "Clinic name is required" }}
              />

              <InputField
                control={rhfControl}
                label="Phone No."
                name="clinicPhone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                radius="lg"
                placeholder="e.g. 00000 00000"
                rules={optionalPhoneValidation}
                parse={(val) => val.replace(/\D/g, "").slice(0, 10)}
              />

              <InputField
                control={rhfControl}
                label="Tagline"
                name="Tagline"
                radius="lg"
              />
            </div>

            {/* Logo (square) */}
            <div>
              <div className="text-[12px] font-semibold text-text">
                Clinic Logo
              </div>

              <div className="mt-2 flex items-start gap-4">
                <div
                  {...getRootProps()}
                  className={`relative group cursor-pointer h-28 w-28 rounded-2xl overflow-hidden flex items-center justify-center
                    ${isDragActive
                      ? "ring-2 ring-primary"
                      : "bg-surface-muted hover:bg-line"
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
                    <div className="flex flex-col items-center text-text-muted">
                      <FiUploadCloud className="text-2xl mb-1" />
                      <span className="text-[10px] text-center px-2">
                        Upload Logo
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-1">
                  <div className="text-[11px] text-text-muted">
                    JPG, PNG or WebP <br /> Max 2MB
                  </div>

                  <Button
                    size="sm"
                    variant="bordered"
                    className="mt-3 rounded-xl border-primary text-primary dark:border-primary-hover"
                    onPress={() => open()}
                  >
                    {photoPreview ? "Change Logo" : "Select Logo"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Location + address side by side so the map stays visible while the
                auto-filled fields next to it are corrected. */}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            {/* Section 1 — pin the clinic's exact position on the map */}
            <div className="rounded-2xl border border-line bg-surface-muted p-4 sm:p-5">
              <div>
                <div className="text-[13px] font-semibold text-text">
                  Clinic Location
                </div>
                <div className="text-[11px] text-text-muted">
                  Search, drag the pin, or use the location button on the map to
                  set your clinic's exact position
                </div>
              </div>

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
            </div>

            {/* Section 2 — the address fields the map auto-fills, still editable by hand */}
            <div className="rounded-2xl border border-line bg-surface-muted p-4 sm:p-5">
              <div>
                <div className="text-[13px] font-semibold text-text">
                  Address Details
                </div>
                <div className="text-[11px] text-text-muted">
                  Auto-filled from the map — edit any field if it needs
                  correcting
                </div>
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
                  {/* `md` to match the Pincode InputField beside it — the
                      component's own default is `lg`, whose larger label
                      metrics pushed the two labels off the same line. */}
                  <CitySelector
                    control={rhfControl}
                    size="md"
                    stateValue={watchedState}
                    onCityStateChange={handleCityStateChange}
                  />
                </div>

                <InputField
                  control={rhfControl}
                  label="Pincode"
                  name="ZipCode"
                  type="text"
                  inputMode="numeric"
                  radius="lg"
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
                />
              </div>
            </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-line px-5 py-4 sm:px-6">
            <div className="w-full flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="bordered"
                className="w-full rounded-xl border-primary text-primary dark:border-primary-hover sm:w-auto"
                disabled={isLoading || isSubmitting}
                onPress={() => navigate("/profile/clinic")}
              >
                Cancel Changes
              </Button>

              <Button
                type="submit"
                color="primary"
                className="w-full sm:w-auto rounded-xl"
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

      {pendingFile && (
        <ImageCropperModal
          isOpen={isCropModalOpen}
          onClose={() => {
            setIsCropModalOpen(false);
            setPendingFile(null);
          }}
          file={pendingFile}
          onSave={handleCropSave}
        />
      )}
    </div>
  );
};

export default ClinicEdit;
