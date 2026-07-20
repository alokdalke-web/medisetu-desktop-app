import { Chip, type ChipProps } from "@heroui/react";
import { FiClock } from "react-icons/fi";

interface StatusChipProps extends ChipProps {
  text?: string;
  status?: string;
  isExpired?: boolean;
}

function norm(s: string) {
  return (s || "").trim().toLowerCase();
}

type Key =
  | "completed"
  | "cancelled"
  | "pending"
  | "confirmed"
  | "noshow"
  | "unknown";

function getKey(s: string): Key {
  const v = norm(s);

  if (["completed", "active", "done", "acknowledged", "picked up"].includes(v))
    return "completed";
  if (["confirmed", "confirm"].includes(v)) return "confirmed";
  if (["noshow", "no show"].includes(v)) return "noshow";
  if (
    ["pending", "new", "waiting", "called", "calling", "calling..."].includes(v)
  )
    return "pending";
  if (
    [
      "cancelled",
      "canceled",
      "inactive",
      "blocked",
      "expired",
      "rejected",
      "declined",
    ].includes(v)
  )
    return "cancelled";

  return "unknown";
}

const STYLE: Record<Key, { text: string; bg: string }> = {
  completed: {
    text: "!text-[var(--color-status-completed)]",
    bg: "!bg-[var(--color-status-completed-bg)]",
  },
  cancelled: {
    text: "!text-[var(--color-status-cancelled)]",
    bg: "!bg-[var(--color-status-cancelled-bg)]",
  },
  pending: {
    text: "!text-[var(--color-status-pending)]",
    bg: "!bg-[var(--color-status-pending-bg)]",
  },
  confirmed: {
    text: "!text-[var(--color-status-confirmed)]",
    bg: "!bg-[var(--color-status-confirmed-bg)]",
  },
  noshow: {
    text: "!text-rose-600",
    bg: "!bg-rose-50",
  },
  unknown: {
    text: "!text-slate-600",
    bg: "!bg-slate-100",
  },
};

export default function StatusChip({
  text,
  status,
  isExpired,
  classNames,
  ...props
}: StatusChipProps) {
  const rawStatus = status || text || "—";
  const key = getKey(rawStatus);
  const colors = STYLE[key];
  const label = text || rawStatus;

  // ✅ IMPORTANT: Pending/Confirmed par expired clock mat dikhao
  const showExpired = Boolean(isExpired) && key !== "pending" && key !== "confirmed";

  return (
    <Chip
      variant="dot"
      {...props}
      classNames={{
        ...classNames,
        base: [
          "h-auto rounded-md border-none px-3 py-1.5",
          "inline-flex items-center gap-1.5",
          colors.text,
          colors.bg,
          showExpired ? "opacity-70" : "",
          classNames?.base,
        ]
          .filter(Boolean)
          .join(" "),
        content: [
          "text-xs font-medium flex items-center gap-1.5",
          classNames?.content,
        ]
          .filter(Boolean)
          .join(" "),
        dot: ["w-1.5 h-1.5 !bg-current", classNames?.dot]
          .filter(Boolean)
          .join(" "),
      }}
    >
      {showExpired && (
        <FiClock className="text-[13px] leading-none" aria-label="Expired" />
      )}
      {label}
    </Chip>
  );
}
