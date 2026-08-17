// src/pages/Notification.tsx
import React from "react";
import {
  FiSearch,
  FiUserPlus,
  FiCalendar,
  FiX,
  FiFileText,
  FiEye,
} from "react-icons/fi";

type Tone = "green" | "blue" | "rose" | "emerald" | "purple";

type Item = {
  id: string;
  title: string;
  time: string;
  message: string;
  tone: Tone; // color theme for the badge
  icon: React.ReactNode;
};

const ITEMS: Item[] = [
  {
    id: "1",
    title: "New Patient Registered",
    time: "10:15 AM",
    message: "John Doe (25, Male) Added To Your Patient List.",
    tone: "green",
    icon: <FiUserPlus />,
  },
  {
    id: "2",
    title: "Appointment Booked",
    time: "09:00 AM",
    message: "Rajeev Kumar Booked An Appointment On July 30, 2026 At 09:30 AM.",
    tone: "blue",
    icon: <FiCalendar />,
  },
  {
    id: "3",
    title: "Appointment Cancelled",
    time: "Yesterday",
    message:
      "Patient Marvin McKinney Cancelled Appointment Scheduled On July 30, 2026.",
    tone: "rose",
    icon: <FiX />,
  },
  {
    id: "4",
    title: "Report Uploaded",
    time: "Aug 20, 2026",
    message: "Lab Report Uploaded For Patient Darrell Steward.",
    tone: "emerald",
    icon: <FiFileText />,
  },
  {
    id: "5",
    title: "Report Reviewed",
    time: "Aug 18, 2026",
    message: "You Reviewed MRI Report Of Ronald Richards.",
    tone: "purple",
    icon: <FiEye />,
  },
];

// two-layer circular badge (soft outer tint + solid inner dot)
const TONES: Record<Tone, { outer: string; inner: string; text: string }> = {
  green: {
    outer: "bg-green-50",
    inner: "bg-green-500",
    text: "text-green-600",
  },
  blue: { outer: "bg-blue-50", inner: "bg-blue-500", text: "text-blue-600" },
  rose: { outer: "bg-rose-50", inner: "bg-rose-500", text: "text-rose-600" },
  emerald: {
    outer: "bg-emerald-50",
    inner: "bg-emerald-500",
    text: "text-emerald-600",
  },
  purple: {
    outer: "bg-purple-50",
    inner: "bg-purple-500",
    text: "text-purple-600",
  },
};

const IconBadge: React.FC<{ tone: Tone; children: React.ReactNode }> = ({
  tone,
  children,
}) => {
  const t = TONES[tone];
  return (
    <div
      className={`h-12 w-12 grid place-items-center rounded-full ${t.outer}`}
    >
      <div
        className={`h-6 w-6 grid place-items-center rounded-full text-white ${t.inner}`}
      >
        <span className="text-[14px]">{children}</span>
      </div>
    </div>
  );
};

const PatientNotification: React.FC = () => {
  const [q, setQ] = React.useState("");

  const data = React.useMemo(() => {
    if (!q.trim()) return ITEMS;
    const s = q.toLowerCase();
    return ITEMS.filter(
      (i) =>
        i.title.toLowerCase().includes(s) ||
        i.message.toLowerCase().includes(s) ||
        i.time.toLowerCase().includes(s)
    );
  }, [q]);

  return (
    <div className="mx-auto w-full">
      {/* page title (top bar title is outside this component in your layout) */}
      <h1 className="mb-4 text-2xl font-semibold">Notifications</h1>

      {/* Search */}
      <div className="mb-6 max-w-xl">
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search here"
            className="h-12 w-full rounded-full border border-gray-300 pl-10 pr-4 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {data.map((n) => (
          <div
            key={n.id}
            className="flex items-start  gap-4 rounded-2xl bg-white p-3 ring-1 ring-black/5 md:p-4"
          >
            {/* Badge */}
            <div className="flex-none">
              <IconBadge tone={n.tone}>{n.icon}</IconBadge>
            </div>

            <div className=" flex w-full  justify-between ">
              {/* Title + time (fixed width on md+, no shrink) */}
              <div className="min-w-0 flex-none basis-48 md:basis-60">
                <div className="truncate text-sm font-semibold">{n.title}</div>
                <div className="text-xs text-gray-500">{n.time}</div>
              </div>

              {/* Right message bubble (fills remaining space) */}
              <div className="min-w-0  text-end">
                <div className="leading-relaxed bg-white px-4 py-3 text-sm text-gray-500 ">
                  {n.message}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* empty state */}
        {data.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
            No notifications found.
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientNotification