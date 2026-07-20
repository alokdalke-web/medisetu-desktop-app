import React, { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

import CallIncomingModal from "../components/shared/CallIncomingModal";
import Header from "../components/shared/Header";
import Sidebar from "../components/shared/Sidebar";
import { useCallAlerts } from "../hooks/useCallAlerts";
import { useTheme } from "../hooks/useTheme";
import { useGetUserQuery } from "../redux/api/authApi";
import { useGetAllClinicsQuery } from "../redux/api/clinicApi";
import { useGetDoctorQuery } from "../redux/api/doctorApi";
import {
  CLINIC_SETUP_COMPLETED_EVENT,
  clearClinicSetupComplete,
  getDoctorAvailabilityList,
  getClinicSetupStatus,
  hasCompletedSubscriptionSetup,
  isClinicSetupMarkedComplete,
  normalizeStatus,
} from "../utils/clinicSetupStatus";

/* ------------------------------ Global Skeleton UI ------------------------------ */

const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={["skeleton", className].join(" ")} />
);

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = "",
  children,
}) => (
  <div
    className={[
      "rounded-2xl border border-slate-200 bg-white p-4 md:p-5",
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

type SkeletonVariant =
  | "dashboard"
  | "appointment"
  | "patients"
  | "payments"
  | "settings"
  | "generic";

const getVariantFromPath = (pathname: string): SkeletonVariant => {
  const p = (pathname || "").toLowerCase();

  if (p === "/" || p.startsWith("/dashboard")) return "dashboard";
  if (p.startsWith("/appointment")) return "appointment";
  if (p.startsWith("/patients")) return "patients";

  if (
    p.startsWith("/payments-history") ||
    p.startsWith("/payment-history") ||
    p.startsWith("/payments") ||
    p.startsWith("/payment")
  )
    return "payments";

  return "generic";
};

const getCompletedSetupRedirectPath = (userType?: string) => {
  switch (userType) {
    case "Patient":
      return "/patient-dashboard";
    case "Pharmacist":
      return "/pharmacy/dashboard";
    case "Receptionist":
      return "/appointment";
    case "Lab_Assistant":
      return "/lab/dashboard";
    default:
      return "/dashboard";
  }
};

const SidebarSkeleton: React.FC<{ collapsed?: boolean }> = ({
  collapsed = false,
}) => {
  return (
    <aside className="hidden xl:block xl:row-span-2 xl:col-start-1 border-r border-slate-200 bg-white">
      <div className={["h-full p-4", collapsed ? "px-3" : ""].join(" ")}>
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <Skel className={["h-10 w-10 rounded-2xl", "bg-slate-200/80"].join(" ")} />
          {!collapsed && (
            <div className="flex-1">
              <Skel className="h-4 w-36 rounded-lg" />
              <Skel className="mt-2 h-3 w-24 rounded-lg" />
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skel className="h-9 w-9 rounded-xl" />
              {!collapsed && <Skel className="h-4 w-full max-w-[180px] rounded-lg" />}
            </div>
          ))}
        </div>

        {/* Bottom user card */}
        <div className="absolute hidden xl:block bottom-4 left-4 right-4">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
            <div className="flex items-center gap-3">
              <Skel className="h-9 w-9 rounded-full" />
              {!collapsed && (
                <div className="flex-1">
                  <Skel className="h-3 w-24 rounded-lg" />
                  <Skel className="mt-2 h-3 w-16 rounded-lg" />
                </div>
              )}
              <Skel className="h-7 w-10 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const HeaderSkeleton: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 md:px-6 h-16">
        <div className="flex items-center gap-3">
          <Skel className="h-10 w-10 rounded-xl xl:hidden" />
          <div>
            <Skel className="h-4 w-40 rounded-lg" />
            <Skel className="mt-2 h-3 w-28 rounded-lg" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Skel className="h-9 w-9 rounded-full" />
          <Skel className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </header>
  );
};

/* ------------------------------ Page Skeletons ------------------------------ */

const DashboardSkeleton: React.FC = () => (
  <div className="grid gap-4 md:gap-5">
    <div className="flex items-center justify-between gap-3">
      <Skel className="h-7 w-40 rounded-xl" />
      <Skel className="h-10 w-48 rounded-xl" />
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <div className="flex items-start justify-between">
            <Skel className="h-10 w-10 rounded-2xl" />
            <Skel className="h-4 w-12 rounded-lg" />
          </div>
          <Skel className="mt-4 h-3 w-28 rounded-lg" />
          <Skel className="mt-3 h-8 w-20 rounded-xl" />
        </Card>
      ))}
    </div>

    <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
      <Card>
        <div className="flex items-center justify-between">
          <Skel className="h-5 w-40 rounded-lg" />
          <Skel className="h-4 w-24 rounded-lg" />
        </div>
        <Skel className="mt-5 h-[200px] w-full rounded-2xl" />
      </Card>

      <Card>
        <Skel className="h-5 w-40 rounded-lg" />
        <div className="mt-6 flex items-center gap-6">
          <Skel className="h-36 w-36 rounded-full" />
          <div className="flex-1 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skel className="h-3 w-24 rounded-lg" />
                <Skel className="h-3 w-10 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <Skel className="h-5 w-40 rounded-lg" />
        <Skel className="mt-5 h-[220px] w-full rounded-2xl" />
      </Card>
      <Card>
        <Skel className="h-5 w-40 rounded-lg" />
        <Skel className="mt-5 h-[220px] w-full rounded-2xl" />
      </Card>
    </div>
  </div>
);

const AppointmentSkeleton: React.FC = () => (
  <div className="grid gap-4 md:gap-5">
    <div className="flex items-center justify-between gap-3">
      <Skel className="h-7 w-44 rounded-xl" />
      <Skel className="h-10 w-40 rounded-full" />
    </div>

    <Card className="p-0 overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skel key={i} className="h-4 w-16 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Skel className="h-3 w-14 rounded-lg" />
          <Skel className="h-9 w-56 rounded-xl" />
          <Skel className="h-9 w-[320px] rounded-xl" />
          <div className="ml-auto flex gap-2">
            <Skel className="h-9 w-9 rounded-xl" />
            <Skel className="h-9 w-9 rounded-xl" />
            <Skel className="h-9 w-9 rounded-xl" />
          </div>
        </div>
      </div>
    </Card>

    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Skel className="h-3 w-36 rounded-lg" />
        <Skel className="h-8 w-20 rounded-lg" />
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skel key={i} className="h-8 w-8 rounded-lg" />
        ))}
      </div>
    </div>

    <Card className="p-0 overflow-hidden">
      <div className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
        <div className="grid grid-cols-5 gap-4">
          <Skel className="h-3 w-20 rounded-lg" />
          <Skel className="h-3 w-20 rounded-lg" />
          <Skel className="h-3 w-24 rounded-lg" />
          <Skel className="h-3 w-20 rounded-lg" />
          <Skel className="h-3 w-16 rounded-lg justify-self-end" />
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-6 py-4">
            <div className="grid grid-cols-5 gap-4 items-center">
              <div className="flex items-center gap-3">
                <Skel className="h-10 w-10 rounded-full" />
                <div>
                  <Skel className="h-4 w-28 rounded-lg" />
                  <Skel className="mt-2 h-3 w-24 rounded-lg" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skel className="h-10 w-10 rounded-full" />
                <div>
                  <Skel className="h-4 w-24 rounded-lg" />
                  <Skel className="mt-2 h-3 w-20 rounded-lg" />
                </div>
              </div>
              <div>
                <Skel className="h-4 w-28 rounded-lg" />
                <Skel className="mt-2 h-3 w-16 rounded-lg" />
              </div>
              <Skel className="h-7 w-24 rounded-lg" />
              <Skel className="h-8 w-8 rounded-full justify-self-end" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

