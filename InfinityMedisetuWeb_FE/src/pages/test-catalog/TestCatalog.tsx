// src/pages/test-catalog/TestCatalog.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  addToast,
} from "@heroui/react";
import { FiSearch, FiX, FiTrash2,  } from "react-icons/fi";

import {
  useGetAllTestsByClinicIdQuery,
  useCreateTestMutation,
  useUpdateTestMutation,
  useDeleteTestMutation,
  type GetTestsArgs,
} from "../../redux/api/testApi";

import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import Icons from "../../constants/icons";
import StatusChip from "../../components/shared/StatusChip";
import EditButton from "../../components/shared/EditButton";
import AppButton from "../../components/shared/AppButton";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { testCatalogTips } from "../../constants/featureTips";
/* ---------- Types ---------- */
type TestStatus = "Active" | "Deactive";

type TestRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  status: TestStatus;
};

type ApiPagination = {
  totalRecords?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
};

/* ---------- UI helpers ---------- */
const rupee = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const normalizeStatus = (s: unknown): TestStatus => {
  const v = String(s ?? "")
    .toLowerCase()
    .trim();
  return v === "active" ? "Active" : "Deactive";
};

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <label className="block">
      <div className="mb-2 text-[13px] sm:text-sm font-semibold text-slate-900">
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={[
          "w-full border border-gray-200 bg-white outline-none",
          "h-10 sm:h-12 px-4",
          "rounded-xl sm:rounded-full",
          "text-[13px] sm:text-[14px] text-slate-900",
          "focus:border-primary focus:ring-2 focus:ring-primary/20",
        ].join(" ")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ✅ more compact on mobile */
const iconBtn =
  "inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-600 hover:bg-gray-50";

/* ---------- Skeleton helpers ---------- */
const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
);

const TestTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-[13px] sm:text-[14px]">
      <thead className="bg-slate-50">
        <tr className="border-b border-slate-200 text-slate-500">
          <th className="px-5 sm:px-6 py-3 sm:py-4 text-left font-medium">
            Test Name
          </th>
          <th className="px-5 sm:px-6 py-3 sm:py-4 text-left font-medium">
            Category
          </th>
          <th className="px-5 sm:px-6 py-3 sm:py-4 text-left font-medium">
            Price
          </th>
          <th className="px-5 sm:px-6 py-3 sm:py-4 text-left font-medium">
            Status
          </th>
          <th className="px-5 sm:px-6 py-3 sm:py-4 text-right font-medium">
            Action
          </th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr
            key={i}
            className={i !== rows - 1 ? "border-b border-gray-100" : ""}
          >
            <td className="px-5 sm:px-6 py-3 sm:py-4">
              <Skel className="h-4 w-48" />
            </td>
            <td className="px-5 sm:px-6 py-3 sm:py-4">
              <Skel className="h-4 w-36" />
            </td>
            <td className="px-5 sm:px-6 py-3 sm:py-4">
              <Skel className="h-4 w-24" />
            </td>
            <td className="px-5 sm:px-6 py-3 sm:py-4">
              <Skel className="h-6 w-24 rounded-full" />
            </td>
            <td className="px-5 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center justify-end gap-2">
                <Skel className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" />
                <Skel className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TestCardsSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Skel className="h-4 w-48" />
            <Skel className="h-3 w-32" />
          </div>
          <Skel className="h-6 w-20 rounded-full" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Skel className="h-10 w-full rounded-xl" />
          <Skel className="h-10 w-full rounded-xl" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Skel className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" />
          <Skel className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

