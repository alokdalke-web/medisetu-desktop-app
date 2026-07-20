import { motion } from "framer-motion";
import {
  FiActivity,
  FiAlertCircle,
  FiClipboard,
  FiCreditCard,
  FiDroplet,
  FiFileText,
  FiRefreshCw,
  FiShield,
  FiTruck,
} from "react-icons/fi";

import { formatTimestamp } from "./trackingUtils";

function getEventVisuals(title: string) {
  const t = title.toLowerCase();

  if (t.includes("payment") || t.includes("paid")) {
    return {
      icon: <FiCreditCard className="text-emerald-500" />,
      colorClass:
        "bg-emerald-50 text-emerald-500 border-emerald-100/80 shadow-xs shadow-emerald-50",
    };
  }
  if (t.includes("testing") || t.includes("test in progress")) {
    return {
      icon: <FiActivity className="text-violet-500" />,
      colorClass:
        "bg-violet-50 text-violet-500 border-violet-100/80 shadow-xs shadow-violet-50",
    };
  }
  if (t.includes("collected") || t.includes("collection")) {
    return {
      icon: <FiDroplet className="text-sky-500" />,
      colorClass:
        "bg-sky-50 text-sky-500 border-sky-100/80 shadow-xs shadow-sky-50",
    };
  }
  if (t.includes("received")) {
    return {
      icon: <FiTruck className="text-indigo-500" />,
      colorClass:
        "bg-indigo-50 text-indigo-500 border-indigo-100/80 shadow-xs shadow-indigo-50",
    };
  }
  if (t.includes("processing") || t.includes("started")) {
    return {
      icon: <FiRefreshCw className="text-blue-500" />,
      colorClass:
        "bg-blue-50 text-blue-500 border-blue-100/80 shadow-xs shadow-blue-50",
    };
  }
  if (
    t.includes("quality") ||
    t.includes("verification") ||
    t.includes("check")
  ) {
    return {
      icon: <FiShield className="text-purple-500" />,
      colorClass:
        "bg-purple-50 text-purple-500 border-purple-100/80 shadow-xs shadow-purple-50",
    };
  }
  if (t.includes("report") || t.includes("pdf") || t.includes("ready")) {
    return {
      icon: <FiFileText className="text-teal-500" />,
      colorClass:
        "bg-teal-50 text-teal-500 border-teal-100/80 shadow-xs shadow-teal-50",
    };
  }
  if (t.includes("hold")) {
    return {
      icon: <FiAlertCircle className="text-rose-500" />,
      colorClass:
        "bg-rose-50 text-rose-500 border-rose-100/80 shadow-xs shadow-rose-50",
    };
  }

  return {
    icon: <FiClipboard className="text-slate-500" />,
    colorClass:
      "bg-slate-50 text-slate-500 border-slate-100/80 shadow-xs shadow-slate-50",
  };
}

function getUserInitials(name: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getUserColorClass(name: string | null): string {
  if (!name) return "bg-slate-100 text-slate-700 border-slate-200";
  const colors = [
    "bg-blue-50 text-blue-700 border-blue-100",
    "bg-emerald-50 text-emerald-700 border-emerald-100",
    "bg-indigo-50 text-indigo-700 border-indigo-100",
    "bg-purple-50 text-purple-700 border-purple-100",
    "bg-amber-50 text-amber-700 border-amber-100",
    "bg-pink-50 text-pink-700 border-pink-100",
    "bg-sky-50 text-sky-700 border-sky-100",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function EventsCard({
  events,
}: {
  events: Array<{
    id: string;
    title: string;
    description: string | null;
    createdAt: string;
    actorUserName?: string | null;
  }>;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 }}
      className="flex h-full min-h-[520px] flex-col rounded-[8px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] xl:min-h-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
            <FiActivity className="text-base" />
          </div>

          <div>
            <h2 className="text-base font-black text-slate-950">
              Activity Tracker
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              Latest workflow progress
            </p>
          </div>
        </div>

        <span className="rounded-full bg-slate-50 border border-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
          {events.length} Logs
        </span>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1.5 [scrollbar-color:#0a6c74_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-slate-100 [&::-webkit-scrollbar-thumb]:bg-primary/70 hover:[&::-webkit-scrollbar-thumb]:bg-primary">
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No tracking events yet
          </div>
        ) : (
          <div className="relative space-y-0 pl-1">
            <div className="absolute bottom-6 left-[18px] top-6 w-0.5 bg-slate-100" />

            {events.map((event) => {
              const visuals = getEventVisuals(event.title);

              return (
                <div
                  key={event.id}
                  className="group relative flex gap-4 pb-4 last:pb-0"
                >
                  <div
                    className={[
                      "relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-2xl border text-sm shadow-xs transition-all duration-300 group-hover:scale-105",
                      visuals.colorClass,
                    ].join(" ")}
                  >
                    {visuals.icon}
                  </div>

                  <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.035)] transition-all duration-200 hover:border-slate-200 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-slate-900 transition-colors duration-150 group-hover:text-primary">
                          {event.title}
                        </p>

                        {event.actorUserName && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className={[
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-black border",
                                getUserColorClass(event.actorUserName),
                              ].join(" ")}
                            >
                              {getUserInitials(event.actorUserName)}
                            </span>
                            <p className="text-[10px] font-semibold text-slate-500">
                              by{" "}
                              <span className="font-bold text-slate-700">
                                {event.actorUserName}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>

                      <span className="mt-0.5 shrink-0 text-[9px] font-semibold text-slate-400">
                        {formatTimestamp(event.createdAt)}
                      </span>
                    </div>

                    {event.description && (
                      <p className="mt-2 border-t border-slate-100/70 pt-1.5 text-[10.5px] leading-4 text-slate-500">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.section>
  );
}