const PatientsSkeleton: React.FC = () => (
  <div className="grid gap-4 md:gap-5">
    <div className="flex items-center justify-between gap-3">
      <Skel className="h-7 w-40 rounded-xl" />
      <Skel className="h-10 w-36 rounded-full" />
    </div>

    <Card className="p-0 overflow-hidden">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Skel className="h-9 w-[360px] rounded-xl" />
          <div className="ml-auto flex gap-2">
            <Skel className="h-9 w-9 rounded-xl" />
            <Skel className="h-9 w-9 rounded-xl" />
          </div>
        </div>
      </div>
    </Card>

    <div className="flex items-center gap-2">
      <Skel className="h-3 w-28 rounded-lg" />
      <Skel className="h-8 w-20 rounded-lg" />
    </div>

    <Card className="p-0 overflow-hidden">
      <div className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <Skel className="h-3 w-24 rounded-lg" />
          <Skel className="h-3 w-24 rounded-lg" />
          <Skel className="h-3 w-24 rounded-lg" />
          <Skel className="h-3 w-16 rounded-lg justify-self-end" />
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="grid grid-cols-4 gap-4 items-center">
          <div className="flex items-center gap-3">
            <Skel className="h-10 w-10 rounded-full" />
            <div>
              <Skel className="h-4 w-28 rounded-lg" />
              <Skel className="mt-2 h-3 w-20 rounded-lg" />
            </div>
          </div>
          <div>
            <Skel className="h-4 w-28 rounded-lg" />
            <Skel className="mt-2 h-3 w-16 rounded-lg" />
          </div>
          <Skel className="h-4 w-24 rounded-lg" />
          <Skel className="h-9 w-9 rounded-full justify-self-end" />
        </div>
      </div>
    </Card>
  </div>
);

const PaymentsSkeleton: React.FC = () => (
  <div className="grid gap-4 md:gap-5">
    <Skel className="h-7 w-52 rounded-xl" />

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Skel className="h-9 w-20 rounded-full" />
        <Skel className="h-9 w-20 rounded-full" />
        <Skel className="h-9 w-24 rounded-full" />
      </div>

      <div className="flex items-center gap-3">
        <Skel className="h-9 w-[360px] rounded-xl" />
        <Skel className="h-9 w-48 rounded-xl" />
      </div>
    </div>

    <Card className="p-0 overflow-hidden">
      <div className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skel key={i} className="h-3 w-20 rounded-lg" />
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="grid grid-cols-6 gap-4 items-center">
          <div className="flex items-center gap-3">
            <Skel className="h-10 w-10 rounded-full" />
            <div>
              <Skel className="h-4 w-24 rounded-lg" />
              <Skel className="mt-2 h-3 w-20 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skel className="h-10 w-10 rounded-full" />
            <div>
              <Skel className="h-4 w-20 rounded-lg" />
              <Skel className="mt-2 h-3 w-24 rounded-lg" />
            </div>
          </div>
          <Skel className="h-4 w-24 rounded-lg" />
          <Skel className="h-4 w-20 rounded-lg" />
          <Skel className="h-4 w-24 rounded-lg" />
          <Skel className="h-7 w-16 rounded-full justify-self-end" />
        </div>

        <Skel className="mt-4 h-3 w-40 rounded-lg" />
      </div>
    </Card>
  </div>
);

const SettingsSkeleton: React.FC = () => (
  <div className="grid gap-4 md:gap-5">
    <Skel className="h-7 w-32 rounded-xl" />

    <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
      <Card>
        <Skel className="h-5 w-56 rounded-lg" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skel className="h-10 w-10 rounded-2xl" />
                  <div>
                    <Skel className="h-4 w-40 rounded-lg" />
                    <Skel className="mt-2 h-3 w-56 rounded-lg" />
                  </div>
                </div>
                <Skel className="h-6 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4">
        <Card>
          <Skel className="h-5 w-32 rounded-lg" />
          <Skel className="mt-3 h-3 w-56 rounded-lg" />
          <Skel className="mt-5 h-6 w-12 rounded-full ml-auto" />
        </Card>

        <Card>
          <Skel className="h-5 w-28 rounded-lg" />
          <Skel className="mt-5 h-9 w-full rounded-xl" />
        </Card>
      </div>
    </div>

    <Card>
      <div className="flex items-center justify-between">
        <Skel className="h-5 w-28 rounded-lg" />
        <Skel className="h-4 w-40 rounded-lg" />
      </div>
      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-10">
        <Skel className="mx-auto h-4 w-64 rounded-lg" />
      </div>
    </Card>

    <div className="flex justify-end gap-3">
      <Skel className="h-10 w-36 rounded-full" />
      <Skel className="h-10 w-36 rounded-full" />
    </div>
  </div>
);

const GenericSkeleton: React.FC = () => (
  <div className="grid gap-4 md:gap-5">
    <div className="flex items-center justify-between gap-3">
      <Skel className="h-7 w-40 rounded-xl" />
      <Skel className="h-10 w-36 rounded-full" />
    </div>

    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <Skel className="h-9 w-56 rounded-xl" />
        <Skel className="h-9 w-[320px] rounded-xl" />
        <div className="ml-auto flex gap-2">
          <Skel className="h-9 w-9 rounded-xl" />
          <Skel className="h-9 w-9 rounded-xl" />
        </div>
      </div>
    </Card>

    <Card>
      <Skel className="h-5 w-48 rounded-lg" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skel className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skel className="h-4 w-2/3 rounded-lg" />
              <Skel className="mt-2 h-3 w-1/3 rounded-lg" />
            </div>
            <Skel className="h-7 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  </div>
);

const MainLayoutSkeleton: React.FC<{
  pathname: string;
  isLabAssistant?: boolean;
  isSidebarCollapsed?: boolean;
}> = ({ pathname, isLabAssistant = false, isSidebarCollapsed = false }) => {
  const variant = getVariantFromPath(pathname);

  return (
    <div
      className={[
        "h-[100dvh] overflow-hidden bg-gray-50",
        "grid grid-cols-1 grid-rows-[auto_1fr]",
        // ✅ CHANGE: Lab ko 1-col mat banao (admin-like layout)
        isSidebarCollapsed ? "xl:grid-cols-[5rem_1fr]" : "xl:grid-cols-[16rem_1fr]",
        "transition-[grid-template-columns] duration-300 ease-in-out",
      ].join(" ")}
    >
      {/* ✅ CHANGE: Lab skeleton me bhi sidebar dikhana hai */}
      {!isLabAssistant && <SidebarSkeleton collapsed={isSidebarCollapsed} />}
      {isLabAssistant && <SidebarSkeleton collapsed={isSidebarCollapsed} />}

      <HeaderSkeleton />

      <main className="min-h-0 overflow-y-auto xl:col-start-2 px-4 py-4 sm:px-5 sm:py-5 md:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto w-full max-w-[1600px]">
          {variant === "dashboard" && <DashboardSkeleton />}
          {variant === "appointment" && <AppointmentSkeleton />}
          {variant === "patients" && <PatientsSkeleton />}
          {variant === "payments" && <PaymentsSkeleton />}
          {variant === "settings" && <SettingsSkeleton />}
          {variant === "generic" && <GenericSkeleton />}

          <style>{`
          .skeleton{
            position: relative;
            overflow: hidden;
            background: rgba(226,232,240,.85);
          }
          .skeleton::after{
            content:"";
            position:absolute;
            inset:0;
            transform: translateX(-100%);
            background: linear-gradient(90deg, transparent, rgba(255,255,255,.65), transparent);
            animation: shimmer 1.15s infinite;
          }
          @keyframes shimmer{
            100%{ transform: translateX(100%); }
          }
        `}</style>
        </div>
      </main>
    </div>
  );
};

/* ------------------------------------------------------------------------ */

