// src/pages/dashboard/doctorDash/components/PatientInsightsCard.tsx
import React from "react";
import { FiUserPlus, FiUserCheck, FiClock } from "react-icons/fi";
import { TrendBadge } from "./TrendBadge";

function fmtHourLabel(hour: number) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${h12} ${suffix}`;
}

type PeakHourSlot = {
  hour: number;
  count: number;
  completedCount: number;
  noShowCount: number;
  cancelledCount: number;
  upcomingCount: number;
  tokenCount: number;
  tokenRange: { min: number; max: number } | null;
};

type Props = {
  peakHours: PeakHourSlot[];
  newPatients?: number;
  newPatientsTrend?: number;
  returningPatients?: number;
  returningPatientsTrend?: number;
  uniquePatients?: number;
  uniquePatientsTrend?: number;
};

const PatientInsightsCard: React.FC<Props> = ({
  peakHours,
  newPatients,
  newPatientsTrend,
  returningPatients,
  returningPatientsTrend,
  uniquePatients,
  uniquePatientsTrend,
}) => {
  const topHour = peakHours?.[0];
  const [activeHour, setActiveHour] = React.useState<number | null>(null);

  const newCount = newPatients ?? 0;
  const returningCount = returningPatients ?? 0;
  const totalCount = newCount + returningCount;
  const newPct = totalCount > 0 ? Math.round((newCount / totalCount) * 100) : 0;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="text-base font-semibold text-text">Patient Insights</div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[rgba(39,183,122,0.08)] p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[#27b77a]">
            <FiUserPlus className="h-4 w-4" />
            <span className="text-[11px] font-medium text-text-muted">New Patients</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-text">{newCount}</span>
            <TrendBadge percent={newPatientsTrend} />
          </div>
        </div>

        <div className="rounded-xl bg-[rgba(99,102,241,0.08)] p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[#6366f1]">
            <FiUserCheck className="h-4 w-4" />
            <span className="text-[11px] font-medium text-text-muted">Returning</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-text">{returningCount}</span>
            <TrendBadge percent={returningPatientsTrend} />
          </div>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="-mt-2">
          <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden flex">
            <div className="h-full bg-[#27b77a]" style={{ width: `${newPct}%` }} />
            <div className="h-full bg-[#6366f1]" style={{ width: `${100 - newPct}%` }} />
          </div>
          <p className="text-[11px] text-text-subtle mt-1">
            {newPct}% new · {100 - newPct}% returning · vs previous period
          </p>
        </div>
      )}
      {totalCount === 0 && (
        <p className="text-[11px] text-text-subtle -mt-2">vs previous period</p>
      )}

      {typeof uniquePatients === "number" && (
        <div className="rounded-xl bg-surface-muted px-3 py-2 flex items-center justify-between -mt-1">
          <span className="text-[11px] text-text-muted">Unique Patients (this range)</span>
          <span className="flex items-center gap-2">
            <span className="text-sm font-bold text-text">{uniquePatients}</span>
            <TrendBadge percent={uniquePatientsTrend} />
          </span>
        </div>
      )}

      <div className="border-t border-line pt-3">
        <div className="flex items-center gap-1.5 mb-2">
          <FiClock className="h-4 w-4 text-[#3b82f6]" />
          <span className="text-[13px] font-medium text-text">Peak Hours</span>
        </div>
        {!peakHours || peakHours.length === 0 ? (
          <p className="text-xs text-text-muted">Not enough data for this range yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {peakHours.map((slot) => {
              const pct = topHour ? Math.round((slot.count / topHour.count) * 100) : 0;
              const isActive = activeHour === slot.hour;
              return (
                <div
                  key={slot.hour}
                  className="relative flex items-center gap-2 cursor-pointer"
                  onMouseEnter={() => setActiveHour(slot.hour)}
                  onMouseLeave={() => setActiveHour((h) => (h === slot.hour ? null : h))}
                  onClick={() => setActiveHour((h) => (h === slot.hour ? null : slot.hour))}
                >
                  <span className="text-xs text-text-muted w-14 shrink-0">
                    {fmtHourLabel(slot.hour)}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#3b82f6]"
                      style={{ width: `${Math.max(pct, 6)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-text w-6 text-right shrink-0">
                    {slot.count}
                  </span>

                  {isActive && (
                    <div className="absolute left-0 bottom-full mb-2 z-20 w-56 rounded-lg border border-line bg-surface px-3 py-2.5 shadow-lg dark:shadow-none">
                      <p className="text-[11px] font-semibold text-text mb-1.5">
                        {fmtHourLabel(slot.hour)} · {slot.count} appointment{slot.count === 1 ? "" : "s"}
                      </p>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-text-muted">Completed</span>
                          <span className="font-medium text-text">{slot.completedCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-muted">Upcoming / Confirmed</span>
                          <span className="font-medium text-text">{slot.upcomingCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-muted">No-Show</span>
                          <span className="font-medium text-text">{slot.noShowCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-muted">Cancelled</span>
                          <span className="font-medium text-text">{slot.cancelledCount}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-line mt-1">
                          <span className="text-text-muted">Tokens issued</span>
                          <span className="font-medium text-text">
                            {slot.tokenCount}
                            {slot.tokenRange && (
                              <span className="text-text-subtle font-normal">
                                {" "}(#{slot.tokenRange.min}–#{slot.tokenRange.max})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientInsightsCard;
