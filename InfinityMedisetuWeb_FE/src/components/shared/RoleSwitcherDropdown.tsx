import React, { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiCheck, FiGrid, FiActivity } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router";

import type { RootState } from "../../redux/store";
import { setActiveRole, type SwitchableRole } from "../../redux/slices/roleSlice";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import { useGetLabsByClinicIdQuery } from "../../redux/api/labApi";
import { useGetPharmaciesQuery } from "../../redux/api/pharmacyApi";

interface RoleDisplayInfo {
  role: SwitchableRole;
  label: string;
  icon: React.ReactNode;
  dashboardPath: string;
}

const ALL_ROLES: RoleDisplayInfo[] = [
  {
    role: "Admin",
    label: "Admin",
    icon: <FiGrid className="text-[14px]" />,
    dashboardPath: "/dashboard",
  },
  {
    role: "Doctor",
    label: "Doctor",
    icon: <FiActivity className="text-[14px]" />,
    dashboardPath: "/dashboard",
  },
  {
    role: "Lab_Assistant",
    label: "Lab",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 3v6l-3 9a3 3 0 003 3h6a3 3 0 003-3l-3-9V3" />
        <path d="M9 3h6" />
        <path d="M12 14h.01" />
      </svg>
    ),
    dashboardPath: "/lab/dashboard",
  },
  {
    role: "Pharmacist",
    label: "Pharmacy",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7 7-7z" />
      </svg>
    ),
    dashboardPath: "/pharmacy/dashboard",
  },
  {
    role: "Receptionist",
    label: "Reception",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    dashboardPath: "/appointment",
  },
];

const RoleSwitcherDropdown: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeRole = useSelector((state: RootState) => state.role.activeRole);
  const { data: user } = useGetUserQuery();
  const { data: clinics } = useGetAllClinicsQuery();

  const actualUserType = (user as any)?.userType;
  const hasAdminDoctorAccess = (user as any)?.isAdminDoctorAccess;
  const clinicId = clinics?.clinic?.id;

  const isAppointmentPage = location.pathname.includes("/appointment");

  // Check if labs exist for this clinic
  const { data: labs } = useGetLabsByClinicIdQuery(clinicId ?? "", {
    skip: !clinicId || actualUserType !== "Admin" || isAppointmentPage,
  });

  // Check if pharmacies exist for this clinic
  const { data: pharmacies } = useGetPharmaciesQuery(
    { page: 1, pageSize: 1 },
    { skip: actualUserType !== "Admin" },
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Only show for admins
  if (actualUserType !== "Admin") return null;

  // Lab exists if there's at least one lab for this clinic
  const hasLabExist = Array.isArray(labs) && labs.length > 0;

  // Pharmacy exists if there's at least one pharmacy
  const hasPharmacyExist =
    (pharmacies as any)?.pharmacies?.length > 0 ||
    (pharmacies as any)?.data?.length > 0 ||
    (pharmacies as any)?.totalCount > 0;

  // Reception is always available for admin (receptionist role is inherent)
  const hasReceptionAccess = true;

  // Build available roles
  const availableRoles = ALL_ROLES.filter((r) => {
    if (r.role === "Admin") return true;
    if (r.role === "Doctor") return hasAdminDoctorAccess;
    if (r.role === "Lab_Assistant") return hasLabExist;
    if (r.role === "Pharmacist") return hasPharmacyExist;
    if (r.role === "Receptionist") return hasReceptionAccess;
    return false;
  });

  // Don't show dropdown if admin can only access admin panel (no other panels available)
  if (availableRoles.length <= 1) return null;

  const currentRole = activeRole || "Admin";
  const currentDisplay = ALL_ROLES.find((r) => r.role === currentRole) ?? ALL_ROLES[0];

  const handleRoleSwitch = (role: SwitchableRole) => {
    dispatch(setActiveRole(role));
    setIsOpen(false);

    const targetRole = ALL_ROLES.find((r) => r.role === role);
    if (targetRole) {
      navigate(targetRole.dashboardPath);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
        aria-label="Switch role"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/10 text-primary">
          {currentDisplay.icon}
        </span>
        <span className="hidden sm:inline">{currentDisplay.label}</span>
        <FiChevronDown
          className={`text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          size={14}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Switch Panel
            </p>
          </div>
          <div className="py-1">
            {availableRoles.map((option) => {
              const isActive = currentRole === option.role;
              return (
                <button
                  key={option.role}
                  type="button"
                  onClick={() => handleRoleSwitch(option.role)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-primary/5 text-primary"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  role="option"
                  aria-selected={isActive}
                >
                  <span
                    className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {option.icon}
                  </span>
                  <span className="flex-1 text-sm font-medium">
                    {option.label}
                  </span>
                  {isActive && (
                    <FiCheck className="text-primary" size={16} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSwitcherDropdown;
