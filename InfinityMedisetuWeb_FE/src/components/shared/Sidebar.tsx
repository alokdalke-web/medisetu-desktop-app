import {
  addToast,
  Chip,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import React, { useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiChevronDown,
  FiClipboard,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiHome,
  FiLayers,
  FiLock,
  FiLogOut,
  FiPhone,
  FiPhoneOff,
  FiSearch,
  FiSettings,
  FiSliders,
  FiTag,
  FiTruck,
  FiUser,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { Link, NavLink, useLocation, useNavigate } from "react-router";

import Icons from "../../constants/icons";
import Images from "../../constants/images";
import { useEffectiveUserType } from "../../hooks/useEffectiveUserType";
import { useTheme } from "../../hooks/useTheme";
import { BarcodeLookupModal } from "../../pages/lab/components/BarcodeLookupModal";
import LogoutModal from "../../pages/settings/LogoutModal";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import { useGetDoctorQuery } from "../../redux/api/doctorApi";

import { PiCrownSimpleFill } from "react-icons/pi";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  removeActiveCall,
  setDoctorCallStatus,
} from "../../redux/slices/callSlice";
import {
  acknowledgeCall,
  callReception,
  cancelCall,
  getSocket,
} from "../../services/socket";
import {
  CLINIC_SETUP_COMPLETED_EVENT,
  normalizeStatus,
} from "../../utils/clinicSetupStatus";
import BannerDisplay from "../banners/BannerDisplay";
import EditPharmacyDetailsModal from "./Modals/EditPharmacyDetailsModal";
import StatusChip from "./StatusChip";

/* ✅ Mobile compact, desktop normal */
const baseItem =
  "group flex items-center min-w-0 rounded-xl text-[15px] font-medium transition-all duration-200";
const baseItemExpanded = "gap-3 px-3 py-2.5";
const baseItemCollapsed = "justify-center px-0 py-2.5 gap-0";
const activeItem = "bg-primary text-white shadow-sm hover:text-white";
const idleItem =
  "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-800 dark:hover:bg-white/5 dark:hover:text-white";
const disabledItem =
  "text-gray-400 cursor-not-allowed opacity-50 dark:text-white";

const approvalLockedTooltip = (
  <div className="max-w-[220px] px-1 py-0.5">
    <p className="text-[13px] font-semibold text-slate-900 dark:text-white">
      Wait for approval
    </p>
    <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-300">
      This feature unlocks after your account is approved.
    </p>
  </div>
);

/* ✅ Icon wrappers */
const iconBox = "flex items-center justify-center shrink-0 w-[18px] h-[18px]";
const iconBoxIdle = "text-slate-500 dark:text-slate-600";
const iconBoxActive = "text-white";

/* ✅ Label animation — smooth reveal/hide during collapse */
const labelCls = (collapsed: boolean) =>
  collapsed
    ? "w-0 max-w-0 opacity-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out"
    : "w-auto max-w-[180px] opacity-100 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out delay-75";

/* ✅ Smooth label animation for profile card */

const labelBase = `overflow-hidden whitespace-nowrap
   transition-[max-width,opacity] duration-300 ease-in-out`;

const labelCollapsed = "max-w-0 opacity-0";
const labelExpanded = "max-w-[180px] opacity-100 delay-75";

function capitalizeDisplayName(value?: string | null) {
  return String(value ?? "")
    .trim()
    .replace(
      /(^|[\s-])([a-z])/g,
      (_match, prefix: string, letter: string) =>
        `${prefix}${letter.toUpperCase()}`,
    );
}

/* ✅ Reusable local SVG nav icon (active route => white icon) */
type LocalNavIconProps = {
  fileName: string;
  isActiveRoute: (pathname: string) => boolean;
  fallback: (active: boolean) => React.ReactNode;
};

const LocalNavIcon: React.FC<LocalNavIconProps> = ({
  fileName,
  isActiveRoute,
  fallback,
}) => {
  const [failed, setFailed] = React.useState(false);
  const { pathname } = useLocation();

  const normalize = (p: string) =>
    p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;

  const active = isActiveRoute(normalize(pathname));

  if (failed) {
    return fallback(active);
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}assets/icons/${fileName}`}
      alt={fileName.replace(".svg", "")}
      className={`h-4 w-4 sm:h-[18px] sm:w-[18px] object-contain shrink-0 block transition-all duration-200 ${
        active
          ? "filter-[brightness(0)_invert(1)] opacity-100" // active => white icon
          : "filter-[brightness(0)] opacity-70 dark:filter-[brightness(0)_invert(1)] dark:opacity-100" // inactive => dark gray in light, white in dark
      }`}
      onError={(e) => {
        console.log("Sidebar icon failed to load:", e.currentTarget.src);
        setFailed(true);
      }}
    />
  );
};

type Role =
  | "Admin"
  | "Doctor"
  | "Patient"
  | "Receptionist"
  | "Super_Admin"
  | "Pharmacist"
  | "Lab_Assistant";

type NavItem = {
  key: string;
  to: string;
  label: string;
  end?: boolean;
  icon: React.ReactNode;
  allowedRoles: Role[];
  premiumOnly?: boolean;
  children?: NavChildItem[];
};

type NavChildItem = {
  key: string;
  to: string;
  label: string;
  premiumOnly?: boolean;
};

type CallIntent = "RECEPTION" | "NEXT_PATIENT";

const callOptions: Array<{ type: CallIntent; label: string }> = [
  { type: "RECEPTION", label: "General Call" },
  { type: "NEXT_PATIENT", label: "Next Patient" },
];

/* ----------------------------- Pharmacy Types ----------------------------- */

type PharmacyStatus = "active" | "deactive";

type PharmacyEditValues = {
  name: string;
  address: string;
  contactNumber: string;
  status: PharmacyStatus;
};

/* -------------------------------------------------------------------------- */

export type SidebarProps = {
  onCloseSidebar?: () => void; // ✅ drawer close handler (mobile)
  isCollapsed?: boolean;
  setIsCollapsed?: (v: boolean) => void;
};

/* ✅ Icons responsive (mobile smaller) */
const navItems: NavItem[] = [
  {
    key: "dashboard",
    to: "/dashboard",
    label: "Dashboard",
    end: true,
    icon: (
      <LocalNavIcon
        fileName="Dashboardicon.svg"
        isActiveRoute={(p) => p === "/dashboard" || p.startsWith("/dashboard/")}
        fallback={(active) => (
          <FiGrid
            className={`text-[16px] sm:text-[18px] ${
              active ? "text-white" : "text-slate-600"
            }`}
          />
        )}
      />
    ),
    allowedRoles: ["Admin", "Doctor", "Patient", "Super_Admin", "Receptionist"],
  },
  {
    key: "pharmacyDashboard",
    to: "/pharmacy/dashboard",
    label: "Dashboard",
    end: true,
    icon: (
      <LocalNavIcon
        fileName="Dashboardicon.svg"
        isActiveRoute={(p) =>
          p === "/pharmacy/dashboard" || p.startsWith("/pharmacy/dashboard/")
        }
        fallback={(active) => (
          <FiGrid
            className={`text-[16px] sm:text-[18px] ${
              active ? "text-white" : "text-slate-600"
            }`}
          />
        )}
      />
    ),
    allowedRoles: ["Pharmacist"],
  },
  {
    key: "appointments",
    to: "/appointment",
    label: "Appointment",
    allowedRoles: ["Admin", "Doctor", "Patient", "Receptionist"],
    icon: (
      <LocalNavIcon
        fileName="Appointmenticon.svg"
        isActiveRoute={(p) =>
          p === "/appointment" || p.startsWith("/appointment/")
        }
        fallback={(active) => (
          <FiCalendar
            className={`text-[16px] sm:text-[18px] ${
              active ? "text-white" : "text-slate-600"
            }`}
          />
        )}
      />
    ),
  },
  {
    key: "patients",
    to: "/patients",
    label: "Patients",
    icon: (
      <LocalNavIcon
        fileName="Easy-Patient-icon.svg"
        isActiveRoute={(p) =>
          p === "/patients" ||
          p.startsWith("/patients/") ||
          p.startsWith("/patient/")
        }
        fallback={(active) => (
          <FiUsers
            className={`text-[16px] sm:text-[18px] ${
              active ? "text-white" : "text-slate-600"
            }`}
          />
        )}
      />
    ),
    allowedRoles: ["Admin", "Doctor", "Receptionist"],
  },
  {
    key: "labDashboard",
    to: "/lab/dashboard",
    label: "Dashboard",
    end: true,
    icon: <FiGrid className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Lab_Assistant"],
  },
  {
    key: "labAllTests",
    to: "/lab/all-tests",
    label: "Patient Test Requests",
    icon: <FiFileText className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Lab_Assistant"],
  },

  {
    key: "labAssigned",
    to: "/lab/assigned",
    label: "Active Tests",
    icon: <FiLayers className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Lab_Assistant"],
  },
  {
    key: "labWalkInTest",
    to: "/lab/walk-in-test",
    label: "Add Walk-in Test",
    icon: <FiUserPlus className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Lab_Assistant"],
  },
  {
    key: "labQueue",
    to: "/lab/queue",
    label: "Lab Test Catalog",
    icon: <FiClipboard className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Lab_Assistant"],
  },
  {
    key: "labBarcodeLookup",
    to: "#barcode-lookup",
    label: "Barcode Lookup",
    icon: <FiTag className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Lab_Assistant"],
  },
  {
    key: "subscribedPatients",
    to: "/payment-history",
    label: "Payments History",
    icon: (
      <LocalNavIcon
        fileName="Paymenthistory.svg"
        isActiveRoute={(p) =>
          p === "/payment-history" || p.startsWith("/payment-history/")
        }
        fallback={(active) => (
          <FiCreditCard
            className={`text-[16px] sm:text-[18px] ${
              active ? "text-white" : "text-slate-600"
            }`}
          />
        )}
      />
    ),
    allowedRoles: ["Admin", "Doctor"],
  },
  {
    key: "reports",
    to: "/reports",
    label: "Reports",
    premiumOnly: true,
    icon: (
      <LocalNavIcon
        fileName="reports-icon.svg"
        isActiveRoute={(p) => p === "/reports" || p.startsWith("/reports/")}
        fallback={(active) => (
          <FiFileText
            className={`text-[16px] sm:text-[18px] ${
              active ? "text-white" : "text-slate-600"
            }`}
          />
        )}
      />
    ),
    allowedRoles: ["Admin"],
  },
  {
    key: "no-show",
    to: "/no-show",
    label: "No Show",
    icon: (
      <LocalNavIcon
        fileName="Noshow.svg"
        isActiveRoute={(p) => p === "/no-show" || p.startsWith("/no-show/")}
        fallback={(active) => (
          <FiAlertCircle
            className={`text-[16px] sm:text-[18px] ${
              active ? "text-white" : "text-slate-600"
            }`}
          />
        )}
      />
    ),
    allowedRoles: ["Admin", "Doctor", "Receptionist"],
  },
  {
    key: "pharmacyPrescriptions",
    to: "/pharmacy/prescriptions",
    label: "Prescriptions",
    icon: <FiClipboard className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Pharmacist"],
  },
  {
    key: "pharmacyMedicines",
    to: "/pharmacy/medicines",
    label: "Medicines",
    icon: <FiLayers className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Pharmacist"],
  },
  {
    key: "pharmacyStock",
    to: "/pharmacy/stock",
    label: "Stock",
    icon: <FiClipboard className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Pharmacist"],
  },
  {
    key: "pharmacySales",
    to: "/pharmacy/sales",
    label: "Sales",
    icon: <FiCreditCard className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Pharmacist"],
  },
  {
    key: "pharmacySuppliers",
    to: "/pharmacy/suppliers",
    label: "Suppliers",
    icon: <FiTruck className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Pharmacist"],
  },
  {
    key: "pharmacyPatientSubscription",
    to: "/pharmacy/patient-subscription",
    label: "Patient Subscription",
    icon: <FiCalendar className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Pharmacist"],
  },
  {
    key: "configuration",
    to: "/configuration",
    label: "Configuration",
    icon: (
      <LocalNavIcon
        fileName="settings-icon.svg"
        isActiveRoute={(p) =>
          p === "/configuration" ||
          p.startsWith("/configuration/") ||
          p === "/users" ||
          p.startsWith("/user/") ||
          p === "/notification-settings" ||
          p.startsWith("/notification-settings/") ||
          p === "/subscription" ||
          p.startsWith("/subscription/") ||
          p === "/profile/clinic" ||
          p.startsWith("/profile/clinic/")
        }
        fallback={(active) => (
          <FiSettings
            className={`text-[16px] sm:text-[18px] ${
              active ? "text-white" : "text-slate-600"
            }`}
          />
        )}
      />
    ),
    allowedRoles: ["Admin"],
    children: [
      { key: "config-lab-pharmacy", to: "/configuration", label: "Lab & Pharmacy", premiumOnly: true },
      { key: "config-users", to: "/users", label: "Users & Roles" },
      { key: "config-notification-templates", to: "/notification-settings", label: "Notification Config" },
      { key: "config-subscription", to: "/subscription", label: "Subscription" },
    ],
  },
  {
    key: "clinics",
    to: "/clinics",
    label: "Clinics",
    icon: <FiHome className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Super_Admin"],
  },
  {
    key: "subscription-plans",
    to: "/subscription-plans",
    label: "Subscription",
    icon: <FiCreditCard className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Super_Admin"],
  },
  {
    key: "coupons",
    to: "/coupons",
    label: "Coupons",
    icon: <FiTag className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Super_Admin"],
  },
  {
    key: "plan-limits",
    to: "/plan-limits",
    label: "Plan Limits",
    icon: <FiSliders className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Super_Admin"],
  },
  {
    key: "request",
    to: "/request",
    label: "Clinic Requests",
    icon: <FiClipboard className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Super_Admin"],
  },
  {
    key: "profile-request",
    to: "/profile-request",
    label: "Profile Requests",
    icon: <FiUser className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Super_Admin"],
  },
  {
    key: "referrals",
    to: "/referrals",
    label: "Referrals",
    icon: <FiUsers className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Super_Admin"],
  },
  {
    key: "banners",
    to: "/banners",
    label: "Broadcast Hub",
    icon: <FiLayers className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Super_Admin"],
  },
  {
    key: "patientReports",
    to: "/report",
    label: "Reports",
    icon: <FiFileText className="text-[16px] sm:text-[18px]" />,
    allowedRoles: ["Patient"],
  },
];

const pickUser = (data: any) => data?.user ?? data;

const Sidebar: React.FC<SidebarProps> = ({
  onCloseSidebar,
  isCollapsed = false,
  setIsCollapsed,
}) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const { isOpen: isEditOpen, onOpenChange: onEditOpenChange } =
    useDisclosure();

  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [barcodeInputVal, setBarcodeInputVal] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [callIntent, setCallIntent] = useState<CallIntent>("RECEPTION");
  const [, setSetupCompletionVersion] = useState(0);
  const { isDark } = useTheme();

  const { data: userData, isLoading: isUserLoading } = useGetUserQuery();

  const user: any = pickUser(userData);

  const pharmacyDetails = user?.pharmacyDetails ?? null;
  const pharmacyName = pharmacyDetails?.pharmacyName || "Pharmacy";

  const initialEditValues: PharmacyEditValues = React.useMemo(
    () => ({
      name: (pharmacyDetails?.name ?? pharmacyName ?? "").toString(),
      address: (pharmacyDetails?.address ?? "").toString(),
      contactNumber: (pharmacyDetails?.contactNumber ?? "").toString(),
      status: (pharmacyDetails?.status === "deactive"
        ? "deactive"
        : "active") as PharmacyStatus,
    }),
    [
      pharmacyDetails?.name,
      pharmacyDetails?.address,
      pharmacyDetails?.contactNumber,
      pharmacyDetails?.status,
      pharmacyName,
    ],
  );

  const handleSavePharmacyDetails = async (_values: PharmacyEditValues) => {
    try {
      addToast({
        title: "Updated",
        description: "Pharmacy details saved successfully.",
        color: "success",
      });
    } catch (err: any) {
      addToast({
        title: "Update failed",
        description:
          err?.data?.message ||
          err?.error?.message ||
          err?.message ||
          "Something went wrong",
        color: "danger",
      });
      throw err;
    }
  };

  const eff: any = useEffectiveUserType();
  const userType = (typeof eff === "string" ? eff : eff?.userType) as
    | Role
    | "Lab_Assistant"
    | undefined;

  const actualUserType = user?.userType as Role | "Lab_Assistant" | undefined;
  const isAdmin = actualUserType === "Admin";
  const hasAdminDoctorAccess = user?.isAdminDoctorAccess;

  const { data: clinics } = useGetAllClinicsQuery(undefined, {
    skip: !isAdmin,
  });

  const [showCallOptions, setShowCallOptions] = useState(false);
  const { data: userClinics } = useGetAllClinicsQuery();
  const currentClinic = userClinics?.clinic;
  const clinicData = clinics ?? userClinics;
  const clinicProfile = clinicData?.profile as any;

  const setupRole = actualUserType ?? userType;
  const isSetupAdmin = setupRole === "Admin";
  const isSetupDoctor = setupRole === "Doctor";
  const hasClinic = !!clinicData?.clinic;
  const userStatus = clinicProfile?.userStatus ?? user?.userStatus;
  const isPendingApproval = normalizeStatus(userStatus) === "pending";
  const isApprovalLocked =
    isPendingApproval && (isSetupAdmin || isSetupDoctor);
  const adminRequiresDoctorSetup =
    isSetupAdmin &&
    (clinicProfile?.isAdminDoctorAccess ?? user?.isAdminDoctorAccess ?? true);
  const shouldLoadDoctorSetup =
    isSetupDoctor ||
    (isSetupAdmin &&
      hasClinic &&
      !isPendingApproval &&
      adminRequiresDoctorSetup);

  useGetDoctorQuery(
    undefined,
    { skip: !shouldLoadDoctorSetup },
  );
  const isAdminSetupLocked = isApprovalLocked;

  const isFreePlan = isAdmin && clinics?.subscription?.planName !== "Pro";

  const dispatch = useAppDispatch();
  const callStatus = useAppSelector((state) => state.call.doctorCallStatus);
  const activeCalls = useAppSelector((state) => state.call.activeCalls);
  const activeRole = useAppSelector((state) => state.role.activeRole);

  React.useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.id) return;
    return () => {};
  }, [user?.id, userType, currentClinic?.id]);

  React.useEffect(() => {
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

  // ---------------- Active route helper ----------------
  const normalize = (p: string) =>
    p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;

  const isRouteActive = (itemKey: string, to: string, end?: boolean) => {
    const path = normalize(pathname);
    const target = normalize(to);

    if (itemKey === "appointments") {
      return path === "/appointment" || path.startsWith("/appointment/");
    }

    if (itemKey === "patients") {
      return (
        path === "/patients" ||
        path.startsWith("/patients/") ||
        path.startsWith("/patient/")
      );
    }

    if (itemKey === "subscribedPatients") {
      return (
        path === "/payment-history" || path.startsWith("/payment-history/")
      );
    }

    if (itemKey === "labAllTests") {
      return (
        path === "/lab/all-tests" ||
        path.startsWith("/lab/all-tests/") ||
        path.startsWith("/lab/tests/")
      );
    }

    if (end) return path === target;
    return path === target || path.startsWith(`${target}/`);
  };

  const handleNavItemClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    to: string,
    isLabRoute: boolean,
  ) => {
    onCloseSidebar?.();

    if (!isLabRoute) return;
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    navigate(to);
  };
  // ------------------------------------------------------

  if (isUserLoading || !userType) {
    return (
      <aside
        className={`
          sticky top-0 h-screen
          ${isCollapsed ? "w-20" : "w-full"}
          bg-white xl:border border-border-color
          transition-[width] duration-300 ease-in-out
        `}
      >
        <div
          className={`px-4 sm:px-10 xl:px-12 py-5 sm:py-6 ${
            isCollapsed ? "px-4" : ""
          }`}
        >
          <div
            className={`h-7 sm:h-8 ${
              isCollapsed ? "w-10" : "w-28 sm:w-32"
            } rounded bg-slate-200 animate-pulse`}
          />
        </div>
        <div
          className={`px-3 sm:px-4 py-4 sm:py-5 space-y-3 ${
            isCollapsed ? "px-3" : ""
          }`}
        >
          <div className="h-10 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-10 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-10 rounded-xl bg-slate-200 animate-pulse" />
        </div>
      </aside>
    );
  }

  const role = userType as Role;

  const handleCallReception = async (callType: CallIntent = "RECEPTION") => {
    if (!currentClinic?.id) return;

    try {
      await callReception({
        clinicId: currentClinic.id,
        doctorId: user?.id,
        doctorName: user?.name,
        profileImage: user?.profileImage,
        callType,
      });

      dispatch(
        setDoctorCallStatus(
          callType === "NEXT_PATIENT"
            ? "Waiting for next patient..."
            : "Waiting for reception...",
        ),
      );
    } catch (_err: unknown) {}
  };

  const handleCancelCall = async () => {
    if (!currentClinic?.id) return;
    try {
      await cancelCall({
        doctorId: user?.id,
        clinicId: currentClinic.id,
      });
      dispatch(setDoctorCallStatus(null));
    } catch (_err: unknown) {}
  };

  const handleAcknowledge = async (call: any) => {
    try {
      await acknowledgeCall({
        doctorId: call.doctorId,
        receptionId: user?.id,
        receptionName: user?.name,
        clinicId: call.clinicId,
      });
      dispatch(removeActiveCall(call.doctorId));
    } catch (_err: any) {}
  };

  const isDoctorOrAdminDoctor =
    role === "Doctor" ||
    (isAdmin &&
      hasAdminDoctorAccess &&
      (!activeRole || activeRole === "Admin" || activeRole === "Doctor"));

  const handleCallButtonClick = () => {
    if (isAdminSetupLocked) return;

    if (callStatus) {
      handleCancelCall();
      return;
    }

    if (!isCollapsed) {
      setShowCallOptions(true);
    }
  };

  const handleCallOptionSelect = (type: CallIntent) => {
    setCallIntent(type);
    handleCallReception(type);
    setShowCallOptions(false);
  };

  const renderCallButton = () => (
    <button
      id="tour-doctor-call-reception"
      onClick={handleCallButtonClick}
      disabled={isAdminSetupLocked}
      className={`${baseItem} ${isCollapsed ? baseItemCollapsed : baseItemExpanded} w-full ${
        isAdminSetupLocked
          ? disabledItem
          : callStatus
            ? "cursor-pointer text-red-500 hover:bg-red-50"
            : "cursor-pointer text-primary hover:bg-primary/10"
      }`}
      type="button"
    >
      <span className={`${iconBox}`}>
        {callStatus ? <FiPhoneOff /> : <FiPhone />}
      </span>
      <span className={`truncate font-medium ${labelCls(isCollapsed)}`}>
        {callStatus ? "Cancel Call" : "Call Reception"}
      </span>
      {callStatus && !isCollapsed && (
        <div className="ml-auto">
          <StatusChip status={callStatus} />
        </div>
      )}
    </button>
  );

  const renderCallOptions = (isCompact = false) => (
    <div
      className={`bg-slate-100 p-1 rounded-lg flex gap-1 ${
        isCompact ? "w-48" : ""
      }`}
    >
      {callOptions.map(({ type, label }) => (
        <button
          key={type}
          onClick={() => handleCallOptionSelect(type)}
          className={`flex-1 text-[10px] py-1 rounded-md transition-all duration-200 ${
            callIntent === type
              ? "bg-white text-primary font-bold shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );

  const visibleItems = navItems.filter((item) => {
    if (item.allowedRoles.includes(role)) return true;

    // When admin hasn't switched role but has Doctor access, also show Doctor items
    if (
      isAdmin &&
      !activeRole &&
      hasAdminDoctorAccess &&
      item.allowedRoles.includes("Doctor")
    ) {
      return true;
    }

    return false;
  });

  const homeTo = isAdminSetupLocked
    ? "/dashboard"
    : role === "Receptionist"
      ? "/appointment"
      : role === "Pharmacist"
        ? "/pharmacy/dashboard"
        : role === "Lab_Assistant"
          ? "/lab/dashboard"
          : "/dashboard";
  const isLabAssistantRole = role === "Lab_Assistant";
  const profileDisplayName = capitalizeDisplayName(
    isDoctorOrAdminDoctor ? `Dr. ${user?.name ?? ""}` : user?.name,
  );
  const profileCardClassName = `group flex w-full items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${
    isAdminSetupLocked
      ? "cursor-not-allowed opacity-70"
      : "hover:bg-white/60 dark:hover:bg-[#151c2d]"
  } ${
    isCollapsed ? "justify-center px-2 py-2.5 gap-0" : ""
  }`;

  const userInitials = (profileDisplayName || "U")
    .split(" ")
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const profileCardContent = (
    <>
      <div className={`relative shrink-0`}>
        {user?.profileImage ? (
          <img
            src={user.profileImage}
            alt="avatar"
            className={`${
              isCollapsed ? "h-8 w-8" : "h-9 w-9"
            } rounded-full object-cover ring-2 ring-primary/20 dark:ring-[#46beae]/30 transition-all duration-300 ease-in-out`}
          />
        ) : (
          <div
            className={`${
              isCollapsed ? "h-8 w-8 text-[11px]" : "h-9 w-9 text-[12px]"
            } rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center ring-2 ring-primary/20 dark:bg-[#1a3a35] dark:text-[#9be7dc] dark:ring-[#46beae]/30 transition-all duration-300 ease-in-out`}
          >
            {userInitials}
          </div>
        )}
        {isAdmin && clinics?.subscription?.planName === "Pro" && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 shadow-sm">
            <PiCrownSimpleFill className="text-white text-[8px]" />
          </span>
        )}
      </div>

      <div
        className={`${labelBase} ${
          isCollapsed ? labelCollapsed : labelExpanded
        } text-sm min-w-0 flex-1`}
      >
        <div className="truncate text-[13px] font-semibold text-slate-900 group-hover:text-teal-700 dark:text-white dark:group-hover:text-[#9be7dc]">
          {profileDisplayName}
        </div>
        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
          {userType || actualUserType}
        </div>
      </div>

      {!isCollapsed && <FiSettings className="mb-5 text-[16px] text-slate-500 dark:text-white" />}

      {isAdmin && clinics && !isCollapsed && (
        <div className="ml-auto">
          <Chip
            size="sm"
            className="bg-background-secondary text-primary dark:bg-[#0b1321] dark:text-[#9be7dc]"
          >
            {clinics?.subscription?.planName == "Pro" ? (
              <div className="flex gap-1">
                <PiCrownSimpleFill className="text-yellow-500 text-sm" />
                Pro
              </div>
            ) : (
              "Free"
            )}
          </Chip>
        </div>
      )}
    </>
  );
  const sidebarLogoSrc =
    isCollapsed && isDark
      ? Images.whiteSidebarLogo
      : isCollapsed
        ? Images.Sidebarlogo
        : isDark
          ? Images.whiteMediSetuLogo
          : Images.mediSetuLogo;

  return (
    <aside
      className={`
        sticky top-0
        h-[100dvh]
        ${isCollapsed ? "w-20" : "w-56 sm:w-64"}
        flex flex-col
        bg-white
        xl:border-r border-border-color
        z-40
        transition-[width] duration-300 ease-in-out
      `}
    >
      {/* ✅ Header */}
      <header className="shrink-0">
        <div
          className={`
            flex items-center
            ${isCollapsed ? "justify-center px-2" : "px-4 sm:px-6 xl:px-8"}
            py-5
            transition-all duration-300 ease-in-out
          `}
        >
          <Link
            to={homeTo}
            aria-label="Go to home"
            onClick={() => onCloseSidebar?.()}
            className="flex items-center justify-center"
          >
            <img
              src={sidebarLogoSrc}
              alt="MediSetu"
              className={`
                origin-center transform
                transition-[transform,opacity,width] duration-300 ease-in-out
                ${isCollapsed ? "w-8 opacity-90 scale-95" : "w-[140px] opacity-100 scale-100"}
              `}
            />
          </Link>
        </div>

        {/* Floating toggle – desktop */}
        {setIsCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label="Toggle sidebar"
            className={`
              hidden xl:grid
              absolute top-4 -right-4 z-[60]
              h-8 w-8 rounded-full
              bg-white border border-slate-200 shadow-md
              place-items-center
              hover:bg-slate-50 transition-colors cursor-pointer
            `}
          >
            <img
              src={Icons.sidebarCal}
              alt="Sidebar toggle"
              className={`
                transform transition-transform duration-300 ease-in-out
                ${isCollapsed ? "rotate-180" : "rotate-0"}
                dark:brightness-0 dark:invert
              `}
            />
          </button>
        )}
      </header>

      <nav
        className={`flex-1 min-h-0 space-y-2 ${
          isCollapsed ? "px-2" : "px-3 sm:px-4"
        } py-3 overflow-y-auto sidebar-scroll transition-[padding] duration-300 ease-in-out`}
      >
        {visibleItems.map((item) => {
          if (item.key === "labBarcodeLookup") {
            if (isCollapsed) {
              return (
                <Tooltip
                  key={item.key}
                  content={item.label}
                  placement="right"
                  closeDelay={0}
                >
                  <button
                    id="tour-lab-barcode-lookup"
                    type="button"
                    onClick={() => setIsLookupModalOpen(true)}
                    className={`${baseItem} ${baseItemCollapsed} ${idleItem} w-full cursor-pointer`}
                  >
                    <span className={`${iconBox} ${iconBoxIdle}`}>
                      {item.icon}
                    </span>
                  </button>
                </Tooltip>
              );
            }

            return (
              <div
                id="tour-lab-barcode-lookup"
                key={item.key}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center min-w-0 gap-2.5 rounded-xl px-3 sm:px-4 py-2 sm:py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-primary/40 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-primary/10 transition-colors duration-200"
              >
                <span className={`${iconBox} ${iconBoxIdle} shrink-0`}>
                  {item.icon}
                </span>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Barcode Lookup"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = barcodeInputRef.current?.value || "";
                      setBarcodeInputVal(val);
                      setIsLookupModalOpen(true);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-transparent text-[14px] sm:text-[15px] font-semibold outline-none text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const val = barcodeInputRef.current?.value || "";
                    setBarcodeInputVal(val);
                    setIsLookupModalOpen(true);
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200/50 text-slate-600 transition-colors hover:bg-primary hover:text-white dark:bg-slate-700/50 dark:text-slate-800 dark:hover:bg-primary dark:hover:text-white cursor-pointer"
                >
                  <FiSearch className="text-[14px]" />
                </button>
              </div>
            );
          }

          const isDisabled = isAdminSetupLocked && item.key !== "dashboard";
          const isPremiumLocked = item.premiumOnly && isFreePlan;
          const active = isRouteActive(item.key, item.to, item.end);
          const isLabRoute = item.to.startsWith("/lab/");

          const tourId =
            item.key === "dashboard"
              ? "tour-dashboard"
              : item.key === "appointments"
                ? "tour-appointments"
                : item.key === "patients"
                  ? "tour-patients"
                  : item.key === "users"
                    ? "tour-users"
                    : undefined;

          if (isDisabled) {
            return (
              <Tooltip
                key={item.key}
                content={approvalLockedTooltip}
                showArrow
                placement="right"
                closeDelay={0}
              >
                <div
                  aria-disabled="true"
                  title="Available after account approval"
                  className={`${baseItem} ${isCollapsed ? baseItemCollapsed : baseItemExpanded} ${disabledItem}`}
                >
                  <span className={`${iconBox} ${iconBoxIdle}`}>
                    {item.icon}
                  </span>
                  <span className={`truncate ${labelCls(isCollapsed)}`}>
                    {item.label}
                  </span>
                </div>
              </Tooltip>
            );
          }

          if (isPremiumLocked) {
            return (
              <Tooltip
                key={item.key}
                content={`${item.label} - Premium feature`}
                isDisabled={!isCollapsed}
                placement="right"
                closeDelay={0}
              >
                <Link
                  id={tourId}
                  to={item.to}
                  onClick={(event) =>
                    handleNavItemClick(event, item.to, isLabRoute)
                  }
                  aria-current={active ? "page" : undefined}
                  className={`${baseItem} ${isCollapsed ? baseItemCollapsed : baseItemExpanded} ${active ? activeItem : idleItem}`}
                >
                  <span className={`${iconBox} ${active ? iconBoxActive : iconBoxIdle}`}>
                    {item.icon}
                  </span>
                  <span className={`truncate ${isCollapsed ? "" : "flex-1"} ${labelCls(isCollapsed)}`}>
                    {item.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full bg-[#f0ebff] text-[#7c3aed] shadow-sm dark:bg-[#282043] dark:text-[#c8b6ff] transition-all duration-300 ease-in-out ${
                    isCollapsed
                      ? "w-0 max-w-0 opacity-0 p-0 border-0 scale-0 select-none pointer-events-none overflow-hidden"
                      : "w-auto max-w-[50px] opacity-100 px-2 py-[3px] text-[10px] font-semibold leading-none"
                  }`}>
                    <FiLock className="h-2.5 w-2.5" />
                  </span>
                </Link>
              </Tooltip>
            );
          }

          // Items with children render as a collapsible group
          if (item.children && item.children.length > 0) {
            const isGroupActive =
              active ||
              item.children.some(
                (child) =>
                  normalize(pathname) === normalize(child.to) ||
                  normalize(pathname).startsWith(`${normalize(child.to)}/`),
              );

            // Determine if submenu is open
            // Auto-expand when active UNLESS user explicitly collapsed it
            const isExpanded = collapsedGroups.has(item.key)
              ? false
              : expandedGroups.has(item.key) || isGroupActive;

            // Collapsed mode — icon with tooltip + dot indicator
            if (isCollapsed) {
              return (
                <Tooltip
                  key={item.key}
                  content={item.label}
                  placement="right"
                  closeDelay={0}
                >
                  <Link
                    to={item.to}
                    onClick={(event) =>
                      handleNavItemClick(event, item.to, isLabRoute)
                    }
                    aria-current={isGroupActive ? "page" : undefined}
                    className={`${baseItem} ${baseItemCollapsed} relative ${isGroupActive ? activeItem : idleItem}`}
                  >
                    <span className={`${iconBox} ${isGroupActive ? iconBoxActive : iconBoxIdle}`}>
                      {item.icon}
                    </span>
                    {/* Dot indicator — shows this item has children */}
                    <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full transition-colors ${
                      isGroupActive ? "bg-white/70" : "bg-slate-300 dark:bg-slate-600"
                    }`} />
                  </Link>
                </Tooltip>
              );
            }

            // Expanded mode — parent with toggle + collapsible children
            return (
              <div key={item.key} className="space-y-2">
                {/* Parent item — clicking toggles submenu */}
                <button
                  type="button"
                  id={tourId}
                  onClick={() => {
                    if (isExpanded) {
                      // Collapse — add to collapsed set, remove from expanded
                      setCollapsedGroups((prev) => new Set(prev).add(item.key));
                      setExpandedGroups((prev) => {
                        const next = new Set(prev);
                        next.delete(item.key);
                        return next;
                      });
                    } else {
                      // Expand — remove from collapsed set, add to expanded
                      setCollapsedGroups((prev) => {
                        const next = new Set(prev);
                        next.delete(item.key);
                        return next;
                      });
                      setExpandedGroups((prev) => new Set(prev).add(item.key));
                    }
                  }}
                  aria-expanded={isExpanded}
                  className={`${baseItem} ${baseItemExpanded} w-full ${isGroupActive ? activeItem : idleItem}`}
                >
                  <span className={`${iconBox} ${isGroupActive ? iconBoxActive : iconBoxIdle}`}>
                    {item.icon}
                  </span>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  <FiChevronDown
                    className={`ml-auto shrink-0 text-[11px] transition-transform duration-200 ${
                      isGroupActive ? "text-white/70" : "text-slate-400"
                    } ${isExpanded ? "rotate-180" : "rotate-0"}`}
                  />
                </button>

                {/* Sub-items — collapsible */}
                {isExpanded && (
                  <div className="ml-[22px] space-y-1.5 border-l-2 border-primary/20 pl-3 dark:border-primary/30">
                    {item.children.map((child) => {
                      const childPath = normalize(pathname);
                      const childTarget = normalize(child.to);

                      // Custom matching per child
                      let childActive = false;
                      if (child.key === "config-lab-pharmacy") {
                        childActive =
                          childPath === "/configuration" ||
                          childPath.startsWith("/configuration/");
                      } else if (child.key === "config-users") {
                        childActive =
                          childPath === "/users" ||
                          childPath.startsWith("/user/new") ||
                          (childPath.startsWith("/user/") && !childPath.startsWith("/user/pharmacy"));
                      } else {
                        childActive =
                          childPath === childTarget ||
                          childPath.startsWith(`${childTarget}/`);
                      }

                      // Premium lock per child
                      const isChildLocked = child.premiumOnly && isFreePlan;

                      if (isChildLocked) {
                        return (
                          <Link
                            key={child.key}
                            to={child.to}
                            onClick={() => onCloseSidebar?.()}
                            className="relative flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all duration-150 dark:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
                          >
                            <span>{child.label}</span>
                            <span className="inline-flex items-center rounded-full bg-[#f0ebff] p-1 shadow-sm dark:bg-[#282043]">
                              <FiLock className="h-2.5 w-2.5 text-[#7c3aed] dark:text-[#c8b6ff]" />
                            </span>
                          </Link>
                        );
                      }

                      return (
                        <Link
                          key={child.key}
                          to={child.to}
                          onClick={() => onCloseSidebar?.()}
                          className={`relative block rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                            childActive
                              ? "bg-primary/10 text-primary font-semibold dark:bg-primary/15 dark:text-[#9be7dc]"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
                          }`}
                        >
                          {childActive && (
                            <span className="absolute -left-[15px] top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary dark:bg-[#9be7dc]" />
                          )}
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Tooltip
              key={item.key}
              content={item.label}
              isDisabled={!isCollapsed}
              placement="right"
              closeDelay={0}
            >
              <Link
                id={tourId}
                to={item.to}
                onClick={(event) =>
                  handleNavItemClick(event, item.to, isLabRoute)
                }
                aria-current={active ? "page" : undefined}
                className={`${baseItem} ${isCollapsed ? baseItemCollapsed : baseItemExpanded} ${active ? activeItem : idleItem}`}
              >
                <span className={`${iconBox} ${active ? iconBoxActive : iconBoxIdle}`}>
                  {item.icon}
                </span>
                <span className={`truncate ${labelCls(isCollapsed)}`}>
                  {item.label}
                </span>
              </Link>
            </Tooltip>
          );
        })}

        {isDoctorOrAdminDoctor && (
          <div className={`mt-2 ${isCollapsed ? "px-2" : ""}`}>
            {isCollapsed && !callStatus ? (
              <Popover
                isOpen={showCallOptions}
                onOpenChange={setShowCallOptions}
                placement="right"
                offset={10}
                showArrow
              >
                <PopoverTrigger>{renderCallButton()}</PopoverTrigger>
                <PopoverContent className="rounded-xl border border-slate-200 bg-white p-0 shadow-lg">
                  {renderCallOptions(true)}
                </PopoverContent>
              </Popover>
            ) : (
              <Tooltip
                content={
                  isAdminSetupLocked
                    ? approvalLockedTooltip
                    : callStatus
                      ? "Cancel Call"
                      : "Call Reception"
                }
                isDisabled={!isCollapsed && !isAdminSetupLocked}
                showArrow={isAdminSetupLocked}
                placement="right"
                closeDelay={0}
              >
                {renderCallButton()}
              </Tooltip>
            )}

            {showCallOptions && !callStatus && !isCollapsed && (
              <div className="mb-2">{renderCallOptions()}</div>
            )}
          </div>
        )}

        {userType === "Receptionist" && activeCalls.length > 0 && (
          <div
            className={`mt-4 space-y-2 px-3 sm:px-4 ${
              isCollapsed ? "px-2" : ""
            }`}
          >
            {!isCollapsed && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Calls ({activeCalls.length})
                </span>
              </div>
            )}

            {activeCalls.map((call) => (
              <div
                key={call.doctorId}
                className={`flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100 ${
                  isCollapsed ? "justify-center" : "justify-between"
                }`}
                title={isCollapsed ? `Call from ${call.doctorName}` : undefined}
              >
                {!isCollapsed && (
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center overflow-hidden shrink-0">
                      {call.profileImage ? (
                        <img
                          src={call.profileImage}
                          alt={call.doctorName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FiUser className="text-red-600 text-xs" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-red-700 truncate">
                          {call.doctorName}
                        </span>
                      </div>
                      <span className="text-[10px] text-red-500">
                        {new Date(call.ts).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleAcknowledge(call)}
                  className={`p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors ${
                    isCollapsed
                      ? "w-8 h-8 flex items-center justify-center"
                      : ""
                  }`}
                  title="Acknowledge Call"
                >
                  <FiPhone className="text-xs" />
                </button>
              </div>
            ))}
          </div>
        )}

        <LogoutModal isOpen={isOpen} onOpenChange={onOpenChange} />

        {role === "Pharmacist" && (
          <EditPharmacyDetailsModal
            isOpen={isEditOpen}
            onOpenChange={onEditOpenChange}
            initialValues={initialEditValues}
            onSubmit={handleSavePharmacyDetails}
          />
        )}
      </nav>

      <div className={`shrink-0 ${isCollapsed ? "px-2" : "px-3 sm:px-4"} pb-3 pt-2`}>
        {/* ── Sidebar Banner (referral, announcements, etc.) — hidden when collapsed ── */}
        {!isCollapsed && (
          <BannerDisplay
            placement="DASHBOARD_SIDEBAR"
            compact
            className="mb-3"
          />
        )}
        <Tooltip
          content="Logout"
          isDisabled={!isCollapsed}
          placement="right"
          closeDelay={0}
        >
          <button
            className={`${baseItem} ${isCollapsed ? baseItemCollapsed : baseItemExpanded} w-full cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20`}
            onClick={onOpen}
            type="button"
          >
            <span className={`${iconBox}`}>
              <FiLogOut className="text-[18px] text-red-500" />
            </span>
            <span className={`truncate font-medium text-red-500 ${labelCls(isCollapsed)}`}>
              Logout
            </span>
          </button>
        </Tooltip>
      </div>

      {/* Footer profile */}
      <div
        className={`w-full bg-[#E8F6F4] transition-all duration-300 ease-in-out dark:border-t dark:border-[#273244] dark:bg-[#111726] ${
          isCollapsed ? "p-2" : ""
        }`}
      >
        <Tooltip
          content={isAdminSetupLocked ? approvalLockedTooltip : "Profile"}
          isDisabled={!isCollapsed && !isAdminSetupLocked}
          showArrow={isAdminSetupLocked}
          placement="right"
          closeDelay={0}
        >
          {isLabAssistantRole || isAdminSetupLocked ? (
            <div className={profileCardClassName}>{profileCardContent}</div>
          ) : (
            <NavLink
              to={userType === "Super_Admin" ? "/profile/security" : "/profile"}
              onClick={() => onCloseSidebar?.()}
              className={profileCardClassName}
            >
              {profileCardContent}
            </NavLink>
          )}
        </Tooltip>
      </div>

      <BarcodeLookupModal
        isOpen={isLookupModalOpen}
        onOpenChange={setIsLookupModalOpen}
        initialValue={barcodeInputVal}
        onClose={() => {
          setBarcodeInputVal("");
          if (barcodeInputRef.current) {
            barcodeInputRef.current.value = "";
          }
        }}
      />
    </aside>
  );
};

export default Sidebar;
