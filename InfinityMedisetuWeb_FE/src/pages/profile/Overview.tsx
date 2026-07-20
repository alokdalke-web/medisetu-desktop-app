// src/pages/profile/Overview.tsx
import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Spinner,
  Textarea,
} from "@heroui/react";
import React from "react";
import type { IconType } from "react-icons";
import {
  FiAward,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiEdit2,
  FiFileText,
  FiGrid,
  FiInfo,
  FiLock,
  FiMail,
  FiPhone,
  FiSave,
  FiUser,
  FiX,
} from "react-icons/fi";

import { useEffectiveUserType } from "../../hooks/useEffectiveUserType";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import {
  useUpdateDoctorProfileImageMutation,
  useUpdateDoctorMutation,
  useGetDoctorQuery,
} from "../../redux/api/doctorApi";
import {
  useGetMyProfileUpdateRequestsQuery,
  type ProfileUpdateQualification,
  type ProfileUpdateRequestItem,
} from "../../redux/api/requestApi";
import { formatDate } from "../../utils";
import {
  areProfileUpdateValuesEqual,
  getChangedQualificationKeys,
  getProfileUpdateFieldValue,
} from "../../utils/profileUpdateChanges";
import ProfileUpdateRequestModal from "./ProfileUpdateRequestModal";
import UpdateUpiModal from "./UpdateUpiModal";

/** ✅ Always show 2 letters like Figma (AS) */
const getInitials = (name?: string | null) => {
  const n = (name ?? "").trim();
  if (!n) return "U";
  const parts = n.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase() || "U";
  }
  return (parts[0].slice(0, 2) || "U").toUpperCase();
};

const displayValue = (value?: string | number | null) => {
  if (value === undefined || value === null) return "—";
  const text = String(value).trim();
  return text || "—";
};

const formatProfileDate = (value?: string | null) =>
  value ? formatDate(value) : "—";

