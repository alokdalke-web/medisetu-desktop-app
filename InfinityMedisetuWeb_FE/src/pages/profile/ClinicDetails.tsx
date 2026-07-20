// src/pages/profile/ClinicDetails.tsx
import React, { useEffect } from "react";
import {
  FiEdit2,
  FiHome,
  FiCamera,
  FiUploadCloud,
  FiNavigation,
} from "react-icons/fi";
import {
  useDisclosure,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  addToast,
} from "@heroui/react";
import { useForm, type Control, type FieldValues } from "react-hook-form";
import {
  useGetAllClinicsQuery,
  useUpdateClinicMutation,
} from "../../redux/api/clinicApi";
import AddClinicModal from "./AddClinicModal";
import InputField from "../../components/shared/InputField";
import CitySelector from "../../components/shared/CitySelector";
import TextareaField from "../../components/shared/TextareaField";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import clinicuser from "../../../public/assets/icons/clinicuser.svg";
import SubscriptionModal from "./SubscriptionModal";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router";

/* ---------------- Types ---------------- */

type Clinic = {
  id: string;
  clinicName?: string;
  clinicPhone?: string;
  Tagline?: string;

  // ✅ UI-only for now (may not exist in API)
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

type UpdateDetailsProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clinic?: Clinic | null;
  onSaved?: () => void;
};



export type ClinicFormValues = {
  clinicName: string;
  Tagline: string;

  // ✅ UI-only (not sent to API for now)
  phoneNo: string;
  alternatePhoneNo: string;

  ZipCode: string;
  clinicAddress: string;
  City: string;
  State: string;
  Country: string;
  clinicLogo: string;
  latitude?: number | null;
  longitude?: number | null;
};

/* --------------- Modal: UpdateDetails (PUT /clinic) --------------- */

