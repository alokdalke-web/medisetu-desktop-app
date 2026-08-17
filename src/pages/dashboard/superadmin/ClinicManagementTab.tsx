import {
  Avatar,
  Button,
  Chip,
  Pagination,
  Spinner,
  Tab,
  Tabs,
} from "@heroui/react";
import React, { useMemo, useState } from "react";
import { FiChevronDown, FiChevronUp, FiCheckCircle, FiAlertCircle, FiLock, FiGrid, FiEye } from "react-icons/fi";
import { useNavigate } from "react-router";
import SearchField from "../../../components/shared/SearchField";
import KpiCards from "../../../components/KpiCards";
import { useGetAvailableClinicsQuery } from "../../../redux/api/clinicApi";
import type { ClinicListItem } from "../../../redux/api/clinicApi";
import { formatDate } from "../../../utils";
import useDebounce from "../../../hooks/useDebounce";

type TabKey = "all" | "active" | "inactive" | "blocked";
type SortKey = "clinicName" | "City" | "createdAt" | "status" | "planName";

const TAB_KEYS: TabKey[] = ["all", "active", "inactive", "blocked"];
const isTabKey = (k: unknown): k is TabKey => TAB_KEYS.includes(k as TabKey);

const statusFromTab = (t: TabKey): string | undefined => {
  if (t === "all") return undefined;
  if (t === "active") return "Active";
  if (t === "inactive") return "Inactive";
  if (t === "blocked") return "Blocked";
  return undefined;
};

const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
);

