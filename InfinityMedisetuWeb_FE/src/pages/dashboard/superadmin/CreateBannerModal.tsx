import {
  addToast,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
} from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FiAlertCircle, FiUpload } from "react-icons/fi";
import InputField from "../../../components/shared/InputField";
import AppButton from "../../../components/shared/AppButton";
import { getAuthToken } from "../../../utils/auth";
import {
  useCreateBannerMutation,
  useUpdateBannerMutation,
  type Banner,
} from "../../../redux/api/bannerApi";
import {
  bannerFormSchema,
  BannerTypeEnum,
  BannerPriorityEnum,
  BannerPlacementEnum,
  type BannerFormValues,
} from "../../../schemas/banner";

// ── Label maps ────────────────────────────────────────────────────────────────

const BANNER_TYPE_LABELS: Record<string, string> = {
  Referral: "Referral",
  MedicineSpotlight: "Medicine Spotlight",
  OperationalAlert: "Operational Alert",
  FeatureAnnouncement: "Feature Announcement",
  PromotionalOffer: "Promotional Offer",
  SystemAlert: "System Alert",
};

const PRIORITY_LABELS: Record<string, string> = {
  P0: "P0 — Critical",
  P1: "P1 — Operational",
  P2: "P2 — Clinical",
  P3: "P3 — Promotional",
};

const PLACEMENT_LABELS: Record<string, string> = {
  DASHBOARD_TOP: "Dashboard Top",
  DASHBOARD_SIDEBAR: "Dashboard Sidebar",
  INSIGHTS_WIDGET: "Insights Widget",
  APPOINTMENT_HEADER: "Appointment Header",
  LOGIN_PAGE: "Login Page",
  BILLING_PAGE: "Billing Page",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface CreateBannerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: Banner | null;
}

// ── Helper ────────────────────────────────────────────────────────────────────

const toDateInputValue = (iso?: string | null) =>
  iso ? iso.slice(0, 10) : "";

// ── Component ─────────────────────────────────────────────────────────────────

