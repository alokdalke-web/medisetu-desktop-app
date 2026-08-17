import React from "react";
import dayjs from "dayjs";
import { Avatar } from "@heroui/react";
import type { NoShowTableProps } from "../../../../types/noshow";
import ActionStatusChip from "./ActionStatusChip";
import NoShowCountBadge from "./NoShowCountBadge";
import BottomControls from "./BottomControls";
import SkeletonBlock from "./SkeletonBlock";

const COL_SPAN = 5;

// Same shape/behavior as AppointmentTable/PatientTable/TransactionTable
// (see UI_CONVENTIONS.md §1 "canonical table shape"): whole-row click
// (not just an icon button — a separate per-row "view" button here would
// duplicate the row's own click target, see UI_REMEDIATION_LOG.md #25 for
// why that's a real bug, not just noise), Avatar-based identity cells, the
// shared SkeletonBlock loading rows, and an inline empty-state row rather
// than a separate illustration component. See UI_REMEDIATION_LOG.md #31.
const NoShowTable: React.FC<NoShowTableProps> = ({
  rows,
  showSkeleton,
  onViewHistory,
  page,
  setPage,
  totalPages,
  totalRecords,
  apiPageSize,
  rowsPerPage,
  setRowsPerPage,
}) => (
  <div className="overflow-visible rounded-lg border border-line bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:shadow-none">
    <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
      <table className="w-full min-w-[900px] text-left">
        <thead className="bg-surface-muted">
          <tr className="border-b border-line">
            <th className="w-[24%] px-5 py-4 text-[13px] font-bold text-text-muted">Patient</th>
            <th className="w-[18%] px-5 py-4 text-[13px] font-bold text-text-muted">Doctor</th>
            <th className="w-[25%] px-5 py-4 text-[13px] font-bold text-text-muted">
              Last Appointment
            </th>
            <th className="w-[15%] px-5 py-4 text-[13px] font-bold text-text-muted">
              Total No-Show
            </th>
            <th className="w-[18%] px-5 py-4 text-[13px] font-bold text-text-muted">
              Last Action
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-line">
          {showSkeleton ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={COL_SPAN} className="px-5 py-5">
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
            rows.map((r) => (
              <tr
                key={r.id}
                role="button"
                tabIndex={0}
                aria-label={`View no-show history for ${r.patientName}`}
                className="cursor-pointer transition hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                onClick={() => onViewHistory(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onViewHistory(r.id);
                  }
                }}
              >
                {/* Patient */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={r.patientName}
                      size="sm"
                      className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-text">{r.patientName}</p>
                      <p className="truncate text-[12px] font-medium text-text-muted">
                        {r.patientMobile}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Doctor */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={r.doctorName || "Doctor"}
                      size="sm"
                      className="bg-surface-muted text-text"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-text">
                        Dr. {r.doctorName}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Last Appointment */}
                <td className="px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-text">
                      {dayjs(r.appointmentDate).format("MMM DD, YYYY")}{" "}
                      <span className="font-medium text-text-muted">{r.appointmentTime}</span>
                    </p>
                    <p className="truncate text-[12px] font-medium text-text-muted">
                      {r.appointmentType}
                    </p>
                  </div>
                </td>

                {/* Total No-Shows */}
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1">
                    <NoShowCountBadge count={r.totalNoShows} />
                    {r.firstNoShowDate && (
                      <span className="truncate text-[11px] font-medium text-text-subtle">
                        First: {dayjs(r.firstNoShowDate).format("MMM DD, YY")}
                      </span>
                    )}
                  </div>
                </td>

                {/* Last Action */}
                <td className="px-5 py-4">
                  <ActionStatusChip action={r.latestAction} />
                  {r.isBlocked && (
                    <p className="mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                      Patient is currently blocked
                    </p>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={COL_SPAN} className="h-[320px] text-center text-text-subtle">
                No no-shows found for the selected criteria.
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
      apiPageSize={apiPageSize}
      rowsPerPage={rowsPerPage}
      setRowsPerPage={setRowsPerPage}
    />
  </div>
);

export default NoShowTable;
