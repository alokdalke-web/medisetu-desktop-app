export const CLINIC_SETUP_COMPLETED_EVENT = "medisetu:clinic-setup-completed";

const SETUP_COMPLETED_KEY_PREFIX = "medisetu:clinic-setup-completed";

type MaybeId = string | number | null | undefined;

export type SetupSubscription = {
  slug?: string | null;
  active?: boolean | null;
} | null | undefined;

export type SetupProfile = {
  userStatus?: string | null;
  mobile?: string | null;
  speciality?: string | null;
  isAdminDoctorAccess?: boolean | null;
} | null | undefined;

type ClinicSetupStatusInput = {
  userId?: MaybeId;
  clinicId?: MaybeId;
  userType?: string | null;
  userStatus?: string | null;
  isAdminDoctorAccess?: boolean | null;
  clinic?: unknown | null;
  profile?: SetupProfile;
  subscription?: SetupSubscription;
  doctorProfile?: {
    userStatus?: string | null;
    mobile?: string | null;
    speciality?: string | null;
    isAdminDoctorAccess?: boolean | null;
  } | null;
  doctorServices?: unknown[] | null;
  doctorAvailability?: unknown[] | null;
};

export const normalizeStatus = (status?: string | null) =>
  String(status || "").trim().toLowerCase();

export const getDoctorAvailabilityList = (doctorResult?: any) => {
  const availability =
    doctorResult?.availability ??
    doctorResult?.aivblity ??
    doctorResult?.aivblityList;

  return Array.isArray(availability) ? availability : null;
};

const normalizeSlug = (slug?: string | null) =>
  String(slug || "").trim().toLowerCase();

const getStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const getClinicSetupCompletionKey = ({
  userId,
  clinicId,
}: {
  userId?: MaybeId;
  clinicId?: MaybeId;
}) => {
  const ownerId = clinicId ?? userId ?? "unknown";
  return `${SETUP_COMPLETED_KEY_PREFIX}:${ownerId}`;
};

export const isClinicSetupMarkedComplete = ({
  userId,
  clinicId,
}: {
  userId?: MaybeId;
  clinicId?: MaybeId;
}) => {
  const storage = getStorage();
  if (!storage) return false;

  return storage.getItem(getClinicSetupCompletionKey({ userId, clinicId })) === "true";
};

export const markClinicSetupComplete = ({
  userId,
  clinicId,
}: {
  userId?: MaybeId;
  clinicId?: MaybeId;
}) => {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(getClinicSetupCompletionKey({ userId, clinicId }), "true");
  window.dispatchEvent(new Event(CLINIC_SETUP_COMPLETED_EVENT));
};

export const clearClinicSetupComplete = ({
  userId,
  clinicId,
}: {
  userId?: MaybeId;
  clinicId?: MaybeId;
}) => {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(getClinicSetupCompletionKey({ userId, clinicId }));
  window.dispatchEvent(new Event(CLINIC_SETUP_COMPLETED_EVENT));
};

export const hasCompletedSubscriptionSetup = (
  subscription: SetupSubscription,
  userId?: MaybeId,
  clinicId?: MaybeId,
) => {
  const slug = normalizeSlug(subscription?.slug);

  if (subscription && slug && slug !== "free") return true;

  return isClinicSetupMarkedComplete({ userId, clinicId });
};

export const getClinicSetupStatus = ({
  userType,
  userStatus,
  isAdminDoctorAccess,
  clinic,
  profile,
  doctorProfile,
  doctorServices,
  doctorAvailability,
}: ClinicSetupStatusInput) => {
  const role = String(userType || "");
  const isAdmin = role === "Admin";
  const isDoctor = role === "Doctor";

  if (!isAdmin && !isDoctor) {
    return {
      shouldUseSetupRoute: false,
      isPendingApproval: false,
      isSetupComplete: true,
    };
  }

  const profileStatuses = [
    profile?.userStatus,
    doctorProfile?.userStatus,
    userStatus,
  ]
    .map(normalizeStatus)
    .filter(Boolean);
  const isActiveProfile = profileStatuses.includes("active");
  const isPendingApproval =
    !isActiveProfile && profileStatuses.includes("pending");
  const hasClinic = Boolean(clinic);

  const hasDoctorProfile =
    Boolean(profile?.speciality) || Boolean(doctorProfile?.speciality);
  const adminRequiresDoctorSetup =
    profile?.isAdminDoctorAccess ??
    doctorProfile?.isAdminDoctorAccess ??
    isAdminDoctorAccess ??
    true;

  const hasProfile = isAdmin
    ? Boolean(profile?.mobile || doctorProfile?.mobile) &&
      (!adminRequiresDoctorSetup || hasDoctorProfile)
    : hasDoctorProfile;

  const hasServices = Boolean(doctorServices && doctorServices.length > 0);
  const hasAvailability = Boolean(
    doctorAvailability && doctorAvailability.length > 0,
  );

  const isSetupComplete = isAdmin
    ? hasClinic &&
      isActiveProfile &&
      hasProfile &&
      (!adminRequiresDoctorSetup || (hasServices && hasAvailability))
    : isActiveProfile && hasProfile && hasServices && hasAvailability;

  return {
    shouldUseSetupRoute: !isSetupComplete,
    isPendingApproval,
    isSetupComplete,
  };
};
