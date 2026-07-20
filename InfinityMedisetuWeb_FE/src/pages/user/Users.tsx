// src/pages/user/Users.tsx
import React, { useState } from "react";
import { FiInfo, FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router";

import AppButton from "../../components/shared/AppButton";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import { useFeatureGate } from "../../hooks/useFeatureGate";
import Tooltip from "../../components/shared/Tooltip";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { usersTips } from "../../constants/featureTips";
import UsersRoleTable from "./components/UsersRoleTable";

const ROLE_OPTIONS = [
  { value: "Doctor", label: "Doctors" },
  { value: "Receptionist", label: "Receptionists" },
  { value: "Pharmacist", label: "Pharmacists" },
  { value: "Lab_Assistant", label: "Lab Assistants" },
] as const;

type RoleFilter = (typeof ROLE_OPTIONS)[number]["value"];

const Users: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<RoleFilter>("Doctor");

  useGetAllClinicsQuery();
  const navigate = useNavigate();

  const { status: doctorStatus, currentUsage: doctorUsage, totalLimit: doctorLimit } = useFeatureGate("doctor_accounts");
  const { status: staffStatus, currentUsage: staffUsage, totalLimit: staffLimit } = useFeatureGate("staff_accounts");

  const isDoctorLimitReached = doctorStatus === "limit_reached";
  const isStaffLimitReached = staffStatus === "limit_reached";

  const isCurrentRoleDoctor = selectedRole === "Doctor";
  const isAddDisabled = isCurrentRoleDoctor ? isDoctorLimitReached : isStaffLimitReached;

  const goToAddUser = () => {
    navigate(`/user/new?type=${selectedRole}`);
  };

  const addButtonLabel = isCurrentRoleDoctor ? "Add Doctor" : "Add Staff";

  return (
    <div className="mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
              Users & Roles
            </h2>
            <FeatureInfoTip
              title="User Management Tips"
              tips={usersTips}
              guideSection="users-guide"
              linkLabel="Read user management guide"
            />
          </div>
          <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
            Manage all system users, roles, and access permissions
          </p>
        </div>

        {/* Add User Button */}
        {isAddDisabled ? (
          <Tooltip
            content={
              <div className="flex items-start gap-2 py-1">
                <FiInfo className="mt-0.5 shrink-0 text-amber-500" />
                <div className="text-[13px] leading-snug">
                  <p className="font-medium">
                    {isCurrentRoleDoctor
                      ? `Doctors: ${doctorUsage}/${doctorLimit ?? "∞"}`
                      : `Staff: ${staffUsage}/${staffLimit ?? "∞"}`}
                  </p>
                  <p className="mt-0.5 text-amber-700/80">Upgrade your plan to add more.</p>
                </div>
              </div>
            }
            placement="bottom"
            classNames={{
              content: "bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2 shadow-lg max-w-[260px]",
            }}
          >
            <div>
              <AppButton
                text={addButtonLabel}
                buttonVariant="primary"
                className="h-9 opacity-50 cursor-not-allowed text-[13px]"
                isDisabled
                startContent={<FiPlus className="text-[14px]" />}
              />
            </div>
          </Tooltip>
        ) : (
          <AppButton
            text={addButtonLabel}
            buttonVariant="primary"
            className="h-9 text-[13px]"
            onPress={goToAddUser}
            startContent={<FiPlus className="text-[14px]" />}
          />
        )}
      </div>

      {/* Role Filter Pills — inline, same row as the table's filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {ROLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSelectedRole(option.value)}
            className={`inline-flex h-8 items-center rounded-lg px-3 text-[12px] font-medium transition-colors ${
              selectedRole === option.value
                ? "bg-primary text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary dark:border-[#273244] dark:bg-[#111726] dark:text-slate-300 dark:hover:border-primary/30"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Users Table — filtered by selected role */}
      <UsersRoleTable
        userType={selectedRole}
        showAddButton={false}
        enableRowNavigation
      />
    </div>
  );
};

export default Users;
