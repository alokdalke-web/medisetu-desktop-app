// src/pages/profile/Profile.tsx
import React from "react";
import {
  LuBell,
  LuCircleAlert,
  LuClock,
  LuFileStack,
  LuHospital,
  LuKeyRound,
  LuPill,
  LuShield,
  LuSlidersHorizontal,
  LuSmartphone,
  LuStethoscope,
  LuUser,
  LuUsers,
  LuCalendarX,
  LuGlobe,
} from "react-icons/lu";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router"; 

import { UnsavedChangesProvider } from "../../context/UnsavedChangesContext";
import { useEffectiveUserType } from "../../hooks/useEffectiveUserType";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import UnsavedChangesPrompt from "../../components/UnsavedChangesPrompt";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { profileTips } from "../../constants/featureTips";
import { normalizeStatus } from "../../utils/clinicSetupStatus";
import type { Role, MenuKey, MenuItem, ProfileSection } from "../../types/profile";

/* ─── Navigation Styles ─── */
const navItem =
  "flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors duration-200 " +
  "shrink-0 sm:gap-2.5 sm:px-3 md:shrink md:w-full md:whitespace-normal";

const navActive =
  "bg-primary/8 text-primary ring-1 ring-primary/20 dark:bg-primary/15 dark:text-[#9be7dc] dark:ring-primary/30";
const navIdle =
  "text-text-muted hover:bg-slate-50 dark:hover:bg-white/5";
const navDisabled =
  "cursor-not-allowed select-none text-text-muted opacity-55";

const navIconBox =
  "grid h-7 w-7 place-items-center rounded-lg border text-[14px] shrink-0";
const navIconIdle = "border-line text-text-muted bg-surface";
const navIconActive =
  "border-primary/30 bg-primary/8 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-[#9be7dc]";
const navIconDisabled = "border-line bg-slate-50 text-slate-400";

/* ─── Section Label ─── */
const sectionLabel =
  "px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted hidden md:block";

/* ─── Sidebar Sections ─── */
/** Detailed grouping — only for the roles with enough menu items to warrant it
 *  (Admin, Doctor, Receptionist). Purely presentational: role visibility is
 *  still driven entirely by `roleHide` / `visibleItems`. */
const DETAILED_SECTIONS: { id: ProfileSection; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "clinic", label: "Clinic & Scheduling" },
  { id: "prescribing", label: "Prescriptions & Medicines" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "policies", label: "Policies" },
  { id: "referrals", label: "Referrals" },
];

/** Original two-group layout, kept for every other role. */
const SIMPLE_SECTIONS: { label: string; match: (s: ProfileSection) => boolean }[] =
  [
    { label: "Account", match: (s) => s === "account" },
    { label: "Practice Settings", match: (s) => s !== "account" },
  ];

const DETAILED_NAV_ROLES: Role[] = ["Admin", "Doctor", "Receptionist"];

const allItems: MenuItem[] = [
  // ─── Account (Personal) ───
  {
    key: "overview",
    to: "/profile",
    label: "Profile Overview",
    icon: <LuUser />,
    section: "account",
  },
  {
    key: "security",
    to: "/profile/security",
    label: "Security & Access",
    icon: <LuKeyRound />,
    section: "account",
  },
  {
    key: "appUpdates",
    to: "/profile/app-updates",
    label: "App Updates",
    icon: <LuSmartphone />,
    section: "account",
  },
  // ─── Practice Settings ───
  {
    key: "clinic",
    to: "/profile/clinic",
    label: "Clinic Details",
    icon: <LuHospital />,
    section: "clinic",
  },
  {
    key: "onlineBookingSettings",
    to: "/profile/online-booking",
    label: "Online Booking",
    icon: <LuGlobe />,
    section: "clinic",
  },
  {
    key: "services",
    to: "/profile/services",
    label: "Services & Price",
    icon: <LuStethoscope />,
    section: "clinic",
  },
  {
    key: "availability",
    to: "/profile/availability",
    label: "Doctor Availability",
    icon: <LuClock />,
    section: "clinic",
  },
  {
    key: "medicines",
    to: "/profile/medicines",
    label: "Medicines",
    icon: <LuPill />,
    section: "prescribing",
  },
  {
    key: "noLoss",
    to: "/profile/no-loss",
    label: "No Loss",
    icon: <LuShield />,
    section: "pharmacy",
  },
  {
    key: "referral",
    to: "/profile/referral",
    label: "Referral",
    icon: <LuUsers />,
    section: "referrals",
  },
  {
    key: "prescriptionTemplates",
    to: "/profile/prescription-templates",
    label: "Prescription Templates",
    icon: <LuFileStack />,
    section: "prescribing",
  },
  {
    key: "labReportTemplate",
    to: "/profile/lab-report-template",
    label: "Report Template",
    icon: <LuFileStack />,
    section: "prescribing",
  },
  {
    key: "prescriptionPreference",
    to: "/profile/prescription-preference",
    label: "Prescription Preference",
    icon: <LuSlidersHorizontal />,
    section: "prescribing",
  },
  {
    key: "noShowPolicy",
    to: "/profile/no-show-policy",
    label: "No Show Policy",
    icon: <LuCircleAlert />,
    section: "policies",
  },
  {
    key: "cancellationPolicy",
    to: "/profile/cancellation-policy",
    label: "Cancellation Policy",
    icon: <LuCalendarX />,
    section: "policies",
  },
  {
    key: "notificationSettings",
    to: "/profile/my-notifications",
    label: "My Notifications",
    icon: <LuBell />,
    section: "account",
  },
];

