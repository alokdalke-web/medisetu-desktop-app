import { Avatar } from "@heroui/react";
import React from "react";
import { FiChevronDown, FiChevronUp, FiClock } from "react-icons/fi";
import QueueStatusIcon from "../../../../components/appointment/QueueStatusIcon";
import StatusChip from "../../../../components/shared/StatusChip";
import type { AppointmentTableProps } from "../../../../types/appointment";
import { doctorDisplayName, toTimeRange } from "../../helpers/appointmentListFormatters";
import BookingSourceCell from "./BookingSourceCell";
import BottomControls from "./BottomControls";
import DraftDataIndicator from "./DraftDataIndicator";
import PaymentCell from "./PaymentCell";
import SkeletonBlock from "./SkeletonBlock";
import { SyncStatusBadge } from "../../../../components/SyncStatusBadge";

const AppointmentTable: React.FC<AppointmentTableProps> = ({
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
  sortDir,
  onSortStatus,
  queueWaitData,
}) => {
  const hasWaitColumn = queueWaitData?.hasData ?? false;

  return (
    <div className={[
      "overflow-visible rounded-lg border border-line bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:shadow-none",
      isRefreshing ? "opacity-60 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200",
    ].join(" ")}>
      <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
        <table className="w-full min-w-[1180px] text-left">
          <thead className="bg-surface-muted">
            <tr className="border-b border-line">
              <th className="w-[20%] min-w-[250px] px-5 py-4 text-[13px] font-bold text-text-muted">
                Patient
              </th>

              <th className="w-[18%] px-5 py-4 text-[13px] font-bold text-text-muted">
                Doctor
              </th>

              <th className="w-[20%] px-5 py-4 text-[13px] font-bold text-text-muted">
                Payment
              </th>

              <th className="w-[13%] px-5 py-4 text-[13px] font-bold text-text-muted">
                Booking Source
              </th>

              <th className="w-[15%] px-5 py-4 text-[13px] font-bold text-text-muted">
                Date &amp; Slot
              </th>

              <th
                className="w-[12%] cursor-pointer px-5 py-4 text-[13px] font-bold text-text-muted"
                onClick={() => onSortStatus?.()}
              >
                <div className="flex items-center gap-1">
                  Status

                  <div className="flex flex-col -space-y-1">
                    <FiChevronUp
                      className={`text-[10px] ${sortDir === "asc"
                        ? "text-primary"
                        : "text-text-subtle"
                        }`}
                    />

                    <FiChevronDown
                      className={`text-[10px] ${sortDir === "desc"
                        ? "text-primary"
                        : "text-text-subtle"
                        }`}
                    />
                  </div>
                </div>
              </th>

              {hasWaitColumn && (
                <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <FiClock size={13} />
                    Est. Wait
                  </div>
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {showSkeleton ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={hasWaitColumn ? 8 : 7} className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <SkeletonBlock className="h-10 w-10 rounded-full" />

                      <div className="min-w-0 flex-1">
                        <SkeletonBlock className="h-4 w-44" />
                        <SkeletonBlock className="mt-2 h-3 w-64 max-w-[70%]" />
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : rows.length > 0 ? (
              rows.map((row) => (
                <tr
                  key={row.rawId}
                  className="cursor-pointer transition hover:bg-surface-muted"
                  onClick={() => goToDetails(row.rawId)}
                >
                  {/* Patient */}
                  <td className="min-w-[250px] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar
                          src={row.avatar || ""}
                          name={row.name}
                          size="sm"
                          className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        />
                        <div className="absolute -bottom-1 -right-1">
                          <SyncStatusBadge entityId={row.rawId} />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="min-w-0 truncate text-[14px] font-bold text-text">
                            {row.name}
                          </p>

                          {draftAppointmentIds.has(row.rawId) && (
                            <DraftDataIndicator />
                          )}
                        </div>

                        <p className="truncate text-[12px] font-medium text-text-muted">
                          {[
                            row.age != null ? `${row.age} Y` : null,
                            row.gender !== "-" ? row.gender : null,
                            row.mobile,
                          ]
                            .filter(Boolean)
                            .join("  •  ") || "—"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Doctor */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={row.doctorName || "Doctor"}
                        size="sm"
                        className="bg-surface-muted text-text"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-text">
                          {doctorDisplayName(row.doctorName)}
                        </p>

                        <p className="truncate text-[12px] font-medium text-text-muted">
                          {row.qualification || row.type || ""}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Payment (mode + status combined — was two separate,
                    redundant columns) */}
                  <td className="px-5 py-4">
                    <PaymentCell row={row} />
                  </td>

                  {/* Booking Source */}
                  <td className="px-5 py-4">
                    <BookingSourceCell source={row.bookingSource} />
                  </td>

                  {/* Date & Slot */}
                  <td className="px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-text">
                        {row.date || "—"}
                      </p>

                      <p className="truncate text-[12px] font-medium text-text-muted">
                        {row.tokenNo != null
                          ? `Token: ${row.tokenNo}`
                          : toTimeRange(
                            row.time,
                            row.appointmentDurationMinutes,
                          )}
                      </p>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <StatusChip
                        status={row.status}
                        isExpired={row.isExpired}
                      />
                    </div>
                  </td>

                  {/* Est. Wait (from real-time queue) */}
                  {hasWaitColumn && (
                    <td className="px-5 py-4">
                      {(() => {
                        const wait = queueWaitData?.waitByAppointmentId.get(row.rawId);
                        const status = row.status?.toLowerCase();

                        if (status === "completed") {
                          return <QueueStatusIcon variant="completed" />;
                        }
                        if (status === "patient arrived") {
                          return <QueueStatusIcon variant="in-progress" />;
                        }
                        if (status === "cancelled" || status === "noshow") {
                          return <QueueStatusIcon variant="cancelled" />;
                        }
                        if (wait != null && wait > 0) {
                          return <QueueStatusIcon variant="delayed" waitMinutes={wait} />;
                        }
                        // wait is 0 OR no data for active appointments → on time
                        return <QueueStatusIcon variant="on-time" />;
                      })()}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={hasWaitColumn ? 8 : 7}
                  className="h-[320px] text-center text-text-subtle"
                >
                  No appointments found for the selected criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <BottomControls
        show={!showSkeleton}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
      />
    </div>
  );
};

export default AppointmentTable;
