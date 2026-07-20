import { useForm, type Control, type FieldValues } from "react-hook-form";
import { useCreateClinicMutation } from "../../redux/api/clinicApi";
import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import type { ClinicFormValues } from "./ClinicDetails";
import InputField from "../../components/shared/InputField";
import TextareaField from "../../components/shared/TextareaField";
import CitySelector from "../../components/shared/CitySelector";
import InteractiveMap from "../../components/shared/InteractiveMap";
import { useDropzone } from "react-dropzone";

import React from "react";
import { FiCamera, FiNavigation, FiUploadCloud } from "react-icons/fi";



type AddClinicProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  onSubsModalOpen?: () => void;
};

const AddClinicModal = ({
  isOpen,
  onOpenChange,
  onCreated,
  onSubsModalOpen,
}: AddClinicProps) => {
  const [createClinic, { isLoading }] = useCreateClinicMutation();
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const {
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<ClinicFormValues>({
    defaultValues: {
      clinicName: "",
      Tagline: "",
      ZipCode: "",
      clinicAddress: "",
      City: "",
      State: "",
      Country: "",
      clinicLogo: "",
      latitude: null,
      longitude: null,
    },
  });

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
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setSelectedFile(file);
  };

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    multiple: false,
  });

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

  const handleLocationChange = (
    location: { lat: number; lng: number },
    addressDetails: { address: string; city: string; state: string; pincode: string }
  ) => {
    setValue("latitude", location.lat, { shouldDirty: true });
    setValue("longitude", location.lng, { shouldDirty: true });
    if (addressDetails.address) setValue("clinicAddress", addressDetails.address, { shouldValidate: true, shouldDirty: true });
    if (addressDetails.city) setValue("City", addressDetails.city, { shouldValidate: true, shouldDirty: true });
    if (addressDetails.state) setValue("State", addressDetails.state, { shouldValidate: true, shouldDirty: true });
    if (addressDetails.pincode) setValue("ZipCode", addressDetails.pincode, { shouldValidate: true, shouldDirty: true });
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
      if (values.ZipCode) {
        formData.append("clinicDetails[ZipCode]", values.ZipCode);
      }
      if (values.latitude) {
        formData.append("clinicDetails[latitude]", String(values.latitude));
      }
      if (values.longitude) {
        formData.append("clinicDetails[longitude]", String(values.longitude));
      }
      if (selectedFile) {
        formData.append("clinicLogo", selectedFile);
      }

      await createClinic(formData).unwrap();

      addToast({
        title: "Clinic created",
        description: "Clinic has been created successfully.",
        color: "success",
      });

      onCreated?.();
      reset();
      setPhotoPreview(null);
      setSelectedFile(null);
      onOpenChange(false);
      onSubsModalOpen?.();
    } catch (error) {
      console.error("Create clinic failed:", error);
      addToast({
        title: "Creation failed",
        description: "Unable to create clinic. Please try again.",
        color: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onOpenChange(false);
          setPhotoPreview(null);
          setSelectedFile(null);
        }
      }}
      size="2xl"
      placement="center"
      className="mx-2 sm:mx-0"
    >
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader className="flex flex-col gap-1 text-base sm:text-lg">
            Add Clinic
          </ModalHeader>

          <ModalBody className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Logo Upload Section */}
            <div className="flex flex-col items-center gap-4 py-2">
              <div
                {...getRootProps()}
                className={`relative group cursor-pointer h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-dashed transition-all flex items-center justify-center overflow-hidden
                  ${isDragActive
                    ? "border-primary bg-primary/5 scale-105"
                    : "border-gray-300 hover:border-primary"
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <FiCamera className="text-white text-xl" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <FiUploadCloud className="text-2xl mb-1" />
                    <span className="text-[10px] text-center px-2">
                      Upload Logo
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-gray-500">
                JPG, PNG or WebP. Max 2MB.
              </p>
            </div>

            <InputField
              control={rhfControl}
              label="Clinic Name"
              name="clinicName"
              rules={{ required: "Clinic name is required" }}
            />
            <InputField control={rhfControl} label="Tagline" name="Tagline" />

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

              {isOpen && (
                <InteractiveMap
                  initialLocation={null}
                  initialAddress={null}
                  onLocationChange={handleLocationChange}
                />
              )}

              <TextareaField
                control={rhfControl}
                label="Clinic Address"
                name="clinicAddress"
                rules={{ required: "Clinic address is required" }}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CitySelector
                  control={rhfControl}
                  onCityStateChange={(city: string, state: string) => {
                    setValue("City", city);
                    setValue("State", state);
                  }}
                />
                <InputField
                  control={rhfControl}
                  name="State"
                  label="State"
                  isReadOnly
                  autoComplete="off"
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

          <ModalFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="light"
              onPress={() => onOpenChange(false)}
              disabled={isLoading || isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color="primary"
              isLoading={isLoading || isSubmitting}
              className="w-full sm:w-auto"
            >
              Create Clinic
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default AddClinicModal;
