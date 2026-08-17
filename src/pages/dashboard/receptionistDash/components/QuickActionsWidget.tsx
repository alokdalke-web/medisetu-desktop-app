import { FiCalendar, FiUserPlus, FiUsers } from "react-icons/fi";
import { MdOutlinePayment } from "react-icons/md";
import type { QuickActionsWidgetProps } from "../../../../types/receptionistDash";

const APPROVAL_LOCKED_TITLE = "Available after account approval";
const disabledNavClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:-translate-y-0";

const QuickActionsWidget = ({
  navigate,
  isNavigationDisabled = false,
}: QuickActionsWidgetProps) => {
  const lockedTitle = isNavigationDisabled ? APPROVAL_LOCKED_TITLE : undefined;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[15px] font-semibold text-text">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          disabled={isNavigationDisabled}
          title={lockedTitle}
          onClick={() => navigate("/appointment/new")}
          className={`cursor-pointer bg-surface border border-line rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:hover:bg-surface-muted ${disabledNavClass}`}
        >
          <div className="h-8 w-8 rounded-lg bg-[rgba(39,183,122,0.1)] flex items-center justify-center dark:bg-[#16352f]">
            <FiCalendar className="h-4 w-4 text-[#27b77a]" />
          </div>
          <span className="text-[11px] font-medium text-text text-center leading-tight">
            New Appointment
          </span>
        </button>
        <button
          type="button"
          disabled={isNavigationDisabled}
          title={lockedTitle}
          onClick={() => navigate("/patient/new")}
          className={`cursor-pointer bg-surface border border-line rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:hover:bg-surface-muted ${disabledNavClass}`}
        >
          <div className="h-8 w-8 rounded-lg bg-[rgba(99,102,241,0.1)] flex items-center justify-center dark:bg-[#1d2440]">
            <FiUserPlus className="h-4 w-4 text-[#6366f1]" />
          </div>
          <span className="text-[11px] font-medium text-text text-center leading-tight">
            Add Patient
          </span>
        </button>
        <button
          type="button"
          disabled={isNavigationDisabled}
          title={lockedTitle}
          onClick={() => navigate("/patients")}
          className={`cursor-pointer bg-surface border border-line rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:hover:bg-surface-muted ${disabledNavClass}`}
        >
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center dark:bg-[#172b48]">
            <FiUsers className="h-4 w-4 text-[#2898ff]" />
          </div>
          <span className="text-[11px] font-medium text-text text-center leading-tight">
            Patients
          </span>
        </button>
        <button
          type="button"
          disabled={isNavigationDisabled}
          title={lockedTitle}
          onClick={() => navigate("/payment-history")}
          className={`cursor-pointer bg-surface border border-line rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:hover:bg-surface-muted ${disabledNavClass}`}
        >
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center dark:bg-[#0f2a2b]">
            <MdOutlinePayment className="h-4 w-4 text-primary" />
          </div>
          <span className="text-[11px] font-medium text-text text-center leading-tight">
            Payments
          </span>
        </button>
      </div>
    </div>
  );
};

export default QuickActionsWidget;
