import type { BadgeTone } from "./trackingUtils";

export function TrackingStatusBadge({
  label,
  tone = "teal",
}: {
  label: string;
  tone?: BadgeTone;
}) {
  const classes: Record<BadgeTone, string> = {
    teal: "border-primary/15 bg-primary/10 text-primary",
    orange: "border-amber-100 bg-amber-50 text-amber-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    red: "border-red-100 bg-red-50 text-red-700",
    gray: "border-slate-200 bg-slate-50 text-slate-500",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-xs font-semibold leading-none",
        classes[tone],
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
