import { FiUsers } from "react-icons/fi";
import type { RecentPatientsProps } from "../../../../types/doctorDash";
import { fmtTime12, initials } from "../helpers/doctorDashFormatters";

const APPROVAL_LOCKED_TITLE = "Available after account approval";
const disabledNavClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

const RecentPatients = ({ appointments, navigate, isNavigationDisabled = false }: RecentPatientsProps) => {
  const recent = appointments.slice(0, 5);
  const lockedTitle = isNavigationDisabled ? APPROVAL_LOCKED_TITLE : undefined;
  return (
    <div className="rounded-[16px] border border-line bg-surface p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[14px] font-semibold text-text">Recent Patients</h4>
        <button
          type="button"
          disabled={isNavigationDisabled}
          title={lockedTitle}
          onClick={() => navigate("/patients")}
          className={`cursor-pointer text-[11px] font-medium text-[#0a6c74] hover:underline dark:text-[#9be7dc] ${disabledNavClass}`}
        >
          View All
        </button>
      </div>
      <div className="space-y-2">
        {recent.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-[#dfe6ea] bg-[#fbfcfd] px-4 text-center dark:border-[#273244] dark:bg-[#0f1728]">
            <FiUsers className="h-7 w-7 text-[#0a6c74] dark:text-[#9be7dc]" />
            <p className="mt-3 text-[12px] text-text-muted">No recent patients.</p>
          </div>
        ) : (
          recent.map((appt) => {
            const demo = [appt.gender, appt.age ? `${appt.age}y` : null].filter(Boolean).join(", ");
            const metaParts = [appt.appointmentType, demo || null, appt.tokenNo != null ? `Token #${appt.tokenNo}` : null].filter(Boolean);
            return (
              <button
                key={appt.id}
                type="button"
                disabled={isNavigationDisabled}
                title={lockedTitle}
                onClick={() => navigate(`/appointment/${appt.id}`)}
                className={`flex w-full cursor-pointer items-start gap-2.5 rounded-xl p-2 text-left transition hover:bg-[#f8f9fb] dark:hover:bg-[#151e31] ${disabledNavClass}`}
              >
                {appt.profileImage ? (
                  <img src={appt.profileImage} alt={appt.patientName} className="h-9 w-9 shrink-0 rounded-full object-cover mt-0.5" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef1ff] text-[11px] font-bold text-[#6366f1] dark:bg-[#1d2440] mt-0.5">{initials(appt.patientName)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-medium text-text truncate">{appt.patientName}</p>
                    {appt.status && (
                      <span className="shrink-0 rounded-full bg-[#f1f5f9] px-1.5 py-0.5 text-[9px] font-semibold text-text-muted dark:bg-[#1a2333]">{appt.status}</span>
                    )}
                  </div>
                  {metaParts.length > 0 && (
                    <p className="text-[11px] text-text-muted truncate">{metaParts.join(" · ")}</p>
                  )}
                  {appt.symptoms && (
                    <p className="text-[11px] text-text-subtle truncate mt-0.5">{appt.symptoms}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] text-text-muted">{fmtTime12(appt.start)}</span>
                  <span className="rounded-full bg-[#e6fbf7] px-3 py-1 text-[11px] font-semibold text-[#0a6c74] dark:bg-[#16352f] dark:text-[#9be7dc]">View</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecentPatients;
