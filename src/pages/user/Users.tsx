// src/pages/user/Users.tsx
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import React, { useEffect, useMemo } from "react";
import { FiInfo, FiPlus } from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router";

import AppButton from "../../components/shared/AppButton";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import { useFeatureGate } from "../../hooks/useFeatureGate";
import { useGetMySubscriptionQuery } from "../../redux/api/subscriptionApi";
import { useGetAllUsersQuery } from "../../redux/api/usersApi";
import { useGetLabsByClinicIdQuery } from "../../redux/api/labApi";
import { useGetPharmaciesQuery } from "../../redux/api/pharmacyApi";
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
const STAFF_ROLE_OPTIONS = [
  { value: "Receptionist", label: "Receptionist" },
  { value: "Pharmacist", label: "Pharmacist" },
  { value: "Lab_Assistant", label: "Lab Assistant" },
] as const;
type StaffRoleFilter = (typeof STAFF_ROLE_OPTIONS)[number]["value"];

const isRoleFilter = (value: string | null): value is RoleFilter =>
  ROLE_OPTIONS.some((option) => option.value === value);

const getUsersTotal = (
  data?: { users?: unknown[]; pagination?: { totalRecords?: number } },
) => data?.pagination?.totalRecords ?? data?.users?.length ?? 0;

