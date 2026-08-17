import { MdOutlineRefresh } from "react-icons/md";
import Tooltip from "../../../../components/shared/Tooltip";
import type { PendingAppointmentsTableProps } from "../../../../types/adminDash";
import { fmtTime12, initials } from "../helpers/adminDashFormatters";
import ArrowUpRight from "../../components/ArrowUpRight";
import StatusBadge from "../../components/StatusBadge";

/** Shared status-derived reschedule affordance for both layouts. */
const rescheduleState = (status?: string | null) => {
  const st = (status ?? "").toLowerCase();
  const canReschedule =
    st.includes("pending") || st.includes("upcoming") || st.includes("confirm");
  const rescheduleTooltip = !canReschedule
    ? st.includes("complet")
      ? "Completed appointments cannot be rescheduled"
      : st.includes("cancel")
        ? "Cancelled appointments cannot be rescheduled"
        : st.includes("noshow") || st.includes("no show")
          ? "No-show appointments cannot be rescheduled"
          : "This appointment cannot be rescheduled"
    : "";
  return { canReschedule, rescheduleTooltip };
};

const PendingAppointmentsTable = ({
  appointments,
  navigate,
  onViewAll,
}: PendingAppointmentsTableProps) => (
  <div
    id="tour-admin-todays-appointments"
    className="bg-surface border border-line rounded-[16px] overflow-hidden shadow-sm flex flex-col min-w-0 dark:shadow-none"
  >
    {/* Table Header */}
    <div className="px-4 pt-4 pb-2">
      <h3 className="text-[16px] font-semibold text-text">
        Today's Appointments
      </h3>
    </div>

    {/*
      Narrow widths get a card list instead of a sideways-scrolling table —
      the table below is `min-w-[600px]`, which no phone can show. Same
      anatomy as pages/appointment's AppointmentCardGrid.
    */}
    <div className="flex flex-col gap-3 px-4 pb-2 @2xl:hidden">
      {appointments.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-muted">
          No appointments today.
        </p>
      ) : (
        appointments.slice(0, 4).map((appt) => {
          const { canReschedule, rescheduleTooltip } = rescheduleState(appt.status);
          return (
            <div
              key={appt.id}
              role="button"
              tabIndex={0}
              aria-label={`View appointment for ${appt.patientName}`}
              onClick={() => navigate(`/appointment/${appt.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/appointment/${appt.id}`);
                }
              }}
              className="cursor-pointer rounded-2xl border border-line bg-surface p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:bg-surface-muted"
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                {appt.profileImage ? (
                  <img
                    src={appt.profileImage}
                    alt={appt.patientName}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-text-muted">
                    {initials(appt.patientName)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold leading-5 text-text">
                    {appt.patientName}
                  </p>
                  {appt.patientId && (
                    <p className="truncate text-[12px] font-medium leading-4 text-text-muted">
                      PID: {appt.patientId}
                    </p>
                  )}
                </div>
                <StatusBadge status={appt.status ?? "Pending"} />
              </div>

              {/* Slot / payment strip */}
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-text-muted">Slot</p>
                  <p className="truncate text-[13px] font-semibold text-text">
                    {appt.tokenNo ? `Token: ${appt.tokenNo}` : fmtTime12(appt.start)}
                  </p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-[11px] font-medium text-text-muted">
                    Payment Status
                  </p>
                  <p className="truncate text-[13px] font-semibold text-text">
                    {appt.payment || "—"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-2">
                <Tooltip
                  content={canReschedule ? "Reschedule appointment" : rescheduleTooltip}
                  placement="top"
                >
                  <button
                    type="button"
                    disabled={!canReschedule}
                    aria-label="Reschedule appointment"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/appointment/${appt.id}/reschedule`);
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] transition ${
                      canReschedule
                        ? "cursor-pointer border-[#e5484d] hover:bg-red-50 dark:hover:bg-[#332022]"
                        : "cursor-not-allowed border-line opacity-40"
                    }`}
                  >
                    <MdOutlineRefresh
                      className={`h-4 w-4 ${canReschedule ? "text-[#e5484d]" : "text-text-subtle"}`}
                    />
                  </button>
                </Tooltip>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/appointment/${appt.id}`);
                  }}
                  className="h-10 flex-1 cursor-pointer rounded-lg bg-primary px-3 text-[13px] font-medium capitalize tracking-[-0.3px] text-white transition hover:bg-[#085a61]"
                >
                  View details
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>

    {/* Table */}
    <div className="hidden flex-1 overflow-x-auto @2xl:block">
      <table className="w-full text-left min-w-[600px]">
        <thead>
          <tr>
            <th className="px-4 py-2 text-[12px] font-semibold text-text-muted uppercase tracking-[0.8px]">
              Patient
            </th>
            <th className="px-4 py-2 text-[12px] font-semibold text-text-muted uppercase tracking-[0.8px]">
              Slot
            </th>
            <th className="px-4 py-2 text-[12px] font-semibold text-text-muted uppercase tracking-[0.8px]">
              Payment Status
            </th>
            <th className="px-4 py-2 text-[12px] font-semibold text-text-muted uppercase tracking-[0.8px]">
              Status
            </th>
            <th className="px-4 py-2 text-[12px] font-semibold text-text-muted uppercase tracking-[0.8px] text-center">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {appointments.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-12 text-center text-sm text-text-muted"
              >
                No appointments today.
              </td>
            </tr>
          ) : (
            appointments.slice(0, 4).map((appt) => {
              const { canReschedule, rescheduleTooltip } = rescheduleState(
                appt.status,
              );

              return (
                <tr
                  key={appt.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View appointment for ${appt.patientName}`}
                  className="hover:bg-surface-muted transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                  onClick={() =>
                    navigate(`/appointment/${appt.id}`)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/appointment/${appt.id}`);
                    }
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {appt.profileImage ? (
                        <img
                          src={appt.profileImage}
                          alt={appt.patientName}
                          className="h-8 w-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-surface-muted flex items-center justify-center text-[10px] font-semibold text-text-muted shrink-0">
                          {initials(appt.patientName)}
                        </div>
                      )}
                      <div>
                        <p className="text-[16px] font-semibold text-text leading-normal">
                          {appt.patientName}
                        </p>
                        {appt.patientId && (
                          <p className="text-[11px] font-normal text-text-muted">
                            PID: {appt.patientId}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[14px] font-normal text-text">
                    {appt.tokenNo ? "Token: " + appt.tokenNo : fmtTime12(appt.start)}
                  </td>
                  <td className="px-4 py-3 text-[14px] font-normal text-text">
                    {appt.payment || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={appt.status ?? "Pending"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {canReschedule ? (
                        <Tooltip content="Reschedule appointment" placement="top">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/appointment/${appt.id}/reschedule`);
                            }}
                            className="cursor-pointer h-[29px] w-[29px] rounded-full border-[0.5px] border-[#e5484d] flex items-center justify-center hover:bg-red-50 transition dark:hover:bg-[#332022]"
                          >
                            <MdOutlineRefresh className="h-4 w-4 text-[#e5484d]" />
                          </button>
                        </Tooltip>
                      ) : (
                        <Tooltip content={rescheduleTooltip} placement="top">
                          <button
                            type="button"
                            disabled
                            className="h-[29px] w-[29px] rounded-full border-[0.5px] border-line flex items-center justify-center opacity-40 cursor-not-allowed"
                          >
                            <MdOutlineRefresh className="h-4 w-4 text-text-subtle" />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip content="View appointment details" placement="top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/appointment/${appt.id}`);
                          }}
                          className="cursor-pointer bg-primary rounded-lg px-2.5 py-1 w-[54px] text-[12px] font-medium text-white tracking-[-0.3px] capitalize hover:bg-[#085a61] transition text-center"
                        >
                          view
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>

    {/* Footer */}
    <div className="border-t border-line px-4 py-3 flex justify-center">
      <button
        type="button"
        onClick={onViewAll}
        className="flex items-center gap-2 cursor-pointer text-[14px] font-medium text-primary tracking-[-0.3px] hover:gap-3 hover:opacity-80 transition-all duration-200 dark:text-[#9be7dc]"
      >
        View All Appointments{" "}
        <ArrowUpRight className="text-primary dark:text-[#9be7dc]" />
      </button>
    </div>
  </div>
);

export default PendingAppointmentsTable;
