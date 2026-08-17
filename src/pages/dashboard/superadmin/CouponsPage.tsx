/**
 * CouponsPage — Super Admin coupon management dashboard.
 *
 * Follows the same layout pattern as the Appointment listing screen:
 * - Page header (h2 + subtitle)
 * - Custom HTML table with rounded container, skeleton states
 * - StatusChip for status badges
 * - Pagination with "Rows per page" + HeroUI Pagination
 * - Dark mode support throughout
 */
import {
  addToast,
  Button,
  Chip,
  Pagination,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import React, { useState } from "react";
import {
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiTag,
  FiBarChart2,
  FiChevronDown,
} from "react-icons/fi";
import { useCoupons } from "../../../hooks/useCoupons";
import type { Coupon, CouponStatus } from "../../../redux/api/couponApi";
import CouponFormModal from "./CouponFormModal";
import CouponStatsModal from "./CouponStatsModal";

// ─── Status filter options ─────────────────────────────────
const STATUS_OPTIONS: { label: string; value: CouponStatus | "" }[] = [
  { label: "All Statuses", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Expired", value: "expired" },
];

// ─── Skeleton row ──────────────────────────────────────────
const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-lg bg-surface-muted ${className}`}
  />
);

// ─── Page Size ─────────────────────────────────────────────
type PageSize = 10 | 20 | 50;

const CouponsPage: React.FC = () => {
  const {
    coupons,
    total,
    totalPages,
    currentPage,
    isLoading,
    isFetching,
    isDeleting,
    setPage,
    setStatusFilter,
    statusFilter,
    deleteCoupon,
    getDisplayStatus,
  } = useCoupons();

  // Modal states
  const {
    isOpen: isFormOpen,
    onOpen: onFormOpen,
    onOpenChange: onFormOpenChange,
  } = useDisclosure();
  const {
    isOpen: isStatsOpen,
    onOpen: onStatsOpen,
    onOpenChange: onStatsOpenChange,
  } = useDisclosure();

  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState<PageSize>(20);

  // Status dropdown state
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = React.useRef<HTMLDivElement | null>(null);

  // Page size dropdown state
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const pageSizeRef = React.useRef<HTMLDivElement | null>(null);

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStatusOpen(false);
      }
      if (
        pageSizeRef.current &&
        !pageSizeRef.current.contains(event.target as Node)
      ) {
        setIsPageSizeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Handlers ────────────────────────────────────────────
  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    onFormOpen();
  };

  const handleCreate = () => {
    setSelectedCoupon(null);
    onFormOpen();
  };

  const handleStats = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    onStatsOpen();
  };

  const handleDelete = async (coupon: Coupon) => {
    try {
      await deleteCoupon(coupon.id).unwrap();
      addToast({
        title: "Coupon Deleted",
        description: `"${coupon.code}" has been deactivated.`,
        color: "success",
      });
    } catch (err: any) {
      addToast({
        title: "Error",
        description: err?.data?.message || "Failed to delete coupon",
        color: "danger",
      });
    }
  };

  // ─── Status badge ───────────────────────────────────────
  const statusColor = (status: CouponStatus) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "default";
      case "expired":
        return "danger";
    }
  };

  // Pagination info
  const fromRecord = total > 0 ? Math.min((currentPage - 1) * rowsPerPage + 1, total) : 0;
  const toRecord = total > 0 ? Math.min(currentPage * rowsPerPage, total) : 0;

  const loadingNow = isLoading || isFetching;

  return (
    <div className="w-full min-w-0 px-0 py-0">
      {/* ── Page Header ── */}
      <div className="mb-5">
        <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-text md:text-[26px]">
          Coupons
        </h2>
        <p className="mt-1 text-[13px] font-medium text-text-muted">
          Create and manage discount coupons for subscription plans
        </p>
      </div>

      {/* ── Toolbar: Filter + Create button ── */}
      <div className="mt-4 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Status filter dropdown */}
          <div ref={statusDropdownRef} className="relative w-full sm:w-[180px]">
            <button
              type="button"
              onClick={() => setIsStatusOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={isStatusOpen}
              aria-label="Coupon status filter"
              className={[
                "flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-line bg-surface",
                "px-3 text-[13px] font-semibold text-text shadow-sm",
                "outline-none transition",
                "hover:border-primary/40 hover:bg-surface-muted",
                "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
              ].join(" ")}
            >
              <span className="truncate text-left">
                {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || "All Statuses"}
              </span>
              <FiChevronDown
                className={`ml-2 shrink-0 text-text-muted transition-transform duration-200 ${isStatusOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {isStatusOpen && (
              <div
                role="listbox"
                className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-xl shadow-slate-200/70 dark:shadow-black/30"
              >
                {STATUS_OPTIONS.map((opt) => {
                  const active = statusFilter === opt.value;
                  return (
                    <button
                      key={opt.value || "all"}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setStatusFilter(opt.value);
                        setIsStatusOpen(false);
                      }}
                      className={[
                        "flex min-h-9 w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
                        active
                          ? "bg-teal-500/10 text-teal-700 dark:text-teal-400"
                          : "text-text hover:bg-surface-muted",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Create button */}
        <Button
          color="primary"
          startContent={<FiPlus />}
          onPress={handleCreate}
          className="font-medium h-10 rounded-lg"
        >
          Create Coupon
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="overflow-visible rounded-lg border border-line bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:shadow-none">
        <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-surface-muted">
              <tr className="border-b border-line">
                <th className="w-[22%] px-5 py-4 text-[13px] font-bold text-text-muted">
                  Code
                </th>
                <th className="w-[18%] px-5 py-4 text-[13px] font-bold text-text-muted">
                  Discount
                </th>
                <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-text-muted">
                  Applies To
                </th>
                <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-text-muted">
                  Status
                </th>
                <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-text-muted">
                  Usage
                </th>
                <th className="w-[15%] px-5 py-4 text-[13px] font-bold text-text-muted">
                  Validity
                </th>
                <th className="w-[13%] px-5 py-4 text-[13px] font-bold text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {loadingNow ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Skel className="h-9 w-9 rounded-lg" />
                        <div>
                          <Skel className="h-4 w-28" />
                          <Skel className="mt-2 h-3 w-40" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><Skel className="h-4 w-20" /></td>
                    <td className="px-5 py-4"><Skel className="h-6 w-16 rounded-full" /></td>
                    <td className="px-5 py-4"><Skel className="h-6 w-16 rounded-full" /></td>
                    <td className="px-5 py-4"><Skel className="h-4 w-14" /></td>
                    <td className="px-5 py-4"><Skel className="h-4 w-24" /></td>
                    <td className="px-5 py-4"><Skel className="h-4 w-20" /></td>
                  </tr>
                ))
              ) : coupons.length > 0 ? (
                coupons.map((coupon) => {
                  const displayStatus = getDisplayStatus(coupon);
                  return (
                    <tr
                      key={coupon.id}
                      className="transition hover:bg-surface-muted"
                    >
                      {/* Code */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                            <FiTag className="text-[15px]" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-[14px] font-bold text-text font-mono">
                                {coupon.code}
                              </p>
                              {coupon.firstTimeOnly && (
                                <Chip size="sm" variant="flat" color="warning" className="text-[10px] h-5 px-1">
                                  1st time
                                </Chip>
                              )}
                            </div>
                            {coupon.description && (
                              <p className="truncate text-[12px] font-medium text-text-muted max-w-[180px]">
                                {coupon.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Discount */}
                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          {coupon.discountType === "percentage" && (
                            <>
                              <p className="text-[14px] font-bold text-text">
                                {Number(coupon.discountValue)}% off
                              </p>
                              {coupon.maxDiscountAmount && (
                                <p className="text-[12px] font-medium text-text-muted">
                                  max ₹{Number(coupon.maxDiscountAmount)}
                                </p>
                              )}
                            </>
                          )}
                          {coupon.discountType === "fixed" && (
                            <p className="text-[14px] font-bold text-text">
                              ₹{Number(coupon.discountValue)} flat
                            </p>
                          )}
                          {coupon.discountType === "trial" && (
                            <p className="text-[14px] font-bold text-text">
                              {coupon.trialDays}-day trial
                            </p>
                          )}
                          <p className="text-[12px] font-medium text-text-muted capitalize">
                            {coupon.discountType}
                          </p>
                        </div>
                      </td>

                      {/* Applies To */}
                      <td className="px-5 py-4">
                        <Chip
                          size="sm"
                          variant="flat"
                          color="secondary"
                          className="text-[11px] capitalize"
                        >
                          {coupon.appliesTo.replace(/_/g, " ")}
                        </Chip>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <Chip
                          size="sm"
                          variant="flat"
                          color={statusColor(displayStatus)}
                          className="capitalize"
                        >
                          {displayStatus}
                        </Chip>
                      </td>

                      {/* Usage */}
                      <td className="px-5 py-4">
                        <p className="text-[14px] font-bold text-text">
                          {coupon.currentUses}
                          <span className="font-medium text-text-muted">
                            {coupon.maxUses ? ` / ${coupon.maxUses}` : " / ∞"}
                          </span>
                        </p>
                      </td>

                      {/* Validity */}
                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-text">
                            {new Date(coupon.startsAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-[12px] font-medium text-text-muted">
                            to{" "}
                            {new Date(coupon.expiresAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <Tooltip content="View Stats">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              aria-label="View stats"
                              className="h-10 w-10 lg:h-8 lg:w-8 text-text-muted hover:text-primary"
                              onPress={() => handleStats(coupon)}
                            >
                              <FiBarChart2 size={16} />
                            </Button>
                          </Tooltip>
                          <Tooltip content="Edit">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              aria-label="Edit coupon"
                              className="h-10 w-10 lg:h-8 lg:w-8 text-text-muted hover:text-primary"
                              onPress={() => handleEdit(coupon)}
                            >
                              <FiEdit2 size={16} />
                            </Button>
                          </Tooltip>
                          <Tooltip content="Delete">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              aria-label="Delete coupon"
                              className="h-10 w-10 lg:h-8 lg:w-8 text-text-muted hover:text-danger"
                              isLoading={isDeleting}
                              onPress={() => handleDelete(coupon)}
                            >
                              <FiTrash2 size={16} />
                            </Button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="h-[320px] text-center text-text-subtle"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-muted mb-3">
                        <FiTag className="text-[22px] text-text-subtle" />
                      </span>
                      <p className="text-[15px] font-medium text-text-muted">
                        No coupons found
                      </p>
                      <p className="text-[13px] text-text-subtle mt-1">
                        {statusFilter
                          ? `No ${statusFilter} coupons. Try a different filter.`
                          : "Create your first coupon to get started."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination / Bottom Controls ── */}
        <div className="border-t border-line px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-center sm:justify-start">
              <span className="text-center text-[13px] font-medium text-text-muted sm:text-left">
                Showing {fromRecord} to {toRecord} of {total} coupons
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-end">
              {/* Rows per page dropdown */}
              <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-text-muted sm:justify-start">
                <span className="whitespace-nowrap">Rows per page:</span>
                <div ref={pageSizeRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPageSizeOpen((prev) => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={isPageSizeOpen}
                    aria-label="Rows per page"
                    className={[
                      "flex h-9 w-[72px] items-center justify-between rounded-lg border border-primary/35",
                      "bg-surface px-3 text-[13px] font-semibold text-primary shadow-sm",
                      "outline-none transition",
                      "hover:border-primary/60 hover:bg-primary/5",
                      "focus:border-primary focus:ring-2 focus:ring-primary/20",
                    ].join(" ")}
                  >
                    <span>{rowsPerPage}</span>
                    <FiChevronDown
                      className={`text-primary transition-transform duration-200 ${isPageSizeOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>

                  {isPageSizeOpen && (
                    <div
                      role="listbox"
                      className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[72px] overflow-hidden rounded-lg border border-line bg-surface shadow-lg dark:shadow-none"
                    >
                      {([10, 20, 50] as PageSize[]).map((size) => {
                        const active = rowsPerPage === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => {
                              setRowsPerPage(size);
                              setIsPageSizeOpen(false);
                            }}
                            className={[
                              "flex h-9 w-full items-center px-3 text-left text-[13px] transition",
                              active
                                ? "bg-primary text-white"
                                : "bg-surface text-text hover:bg-primary/5 hover:text-primary",
                            ].join(" ")}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Pagination */}
              {total > 0 && totalPages > 1 && (
                <div className="flex justify-center lg:justify-end">
                  <Pagination
                    isCompact
                    showControls
                    total={totalPages}
                    page={currentPage}
                    onChange={setPage}
                    radius="lg"
                    classNames={{
                      wrapper: "gap-2 flex-wrap justify-center lg:justify-end",
                      item:
                        "min-w-9 h-9 rounded-lg border border-line bg-surface text-text-muted shadow-none " +
                        "hover:bg-surface-muted data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary",
                      prev:
                        "min-w-9 h-9 rounded-lg border border-line bg-surface text-text-muted shadow-none hover:bg-surface-muted",
                      next:
                        "min-w-9 h-9 rounded-lg border border-line bg-surface text-text-muted shadow-none hover:bg-surface-muted",
                      cursor: "hidden",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <CouponFormModal
        isOpen={isFormOpen}
        onOpenChange={onFormOpenChange}
        editData={selectedCoupon}
      />
      <CouponStatsModal
        isOpen={isStatsOpen}
        onOpenChange={onStatsOpenChange}
        coupon={selectedCoupon}
      />
    </div>
  );
};

export default CouponsPage;
