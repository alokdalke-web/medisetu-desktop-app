// src/pages/user/components/UsersRoleTable.tsx
import {
  Avatar,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Switch,
  addToast,
} from "@heroui/react";

import React, { useEffect, useMemo, useState } from "react";
import {
  FiCheck,
  FiChevronDown,
  FiPlus,
  FiRefreshCcw,
  FiSearch,
  FiShield,
  FiUserCheck,
  FiUserPlus,
  FiUsers
} from "react-icons/fi";
import { useNavigate } from "react-router";

import AppButton from "../../../components/shared/AppButton";
import {
  useGetAllUsersQuery,
  useUpdateAddUserMutation,
} from "../../../redux/api/usersApi";

type Role =
  | "Doctor"
  | "Receptionist"
  | "Nurse"
  | "Patient"
  | "Pharmacist"
  | "Lab_Assistant"
  | "Radiologist"
  | "User";

type UserStatus = "Active" | "Inactive";

type Row = {
  rawId: string;
  id: string;
  name: string;
  avatar: string | null;
  role: Role;
  speciality?: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt?: string | null;
  isDeactivatedByPlan?: boolean;
};

type PendingStatusChange = {
  row: Row;
  currentStatus: UserStatus;
  nextStatus: UserStatus;
};

type EntityLabels = {
  singular: string;
  plural: string;
};

type Props = {
  userType: string;
  title?: string;
  showAddButton?: boolean;
  addButtonLabel?: string;
  addButtonTo?: string;
  showEmptyAddCard?: boolean;
  emptyAddCardLabel?: string;
  enableRowNavigation?: boolean;
  isAddDisabled?: boolean;
};

const displayId = (raw: string) =>
  `USR#${String(raw).slice(0, 8).toUpperCase()}`;

const roleLabels: Record<string, EntityLabels> = {
  doctor: { singular: "Doctor", plural: "Doctors" },
  receptionist: { singular: "Receptionist", plural: "Receptionists" },
  nurse: { singular: "Nurse", plural: "Nurses" },
  patient: { singular: "Patient", plural: "Patients" },
  pharmacist: { singular: "Pharmacist", plural: "Pharmacists" },
  lab_assistant: { singular: "Lab Assistant", plural: "Lab Assistants" },
  radiologist: { singular: "Radiologist", plural: "Radiologists" },
  user: { singular: "User", plural: "Users" },
};

const statusFilterOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Pending", value: "pending" },
  { label: "New", value: "new" },
];

const getEntityLabels = (userType?: string | null): EntityLabels => {
  const key = String(userType ?? "")
    .trim()
    .toLowerCase();

  return roleLabels[key] ?? roleLabels.user;
};

const getToggleableUserStatus = (status?: string | null): UserStatus | null => {
  const normalizedStatus = String(status ?? "").trim().toLowerCase();

  if (normalizedStatus === "active" || normalizedStatus === "new") return "Active";
  if (
    normalizedStatus === "inactive" ||
    normalizedStatus === "deactive" ||
    normalizedStatus === "disabled"
  ) {
    return "Inactive";
  }

  return null;
};

