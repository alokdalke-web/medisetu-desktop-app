import { motion } from "framer-motion";
import { FiClock } from "react-icons/fi";

import type { TrackingStep } from "../../../../redux/api/labAssistantApi";
import { formatTimestamp, humanize } from "./trackingUtils";
import { TrackingStatusBadge } from "./TrackingStatusBadge";

export function SampleTimeline({
  steps,
  expectedReportReadyAt,
}: {
  steps: TrackingStep[];
  expectedReportReadyAt?: string | null;
}) {
  const completedCount = steps.filter(
    (step) => step.status === "COMPLETED",
  ).length;
  const currentPendingIndex = steps.findIndex(
    (step) => step.status === "PENDING",
  );

  const progressPercent =
    steps.length <= 1
      ? completedCount > 0
        ? 100
        : 0
      : Math.round(((completedCount - 1) / (steps.length - 1)) * 100);

  const safeProgressPercent = Math.max(0, Math.min(progressPercent, 100));

  return (
    <motion.section
      id="timeline"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14 }}
      className="rounded-[8px] border border-slate-200/80 bg-white px-3 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.045)]"
    >
      <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
        <div
          className="relative min-w-[760px] px-1 pb-1 pt-6"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${steps.length}, minmax(104px, 1fr))`,
          }}
        >
          <div className="absolute left-[48px] right-[48px] top-[46px] h-0.5 rounded-full bg-slate-200" />

          <div
            className="absolute left-[48px] top-[46px] h-0.5 rounded-full bg-primary transition-all duration-500"
            style={{
              width: `calc((100% - 96px) * ${safeProgressPercent / 100})`,
            }}
          />

          {steps.map((step, index) => {
            const completed = step.status === "COMPLETED";
            const locked = step.status === "LOCKED";
            const current =
              step.status === "PENDING" && index === currentPendingIndex;
            const statusLabel = completed
              ? "Completed"
              : current
                ? "Current"
                : locked
                  ? "Locked"
                  : humanize(step.status);

            return (
              <motion.div
                key={`${step.key}-${index}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ y: -1 }}
                className="group relative z-10 flex cursor-default flex-col items-center text-center"
              >
                <div className="relative">
                  {current && (
                    <span className="absolute -inset-1.5 rounded-full bg-primary/10 " />
                  )}

                  {((completed && step.timestamp) || (current && expectedReportReadyAt)) && (
                    <div className="absolute bottom-full left-1/2 z-20 mb-2 flex -translate-x-1/2 flex-col items-center gap-0.5">
                      {completed && step.timestamp && (
                        <span className="whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[8.5px] font-semibold leading-none text-slate-500">
                          {formatTimestamp(step.timestamp)}
                        </span>
                      )}
                      {current && expectedReportReadyAt && (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-amber-200/60 bg-amber-50 px-1.5 py-0.5 text-[8.5px] font-bold leading-none text-amber-700 shadow-xs">
                          <span>ETA</span>
                          <FiClock className="text-[8.5px]" />
                          <span>{formatTimestamp(expectedReportReadyAt)}</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className={[
                      "relative z-10 grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-black shadow-sm transition-all duration-300",
                      completed
                        ? "border-primary bg-white text-primary shadow-[0_0_0_5px_rgba(10,108,116,0.08)]"
                        : current
                          ? "scale-105 border-primary bg-primary text-white shadow-[0_0_0_6px_rgba(10,108,116,0.1)]"
                          : locked
                            ? "border-slate-200 bg-white text-slate-400"
                            : "border-slate-200 bg-white text-slate-500",
                    ].join(" ")}
                  >
                    {index + 1}
                  </div>
                </div>

                <div className="mt-2 flex w-full min-w-0 flex-col items-center px-0.5">
                  <h3
                    title={step.title}
                    className={[
                      "max-w-full text-center text-[11px] font-black leading-4 transition-colors duration-200",
                      completed
                        ? "text-slate-900 group-hover:text-primary"
                        : current
                          ? "text-primary font-black"
                          : "text-slate-500 group-hover:text-slate-800",
                    ].join(" ")}
                  >
                    {step.title}
                  </h3>

                  <div className="mt-2 flex justify-center opacity-95 transition-opacity duration-200 group-hover:opacity-100">
                    <TrackingStatusBadge
                      label={statusLabel}
                      tone={completed ? "green" : current ? "teal" : "gray"}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
