import type { ReactNode } from "react";
import { motion } from "framer-motion";

type StatTone = "teal" | "orange" | "purple" | "green" | "blue";

const toneClass: Record<StatTone, string> = {
  teal: "bg-primary/10 text-primary ring-primary/10",
  orange: "bg-orange-50 text-orange-600 ring-orange-100",
  purple: "bg-violet-50 text-violet-600 ring-violet-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
};

export function LabStatCard({
  title,
  value,
  subtitle,
  icon,
  tone = "teal",
  index = 0,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: ReactNode;
  tone?: StatTone;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.05 }}
      whileHover={{ y: -3 }}
      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-lg dark:border-slate-700"
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={[
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1",
            toneClass[tone],
          ].join(" ")}
        >
          {icon}
        </div>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800">
          Live
        </span>
      </div>

      <div className="mt-4">
        <p className="text-[13px] font-medium text-slate-500">{title}</p>
        <div className="mt-1 text-3xl font-bold tracking-normal text-slate-950">
          {value}
        </div>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
    </motion.div>
  );
}