const formatStatusLabel = (status?: string | null) => {
  const value = String(status ?? "").trim();
  if (!value) return "Unknown";

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const normalizeStatusKey = (status?: string | null) => {
  const toggleable = getToggleableUserStatus(status);
  if (toggleable) return toggleable.toLowerCase();

  return String(status ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
};

const toInputValue = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const toFilterKey = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const isThisMonth = (value?: string | null) => {
  if (!value) return false;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) return "0%";

  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)}%`;
};

const normalizeFromAPI = (u: any): Row => {
  const rawId = String(u?.id ?? u?._id ?? "").trim();
  const roleRaw = (u?.userType ?? "").toString().toLowerCase();
  const roleMap: Record<string, Role> = {
    doctor: "Doctor",
    receptionist: "Receptionist",
    nurse: "Nurse",
    patient: "Patient",
    pharmacist: "Pharmacist",
    lab_assistant: "Lab_Assistant",
    radiologist: "Radiologist",
    user: "User",
  };

  // Detect deactivated staff (plan limit deactivation)
  const isArchived = u?.isArchive === true;
  const status = (u?.userStatus ?? u?.status ?? "Active").toString();
  const isDeactivatedByPlan = isArchived && status.toLowerCase() === "inactive";

  return {
    rawId,
    id: rawId ? displayId(rawId) : "-",
    name: u?.name ?? "Unknown",
    avatar: u?.profileImage ?? null,
    role: roleMap[roleRaw] ?? "User",
    speciality: u?.speciality ?? null,
    email: u?.email ?? null,
    phone: u?.mobile ?? u?.contactNo ?? null,
    status,
    createdAt:
      u?.createdAt ?? u?.created_at ?? u?.createdDate ?? u?.created_on ?? null,
    isDeactivatedByPlan,
  };
};

const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
);

const UsersTableSkeleton: React.FC<{
  rows?: number;
  showSpeciality?: boolean;
}> = ({ rows = 10, showSpeciality = false }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-[14px]">
      <thead className="border-b border-slate-200 bg-slate-50">
        <tr className="text-left text-slate-500">
          <th className="px-5 py-3.5 font-semibold">Name</th>
          <th className="px-5 py-3.5 font-semibold">Role</th>
          {showSpeciality && (
            <th className="px-5 py-3.5 font-semibold">Speciality</th>
          )}
          <th className="px-5 py-3.5 font-semibold">Email / Phone</th>
          <th className="px-5 py-3.5 font-semibold">Status</th>
          <th className="px-5 py-3.5 font-semibold">Action</th>
        </tr>
      </thead>

      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr
            key={i}
            className={i !== rows - 1 ? "border-b border-slate-100" : ""}
          >
            <td className="px-5 py-4">
              <div className="flex items-center gap-3">
                <Skel className="h-8 w-8 rounded-full" />
                <div className="min-w-0">
                  <Skel className="h-4 w-36" />
                </div>
              </div>
            </td>
            <td className="px-5 py-4">
              <Skel className="h-4 w-20" />
            </td>
            {showSpeciality && (
              <td className="px-5 py-4">
                <Skel className="h-4 w-28" />
              </td>
            )}
            <td className="px-5 py-4">
              <Skel className="h-4 w-48" />
              <Skel className="mt-2 h-3 w-28" />
            </td>
            <td className="px-5 py-4">
              <Skel className="h-6 w-20 rounded-full" />
            </td>
            <td className="px-5 py-4">
              <Skel className="h-6 w-24 rounded-full" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SummaryCard = ({
  title,
  value,
  note,
  icon,
  tone,
}: {
  title: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  icon: React.ReactNode;
  tone: "emerald" | "sky" | "purple" | "amber";
}) => {
  const toneClasses = {
    emerald: "bg-primary/10 text-primary",
    sky: "bg-sky-50 text-sky-700",
    purple: "bg-purple-50 text-purple-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[20px]",
            toneClasses[tone],
          ].join(" ")}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-slate-600">
            {title}
          </div>
          <div className="mt-0.5 text-[18px] font-semibold leading-none text-slate-950">
            {value}
          </div>
          {note ? (
            <div className="mt-1.5 text-[11px] font-medium text-slate-500">
              {note}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const StatusPill = ({ status, isDeactivatedByPlan }: { status: string; isDeactivatedByPlan?: boolean }) => {
  const key = normalizeStatusKey(status);

  // Special styling for plan-deactivated users
  if (isDeactivatedByPlan) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold leading-none border-amber-200 bg-amber-50 text-amber-700"
      >
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Deactivated (Plan Limit)
      </span>
    );
  }

  const cls =
    key === "active"
      ? "bg-primary/10 text-primary border-primary/30"
      : key === "inactive"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-slate-100 text-slate-600 border-slate-200";

  const dot =
    key === "active"
      ? "bg-primary/100"
      : key === "inactive"
        ? "bg-rose-500"
        : "bg-slate-400";

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1",
        "text-[12px] font-semibold leading-none",
        cls,
      ].join(" ")}
    >
      <span className={["h-2 w-2 rounded-full", dot].join(" ")} />
      {formatStatusLabel(status)}
    </span>
  );
};

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
  isDisabled = false,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  isDisabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (isDisabled) setIsOpen(false);
  }, [isDisabled]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative block min-w-0">
      <div className="mb-1 block text-[11px] font-semibold text-slate-600">
        {label}
      </div>

      <button
        type="button"
        disabled={isDisabled}
        aria-label={`${label} filter`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
        className={[
          "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white",
          "px-3 text-left text-[13px] font-semibold text-slate-700 outline-none transition",
          "focus:border-primary focus:ring-2 focus:ring-primary/10",
          isOpen ? "border-primary ring-2 ring-primary/10" : "",
          isDisabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
        ].join(" ")}
      >
        <span className="truncate">{selectedOption?.label ?? "Select"}</span>
        <FiChevronDown
          className={[
            "h-4 w-4 shrink-0 text-slate-500 transition",
            isOpen ? "rotate-180 text-primary" : "",
          ].join(" ")}
        />
      </button>

      {isOpen && !isDisabled && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-full min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70"
          onMouseDown={(event) => event.preventDefault()}
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={[
                  "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-left text-sm font-semibold transition",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <FiCheck className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const UsersRoleTable: React.FC<Props> = ({
  userType,
  title = "",
  showAddButton = true,
  addButtonLabel,
  addButtonTo = "/user/new",
  showEmptyAddCard = false,
  emptyAddCardLabel = "Add New User",
  enableRowNavigation = false,
  isAddDisabled = false,
}) => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [specialityFilter, setSpecialityFilter] = useState("all");
  const rowsPerPage = 10;

  const isDoctorTable = (userType ?? "").trim().toLowerCase() === "doctor";
  const entityLabels = getEntityLabels(userType);
  const finalAddButtonLabel =
    addButtonLabel ?? `+ Add ${entityLabels.singular}`;

  const { data, isLoading, isError, error, refetch } = useGetAllUsersQuery(
    { page, pageSize: rowsPerPage, userType: userType || undefined },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const [updateAddUser] = useUpdateAddUserMutation();
  const [updatingUserIds, setUpdatingUserIds] = useState<
    Record<string, boolean>
  >({});
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, UserStatus>
  >({});
  const [pendingStatusChange, setPendingStatusChange] =
    useState<PendingStatusChange | null>(null);

  const rawUsers: any[] = useMemo(
    () =>
      (data as any)?.users ??
      (data as any)?.result?.allUser ??
      (data as any)?.allUser ??
      [],
    [data],
  );

  useEffect(() => {
    setStatusOverrides((prev) => {
      let changed = false;
      const next = { ...prev };

      rawUsers.forEach((user) => {
        const rawId = String(user?.id ?? user?._id ?? "").trim();
        const serverStatus = getToggleableUserStatus(
          user?.userStatus ?? user?.status,
        );

        if (rawId && serverStatus && next[rawId] === serverStatus) {
          delete next[rawId];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [rawUsers]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, specialityFilter, userType]);

  const filteredRawUsers = useMemo(() => {
    const t = (userType ?? "").trim().toLowerCase();
    if (!t) return rawUsers;

    return rawUsers.filter((u) => {
      const apiType = String(u?.userType ?? "")
        .trim()
        .toLowerCase();
      return apiType === t;
    });
  }, [rawUsers, userType]);

  const rows: Row[] = useMemo(
    () =>
      filteredRawUsers.map((user) => {
        const row = normalizeFromAPI(user);
        const optimisticStatus = statusOverrides[row.rawId];

        return optimisticStatus ? { ...row, status: optimisticStatus } : row;
      }),
    [filteredRawUsers, statusOverrides],
  );

  const pagination: any =
    (data as any)?.pagination ?? (data as any)?.result?.pagination ?? {};

  const backendPageSize = pagination?.pageSize ?? rowsPerPage;
  const backendTotalRecords = pagination?.totalRecords;

  const totalRecords =
    typeof backendTotalRecords === "number" &&
    !Number.isNaN(backendTotalRecords)
      ? backendTotalRecords
      : rows.length;

  const statsPageSize = Math.max(totalRecords, rowsPerPage);
  const { data: statsData } = useGetAllUsersQuery(
    { page: 1, pageSize: statsPageSize, userType: userType || undefined },
    {
      skip: totalRecords <= rowsPerPage,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const statsRawUsers: any[] = useMemo(
    () =>
      (statsData as any)?.users ??
      (statsData as any)?.result?.allUser ??
      (statsData as any)?.allUser ??
      rawUsers,
    [statsData, rawUsers],
  );

  const statsRows: Row[] = useMemo(() => {
    const t = (userType ?? "").trim().toLowerCase();
    const usersForStats = t
      ? statsRawUsers.filter((u) => {
          const apiType = String(u?.userType ?? "")
            .trim()
            .toLowerCase();
          return apiType === t;
        })
      : statsRawUsers;

    return usersForStats.map((user) => {
      const row = normalizeFromAPI(user);
      const optimisticStatus = statusOverrides[row.rawId];

      return optimisticStatus ? { ...row, status: optimisticStatus } : row;
    });
  }, [statsRawUsers, statusOverrides, userType]);

  const summaryRows = statsRows.length > 0 ? statsRows : rows;
  const summaryTotalRecords = summaryRows.length;

  const totalPages = Math.max(1, Math.ceil(summaryTotalRecords / backendPageSize));

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    statusFilter !== "all" ||
    specialityFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setSpecialityFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const filterOptionRows = statsRows.length > 0 ? statsRows : rows;
  const rowsForDisplay =
    hasActiveFilters && filterOptionRows.length > 0 ? filterOptionRows : rows;

  const specialityOptions = useMemo(() => {
    const map = new Map<string, string>();
    filterOptionRows.forEach((row) => {
      const speciality = String(row.speciality ?? "").trim();
      if (speciality) map.set(toFilterKey(speciality), speciality);
    });

    return [
      { label: "All Specialities", value: "all" },
      ...Array.from(map.entries()).map(([value, label]) => ({ label, value })),
    ];
  }, [filterOptionRows]);

  const displayRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return rowsForDisplay.filter((row) => {
      const matchesSearch =
        !query ||
        toInputValue(row.name).includes(query) ||
        toInputValue(row.email).includes(query) ||
        toInputValue(row.phone).includes(query);

      const matchesStatus =
        statusFilter === "all" || normalizeStatusKey(row.status) === statusFilter;

      const matchesSpeciality =
        specialityFilter === "all" ||
        toFilterKey(row.speciality) === specialityFilter;

      return matchesSearch && matchesStatus && matchesSpeciality;
    });
  }, [rowsForDisplay, searchTerm, statusFilter, specialityFilter]);

  const visibleTotalRecords = hasActiveFilters
    ? displayRows.length
    : summaryTotalRecords;
  const showingFrom =
    displayRows.length === 0
      ? 0
      : hasActiveFilters
        ? 1
        : (page - 1) * backendPageSize + 1;
  const showingTo = hasActiveFilters
    ? displayRows.length
    : (page - 1) * backendPageSize + displayRows.length;
  const visibleTotalPages = hasActiveFilters ? 1 : totalPages;
  const activeCount = summaryRows.filter(
    (row) => normalizeStatusKey(row.status) === "active",
  ).length;
  const inactiveCount = summaryRows.filter(
    (row) => normalizeStatusKey(row.status) === "inactive",
  ).length;
  const activePercent =
    summaryTotalRecords > 0 ? (activeCount / summaryTotalRecords) * 100 : 0;
  const newThisMonthCount = summaryRows.filter((row) =>
    isThisMonth(row.createdAt),
  ).length;
  const uniqueRoleLabels = Array.from(
    new Set(summaryRows.map((row) => row.role)),
  );

  const handleAddClick = () => navigate(addButtonTo);

  const goToDetails = (rawId: string) => {
    if (!rawId) return;
    navigate(`/user/${encodeURIComponent(rawId)}`);
  };

  const requestStatusChange = (r: Row, isSelected: boolean) => {
    if (!r.rawId) return;
    if (updatingUserIds[r.rawId]) return;

    const nextStatus: UserStatus = isSelected ? "Active" : "Inactive";
    const currentStatus = getToggleableUserStatus(r.status);

    if (!currentStatus || nextStatus === currentStatus) return;

    setPendingStatusChange({
      row: r,
      currentStatus,
      nextStatus,
    });
  };

  const updateUserStatus = async () => {
    if (!pendingStatusChange) return;

    const { row: r, currentStatus, nextStatus } = pendingStatusChange;

    if (!r.rawId) return;
    if (updatingUserIds[r.rawId]) return;

    setPendingStatusChange(null);
    setStatusOverrides((prev) => ({ ...prev, [r.rawId]: nextStatus }));

    try {
      setUpdatingUserIds((prev) => ({ ...prev, [r.rawId]: true }));

      await updateAddUser({
        id: r.rawId,
        body: { userStatus: nextStatus },
      }).unwrap();

      addToast({
        title: "Status updated",
        description: `${r.name} is now ${nextStatus}.`,
        color: "success",
      });

      void refetch();
    } catch (e: any) {
      setStatusOverrides((prev) => ({ ...prev, [r.rawId]: currentStatus }));

      addToast({
        title: "Update failed",
        description:
          e?.data?.message || e?.message || "Unable to update user status.",
        color: "danger",
      });
    } finally {
      setUpdatingUserIds((prev) => {
        const next = { ...prev };
        delete next[r.rawId];
        return next;
      });
    }
  };

  const showSkeleton = isLoading && rows.length === 0;

  const StatusToggle = ({ row }: { row: Row }) => {
    const currentStatus = getToggleableUserStatus(row.status);
    const canToggle = Boolean(currentStatus);
    const isActive = currentStatus === "Active";
    const isUpdatingRow = Boolean(updatingUserIds[row.rawId]);
    const label = currentStatus ?? formatStatusLabel(row.status);

    const toggle = (
      <div
        className={[
          "inline-flex items-center",
          isUpdatingRow ? "pointer-events-none" : "",
        ].join(" ")}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Switch
          aria-label={`Change ${row.name} status`}
          color="success"
          isDisabled={!row.rawId || !canToggle || isUpdatingRow}
          isSelected={isActive}
          size="sm"
          onValueChange={(selected) => requestStatusChange(row, selected)}
        >
          <span
            className={[
              "text-[12px] font-semibold",
              !canToggle
                ? "text-slate-400"
                : isActive
                  ? "text-primary"
                  : "text-rose-700",
            ].join(" ")}
          >
            {label}
          </span>
        </Switch>
      </div>
    );

    return toggle;
  };

  return (
    <div className="w-full space-y-4">
      {(title || showAddButton) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {title ? (
            <h2 className="min-w-0 flex-1 break-words text-[20px] font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
          ) : (
            <div className="hidden sm:block" />
          )}

          {showAddButton && (
            <div id="tour-add-user-btn" className="flex justify-end">
              {isAddDisabled ? (
                <AppButton
                  onPress={() => {}}
                  text={finalAddButtonLabel}
                  buttonVariant="primary"
                  className="h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-white opacity-50"
                  isDisabled
                />
              ) : (
                <AppButton
                  onPress={handleAddClick}
                  text={finalAddButtonLabel}
                  buttonVariant="primary"
                  className="h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                  startContent={<FiPlus className="text-[16px]" />}
                />
              )}
            </div>
          )}
        </div>
      )}

      <div className="stats-scroll">
        <SummaryCard
          title={`Total ${entityLabels.plural}`}
          value={summaryTotalRecords}
          note={
            <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
              <span className="font-semibold text-primary">
                Active: {activeCount}
              </span>
              <span className="font-semibold text-rose-700">
                Inactive: {inactiveCount}
              </span>
            </span>
          }
          icon={<FiUsers />}
          tone="emerald"
        />
        <SummaryCard
          title="Active Users"
          value={activeCount}
          note={`${formatPercent(activePercent)} of total`}
          icon={<FiShield />}
          tone="sky"
        />
        <SummaryCard
          title="New This Month"
          value={newThisMonthCount}
          note={
            newThisMonthCount > 0
              ? `${newThisMonthCount} new ${
                  newThisMonthCount === 1 ? "user" : "users"
                } added`
              : "No new users added"
          }
          icon={<FiUserPlus />}
          tone="purple"
        />
        <SummaryCard
          title="Roles"
          value={uniqueRoleLabels.length || 0}
          note={uniqueRoleLabels.length ? uniqueRoleLabels.join(", ") : "-"}
          icon={<FiUserCheck />}
          tone="amber"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(260px,520px)_minmax(190px,280px)] xl:grid-cols-[minmax(320px,520px)_minmax(210px,280px)_minmax(190px,220px)_auto] xl:items-end xl:justify-start">
          <label className="block min-w-0">
            <span className="sr-only">Search users</span>
            <span className="relative block">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, email or phone number..."
                className={[
                  "h-10 w-full rounded-lg border border-slate-200 bg-white",
                  "px-9 text-[13px] font-medium text-slate-700 outline-none",
                  "placeholder:text-slate-400 transition focus:border-primary focus:ring-2 focus:ring-primary/10",
                ].join(" ")}
              />
            </span>
          </label>

          <FilterSelect
            label="Speciality"
            value={specialityFilter}
            options={specialityOptions}
            onChange={setSpecialityFilter}
            isDisabled={!isDoctorTable || specialityOptions.length <= 1}
          />

          <FilterSelect
            label="Status"
            value={statusFilter}
            options={statusFilterOptions}
            onChange={setStatusFilter}
          />

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className={[
              "flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-[14px] font-semibold transition",
              hasActiveFilters
                ? "text-primary hover:bg-primary/10"
                : "cursor-not-allowed text-slate-300",
            ].join(" ")}
          >
            <FiRefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {showSkeleton ? (
          <UsersTableSkeleton
            rows={rowsPerPage}
            showSpeciality={isDoctorTable}
          />
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {displayRows.length === 0 && !isError ? (
                showEmptyAddCard && !hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={handleAddClick}
                    className="flex w-full flex-col items-center justify-center rounded-lg border border-slate-200 bg-white py-10 shadow-sm transition active:scale-[0.99]"
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <FiPlus className="text-xl text-primary" />
                    </div>
                    <span className="text-[14px] font-semibold text-slate-900">
                      {emptyAddCardLabel}
                    </span>
                  </button>
                ) : (
                  <div className="py-10 text-center text-sm text-slate-500">
                    {hasActiveFilters ? "No users match the filters." : "No users found."}
                  </div>
                )
              ) : null}

              {displayRows.map((row, idx) => {
                const clickable = enableRowNavigation && Boolean(row.rawId);

                return (
                  <div
                    key={`${row.rawId || row.id}-${idx}`}
                    onClick={clickable ? () => goToDetails(row.rawId) : undefined}
                    className={[
                      "rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition",
                      clickable
                        ? "cursor-pointer active:scale-[0.99]"
                        : "cursor-default",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          src={row.avatar || undefined}
                          name={getInitials(row.name)}
                          size="sm"
                          radius="full"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-semibold text-slate-950">
                            {row.role === "Doctor" ? `Dr. ${row.name}` : row.name}
                          </div>
                          <div className="truncate text-[12px] font-medium text-slate-500">
                            {row.role}
                          </div>
                        </div>
                      </div>

                      <StatusPill status={row.status} isDeactivatedByPlan={row.isDeactivatedByPlan} />
                    </div>

                    <div className="mt-3 grid gap-2.5 rounded-lg bg-slate-50 p-3 text-[13px]">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-500">Role</span>
                        <span className="min-w-0 text-right font-semibold text-slate-800">
                          {row.role}
                        </span>
                      </div>
                      {isDoctorTable && (
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-slate-500">Speciality</span>
                          <span className="min-w-0 text-right font-semibold text-slate-800">
                            {row.speciality || "-"}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-500">Email</span>
                        <span className="min-w-0 break-all text-right font-semibold text-slate-800">
                          {row.email || "-"}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-500">Phone</span>
                        <span className="text-right font-semibold text-slate-800">
                          {row.phone || "-"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <StatusToggle row={row} />
                    </div>
                  </div>
                );
              })}

              {isError && (
                <div className="py-8 text-center text-sm text-red-600">
                  {(error as any)?.data?.message ||
                    (error as any)?.error ||
                    "Failed to load users."}
                </div>
              )}
            </div>

            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-[14px]">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="select-none text-left text-[13px] font-semibold text-slate-500">
                      <th className="px-5 py-3.5">Name</th>
                      <th className="px-5 py-3.5">Role</th>
                      {isDoctorTable && <th className="px-5 py-3.5">Speciality</th>}
                      <th className="px-5 py-3.5">Email / Phone</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {displayRows.map((row, idx) => {
                      const clickable = enableRowNavigation && Boolean(row.rawId);

                      return (
                        <tr
                          key={`${row.rawId || row.id}-${idx}`}
                          onClick={
                            clickable ? () => goToDetails(row.rawId) : undefined
                          }
                          className={[
                            clickable ? "cursor-pointer" : "cursor-default",
                            "transition-colors hover:bg-slate-50",
                            idx !== displayRows.length - 1
                              ? "border-b border-slate-100"
                              : "",
                          ].join(" ")}
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar
                                src={row.avatar || undefined}
                                name={getInitials(row.name)}
                                size="sm"
                                radius="full"
                                className="shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-950">
                                  {row.role === "Doctor"
                                    ? `Dr. ${row.name}`
                                    : row.name}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-medium text-slate-800">
                            {row.role}
                          </td>

                          {isDoctorTable && (
                            <td className="px-5 py-4 font-medium text-slate-700">
                              {row.speciality || "-"}
                            </td>
                          )}

                          <td className="px-5 py-4">
                            <div className="max-w-[320px] truncate font-medium text-slate-900">
                              {row.email || "-"}
                            </div>
                            <div className="mt-1 text-[12px] font-medium text-slate-500">
                              {row.phone || "-"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <StatusPill status={row.status} isDeactivatedByPlan={row.isDeactivatedByPlan} />
                          </td>

                          <td className="px-5 py-4">
                            <StatusToggle row={row} />
                          </td>
                        </tr>
                      );
                    })}

                    {displayRows.length === 0 && !isError && (
                      <tr>
                        <td
                          colSpan={isDoctorTable ? 6 : 5}
                          className="px-6 py-10 text-center text-slate-500"
                        >
                          {hasActiveFilters ? "No users match the filters." : "No users found."}
                        </td>
                      </tr>
                    )}

                    {isError && (
                      <tr>
                        <td
                          colSpan={isDoctorTable ? 6 : 5}
                          className="px-6 py-10 text-center text-red-600"
                        >
                          {(error as any)?.data?.message ||
                            (error as any)?.error ||
                            "Failed to load users."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 text-[13px] font-medium text-slate-500 md:flex-row md:px-5">
              <div className="w-full text-center md:w-auto md:text-left">
                Showing {showingFrom} to {showingTo} of {visibleTotalRecords} entries
              </div>

              <Pagination
                isCompact
                showControls
                total={visibleTotalPages}
                page={Math.min(page, visibleTotalPages)}
                onChange={setPage}
                radius="md"
                classNames={{
                  wrapper: "gap-2 flex-wrap justify-center md:justify-end",
                  item:
                    "min-w-9 h-9 rounded-md border border-slate-200 bg-white text-slate-600 shadow-none " +
                    "hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary",
                  prev:
                    "min-w-9 h-9 rounded-md border border-slate-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
                  next:
                    "min-w-9 h-9 rounded-md border border-slate-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
                  cursor: "hidden",
                }}
              />
            </div>
          </>
        )}
      </div>

  

      <Modal
        isOpen={Boolean(pendingStatusChange)}
        onOpenChange={(open) => {
          if (!open) setPendingStatusChange(null);
        }}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-slate-100 py-4">
                <div className="text-[16px] font-semibold text-slate-900 sm:text-[18px]">
                  Confirm Status Change
                </div>
              </ModalHeader>

              <ModalBody className="py-5">
                <p className="text-sm text-slate-600">
                  Are you sure you want to mark{" "}
                  <span className="font-semibold text-slate-900">
                    {pendingStatusChange?.row.name ?? "this user"}
                  </span>{" "}
                  as{" "}
                  <span
                    className={[
                      "font-semibold",
                      pendingStatusChange?.nextStatus === "Active"
                        ? "text-primary"
                        : "text-rose-700",
                    ].join(" ")}
                  >
                    {pendingStatusChange?.nextStatus}
                  </span>
                  ?
                </p>
              </ModalBody>

              <ModalFooter className="gap-3 border-t border-slate-100 py-4">
                <AppButton
                  text="Cancel"
                  type="button"
                  onPress={() => {
                    setPendingStatusChange(null);
                    onClose();
                  }}
                  buttonVariant="outlined"
                  className="w-full sm:w-[120px]"
                />
                <AppButton
                  text={`Yes, ${pendingStatusChange?.nextStatus ?? "Update"}`}
                  type="button"
                  onPress={updateUserStatus}
                  buttonVariant={
                    pendingStatusChange?.nextStatus === "Inactive"
                      ? "danger"
                      : "primary"
                  }
                  className="w-full sm:w-[150px]"
                />
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default UsersRoleTable;