const titleCaseField = (key: string) => {
  const labels: Record<string, string> = {
    alternateMobile: "Alternate Number",
    boardOrUniversity: "University / Board",
    email: "Email",
    mobile: "Phone Number",
    name: "Name",
    profileImage: "Profile Photo",
    qualification: "Qualification",
    qualifications: "Education",
    qualificationTitle: "Qualification Title",
    qualificationType: "Qualification Type",
    registrationNumber: "Registration Number",
    speciality: "Speciality",
    specialization: "Specialization",
    isAdminDoctorAccess: "Doctor Access",
    yearOfCompletion: "Year of Completion",
    yearsOfExperience: "Experience",
  };

  if (labels[key]) return labels[key];

  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const collectChangeFields = (value: unknown): string[] => {
  if (!value) return [];

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];

    try {
      return collectChangeFields(JSON.parse(text));
    } catch {
      return text
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectChangeFields(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct =
      record.field ?? record.name ?? record.key ?? record.label ?? record.path;

    if (typeof direct === "string" && direct.trim()) return [direct.trim()];

    return Object.keys(record);
  }

  return [];
};

const IGNORED_CHANGE_FIELDS = new Set([
  "id",
  "_id",
  "dbId",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "reason",
]);

const CONTAINER_CHANGE_FIELDS = new Set([
  "doctorProfile",
  "profile",
  "payload",
  "requestedData",
  "qualifications",
]);

const getComparableFieldLabel = (field: string) =>
  titleCaseField(field).toLowerCase();

const isDisplayableChangeField = (field: string) => {
  const value = field.trim();

  return Boolean(
    value &&
    !IGNORED_CHANGE_FIELDS.has(value) &&
    !CONTAINER_CHANGE_FIELDS.has(value),
  );
};

const getExplicitChangeFields = (request: ProfileUpdateRequestItem) =>
  [
    ...collectChangeFields(request.changedFields),
    ...collectChangeFields(request.requestedChanges),
    ...collectChangeFields(request.changes),
    ...collectChangeFields(request.updateData),
    ...collectChangeFields(request.newData),
    ...collectChangeFields(request.payload),
  ].filter(isDisplayableChangeField);

const getExplicitMatches = (fields: string[], explicitFields: string[]) => {
  const explicitLabels = new Set(
    explicitFields.map((field) => getComparableFieldLabel(field)),
  );

  return fields.filter((field) =>
    explicitLabels.has(getComparableFieldLabel(field)),
  );
};

const getOutstandingProfileChangeFields = (
  request: ProfileUpdateRequestItem,
  currentProfile?: unknown,
) => {
  const requestedProfile = request.requestedData?.doctorProfile;
  if (!requestedProfile) return [];

  const fields = Object.keys(requestedProfile).filter(isDisplayableChangeField);

  return fields.filter(
    (field) =>
      !areProfileUpdateValuesEqual(
        getProfileUpdateFieldValue(requestedProfile, field),
        getProfileUpdateFieldValue(currentProfile, field),
      ),
  );
};

const getProfileChangeFields = (
  request: ProfileUpdateRequestItem,
  currentProfile?: unknown,
) => {
  const requestedProfile = request.requestedData?.doctorProfile;
  if (!requestedProfile) return [];

  const fields = Object.keys(requestedProfile).filter(isDisplayableChangeField);
  const changedFields = getOutstandingProfileChangeFields(
    request,
    currentProfile,
  );

  if (changedFields.length) return changedFields;

  const explicitMatches = getExplicitMatches(
    fields,
    getExplicitChangeFields(request),
  );

  return explicitMatches.length ? explicitMatches : fields;
};

const getQualificationValue = (
  qualification: ProfileUpdateQualification,
  field: string,
) => getProfileUpdateFieldValue(qualification, field) as string | number | null;

const getQualificationChangeGroups = (
  request: ProfileUpdateRequestItem,
  currentQualifications?: unknown[] | null,
  includeFallbackFields = true,
) => {
  const requestedQualifications = request.requestedData?.qualifications;
  if (!requestedQualifications?.length) return [];

  const explicitFields = getExplicitChangeFields(request);

  return requestedQualifications
    .map((qualification, index) => {
      const fields = Object.keys(qualification).filter(isDisplayableChangeField);
      const changedFields = getChangedQualificationKeys(
        qualification,
        currentQualifications,
        index,
      ).filter(isDisplayableChangeField);
      const explicitMatches = getExplicitMatches(fields, explicitFields);
      const displayFields = changedFields.length
        ? changedFields
        : includeFallbackFields
          ? explicitMatches.length
            ? explicitMatches
            : fields
          : [];

      return {
        fields: displayFields,
        index,
        qualification,
      };
    })
    .filter((group) => group.fields.length > 0);
};

const hasOutstandingRequestedChanges = (
  request: ProfileUpdateRequestItem,
  currentProfile?: unknown,
  currentQualifications?: unknown[] | null,
) => {
  const hasComparableData = Boolean(
    request.requestedData?.doctorProfile ||
    request.requestedData?.qualifications?.length,
  );

  if (!hasComparableData) return true;

  return Boolean(
    getOutstandingProfileChangeFields(request, currentProfile).length ||
    getQualificationChangeGroups(
      request,
      currentQualifications,
      false,
    ).length,
  );
};

const getRequestedChanges = (
  request: ProfileUpdateRequestItem,
  currentProfile?: unknown,
  currentQualifications?: unknown[] | null,
) => {
  const fields = [
    ...getProfileChangeFields(request, currentProfile),
    ...getQualificationChangeGroups(request, currentQualifications).flatMap(
      (group) => group.fields,
    ),
  ];
  const labels = Array.from(
    new Set(fields.map((field) => titleCaseField(field)).filter(Boolean)),
  );

  if (!labels.length) return "Profile details";
  if (labels.length <= 3) return labels.join(", ");

  return `${labels.slice(0, 3).join(", ")} +${labels.length - 3} more`;
};

const getRequestStatus = (request?: ProfileUpdateRequestItem | null) =>
  String(
    request?.status ??
    request?.requestStatus ??
    request?.approvalStatus ??
    "pending",
  )
    .trim()
    .toLowerCase();

const isPendingRequestStatus = (status?: string | null) =>
  ["pending", "reviewing", "in review", "under review", "under_review"].includes(
    String(status ?? "").trim().toLowerCase(),
  );

const getDisplayRequestStatus = (
  request: ProfileUpdateRequestItem,
  currentProfile?: unknown,
  currentQualifications?: unknown[] | null,
) => {
  const status = getRequestStatus(request);

  if (
    isPendingRequestStatus(status) &&
    !hasOutstandingRequestedChanges(request, currentProfile, currentQualifications)
  ) {
    return "approved";
  }

  return status;
};

const getStatusLabel = (status?: string | null) => {
  const value = String(status ?? "pending").trim().toLowerCase();

  if (value === "approved" || value === "active") return "Approved";
  if (value === "rejected") return "Rejected";
  if (
    value === "reviewing" ||
    value === "in review" ||
    value === "under review" ||
    value === "under_review"
  ) {
    return "Reviewing";
  }
  if (value === "pending") return "Pending";

  return displayValue(status);
};

const getStatusChipClass = (status?: string | null) => {
  const value = String(status ?? "").trim().toLowerCase();

  if (value === "approved" || value === "active") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (value === "rejected") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  if (
    value === "reviewing" ||
    value === "in review" ||
    value === "under review" ||
    value === "under_review"
  ) {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  return "bg-amber-50 text-amber-700 ring-amber-100";
};

const getRequestReason = (request: ProfileUpdateRequestItem) => {
  const reason =
    (request as any)?.reason ??
    (request as any)?.requestedData?.reason ??
    request.rejectionReason ??
    (request as any)?.requestReason ??
    (request as any)?.notes;

  return displayValue(reason);
};

const REASON_PREVIEW_LENGTH = 70;

const ReasonPreview: React.FC<{ text: string }> = ({ text }) => {
  const reason = displayValue(text);
  const isLongReason = reason !== "—" && reason.length > REASON_PREVIEW_LENGTH;
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const closeTimerRef = React.useRef<number | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [position, setPosition] = React.useState<{
    left: number;
    placement: "top" | "bottom";
    top: number;
  } | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current === null || typeof window === "undefined") {
      return;
    }

    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 16;
    const cardWidth = Math.min(520, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      Math.max(viewportPadding, window.innerWidth - cardWidth - viewportPadding),
    );
    const hasSpaceAbove = rect.top > 160;

    setPosition({
      left,
      placement: hasSpaceAbove ? "top" : "bottom",
      top: hasSpaceAbove ? rect.top : rect.bottom,
    });
  };

  const openCard = () => {
    if (!isLongReason) return;

    clearCloseTimer();
    updatePosition();
    setIsOpen(true);
  };

  const scheduleCloseCard = () => {
    clearCloseTimer();

    if (typeof window === "undefined") {
      setIsOpen(false);
      return;
    }

    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, 200);
  };

  React.useEffect(
    () => () => {
      clearCloseTimer();
    },
    [],
  );

  if (!isLongReason) {
    return (
      <span className="block whitespace-pre-wrap break-words leading-6 [overflow-wrap:anywhere]">
        {reason}
      </span>
    );
  }

  const preview = `${reason.slice(0, REASON_PREVIEW_LENGTH).trimEnd()}...`;
  const cardStyle: React.CSSProperties | undefined = position
    ? {
      left: position.left,
      top: position.top,
      transform:
        position.placement === "top" ? "translateY(-100%)" : undefined,
    }
    : undefined;

  return (
    <span
      ref={triggerRef}
      tabIndex={0}
      onMouseEnter={openCard}
      onMouseLeave={scheduleCloseCard}
      onFocus={openCard}
      onBlur={scheduleCloseCard}
      className="relative flex min-w-0 max-w-full flex-col gap-1 outline-none"
    >
      <span className="block min-w-0 max-w-full truncate leading-6">
        {preview}
      </span>
      <span className="inline-flex w-fit items-center gap-1 text-[11px] font-semibold text-primary">
        <FiInfo className="h-3.5 w-3.5" />
        Hover to view full reason
      </span>

      <span
        style={cardStyle}
        onMouseEnter={openCard}
        onMouseLeave={scheduleCloseCard}
        className={`fixed z-[9999] hidden w-[min(520px,calc(100vw-32px))] rounded-lg border border-primary/20 bg-white p-3 text-left shadow-[0_16px_40px_rgba(15,23,42,0.16)] transition-opacity duration-200 lg:block ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
      >
        <span className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2 text-[13px] font-bold text-slate-800">
          <FiInfo className="h-4 w-4 text-primary" />
          Full reason
        </span>
        <span className="block max-h-[4.5rem] overflow-y-auto whitespace-pre-wrap break-words pr-2 text-[13px] font-medium leading-6 text-slate-700 [overflow-wrap:anywhere]">
          {reason}
        </span>
      </span>
    </span>
  );
};

const getProfileImageErrorMessage = (error: unknown) => {
  const anyError = error as any;
  const message =
    anyError?.data?.message ??
    anyError?.data?.error ??
    anyError?.error?.message ??
    anyError?.error ??
    anyError?.message;

  return typeof message === "string" && message.trim()
    ? message.trim()
    : "Failed to update profile image";
};

/* ---------------- Qualification Card ---------------- */

type ApiQualification = {
  id?: string;
  qualificationTitle?: string | null;
  qualificationType?: string | null;
  specialization?: string | null;
  boardOrUniversity?: string | null;
  yearOfCompletion?: number | string | null;
};

const QualificationCard = ({ item }: { item: ApiQualification }) => {
  const fmt = (v: any) =>
    v === null || v === undefined || v === "" ? "—" : String(v);

  const title = fmt(item?.qualificationTitle || item?.qualificationType);
  const subTitle = fmt(item?.qualificationType);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#273244] dark:bg-[#111726]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FiAward className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900 md:text-base">
            {title}
          </div>
          <div className="truncate text-xs text-slate-500 md:text-sm">
            {subTitle}
          </div>
        </div>

        <span className="shrink-0 text-slate-400">
          <FiLock className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Specialization
          </div>
          <div className="mt-1 break-words text-sm font-semibold text-slate-900">
            {fmt(item?.specialization)}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Year of Completion
          </div>
          <div className="mt-1 break-words text-sm font-semibold text-slate-900">
            {fmt(item?.yearOfCompletion)}
          </div>
        </div>

        <div className="sm:col-span-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            University / Board
          </div>
          <div className="mt-1 break-words text-sm font-semibold text-slate-900">
            {fmt(item?.boardOrUniversity)}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Page ---------------- */

const Overview: React.FC = () => {
  const effectiveUserType = useEffectiveUserType();
  const userTypeLower = String(effectiveUserType).trim().toLowerCase();
  const isReceptionist = userTypeLower === "receptionist";
  const isPharmacist = userTypeLower === "pharmacist";
  const isStaff = isReceptionist || isPharmacist;

  const {
    data: user,
    isLoading: isUserLoading,
  } = useGetUserQuery(undefined, {
    // Removed aggressive refetch settings
    // Only refetch when data is stale (default RTK Query behavior)
  });

  const {
    data: clinics,
    isLoading: isClinicsLoading,
    isError,
    refetch: refetchClinics,
  } = useGetAllClinicsQuery(undefined, {
    skip: isStaff,
    // Removed aggressive refetch settings
    // Only refetch when data is stale (default RTK Query behavior)
  });

  const {
    data: doctorData,
    isLoading: isDoctorLoading,
  } = useGetDoctorQuery(undefined, {
    skip: isStaff,
  });

  const profile = isStaff ? (user as any) : (clinics as any)?.profile;
  const doctorProfile = doctorData?.result?.doctorProfile;
  const userType = (user as any)?.userType as string | undefined;
  const isAdminDoctorAccess = !!(profile as any)?.isAdminDoctorAccess;
  const isLoading = isStaff ? isUserLoading : (isClinicsLoading || isDoctorLoading);
  const [selectedProfileRequest, setSelectedProfileRequest] =
    React.useState<ProfileUpdateRequestItem | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = React.useState(false);
  const [isProfileImagePreviewOpen, setIsProfileImagePreviewOpen] =
    React.useState(false);
  const [isUpiModalOpen, setIsUpiModalOpen] = React.useState(false);
  const [isEditingAbout, setIsEditingAbout] = React.useState(false);
  const [aboutText, setAboutText] = React.useState("");
  const [updateDoctorProfileImage, { isLoading: isUpdatingProfileImage }] =
    useUpdateDoctorProfileImageMutation();
  const [updateDoctor, { isLoading: isUpdatingAbout }] =
    useUpdateDoctorMutation();

  const fmt = (v: any) =>
    v === null || v === undefined || v === "" ? "—" : String(v);

  const has = (v: any) => v !== null && v !== undefined && v !== "";

  const phoneValue = profile?.countryCallingCode
    ? `${profile.countryCallingCode} ${fmt(profile?.mobile)}`
    : fmt(profile?.mobile);

  const hasPhone = has(profile?.mobile);

  const altPhoneValue =
    profile?.alternateMobile && profile?.countryCallingCode
      ? `${profile.countryCallingCode} ${fmt(profile?.alternateMobile)}`
      : fmt(profile?.alternateMobile);

  const hasAltPhone = has(profile?.alternateMobile);
  const hasEmail = has(profile?.email);
  const hasRegistrationNumber = has(profile?.registrationNumber);

  const showEducation =
    !isStaff &&
    ((userType !== "Admin" &&
      userType !== "Receptionist" &&
      userType !== "Pharmacist") ||
      isAdminDoctorAccess);

  const isDoctorProfile = isAdminDoctorAccess || userType === "Doctor";
  const profileImageSrc =
    typeof profile?.profileImage === "string" ? profile.profileImage : "";

  const qualifications: ApiQualification[] = React.useMemo(() => {
    if (isStaff) return [];
    const a = (clinics as any)?.qualification;
    if (Array.isArray(a)) return a as ApiQualification[];

    const b = (profile as any)?.qualifications;
    if (Array.isArray(b)) return b as ApiQualification[];

    const fallbackQualification = {
      qualificationTitle: profile?.qualification,
      qualificationType: profile?.qualification,
      specialization: profile?.speciality,
      boardOrUniversity:
        (profile as any)?.boardOrUniversity ?? (profile as any)?.boardUniversity,
      yearOfCompletion: (profile as any)?.yearOfCompletion,
    };

    return Object.values(fallbackQualification).some(has)
      ? [fallbackQualification]
      : [];
  }, [clinics, profile, isStaff]);

  const aboutVal = (doctorProfile as any)?.about || (profile as any)?.about;

  // Initialize about text from profile
  React.useEffect(() => {
    if (aboutVal) {
      setAboutText(String(aboutVal));
    }
  }, [aboutVal]);

  const handleEditAboutClick = () => {
    setAboutText(String(aboutVal ?? ""));
    setIsEditingAbout(true);
  };

  const handleCancelAboutEdit = () => {
    setAboutText(String(aboutVal ?? ""));
    setIsEditingAbout(false);
  };

  const handleSaveAbout = async () => {
    try {
      await updateDoctor({
        about: aboutText.trim(),
      } as any).unwrap();

      // RTK Query will automatically refetch due to tag invalidation

      setIsEditingAbout(false);
      addToast({
        title: "About section updated",
        description: "Your profile has been updated successfully.",
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Update failed",
        description:
          error?.data?.message || error?.message || "Failed to update about section",
        color: "danger",
      });
    }
  };

  const {
    data: profileRequestsData,
    isLoading: isRequestsLoading,
    refetch: refetchProfileRequests,
  } = useGetMyProfileUpdateRequestsQuery(
    { limit: 5, page: 1 },
    {
      skip: !showEducation,
    },
  );
  const profileRequests = React.useMemo(
    () => profileRequestsData?.requests ?? [],
    [profileRequestsData],
  );

  const recentRequests = React.useMemo(
    () =>
      [...profileRequests]
        .sort((a, b) => {
          const aDate = new Date(
            a.requestedAt ?? a.createdAt ?? a.updatedAt ?? "",
          ).getTime();
          const bDate = new Date(
            b.requestedAt ?? b.createdAt ?? b.updatedAt ?? "",
          ).getTime();

          return (
            (Number.isNaN(bDate) ? 0 : bDate) -
            (Number.isNaN(aDate) ? 0 : aDate)
          );
        })
        .slice(0, 5),
    [profileRequests],
  );

  const hasPendingRequest = recentRequests.some(
    (request) =>
      isPendingRequestStatus(getRequestStatus(request)) &&
      hasOutstandingRequestedChanges(request, profile, qualifications),
  );
  const rawProfileStatus = String(
    profile?.userStatus ?? (user as any)?.userStatus ?? "",
  )
    .trim()
    .toLowerCase();
  const isVerified =
    rawProfileStatus === "" ||
    rawProfileStatus === "active" ||
    rawProfileStatus === "approved" ||
    rawProfileStatus === "verified";
  const statusDescription = hasPendingRequest
    ? "Your latest changes are waiting for admin approval."
    : isVerified
      ? "Your profile is verified and locked."
      : "Please request an update once your details are ready.";
  const statusSupportText = hasPendingRequest
    ? "We will update this page after review."
    : "To make any changes, please request permission from our admin team.";
  const profileStatusChipStatus = hasPendingRequest
    ? "pending"
    : rawProfileStatus || "approved";
  const profileStatusChipLabel = hasPendingRequest
    ? isVerified
      ? "Verified (Profile Update Pending)"
      : "Update Pending"
    : isVerified
      ? "Verified"
      : getStatusLabel(rawProfileStatus);

  const showUpiCard =
    !isStaff &&
    (userType === "Admin" || userType === "Doctor");

  const contactItems = [
    hasPhone
      ? {
        icon: FiPhone,
        label: "Phone Number",
        value: phoneValue,
      }
      : null,
    hasEmail
      ? {
        icon: FiMail,
        label: "Email Address",
        value: fmt(profile?.email),
      }
      : null,
    hasRegistrationNumber
      ? {
        icon: FiGrid,
        label: "Registration Number",
        value: fmt(profile?.registrationNumber),
      }
      : null,
    showUpiCard
      ? {
        icon: FiCreditCard,
        label: "UPI IDs",
        value: profile?.upiIds && profile.upiIds.length > 0
          ? profile.upiIds.join(", ")
          : "Not Added",
        isUpi: true,
      }
      : null,
    hasAltPhone
      ? {
        icon: FiPhone,
        label: "Alternate Number",
        value: altPhoneValue,
      }
      : null,
  ].filter(Boolean) as Array<{
    icon: IconType;
    label: string;
    value: string;
    isUpi?: boolean;
  }>;

  const contactGridClass =
    contactItems.length >= 5
      ? "lg:grid-cols-5"
      : contactItems.length === 4
        ? "lg:grid-cols-4"
        : contactItems.length === 2
          ? "lg:grid-cols-2"
          : "lg:grid-cols-3";
  const selectedDoctorProfile =
    selectedProfileRequest?.requestedData?.doctorProfile ?? null;
  const selectedProfileFieldKeys = new Set(
    selectedProfileRequest
      ? getProfileChangeFields(selectedProfileRequest, profile)
      : [],
  );
  const selectedQualificationChanges = selectedProfileRequest
    ? getQualificationChangeGroups(selectedProfileRequest, qualifications)
    : [];
  const selectedProfileDetails = selectedDoctorProfile
    ? [
      { key: "name", label: "Name", value: selectedDoctorProfile.name },
      {
        key: "email",
        label: "Email",
        value: (selectedDoctorProfile as any).email,
      },
      {
        key: "mobile",
        label: "Phone Number",
        value: selectedDoctorProfile.mobile,
      },
      {
        key: "alternateMobile",
        label: "Alternate Number",
        value: selectedDoctorProfile.alternateMobile,
      },
      {
        key: "speciality",
        label: "Speciality",
        value: selectedDoctorProfile.speciality,
      },
      {
        key: "qualification",
        label: "Qualification",
        value: selectedDoctorProfile.qualification,
      },
      {
        key: "registrationNumber",
        label: "Registration Number",
        value: selectedDoctorProfile.registrationNumber,
      },
      {
        key: "yearsOfExperience",
        label: "Experience",
        value: (selectedDoctorProfile as any).yearsOfExperience,
      },
      {
        key: "isAdminDoctorAccess",
        label: "Doctor Access",
        value:
          (selectedDoctorProfile as any).isAdminDoctorAccess === undefined
            ? undefined
            : (selectedDoctorProfile as any).isAdminDoctorAccess
              ? "Enabled"
              : "Disabled",
      },
    ].filter((item) => selectedProfileFieldKeys.has(item.key))
    : [];

  const handleProfileImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      addToast({
        title: "Invalid file",
        description: "Please choose a JPG, PNG, or JPEG image.",
        color: "warning",
      });
      return;
    }

    try {
      const imageFormData = new FormData();
      imageFormData.append("profileImage", file);
      await updateDoctorProfileImage(imageFormData).unwrap();

      // RTK Query will automatically refetch due to tag invalidation

      addToast({
        title: "Profile image updated",
        description: "Your profile photo has been changed.",
        color: "success",
      });
    } catch (error: unknown) {
      addToast({
        title: "Image update failed",
        description: getProfileImageErrorMessage(error),
        color: "danger",
      });
    }
  };
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size="lg" label="Loading profile..." />
      </div>
    );
  }

  return (
    <>
      <ProfilePageHeader
        icon={<FiUser className="h-4 w-4" />}
        title="Profile Overview"
      />

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative h-20 w-20 shrink-0">
                {profileImageSrc ? (
                  <button
                    type="button"
                    aria-label="View profile image"
                    title="View profile image"
                    onClick={() => setIsProfileImagePreviewOpen(true)}
                    className="block h-full w-full rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <img
                      src={profileImageSrc}
                      alt={profile?.name ?? "User"}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                    {getInitials(profile?.name)}
                  </div>
                )}

                {showEducation && (
                  <label
                    aria-label="Change profile image"
                    title="Change profile image"
                    className={`absolute -right-1 -bottom-1 z-10 flex items-center justify-center h-8 w-8 rounded-full shadow-sm transition hover:bg-slate-50 ${isUpdatingProfileImage || !profile
                      ? "cursor-not-allowed opacity-70"
                      : "cursor-pointer"
                      }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={isUpdatingProfileImage || !profile}
                      onChange={handleProfileImageChange}
                    />
                    {isUpdatingProfileImage ? (
                      <Spinner size="sm" />
                    ) : (
                      <FiEdit2 className="h-4 w-4" />
                    )}
                  </label>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="truncate text-xl font-semibold text-slate-950">
                    {isLoading ? (
                      <Spinner size="sm" />
                    ) : isDoctorProfile ? (
                      `Dr. ${fmt(profile?.name)}`
                    ) : (
                      fmt(profile?.name)
                    )}
                  </h3>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusChipClass(
                      profileStatusChipStatus,
                    )}`}
                  >
                    {hasPendingRequest ? (
                      <FiClock className="h-3.5 w-3.5" />
                    ) : (
                      <FiCheckCircle className="h-3.5 w-3.5" />
                    )}
                    {profileStatusChipLabel}
                  </span>
                </div>

                <p className="mt-2 text-sm font-medium text-slate-500">
                  {fmt(profile?.userType ?? userType)}
                </p>
              </div>
            </div>

          </div>

          {contactItems.length > 0 && (
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 ${contactGridClass}`}
            >
              {contactItems.map(({ icon: Icon, label, value, isUpi }) => (
                <div
                  key={label}
                  className="flex min-w-0 items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0"
                >
                  <span className="shrink-0 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-slate-950">
                      {value}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {label}
                    </p>
                  </div>
                  {isUpi ? (
                    <button
                      type="button"
                      onClick={() => setIsUpiModalOpen(true)}
                      className="text-primary hover:text-primary-active transition-colors p-1"
                      aria-label="Edit UPI IDs"
                      title="Edit UPI IDs"
                    >
                      <FiEdit2 className="h-4 w-4 shrink-0" />
                    </button>
                  ) : (
                    <FiLock className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* About Section */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <span className="text-primary">
                <FiFileText className="h-5 w-5" />
              </span>
              About
            </div>

            {!isEditingAbout && showEducation && (
              <button
                type="button"
                onClick={handleEditAboutClick}
                disabled={isUpdatingAbout}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Edit about section"
                title="Edit about section"
              >
                <FiEdit2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-4">
            {isEditingAbout ? (
              <div className="space-y-3">
                <Textarea
                  value={aboutText}
                  onChange={(e) => setAboutText(e.target.value)}
                  placeholder="Write something about yourself..."
                  minRows={5}
                  maxRows={10}
                  classNames={{
                    input: "text-sm font-medium text-slate-700",
                    inputWrapper: "border border-slate-200 bg-white",
                  }}
                  isDisabled={isUpdatingAbout}
                />

                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    radius="full"
                    variant="flat"
                    onPress={handleCancelAboutEdit}
                    className="h-9 border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-700 hover:bg-slate-100"
                    isDisabled={isUpdatingAbout}
                    startContent={<FiX className="h-4 w-4" />}
                  >
                    Cancel
                  </Button>

                  <Button
                    size="sm"
                    radius="full"
                    onPress={handleSaveAbout}
                    className="h-9 bg-primary px-4 text-[12px] font-semibold text-white hover:bg-primary-active"
                    isLoading={isUpdatingAbout}
                    isDisabled={isUpdatingAbout}
                    startContent={!isUpdatingAbout && <FiSave className="h-4 w-4" />}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium leading-6 text-slate-700">
                {aboutVal && String(aboutVal).trim() ? (
                  <p className="whitespace-pre-wrap break-words">
                    {String(aboutVal)}
                  </p>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                    <FiInfo className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-2 font-semibold text-slate-700">
                      No about information added yet
                    </p>
                    <p className="mt-1 text-slate-500">
                      {showEducation
                        ? "Click the edit button above to add information about yourself."
                        : "About information has not been added."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {showEducation && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(330px,1fr)]">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-950">
                <span className="text-primary">
                  <FiBookOpen className="h-5 w-5" />
                </span>
                Education & Qualification
              </div>

              {(isStaff ? isUserLoading : isClinicsLoading) ? (
                <Spinner size="sm" />
              ) : qualifications.length ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  {qualifications.map((q) => (
                    <QualificationCard
                      key={
                        q.id ?? `${q.qualificationTitle}-${q.yearOfCompletion}`
                      }
                      item={q}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  <div className="font-semibold text-slate-700">
                    No qualification added yet
                  </div>
                  <p className="mt-1">
                    Request an update to add your education details.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-emerald-100 bg-emerald-50/40">
              <div className="flex items-center gap-2 border-b border-emerald-100 px-5 py-4 text-base font-semibold text-emerald-800">
                <FiCheckCircle className="h-5 w-5" />
                Profile Status
              </div>

              <div className="space-y-4 px-5 py-5">
                <p className="text-sm font-semibold text-slate-700">
                  {statusDescription}
                </p>
                <p className="text-sm font-medium leading-6 text-slate-600">
                  {statusSupportText}
                </p>

                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(true)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-active"
                >
                  <FiEdit2 className="h-4 w-4" />
                  Request Update
                </button>
              </div>
            </section>
          </div>
        )}

        {showEducation && (
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-base font-semibold text-slate-950">
              <FiClock className="h-5 w-5 text-slate-500" />
              Update Request History
            </div>

            {isRequestsLoading ? (
              <div className="px-5 py-6">
                <Spinner size="sm" />
              </div>
            ) : recentRequests.length ? (
              <>
                <div className="overflow-x-auto px-5 py-4">
                  <div className="min-w-[820px] text-sm">
                    <div className="grid grid-cols-[130px_minmax(240px,1fr)_130px_minmax(min-content,360px)] border-b border-slate-100 text-xs font-semibold text-slate-500">
                      <div className="px-3 py-3">Requested On</div>
                      <div className="px-3 py-3">Requested Changes</div>
                      <div className="px-3 py-3 text-center">Status</div>
                      <div className="px-3 py-3">Reason</div>
                    </div>

                    <div>
                      {recentRequests.map((request, index) => {
                        const requestKey =
                          request.id ??
                          request._id ??
                          request.requestId ??
                          `profile-request-${index}`;
                        const status = getDisplayRequestStatus(
                          request,
                          profile,
                          qualifications,
                        );

                        return (
                          <div
                            key={requestKey}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedProfileRequest(request)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedProfileRequest(request);
                              }
                            }}
                            className="grid cursor-pointer grid-cols-[130px_minmax(240px,1fr)_130px_minmax(min-content,360px)] border-b border-slate-100 transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none last:border-b-0"
                          >
                            <div className="px-3 py-4 font-medium leading-5 text-slate-600">
                              {formatProfileDate(
                                request.requestedAt ??
                                request.createdAt ??
                                request.updatedAt,
                              )}
                            </div>
                            <div className="px-3 py-4 font-medium leading-5 text-slate-700">
                              {getRequestedChanges(
                                request,
                                profile,
                                qualifications,
                              )}
                            </div>
                            <div className="px-3 py-4 text-center">
                              <span
                                className={`inline-flex justify-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusChipClass(
                                  status,
                                )}`}
                              >
                                {getStatusLabel(status)}
                              </span>
                            </div>
                            <div className="px-3 py-4 font-medium text-slate-600">
                              <ReasonPreview text={getRequestReason(request)} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mx-5 mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                  Once your request is approved by admin, the changes will be
                  updated in your profile.
                </div>
              </>
            ) : (
              <div className="px-5 py-6 text-sm text-slate-500">
                No update requests submitted yet.
              </div>
            )}
          </section>
        )}

        {isError && (
          <div className="text-xs text-red-500">
            Failed to load profile from <code>/clinic/user</code>.
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedProfileRequest)}
        onOpenChange={(open) => {
          if (!open) setSelectedProfileRequest(null);
        }}
        placement="center"
        scrollBehavior="inside"
        size="4xl"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span className="text-base font-semibold text-slate-950">
              Profile Request Details
            </span>
            <span className="text-xs font-medium text-slate-500">
              Requested on{" "}
              {formatProfileDate(
                selectedProfileRequest?.requestedAt ??
                selectedProfileRequest?.createdAt ??
                selectedProfileRequest?.updatedAt,
              )}
            </span>
          </ModalHeader>

          <ModalBody className="gap-5 pb-6">
            {selectedProfileRequest && (
              <>
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusChipClass(
                      getDisplayRequestStatus(
                        selectedProfileRequest,
                        profile,
                        qualifications,
                      ),
                    )}`}
                  >
                    {getStatusLabel(
                      getDisplayRequestStatus(
                        selectedProfileRequest,
                        profile,
                        qualifications,
                      ),
                    )}
                  </span>
                  <span className="max-h-[4.5rem] min-w-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words pr-2 text-sm font-medium leading-6 text-slate-600 [overflow-wrap:anywhere]">
                    Reason: {getRequestReason(selectedProfileRequest)}
                  </span>
                </div>

                <section>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FiUser className="h-4 w-4 text-primary" />
                    Doctor Profile
                  </div>

                  {selectedProfileDetails.length ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {selectedProfileDetails.map((item) => (
                        <div
                          key={item.label}
                          className="rounded-lg border border-slate-100 bg-white px-4 py-3"
                        >
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {item.label}
                          </div>
                          <div className="mt-1 break-words text-sm font-semibold text-slate-900">
                            {displayValue(item.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      No doctor profile changes found.
                    </div>
                  )}
                </section>

                <section>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FiAward className="h-4 w-4 text-primary" />
                    Qualifications
                  </div>

                  {selectedQualificationChanges.length ? (
                    <div className="space-y-3">
                      {selectedQualificationChanges.map(
                        ({ fields, index, qualification }) => (
                          <div
                            key={
                              qualification.id ??
                              `${qualification.qualificationTitle}-${index}`
                            }
                            className="rounded-xl border border-slate-100 bg-white p-4"
                          >
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-slate-900">
                                Qualification {index + 1}
                              </div>
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                {displayValue(qualification.qualificationType)}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {fields.map((field) => (
                                <div key={field}>
                                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {titleCaseField(field)}
                                  </div>
                                  <div className="mt-1 break-words text-sm font-semibold text-slate-900">
                                    {displayValue(
                                      getQualificationValue(
                                        qualification,
                                        field,
                                      ),
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      No qualification changes found.
                    </div>
                  )}
                </section>
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isProfileImagePreviewOpen && Boolean(profileImageSrc)}
        onOpenChange={setIsProfileImagePreviewOpen}
        placement="center"
        size="3xl"
      >
        <ModalContent>
          <ModalHeader className="text-base font-semibold text-slate-950">
            Profile Image
          </ModalHeader>
          <ModalBody className="pb-6">
            <div className="flex max-h-[70vh] items-center justify-center overflow-hidden rounded-xl bg-slate-50">
              <img
                src={profileImageSrc}
                alt={profile?.name ?? "Profile"}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {isUpdateModalOpen && (
        <ProfileUpdateRequestModal
          isOpen={isUpdateModalOpen}
          onOpenChange={setIsUpdateModalOpen}
          onRequestSubmitted={() => {
            void refetchProfileRequests();
          }}
        />
      )}

      {isUpiModalOpen && (
        <UpdateUpiModal
          isOpen={isUpiModalOpen}
          onOpenChange={setIsUpiModalOpen}
          currentUpiIds={profile?.upiIds || []}
          userType={userType || ""}
          clinicId={clinics?.clinic?.id}
          onSaved={() => {
            void refetchClinics();
          }}
        />
      )}
    </>
  );
};

export default Overview;
