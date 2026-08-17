import React from "react";
import dayjs from "dayjs";
import { Avatar } from "@heroui/react";
import type { NoShowCardGridProps, NoShowRow } from "../../../../types/noshow";
import ActionStatusChip from "./ActionStatusChip";
import NoShowCountBadge from "./NoShowCountBadge";
import BottomControls from "./BottomControls";
import SkeletonBlock from "./SkeletonBlock";

// Mirrors AppointmentCardGrid.tsx's structure (see
// UI_REMEDIATION_LOG.md #33): whole-card click (no separate "Details"
// button duplicating it), Avatar-based header + doctor "strip", an info
// strip below it, and a bottom row (status dot + text on the left,
// status chip on the right).
const NoShowCard: React.FC<{
  r: NoShowRow;
  onViewHistory: (patientId: string) => void;
}> = ({ r, onViewHistory }) => (
  <div className="rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none">
    <div
      role="button"
      tabIndex={0}
      onClick={() => onViewHistory(r.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onViewHistory(r.id);
        }
      }}
      className="w-full p-4 text-left"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            name={r.patientName}
            size="sm"
            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-5 text-text">
              {r.patientName}
            </p>
            <p className="truncate text-[12px] font-medium leading-4 text-text-muted">
              {r.patientMobile}
            </p>
          </div>
        </div>
        <NoShowCountBadge count={r.totalNoShows} />
      </div>

      {/* Doctor strip */}
      <div className="mt-4 rounded-xl bg-surface-muted px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={r.doctorName || "Doctor"} size="sm" className="bg-surface-muted" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-5 text-text">
              {r.doctorName ? `Dr. ${r.doctorName}` : "—"}
            </p>
            <p className="truncate text-[12px] font-medium leading-4 text-primary">
              {r.appointmentType || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Appointment info */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-text-muted">Last Appointment</p>
          <p className="truncate text-[13px] font-semibold text-text">
            {dayjs(r.appointmentDate).format("MMM DD, YYYY")}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[11px] font-medium text-text-muted">Time</p>
          <p className="truncate text-[13px] font-semibold text-text">{r.appointmentTime}</p>
        </div>
      </div>

      {r.markedBy && (
        <p className="mt-3 truncate text-[12px] font-medium text-text-muted">
          Marked by: <span className="text-text">{r.markedBy}</span>
        </p>
      )}

      {/* Bottom row */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-start gap-2">
          <span
            className={`mt-[5px] h-2.5 w-2.5 rounded-full ${r.isBlocked ? "bg-red-600" : "bg-emerald-600"}`}
          />
          <div>
            <p className="text-[13px] font-medium leading-5 text-text">
              {r.firstNoShowDate
                ? `First: ${dayjs(r.firstNoShowDate).format("MMM DD, YY")}`
                : "No-show history"}
            </p>
            {r.isBlocked && (
              <p className="text-[12px] font-medium leading-4 text-red-600 dark:text-red-400">
                Patient blocked
              </p>
            )}
          </div>
        </div>

        <ActionStatusChip action={r.latestAction} />
      </div>
    </div>
  </div>
);

const NoShowCardGrid: React.FC<NoShowCardGridProps> = ({
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
  <div>
    {showSkeleton ? (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-4 shadow-sm dark:shadow-none">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-10 w-10 rounded-full" />
                <div>
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="mt-2 h-3 w-24" />
                </div>
              </div>
              <SkeletonBlock className="h-7 w-20 rounded-full" />
            </div>
            <SkeletonBlock className="mt-4 h-12 w-full rounded-xl" />
            <div className="mt-3 flex items-center justify-between">
              <SkeletonBlock className="h-10 w-[48%] rounded-lg" />
              <SkeletonBlock className="h-10 w-[48%] rounded-lg" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-7 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    ) : rows.length > 0 ? (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <NoShowCard key={r.id} r={r} onViewHistory={onViewHistory} />
        ))}
      </div>
    ) : (
      <div className="mt-4 rounded-2xl border border-line bg-surface p-10 text-center text-text-subtle">
        No no-shows found for the selected criteria.
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
        apiPageSize={apiPageSize}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
      />
    </div>
  </div>
);

export default NoShowCardGrid;
