import {
  addToast,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  FiInfo,
  FiCalendar,
  FiLink,
  FiImage,
  FiUsers,
  FiSettings,
  FiEye,
  FiZap,
  FiCheck,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router";
import PageBackNav from "../../../components/shared/PageBackNav";
import InputField from "../../../components/shared/InputField";
import SelectField, { type Option } from "../../../components/shared/SelectField";
import FigmaFileUpload from "../../../components/shared/FigmaFileUpload";
import AppButton from "../../../components/shared/AppButton";
import BannerCard from "../../../components/banners/BannerCard";
import { getAuthToken } from "../../../utils/auth";
import {
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
  useGetBannerByIdQuery,
  type Banner,
} from "../../../redux/api/bannerApi";
import { useGetAvailableClinicsQuery } from "../../../redux/api/clinicApi";
import { DOCTOR_SPECIALITIES } from "../../../constants/specialities";
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

// Canonical role list (mirrors src/schemas/access.ts assignRoleSchema enum)
const ROLE_OPTIONS: Option[] = [
  "Admin",
  "User",
  "Super_Admin",
  "Doctor",
  "Receptionist",
  "Nurse",
  "Patient",
  "Pharmacist",
  "Lab_Assistant",
  "Radiologist",
].map((role) => ({ label: role.replace(/_/g, " "), value: role }));

const SPECIALTY_OPTIONS: Option[] = DOCTOR_SPECIALITIES.map((s) => ({
  label: s,
  value: s,
}));

// Quick-start templates — purely client-side convenience that pre-fills a
// subset of the form via setValue(); no schema/backend changes involved.
interface BannerTemplate {
  key: string;
  label: string;
  description: string;
  priority: "P0" | "P1" | "P2" | "P3";
  bannerType: BannerFormValues["bannerType"];
  title: string;
  bodyDescription: string;
  ctaText: string;
  isCritical?: boolean;
}

const BANNER_TEMPLATES: BannerTemplate[] = [
  {
    key: "maintenance",
    label: "Scheduled Maintenance",
    description: "Planned downtime notice",
    priority: "P1",
    bannerType: "SystemAlert",
    title: "Scheduled Maintenance: [Date, Time Window]",
    bodyDescription: "The platform will undergo scheduled maintenance. Some services may be briefly unavailable during this window.",
    ctaText: "Learn More",
  },
  {
    key: "feature",
    label: "New Feature",
    description: "Announce something new",
    priority: "P2",
    bannerType: "FeatureAnnouncement",
    title: "New: [Feature Name]",
    bodyDescription: "We've just shipped [feature name] — here's what's new and how it helps your workflow.",
    ctaText: "Explore Now",
  },
  {
    key: "promo",
    label: "Promotional Offer",
    description: "Time-limited discount",
    priority: "P3",
    bannerType: "PromotionalOffer",
    title: "Limited Time Offer: [Offer Details]",
    bodyDescription: "Enjoy [discount/benefit] for a limited time. Offer ends [date].",
    ctaText: "Claim Offer",
  },
  {
    key: "urgent",
    label: "Urgent System Alert",
    description: "Critical, needs attention now",
    priority: "P0",
    bannerType: "SystemAlert",
    title: "Urgent: [Issue Summary]",
    bodyDescription: "We're aware of [issue] and are actively working on a fix. We'll update this notice once resolved.",
    ctaText: "View Details",
    isCritical: true,
  },
  {
    key: "referral",
    label: "Referral Program",
    description: "Invite & earn rewards",
    priority: "P3",
    bannerType: "Referral",
    title: "Refer & Earn Rewards",
    bodyDescription: "Invite a colleague to Infinity MediSetu and both of you earn rewards once they onboard.",
    ctaText: "Refer Now",
  },
];

const DEFAULT_VALUES = {
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
  isDismissible: true,
  isActive: true,
  isCritical: false,
  displayOrder: 0,
} satisfies Partial<BannerFormValues>;

const toDateInputValue = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");

// Boxy (rounded-lg, bordered) input skin — mirrors AddPatient.tsx's local
// override of the shared InputField/SelectField's default pill (radius="full").
const FORM_INPUT_SKIN = `
  [&_[data-slot='label']]:text-[12px]
  [&_[data-slot='label']]:font-semibold
  [&_[data-slot='label']]:!text-slate-900
  dark:[&_[data-slot='label']]:!text-slate-200
  dark:[&_label]:!text-slate-200

  [&_[data-slot='input-wrapper']]:!rounded-lg
  [&_[data-slot='input-wrapper']]:!border
  [&_[data-slot='input-wrapper']]:!border-gray-200
  [&_[data-slot='input-wrapper']]:!bg-white
  [&_[data-slot='input-wrapper']]:!shadow-none
  [&_[data-slot='input-wrapper']]:!h-11
  [&_[data-slot='input-wrapper']]:!px-4
  dark:[&_[data-slot='input-wrapper']]:!bg-[#0f1728]
  dark:[&_[data-slot='input-wrapper']]:!border-[#38445a]

  [&_[data-slot='trigger']]:!rounded-lg
  [&_[data-slot='trigger']]:!border
  [&_[data-slot='trigger']]:!border-gray-200
  [&_[data-slot='trigger']]:!bg-white
  [&_[data-slot='trigger']]:!shadow-none
  [&_[data-slot='trigger']]:!h-11
  [&_[data-slot='trigger']]:!px-4
  dark:[&_[data-slot='trigger']]:!bg-[#0f1728]
  dark:[&_[data-slot='trigger']]:!border-[#38445a]

  [&_[data-slot='input']]:!text-[13px]
  [&_[data-slot='helper-wrapper']]:min-h-[18px]
  dark:[&_[data-slot='input']]:!text-slate-100
`;

// Text limits — mirror schemas/banner.ts's bannerFormSchema max lengths exactly.
const TITLE_MAX = 255;
const DESCRIPTION_MAX = 2000;
const CTA_TEXT_MAX = 100;
const IMAGE_ALT_MAX = 255;

const NATIVE_SELECT_CLASS =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-slate-900 focus:border-primary focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 dark:bg-[#0f1728] dark:border-[#38445a] dark:text-slate-100";

// ── Section header (mirrors PatientFormSections.tsx's local SectionHeader) ────

const SECTION_TONES = {
  teal: "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
} as const;

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  tone?: keyof typeof SECTION_TONES;
}> = ({ icon, title, subtitle, tone = "teal" }) => (
  <div className="mb-4 flex items-center gap-3 sm:mb-5">
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] sm:h-9 sm:w-9 sm:text-[16px] ${SECTION_TONES[tone]}`}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <h2 className="text-[13px] font-semibold text-slate-800 dark:text-white sm:text-[14px]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 sm:text-[12px]">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);

const FieldCounter: React.FC<{ control: any; name: string; max: number }> = ({ control, name, max }) => {
  const value = useWatch({ control, name }) as string | undefined;
  const length = value?.length ?? 0;
  return (
    <p className={`mt-1 text-right text-[11px] ${length > max ? "text-danger" : "text-slate-400 dark:text-slate-500"}`}>
      {length}/{max}
    </p>
  );
};

const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5 lg:p-6 dark:bg-[#111726] dark:border-[#273244]">
    {children}
  </section>
);

// ── Component ─────────────────────────────────────────────────────────────────

const BannerFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bannerId = searchParams.get("id") ?? undefined;
  const readOnly = searchParams.get("mode") === "view";
  const isEdit = !!bannerId;

  const { data: editData } = useGetBannerByIdQuery(bannerId ?? "", { skip: !bannerId });

  const [createBanner, { isLoading: isCreating }] = useCreateBannerMutation();
  const [updateBanner, { isLoading: isUpdating }] = useUpdateBannerMutation();
  const [deleteBanner, { isLoading: isDeleting }] = useDeleteBannerMutation();
  const isLoading = isCreating || isUpdating;

  const { isOpen: isDeleteOpen, onOpen: openDelete, onOpenChange: onDeleteOpenChange } = useDisclosure();

  const handleDeleteConfirm = async () => {
    if (!bannerId) return;
    try {
      await deleteBanner(bannerId).unwrap();
      addToast({ title: "Deleted", description: "Banner deleted successfully.", color: "success" });
      navigate("/banners");
    } catch (err: any) {
      addToast({ title: "Error", description: err?.data?.message ?? "Failed to delete banner.", color: "danger" });
    }
  };

  const { data: clinicsData } = useGetAvailableClinicsQuery({ page: 1, limit: 1000 });
  const clinicOptions: Option[] = (clinicsData?.data?.data ?? []).map((c) => ({
    label: c.clinicName,
    value: c.id,
  }));

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const { isOpen: isPreviewOpen, onOpen: openPreview, onOpenChange: onPreviewOpenChange } = useDisclosure();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(bannerFormSchema),
    mode: "onChange",
    defaultValues: DEFAULT_VALUES,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const applyTemplate = (template: BannerTemplate) => {
    setSelectedTemplate(template.key);
    setValue("title", template.title, { shouldDirty: true, shouldValidate: true });
    setValue("description", template.bodyDescription, { shouldDirty: true, shouldValidate: true });
    setValue("bannerType", template.bannerType, { shouldDirty: true, shouldValidate: true });
    setValue("priority", template.priority, { shouldDirty: true, shouldValidate: true });
    setValue("ctaText", template.ctaText, { shouldDirty: true, shouldValidate: true });
    if (template.isCritical) {
      setValue("isCritical", true, { shouldDirty: true, shouldValidate: true });
    }
  };

  useEffect(() => {
    if (!editData) return;
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
  }, [editData, reset]);

  const onSubmit = async (data: BannerFormValues): Promise<void> => {
    try {
      if (bannerId) {
        await updateBanner({ id: bannerId, body: data }).unwrap();
        addToast({ title: "Success", description: "Banner updated successfully.", color: "success" });
      } else {
        await createBanner(data).unwrap();
        addToast({ title: "Success", description: "Banner created successfully.", color: "success" });
      }
      navigate("/banners");
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

  // Uploads the file immediately and returns the hosted URL — required because
  // imageUrl/thumbnailUrl are plain string fields in the JSON payload, not multipart.
  const uploadImage = async (
    file: File,
    setUploading: (v: boolean) => void,
  ): Promise<string | null> => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];
    if (!validTypes.includes(file.type)) {
      addToast({ title: "Error", description: "Invalid file type. Allowed: JPEG, PNG, WebP, SVG, GIF", color: "danger" });
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast({ title: "Error", description: "File size must be less than 5MB", color: "danger" });
      return null;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("image", file);

      const token = getAuthToken();
      if (!token) throw new Error("Authorization token not found. Please login first.");

      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
      const response = await fetch(`${baseUrl}/banners/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Upload failed");
      }

      const url = data.data?.url;
      if (!url) throw new Error("No URL returned from server");

      addToast({ title: "Success", description: "Image uploaded successfully", color: "success" });
      return url;
    } catch (err: any) {
      console.error("Image upload error:", err);
      addToast({ title: "Error", description: err.message || "Failed to upload image. Please try again.", color: "danger" });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const pageTitle = readOnly ? "View Banner" : isEdit ? "Edit Banner" : "Create Banner";

  // ── Live preview: reuses the exact BannerCard used in production, fed from
  // in-progress form values (BannerDisplay/BannerProvider can't be reused here
  // since they only fetch persisted, eligible banners — not an unsaved draft).
  const previewValues = useWatch({ control });
  const previewBanner: Banner = {
    id: "preview",
    title: previewValues.title || "",
    description: previewValues.description || undefined,
    bannerType: previewValues.bannerType ?? DEFAULT_VALUES.bannerType,
    priority: previewValues.priority ?? DEFAULT_VALUES.priority,
    placement: previewValues.placement ?? DEFAULT_VALUES.placement,
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    ctaText: previewValues.ctaText || undefined,
    ctaUrl: previewValues.ctaUrl || undefined,
    targetRoles: null,
    targetClinics: null,
    targetSpecialties: null,
    isSponsored: !!previewValues.isSponsored,
    isDismissible: !!previewValues.isDismissible,
    isActive: true,
    status: "Active",
    displayOrder: 0,
    createdAt: new Date().toISOString(),
    imageUrl: previewValues.imageUrl || undefined,
    thumbnailUrl: previewValues.thumbnailUrl || undefined,
    imageAlt: previewValues.imageAlt || undefined,
    isCritical: !!previewValues.isCritical,
  };
  const previewIsTopBar = previewBanner.placement === "LOGIN_PAGE";
  const previewIsCompact = previewBanner.placement === "DASHBOARD_SIDEBAR";

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-slate-50/70 dark:bg-transparent">
      <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
        {/* Header / back nav */}
        <h1 className="mb-2 text-[22px] font-semibold text-slate-900 dark:text-white sm:text-2xl">
          {pageTitle}
        </h1>
        <div className="mb-5">
          <PageBackNav
            backTo="/banners"
            crumbs={[{ label: "Broadcast Hub", to: "/banners" }, { label: pageTitle }]}
          />
        </div>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className={`space-y-4 sm:space-y-5 ${FORM_INPUT_SKIN}`}
        >
          {/* Quick Start — client-side templates that pre-fill common fields (create mode only) */}
          {!isEdit && (
            <Section>
              <SectionHeader icon={<FiZap />} title="Quick Start" subtitle="Pick a template to pre-fill the form, or start blank below" tone="purple" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {BANNER_TEMPLATES.map((template) => {
                  const isActive = selectedTemplate === template.key;
                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className={`relative rounded-lg border-2 p-2.5 text-left transition-all focus:outline-none ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 bg-white hover:border-gray-300 dark:border-[#38445a] dark:bg-[#0f1728] dark:hover:border-slate-500"
                      }`}
                    >
                      <div
                        className="mb-1.5 h-1 w-8 rounded-full"
                        style={{ background: `var(--color-banner-${template.priority.toLowerCase()})` }}
                      />
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-white leading-tight">
                        {template.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                        {template.description}
                      </p>
                      {isActive && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                          <FiCheck size={9} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Basic Information */}
          <Section>
            <SectionHeader icon={<FiInfo />} title="Basic Information" subtitle="What this banner says" tone="teal" />
            <div className="space-y-4">
              <div>
                <InputField
                  name="title"
                  label="Title"
                  placeholder="e.g. Scheduled Maintenance on Dec 25"
                  control={control}
                  error={errors.title?.message}
                  isRequired
                  isDisabled={readOnly}
                  maxLength={TITLE_MAX}
                />
                <FieldCounter control={control} name="title" max={TITLE_MAX} />
              </div>
              <div>
                <InputField
                  name="description"
                  label="Description"
                  placeholder="Optional supporting text..."
                  control={control}
                  error={errors.description?.message}
                  isOptional
                  isDisabled={readOnly}
                  maxLength={DESCRIPTION_MAX}
                />
                <FieldCounter control={control} name="description" max={DESCRIPTION_MAX} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-slate-900 dark:text-slate-200">
                    Banner Type <span className="text-danger">*</span>
                  </label>
                  <Controller
                    name="bannerType"
                    control={control}
                    render={({ field }) => (
                      <select {...field} disabled={readOnly} className={NATIVE_SELECT_CLASS}>
                        {BannerTypeEnum.options.map((v) => (
                          <option key={v} value={v}>{BANNER_TYPE_LABELS[v] ?? v}</option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.bannerType && <p className="mt-1 text-xs text-danger">{errors.bannerType.message}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-slate-900 dark:text-slate-200">
                    Priority <span className="text-danger">*</span>
                  </label>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <select {...field} disabled={readOnly} className={NATIVE_SELECT_CLASS}>
                        {BannerPriorityEnum.options.map((v) => (
                          <option key={v} value={v}>{PRIORITY_LABELS[v] ?? v}</option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.priority && <p className="mt-1 text-xs text-danger">{errors.priority.message}</p>}
                </div>
              </div>
            </div>
          </Section>

          {/* Scheduling & Placement */}
          <Section>
            <SectionHeader icon={<FiCalendar />} title="Scheduling & Placement" subtitle="Where and when it shows" tone="blue" />
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-slate-900 dark:text-slate-200">
                  Placement <span className="text-danger">*</span>
                </label>
                <Controller
                  name="placement"
                  control={control}
                  render={({ field }) => (
                    <select {...field} disabled={readOnly} className={NATIVE_SELECT_CLASS}>
                      {BannerPlacementEnum.options.map((v) => (
                        <option key={v} value={v}>{PLACEMENT_LABELS[v] ?? v}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.placement && <p className="mt-1 text-xs text-danger">{errors.placement.message}</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  name="startDate"
                  label="Start Date"
                  type="date"
                  control={control}
                  error={errors.startDate?.message}
                  isRequired
                  isDisabled={readOnly}
                />
                <InputField
                  name="endDate"
                  label="End Date"
                  type="date"
                  control={control}
                  error={errors.endDate?.message}
                  isRequired
                  isDisabled={readOnly}
                />
              </div>
            </div>
          </Section>

          {/* Call To Action */}
          <Section>
            <SectionHeader icon={<FiLink />} title="Call To Action" subtitle="Optional button on the banner" tone="purple" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <InputField
                  name="ctaText"
                  label="CTA Button Text"
                  placeholder="e.g. Learn More"
                  control={control}
                  error={errors.ctaText?.message}
                  isOptional
                  isDisabled={readOnly}
                  maxLength={CTA_TEXT_MAX}
                />
                <FieldCounter control={control} name="ctaText" max={CTA_TEXT_MAX} />
              </div>
              <InputField
                name="ctaUrl"
                label="CTA URL"
                placeholder="https://..."
                control={control}
                error={errors.ctaUrl?.message}
                isOptional
                isDisabled={readOnly}
              />
            </div>
          </Section>

          {/* Banner Images */}
          <Section>
            <SectionHeader icon={<FiImage />} title="Banner Images" subtitle="Optional — drag & drop or browse" tone="rose" />
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FigmaFileUpload
                  name="imageUrl"
                  control={control}
                  label="Full-Size Image"
                  ctaText="Upload image"
                  acceptHint="JPG, PNG, WEBP, SVG, GIF · Max 5MB"
                  isLoading={uploadingImage}
                  isDisabled={readOnly}
                  onUpload={(file) => uploadImage(file, setUploadingImage)}
                />
                <FigmaFileUpload
                  name="thumbnailUrl"
                  control={control}
                  label="Thumbnail Image"
                  ctaText="Upload thumbnail"
                  acceptHint="JPG, PNG, WEBP, SVG, GIF · Max 5MB"
                  isLoading={uploadingThumbnail}
                  isDisabled={readOnly}
                  onUpload={(file) => uploadImage(file, setUploadingThumbnail)}
                />
              </div>
              <div>
                <InputField
                  name="imageAlt"
                  label="Image Alt Text"
                  placeholder="Describe what's in the image"
                  control={control}
                  error={errors.imageAlt?.message}
                  isOptional
                  isDisabled={readOnly}
                  maxLength={IMAGE_ALT_MAX}
                />
                <FieldCounter control={control} name="imageAlt" max={IMAGE_ALT_MAX} />
              </div>
            </div>
          </Section>

          {/* Targeting */}
          <Section>
            <SectionHeader icon={<FiUsers />} title="Targeting" subtitle="Leave a field empty to show to everyone" tone="teal" />
            <div className="space-y-4">
              <SelectField
                control={control}
                name="targetRoles"
                label="Target Roles"
                placeholder="All roles"
                selectionMode="multiple"
                options={ROLE_OPTIONS}
                isDisabled={readOnly}
              />
              <SelectField
                control={control}
                name="targetClinics"
                label="Target Clinics"
                placeholder="All clinics"
                selectionMode="multiple"
                options={clinicOptions}
                isDisabled={readOnly}
              />
              <SelectField
                control={control}
                name="targetSpecialties"
                label="Target Specialties"
                placeholder="All specialties"
                selectionMode="multiple"
                options={SPECIALTY_OPTIONS}
                isDisabled={readOnly}
              />
            </div>
          </Section>

          {/* Settings */}
          <Section>
            <SectionHeader icon={<FiSettings />} title="Settings" subtitle="Display order and behavior flags" tone="blue" />
            <div className="space-y-4">
              <InputField
                name="displayOrder"
                label="Display Order"
                type="number"
                placeholder="0"
                control={control}
                error={errors.displayOrder?.message}
                isOptional
                coerceNumber
                isDisabled={readOnly}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    { name: "isActive" as const, label: "Active" },
                    { name: "isSponsored" as const, label: "Sponsored" },
                    { name: "isCritical" as const, label: "Critical" },
                    { name: "isDismissible" as const, label: "Dismissible" },
                  ] as const
                ).map(({ name, label }) => (
                  <Controller
                    key={name}
                    name={name}
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-[#38445a] dark:bg-[#0f1728]">
                        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{label}</span>
                        <Switch
                          size="sm"
                          color="primary"
                          isSelected={field.value as boolean}
                          onValueChange={field.onChange}
                          isDisabled={readOnly}
                        />
                      </div>
                    )}
                  />
                ))}
              </div>
            </div>
          </Section>

          {/* Footer — plain, in-flow (not floating), mirrors AddPatient.tsx's footer */}
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-gray-200 px-2 py-4 dark:border-[#273244]">
            <AppButton
              text="Preview"
              buttonVariant="outlined"
              className="h-11 w-32"
              startContent={<FiEye />}
              onPress={openPreview}
            />
            <div className="flex items-center gap-3">
              {isEdit && (
                <AppButton
                  text="Delete"
                  buttonVariant="dangerOutlined"
                  className="h-11 w-28"
                  startContent={<FiTrash2 />}
                  onPress={openDelete}
                />
              )}
              {readOnly && bannerId && (
                <AppButton
                  text="Edit"
                  className="h-11 w-28"
                  startContent={<FiEdit2 />}
                  onPress={() => navigate(`/banners/manage?id=${bannerId}`)}
                />
              )}
              <AppButton
                text={readOnly ? "Close" : "Cancel"}
                buttonVariant="outlined"
                className="h-11 w-28"
                onPress={() => navigate("/banners")}
              />
              {!readOnly && (
                <AppButton
                  type="submit"
                  text={isLoading ? (isEdit ? "Updating..." : "Creating...") : isEdit ? "Save Changes" : "Create Banner"}
                  className="h-11 w-40"
                  isDisabled={isLoading || (isEdit && !isDirty)}
                  isLoading={isLoading}
                />
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Delete confirmation modal */}
      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange} size="sm" className="rounded-3xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-lg font-semibold text-slate-900 dark:text-white">
                Delete Banner
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">"{previewBanner.title}"</span>?
                  This action cannot be undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <AppButton text="Cancel" buttonVariant="outlined" onPress={onClose} isDisabled={isDeleting} />
                <AppButton
                  text="Delete"
                  buttonVariant="danger"
                  onPress={async () => {
                    await handleDeleteConfirm();
                    onClose();
                  }}
                  isLoading={isDeleting}
                />
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Preview modal — exact BannerCard used on the real pages, fed from live form values */}
      <Modal isOpen={isPreviewOpen} onOpenChange={onPreviewOpenChange} size="2xl" className="rounded-3xl">
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1 px-8 pt-8">
                <h4 className="text-xl font-semibold text-slate-900 dark:text-white">Live Preview</h4>
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  Exactly how this banner will look on {PLACEMENT_LABELS[previewBanner.placement] ?? previewBanner.placement}
                </p>
              </ModalHeader>
              <ModalBody className="px-8 pb-8">
                {previewBanner.title ? (
                  <div className={previewIsCompact ? "max-w-xs" : "w-full"}>
                    <BannerCard
                      banner={previewBanner}
                      onDismiss={() => {}}
                      onCtaClick={() => {}}
                      compact={previewIsCompact}
                      topBar={previewIsTopBar}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Fill in the Title field to preview your banner.
                  </p>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default BannerFormPage;