const ClinicManagementTab: React.FC = () => {
  const navigate = useNavigate();

  // UI state
  const [tab, setTab] = useState<TabKey>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState<10 | 15 | 20 | "all">(10);

  // Debounce search input with 300ms delay
  const debouncedSearch = useDebounce(search, 300);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("clinicName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const apiPageSize = rowsPerPage === "all" ? 1000 : rowsPerPage;

  const { data, isLoading, isFetching } = useGetAvailableClinicsQuery({
    page,
    limit: apiPageSize,
    search: debouncedSearch || undefined,
    status: statusFromTab(tab),
  });

  // Extract pagination from new API response structure
  const apiPagination = data?.data?.pagination ?? {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const apiTotalRecords = apiPagination.total;
  const apiTotalPages = apiPagination.totalPages;

  const handleViewDetail = (id: string) => {
    navigate(`/clinics/${id}`);
  };

  const filteredAndSortedClinics = useMemo(() => {
    const clinics: ClinicListItem[] = data?.data?.data ?? [];
    const list = [...clinics];

    // Frontend Sorting
    const get = (item: ClinicListItem) => (item[sortKey] ?? "").toString().toLowerCase();

    list.sort((a, b) => {
      const A = get(a);
      const B = get(b);
      const cmp = A.localeCompare(B, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [data, sortKey, sortDir]);

  // Calculate KPI stats from API response
  const kpiStats = useMemo(() => {
    const apiStats = data?.data?.stats;
    const total = apiStats?.total ?? 0;
    const active = apiStats?.active ?? 0;
    const inactive = apiStats?.inactive ?? 0;
    const blocked = apiStats?.blocked ?? 0;

    return {
      total,
      active,
      inactive,
      blocked,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
      inactivePercentage: total > 0 ? Math.round((inactive / total) * 100) : 0,
      blockedPercentage: total > 0 ? Math.round((blocked / total) * 100) : 0,
    };
  }, [data?.data?.stats]);

  const totalOverall = apiTotalRecords;
  const totalPages = apiTotalPages;
  const showingFrom = totalOverall === 0 ? 0 : (page - 1) * apiPageSize + 1;
  const showingTo = totalOverall === 0 ? 0 : Math.min(page * apiPageSize, totalOverall);

  return (
    <div className="space-y-2 2xl:space-y-4">
      {/* KPI Cards - Compact Layout */}
      <div className="grid grid-cols-1 gap-2 2xl:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCards
          title="Total Clinics"
          value={kpiStats.total}
          icon={<FiGrid className="h-5 w-5 text-slate-700" />}
          iconBg="bg-slate-100"
          compact={true}
        />

        <KpiCards
          title="Active"
          value={kpiStats.active}
          description={`${kpiStats.activePercentage}%`}
          icon={<FiCheckCircle className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          compact={true}
        />

        <KpiCards
          title="Inactive"
          value={kpiStats.inactive}
          description={`${kpiStats.inactivePercentage}%`}
          icon={<FiAlertCircle className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50"
          compact={true}
        />

        <KpiCards
          title="Blocked"
          value={kpiStats.blocked}
          description={`${kpiStats.blockedPercentage}%`}
          icon={<FiLock className="h-5 w-5 text-rose-600" />}
          iconBg="bg-rose-50"
          compact={true}
        />
      </div>

      {/* Filters Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-2 2xl:p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <Tabs
            aria-label="Clinic Status Filters"
            selectedKey={tab}
            onSelectionChange={(k: React.Key) => {
              if (isTabKey(k)) {
                setTab(k);
                setPage(1);
              }
            }}
            classNames={{
              tabList: "bg-transparent gap-2 p-0",
              tab:
                "h-9 rounded-full px-4 text-[13px] font-semibold border border-slate-300 whitespace-nowrap bg-white text-slate-700 " +
                "data-[hover=true]:bg-slate-50 data-[selected=true]:bg-primary " +
                "data-[selected=true]:text-white data-[selected=true]:border-primary transition-all duration-200",
              tabContent:
                "group-data-[selected=true]:!text-white",
              cursor: "hidden",
            }}
          >
            {TAB_KEYS.map((key) => (
              <Tab
                key={key}
                title={key.charAt(0).toUpperCase() + key.slice(1)}
              />
            ))}
          </Tabs>

          {/* Search + Rows */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="w-full sm:w-64">
              <SearchField
                placeholder="Search clinic name..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                onClear={() => {
                  setSearch("");
                  setPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              <span className="text-slate-600 font-medium whitespace-nowrap">Rows:</span>
              <select
                className="rounded-md border-0 bg-white px-2 py-1 text-slate-700 font-medium outline-none hover:bg-slate-100 transition-colors"
                value={rowsPerPage}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const v = e.target.value === "all" ? "all" : Number(e.target.value);
                  setRowsPerPage(v as 10 | 15 | 20 | "all");
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
          <table className="w-full min-w-[1050px] table-fixed text-left">
            <thead className="bg-slate-50/80">
              <tr className="select-none border-b border-slate-100 text-left">
                <th
                  className="w-[290px] cursor-pointer px-5 py-4 text-[13px] font-bold text-slate-500 transition-colors hover:bg-slate-100/50"
                  onClick={() => toggleSort("clinicName")}
                >
                  <div className="flex items-center gap-1">
                    Clinic
                    <div className="flex flex-col -space-y-1">
                      <FiChevronUp className={`text-[10px] ${sortKey === "clinicName" && sortDir === "asc" ? "text-primary" : "text-slate-300"}`} />
                      <FiChevronDown className={`text-[10px] ${sortKey === "clinicName" && sortDir === "desc" ? "text-primary" : "text-slate-300"}`} />
                    </div>
                  </div>
                </th>
                <th
                  className="w-[220px] cursor-pointer px-5 py-4 text-[13px] font-bold text-slate-500 transition-colors hover:bg-slate-100/50"
                  onClick={() => toggleSort("City")}
                >
                  <div className="flex items-center gap-1">
                    Location
                    <div className="flex flex-col -space-y-1">
                      <FiChevronUp className={`text-[10px] ${sortKey === "City" && sortDir === "asc" ? "text-primary" : "text-slate-300"}`} />
                      <FiChevronDown className={`text-[10px] ${sortKey === "City" && sortDir === "desc" ? "text-primary" : "text-slate-300"}`} />
                    </div>
                  </div>
                </th>
                <th
                  className="w-[190px] cursor-pointer px-5 py-4 text-[13px] font-bold text-slate-500 transition-colors hover:bg-slate-100/50"
                  onClick={() => toggleSort("createdAt")}
                >
                  <div className="flex items-center gap-1">
                    Joined On
                    <div className="flex flex-col -space-y-1">
                      <FiChevronUp className={`text-[10px] ${sortKey === "createdAt" && sortDir === "asc" ? "text-primary" : "text-slate-300"}`} />
                      <FiChevronDown className={`text-[10px] ${sortKey === "createdAt" && sortDir === "desc" ? "text-primary" : "text-slate-300"}`} />
                    </div>
                  </div>
                </th>
                <th
                  className="w-[150px] cursor-pointer px-5 py-4 text-[13px] font-bold text-slate-500 transition-colors hover:bg-slate-100/50"
                  onClick={() => toggleSort("planName")}
                >
                  <div className="flex items-center gap-1">
                    Plan
                    <div className="flex flex-col -space-y-1">
                      <FiChevronUp className={`text-[10px] ${sortKey === "planName" && sortDir === "asc" ? "text-primary" : "text-slate-300"}`} />
                      <FiChevronDown className={`text-[10px] ${sortKey === "planName" && sortDir === "desc" ? "text-primary" : "text-slate-300"}`} />
                    </div>
                  </div>
                </th>
                <th
                  className="w-[150px] cursor-pointer px-5 py-4 text-[13px] font-bold text-slate-500 transition-colors hover:bg-slate-100/50"
                  onClick={() => toggleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <div className="flex flex-col -space-y-1">
                      <FiChevronUp className={`text-[10px] ${sortKey === "status" && sortDir === "asc" ? "text-primary" : "text-slate-300"}`} />
                      <FiChevronDown className={`text-[10px] ${sortKey === "status" && sortDir === "desc" ? "text-primary" : "text-slate-300"}`} />
                    </div>
                  </div>
                </th>
                <th className="w-[110px] px-5 py-4 text-right text-[13px] font-bold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading || isFetching ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <Skel className="h-10 w-10 rounded-full" />
                        <div className="min-w-0 flex-1">
                          <Skel className="h-4 w-48" />
                          <Skel className="mt-2 h-3 w-72 max-w-[70%]" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredAndSortedClinics.length > 0 ? (
                filteredAndSortedClinics.map((item: ClinicListItem) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer transition hover:bg-slate-50/70"
                    onClick={() => handleViewDetail(item.id)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={item.clinicLogo ?? ""}
                          size="sm"
                          name={item.clinicName ?? " "}
                          className="flex-shrink-0 bg-emerald-50 text-emerald-700"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-[14px] font-bold text-slate-950">{item.clinicName || "—"}</span>
                          <span className="truncate text-[12px] font-medium text-slate-500">{item.Tagline || "—"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="truncate text-[14px] font-semibold text-slate-900">{item.City || "—"}</span>
                        <span className="truncate text-[12px] font-medium text-slate-500">{item.State || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="truncate text-[14px] font-bold text-slate-950">{item.createdAt ? formatDate(item.createdAt) : "—"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <Chip
                        size="sm"
                        variant="flat"
                        color={item.planName === "Pro" ? "primary" : "default"}
                        className="font-semibold"
                      >
                        {item.planName || "Free"}
                      </Chip>
                    </td>
                    <td className="px-5 py-4">
                      <Chip
                        size="sm"
                        variant="flat"
                        color={
                          item.status === "Active"
                            ? "success"
                            : item.status === "Blocked" || item.status === "Block"
                              ? "danger"
                              : "warning"
                        }
                        className="font-semibold"
                      >
                        {item.status}
                      </Chip>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                          onClick={() => handleViewDetail(item.id)}
                          title="View clinic"
                          aria-label="View clinic"
                        >
                          <FiEye className="text-[15px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="h-[320px] text-center text-slate-400">
                    No clinics found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden">
          {isLoading || isFetching ? (
            <div className="py-12 text-center">
              <Spinner label="Fetching clinics..." />
            </div>
          ) : filteredAndSortedClinics.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredAndSortedClinics.map((item: ClinicListItem) => (
                <div
                  key={item.id}
                  className="p-4 space-y-4 active:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => handleViewDetail(item.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar
                        src={item.clinicLogo ?? ""}
                        size="md"
                        radius="lg"
                        className="bg-slate-100 flex-shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-900 truncate">{item.clinicName}</span>
                        <span className="text-xs text-slate-500 truncate">{item.Tagline || "—"}</span>
                      </div>
                    </div>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={
                        item.status === "Active"
                          ? "success"
                          : item.status === "Blocked" || item.status === "Block"
                            ? "danger"
                            : "warning"
                      }
                      className="font-semibold flex-shrink-0"
                    >
                      {item.status}
                    </Chip>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-slate-500 font-semibold mb-1">Location</p>
                      <p className="font-medium text-slate-900">{item.City}</p>
                      <p className="text-slate-500">{item.State}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-slate-500 font-semibold mb-1">Plan</p>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={item.planName === "Pro" ? "primary" : "default"}
                        className="font-semibold w-fit"
                      >
                        {item.planName || "Free"}
                      </Chip>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-slate-500 font-semibold mb-1">Joined</p>
                      <p className="font-medium text-slate-900">{item.createdAt ? formatDate(item.createdAt) : "—"}</p>
                    </div>
                  </div>

                  <Button
                    fullWidth
                    size="md"
                    variant="flat"
                    color="primary"
                    className="font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetail(item.id);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500">
              No clinics found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-4 items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600 md:flex-row">
          <div className="w-full text-center text-[13px] font-medium text-slate-500 md:w-auto md:text-left">
            Showing <span className="font-semibold text-slate-900">{showingFrom}</span> to <span className="font-semibold text-slate-900">{showingTo}</span> of <span className="font-semibold text-slate-900">{totalOverall}</span> clinics
          </div>

          {!isLoading && !isFetching && rowsPerPage !== "all" && totalPages > 1 && (
            <Pagination
              isCompact
              showControls
              total={totalPages}
              page={page}
              onChange={setPage}
              classNames={{
                wrapper: "gap-2 flex-wrap justify-center md:justify-end",
                cursor: "hidden",
                item:
                  "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary",
                prev: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
                next: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicManagementTab;