/* ---------- Card Component ---------- */
const TestCard: React.FC<{
  r: TestRow;
  openEditModal: (row: TestRow) => void;
  setDeleteTarget: (row: TestRow | null) => void;
  setDeleteOpen: (open: boolean) => void;
}> = ({ r, openEditModal, setDeleteTarget, setDeleteOpen }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      {/* Left side */}
      <div className="min-w-0">
        <div className="font-semibold text-[14px] sm:text-[15px] text-slate-900 truncate">
          {r.name}
        </div>
        <div className="mt-0.5 text-[11px] sm:text-xs text-slate-500 truncate">
          {r.category}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
       


        <EditButton
  text="" // no text, just icon
  onPress={() => openEditModal(r)}
 // isDisabled={isLoading}
/>


        <button
          type="button"
          className={[iconBtn, "text-rose-600 hover:bg-rose-50"].join(" ")}
          onClick={() => {
            setDeleteTarget(r);
            setDeleteOpen(true);
          }}
          aria-label="Delete"
          title="Delete"
        >
          <FiTrash2 className=" text-rose-600 text-[13px] sm:text-[14px]" />
        </button>
      </div>
    </div>

    <div className="mt-3 flex items-center justify-between">
      {/* Left side */}
      <div className="grid gap-2.5 sm:gap-3">
        <div className="px-3 py-2.5">
          <div className="mt-0.5 font-semibold text-[13px] sm:text-sm text-slate-900">
            {rupee(r.price)}
          </div>
          <div className="text-[11px] sm:text-xs text-slate-500">Price</div>
        </div>
      </div>

      {/* Right side */}
      <StatusChip status={r.status} />
    </div>
  </div>
);

