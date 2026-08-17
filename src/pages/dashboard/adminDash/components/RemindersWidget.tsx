import { BsTelephone } from "react-icons/bs";
import { FiCalendar } from "react-icons/fi";
import { LuCalendarCheck } from "react-icons/lu";
import type { RemindersWidgetProps } from "../../../../types/adminDash";
import { fmtTime12, normalizePhoneForDial, toYMD } from "../helpers/adminDashFormatters";
import ArrowUpRight from "../../components/ArrowUpRight";

const RemindersWidget = ({ appointments, navigate }: RemindersWidgetProps) => {
  const handleCall = (phone?: string | null) => {
    const normalizedPhone = normalizePhoneForDial(phone);
    if (!normalizedPhone) return;

    if (typeof window !== "undefined") {
      window.location.href = `tel:${normalizedPhone}`;
    }
  };

  return (
    <div className="bg-surface-muted border border-line rounded-2xl p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-[#dbeafe] flex items-center justify-center dark:bg-[#172b48]">
          <LuCalendarCheck className="h-5 w-5 text-[#2898ff]" />
        </div>
        <span className="text-[16px] font-semibold text-text">
          Upcoming Reminders
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {appointments.slice(0, 2).map((appt) => (
          <div
            key={appt.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/appointment/${appt.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(`/appointment/${appt.id}`);
              }
            }}
            aria-label={`View appointment for ${appt.patientName}`}
            className="bg-surface border border-line rounded-xl p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 hover:shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-surface-muted"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-full bg-[#fff7e6] flex items-center justify-center shrink-0 dark:bg-[#332716]">
                <FiCalendar className="h-4 w-4 text-[#e89b00]" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[13px] font-semibold text-text truncate">
                  {appt.patientName}
                </span>
                <span className="text-[12px] font-medium text-text-muted">
                  {appt.tokenNo ? "Token: " + appt.tokenNo : fmtTime12(appt.start)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCall(appt.patientMobile);
              }}
              aria-label={`Call ${appt.patientName}`}
              className="border border-primary rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[12px] font-medium text-primary hover:bg-primary/5 transition shrink-0 dark:border-[#46beae]/50 dark:text-[#9be7dc] dark:hover:bg-secondarybtn cursor-pointer"
            >
              <BsTelephone className="h-3 w-3" />
              Call
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => navigate(`/appointment?date=${toYMD(new Date())}`)}
        className="cursor-pointer flex items-center gap-2 text-[14px] font-medium text-[#2898ff] tracking-[-0.3px] hover:gap-3 hover:opacity-80 transition-all duration-200 dark:text-[#8fc7ff]"
      >
        View All Reminders
        <ArrowUpRight className="text-[#2898ff] dark:text-[#8fc7ff]" />
      </button>
    </div>
  );
};

export default RemindersWidget;
