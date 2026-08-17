// src/pages/dashboard/DateFilterTabs.tsx
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export type DateTab = "today" | "yesterday" | "thisWeek" | "thisMonth" | "custom";

type Props = {
  active: DateTab;
  onChange: (tab: DateTab) => void;
  onCustom: () => void;
  customLabel?: string;
  /** Current range. Pass together with onRangeChange to enable the ‹ › steppers. */
  startYmd?: string;
  endYmd?: string;
  onRangeChange?: (startYmd: string, endYmd: string) => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseYMD(ymd: string): Date {
  const [y, m, d] = (ymd || "").split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayDiff(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/** Shift a range by its own length, so one control steps days, weeks or months. */
export function shiftRange(startYmd: string, endYmd: string, dir: -1 | 1) {
  const s = parseYMD(startYmd);
  const e = parseYMD(endYmd);
  const span = dayDiff(s, e) + 1;
  const ns = new Date(s);
  const ne = new Date(e);
  ns.setDate(ns.getDate() + dir * span);
  ne.setDate(ne.getDate() + dir * span);
  return { startYmd: toYMD(ns), endYmd: toYMD(ne) };
}

const DateFilterTabs = ({ active, onChange, onCustom, customLabel, startYmd, endYmd, onRangeChange }: Props) => {
  const tabs: { key: DateTab; label: string }[] = [
    // "Yesterday" is covered by the ‹ stepper on the active pill.
    { key: "today", label: "Today" },
    { key: "thisWeek", label: "This Week" },
    { key: "thisMonth", label: "This Month" },
    { key: "custom", label: "Custom" },
  ];

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const todayDateLabel = fmt(new Date());

  // Stepping is only offered on the "Today" pill — week/month keep their fixed presets.
  const navEnabled = Boolean(startYmd && endYmd && onRangeChange) && active === "today";

  /** Label for the active pill, derived from the live range so stepping is visible. */
  const rangeLabel = (() => {
    if (!navEnabled) return null;
    const s = parseYMD(startYmd!);
    const e = parseYMD(endYmd!);
    if (dayDiff(s, e) !== 0) return `${fmt(s)} – ${fmt(e)}`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offset = dayDiff(today, s);
    if (offset === 0) return `Today, ${fmt(s)}`;
    if (offset === 1) return `Tomorrow, ${fmt(s)}`;
    if (offset === -1) return `Yesterday, ${fmt(s)}`;
    return `${s.toLocaleDateString("en-GB", { weekday: "short" })}, ${fmt(s)}`;
  })();

  const step = (dir: -1 | 1) => {
    if (!navEnabled) return;
    const next = shiftRange(startYmd!, endYmd!, dir);
    onRangeChange!(next.startYmd, next.endYmd);
  };

  const arrowCls =
    "cursor-pointer shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-text-muted " +
    "hover:bg-[#0d5c5e] hover:text-white active:scale-95 transition-all duration-150 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d5c5e]/40";

  return (
    <div className="bg-surface border border-line rounded-xl p-0.5 flex items-center gap-1 sm:gap-2 min-w-max">
      {tabs.map((t) => {
        const isActive = active === t.key;
        let displayLabel =
          t.key === "custom" && isActive && customLabel ? customLabel : t.label;
        if (t.key === "today") {
          displayLabel = `Today, ${todayDateLabel}`;
        }
        // Only the Today pill tracks the live date, so stepping is visible.
        if (isActive && rangeLabel && t.key === "today") {
          displayLabel = rangeLabel;
        }

        const pill = (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              if (t.key === "custom") {
                onCustom();
              } else {
                onChange(t.key);
              }
            }}
            className={` cursor-pointer  px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-[10px] text-[12px] sm:text-[14px] transition whitespace-nowrap flex items-center gap-1.5 ${
              isActive
                ? "bg-[#0d5c5e] text-white font-medium shadow-sm shadow-[#0d5c5e]/25"
                : "text-text-muted font-normal hover:text-text"
            }`}
          >
            {displayLabel}
            {t.key === "custom" && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0"
              >
                <path
                  d="M5.33 1.33V3.33"
                  stroke={isActive ? "white" : "currentColor"}
                  strokeWidth="1"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.67 1.33V3.33"
                  stroke={isActive ? "white" : "currentColor"}
                  strokeWidth="1"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2.33 6.06H13.67"
                  stroke={isActive ? "white" : "currentColor"}
                  strokeWidth="1"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 5.67V11.33C14 13.33 13 14.67 10.67 14.67H5.33C3 14.67 2 13.33 2 11.33V5.67C2 3.67 3 2.33 5.33 2.33H10.67C13 2.33 14 3.67 14 5.67Z"
                  stroke={isActive ? "white" : "currentColor"}
                  strokeWidth="1"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        );

        if (!isActive || !navEnabled) return pill;

        // Steppers flank the active pill.
        return (
          <div key={t.key} className="flex items-center gap-0.5 sm:gap-1">
            <button type="button" onClick={() => step(-1)} aria-label="Previous period" title="Previous" className={arrowCls}>
              <FiChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>
            {pill}
            <button type="button" onClick={() => step(1)} aria-label="Next period" title="Next" className={arrowCls}>
              <FiChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default DateFilterTabs;
