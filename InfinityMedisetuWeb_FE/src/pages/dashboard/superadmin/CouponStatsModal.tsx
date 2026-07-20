/**
 * CouponStatsModal — Displays usage statistics for a single coupon.
 *
 * Shows three metric cards matching the appointment stats card pattern:
 * Total Redemptions, Total Discount Given, Unique Clinics.
 * Also shows a usage progress bar if maxUses is defined.
 */
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Progress,
} from "@heroui/react";
import React from "react";
import { FiX, FiUsers, FiTrendingUp } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import {
  useGetCouponStatsQuery,
  type Coupon,
} from "../../../redux/api/couponApi";

interface CouponStatsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: Coupon | null;
}

// ─── Skeleton ─────────────────────────────────────────────
const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-[#172033] ${className}`} />
);

const CouponStatsModal: React.FC<CouponStatsModalProps> = ({
  isOpen,
  onOpenChange,
  coupon,
}) => {
  // Only fetch stats when modal is open and we have a coupon
  const { data: stats, isLoading } = useGetCouponStatsQuery(coupon?.id ?? 0, {
    skip: !isOpen || !coupon,
  });

  if (!coupon) return null;

  const usagePercentage =
    coupon.maxUses && coupon.maxUses > 0
      ? Math.round((coupon.currentUses / coupon.maxUses) * 100)
      : null;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      hideCloseButton
      size="lg"
      className="rounded-3xl p-6 dark:bg-[#111726]"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center justify-between p-0 mb-6">
              <div>
                <h4 className="font-semibold text-xl text-slate-900 dark:text-white">
                  Coupon Statistics
                </h4>
                <p className="text-sm text-slate-400 font-mono mt-1 dark:text-slate-500">
                  {coupon.code}
                </p>
              </div>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                disableRipple
                onPress={onClose}
              >
                <FiX size={20} className="text-slate-500 dark:text-white" />
              </Button>
            </ModalHeader>

            <ModalBody className="p-0 space-y-5">
              {isLoading ? (
                <div className="grid grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Skel key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Metric cards — same visual pattern as appointment stat cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <StatCard
                      icon={<FiTrendingUp className="text-[20px]" />}
                      iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
                      label="Total Redemptions"
                      value={stats?.totalUses ?? 0}
                    />
                    <StatCard
                      icon={<FaRupeeSign className="text-[18px]" />}
                      iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300"
                      label="Total Discount"
                      value={`₹${(stats?.totalDiscountAmount ?? 0).toLocaleString("en-IN")}`}
                    />
                    <StatCard
                      icon={<FiUsers className="text-[20px]" />}
                      iconClassName="bg-violet-50 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300"
                      label="Unique Clinics"
                      value={stats?.uniqueClinics ?? 0}
                    />
                  </div>

                  {/* Usage progress bar (if maxUses is set) */}
                  {usagePercentage !== null && (
                    <div className="rounded-xl border border-slate-200 dark:border-[#273244] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-semibold text-slate-700 dark:text-white">
                          Usage Limit
                        </span>
                        <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                          {coupon.currentUses} / {coupon.maxUses}
                        </span>
                      </div>
                      <Progress
                        value={usagePercentage}
                        color={
                          usagePercentage >= 90
                            ? "danger"
                            : usagePercentage >= 70
                              ? "warning"
                              : "primary"
                        }
                        size="md"
                        className="w-full"
                      />
                    </div>
                  )}
                </>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

// ─── Stat Card — matches appointment dashboard stat cards ──

interface StatCardProps {
  icon: React.ReactNode;
  iconClassName: string;
  label: string;
  value: string | number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, iconClassName, label, value }) => (
  <div className="rounded-xl border border-slate-200 dark:border-[#273244] bg-white dark:bg-[#0f1728] p-4 flex flex-col gap-3">
    <span className={`grid h-10 w-10 place-items-center rounded-full ${iconClassName}`}>
      {icon}
    </span>
    <div>
      <p className="text-[20px] font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  </div>
);

export default CouponStatsModal;
