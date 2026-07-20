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
} from "react-icons/lu";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router"; 

import { UnsavedChangesProvider } from "../../context/UnsavedChangesContext";
import { useEffectiveUserType } from "../../hooks/useEffectiveUserType";
import { useGetUserQuery } from "../../redux/api/authApi";
import UnsavedChangesPrompt from "../../components/UnsavedChangesPrompt";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { profileTips } from "../../constants/featureTips";

/* ─── Navigation Styles ─── */
const navItem =
  "flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors duration-200 " +
  "shrink-0 sm:gap-2.5 sm:px-3 md:shrink md:w-full md:whitespace-normal";

const navActive =
  "bg-primary/8 text-primary ring-1 ring-primary/20 dark:bg-primary/15 dark:text-[#9be7dc] dark:ring-primary/30";
const navIdle =
  "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5";

const navIconBox =
  "grid h-7 w-7 place-items-center rounded-lg border text-[14px] shrink-0";
const navIconIdle =
  "border-slate-200 text-slate-500 bg-white dark:border-[#38445a] dark:bg-[#0f1728] dark:text-slate-300";
const navIconActive =
  "border-primary/30 bg-primary/8 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-[#9be7dc]";

/* ─── Section Label ─── */
const sectionLabel =
  "px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 hidden md:block";

type Role = "Admin" | "Doctor" | "Patient" | "Receptionist" | "Pharmacist";

type MenuKey =
  | "overview"
  | "clinic"
  | "services"
  | "availability"
  | "medicines"
  | "subscription"
  | "security"
  | "noLoss"
  | "referral"
  | "prescriptionTemplates"
  | "prescriptionPreference"
  | "prescriptionScanner"
  | "contactSupport"
  | "noShowPolicy"
  | "cancellationPolicy"
  | "paymentVisibility"
  | "notificationSettings"
  | "appUpdates";

type MenuItem = {
  key: MenuKey;
  to: string;
  label: string;
  icon: React.ReactNode;
  section: "account" | "practice";
};

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
    section: "practice",
  },
  {
    key: "services",
    to: "/profile/services",
    label: "Services & Price",
    icon: <LuStethoscope />,
    section: "practice",
  },
  {
    key: "availability",
    to: "/profile/availability",
    label: "Doctor Availability",
    icon: <LuClock />,
    section: "practice",
  },
  {
    key: "medicines",
    to: "/profile/medicines",
    label: "Medicines",
    icon: <LuPill />,
    section: "practice",
  },
  {
    key: "noLoss",
    to: "/profile/no-loss",
    label: "No Loss",
    icon: <LuShield />,
    section: "practice",
  },
  {
    key: "referral",
    to: "/profile/referral",
    label: "Referral",
    icon: <LuUsers />,
    section: "practice",
  },
  {
    key: "prescriptionTemplates",
    to: "/profile/prescription-templates",
    label: "Prescription Templates",
    icon: <LuFileStack />,
    section: "practice",
  },
  {
    key: "prescriptionPreference",
    to: "/profile/prescription-preference",
    label: "Prescription Preference",
    icon: <LuSlidersHorizontal />,
    section: "practice",
  },
  {
    key: "noShowPolicy",
    to: "/profile/no-show-policy",
    label: "No Show Policy",
    icon: <LuCircleAlert />,
    section: "practice",
  },
  {
    key: "cancellationPolicy",
    to: "/profile/cancellation-policy",
    label: "Cancellation Policy",
    icon: <LuCalendarX />,
    section: "practice",
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
  Admin: ["services", "availability", "medicines", "paymentVisibility", "prescriptionPreference", "noLoss", "appUpdates"],
  Doctor: ["clinic", "subscription", "referral", "security", "noShowPolicy", "cancellationPolicy", "notificationSettings", "noLoss", "appUpdates"],
  Patient: [
    "clinic",
    "services",
    "availability",
    "referral",
    "prescriptionTemplates",
    "medicines",
    "subscription",
    "security",
    "noShowPolicy",
    "cancellationPolicy",
    "paymentVisibility",
    "prescriptionPreference",
    "notificationSettings",
    "noLoss",
    "appUpdates"
  ],
  Receptionist: [
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
    "noLoss",
    "appUpdates"
  ],
  Pharmacist: [
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
    "appUpdates"
  ],
};