const UpdateDetails: React.FC<UpdateDetailsProps> = ({
  isOpen,
  onOpenChange,
  clinic,
  onSaved,
}) => {
  const [updateClinic, { isLoading }] = useUpdateClinicMutation();
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const {
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { isSubmitting },
  } = useForm<ClinicFormValues>({
    mode: "onBlur",
    defaultValues: {
      clinicName: clinic?.clinicName || "",
      Tagline: clinic?.Tagline || "",

      phoneNo: clinic?.phoneNo || "",
      alternatePhoneNo: clinic?.alternatePhoneNo || "",

      ZipCode: clinic?.ZipCode ? String(clinic.ZipCode) : "",
      clinicAddress: clinic?.clinicAddress || "",
      City: clinic?.City || "",
      State: clinic?.State || "",
      Country: clinic?.Country || "",
      clinicLogo: clinic?.clinicLogo || "",
      latitude: clinic?.latitude && clinic.latitude !== "null" && clinic.latitude !== "undefined" && !isNaN(Number(clinic.latitude)) ? Number(clinic.latitude) : null,
      longitude: clinic?.longitude && clinic.longitude !== "null" && clinic.longitude !== "undefined" && !isNaN(Number(clinic.longitude)) ? Number(clinic.longitude) : null,
    },
  });

  useEffect(() => {
    if (clinic && isOpen) {
      reset({
        clinicName: clinic.clinicName || "",
        Tagline: clinic.Tagline || "",

        phoneNo: clinic.phoneNo || "",
        alternatePhoneNo: clinic.alternatePhoneNo || "",

        ZipCode: clinic.ZipCode ? String(clinic.ZipCode) : "",
        clinicAddress: clinic.clinicAddress || "",
        City: clinic.City || "",
        State: clinic.State || "",
        Country: clinic.Country || "",
        clinicLogo: clinic.clinicLogo || "",
        latitude: clinic.latitude && clinic.latitude !== "null" && clinic.latitude !== "undefined" && !isNaN(Number(clinic.latitude)) ? Number(clinic.latitude) : null,
        longitude: clinic.longitude && clinic.longitude !== "null" && clinic.longitude !== "undefined" && !isNaN(Number(clinic.longitude)) ? Number(clinic.longitude) : null,
      });

      setPhotoPreview(clinic.clinicLogo || null);
      setSelectedFile(null);
    }
  }, [clinic, isOpen, reset]);

  const handleFile = (file: File) => {
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
  };

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) handleFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    multiple: false,
  });

  if (!clinic) return null;

  const rhfControl = control as unknown as Control<FieldValues, FieldValues>;

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
            `format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;

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

          setValue("latitude", latitude, { shouldDirty: true });
          setValue("longitude", longitude, { shouldDirty: true });

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

  const onSubmit = async (values: ClinicFormValues) => {
    try {
      const formData = new FormData();

      formData.append("clinicDetails[clinicName]", values.clinicName);
      formData.append("clinicDetails[Tagline]", values.Tagline);
      formData.append("clinicDetails[clinicAddress]", values.clinicAddress);
      formData.append("clinicDetails[Country]", values.Country || "India");
      formData.append("clinicDetails[State]", values.State);
      formData.append("clinicDetails[City]", values.City);

      if (values.ZipCode)
        formData.append("clinicDetails[ZipCode]", values.ZipCode);

      if (values.latitude)
        formData.append("clinicDetails[latitude]", String(values.latitude));
      if (values.longitude)
        formData.append("clinicDetails[longitude]", String(values.longitude));

      if (selectedFile) formData.append("clinicLogo", selectedFile);

      await updateClinic({
        clinicId: clinic.id,
        body: formData,
      }).unwrap();

      addToast({
        title: "Clinic updated",
        description: "Clinic details have been saved successfully.",
        color: "success",
      });

      onSaved?.();
      onOpenChange(false);
      reset(values);
      setSelectedFile(null);
    } catch (error) {
      console.error("Update clinic failed:", error);
      addToast({
        title: "Update failed",
        description: "Unable to update clinic. Please try again.",
        color: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
      size="3xl"
      placement="center"
      className="mx-2 sm:mx-0"
    >
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader className="px-5 sm:px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FiHome className="h-4 w-4" />
              </span>
              <div className="text-[14px] sm:text-[15px] font-semibold text-slate-900">
                Clinic Information
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="px-5 sm:px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <InputField
                control={rhfControl}
                label="Clinic Name"
                name="clinicName"
                rules={{ required: "Clinic name is required" }}
              />
              <InputField control={rhfControl} label="Tagline" name="Tagline" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <InputField
                control={rhfControl}
                label="Phone No."
                name="clinicPhone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="e.g. 00000 00000"
                parse={(val) => val.replace(/\D/g, "").slice(0, 10)}
              />

              <InputField
                control={rhfControl}
                label="Alternate Phone No."
                name="alternatePhoneNo"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="e.g. 00000 00000"
                parse={(val) => val.replace(/\D/g, "").slice(0, 10)}
              />
            </div>

            <div>
              <div className="text-[12px] font-semibold text-slate-800">
                Clinic Logo
              </div>

              <div className="mt-2 flex items-start gap-4">
                <div
                  {...getRootProps()}
                  className={`relative group cursor-pointer h-28 w-28 rounded-2xl overflow-hidden flex items-center justify-center
                  ${isDragActive
                      ? "ring-2 ring-primary"
                      : "bg-slate-200/70 hover:bg-slate-200"
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
                    <div className="flex flex-col items-center text-slate-500">
                      <FiUploadCloud className="text-2xl mb-1" />
                      <span className="text-[10px] text-center px-2">
                        Upload Logo
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-1 text-[11px] text-slate-500">
                  JPG, PNG or WebP <br /> Max 2MB
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-slate-900">
                    Smart Address
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Auto-detect or manually enter your clinic location
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-[12px] font-semibold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiNavigation className="h-4 w-4" />
                  {isLocating ? "Detecting..." : "Use Current Location"}
                </button>
              </div>

              {/* Interactive Map (Temporarily Hidden) */}
              {/*isOpen && (
                  <GoogleInteractiveMap
                    googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}
                    initialLocation={
                      clinic?.latitude && clinic?.longitude && clinic.latitude !== "null" && clinic.longitude !== "null" && !isNaN(Number(clinic.latitude))
                        ? {
                            lat: Number(clinic.latitude),
                            lng: Number(clinic.longitude),
                          }
                        : null
                    }
                    initialAddress={{
                      address: clinic?.clinicAddress || "",
                      city: clinic?.City || "",
                      state: clinic?.State || "",
                      pincode: clinic?.ZipCode ? String(clinic.ZipCode) : "",
                    }}
                    onLocationChange={(location, address) => handleLocationChange(location, address)}
                  />
                )*/}

              <div className="mt-4">
                <TextareaField
                  control={rhfControl}
                  label="Clinic Address"
                  name="clinicAddress"
                  rules={{ required: "Clinic address is required" }}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <CitySelector
                  control={rhfControl}
                  onCityStateChange={(city: string, state: string) => {
                    setValue("City", city);
                    setValue("State", state);
                  }}
                />

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
                />

              </div>
            </div>
          </ModalBody>

          <ModalFooter className="px-5 sm:px-6 py-4 border-t border-slate-100">
            <div className="w-full flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                variant="bordered"
                onPress={() => onOpenChange(false)}
                disabled={isLoading || isSubmitting}
                className="w-full sm:w-auto rounded-full border-primary text-primary"
              >
                Cancel Changes
              </Button>

              <Button
                type="submit"
                color="primary"
                isLoading={isLoading || isSubmitting}
                className="w-full sm:w-auto rounded-full"
              >
                Save Changes
              </Button>
            </div>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

/* --------------- Main: ClinicDetails --------------- */
const ClinicDetails: React.FC = () => {
  const { data: clinics, refetch } = useGetAllClinicsQuery();
  const profile = (clinics as any)?.profile;
  const base: any = (clinics as any)?.result ?? clinics ?? {};
  const clinic: Clinic | undefined =
    base?.clinic ?? base?.clinicDetails ?? base ?? undefined;
  const navigate = useNavigate();

  // ✅ FIX: removed onOpen: onUpdateOpen (unused variable)
  const { isOpen: isUpdateOpen, onOpenChange: onUpdateOpenChange } =
    useDisclosure();

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

  const hasDisplayValue = (v: any) => {
    const text = String(v ?? "").trim();
    return (
      text !== "" &&
      text !== "-" &&
      text !== "—" &&
      text.toLowerCase() !== "null" &&
      text.toLowerCase() !== "undefined"
    );
  };

  const fmt = (v: any) => (hasDisplayValue(v) ? String(v).trim() : "—");

  const hasClinic = !!clinic?.id;
  const clinicInfoItems = [
    { label: "City", value: clinic?.City },
    { label: "State", value: clinic?.State },
    { label: "Pincode", value: clinic?.ZipCode },
  ].filter((item) => hasDisplayValue(item.value));
  const clinicAddressText = hasDisplayValue(clinic?.clinicAddress)
    ? String(clinic?.clinicAddress).trim()
    : "";
  const hasClinicDetails = clinicInfoItems.length > 0 || clinicAddressText;

  const clinicShow = profile?.userType === "Admin" || profile?.userType === "Super_Admin";


  return (
    <>
      <ProfilePageHeader
        icon={<img src={clinicuser} alt="" className="w-4" />}
        title="Clinic Information"
        actions={
          clinicShow ? (
            hasClinic ? (
              <button
                type="button"
                onClick={() => navigate("/profile/clinic/edit")}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-slate-300 dark:hover:bg-[#1a2535]"
              >
                <FiEdit2 className="h-4 w-4" />
                Edit
              </button>
            ) : (
              <button
                type="button"
                onClick={onAddOpen}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 dark:border-[#273244] dark:bg-[#111726]"
              >
                + Add Clinic
              </button>
            )
          ) : undefined
        }
      />

      <div className="px-5 sm:px-6 py-5 sm:py-6 min-h-[320px] sm:min-h-[520px]">
        {hasClinic ? (
          <>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-white ring-1 ring-black/10 shrink-0 overflow-hidden">
                {clinic?.clinicLogo ? (
                  <img
                    src={clinic.clinicLogo}
                    alt="Clinic logo"
                    className="h-8 w-8 object-contain"
                  />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-7 w-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="12" cy="12" r="9" className="text-primary-hover" />
                    <path
                      d="M9 12h6M12 9v6"
                      className="text-primary"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>

              <div className="min-w-0">
                <div className="text-[14px] sm:text-[15px] font-semibold text-slate-900 truncate">
                  {fmt(clinic?.clinicName)}
                </div>
                {hasDisplayValue(clinic?.clinicPhone) && (
                  <div className="text-[12px] font-semibold text-slate-600 truncate">
                    ({fmt(clinic?.clinicPhone)})
                  </div>
                )}
                {hasDisplayValue(clinic?.Tagline) && (
                  <div className="text-[15px] text-slate-500 truncate">
                    {fmt(clinic?.Tagline)}
                  </div>
                )}
              </div>
            </div>

            {hasClinicDetails && (
              <div className="my-5 border-t border-dashed border-slate-200" />
            )}

            {clinicInfoItems.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-5 sm:gap-y-0 gap-x-10">
                {clinicInfoItems.map((item) => (
                  <div key={item.label} className="min-w-0">
                    <div className="text-[14px] sm:text-[15px] font-semibold text-slate-900 break-words">
                      {fmt(item.value)}
                    </div>
                    <div className="mt-1 text-[11px] sm:text-xs text-slate-500">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {clinicAddressText && (
              <div className="mt-6 min-w-0">
                <div className="text-[14px] sm:text-[15px] font-semibold text-slate-900 break-words">
                  {clinicAddressText}
                </div>
                <div className="mt-1 text-[11px] sm:text-xs text-slate-500">
                  Clinic Address
                </div>
              </div>
            )}

            {/* Lat / Lng — only shown when backend returns them */}
            {(hasDisplayValue(clinic?.latitude) || hasDisplayValue(clinic?.longitude)) && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { label: "Latitude", value: clinic?.latitude },
                  { label: "Longitude", value: clinic?.longitude },
                ]
                  .filter((c) => hasDisplayValue(c.value))
                  .map(({ label, value }) => {
                    const display = Number(value).toFixed(6);
                    return (
                      <div
                        key={label}
                        title={`Click to copy ${label}`}
                        onClick={() => {
                          navigator.clipboard.writeText(display);
                          addToast({ title: `${label} copied!`, color: "success" });
                        }}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/10/60 px-3 py-2"
                      >
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                            {label}
                          </div>
                          <div className="mt-0.5 font-mono text-[13px] font-medium text-slate-800">
                            {display}
                          </div>
                        </div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 shrink-0 text-primary"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-slate-500">
            No clinic found yet. Use{" "}
            <span className="font-medium">“Add Clinic”</span> to create one.
          </div>
        )}
      </div>


      <AddClinicModal
        isOpen={isAddOpen}
        onOpenChange={onAddOpenChange}
        onCreated={refetch}
        onSubsModalOpen={onSubsModalOpen}
      />

      <UpdateDetails
        isOpen={isUpdateOpen}
        onOpenChange={onUpdateOpenChange}
        clinic={clinic}
        onSaved={refetch}
      />

      <SubscriptionModal
        isOpen={isSubsModalOpen}
        onOpenChange={onSubsModalOpenChange}
      />
    </>
  );
};

export default ClinicDetails;
