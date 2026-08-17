import React from "react";
import { createPortal } from "react-dom";
import { FiChevronDown, FiMinus, FiPlus } from "react-icons/fi";
import type { Dose } from "../../types";

const SLOTS = [
  { key: "morning", countKey: "morningCount", label: "Morning" },
  { key: "noon", countKey: "noonCount", label: "Afternoon" },
  { key: "night", countKey: "nightCount", label: "Night" },
] as const;

/** Per-slot count, tolerating older records that only stored the boolean. */
const slotCount = (dose: Dose, slot: (typeof SLOTS)[number]) =>
  Number(dose[slot.countKey] ?? (dose[slot.key] ? 1 : 0)) || 0;

const summarise = (dose: Dose) => {
  const parts = SLOTS.filter((slot) => slotCount(dose, slot) > 0).map((slot) => {
    const count = slotCount(dose, slot);
    return count > 1 ? `${slot.label} ×${count}` : slot.label;
  });

  return parts.length ? parts.join(", ") : "No dose set";
};

const pattern = (dose: Dose) =>
  SLOTS.map((slot) => slotCount(dose, slot)).join("-");

/**
 * Schedule picker: choose which times of day, and how many units at each.
 *
 * Replaces a flat list of pattern strings ("0-2-1"), which forced the doctor to
 * decode a triple and offered no way to express quantity separately from
 * timing. Counts are capped at 2 because the dose pattern is serialised as
 * single digits — going higher would change the payload format.
 *
 * Rendered through a portal: the table scrolls horizontally, and per CSS spec
 * that makes its wrapper a clipping container, which would cut off a popover
 * positioned inside it.
 */
const SchedulePicker: React.FC<{
  dose: Dose;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (next: Dose) => void;
}> = ({ dose, disabled, ariaLabel, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 });
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);

  const place = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const box = trigger.getBoundingClientRect();
    const POPOVER_HEIGHT = 176;
    const flipUp =
      box.bottom + POPOVER_HEIGHT > window.innerHeight && box.top > POPOVER_HEIGHT;

    setCoords({
      top: flipUp ? box.top - POPOVER_HEIGHT - 6 : box.bottom + 6,
      left: box.left,
      width: Math.max(box.width, 208),
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;

    place();

    const onDismiss = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onDismiss);
    document.addEventListener("touchstart", onDismiss);
    document.addEventListener("keydown", onKey);
    // Capture phase: the table and page both scroll, and scroll doesn't bubble.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);

    return () => {
      document.removeEventListener("mousedown", onDismiss);
      document.removeEventListener("touchstart", onDismiss);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  const setCount = (slot: (typeof SLOTS)[number], next: number) => {
    const clamped = Math.max(0, Math.min(2, next));
    const nextDose = {
      ...dose,
      [slot.key]: clamped > 0,
      [slot.countKey]: clamped,
    } as Dose;

    // A medicine with every slot at zero isn't a prescription.
    if (!nextDose.morning && !nextDose.noon && !nextDose.night) return;
    onChange(nextDose);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        // Pattern only. The spelled-out form ("Morning, Afternoon, Night") was
        // forcing this column ~170px wide, which is what pushed the table into
        // a horizontal scroll; it lives in the tooltip and the popover instead.
        title={summarise(dose)}
        className={[
          "flex h-9 w-full items-center justify-between gap-1 rounded-lg border px-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60 lg:w-[92px]",
          open
            ? "border-primary ring-2 ring-primary/15"
            : "border-line hover:border-primary/40",
          "bg-surface",
        ].join(" ")}
      >
        <span className="text-[12px] font-bold text-text">{pattern(dose)}</span>
        <FiChevronDown
          className={[
            "h-3.5 w-3.5 shrink-0 text-text-subtle transition-transform",
            open ? "rotate-180 text-primary" : "",
          ].join(" ")}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={ariaLabel}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
            className="z-[200] rounded-xl border border-line bg-surface p-2 shadow-xl shadow-black/10"
          >
            {SLOTS.map((slot) => {
              const count = slotCount(dose, slot);
              return (
                <div
                  key={slot.key}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition hover:bg-surface-muted"
                >
                  <span
                    className={[
                      "text-[12px] font-semibold",
                      count > 0 ? "text-text" : "text-text-subtle",
                    ].join(" ")}
                  >
                    {slot.label}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCount(slot, count - 1)}
                      disabled={count === 0}
                      aria-label={`Decrease ${slot.label} quantity`}
                      className="grid h-6 w-6 place-items-center rounded-md border border-line text-text-muted transition hover:border-primary/40 hover:text-primary disabled:opacity-40"
                    >
                      <FiMinus className="h-3 w-3" />
                    </button>

                    <span
                      aria-live="polite"
                      className={[
                        "w-6 text-center text-[13px] font-bold",
                        count > 0 ? "text-primary" : "text-text-subtle",
                      ].join(" ")}
                    >
                      {count}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCount(slot, count + 1)}
                      disabled={count >= 2}
                      aria-label={`Increase ${slot.label} quantity`}
                      className="grid h-6 w-6 place-items-center rounded-md border border-line text-text-muted transition hover:border-primary/40 hover:text-primary disabled:opacity-40"
                    >
                      <FiPlus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
};

export default SchedulePicker;