const roleHide: Record<Role, MenuKey[]> = {
  Admin: ["services", "availability", "medicines", "paymentVisibility", "prescriptionPreference", "noLoss", "appUpdates", "labReportTemplate"],
  Doctor: ["subscription", "referral", "noShowPolicy", "cancellationPolicy", "notificationSettings", "noLoss", "appUpdates", "labReportTemplate"],
  Patient: [
    "clinic",
    "services",
    "availability",
    "referral",
    "prescriptionTemplates",
    "labReportTemplate",
    "medicines",
    "subscription",
    "security",
    "noShowPolicy",
    "cancellationPolicy",
    "paymentVisibility",
    "prescriptionPreference",
    "notificationSettings",
    "onlineBookingSettings",
    "noLoss",
    "appUpdates"
  ],
  Receptionist: [
    "services",
    "availability",
    "medicines",
    "referral",
    "prescriptionTemplates",
    "labReportTemplate",
    "subscription",
    "noShowPolicy",
    "cancellationPolicy",
    "paymentVisibility",
    "prescriptionPreference",
    "notificationSettings",
    "onlineBookingSettings",
    "noLoss",
    "appUpdates"
  ],
  Pharmacist: [
    "services",
    "availability",
    "medicines",
    "referral",
    "prescriptionTemplates",
    "labReportTemplate",
    "subscription",
    "noShowPolicy",
    "cancellationPolicy",
    "paymentVisibility",
    "prescriptionPreference",
    "notificationSettings",
    "onlineBookingSettings",
    "appUpdates"
  ],
  Lab_Assistant: [
    "services",
    "availability",
    "medicines",
    "referral",
    "prescriptionTemplates",
    "subscription",
    "noShowPolicy",
    "cancellationPolicy",
    "paymentVisibility",
    "prescriptionPreference",
    "notificationSettings",
    "onlineBookingSettings",
    "noLoss",
    "appUpdates"
  ],
};

const pendingEnabledProfileKeys = new Set<MenuKey>([
  "overview",
  "services",
  "availability",
  "security",
  "clinic",
  "medicines",
]);

const pendingDoctorEnabledProfileKeys = new Set<MenuKey>([
  "services",
  "availability",
  "security",
  "medicines",
]);

const pendingEnabledProfilePathPrefixes = [
  "/profile/services",
  "/profile/availability",
  "/profile/security",
  "/profile/clinic",
  "/profile/medicines",
];

const pendingDoctorEnabledProfilePathPrefixes = [
  "/profile/services",
  "/profile/availability",
  "/profile/security",
  "/profile/medicines",
];

const pendingEnabledProfileExactPaths = new Set(["/profile", "/profile/edit"]);
const pendingDoctorEnabledProfileExactPaths = new Set<string>();

const normalizeProfilePath = (path: string) =>
  path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

const isPendingEnabledProfilePath = (
  path: string,
  isPendingDoctorProfile = false,
) => {
  const normalizedPath = normalizeProfilePath(path);
  const exactPaths = isPendingDoctorProfile
    ? pendingDoctorEnabledProfileExactPaths
    : pendingEnabledProfileExactPaths;
  const pathPrefixes = isPendingDoctorProfile
    ? pendingDoctorEnabledProfilePathPrefixes
    : pendingEnabledProfilePathPrefixes;

  return (
    exactPaths.has(normalizedPath) ||
    pathPrefixes.some(
      (prefix) =>
        normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
    )
  );
};

