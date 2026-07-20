import type { UIStatus } from "./labTypes";

const StatusPill = ({ status }: { status: UIStatus }) => {
  const isActive = status === "Active";
  return (
    <span
      className={[
        "inline-flex items-center gap-2  rounded-full px-3 py-1 text-xs border",
        isActive
          ? "bg-primary/10 text-primary border-primary/30 "
          : "bg-rose-50 text-rose-700 border-rose-200",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          isActive ? "bg-primary/100" : "bg-rose-500",
        ].join(" ")}
      />
      {status}
    </span>
  );
};

export default StatusPill;