function normalizeRole(userType?: string): Role {
  const raw = String(userType ?? "").trim().toLowerCase();

  if (raw.includes("admin")) return "Admin";
  if (raw.includes("doctor")) return "Doctor";
  if (raw.includes("reception")) return "Receptionist";
  if (raw.includes("pharmacist")) return "Pharmacist";

  return "Patient";
}

const Profile: React.FC = () => {
  const { data: userData } = useGetUserQuery();
  const user = (userData as any)?.user ?? userData;

  const isAdmin = user?.userType === "Admin";
  const hasAdminDoctorAccess = !!user?.isAdminDoctorAccess;

  const effectiveUserType = useEffectiveUserType();
  const role = normalizeRole(effectiveUserType);
  const isSuperAdmin =
    user?.userType === "Super_Admin" || effectiveUserType === "Super_Admin";
  const isPharmacist = role === "Pharmacist";

  const location = useLocation();
  const navigate = useNavigate();

  const visibleItems = React.useMemo(() => {
    if (isSuperAdmin) {
      return allItems.filter((i) => i.key === "security" || i.key === "appUpdates");
    }

    if (isPharmacist) {
      const hide = new Set(roleHide["Pharmacist"]);
      return allItems.filter((i) => !hide.has(i.key));
    }

    if (isAdmin && hasAdminDoctorAccess) {
      return allItems.filter((i) => i.key !== "noLoss" && i.key !== "appUpdates");
    }

    const hide = new Set(roleHide[role] ?? []);

    return allItems.filter((i) => !hide.has(i.key));
  }, [role, isAdmin, hasAdminDoctorAccess, isSuperAdmin, isPharmacist]);

  const accountItems = React.useMemo(
    () => visibleItems.filter((i) => i.section === "account"),
    [visibleItems],
  );
  const practiceItems = React.useMemo(
    () => visibleItems.filter((i) => i.section === "practice"),
    [visibleItems],
  );

  React.useEffect(() => {
    const pathToKey: Array<[string, MenuKey]> = [
      ["/profile/my-notifications", "notificationSettings"],
      ["/profile/availability", "availability"],
      ["/profile/prescription-preference", "prescriptionPreference"],
      ["/profile/prescription-templates", "prescriptionTemplates"],
      ["/profile/services", "services"],
      ["/profile/clinic", "clinic"],
      ["/profile/medicines", "medicines"],
      ["/profile/security", "security"],
      ["/profile/no-loss", "noLoss"],
      ["/profile/no-show-policy", "noShowPolicy"],
      ["/profile/cancellation-policy", "cancellationPolicy"],
      ["/profile/contact-support", "contactSupport"],
      ["/profile", "overview"],
    ];

    const hide = new Set(roleHide[role] ?? []);

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

    if (!(isAdmin && hasAdminDoctorAccess) && hide.has(k)) {
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
  ]);

  return (
    <UnsavedChangesProvider>
      <UnsavedChangesPrompt />

      <div className="text-slate-950 dark:text-slate-100">
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <h2 className="text-[20px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-[24px] md:text-[26px]">
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
            className="rounded-xl border border-slate-200 bg-white p-1.5 dark:border-[#273244] dark:bg-[#111726] sm:rounded-2xl sm:p-2 md:sticky md:top-4 md:self-start md:max-h-[calc(100dvh-8rem)] md:overflow-y-auto sidebar-scroll"
          >
            <nav className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5 md:pb-0 md:flex-col md:gap-0 md:overflow-x-visible">
              {/* Account Section */}
              {accountItems.length > 0 && (
                <>
                  <div className={sectionLabel}>Account</div>
                  {accountItems.map((mi) => (
                    <NavLink
                      key={mi.key}
                      end={mi.key === "overview"}
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
                  ))}
                </>
              )}

              {/* Practice Settings Section */}
              {practiceItems.length > 0 && (
                <>
                  <div className={sectionLabel}>Practice Settings</div>
                  {practiceItems.map((mi) => (
                    <NavLink
                      key={mi.key}
                      end={false}
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
                  ))}
                </>
              )}
            </nav>
          </aside>

          {/* Page Content */}
          <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#273244] dark:bg-[#111726] sm:rounded-2xl">
            <Outlet context={{ doctorId: user?.id ?? "" }} />
          </section>
        </div>
      </div>
    </UnsavedChangesProvider>
  );
};

export default Profile;
