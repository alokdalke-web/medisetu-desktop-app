import { useState, useCallback } from "react";
import {
  useGetCouponsQuery,
  useDeleteCouponMutation,
  type Coupon,
  type CouponStatus,
} from "../redux/api/couponApi";

/**
 * Custom hook to manage coupon list state —
 * pagination, status filtering, and deletion.
 */
export function useCoupons() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CouponStatus | "">("");
  const limit = 20;

  // Fetch coupons with current filters
  const { data, isLoading, isFetching, refetch } = useGetCouponsQuery({
    page,
    limit,
    status: statusFilter || undefined,
  });

  const [deleteCoupon, { isLoading: isDeleting }] = useDeleteCouponMutation();

  // Handle status filter change (resets to page 1)
  const handleStatusChange = useCallback((status: CouponStatus | "") => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Determine display status (handles runtime expiry check)
  const getDisplayStatus = useCallback((coupon: Coupon): CouponStatus => {
    if (coupon.status === "inactive") return "inactive";
    if (new Date(coupon.expiresAt) < new Date()) return "expired";
    return "active";
  }, []);

  return {
    // Data
    coupons: data?.coupons ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    currentPage: page,

    // Loading states
    isLoading,
    isFetching,
    isDeleting,

    // Actions
    setPage: handlePageChange,
    setStatusFilter: handleStatusChange,
    deleteCoupon,
    refetch,

    // Helpers
    statusFilter,
    getDisplayStatus,
  };
}
