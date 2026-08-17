import { FaUserPlus } from "react-icons/fa";
import { FiArrowRight, FiCalendar, FiCheckCircle, FiClock, FiFileText, FiPlay } from "react-icons/fi";
import Images from "../../../../constants/images";
import type { StartYourDayCardProps } from "../../../../types/doctorDash";
import { fmtTime12, formatCompact, initials } from "../helpers/doctorDashFormatters";

const APPROVAL_LOCKED_TITLE = "Available after account approval";
const disabledNavClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

const StartYourDayCard = ({
  firstPatient,
  waitingCount,
  totalAppointments,
  completedCount,
  remainingCount,
  onStartConsultation,
  onViewPatient,
  onAddWalkIn,
  isNavigationDisabled = false,
}: StartYourDayCardProps) => {
  const lockedTitle = isNavigationDisabled ? APPROVAL_LOCKED_TITLE : undefined;
  const meta = [
    firstPatient?.gender,
    firstPatient?.age ? `${firstPatient.age} Years` : null,
    firstPatient?.mobile,
  ]
    .filter(Boolean)
    .join(" | ");

  if (firstPatient) {
    return (
      <div className="min-h-[278px] rounded-[16px] border border-[#dfecef] bg-gradient-to-br from-[#f3fffb] via-white to-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:from-[#0d1e1b] dark:via-[#111726] dark:to-[#111726]">
        <h3 className="text-[16px] font-semibold text-text">Start Your Day</h3>
        <p className="mt-0.5 text-[13px] text-text-muted">
          See your first patient and begin consultations.
        </p>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
          <div className="grid gap-5 sm:grid-cols-[125px_minmax(0,1fr)] ">
            <div className="flex min-h-[152px] flex-col items-center justify-center gap-1 rounded-lg border border-[#e1eef0] bg-surface/90 px-4 py-3 text-center shadow-[0_6px_18px_rgba(10,108,116,0.05)] dark:border-[#273244]">
              <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-[#0a6c74] dark:text-[#9be7dc]">
                First Patient
              </span>
              <span className="mt-1 text-[10px] text-text-muted">Token</span>
              <span className="my-1 text-[38px] font-bold leading-none text-[#0a8a87] dark:text-[#9be7dc]">
                {firstPatient.tokenNo != null ? String(firstPatient.tokenNo).padStart(2, "0") : "01"}
              </span>
              <span className="mt-2 whitespace-nowrap text-[10px] text-text-muted">
                Scheduled Time
              </span>
              <span className="text-[12px] font-semibold text-text">
                {fmtTime12(firstPatient.start)}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-5">
              {firstPatient.profileImage ? (
                <img
                  src={firstPatient.profileImage}
                  alt={firstPatient.patientName}
                  className="h-24 w-24 shrink-0 rounded-full border-[10px] border-[#dff5ee] object-cover dark:border-[#16352f]"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[10px] border-[#dff5ee] bg-[#eef1ff] text-[26px] font-semibold text-[#6366f1] dark:border-[#16352f] dark:bg-[#1d2440]">
                  {initials(firstPatient.patientName)}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-[20px] font-bold text-text">
                  {firstPatient.patientName}
                </p>
                {meta && (
                  <p className="mt-1 truncate text-[12px] font-medium text-text-muted">
                    {meta}
                  </p>
                )}

                <div className="mt-4 space-y-3">
                  {firstPatient.symptoms && (
                    <div>
                      <p className="text-[11px] font-semibold text-text-muted">
                        Symptoms
                      </p>
                      <p className="mt-1 max-w-[260px] truncate text-[13px] font-bold text-text">
                        {firstPatient.symptoms}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold text-text-muted">
                      Appointment Type
                    </p>
                    <p className="mt-1 max-w-[260px] truncate text-[13px] font-bold text-text">
                      {firstPatient.appointmentType || "General Consultation"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#e1eef0] bg-surface/90 p-4  shadow-[0_6px_18px_rgba(10,108,116,0.04)] dark:border-[#273244]">
            <h4 className="text-[14px] font-semibold text-text">Queue Summary</h4>
            <div className="mt-4 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12px] font-semibold text-[#f59e0b] whitespace-nowrap">
                  <FaUserPlus className="h-3.5 w-3.5" /> Waiting Now
                </span>
                <span className="text-[14px] font-bold text-text">{waitingCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12px] font-semibold text-[#3b82f6] whitespace-nowrap">
                  <FiCalendar className="h-3.5 w-3.5" /> Today's Appointments
                </span>
                <span className="text-[14px] font-bold text-text">{totalAppointments}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12px] font-semibold text-[#27b77a] whitespace-nowrap">
                  <FiCheckCircle className="h-3.5 w-3.5" /> Completed
                </span>
                <span className="text-[14px] font-bold text-text">{completedCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12px] font-semibold text-text-muted whitespace-nowrap">
                  <FiClock className="h-3.5 w-3.5" /> Remaining
                </span>
                <span className="text-[14px] font-bold text-text">{remainingCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,216px)_minmax(0,210px)]">
          <button
            type="button"
            disabled={isNavigationDisabled}
            title={lockedTitle}
            onClick={onStartConsultation}
            className={`flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[#07838a] px-5 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(10,108,116,0.18)] transition hover:bg-[#056d74] ${disabledNavClass}`}
          >
            <FiPlay className="h-4 w-4" /> Start Consultation <FiArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isNavigationDisabled}
            title={lockedTitle}
            onClick={onViewPatient}
            className={`flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[6px] border border-[#dfe6ea] bg-surface px-5 text-[13px] font-semibold text-text transition hover:bg-[#f8f9fb] dark:border-[#273244] dark:hover:bg-[#151e31] ${disabledNavClass}`}
          >
            <FiFileText className="h-4 w-4" /> View Patient Details
          </button>
        </div>

        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#e6fbf7] px-3 py-2 text-[11px] font-semibold text-[#0a6c74] dark:bg-[#16352f] dark:text-[#9be7dc]">
          <FiCheckCircle className="h-3.5 w-3.5" />
          Once you finish, the next patient will load automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[278px] items-center overflow-hidden rounded-[8px] border border-[#dcefeb] bg-[#fbfffd] px-5 py-6 shadow-[0_8px_24px_rgba(15,23,42,0.03)] dark:border-[#273244] dark:bg-[#111726] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_32%,rgba(227,247,243,0.95),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(247,255,252,0.95),transparent_28%)] dark:opacity-20" />

      <div className="relative z-10 grid w-full items-center gap-5 md:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]">
        <div className="relative mx-auto flex h-[205px] w-full max-w-[250px] items-center justify-center overflow-hidden md:mx-0">
          <img
            src={Images.doctorDashboard}
            alt="Doctor ready for consultations"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-col items-center text-center md:mx-0 md:items-start md:text-left">
          <h3 className="text-[21px] font-bold leading-tight text-[#0a6c74] dark:text-[#9be7dc] sm:text-[22px]">
            Welcome! You're all set.
          </h3>
          <p className="mt-3 text-[13px] font-semibold leading-6 text-text-muted">
            You have {formatCompact(totalAppointments)} appointments scheduled
            <br />
            Start your first consultation to begin.
          </p>
          <button
            type="button"
            disabled={isNavigationDisabled}
            title={lockedTitle}
            onClick={onStartConsultation}
            className={`mt-7 flex h-10 w-full max-w-[265px] cursor-pointer items-center justify-center gap-3 rounded-[6px] bg-[#07838a] px-5 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(10,108,116,0.18)] transition hover:bg-[#056d74] ${disabledNavClass}`}
          >
            <FiPlay className="h-4 w-4" /> Start First Consultation
          </button>
          <button
            type="button"
            disabled={isNavigationDisabled}
            title={lockedTitle}
            onClick={onAddWalkIn}
            className={`mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-[6px] px-4 py-2 text-[13px] font-bold text-[#0a8a87] transition hover:bg-[#e6fbf7] dark:text-[#9be7dc] dark:hover:bg-[#16352f] ${disabledNavClass}`}
          >
            <FaUserPlus className="h-4 w-4" /> Add Walk-in Patient
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartYourDayCard;
