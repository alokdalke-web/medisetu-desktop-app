import {
  addToast,
  Avatar,
  Button,
  Chip,
  Pagination,
  Card,
  CardBody,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  FiPause,
  FiPlus,
  FiLayers,
  FiBarChart,
  FiChevronDown,
  FiCheck,
  FiClock,
  FiCheckCircle,
  FiRefreshCw,
} from "react-icons/fi";
import useDebounce from "../../../hooks/useDebounce";
import { getDaysUntil } from "../../../utils/date.utils";
import {
  useGetBannersQuery,
  useActivateBannerMutation,
  usePauseBannerMutation,
  type Banner,
} from "../../../redux/api/bannerApi";
import {
  BannerTypeEnum,
  BannerPriorityEnum,
  BannerPlacementEnum,
  BannerStatusEnum,
} from "../../../schemas/banner";
import CreateBannerModal from "./CreateBannerModal";
import { StatCard } from "../../../components/StatCard";
import PageContainer from "../../../components/common/PageContainer";
import PageHeader from "../../../components/common/PageHeader";
import { useAppLoader } from "../../../components/common/AppLoaderContext";
import SearchField from "../../../components/shared/SearchField";
import StatusChip from "../../../components/shared/StatusChip";

// ──────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ──────────────────────────────────────────────────────────────────────────────

type PageSize = 20 | 50 | 100;

/**
 * Statistics for the banner page dashboard
 * Calculated from the list of banners and optional analytics data
 *
 * @property total - Total number of banners in the system
 * @property active - Number of currently active banners
 * @property inactive - Number of inactive banners
 * @property totalViews - Total impressions across all banners (MISSING: requires backend analytics)
 */
interface BannerStats {
  total: number;
  active: number;
  inactive: number;
  totalViews: number;
}

/**
 * Filter state object for maintaining current filter selections
 */
interface FilterState {
  search: string;
  type: string;
  priority: string;
  placement: string;
  status: string;
  active: "" | "true" | "false";
}

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANTS & LABELS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Human-readable labels for banner types
 */
const TYPE_LABELS: Record<string, string> = {
  Referral: "Referral",
  MedicineSpotlight: "Medicine Spotlight",
  OperationalAlert: "Operational Alert",
  FeatureAnnouncement: "Feature Announcement",
  PromotionalOffer: "Promotional Offer",
  SystemAlert: "System Alert",
};

/**
 * Human-readable labels for banner placement locations
 */
const PLACEMENT_LABELS: Record<string, string> = {
  DASHBOARD_TOP: "Dashboard Top",
  DASHBOARD_SIDEBAR: "Dashboard Sidebar",
  INSIGHTS_WIDGET: "Insights Widget",
  APPOINTMENT_HEADER: "Appointment Header",
  LOGIN_PAGE: "Login Page",
  BILLING_PAGE: "Billing Page",
};

/**
 * Color mapping for priority levels for visual distinction
 */
const PRIORITY_COLOR: Record<string, "danger" | "warning" | "primary" | "success"> = {
  P0: "danger",
  P1: "warning",
  P2: "primary",
  P3: "success",
};

/**
 * Human-readable priority labels
 */
const PRIORITY_LABELS: Record<string, string> = {
  P0: "Critical",
  P1: "High",
  P2: "Medium",
  P3: "Low",
};

/**
 * Available pagination page size options
 */
const PAGE_SIZE_OPTIONS: PageSize[] = [20, 50, 100];

/** A banner is flagged "expiring soon" inside this many days of its end date. */
const EXPIRY_WARNING_WINDOW_DAYS = 7;

const EXPIRY_COLOR: Record<"expired" | "expiring", "danger" | "warning"> = {
  expired: "danger",
  expiring: "warning",
};

// ──────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Formats an ISO date string to "DD Mon YYYY" format
 * @param iso - ISO date string or null/undefined
 * @returns Formatted date string or "—" if invalid
 */
const formatDate = (iso?: string | null): string => {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};


/**
 * Formats a number with K suffix for thousands
 * @param value - Number to format
 * @returns Formatted number string
 */
// const formatNumber = (value: number): string => {
//   if (value >= 1000) {
//     return (value / 1000).toFixed(1).replace(/\.0$/, "") + "K";
//   }
//   return value.toString();
// };

// ──────────────────────────────────────────────────────────────────────────────
// SKELETON COMPONENTS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Loading skeleton for table rows
 */
