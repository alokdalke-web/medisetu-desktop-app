import { Spinner } from "@heroui/react";
import { motion } from "framer-motion";
import {
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiDroplet,
  FiEdit2,
  FiGrid,
  FiLayers,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import { formatCurrency } from "../labData";
import { LabScreenInfoTooltip } from "../components/LabScreenInfoTooltip";
import {
  CatalogMetricCard,
  FilterSelect,
  PageSizeDropdown,
  SortHeader,
  SourceBadge,
  StatusBadge,
} from "./LabQueueControls";
import type { CatalogStats, FilterOption, Row, SortKey } from "./types";
import { statusFilterOptions } from "./utils";

type LabQueueCatalogViewProps = {
  isFetching: boolean;
  isLoading: boolean;
  isError: boolean;
  search: string;
  statusFilter: string;
  departmentFilter: string;
  sampleTypeFilter: string;
  departmentFilterOptions: FilterOption[];
  sampleTypeFilterOptions: FilterOption[];
  addDisabled: boolean;
  catalogStats: CatalogStats;
  sortKey: SortKey | null;
  sortDirection: "asc" | "desc";
  visibleRows: Row[];
  firstResult: number;
  lastResult: number;
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  visiblePageNumbers: number[];
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onStatusFilterChange: (value: string) => void;
  onDepartmentFilterChange: (value: string) => void;
  onSampleTypeFilterChange: (value: string) => void;
  onAddTest: () => void;
  onRetry: () => void;
  onSort: (key: SortKey) => void;
  onEditRow: (row: Row) => void;
  onDeleteRow: (row: Row) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

function PaginationControls({
  firstResult,
  lastResult,
  totalRows,
  page,
  pageSize,
  totalPages,
  visiblePageNumbers,
  onPageChange,
  onPageSizeChange,
  mobile = false,
}: {
  firstResult: number;
  lastResult: number;
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  visiblePageNumbers: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  mobile?: boolean;
}) {
  const containerClass = mobile
    ? "flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm lg:hidden sm:flex-row sm:items-center sm:justify-between"
    : "flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-3.5 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between";
  const arrowClass = mobile
    ? "grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    : "grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";
  const pageButtonClass = (isActive: boolean) =>
    mobile
      ? [
          "grid h-9 min-w-9 place-items-center rounded-xl font-bold transition-all duration-200",
          isActive
            ? "bg-primary text-white"
            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
        ].join(" ")
      : [
          "grid h-9 min-w-9 place-items-center rounded-lg font-bold transition-all duration-200",
          isActive
            ? "bg-primary text-white shadow-[0_8px_18px_rgba(0,128,128,0.18)]"
            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300",
        ].join(" ");

  return (
    <div className={containerClass}>
      <span className={mobile ? "font-semibold" : "font-medium"}>
        Showing {firstResult} to {lastResult} of {totalRows} results
      </span>

      <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-slate-600">
        <span className={mobile ? "text-[#677294] font-medium whitespace-nowrap" : "hidden whitespace-nowrap sm:inline-block"}>
          Rows per page:
        </span>
        <PageSizeDropdown value={pageSize} onChange={onPageSizeChange} />

        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className={arrowClass}
          aria-label="Previous page"
        >
          <FiChevronLeft />
        </button>

        {visiblePageNumbers.map((pageNum) => {
          const isActive = pageNum === page;
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={pageButtonClass(isActive)}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className={arrowClass}
          aria-label="Next page"
        >
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
}

export function LabQueueCatalogView({
  isFetching,
  isLoading,
  isError,
  search,
  statusFilter,
  departmentFilter,
  sampleTypeFilter,
  departmentFilterOptions,
  sampleTypeFilterOptions,
  addDisabled,
  catalogStats,
  sortKey,
  sortDirection,
  visibleRows,
  firstResult,
  lastResult,
  totalRows,
  page,
  pageSize,
  totalPages,
  visiblePageNumbers,
  onSearchChange,
  onClearSearch,
  onStatusFilterChange,
  onDepartmentFilterChange,
  onSampleTypeFilterChange,
  onAddTest,
  onRetry,
  onSort,
  onEditRow,
  onDeleteRow,
  onPageChange,
  onPageSizeChange,
}: LabQueueCatalogViewProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-1"
      >
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 md:text-[26px]">
            Lab Test Catalog
          </h1>
          <LabScreenInfoTooltip
            title="Lab Test Catalog"
            description="This screen shows the tests assigned and available for this lab. Manage each test's department, sample type, price, active status, and source so doctor requests and walk-in tests can be processed correctly."
            items={[
              "Use search and filters to find tests by name, department, sample type, status, or source.",
              "Edit tests when prices or details change, and remove entries the lab no longer provides.",
            ]}
            placement="right"
            guideSection="test-catalog-guide"
            linkLabel="Read lab test catalog guide"
          />
          {isFetching && !isLoading && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              <Spinner size="sm" /> Updating
            </span>
          )}
        </div>
        
      </motion.div>

      <motion.div
        id="tour-lab-catalog-kpis"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <CatalogMetricCard
          icon={<FiClipboard className="h-5 w-5" />}
          label="Total Tests"
          value={catalogStats.totalTests}
          detail="Tests created by you"
          tone="emerald"
        />
        <CatalogMetricCard
          icon={<FiGrid className="h-5 w-5" />}
          label="Departments"
          value={catalogStats.departmentCount}
          detail={catalogStats.departmentPreview}
          tone="sky"
        />
        <CatalogMetricCard
          icon={<FiDroplet className="h-5 w-5" />}
          label="Sample Types"
          value={catalogStats.sampleTypeCount}
          detail={catalogStats.sampleTypePreview}
          tone="violet"
        />
        <CatalogMetricCard
          icon={<FiLayers className="h-5 w-5" />}
          label="Custom Tests"
          value={catalogStats.customTestCount}
          detail={catalogStats.sourcePreview}
          tone="amber"
        />
      </motion.div>

      <motion.section
        id="tour-lab-catalog-filters"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2"
      >
        <div className="flex min-w-0 flex-wrap items-stretch gap-3">
          <div className="group relative flex min-w-0 basis-full items-center sm:flex-[1_1_260px] lg:flex-[1.4_1_280px]">
            <FiSearch className="pointer-events-none absolute left-3.5 text-[18px] text-slate-400 transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Search tests by name, department or sample type..."
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-[14px] font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-[14px] placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={onClearSearch}
                className="absolute right-3 grid h-5 w-5 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
              >
                <FiX className="text-sm" />
              </button>
            )}
          </div>

          <div className="min-w-[145px] flex-[1_1_145px]">
            <FilterSelect
              label="Status"
              value={statusFilter}
              options={statusFilterOptions}
              onChange={onStatusFilterChange}
            />
          </div>
          <div className="min-w-[160px] flex-[1_1_165px]">
            <FilterSelect
              label="Department"
              value={departmentFilter}
              options={departmentFilterOptions}
              onChange={onDepartmentFilterChange}
            />
          </div>
          <div className="min-w-[165px] flex-[1_1_170px]">
            <FilterSelect
              label="Sample Type"
              value={sampleTypeFilter}
              options={sampleTypeFilterOptions}
              onChange={onSampleTypeFilterChange}
            />
          </div>

          <div className="flex min-w-0 basis-full flex-col gap-2 sm:flex-row lg:ml-auto lg:flex-[0_0_160px]">
            <button
              id="tour-lab-catalog-add-test"
              type="button"
              onClick={onAddTest}
              disabled={addDisabled}
              className="inline-flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary-active focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiPlus />
              Add Test
            </button>
          </div>
        </div>
      </motion.section>

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Failed to load lab tests</span>
            <button
              onClick={onRetry}
              className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold transition-colors hover:bg-red-100"
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <motion.div
        id="tour-lab-catalog-table"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] lg:block"
      >
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50/80">
            <tr className="border-b border-slate-200">
              {[
                ["Test Name", "testName"],
                ["Department", "departmentName"],
                ["Sample Type", "sampleType"],
                ["Price", "price"],
                ["Status", "status"],
                ["Source", "source"],
              ].map(([label, key]) => (
                <th
                  key={key}
                  className={[
                    "px-4 py-4",
                    key === "testName" ? "w-[28%]" : "",
                    key === "departmentName" ? "w-[15%]" : "",
                    key === "sampleType" ? "w-[15%]" : "",
                    key === "price" ? "w-[9%]" : "",
                    key === "status" ? "w-[11%]" : "",
                    key === "source" ? "w-[12%]" : "",
                  ].join(" ")}
                >
                  <SortHeader
                    label={label}
                    sortKey={key as SortKey}
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    onSort={onSort}
                  />
                </th>
              ))}
              <th className="w-[10%] px-4 py-4 text-right text-[13px] font-bold text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, row) => (
                <tr key={row} className="animate-pulse">
                  {Array.from({ length: 7 }).map((__, col) => (
                    <td key={col} className="px-5 py-4">
                      <div className="h-3 rounded-full bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-12 text-center text-sm text-slate-500"
                >
                  No tests found
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr
                  key={row.key}
                  className="transition-colors duration-200 hover:bg-slate-50/80"
                >
                  <td className="px-4 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                        <FiClipboard className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 truncate text-[14px] font-bold text-slate-950">
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[14px] font-medium text-slate-600">
                    <span className="block truncate">{row.departmentName}</span>
                  </td>
                  <td className="px-4 py-4 text-[14px] font-medium text-slate-600">
                    <span className="block truncate">{row.sampleType}</span>
                  </td>
                  <td className="px-4 py-4 text-[14px] font-bold text-slate-950">
                    {formatCurrency(row.price)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-4">
                    <SourceBadge source={row.source} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEditRow(row)}
                        className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-primary transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 focus:outline-none focus:ring-4 focus:ring-primary/10"
                        title="Edit"
                        aria-label={`Edit ${row.name}`}
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRow(row)}
                        className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-red-100 bg-red-50 text-red-600 transition-all duration-200 hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100"
                        title="Delete"
                        aria-label={`Delete ${row.name}`}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <PaginationControls
          firstResult={firstResult}
          lastResult={lastResult}
          totalRows={totalRows}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          visiblePageNumbers={visiblePageNumbers}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </motion.div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-10 text-sm text-slate-500">
            <Spinner size="sm" /> <span className="ml-2">Loading tests...</span>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            No tests found
          </div>
        ) : (
          visibleRows.map((row) => (
            <motion.article
              key={row.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <FiClipboard className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">
                      {row.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.departmentName} / {row.sampleType}
                    </p>
                  </div>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="text-xs font-medium text-slate-500">
                    Price
                  </span>
                  <div className="mt-1 text-sm font-bold text-slate-950">
                    {formatCurrency(row.price)}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="text-xs font-medium text-slate-500">
                    Source
                  </span>
                  <div className="mt-1">
                    <SourceBadge source={row.source} />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onEditRow(row)}
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-primary"
                  title="Edit"
                  aria-label={`Edit ${row.name}`}
                >
                  <FiEdit2 />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRow(row)}
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-red-100 bg-red-50 text-red-600"
                  title="Delete"
                  aria-label={`Delete ${row.name}`}
                >
                  <FiTrash2 />
                </button>
              </div>
            </motion.article>
          ))
        )}
      </div>

      <PaginationControls
        firstResult={firstResult}
        lastResult={lastResult}
        totalRows={totalRows}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        visiblePageNumbers={visiblePageNumbers}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        mobile
      />
    </>
  );
}
