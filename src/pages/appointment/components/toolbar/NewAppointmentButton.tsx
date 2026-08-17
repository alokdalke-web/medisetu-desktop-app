import { Button } from "@heroui/react";
import React from "react";
import { FiPlus } from "react-icons/fi";

const NewAppointmentButton: React.FC<{
  showHint: boolean;
  onPress: () => void;
}> = ({ showHint, onPress }) => (
  <div id="tour-add-appointment-btn" className="relative shrink-0">
    <div
      className={[
        "pointer-events-none absolute bottom-full right-0 z-20 mb-3 hidden lg:block transition-all duration-500",
        showHint ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
      ].join(" ")}
    >
      <div className="hidden whitespace-nowrap rounded-full border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-teal-50 px-4 py-2 text-[12px] font-medium text-slate-800 shadow-[0_8px_24px_rgba(20,184,166,0.18)] ring-1 ring-teal-100 dark:border-[#2fae8e]/70 dark:bg-[#111726] dark:bg-none dark:text-white dark:shadow-[0_14px_32px_rgba(0,0,0,0.45)] dark:ring-[#2fae8e]/20">
        Press{" "}
        <span className="mx-1 inline-flex min-w-[22px] items-center justify-center rounded-md bg-teal-600 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
          A
        </span>{" "}
        for New Appointment
      </div>
    </div>

    <Button
      disableRipple
      onPress={onPress}
      aria-label="New Appointment"
      className="h-10 shrink-0 whitespace-nowrap rounded-xl bg-primary px-3 text-[13px] font-semibold text-white shadow-sm hover:bg-primary-hover sm:px-5"
    >
      <FiPlus className="h-4 w-4 sm:hidden" />
      <span className="hidden sm:inline">+ New Appointment</span>
    </Button>
  </div>
);

export default NewAppointmentButton;