const SkeletonTableRow: React.FC = () => (
  <tr className="border-b border-slate-100">
    {Array.from({ length: 8 }).map((_, i) => (
      <td key={i} className="px-5 py-4">
        <div className="h-6 w-24 rounded bg-slate-100 animate-pulse" />
      </td>
    ))}
  </tr>
);

// ──────────────────────────────────────────────────────────────────────────────
// FILTER BADGES COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

/**
 * FilterBadges Component
 * Displays active filters as removable, attractive chips with smooth animations
 */
const FilterBadges: React.FC<{
  filters: FilterState;
  onRemoveFilter: (key: keyof FilterState) => void;
}> = ({ filters, onRemoveFilter }) => {
  const badges: Array<{ key: keyof FilterState; label: string; icon?: React.ReactNode }> = [];

  if (filters.search) badges.push({ key: "search", label: `"${filters.search}"` });
  if (filters.type) badges.push({ key: "type", label: TYPE_LABELS[filters.type] || filters.type });
  if (filters.priority) badges.push({ key: "priority", label: PRIORITY_LABELS[filters.priority] || filters.priority });
  if (filters.placement) badges.push({ key: "placement", label: PLACEMENT_LABELS[filters.placement] || filters.placement });
  if (filters.status) badges.push({ key: "status", label: filters.status });
  if (filters.active) badges.push({ key: "active", label: filters.active === "true" ? "Active Only" : "Inactive Only" });

  return (
    <>
      {badges.map((badge) => (
        <Chip
          key={badge.key}
          onClose={() => onRemoveFilter(badge.key)}
          variant="flat"
          className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 font-medium border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
          classNames={{
            closeButton: "text-blue-600 hover:text-blue-800 hover:bg-blue-200/50 transition-colors",
            content: "px-1"
          }}
          startContent={
            <span className="h-2 w-2 rounded-full bg-blue-500 ml-1" />
          }
        >
          {badge.label}
        </Chip>
      ))}
    </>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// FILTER DROPDOWN COMPONENT (mirrors Appointment.tsx's status-dropdown pattern)
// ──────────────────────────────────────────────────────────────────────────────

interface FilterOption {
  value: string;
  label: string;
}

const FilterDropdown: React.FC<{
  label: string;
  placeholder: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  className?: string;
}> = ({ label, placeholder, value, options, onChange, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <div ref={ref} className={`relative w-full sm:w-[170px] ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setIsOpen(false);
        }}
        aria-expanded={isOpen}
        aria-label={label}
        className={[
          "flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white",
          "px-3 text-[13px] font-semibold text-slate-700 shadow-sm",
          "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
          "outline-none transition",
          "hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#151e31]",
          "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
        ].join(" ")}
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <FiChevronDown
          className={`ml-2 shrink-0 text-slate-500 transition-transform duration-200 dark:text-white ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className={[
              "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
              value === ""
                ? "bg-teal-50 text-teal-700 dark:bg-[#173c36] dark:text-[#9be7dc]"
                : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
            ].join(" ")}
          >
            <span className="line-clamp-2">{placeholder}</span>
            {value === "" && <FiCheck className="h-4 w-4 shrink-0" />}
          </button>
          {options.map((option) => {
            const isActive = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={[
                  "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
                  isActive
                    ? "bg-teal-50 text-teal-700 dark:bg-[#173c36] dark:text-[#9be7dc]"
                    : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                ].join(" ")}
              >
                <span className="line-clamp-2">{option.label}</span>
                {isActive && <FiCheck className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

/**
 * BannersPage Component
 *
 * Displays a comprehensive dashboard for managing banners across the platform.
 * Features:
 * - Statistics cards (total, active, inactive, views)
 * - Advanced filtering (search, type, placement, priority, status)
 * - Data table with sorting and pagination
 * - CRUD operations (create, edit, delete, activate/pause)
 * - Loading and empty states
 * - Responsive design
 *
 * Backend Dependencies:
 * - GET /banners - List all banners with filtering
 * - POST /banners - Create new banner
 * - PUT /banners/:id - Update banner
 * - DELETE /banners/:id - Delete banner
 * - PATCH /banners/:id/activate - Activate banner
 * - PATCH /banners/:id/pause - Pause banner
 * - GET /banners/statistics (RECOMMENDED) - Analytics data for stat cards
 */
const BannersPage: React.FC = () => {
  const navigate = useNavigate();

  // ── State: Filters and pagination ──
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    type: "",
    priority: "",
    placement: "",
    status: "",
    active: "",
  });
  const debouncedSearch = useDebounce(filters.search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Reset page when filters change ──
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filters.type,
    filters.priority,
    filters.placement,
    filters.status,
    filters.active,
    pageSize,
  ]);

  // ── Close page size dropdown on outside click ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsPageSizeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Memoized query arguments ──
  const queryArgs = useMemo(
    () => ({
      pageNumber: page,
      pageSize,
      search: debouncedSearch.trim() || undefined,
      bannerType: (filters.type as any) || undefined,
      priority: (filters.priority as any) || undefined,
      placement: (filters.placement as any) || undefined,
      status: (filters.status as any) || undefined,
      isActive: filters.active === "" ? undefined : filters.active === "true",
    }),
    [page, pageSize, debouncedSearch, filters]
  );

  // ── API calls ──
  const { data, isLoading, isFetching } = useGetBannersQuery(queryArgs);
  useAppLoader(isLoading || isFetching);

  const [activateBanner, { isLoading: isActivating }] =
    useActivateBannerMutation();
  const [pauseBanner, { isLoading: isPausing }] = usePauseBannerMutation();

  // ── Derived state ──
  const banners = data?.banners ?? [];
  const pagination = data?.pagination;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const totalRecords = pagination?.total ?? 0;
  const showSkeleton = isLoading || isFetching;

  // ── Calculate statistics ──
  const stats: BannerStats = useMemo(() => {
    if (isLoading || !banners.length)
      return { total: 0, active: 0, inactive: 0, totalViews: 0 };

    return {
      total: totalRecords,
      active: banners.filter((b) => b.isActive).length,
      inactive: banners.filter((b) => !b.isActive).length,
      // MISSING: Backend should provide totalViews via analytics endpoint
      // Placeholder value will be replaced when backend analytics is ready
      totalViews: 12400,
    };
  }, [banners, totalRecords, isLoading]);

  // ── Event handlers ──

  const handleRowClick = useCallback((banner: Banner) => {
    navigate(`/banners/manage?id=${banner.id}`);
  }, [navigate]);

  const handleCreate = useCallback(() => {
    navigate("/banners/manage");
  }, [navigate]);

  const handleToggleActive = useCallback(
    async (banner: Banner) => {
      try {
        if (banner.isActive) {
          await pauseBanner(banner.id).unwrap();
          addToast({
            title: "Paused",
            description: "Banner paused successfully.",
            color: "warning",
          });
        } else {
          await activateBanner(banner.id).unwrap();
          addToast({
            title: "Activated",
            description: "Banner activated successfully.",
            color: "success",
          });
        }
      } catch (err: any) {
        addToast({
          title: "Error",
          description: err?.data?.message ?? "Failed to update banner.",
          color: "danger",
        });
      }
    },
    [pauseBanner, activateBanner]
  );

  const handleFilterChange = useCallback(
    (key: keyof FilterState, value: string | boolean) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const handleRemoveFilter = useCallback((key: keyof FilterState) => {
    setFilters((prev) => ({
      ...prev,
      [key]: key === "active" ? "" : "",
    }));
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilters({
      search: "",
      type: "",
      priority: "",
      placement: "",
      status: "",
      active: "",
    });
  }, []);

  // ── Pagination helpers ──
  const fromRecord =
    totalRecords > 0 ? Math.min((page - 1) * pageSize + 1, totalRecords) : 0;
  const toRecord =
    totalRecords > 0 ? Math.min(page * pageSize, totalRecords) : 0;

  const hasActiveFilters = Object.values(filters).some((v) => v);

  // ── Render ──

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Broadcast Hub" description=" Manage and organize banners displayed across the platform."
        actions={
          <Button
            color="primary"
            startContent={<FiPlus className="text-lg" />}
            onPress={handleCreate}
            className="font-semibold shrink-0"
          >
            Create Banner
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<FiLayers className="text-base" />}
          label="Total Banners"
          value={String(stats.total)}
          sublabel="All time"
          bgColor="bg-blue-100/20"
          delta={12}
          sparkUp={true}
        />
        <StatCard
          icon={<FiCheckCircle className="text-base" />}
          label="Active"
          value={String(stats.active)}
          sublabel="Currently active"
          bgColor="bg-emerald-100/20"
          delta={12}
          sparkUp={true}
        />
        <StatCard
          icon={<FiPause className="text-base" />}
          label="Inactive"
          value={String(stats.inactive)}
          sublabel="Not active"
          bgColor="bg-amber-100/20"
          delta={-5}
          sparkUp={false}
        />
        {/* <StatCard
          icon={<FiEye className="text-base" />}
          label="Total Views"
          value={formatNumber(stats.totalViews)}
          sublabel="Across all banners"
          bgColor="bg-purple-100/20"
          delta={8}
          sparkUp={true}
        /> */}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* FILTER SECTION */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <Card
        radius="lg"
        shadow="none"
        className="border border-slate-200 bg-white dark:border-[#273244] dark:bg-[#111726]"
      >
        <CardBody className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="min-w-[280px] flex-1">
              <SearchField
                value={filters.search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleFilterChange("search", e.target.value)
                }
                onClear={() => handleFilterChange("search", "")}
                placeholder="Search by banner title..."
                aria-label="Search banners"
                className="w-full"
                classNames={{
                  inputWrapper:
                    "h-11 rounded-lg border border-slate-200 bg-white px-3 shadow-sm " +
                    "data-[hover=true]:border-slate-300 data-[focus=true]:border-primary " +
                    "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                  input:
                    "text-[14px] text-slate-700 placeholder:text-[14px] placeholder:text-slate-400 dark:text-white dark:placeholder:text-white",
                }}
              />
            </div>

            <FilterDropdown
              label="Banner type filter"
              placeholder="All Types"
              value={filters.type}
              onChange={(v) => handleFilterChange("type", v)}
              options={BannerTypeEnum.options.map((v) => ({ value: v, label: TYPE_LABELS[v] }))}
            />

            <FilterDropdown
              label="Placement filter"
              placeholder="All Positions"
              value={filters.placement}
              onChange={(v) => handleFilterChange("placement", v)}
              options={BannerPlacementEnum.options.map((v) => ({ value: v, label: PLACEMENT_LABELS[v] }))}
            />

            <FilterDropdown
              label="Status filter"
              placeholder="All Status"
              value={filters.status}
              onChange={(v) => handleFilterChange("status", v)}
              options={BannerStatusEnum.options.map((v) => ({ value: v, label: v }))}
            />

            <FilterDropdown
              label="Active filter"
              placeholder="All Devices"
              value={filters.active}
              onChange={(v) => handleFilterChange("active", v as any)}
              options={[
                { value: "true", label: "🟢 Active" },
                { value: "false", label: "⚪ Inactive" },
              ]}
            />

            <FilterDropdown
              label="Priority filter"
              placeholder="All Priorities"
              value={filters.priority}
              onChange={(v) => handleFilterChange("priority", v)}
              options={BannerPriorityEnum.options.map((v) => ({ value: v, label: PRIORITY_LABELS[v] || v }))}
            />

            {/* Clear Filters */}
            <Button
              variant="bordered"
              className="h-10 min-w-[140px] border-slate-200 bg-white text-slate-600 dark:border-[#273244] dark:bg-[#111726] dark:text-white"
              onPress={handleClearAllFilters}
              startContent={<FiRefreshCw size={14} />}
            >
              Clear Filters
            </Button>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-[#273244]">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Active Filters:
              </span>

              <FilterBadges
                filters={filters}
                onRemoveFilter={handleRemoveFilter}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* DATA TABLE */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            {/* Table header */}
            <thead className="bg-slate-50/80 border-b border-slate-100 dark:bg-[#151c2d] dark:border-[#273244]">
              <tr>
                <th className="px-5 py-4 text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-white">
                  Title
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-white">
                  Type
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-white">
                  Priority
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-white">
                  Placement
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-white">
                  Status
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-white">
                  Start Date
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-white">
                  End Date
                </th>
              </tr>
            </thead>

            {/* Table body */}
            <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
              {showSkeleton ? (
                // Loading state: Show skeleton rows
                Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonTableRow key={`skeleton-${i}`} />
                ))
              ) : banners.length > 0 ? (
                // Data state: Show banners
                banners.map((banner) => (
                  <tr
                    key={banner.id}
                    onClick={() => handleRowClick(banner)}
                    className="cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-[#151e31]"
                  >
                    {/* Title column with thumbnail */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={banner.imageUrl ?? ""}
                          name={banner.title}
                          radius="md"
                          size="md"
                          className="shrink-0 bg-slate-100 text-slate-700 dark:bg-[#172033] dark:text-white"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900 max-w-xs dark:text-white">
                            {banner.title}
                          </p>
                          {banner.description && (
                            <p className="truncate text-xs text-slate-500 mt-0.5 max-w-xs dark:text-slate-400">
                              {banner.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type column */}
                    <td className="px-5 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-[#172033] dark:text-white">
                        {TYPE_LABELS[banner.bannerType] || banner.bannerType}
                      </span>
                    </td>

                    {/* Priority column */}
                    <td className="px-5 py-4">
                      <Chip
                        size="sm"
                        color={PRIORITY_COLOR[banner.priority] || "default"}
                        variant="flat"
                        className="font-semibold"
                      >
                        {PRIORITY_LABELS[banner.priority] || banner.priority}
                      </Chip>
                    </td>

                    {/* Placement column */}
                    <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-white">
                      {PLACEMENT_LABELS[banner.placement] || banner.placement}
                    </td>

                    {/* Status toggle column — StatusChip visual, still a clickable toggle */}
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(banner);
                        }}
                        disabled={isActivating || isPausing}
                        className="transition hover:opacity-80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Toggle banner "${banner.title}" status`}
                        title={banner.isActive ? "Click to pause" : "Click to activate"}
                      >
                        <StatusChip
                          status={banner.isActive ? "active" : "inactive"}
                          text={banner.isActive ? "Active" : "Inactive"}
                        />
                      </button>
                    </td>

                    {/* Start date column */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                        <FiClock size={14} className="text-slate-400 flex-shrink-0 dark:text-slate-500" />
                        <span>{formatDate(banner.startDate)}</span>
                      </div>
                    </td>

                    {/* End date column */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                        <FiClock size={14} className="text-slate-400 flex-shrink-0 dark:text-slate-500" />
                        <span>{formatDate(banner.endDate)}</span>
                      </div>
                      {banner.isActive && (() => {
                        const daysUntil = getDaysUntil(banner.endDate);
                        if (daysUntil < 0) {
                          return (
                            <Chip size="sm" color={EXPIRY_COLOR.expired} variant="flat" className="mt-1 font-semibold">
                              Expired
                            </Chip>
                          );
                        }
                        if (daysUntil <= EXPIRY_WARNING_WINDOW_DAYS) {
                          return (
                            <Chip size="sm" color={EXPIRY_COLOR.expiring} variant="flat" className="mt-1 font-semibold">
                              {daysUntil === 0 ? "Expires today" : `Expires in ${daysUntil}d`}
                            </Chip>
                          );
                        }
                        return null;
                      })()}
                    </td>
                  </tr>
                ))
              ) : (
                // Empty state
                <tr>
                  <td
                    colSpan={7}
                    className="h-64 text-center py-12 text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FiBarChart className="text-4xl text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-white">
                        No banners found
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {hasActiveFilters
                          ? "Try adjusting your filters to see banners"
                          : "Create your first banner to get started"}
                      </p>
                      {!hasActiveFilters && (
                        <Button
                          size="sm"
                          color="primary"
                          onPress={handleCreate}
                          startContent={<FiPlus className="text-base" />}
                          className="mt-2"
                        >
                          Create Banner
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* PAGINATION FOOTER */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="border-t border-slate-100 px-5 py-3 sm:px-6 dark:border-[#273244]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[13px] font-medium text-slate-500 dark:text-white">
              Showing {fromRecord} to {toRecord} of {totalRecords} banners
            </span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
              {/* Rows per page selector */}
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-white">
                <span className="whitespace-nowrap">Rows per page:</span>
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPageSizeOpen((p) => !p)}
                    className="flex h-9 w-16 items-center justify-between rounded-lg border border-primary/35 bg-white px-3 text-sm font-semibold text-primary shadow-sm transition hover:border-primary/60 hover:bg-primary/5 dark:bg-[#111726] dark:text-white"
                    aria-label="Select rows per page"
                  >
                    <span>{pageSize}</span>
                    <FiChevronDown
                      className={`transition-transform duration-200 ${isPageSizeOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>
                  {isPageSizeOpen && (
                    <div className="absolute bottom-full right-0 z-50 mb-2 w-16 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setPageSize(size);
                            setIsPageSizeOpen(false);
                          }}
                          className={`flex h-9 w-full items-center justify-center text-sm transition ${pageSize === size
                            ? "bg-primary text-white font-semibold"
                            : "text-slate-700 hover:bg-primary/5 hover:text-primary dark:text-white dark:hover:bg-[#151e31]"
                            }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <Pagination
                  isCompact
                  showControls
                  total={totalPages}
                  page={page}
                  onChange={setPage}
                  radius="lg"
                  classNames={{
                    item: "min-w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary font-medium dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                    prev: "min-w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                    next: "min-w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                    cursor: "hidden",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* MODALS */}
      {/* ─────────────────────────────────────────────────────────────────────── */}

    </PageContainer>
  );
};

export default BannersPage;