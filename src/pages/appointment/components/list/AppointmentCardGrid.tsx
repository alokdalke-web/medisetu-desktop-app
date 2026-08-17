import { Avatar } from "@heroui/react";
import React from "react";
import StatusChip from "../../../../components/shared/StatusChip";
import type { AppointmentCardGridProps } from "../../../../types/appointment";
import BottomControls from "./BottomControls";
import DraftDataIndicator from "./DraftDataIndicator";
import SkeletonBlock from "./SkeletonBlock";

const AppointmentCardGrid: React.FC<AppointmentCardGridProps> = ({
  rows,
  showSkeleton,
  isRefreshing,
  page,
  setPage,
  totalPages,
  totalRecords,
  rowsPerPage,
  setRowsPerPage,
  goToDetails,
  draftAppointmentIds,
}) => {
  return (
    <div className={[
      "mt-3",
      isRefreshing ? "opacity-60 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200",
    ].join(" ")}>
      {showSkeleton ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-line bg-surface p-4 shadow-sm dark:shadow-none"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-10 w-10 rounded-full" />

                  <div>
                    <SkeletonBlock className="h-4 w-28" />
                    <SkeletonBlock className="mt-2 h-3 w-24" />
                  </div>
                </div>

                <SkeletonBlock className="h-7 w-7 rounded-full" />
              </div>

              <SkeletonBlock className="mt-4 h-12 w-full rounded-xl" />

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="mt-2 h-3 w-20" />
                </div>

                <SkeletonBlock className="h-7 w-24 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.rawId}
              className="rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => goToDetails(row.rawId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToDetails(row.rawId);
                  }
                }}
                className="w-full p-4 text-left"
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <Avatar
                    src={row.avatar || ""}
                    name={row.name}
                    size="sm"
                    className="bg-surface-muted"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="min-w-0 truncate text-[14px] font-semibold leading-5 text-text">
                        {row.name}
                      </p>

                      {draftAppointmentIds.has(row.rawId) && (
                        <DraftDataIndicator />
                      )}
                    </div>

                    <p className="truncate text-[12px] font-medium leading-4 text-text-muted">
                      {row.mobile || "—"}
                    </p>
                  </div>
                </div>

                {/* Doctor strip */}
                <div className="mt-4 rounded-xl bg-surface-muted px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={row.doctorName || "Doctor"}
                      size="sm"
                      className="bg-surface-muted"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold leading-5 text-text">
                        {row.doctorName || "—"}
                      </p>

                      <p className="truncate text-[12px] font-medium leading-4 text-primary">
                        {row.type || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-text-muted">
                      Payment Mode
                    </p>

                    <p className="truncate text-[13px] font-semibold text-text">
                      {row.paymentMethod || "—"}
                    </p>
                  </div>

                  <div className="min-w-0 text-right">
                    <p className="text-[11px] font-medium text-text-muted">
                      Payment Status
                    </p>

                    <p className="truncate text-[13px] font-semibold">
                      {row.paymentStatus === "Refunded" ? (
                        <span className="text-orange-600">
                          ₹{row.refundedAmount || 0} Refunded
                        </span>
                      ) : row.paymentStatus === "Paid" ||
                        row.paymentStatus === "Already Paid" ? (
                        <span className="text-emerald-600">
                          ₹{row.servicePrice || 0} Paid
                        </span>
                      ) : row.paymentStatus === "Covered" ? (
                        <span className="text-blue-600">Covered</span>
                      ) : (
                        <span className="text-text">
                          {row.paymentStatus || "—"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-start gap-2">
                    <span className="mt-[5px] h-2.5 w-2.5 rounded-full bg-emerald-600" />

                    <div>
                      <p className="text-[13px] font-medium leading-5 text-text">
                        {row.date}
                      </p>

                      <p className="text-[12px] font-medium leading-4 text-text-muted">
                        {row.tokenNo != null ? `Token: ${row.tokenNo}` : row.time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusChip status={row.status} isExpired={row.isExpired} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-line bg-surface p-10 text-center text-text-subtle">
          No appointments found for the selected criteria.
        </div>
      )}

      <div className="mt-4">
        <BottomControls
          variant="plain"
          show={!showSkeleton}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
        />
      </div>
    </div>
  );
};

export default AppointmentCardGrid;
