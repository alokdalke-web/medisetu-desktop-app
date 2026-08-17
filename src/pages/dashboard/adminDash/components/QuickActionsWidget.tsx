import { addToast } from "@heroui/react";
import { FiCalendar, FiUserPlus } from "react-icons/fi";
import { LuBrain } from "react-icons/lu";
import { MdOutlinePayment } from "react-icons/md";
import type { QuickActionsWidgetProps } from "../../../../types/adminDash";

const QuickActionsWidget = ({ navigate }: QuickActionsWidgetProps) => (
  <div className="flex flex-col gap-3">
    <h3 className="text-[15px] font-semibold text-text">
      Quick Actions
    </h3>
    {/* Sized off the container it sits in (the dashboard's left column), not
        the viewport — it moved out of the 320px rail into full column width. */}
    <div className="grid grid-cols-2 @2xl:grid-cols-4 gap-3 @2xl:gap-4">
      <button
        type="button"
        onClick={() => navigate("/appointment/new")}
        className="cursor-pointer bg-surface border border-line rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:hover:bg-surface-muted"
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
        onClick={() => navigate("/patient/new")}
        className="cursor-pointer bg-surface border border-line rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:hover:bg-surface-muted"
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
        onClick={() => navigate("/payment-history")}
        className="cursor-pointer bg-surface border border-line rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:hover:bg-surface-muted"
      >
        <div className="h-8 w-8 rounded-lg bg-[rgba(10,108,116,0.1)] flex items-center justify-center dark:bg-[#0f2a2b]">
          <MdOutlinePayment className="h-4 w-4 text-primary" />
        </div>
        <span className="text-[11px] font-medium text-text text-center leading-tight">
          Payment
        </span>
      </button>
      <button
        type="button"
        onClick={() => addToast({ title: "Coming Soon", description: "Prescription feature is coming soon!", color: "primary" })}
        className="cursor-pointer bg-surface border border-line rounded-xl px-2 py-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:hover:bg-surface-muted"
      >
        <div className="h-8 w-8 rounded-lg bg-[rgba(10,108,116,0.1)] flex items-center justify-center dark:bg-[#0f2a2b]">
          <LuBrain className="h-4 w-4 text-primary" />
        </div>
        <span className="text-[11px] font-medium text-text text-center leading-tight">
          Prescription
        </span>
      </button>
    </div>
  </div>
);

export default QuickActionsWidget;
