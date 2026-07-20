import {
  addToast,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
import { useForm, type Control, type FieldValues } from "react-hook-form";
import InputField from "../../../components/shared/InputField";
import SelectField from "../../../components/shared/SelectField";
import { useUpdateClinicMutation } from "../../../redux/api/clinicApi";
import {
  updateClinicRequestSchema,
  type UpdateClinicRequestDto,
} from "../../../schemas/clinic";
import CitySelector from "../../../components/shared/CitySelector";
import TextareaField from "../../../components/shared/TextareaField";

interface EditClinicModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  initialData: {
    clinicName: string;
    clinicPhone: string;
    Tagline: string;
    clinicAddress: string;
    State: string;
    City: string;
    ZipCode: number;
    status: string;
  };
}

const EditClinicModal: React.FC<EditClinicModalProps> = ({
  isOpen,
  onOpenChange,
  clinicId,
  initialData,
}) => {
  const [updateClinic, { isLoading }] = useUpdateClinicMutation();

  const { control, handleSubmit, reset, setValue } = useForm<
    UpdateClinicRequestDto & { city?: string }
  >({
    resolver: zodResolver(updateClinicRequestSchema),
    defaultValues: {
      city: initialData.City,
      clinicDetails: {
        clinicName: initialData.clinicName,
        clinicPhone: initialData.clinicPhone,
        Tagline: initialData.Tagline,
        clinicAddress: initialData.clinicAddress,
        State: initialData.State,
        City: initialData.City,
        ZipCode: initialData.ZipCode,
        status: initialData.status as any,
      },
    },
  });

  const rhfControl = control as unknown as Control<FieldValues, FieldValues>;

  const handleCityStateChange = (city: string, state: string) => {
    setValue("clinicDetails.City", city);
    setValue("clinicDetails.State", state);

    if (!city || !state) {
      setValue("clinicDetails.ZipCode", undefined as any);
      return;
    }

    void (async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&city=${encodeURIComponent(
          city,
        )}&state=${encodeURIComponent(state)}&country=India`;

        const res = await fetch(url, {
          headers: {
            "Accept-Language": "en-IN,en;q=0.9",
            "User-Agent": "MediSetu-Clinic-Admin",
          },
        });

        const data = await res.json();
        const addr = data?.[0]?.address;
        const zipRaw = addr?.postcode || "";

        const zipNum = zipRaw ? Number.parseInt(zipRaw, 10) : NaN;

        if (Number.isFinite(zipNum)) {
          setValue("clinicDetails.ZipCode", zipNum as any);
        }
      } catch (e) {
        console.error("Failed to auto-detect pincode from city/state:", e);
      }
    })();
  };

  useEffect(() => {
    if (isOpen) {
      reset({
        city: initialData.City,
        clinicDetails: {
          clinicName: initialData.clinicName,
          Tagline: initialData.Tagline,
          clinicAddress: initialData.clinicAddress,
          State: initialData.State,
          City: initialData.City,
          ZipCode: initialData.ZipCode,
          status: initialData.status as any,
        },
      });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: UpdateClinicRequestDto & { city?: string }) => {
    try {
      const { city, ...payload } = data;
      const res = await updateClinic({ clinicId, body: payload }).unwrap();
      if (res.success) {
        addToast({
          title: "Success",
          description: "Clinic details updated successfully",
          color: "success",
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to update clinic details",
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
      size="sm"
      placement="center"
    >
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader className="flex flex-col gap-1">
            Update Clinic Status
          </ModalHeader>

          <ModalBody className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 items-start">
              <InputField
                control={control}
                name="clinicDetails.clinicName"
                label="Clinic Name"
                placeholder="Enter clinic name"
                labelPlacement="outside"
                className="hidden"
              />
              <InputField
                control={control}
                name="clinicDetails.clinicPhone"
                label="Clinic Phone"
                placeholder="Enter clinic phone number"
                minLength={10}
                maxLength={10}
                labelPlacement="outside"
                className="hidden"
              />
              <SelectField
                control={control}
                name="clinicDetails.status"
                label="Status"
                className="w-80"
                options={[
                  { label: "Active", value: "Active" },
                  { label: "Inactive", value: "Inactive" },
                  { label: "Blocked", value: "Blocked" },
                ]}
              />
            </div>

            <InputField
              control={control}
              name="clinicDetails.Tagline"
              label="Tagline"
              placeholder="Enter tagline"
              className="hidden"
            />

            <TextareaField
              control={control}
              name="clinicDetails.clinicAddress"
              label="Address"
              placeholder="Enter clinic address"
              className="hidden"
            />

            <InputField
              control={control}
              name="clinicDetails.ZipCode"
              label="Zip Code"
              placeholder="Enter zip code"
              type="number"
              className="hidden"
            />

            <div className="hidden">
              <CitySelector
                control={rhfControl}
                onCityStateChange={handleCityStateChange}
              />
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button color="primary" type="submit" isLoading={isLoading}>
              Save Changes
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default EditClinicModal;