const MainLayout: React.FC = () => {
  const { incomingCall, clearIncomingCall, handlePickup, handleDecline } =
    useCallAlerts();
  const { isDark } = useTheme();

  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [, setSetupCompletionVersion] = useState(0);

  const { data: user, isLoading: isUserLoading } = useGetUserQuery();
  const location = useLocation();

  // Auto-collapse sidebar on profile pages
  useEffect(() => {
    if (location.pathname.startsWith('/profile')) {
      setIsSidebarCollapsed(true);
    }
  }, [location.pathname]);

  const isAdmin = user?.userType === "Admin";
  const isDoctor = user?.userType === "Doctor";

  const { data: clinics, isLoading: isClinicsLoading } = useGetAllClinicsQuery(
    undefined,
    { skip: !isAdmin },
  );
  const clinicProfile = clinics?.profile as any;

  const hasClinic = !!clinics?.clinic;
  const userStatus = clinicProfile?.userStatus ?? user?.userStatus;
  const isPendingApproval = normalizeStatus(userStatus) === "pending";
  const adminRequiresDoctorSetup =
    isAdmin &&
    (clinicProfile?.isAdminDoctorAccess ?? user?.isAdminDoctorAccess ?? true);
  const shouldLoadDoctorSetup =
    isDoctor ||
    (isAdmin && hasClinic && !isPendingApproval && adminRequiresDoctorSetup);

  const { data: doctorData, isLoading: isDoctorLoading } = useGetDoctorQuery(
    undefined,
    { skip: !shouldLoadDoctorSetup },
  );
  const doctorAvailability = getDoctorAvailabilityList(doctorData?.result);
  const hasDoctorServices = Boolean(
    doctorData?.result?.services && doctorData.result.services.length > 0,
  );
  const hasDoctorAvailability = Boolean(
    doctorAvailability && doctorAvailability.length > 0,
  );

  const setupStatus = getClinicSetupStatus({
    userId: user?.id,
    clinicId: clinics?.clinic?.id,
    userType: user?.userType,
    userStatus: user?.userStatus,
    isAdminDoctorAccess: user?.isAdminDoctorAccess,
    clinic: clinics?.clinic,
    profile: clinicProfile,
    subscription: clinics?.subscription,
    doctorProfile: doctorData?.result?.doctorProfile,
    doctorServices: doctorData?.result?.services,
    doctorAvailability,
  });
  const shouldUseSetupRoute = setupStatus.shouldUseSetupRoute;
  const isSetupRoute = location.pathname === "/clinic-setup";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileLeftOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ✅ CHANGE: Lab assistant ke liye drawer close force mat karo
  // useEffect(() => {
  //   if (isLabAssistant) setMobileLeftOpen(false);
  // }, [isLabAssistant]);

  useEffect(() => {
    setMobileLeftOpen(false);
  }, [location.pathname]);

  // Auto-collapse sidebar during onboarding flow
  const prevCollapsedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (isSetupRoute) {
      // Save previous state and collapse
      if (prevCollapsedRef.current === null) {
        prevCollapsedRef.current = isSidebarCollapsed;
      }
      if (!isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      }
    } else {
      // Restore previous state when leaving setup route
      if (prevCollapsedRef.current !== null) {
        setIsSidebarCollapsed(prevCollapsedRef.current);
        prevCollapsedRef.current = null;
      }
    }
  }, [isSetupRoute]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const refreshSetupCompletion = () =>
      setSetupCompletionVersion((version) => version + 1);

    window.addEventListener(
      CLINIC_SETUP_COMPLETED_EVENT,
      refreshSetupCompletion,
    );
    window.addEventListener("storage", refreshSetupCompletion);

    return () => {
      window.removeEventListener(
        CLINIC_SETUP_COMPLETED_EVENT,
        refreshSetupCompletion,
      );
      window.removeEventListener("storage", refreshSetupCompletion);
    };
  }, []);

  useEffect(() => {
    if (!shouldLoadDoctorSetup) return;
    if (!setupStatus.shouldUseSetupRoute) return;
    if (setupStatus.isPendingApproval) return;
    if (hasDoctorServices && hasDoctorAvailability) return;
    if (
      !isClinicSetupMarkedComplete({
        userId: user?.id,
        clinicId: clinics?.clinic?.id,
      })
    ) {
      return;
    }

    clearClinicSetupComplete({
      userId: user?.id,
      clinicId: clinics?.clinic?.id,
    });
  }, [
    shouldLoadDoctorSetup,
    setupStatus.shouldUseSetupRoute,
    setupStatus.isPendingApproval,
    hasDoctorServices,
    hasDoctorAvailability,
    user?.id,
    clinics?.clinic?.id,
  ]);

  // ✅ Skeleton keep (no remove)
  if (
    isUserLoading ||
    (isAdmin && isClinicsLoading) ||
    (shouldLoadDoctorSetup && isDoctorLoading)
  ) {
    return (
      <MainLayoutSkeleton
        pathname={location.pathname}
        // ✅ CHANGE: Lab ke liye bhi admin-like skeleton layout (sidebar+header)
        isLabAssistant={false}
        isSidebarCollapsed={isSidebarCollapsed}
      />
    );
  }


  // ✅ ONBOARDING GUARD: Redirect to clinic-setup if onboarding is in progress
  // Only apply to Admin and Doctor users (not Receptionist, Pharmacist, Lab_Assistant, etc.)

  // Type guard for onboarding status properties
  interface OnboardingProfile {
    onboardingStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    approvalRequestSent?: boolean;
  }

  const onboardingStatus = (clinicProfile as OnboardingProfile)?.onboardingStatus || (user as OnboardingProfile)?.onboardingStatus;
  const approvalRequestSent = (clinicProfile as OnboardingProfile)?.approvalRequestSent ?? false;
  const isOnboardingInProgress = onboardingStatus === 'IN_PROGRESS' || onboardingStatus === 'NOT_STARTED';
  const isOnboardingRoute = location.pathname === "/clinic-setup";
  const shouldEnforceOnboarding = isAdmin || isDoctor;

  // Exception: If user is already approved (active status), don't enforce onboarding
  const isUserActive = normalizeStatus(userStatus) === "active";

  // If onboarding is in progress and user tries to access other routes, redirect to setup
  // UNLESS they have already submitted their approval request or are already active
  if (isOnboardingInProgress && !isOnboardingRoute && shouldEnforceOnboarding && !approvalRequestSent && !isUserActive) {
    return <Navigate to="/clinic-setup" replace />;
  }

  if (!shouldUseSetupRoute && isSetupRoute) {
    // Only redirect away from clinic-setup if user explicitly completed the wizard
    // (paid plan or localStorage flag set by the wizard's subscription step)
    const explicitlyCompleted = hasCompletedSubscriptionSetup(
      clinics?.subscription,
      user?.id,
      clinics?.clinic?.id,
    );
    if (explicitlyCompleted) {
      return <Navigate to={getCompletedSetupRedirectPath(user?.userType)} replace />;
    }
  }

  return (
    <div
      style={
        {
          // Expose the current sidebar width as a CSS variable so fixed/sticky
          // descendants (e.g. the prescription action bar) can align dynamically.
          "--app-sidebar-w": isSidebarCollapsed ? "5rem" : "16rem",
        } as React.CSSProperties
      }
      className={[
        isDark ? "dark" : "",
        "h-[100dvh] overflow-hidden bg-gray-50",
        "grid grid-cols-1 grid-rows-[auto_1fr]",
        // ✅ CHANGE: Lab ko 1-col layout mat do (warna xl:col-start-2 se blank space aata hai)
        isSidebarCollapsed ? "xl:grid-cols-[5rem_1fr]" : "xl:grid-cols-[16rem_1fr]",
        "transition-[grid-template-columns] duration-300 ease-in-out",
      ].join(" ")}
    >
      {/* ✅ CHANGE: Lab me bhi Desktop Sidebar show karo */}
      <div className="hidden xl:block xl:row-span-2 xl:col-start-1">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      </div>

      {/* ✅ CHANGE: Lab me bhi burger open allowed */}
      <Header onOpenLeft={() => setMobileLeftOpen(true)} />

      <main className="min-h-0 overflow-y-auto xl:col-start-2 px-4 py-4 sm:px-5 sm:py-5 md:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto w-full ">
          <Outlet />
        </div>
      </main>

      {/* ✅ CHANGE: Lab me bhi Mobile Drawer enable */}
      <div
        className={`xl:hidden fixed inset-0 z-50 ${mobileLeftOpen ? "" : "pointer-events-none"
          }`}
        role="dialog"
        aria-modal="true"
        aria-label="Sidebar menu"
      >
        <div
          onClick={() => setMobileLeftOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity ${mobileLeftOpen ? "opacity-100" : "opacity-0"
            }`}
        />

        <div
          className={[
            "absolute left-0 top-0 h-full w-72 max-w-[85%]",
            "transition-transform",
            mobileLeftOpen ? "translate-x-0" : "-translate-x-full",
            "flex flex-col",
          ].join(" ")}
        >
          <div className="flex-1 min-h-0">
            <Sidebar onCloseSidebar={() => setMobileLeftOpen(false)} />
          </div>
        </div>
      </div>

      <CallIncomingModal
        isOpen={!!incomingCall}
        onClose={clearIncomingCall}
        callType={incomingCall?.callType || "NEXT_PATIENT"}
        callerName={incomingCall?.doctorName || ""}
        profileImage={incomingCall?.profileImage}
        onPickup={handlePickup}
        onDecline={handleDecline}
      />
    </div>
  );
};

export default MainLayout;
