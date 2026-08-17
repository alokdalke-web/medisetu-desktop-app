import React from "react";
import { Button } from "@heroui/react";
import { FiCalendar, FiXCircle, FiEye } from "react-icons/fi";
import { useNavigate } from "react-router";

type Noti = { id: string; icon: React.ReactNode; title: string; sub?: string };

const notifications: Noti[] = [
  { id: "1", icon: <FiCalendar />, title: "Appointment Confirmed", sub: "10:15 AM" },
  { id: "2", icon: <FiCalendar />, title: "Appointment Booked", sub: "09:00 AM" },
  { id: "3", icon: <FiXCircle />, title: "Appointment Cancelled", sub: "Yesterday" },
  { id: "4", icon: <FiEye />, title: "Report Reviewed", sub: "Aug 18, 2026" },
  { id: "5", icon: <FiXCircle />, title: "Appointment Cancelled", sub: "Yesterday" },
  { id: "6", icon: <FiCalendar />, title: "Appointment Booked", sub: "09:00 AM" },
];

function badgeClasses(title: string) {
  if (title.includes("Confirmed")) return "bg-green-100 text-green-700";
  if (title.includes("Booked")) return "bg-indigo-100 text-indigo-700";
  if (title.includes("Cancelled")) return "bg-rose-100 text-rose-700";
  if (title.includes("Reviewed")) return "bg-violet-100 text-violet-700";
  return "bg-slate-100 text-slate-600";
}

type Props = {
  /** Desktop = sticky right column, Drawer = inside mobile slide-over */
  variant?: "desktop" | "drawer";
  className?: string;
};

const PatientRightSidebar: React.FC<Props> = ({ variant = "desktop", className = "" }) => {
  const navigate = useNavigate();

  // pick an HTML tag for wrapper (avoids JSX typing issues)
  const Tag = variant === "desktop" ? ("aside" as const) : ("div" as const);

  const wrapperClasses =
    variant === "desktop"
      ? "hidden xl:block w-80 shrink-0 sticky top-0 h-screen overflow-y-auto border-l border-border-color bg-white"
      : "h-full w-full overflow-y-auto bg-white";

  return (
    <Tag className={`${wrapperClasses} ${className}`}>
      {/* Header */}
      <div className="px-6 pt-5 pb-3">
        <h3 className="text-lg font-semibold">Notifications</h3>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 space-y-6" role="list" aria-label="Recent notifications">
        {notifications.map((n) => (
          <div key={n.id} role="listitem" className="flex items-start gap-3 py-2.5">
            <div className={`grid h-9 w-9 place-items-center rounded-full ${badgeClasses(n.title)}`} aria-hidden>
              <span className="text-base">{n.icon}</span>
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{n.title}</div>
              {n.sub && <div className="mt-0.5 text-xs text-slate-500">{n.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-4 pt-6">
        <Button
          fullWidth
          variant="bordered"
          radius="full"
          className="border-emerald-600 text-emerald-700"
          onPress={() => navigate("/patient-notification")}
        >
          View All Notifications
        </Button>
      </div>
    </Tag>
  );
};

export default PatientRightSidebar;