const TestCatalog: React.FC = () => {
  /* ✅ clinic id */
  const {
    data: clinicData,
    isLoading: isClinicLoading,
    isFetching: isClinicFetching,
    isError: isClinicError,
    error: clinicError,
  } = useGetAllClinicsQuery();

  const clinicId = clinicData?.clinic?.id as string | undefined;

  /* ---------- Search / Pagination / Filter (SERVER) ---------- */
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<8 | 10 | 15 | "all">(10);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid"); // Add view mode state
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Deactive"
  >("All"); // Add status filter state

  const apiPageSize = rowsPerPage === "all" ? 1000 : rowsPerPage;

  useEffect(() => setPage(1), [search, rowsPerPage, clinicId, statusFilter]);

  const listArg: GetTestsArgs = useMemo(
    () => ({
      clinicId: clinicId ?? "",
      page,
      pageSize: apiPageSize,
      search: search.trim() ? search.trim() : undefined,
      status: statusFilter === "All" ? undefined : statusFilter.toLowerCase(),
    }),
    [clinicId, page, apiPageSize, search, statusFilter],
  );

  const {
    data: listData,
    isLoading: isListLoading,
    isFetching: isListFetching,
    isError: isListError,
    error: listError,
    refetch,
  } = useGetAllTestsByClinicIdQuery(listArg, {
    skip: !clinicId,
    refetchOnMountOrArgChange: true,
  });

  const [createTest, { isLoading: isCreating }] = useCreateTestMutation();
  const [updateTest, { isLoading: isUpdating }] = useUpdateTestMutation();
  const [deleteTest, { isLoading: isDeleting }] = useDeleteTestMutation();

  const busy = isCreating || isUpdating || isDeleting;

  /* ---------- Read backend response ---------- */
  const apiList: any[] = useMemo(() => {
    const d: any = listData;
    if (!d) return [];
    if (Array.isArray(d?.result)) return d.result;
    if (Array.isArray(d)) return d;
    return [];
  }, [listData]);

  const meta: ApiPagination | null = useMemo(() => {
    const d: any = listData;
    return (d?.pagination as ApiPagination) ?? null;
  }, [listData]);

  /* ---------- Rows mapped from API ---------- */
  const rows: TestRow[] = useMemo(() => {
    return apiList.map((t: any) => ({
      id: String(t?.id ?? ""),
      name: String(t?.name ?? ""),
      category: String(t?.category ?? ""),
      price: Number(t?.price ?? 0),
      status: normalizeStatus(t?.status),
    }));
  }, [apiList]);

  const totalRecords = Number(meta?.totalRecords ?? 0);
  const totalPages = Math.max(1, Number(meta?.totalPages ?? 1));
  const currentPage = Math.min(page, totalPages);
  // const pageSizeUsed = Number(meta?.pageSize ?? apiPageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    if (rowsPerPage === "all") return rows;
    return rows; // backend already returned current page
  }, [rows, rowsPerPage]);

  const getErrText = (err: any, fallback: string) => {
    if (!err) return fallback;
    if (err?.data?.errors?.[0]?.message) return err.data.errors[0].message;
    if (err?.data?.message) return err.data.message;
    if (err?.error) return err.error;
    if (typeof err === "string") return err;
    return fallback;
  };

  useEffect(() => {
    if (isClinicError) {
      addToast({
        title: "Failed to load clinic",
        description: getErrText(clinicError, "Clinic load failed."),
        color: "danger",
        variant: "flat",
      });
    }
  }, [isClinicError, clinicError]);

  useEffect(() => {
    if (isListError) {
      addToast({
        title: "Failed to load tests",
        description: getErrText(listError, "Tests load failed."),
        color: "danger",
        variant: "flat",
      });
    }
  }, [isListError, listError]);

  /* ---------- Add/Edit modal ---------- */
  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [selectedRow, setSelectedRow] = useState<TestRow | null>(null);

  const [testName, setTestName] = useState("");
  const [category, setCategory] = useState("Blood Test");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<TestStatus>("Active");

  const openAddModal = () => {
    setMode("add");
    setSelectedRow(null);
    setTestName("");
    setCategory("Blood Test");
    setPrice("");
    setStatus("Active");
    setFormOpen(true);
  };

  const openEditModal = (row: TestRow) => {
    setMode("edit");
    setSelectedRow(row);
    setTestName(row.name);
    setCategory(row.category);
    setPrice(String(row.price));
    setStatus(row.status);
    setFormOpen(true);
  };

  const isSaveDisabled =
    busy ||
    !clinicId ||
    !testName.trim() ||
    !price.trim() ||
    Number.isNaN(Number(price)) ||
    Number(price) <= 0;

  const handleSubmit = async () => {
    if (isSaveDisabled) return;

    const payload = {
      name: testName.trim(),
      category,
      price: Number(price),
      status: status === "Active" ? "active" : "deactive",
      clientId: clinicId!,
    };

    try {
      if (mode === "add") await createTest(payload as any).unwrap();
      else if (selectedRow) {
        await updateTest({ id: selectedRow.id, ...payload } as any).unwrap();
      }

      addToast({
        title: mode === "add" ? "Test created" : "Test updated",
        color: "success",
        variant: "flat",
      });

      setFormOpen(false);
      refetch();
    } catch (e: any) {
      addToast({
        title: "Action failed",
        description: getErrText(e, "Something went wrong."),
        color: "danger",
        variant: "flat",
      });
    }
  };

  /* ---------- Delete modal ---------- */
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TestRow | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTest(deleteTarget.id as any).unwrap();
      addToast({ title: "Test deleted", color: "success", variant: "flat" });
      setDeleteOpen(false);
      setDeleteTarget(null);
      refetch();
    } catch (e: any) {
      addToast({
        title: "Delete failed",
        description: getErrText(e, "Unable to delete test."),
        color: "danger",
        variant: "flat",
      });
    }
  };

  const listLoading =
    isClinicLoading || isClinicFetching || isListLoading || isListFetching;

  const skelRows = rowsPerPage === "all" ? 8 : apiPageSize;

  return (
    <div className="mx-auto w-full max-w-full bg-[#F9FBFC] ">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3   pb-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl md:text -[28px]">
              Test Catalog
            </h2>
            <FeatureInfoTip
              title="Test Catalog Tips"
              tips={testCatalogTips}
              guideSection="test-catalog-guide"
              linkLabel="Read test catalog guide"
            />
          </div>
        </div>

        <div id="tour-add-test-btn" className="w-full sm:w-auto">
     <AppButton
  text="+ Add New Test"
  onPress={openAddModal}
  isDisabled={busy}
  buttonVariant="primary" // or "custom" if you have a green variant
 // className="h-9 sm:h-10 md:h-11 w-full sm:w-auto bg-[#2f7d6e] text-[13px] sm:text-sm font-semibold text-white hover:bg-[#256857]"
/>

        </div>
      </div>
      {/* Combined Filter + Search + Toggle Container */}
      <div className="mb-4 rounded-xl border   border-gray-200  shadow-md">
        {/* Status Filters */}
        <div className="mb-2    ">
          <div className="flex items-center gap-2 border-b border-gray-200 bg-[#FFFFFF]  rounded-t-xl">
            {["All", "Active", "Deactive"].map((status) => (
              <button
                key={status}
                type="button"
                className={`px-4 py-1.5 text-sm font-medium transition-colors border-b-2 p-2 ${
                  statusFilter === status
                    ? "border-[#2f7d6e] text-[#2f7d6e]" // Active tab: custom border & text
                    : "border-transparent text-slate-600 hover:text-gray-900 hover:border-gray-400" // Deactive tab: transparent border, change on hover
                }`}
                onClick={() =>
                  setStatusFilter(status as "All" | "Active" | "Deactive")
                }
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        {/* Search + View Toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4">
          <div className="w-full sm:max-w-[360px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-[14px]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search test..."
                className="w-full h-9 sm:h-10 pl-10 pr-4 rounded-full border border-gray-200 bg-white text-[13px] sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:justify-end">
            <div className="flex items-center gap-2">
              {/* List */}
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors
        ${
          viewMode === "list"
            ? "bg-[#0A6C741A] text-[#0A6C74]"
            : "text-[#677294] hover:bg-gray-200"
        }
      `}
              >
                <img src={Icons.listIcon} alt="List view" className="h-6 w-6" />
              </button>

              {/* Grid */}
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors
        ${
          viewMode === "grid"
            ? "bg-[#0A6C741A] text-[#0A6C74]"
            : "text-[#677294] hover:bg-gray-200"
        }
      `}
              >
                <img src={Icons.gridIcon} alt="Grid view" className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3  py-3   text-[12px] sm:text-sm text-slate-500  ">
        {/* Left: Rows per page */}
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Appointment per page :</span>
          <div className="relative inline-block">
            <select
              className="h-8 min-w-[72px] appearance-none rounded-full border border-gray-300 bg-[#FFFFFF] px-3 pr-7 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
              value={rowsPerPage}
              onChange={(e) => {
                const v =
                  e.target.value === "all" ? "all" : Number(e.target.value);
                setRowsPerPage(v as 8 | 10 | 15 | "all");
                setPage(1);
              }}
            >
              <option value={8}>8</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value="all">All</option>
            </select>

            {/* Custom arrow */}
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
              ▼
            </span>
          </div>
        </div>

        {/* Right: Pagination */}
        {!listLoading && rowsPerPage !== "all" && totalPages > 0 && (
          <div className="flex items-center gap-1">
            {/* First */}
            <button
              className="h-7 w-7 rounded border border-gray-200 text-slate-500 hover:bg-gray-50 disabled:opacity-40"
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
            >
              «
            </button>

            {/* Prev */}
            <button
              className="h-7 w-7 rounded border border-gray-200 text-slate-500 hover:bg-gray-50 disabled:opacity-40"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹
            </button>

            {/* Pages */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  className={`h-7 w-7 rounded text-sm font-medium ${
                    currentPage === pageNum
                      ? "bg-[#2f7d6e] text-white"
                      : "border border-gray-200 text-slate-600 hover:bg-[#FFFFFF]"
                  }`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && <span className="px-1 text-slate-400">…</span>}

            {totalPages > 5 && (
              <button
                className={`h-7 w-7 rounded text-sm font-medium ${
                  currentPage === totalPages
                    ? "bg-[#2f7d6e] text-white"
                    : "border border-gray-200 text-slate-600 hover:bg-gray-50"
                }`}
                onClick={() => setPage(totalPages)}
              >
                {totalPages}
              </button>
            )}

            {/* Next */}
            <button
              className="h-7 w-7 rounded border border-gray-200 text-slate-500 hover:bg-gray-50 disabled:opacity-40"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              ›
            </button>     

            {/* Last */}
            <button
              className="h-7 w-7 rounded border border-gray-200 text-slate-500 hover:bg-gray-50 disabled:opacity-40"
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              »
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div
        className={`overflow-hidden ${
          viewMode === "list"
            ? "rounded-2xl border border-gray-200 bg-white shadow-sm"
            : ""
        }`}
      >
        {listLoading ? (
          <>
            {/* Mobile skeleton */}
            <div className="md:hidden p-3 sm:p-4">
              <TestCardsSkeleton rows={skelRows} />
            </div>

            {/* Desktop skeleton */}
            <div className="hidden md:block">
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {Array.from({ length: skelRows }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm"
                    >
                      <TestCardsSkeleton rows={1} />
                    </div>
                  ))}
                </div>
              ) : (
                <TestTableSkeleton rows={skelRows} />
              )}
            </div>
          </>
        ) : (
          <>
            {/* ✅ MOBILE: Cards */}
            <div className="md:hidden p-3 sm:p-4 space-y-3">
              {totalRecords === 0 ? (
                <div className="px-2 py-10 text-center text-[13px] text-slate-500">
                  No tests found.
                </div>
              ) : (
                pageRows.map((r) => (
                  <TestCard
                    key={r.id}
                    r={r}
                    openEditModal={openEditModal}
                    setDeleteTarget={setDeleteTarget}
                    setDeleteOpen={setDeleteOpen}
                  />
                ))
              )}
            </div>

            {/* ✅ DESKTOP: Grid or List */}
            <div className="hidden md:block">
              {viewMode === "grid" ? (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ">
                  {totalRecords === 0 ? (
                    <div className="col-span-full px-2 py-10 text-center text-[13px] text-slate-500">
                      No tests found.
                    </div>
                  ) : (
                    pageRows.map((r) => (
                      <TestCard
                        key={r.id}
                        r={r}
                        openEditModal={openEditModal}
                        setDeleteTarget={setDeleteTarget}
                        setDeleteOpen={setDeleteOpen}
                      />
                    ))
                  )}
                </div>
              ) : (
                /* List View */
                <div className="overflow-x-auto">
                  <table className="min-w-full text-[13px] sm:text-[14px]">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-gray-200 text-slate-500">
                        <th className="px-6 py-4 text-left font-medium">
                          Test Name
                        </th>
                        <th className="px-6 py-4 text-left font-medium">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left font-medium">
                          Price
                        </th>
                        <th className="px-6 py-4 text-left font-medium">
                          Status
                        </th>
                        <th className="px-6 py-4 text-right font-medium">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {totalRecords === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-10 text-center text-slate-500"
                          >
                            No tests found.
                          </td>
                        </tr>
                      ) : (
                        pageRows.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-gray-100 hover:bg-gray-50/60"
                          >
                            <td className="px-6 py-4 font-semibold text-slate-900">
                              {r.name}
                            </td>
                            <td className="px-6 py-4 text-slate-700">
                              {r.category}
                            </td>
                            <td className="px-6 py-4 text-slate-900">
                              {rupee(r.price)}
                            </td>
                            <td className="px-6 py-4">
                              <StatusChip status={r.status} />
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <EditButton
                                  text="" 
                                  onPress={() => openEditModal(r)}
                                  // isDisabled={isLoading}
                                />

                                <button
                                  type="button"
                                  className={[
                                    iconBtn,
                                    "text-rose-600 hover:bg-rose-50",
                                  ].join(" ")}
                                  onClick={() => {
                                    setDeleteTarget(r);
                                    setDeleteOpen(true);
                                  }}
                                  aria-label="Delete"
                                  title="Delete"
                                >
                                  <FiTrash2 className=" text-rose-600 text-[14px]" />
                                </button>
                                
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={formOpen}
        onOpenChange={(open) => setFormOpen(open)}
        size="lg"
        placement="center"
        hideCloseButton
        classNames={{
          base: "rounded-2xl sm:rounded-3xl mx-2 sm:mx-0",
          body: "p-0",
        }}
      >
        <ModalContent>
          <ModalBody>
            <div className="p-5 sm:p-7">
              <div className="mb-5 sm:mb-6 flex items-start justify-between">
                <h3 className="text-[16px] sm:text-2xl font-semibold text-slate-900">
                  {mode === "add" ? "Add New Test" : "Edit Test"}
                </h3>
                <button
                  onClick={() => setFormOpen(false)}
                  className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full text-slate-600 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <FiX className="text-[18px] sm:text-xl" />
                </button>
              </div>

              {!clinicId && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
                  Clinic ID not found. Please ensure clinic API is loaded.
                </div>
              )}

              <div className="space-y-4 sm:space-y-5">
                <label className="block">
                  <div className="mb-2 text-[13px] sm:text-sm font-semibold text-slate-900">
                    Test Name
                  </div>
                  <Input
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Enter test name"
                    radius="full"
                    classNames={{
                      inputWrapper:
                        "h-10 sm:h-12 border border-gray-200 bg-white shadow-none hover:shadow-none focus-within:shadow-none",
                      input: "text-[13px] sm:text-sm",
                    }}
                  />
                </label>

                <SelectField
                  label="Category"
                  value={category}
                  onChange={setCategory}
                  options={[
                    { label: "Blood Test", value: "Blood Test" },
                    { label: "Biochemistry", value: "Biochemistry" },
                    { label: "Hormone", value: "Hormone" },
                    { label: "Vitamins", value: "Vitamins" },
                    { label: "Cardiac", value: "Cardiac" },
                    { label: "Diabetes", value: "Diabetes" },
                  ]}
                />

                <label className="block">
                  <div className="mb-2 text-[13px] sm:text-sm font-semibold text-slate-900">
                    Price
                  </div>
                  <Input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Enter price"
                    radius="full"
                    type="number"
                    classNames={{
                      inputWrapper:
                        "h-10 sm:h-12 border border-gray-200 bg-white shadow-none hover:shadow-none focus-within:shadow-none",
                      input: "text-[13px] sm:text-sm",
                    }}
                  />
                </label>

                <SelectField<TestStatus>
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    { label: "Active", value: "Active" },
                    { label: "Deactive", value: "Deactive" },
                  ]}
                />
              </div>

              <div className="mt-6 sm:mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  radius="full"
                  variant="bordered"
                  className="h-10 sm:h-12 w-full sm:flex-1 border-[#2f7d6e] text-[#2f7d6e] text-[13px] sm:text-sm"
                  onPress={() => setFormOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  radius="full"
                  className="h-10 sm:h-12 w-full sm:flex-[2] bg-[#2f7d6e] text-[13px] sm:text-sm font-semibold text-white hover:bg-[#256857]"
                  onPress={handleSubmit}
                  isDisabled={isSaveDisabled}
                >
                  {mode === "add" ? "Save Test" : "Update Test"}
                </Button>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteOpen}
        onOpenChange={(open) => setDeleteOpen(open)}
        size="md"
        placement="center"
        hideCloseButton
        classNames={{
          base: "rounded-2xl sm:rounded-3xl mx-2 sm:mx-0",
          body: "p-0",
        }}
      >
        <ModalContent>
          <ModalBody>
            <div className="p-5 sm:p-7">
              {/* Centered Delete Button */}
              <div className="flex justify-center mb-4">
                <button
                  type="button"
                  className={[
                    iconBtn,
                    "text-rose-600 hover:bg-rose-50",
                    "flex items-center justify-center rounded-full p-4 w-16 h-16 sm:w-18 sm:h-18",
                  ].join(" ")}
                  onClick={() => {
                    setDeleteTarget(null);
                  }}
                  aria-label="Delete"
                  title="Delete"
                >
                  <FiTrash2 className="text-rose-600 text-[36px] sm:text-[40px]" />
                </button>
              </div>

              {/* Deleted Test Heading */}
              <h3 className="text-center text-[16px] sm:text-xl font-semibold text-slate-900 mb-2">
                Deleted Test
              </h3>

              {/* Paragraph content */}
              <p className="text-center text-[13px] sm:text-sm text-slate-600 mb-1">
                Complete Blood Count will be removed.
              </p>
              <p className="text-center text-[13px] sm:text-sm text-rose-600">
                This action cannot be undone.
              </p>

              {/* Action Buttons */}
              <div className="mt-6 sm:mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  radius="full"
                  variant="bordered"
                  className="h-10 sm:h-12 w-full sm:flex-1 border-gray-200 text-slate-700 text-[13px] sm:text-sm"
                  onPress={() => setDeleteOpen(false)}
                >
                  No
                </Button>

                <Button
                  radius="full"
                  className="h-10 sm:h-12 w-full sm:flex-[2] bg-rose-600 text-[13px] sm:text-sm font-semibold text-white hover:bg-rose-700"
                  onPress={confirmDelete}
                  isDisabled={busy}
                >
                  Yes, Delete
                </Button>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default TestCatalog;