function normalizeRole(userType?: string): Role {
  const raw = String(userType ?? "").trim().toLowerCase();

  if (raw.includes("admin")) return "Admin";
  if (raw.includes("doctor")) return "Doctor";
  if (raw.includes("reception")) return "Receptionist";
  if (raw.includes("pharmacist")) return "Pharmacist";
  if (raw.includes("lab")) return "Lab_Assistant";

  return "Patient";
}

const Profile: React.FC = () => {
  const { data: userData } = useGetUserQuery();
  const user = (userData as any)?.user ?? userData;

  const effectiveUserType = useEffectiveUserType();
  const role = normalizeRole(effectiveUserType);
  const isAdmin = user?.userType === "Admin";
  const hasAdminDoctorAccess = !!user?.isAdminDoctorAccess;
  const isSuperAdmin =
    user?.userType === "Super_Admin" || effectiveUserType === "Super_Admin";
  const isPharmacist = role === "Pharmacist";
  const isReceptionist = role === "Receptionist";
  const isLabAssistant = role === "Lab_Assistant";
  const shouldLoadClinicProfile =
    !isSuperAdmin && (isAdmin || role === "Doctor");
  const { data: clinics } = useGetAllClinicsQuery(undefined, {
    skip: !shouldLoadClinicProfile,
  });
  const clinicProfile = (clinics as any)?.profile;
  const userStatus = clinicProfile?.userStatus ?? user?.userStatus;
  const isPendingApproval = normalizeStatus(userStatus) === "pending";
  const isPendingDoctorProfile = role === "Doctor" && isPendingApproval;

  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const shouldRedirect = (isPharmacist || isReceptionist || isLabAssistant) && isPendingApproval && (location.pathname === "/profile" || location.pathname === "/profile/overview");
    if (shouldRedirect) {
      navigate("/profile/security", { replace: true });
    }
  }, [isPharmacist, isReceptionist, isLabAssistant, isPendingApproval, location.pathname, navigate]);

  const visibleItems = React.useMemo(() => {
    if (isSuperAdmin) {
      return allItems.filter((i) => i.key === "security" || i.key === "appUpdates");
    }

    if (isPharmacist) {
      if (isPendingApproval) {
        return allItems.filter((i) => i.key === "security");
      }
      const hide = new Set(roleHide["Pharmacist"]);
      return allItems.filter((i) => !hide.has(i.key));
    }

    if (isReceptionist) {
      if (isPendingApproval) {
        return allItems.filter((i) => i.key === "security");
      }
      const hide = new Set(roleHide["Receptionist"]);
      return allItems.filter((i) => !hide.has(i.key));
    }

    if (isLabAssistant) {
      if (isPendingApproval) {
        return allItems.filter((i) => i.key === "security");
      }
      const hide = new Set(roleHide["Lab_Assistant"]);
      return allItems.filter((i) => !hide.has(i.key));
    }

    if (isAdmin && hasAdminDoctorAccess) {
      return allItems.filter((i) => i.key !== "noLoss" && i.key !== "appUpdates" && i.key !== "labReportTemplate");
    }

    const hide = new Set(roleHide[role] ?? []);

    return allItems.filter((i) => !hide.has(i.key));
  }, [role, isAdmin, hasAdminDoctorAccess, isSuperAdmin, isPharmacist, isReceptionist, isLabAssistant, isPendingApproval]);

  // Grouped for display only — role filtering already happened in visibleItems,
  // so a section with nothing left for this role simply isn't rendered.
  const navSections = React.useMemo(() => {
    const useDetailed = !isSuperAdmin && DETAILED_NAV_ROLES.includes(role);

    const groups = useDetailed
      ? DETAILED_SECTIONS.map((section) => ({
          key: section.id,
          label: section.label,
          items: visibleItems.filter((i) => i.section === section.id),
        }))
      : SIMPLE_SECTIONS.map((section) => ({
          key: section.label,
          label: section.label,
          items: visibleItems.filter((i) => section.match(i.section)),
        }));

    return groups.filter((group) => group.items.length > 0);
  }, [visibleItems, role, isSuperAdmin]);
  const isProfileNavItemDisabled = React.useCallback(
    (key: MenuKey) =>
      isPendingApproval &&
      !(isPendingDoctorProfile
        ? pendingDoctorEnabledProfileKeys
        : pendingEnabledProfileKeys
      ).has(key),
    [isPendingApproval, isPendingDoctorProfile],
  );

  React.useEffect(() => {
    const pathToKey: Array<[string, MenuKey]> = [
      ["/profile/my-notifications", "notificationSettings"],
      ["/profile/availability", "availability"],
      ["/profile/prescription-preference", "prescriptionPreference"],
      ["/profile/prescription-templates", "prescriptionTemplates"],
      ["/profile/lab-report-template", "labReportTemplate"],
      ["/profile/services", "services"],
      ["/profile/clinic", "clinic"],
      ["/profile/medicines", "medicines"],
      ["/profile/security", "security"],
      ["/profile/no-loss", "noLoss"],
      ["/profile/no-show-policy", "noShowPolicy"],
      ["/profile/cancellation-policy", "cancellationPolicy"],
      ["/profile/online-booking", "onlineBookingSettings"],
      ["/profile/contact-support", "contactSupport"],
      ["/profile/app-updates", "appUpdates"],
      ["/profile", "overview"],
    ];

    const match = pathToKey.find(
      ([p]) => location.pathname === p || location.pathname.startsWith(p + "/"),
    );

    if (!match) return;

    const [, k] = match;

    if (isSuperAdmin) {
      if (
        location.pathname !== "/profile/security" &&
        location.pathname !== "/profile/app-updates"
      ) {
        navigate("/profile/security", { replace: true });
      }
      return;
    }

    if (
      isPendingApproval &&
      !isPendingEnabledProfilePath(location.pathname, isPendingDoctorProfile)
    ) {
      navigate(isPendingDoctorProfile ? "/profile/security" : "/profile", {
        replace: true,
      });
      return;
    }

    const isAllowed = visibleItems.some((i) => i.key === k);
    if (!isAllowed) {
      const fallback = visibleItems[0]?.to ?? "/profile";
      navigate(fallback, { replace: true });
    }
  }, [
    location.pathname,
    role,
    navigate,
    visibleItems,
    isAdmin,
    hasAdminDoctorAccess,
    isSuperAdmin,
    isPendingApproval,
    isPendingDoctorProfile,
  ]);

  const renderNavItem = (mi: MenuItem, end: boolean) => {
    const isDisabled = isProfileNavItemDisabled(mi.key);

    if (isDisabled) {
      return (
        <div
          key={mi.key}
          role="link"
          aria-disabled="true"
          title="Available after account approval"
          className={`${navItem} ${navDisabled}`}
        >
          <span className={`${navIconBox} ${navIconDisabled}`}>
            {mi.icon}
          </span>
          <span className="min-w-0 flex-1 truncate hidden sm:inline md:whitespace-normal md:break-words text-[13px] leading-4">
            {mi.label}
          </span>
        </div>
      );
    }

    return (
      <NavLink
        key={mi.key}
        end={end}
        to={mi.to}
        className={({ isActive }) =>
          `${navItem} ${isActive ? navActive : navIdle}`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`${navIconBox} ${isActive ? navIconActive : navIconIdle}`}>
              {mi.icon}
            </span>
            <span className="min-w-0 flex-1 truncate hidden sm:inline md:whitespace-normal md:break-words text-[13px] leading-4">
              {mi.label}
            </span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <UnsavedChangesProvider>
      <UnsavedChangesPrompt />

      <div className="text-text">
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <h2 className="text-[20px] font-semibold leading-tight tracking-tight text-text sm:text-[24px] md:text-[26px]">
            My Profile
          </h2>
          <FeatureInfoTip
            title="Profile & Settings Tips"
            tips={profileTips}
            guideSection="profile-guide"
            linkLabel="Read settings guide"
          />
        </div>

        <div className="flex flex-col gap-3 md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-5">
          {/* Profile Sidebar Navigation */}
          <aside
            className="rounded-xl border border-line bg-surface p-1.5 sm:rounded-2xl sm:p-2 md:sticky md:top-4 md:self-start md:max-h-[calc(100dvh-8rem)] md:overflow-y-auto sidebar-scroll"
          >
            <nav className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5 md:pb-0 md:flex-col md:gap-0 md:overflow-x-visible">
              {navSections.map((section) => (
                <React.Fragment key={section.key}>
                  <div className={sectionLabel}>{section.label}</div>
                  {section.items.map((mi) =>
                    renderNavItem(mi, mi.key === "overview"),
                  )}
                </React.Fragment>
              ))}
            </nav>
          </aside>

          {/* Page Content */}
          <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface sm:rounded-2xl">
            <Outlet context={{ doctorId: user?.id ?? "" }} />
          </section>
        </div>
      </div>
    </UnsavedChangesProvider>
  );
};

export default Profile;