const Users: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const selectedRole: RoleFilter = isRoleFilter(roleParam) ? roleParam : "Doctor";

  const setSelectedRole = (role: RoleFilter) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("role", role);
      next.set("type", role);
      return next;
    });
  };

  const { data: clinics } = useGetAllClinicsQuery();
  const navigate = useNavigate();
  const { data: subscriptionData } = useGetMySubscriptionQuery();

  const { currentUsage: doctorUsage, totalLimit: doctorLimit, remaining: doctorRemaining } = useFeatureGate("doctor_accounts");
  const { currentUsage: staffUsage, totalLimit: staffLimit, remaining: staffRemaining } = useFeatureGate("staff_accounts");
  const { status: labStatus } = useFeatureGate("lab_integration");
  const { status: pharmacyStatus } = useFeatureGate("pharmacy_integration");
  const currentPlanSlug = String(
    subscriptionData?.data?.subscription?.planSlug ?? "free",
  ).toLowerCase();
  const isFreePlan = currentPlanSlug === "free";
  const isCurrentRoleDoctor = selectedRole === "Doctor";
  const clinicId = useMemo(() => {
    const data: any = clinics;

    return (
      data?.clinic?.id ||
      data?.clinic?._id ||
      data?.result?.clinic?.id ||
      data?.result?.clinic?._id ||
      ""
    ).toString();
  }, [clinics]);

  const {
    data: receptionistUsersData,
    isFetching: isReceptionistCountFetching,
  } = useGetAllUsersQuery(
    { page: 1, pageSize: 1, userType: "Receptionist" },
    { skip: isCurrentRoleDoctor },
  );
  const {
    data: pharmacistUsersData,
    isFetching: isPharmacistCountFetching,
  } = useGetAllUsersQuery(
    { page: 1, pageSize: 1, userType: "Pharmacist" },
    { skip: isCurrentRoleDoctor },
  );
  const {
    data: labAssistantUsersData,
    isFetching: isLabAssistantCountFetching,
  } = useGetAllUsersQuery(
    { page: 1, pageSize: 1, userType: "Lab_Assistant" },
    { skip: isCurrentRoleDoctor },
  );
  const {
    data: pharmacyData,
    isFetching: isPharmacyPrerequisiteFetching,
  } = useGetPharmaciesQuery(
    { page: 1, pageSize: 1 },
    { skip: isCurrentRoleDoctor },
  );
  const {
    data: labsData,
    isFetching: isLabPrerequisiteFetching,
  } = useGetLabsByClinicIdQuery(clinicId, {
    skip: isCurrentRoleDoctor || !clinicId,
  });

  const roleTabState = useMemo<Record<RoleFilter, { isDisabled: boolean; disabledReason?: string }>>(
    () => ({
      Doctor: {
        isDisabled: false,
      },
      Receptionist: {
        isDisabled: false,
      },
      Pharmacist: {
        isDisabled: isFreePlan || pharmacyStatus !== "enabled",
        disabledReason: "Upgrade to Pro to manage pharmacy staff.",
      },
      Lab_Assistant: {
        isDisabled: isFreePlan || labStatus !== "enabled",
        disabledReason: "Upgrade to Pro to manage lab assistants.",
      },
    }),
    [isFreePlan, labStatus, pharmacyStatus],
  );

  const firstEnabledRole = useMemo(
    () => ROLE_OPTIONS.find((option) => !roleTabState[option.value].isDisabled)?.value ?? "Receptionist",
    [roleTabState],
  );

  useEffect(() => {
    const requestedRole =
      isRoleFilter(roleParam) && !roleTabState[roleParam].isDisabled
        ? roleParam
        : null;

    if (requestedRole) {
      if (requestedRole !== selectedRole) {
        setSelectedRole(requestedRole);
      }
      return;
    }

    if (roleTabState[selectedRole].isDisabled) {
      setSelectedRole(firstEnabledRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstEnabledRole, roleParam, roleTabState, selectedRole]);

  const staffRoleCounts = useMemo<Record<StaffRoleFilter, number>>(
    () => ({
      Receptionist: getUsersTotal(receptionistUsersData),
      Pharmacist: getUsersTotal(pharmacistUsersData),
      Lab_Assistant: getUsersTotal(labAssistantUsersData),
    }),
    [labAssistantUsersData, pharmacistUsersData, receptionistUsersData],
  );
  const isStaffRoleCountsLoading =
    !isCurrentRoleDoctor &&
    (isReceptionistCountFetching ||
      isPharmacistCountFetching ||
      isLabAssistantCountFetching);
  const pharmacyCount =
    pharmacyData?.pagination?.totalRecords ??
    pharmacyData?.pharmacies?.length ??
    0;
  const labCount =
    labsData?.filter((lab: any) => lab?.deletedAt == null).length ?? 0;
  const isStaffPrerequisitesLoading =
    !isCurrentRoleDoctor &&
    (isPharmacyPrerequisiteFetching || (!!clinicId && isLabPrerequisiteFetching));
  const selectedStaffRole = isCurrentRoleDoctor
    ? null
    : (selectedRole as StaffRoleFilter);
  const selectedStaffRoleAlreadyAdded =
    selectedStaffRole != null && staffRoleCounts[selectedStaffRole] > 0;
  const missingEligibleStaffRoles = useMemo(
    () =>
      STAFF_ROLE_OPTIONS.filter(
        (role) =>
          !roleTabState[role.value].isDisabled &&
          staffRoleCounts[role.value] === 0,
      ),
    [roleTabState, staffRoleCounts],
  );
  const staffAddRoleOptions =
    selectedStaffRole == null
      ? []
      : selectedStaffRoleAlreadyAdded
        ? missingEligibleStaffRoles
        : STAFF_ROLE_OPTIONS.filter((role) => role.value === selectedStaffRole);

  const isDoctorLimitReached = doctorRemaining === 0;
  const isStaffLimitReached = staffRemaining === 0;

  const isAddDisabled = isCurrentRoleDoctor
    ? isDoctorLimitReached
    : isStaffLimitReached ||
      isStaffRoleCountsLoading ||
      isStaffPrerequisitesLoading ||
      staffAddRoleOptions.length === 0;
  const selectedUsage = isCurrentRoleDoctor ? doctorUsage : staffUsage;
  const selectedLimit = isCurrentRoleDoctor ? doctorLimit : staffLimit;
  const selectedUsageLabel = isCurrentRoleDoctor ? "Doctors" : "Staff";
  const addLimitMessage = isCurrentRoleDoctor
    ? "No doctor slots remaining. Upgrade your plan to add more doctors."
    : isStaffRoleCountsLoading || isStaffPrerequisitesLoading
      ? "Checking available staff roles..."
      : isStaffLimitReached
        ? "No staff slots remaining. Upgrade your plan to add more staff."
        : "All eligible staff roles are already added.";

  const getStaffActionLabel = (role: StaffRoleFilter) => {
    if (role === "Pharmacist" && pharmacyCount === 0) return "Set up Pharmacy";
    if (role === "Lab_Assistant" && labCount === 0) return "Set up Lab";

    return `Add ${
      STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? "Staff"
    }`;
  };

  const goToAddUser = (role: RoleFilter = selectedRole) => {
    if (role === "Pharmacist" && pharmacyCount === 0) {
      navigate("/configuration/pharmacy");
      return;
    }

    if (role === "Lab_Assistant" && labCount === 0) {
      navigate("/configuration/lab");
      return;
    }

    navigate(`/user/new?type=${role}`);
  };

  const handleRoleChange = (role: RoleFilter) => {
    if (roleTabState[role].isDisabled) return;

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("role", role);
      next.set("type", role);
      return next;
    }, { replace: true });
  };

  const addButtonLabel = isCurrentRoleDoctor ? "Add Doctor" : "Add Staff";
  const renderAddAction = () => {
    if (
      !isCurrentRoleDoctor &&
      !isAddDisabled &&
      staffAddRoleOptions.length > 1
    ) {
      return (
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <AppButton
              text={addButtonLabel}
              buttonVariant="primary"
              className="h-9 text-[13px]"
              startContent={<FiPlus className="text-[14px]" />}
            />
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Choose staff role to add"
            onAction={(key) => goToAddUser(key as RoleFilter)}
          >
            {staffAddRoleOptions.map((role) => (
              <DropdownItem
                key={role.value}
                startContent={<FiPlus className="text-xs" />}
              >
                {getStaffActionLabel(role.value)}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
      );
    }

    const addRole =
      !isCurrentRoleDoctor && staffAddRoleOptions.length === 1
        ? staffAddRoleOptions[0].value
        : selectedRole;

    return (
      <AppButton
        text={addButtonLabel}
        buttonVariant="primary"
        className="h-9 text-[13px]"
        onPress={() => goToAddUser(addRole)}
        startContent={<FiPlus className="text-[14px]" />}
      />
    );
  };

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
              <div className="flex items-start gap-2 py-1 ">
                <FiInfo className="mt-0.5 shrink-0 text-amber-500" />
                <div className="text-[13px] leading-snug">
                  <p className="font-medium">
                    {selectedUsageLabel}: {selectedUsage}/{selectedLimit ?? "Unlimited"}
                  </p>
                  <p className="mt-0.5 text-amber-700/80">{addLimitMessage}</p>
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
          renderAddAction()
        )}
      </div>

      {/* Role Filter Pills — inline, same row as the table's filter bar */}
      <div className="flex flex-wrap items-center gap-2 ">
        {ROLE_OPTIONS.map((option) => {
          const tabState = roleTabState[option.value];
          const tabButton = (
            <button
              key={option.value}
              type="button"
              disabled={tabState.isDisabled}
              onClick={() => handleRoleChange(option.value)}
              className={`inline-flex h-8 items-center rounded-lg px-3 text-[12px] cursor-pointer font-medium transition-colors ${
                tabState.isDisabled
                  ? "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400 opacity-60 dark:border-[#273244] dark:bg-[#151c2d] dark:text-slate-500"
                  : selectedRole === option.value
                    ? "bg-primary text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary dark:border-[#273244] dark:bg-[#111726] dark:text-slate-300 dark:hover:border-primary/30"
              }`}
            >
              {option.label}
            </button>
          );

          if (!tabState.isDisabled) {
            return tabButton;
          }

          return (
            <Tooltip
              key={option.value}
              content={tabState.disabledReason}
              placement="top"
              classNames={{
                content: "bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2 shadow-lg text-[12px]",
              }}
            >
              <span className="inline-flex">{tabButton}</span>
            </Tooltip>
          );
        })}
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