const CreateBannerModal: React.FC<CreateBannerModalProps> = ({
  isOpen,
  onOpenChange,
  editData,
}) => {
  const [createBanner, { isLoading: isCreating }] = useCreateBannerMutation();
  const [updateBanner, { isLoading: isUpdating }] = useUpdateBannerMutation();
  const isLoading = isCreating || isUpdating;

  // Image upload refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(bannerFormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      bannerType: "FeatureAnnouncement" as const,
      priority: "P2" as const,
      placement: "DASHBOARD_TOP" as const,
      startDate: "",
      endDate: "",
      ctaText: "",
      ctaUrl: "",
      imageUrl: "",
      thumbnailUrl: "",
      imageAlt: "",
      targetRoles: [],
      targetClinics: [],
      targetSpecialties: [],
      isSponsored: false,
      isDismissible: true, // Default to true so banners are dismissible by default
      isActive: true, // Default to true so banners are active by default
      isCritical: false,
      displayOrder: 0,
    } satisfies Partial<BannerFormValues>,
  });

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        reset({
          title: editData.title ?? "",
          description: editData.description ?? "",
          bannerType: editData.bannerType as BannerFormValues["bannerType"],
          priority: editData.priority as BannerFormValues["priority"],
          placement: editData.placement as BannerFormValues["placement"],
          startDate: toDateInputValue(editData.startDate),
          endDate: toDateInputValue(editData.endDate),
          ctaText: editData.ctaText ?? "",
          ctaUrl: editData.ctaUrl ?? "",
          imageUrl: editData.imageUrl ?? "",
          thumbnailUrl: editData.thumbnailUrl ?? "",
          imageAlt: editData.imageAlt ?? "",
          targetRoles: editData.targetRoles ?? [],
          targetClinics: editData.targetClinics ?? [],
          targetSpecialties: editData.targetSpecialties ?? [],
          isSponsored: editData.isSponsored,
          isDismissible: editData.isDismissible,
          isActive: editData.isActive,
          isCritical: editData.isCritical,
          displayOrder: editData.displayOrder,
        });
      } else {
        reset({
          title: "",
          description: "",
          bannerType: "FeatureAnnouncement",
          priority: "P2",
          placement: "DASHBOARD_TOP",
          startDate: "",
          endDate: "",
          ctaText: "",
          ctaUrl: "",
          imageUrl: "",
          thumbnailUrl: "",
          imageAlt: "",
          targetRoles: [],
          targetClinics: [],
          targetSpecialties: [],
          isSponsored: false,
          isDismissible: true, // Default to true so banners are dismissible by default
          isActive: true, // Default to true so banners are active by default
          isCritical: false,
          displayOrder: 0,
        });
      }
    }
  }, [editData, reset, isOpen]);

  const onSubmit = async (data: BannerFormValues): Promise<void> => {
    try {
      if (editData) {
        await updateBanner({ id: editData.id, body: data }).unwrap();
        addToast({ title: "Success", description: "Banner updated successfully.", color: "success" });
      } else {
        await createBanner(data).unwrap();
        addToast({ title: "Success", description: "Banner created successfully.", color: "success" });
      }
      onOpenChange(false);
    } catch (err: any) {
      const status = err?.status ?? err?.originalStatus;
      const msg =
        status === 409
          ? "A banner with this configuration already exists."
          : err?.data?.message ?? "Failed to save banner. Please try again.";
      addToast({ title: "Error", description: msg, color: "danger" });
    }
  };

  const onInvalid = (errs: any) => {
    const first = Object.values(errs)
      .map((e: any) => e?.message)
      .filter(Boolean)[0];
    if (first) addToast({ title: "Validation Error", description: first as string, color: "danger" });
  };

  // Handle image file upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: "imageUrl" | "thumbnailUrl") => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      addToast({ 
        title: "Error", 
        description: "Invalid file type. Allowed: JPEG, PNG, WebP, SVG, GIF", 
        color: "danger" 
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast({ 
        title: "Error", 
        description: "File size must be less than 5MB", 
        color: "danger" 
      });
      return;
    }

    try {
      fieldName === "imageUrl" ? setUploadingImage(true) : setUploadingThumbnail(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("image", file);

      // Get auth token using the project's utility function
      const token = getAuthToken();
      
      if (!token) {
        throw new Error("Authorization token not found. Please login first.");
      }

      // Upload to backend endpoint using environment variable
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
      const response = await fetch(`${baseUrl}/banners/upload/image`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          // Do NOT set Content-Type - let browser set it for multipart
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Upload failed");
      }

      // Use the returned URL from the response
      const imageUrl = data.data?.url;
      if (imageUrl) {
        setValue(fieldName, imageUrl);
        addToast({ 
          title: "Success", 
          description: "Image uploaded successfully", 
          color: "success" 
        });
      } else {
        throw new Error("No URL returned from server");
      }
    } catch (err: any) {
      console.error("Image upload error:", err);
      const errorMessage = err.message || "Failed to upload image. Please try again.";
      addToast({ 
        title: "Error", 
        description: errorMessage, 
        color: "danger" 
      });
    } finally {
      fieldName === "imageUrl" ? setUploadingImage(false) : setUploadingThumbnail(false);
      // Reset input
      if (event.target) event.target.value = "";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="2xl"
      scrollBehavior="inside"
      className="rounded-3xl"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center justify-between px-8 pt-8 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <FiAlertCircle className="text-primary" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900">
                  {editData ? "Edit Banner" : "Create Banner"}
                </h4>
              </div>
            </ModalHeader>

            <ModalBody className="px-8 pb-2">
              <form id="banner-form" onSubmit={handleSubmit(onSubmit, onInvalid)}>
                <div className="space-y-5">

                  {/* Title */}
                  <InputField
                    name="title"
                    label="Title"
                    placeholder="e.g. Scheduled Maintenance on Dec 25"
                    control={control}
                    error={errors.title?.message}
                    isRequired
                  />

                  {/* Description */}
                  <InputField
                    name="description"
                    label="Description"
                    placeholder="Optional supporting text..."
                    control={control}
                    error={errors.description?.message}
                    isOptional
                  />

                  {/* Type / Priority */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-slate-600">
                        Banner Type <span className="text-danger">*</span>
                      </label>
                      <Controller
                        name="bannerType"
                        control={control}
                        render={({ field }) => (
                          <select
                            {...field}
                            className="h-11 w-full rounded-full border border-[#e4e4e7] bg-white px-4 text-sm text-slate-900 focus:border-primary focus:outline-none"
                          >
                            {BannerTypeEnum.options.map((v) => (
                              <option key={v} value={v}>{BANNER_TYPE_LABELS[v] ?? v}</option>
                            ))}
                          </select>
                        )}
                      />
                      {errors.bannerType && <p className="mt-1 text-xs text-danger">{errors.bannerType.message}</p>}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-slate-600">
                        Priority <span className="text-danger">*</span>
                      </label>
                      <Controller
                        name="priority"
                        control={control}
                        render={({ field }) => (
                          <select
                            {...field}
                            className="h-11 w-full rounded-full border border-[#e4e4e7] bg-white px-4 text-sm text-slate-900 focus:border-primary focus:outline-none"
                          >
                            {BannerPriorityEnum.options.map((v) => (
                              <option key={v} value={v}>{PRIORITY_LABELS[v] ?? v}</option>
                            ))}
                          </select>
                        )}
                      />
                      {errors.priority && <p className="mt-1 text-xs text-danger">{errors.priority.message}</p>}
                    </div>
                  </div>

                  {/* Placement */}
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-slate-600">
                      Placement <span className="text-danger">*</span>
                    </label>
                    <Controller
                      name="placement"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="h-11 w-full rounded-full border border-[#e4e4e7] bg-white px-4 text-sm text-slate-900 focus:border-primary focus:outline-none"
                        >
                          {BannerPlacementEnum.options.map((v) => (
                            <option key={v} value={v}>{PLACEMENT_LABELS[v] ?? v}</option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.placement && <p className="mt-1 text-xs text-danger">{errors.placement.message}</p>}
                  </div>

                  {/* Start / End Date */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputField
                      name="startDate"
                      label="Start Date"
                      type="date"
                      control={control}
                      error={errors.startDate?.message}
                      isRequired
                    />
                    <InputField
                      name="endDate"
                      label="End Date"
                      type="date"
                      control={control}
                      error={errors.endDate?.message}
                      isRequired
                    />
                  </div>

                  {/* CTA */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputField
                      name="ctaText"
                      label="CTA Button Text"
                      placeholder="e.g. Learn More"
                      control={control}
                      error={errors.ctaText?.message}
                      isOptional
                    />
                    <InputField
                      name="ctaUrl"
                      label="CTA URL"
                      placeholder="https://..."
                      control={control}
                      error={errors.ctaUrl?.message}
                      isOptional
                    />
                  </div>

                  {/* Image Fields */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <h5 className="mb-4 text-[13px] font-semibold text-slate-700">Banner Images (Optional)</h5>
                    <div className="space-y-4">
                      {/* Full-Size Image */}
                      <div>
                        <label className="mb-2 block text-[13px] font-medium text-slate-600">
                          Full-Size Image
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <InputField
                              name="imageUrl"
                              label="Full-Size Image"
                              placeholder="Paste URL or upload image"
                              control={control}
                              error={errors.imageUrl?.message}
                              isOptional
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={uploadingImage || isLoading}
                            className="mt-6 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                            title="Upload image"
                          >
                            {uploadingImage ? (
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            ) : (
                              <FiUpload className="text-slate-600" />
                            )}
                          </button>
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, "imageUrl")}
                            className="hidden"
                          />
                        </div>
                      </div>

                      {/* Thumbnail Image */}
                      <div>
                        <label className="mb-2 block text-[13px] font-medium text-slate-600">
                          Thumbnail Image
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <InputField
                              name="thumbnailUrl"
                              label="Thumbnail Image"
                              placeholder="Paste URL or upload image"
                              control={control}
                              error={errors.thumbnailUrl?.message}
                              isOptional
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => thumbnailInputRef.current?.click()}
                            disabled={uploadingThumbnail || isLoading}
                            className="mt-6 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                            title="Upload thumbnail"
                          >
                            {uploadingThumbnail ? (
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            ) : (
                              <FiUpload className="text-slate-600" />
                            )}
                          </button>
                          <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, "thumbnailUrl")}
                            className="hidden"
                          />
                        </div>
                      </div>

                      {/* Image Alt Text */}
                      <InputField
                        name="imageAlt"
                        label="Image Alt Text"
                        placeholder="Describe what's in the image"
                        control={control}
                        error={errors.imageAlt?.message}
                        isOptional
                      />
                    </div>
                  </div>

                  {/* Display Order */}
                  <InputField
                    name="displayOrder"
                    label="Display Order"
                    type="number"
                    placeholder="0"
                    control={control}
                    error={errors.displayOrder?.message}
                    isOptional
                    coerceNumber
                  />

                  {/* Toggles */}
                  <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">
                    {(
                      [
                        { name: "isActive" as const, label: "Active" },
                        { name: "isSponsored" as const, label: "Sponsored" },
                        { name: "isCritical" as const, label: "Critical" },
                      ] as const
                    ).map(({ name, label }) => (
                      <Controller
                        key={name}
                        name={name}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <span className="text-[13px] font-medium text-slate-700">{label}</span>
                            <Switch
                              size="sm"
                              color="primary"
                              isSelected={field.value as boolean}
                              onValueChange={field.onChange}
                            />
                          </div>
                        )}
                      />
                    ))}
                  </div>
                </div>
              </form>
            </ModalBody>

            <ModalFooter className="flex justify-end gap-3 px-8 pb-8 pt-4">
              <AppButton
                text="Cancel"
                buttonVariant="outlined"
                className="h-11 w-28"
                onPress={onClose}
              />
              <AppButton
                type="submit"
                form="banner-form"
                text={isLoading ? (editData ? "Updating..." : "Creating...") : editData ? "Save Changes" : "Create Banner"}
                className="h-11 w-40"
                isDisabled={isLoading || (!!editData && !isDirty)}
                isLoading={isLoading}
              />
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CreateBannerModal;
