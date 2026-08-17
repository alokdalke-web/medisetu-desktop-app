import { FaUserPlus } from "react-icons/fa";
import { BsCapsule, BsClipboard2Pulse } from "react-icons/bs";
import { FiClock, FiDollarSign, FiUsers, FiUserX } from "react-icons/fi";
import type { QuickAction, QuickActionsGridProps } from "../../../../types/doctorDash";

const APPROVAL_LOCKED_TITLE = "Available after account approval";
const disabledNavClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

// "Quick Prescription" (/prescription-notepad-scanner) was removed — it overlapped
// with "Prescription Templates" and diluted the grid rather than adding value.
const QUICK_ACTIONS = [
  { icon: <FaUserPlus className="h-[18px] w-[18px] text-[#0a6c74]" />, label: "Add Walk-in\nPatient", path: "/appointment/new" },
  { icon: <BsClipboard2Pulse className="h-[18px] w-[18px] text-[#6366f1]" />, label: "Prescription\nTemplates", path: "/profile/prescription-templates" },
  { icon: <FiUserX className="h-[18px] w-[18px] text-[#e5484d]" />, label: "No\nShow", path: "/no-show" },
  { icon: <FiDollarSign className="h-[18px] w-[18px] text-[#0a6c74]" />, label: "Services &\nPricing", path: "/profile/services" },
  { icon: <FiClock className="h-[18px] w-[18px] text-[#3b82f6]" />, label: "Doctor\nAvailability", path: "/profile/availability" },
  { icon: <BsCapsule className="h-[18px] w-[18px] text-[#27b77a]" />, label: "Medicines", path: "/profile/medicines" },
  { icon: <FiUsers className="h-[18px] w-[18px] text-[#7c3aed]" />, label: "All\nPatients", path: "/patients" },
] satisfies QuickAction[];

const QuickActionsGrid = ({ navigate, isNavigationDisabled = false }: QuickActionsGridProps) => {
  const lockedTitle = isNavigationDisabled ? APPROVAL_LOCKED_TITLE : undefined;

  return (
    <div className="rounded-[16px] border border-line bg-surface p-4">
      <h3 className="mb-3 text-[15px] font-semibold text-text">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={isNavigationDisabled}
            title={lockedTitle}
            onClick={() => navigate(action.path)}
            className={`flex min-h-[76px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-line bg-surface py-2 px-2 transition hover:border-primary/25 hover:shadow-[0_8px_20px_rgba(15,23,42,0.07)] dark:hover:border-[#46beae]/30 ${disabledNavClass}`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f7fb] dark:bg-[#172033]">
              {action.icon}
            </div>
            <span className="text-center text-[11px] font-medium leading-tight text-text-muted whitespace-pre-line">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsGrid;
