
// Shared across the role-dashboards — see UI_REMEDIATION_LOG.md #42.
// Alpha-based backgrounds instead of raw light palette steps — those have no
// `.dark` remap in this app, so a solid `bg-[#fef9c3]`-style pill with no
// dark pairing rendered as a jarring bright patch on a dark page. See
// UI_CONVENTIONS.md §2 / UI_REMEDIATION_LOG.md #30.
const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toLowerCase() ?? "";
  let classes = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  let label = "Pending";

  if (s.includes("complet")) {
    classes = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    label = "Completed";
  } else if (s.includes("progress") || s.includes("confirm")) {
    classes = "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    label = "Confirmed";
  } else if (s.includes("noshow") || s.includes("no show") || s.includes("no-show")) {
    classes = "bg-rose-500/10 text-rose-700 dark:text-rose-400";
    label = "No Show";
  } else if (s.includes("cancel")) {
    classes = "bg-red-500/10 text-red-700 dark:text-red-400";
    label = "Cancelled";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${classes}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
