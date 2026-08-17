import { MdOutlineRefresh } from "react-icons/md";
import ArrowUpRight from "../../components/ArrowUpRight";
import StatusBadge from "../../components/StatusBadge";
import PaymentBadge from "./PaymentBadge";
import type { AppointmentsTableProps } from "../../../../types/receptionistDash";
import { fmtTime12, initials } from "../helpers/receptionistDashFormatters";

const disabledNavClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:-translate-y-0";

const AppointmentsTable = ({
  appointments,
  isApprovalPending,
  lockedTitle,
  navigateWhenApproved,
}: AppointmentsTableProps) => (
  <div className="bg-surface border border-line rounded-[16px] overflow-hidden shadow-[0_1px_1px_rgba(0,0,0,0.05)] flex flex-col min-w-0 dark:shadow-none">
    {/* Table Header */}
    <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
      <h3 className="text-[16px] font-semibold text-text">
        Today's Appointments
      </h3>
      <span className="text-[12px] font-medium text-text-muted">
        {appointments.length} total
      </span>
    </div>

    {/* Table */}
    <div className="flex-1 overflow-x-auto max-h-[420px] overflow-y-auto [scrollbar-width:thin]">
      <table className="w-full text-left min-w-[700px]">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr>
            <th className="px-4 py-2 text-[12px] font-semibold text-text-muted uppercase tracking-[0.8px]">
              Patient
            </th>
            <th className="px-4 py-2 text-[12px] font-semibold text-text-muted uppercase tracking-[0.8px]">
              Token / Time
            </th>
            <th className="px-4 py-2 text-[12px] font-semibold text-text-muted uppercase tracking-[0.8px]">
              Doctor
            </th>
            <th className="px-4 py-2 text-[12px] font-semibold text-text-muted uppercase tracking-[0.8px]">
              Type
            </th>
            <th className="px-4 py-2 text-[12px] font-semibold text-text-muted uppercase tracking-[0.8px]">
              Payment
            </th>
            <th className="px-4 py-2 text-[12px] font-semibold text-text-muted uppercase tracking-[0.8px] text-center">
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
              <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-muted">
                No appointments today.
              </td>
            </tr>
          ) : (
            appointments.map((appt) => (
              <tr
                key={appt.id}
                role="button"
                tabIndex={isApprovalPending ? -1 : 0}
                title={lockedTitle}
                aria-label={`View appointment for ${appt.name}`}
                className={
                  isApprovalPending
                    ? "cursor-not-allowed opacity-60 transition"
                    : "cursor-pointer hover:bg-surface-muted transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                }
                onClick={() => navigateWhenApproved(`/appointment/${appt.id}`)}
                onKeyDown={(e) => {
                  if (!isApprovalPending && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    navigateWhenApproved(`/appointment/${appt.id}`);
                  }
                }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {appt.avatar ? (
                      <img
                        src={appt.avatar}
                        alt={appt.name}
                        className="h-8 w-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-surface-muted flex items-center justify-center text-[10px] font-semibold text-text-muted shrink-0">
                        {initials(appt.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-text leading-normal truncate">
                        {appt.name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[14px] font-normal text-text whitespace-nowrap">
                  {appt.tokenNo != null
                    ? `Token #${appt.tokenNo}`
                    : appt.time
                      ? fmtTime12(appt.start)
                      : "—"}
                </td>
                <td className="px-4 py-3 text-[14px] font-normal text-text">
                  {appt.doctorName}
                </td>
                <td className="px-4 py-3 text-[14px] font-normal text-text">
                  {appt.type}
                </td>
                <td className="px-4 py-3">
                  <PaymentBadge
                    payment={appt.payment}
                    paymentMethod={appt.paymentMethod}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={appt.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={isApprovalPending}
                      title={lockedTitle ?? "Mark no-show"}
                      aria-label="Mark no-show"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className={`cursor-pointer h-[29px] w-[29px] rounded-full border-[0.5px] border-[#e5484d] flex items-center justify-center hover:bg-red-50 transition dark:hover:bg-[#332022] ${disabledNavClass}`}
                    >
                      <MdOutlineRefresh className="h-4 w-4 text-[#e5484d]" />
                    </button>
                    <button
                      type="button"
                      disabled={isApprovalPending}
                      title={lockedTitle}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateWhenApproved(`/appointment/${appt.id}`);
                      }}
                      className={`cursor-pointer bg-primary rounded-lg px-2.5 py-1 w-[54px] text-[12px] font-medium text-white tracking-[-0.3px] capitalize hover:bg-[#085a61] transition text-center ${disabledNavClass}`}
                    >
                      view
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    {/* Footer */}
    <div className="border-t border-line px-4 py-3 flex justify-center">
      <button
        type="button"
        disabled={isApprovalPending}
        title={lockedTitle}
        onClick={() => navigateWhenApproved("/appointment")}
        className={`cursor-pointer flex items-center gap-2 text-[14px] font-medium text-primary tracking-[-0.3px] hover:gap-3 hover:opacity-80 transition-all duration-200 dark:text-[#9be7dc] disabled:hover:gap-2 ${disabledNavClass}`}
      >
        View All Appointments{" "}
        <ArrowUpRight className="text-primary dark:text-[#9be7dc]" />
      </button>
    </div>
  </div>
);

export default AppointmentsTable;
