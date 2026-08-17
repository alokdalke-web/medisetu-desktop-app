import React from "react";
import { FiCalendar, FiPlus } from "react-icons/fi";
import Images from "../../../../constants/images";
import type { TodaysAppointmentsListProps } from "../../../../types/doctorDash";
import { fmtTime12 } from "../helpers/doctorDashFormatters";

const APPROVAL_LOCKED_TITLE = "Available after account approval";
const disabledNavClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

const getStatusLabel = (_status: string | null | undefined, idx: number) => {
  const status = String(_status ?? "").toLowerCase();
  if (status.includes("complete")) {
    return { label: "Done", color: "text-[#27b77a] bg-[#dcfce7] dark:text-[#9be7dc] dark:bg-[#16352f]" };
  }
  if (status.includes("cancel") || status.includes("no")) {
    return { label: "No Show", color: "text-[#e5484d] bg-[#fee2e2] dark:text-[#ffb4b4] dark:bg-[#2a1717]" };
  }
  if (idx === 0) return { label: "Now", color: "text-[#0a6c74] bg-[#dff8f1] dark:text-[#9be7dc] dark:bg-[#16352f]" };
  if (idx === 1) return { label: "Next", color: "text-[#3b82f6] bg-[#eef1ff] dark:text-[#93bbfc] dark:bg-[#1d2440]" };
  return { label: "Upcoming", color: "text-[#6b5bd6] bg-[#f1edff] dark:text-[#c8b6ff] dark:bg-[#26213f]" };
};

const TodaysAppointmentsList = ({
  appointments,
  onViewCalendar,
  onViewAppointment,
  onAddWalkIn,
  isNavigationDisabled = false,
}: TodaysAppointmentsListProps) => {
  const [showAll, setShowAll] = React.useState(false);
  const displayed = showAll ? appointments : appointments.slice(0, 5);
  const moreCount = Math.max(0, appointments.length - 5);
  const isLightSchedule = appointments.length > 0 && appointments.length <= 3;
  const lockedTitle = isNavigationDisabled ? APPROVAL_LOCKED_TITLE : undefined;

  return (
    <div className="flex h-full min-h-[278px] flex-col rounded-[16px] border border-line bg-surface p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[16px] font-semibold text-text">Today's Appointments</h3>
        <button
          type="button"
          disabled={isNavigationDisabled}
          title={lockedTitle}
          onClick={onViewCalendar}
          className={`cursor-pointer text-[13px] font-medium text-[#0a6c74] hover:underline dark:text-[#9be7dc] ${disabledNavClass}`}
        >
          View Calendar
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="grid min-h-[220px] flex-1 items-center gap-4 rounded-xl border border-dashed border-[#dfe6ea] bg-gradient-to-br from-[#f3fffb] via-white to-[#fbfcfd] px-5 py-5 text-center dark:border-[#273244] dark:from-[#0d1e1b] dark:via-[#0f1728] dark:to-[#111726] sm:grid-cols-[145px_1fr] sm:text-left">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#e7fbf6] dark:bg-[#16352f]">
            <img src={Images.tipsSuccessIllustration} alt="" className="h-24 w-28 object-cover " />
          </div>
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-text">No appointments </p>
            <p className="mt-2 max-w-[360px] text-[13px] leading-5 text-text-muted">
              Your schedule is clear right now. Add a walk-in patient or review the calendar for new bookings.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button
                type="button"
                disabled={isNavigationDisabled}
                title={lockedTitle}
                onClick={onAddWalkIn}
                className={`flex cursor-pointer items-center gap-2 rounded-lg bg-[#0a6c74] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#085a61] ${disabledNavClass}`}
              >
                <FiPlus className="h-4 w-4" /> Add Walk-in
              </button>
              <button
                type="button"
                disabled={isNavigationDisabled}
                title={lockedTitle}
                onClick={onViewCalendar}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border border-[#dfe6ea] bg-surface px-4 py-2 text-[12px] font-semibold text-[#0a6c74] transition hover:bg-[#f8f9fb] dark:border-[#273244] dark:text-[#9be7dc] dark:hover:bg-[#151e31] ${disabledNavClass}`}
              >
                <FiCalendar className="h-4 w-4" /> View Calendar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="-mx-2 overflow-hidden rounded-[10px]">
            {displayed.map((appt, idx) => {
              const statusInfo = getStatusLabel(appt.status, idx);
              const isActiveDot = idx < 2;
              const hasDivider = idx < displayed.length - 1;

              return (
                <button
                  key={appt.id}
                  type="button"
                  disabled={isNavigationDisabled}
                  title={lockedTitle}
                  onClick={() => onViewAppointment(appt.id)}
                  className={`relative grid min-h-[45px] w-full cursor-pointer grid-cols-[34px_76px_minmax(74px,1fr)_auto] items-center gap-2 px-2 text-left transition sm:grid-cols-[36px_82px_minmax(98px,1fr)_minmax(100px,1fr)_auto] sm:gap-3 ${disabledNavClass} ${
                    hasDivider ? "border-b border-[#eef2f6] dark:border-[#273244]" : ""
                  } ${
                    idx === 0
                      ? "bg-gradient-to-r from-[#f0fffa] via-[#fbfffd] to-white dark:from-[#16352f] dark:via-[#111726] dark:to-[#111726]"
                      : "bg-surface hover:bg-[#fbfcfd] dark:hover:bg-[#151e31]"
                  }`}
                >
                  <span className="relative flex h-full w-[26px] items-center justify-center justify-self-start">
                    {idx > 0 && (
                      <span
                        className={`absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 ${
                          idx === 1 ? "bg-[#16a076] dark:bg-[#62d6bd]" : "bg-[#cfd8e6] dark:bg-[#334155]"
                        }`}
                      />
                    )}
                    {idx < displayed.length - 1 && (
                      <span
                        className={`absolute bottom-0 left-1/2 h-1/2 w-px -translate-x-1/2 ${
                          idx === 0 ? "bg-[#16a076] dark:bg-[#62d6bd]" : "bg-[#cfd8e6] dark:bg-[#334155]"
                        }`}
                      />
                    )}
                    <span
                      className={`relative z-10 h-[9px] w-[9px] rounded-full ring-[3px] ring-white dark:ring-[#111726] ${
                        isActiveDot ? "bg-[#16a076] dark:bg-[#62d6bd]" : "bg-[#b8c3d3] dark:bg-[#64748b]"
                      }`}
                    />
                  </span>

                  <span className="whitespace-nowrap text-[12px] font-bold text-text-muted">
                    {fmtTime12(appt.start)}
                  </span>

                  <span className="truncate text-[12px] font-bold text-text">
                    {appt.patientName}
                  </span>

                  <span className="hidden truncate text-[12px] font-semibold text-text-muted sm:block">
                    {appt.symptoms || appt.notes || "Consultation"}
                  </span>

                  <span className={`shrink-0 justify-self-end rounded-lg px-3 py-1 text-[11px] font-bold ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </button>
              );
            })}
          </div>

          {isLightSchedule && (
            <div className="grid min-h-[132px] flex-1 items-center gap-4 rounded-[8px] border border-[#dff1ee] bg-[#f7fffd] px-5 py-5 dark:border-[#273244] dark:bg-[#0f1728] sm:grid-cols-[96px_1fr]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface shadow-[0_12px_24px_rgba(10,108,116,0.1)]">
                <img src={Images.tipsSuccessIllustration} alt="" className="h-24 w-28 object-cover " />
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-[15px] font-bold text-[#0a6c74] dark:text-[#9be7dc]">Light schedule today</p>
                <p className="mt-2 max-w-[430px] text-[12px] leading-5 text-text-muted">
                  {appointments.length === 1 ? "Only 1 appointment is queued." : `Only ${appointments.length} appointments are queued.`} New bookings and walk-ins will appear here.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-3 sm:justify-start">
                  <button
                    type="button"
                    disabled={isNavigationDisabled}
                    title={lockedTitle}
                    onClick={onAddWalkIn}
                    className={`flex cursor-pointer items-center gap-2 rounded-[6px] bg-[#e6fbf7] px-4 py-2 text-[12px] font-semibold text-[#0a6c74] transition hover:bg-[#d8f6ef] dark:bg-[#16352f] dark:text-[#9be7dc] ${disabledNavClass}`}
                  >
                    <FiPlus className="h-4 w-4" /> Add Walk-in
                  </button>
                  <button
                    type="button"
                    disabled={isNavigationDisabled}
                    title={lockedTitle}
                    onClick={onViewCalendar}
                    className={`flex cursor-pointer items-center gap-2 rounded-[6px] px-4 py-2 text-[12px] font-semibold text-text-muted transition hover:bg-surface hover:text-primary dark:hover:bg-[#151e31] dark:hover:text-[#9be7dc] ${disabledNavClass}`}
                  >
                    <FiCalendar className="h-4 w-4" /> Calendar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!showAll && moreCount > 0 && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 text-[13px] font-medium text-text-muted transition hover:text-[#0a6c74] dark:hover:text-[#9be7dc]">
          + {moreCount} more appointments ▾
        </button>
      )}
    </div>
  );
};

export default TodaysAppointmentsList;
