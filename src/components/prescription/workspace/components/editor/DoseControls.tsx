import React from "react";
import type { DoseFrequency } from "../../types";

/** Daily / Weekly / Custom frequency switch. */
export const Segmented: React.FC<{
  value: DoseFrequency;
  disabled?: boolean;
  onChange: (v: DoseFrequency) => void;
}> = ({ value, disabled, onChange }) => {
  const item = (key: DoseFrequency, label: string) => {
    const active = value === key;
    return (
      <button
        key={key}
        type="button"
        role="radio"
        aria-checked={active}
        disabled={disabled}
        onClick={() => onChange(key)}
        className={[
          "rounded-full px-4 py-1.5 text-sm transition",
          disabled ? "cursor-not-allowed opacity-60" : "",
          active
            ? "bg-surface text-text shadow-sm"
            : "text-text-muted hover:text-text",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      role="radiogroup"
      aria-label="Dose frequency"
      className="inline-flex items-center gap-1 rounded-full bg-surface-muted p-1"
    >
      {item("daily", "Daily")}
      {item("weekly", "Weekly")}
      {item("every_n_days", "Custom")}
    </div>
  );
};

const pillBase =
  "group relative inline-flex w-full min-w-0 items-center justify-center overflow-hidden rounded-full border font-semibold transition-all duration-300 cursor-pointer";

const pillTone = (active?: boolean) =>
  active
    ? "border-primary bg-primary text-white shadow-sm"
    : "border-line bg-surface text-text hover:border-primary/40 hover:bg-primary/5 hover:text-primary";

/** A morning/noon/night dose toggle. */
export const ScheduleDoseButton: React.FC<{
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
}> = ({ active, disabled, onClick, label, icon }) => (
  <button
    type="button"
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    className={[
      pillBase,
      "h-9 gap-0 px-1 text-[11px] leading-none 2xl:gap-1.5 2xl:px-2.5 2xl:text-[13px]",
      disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5",
      pillTone(active),
    ].join(" ")}
    title={label}
  >
    <span
      className={[
        "relative z-10 hidden h-5 w-5 place-items-center rounded-full transition-all duration-300 2xl:grid",
        active
          ? "bg-white/20 text-white group-hover:rotate-12 group-hover:scale-110"
          : "bg-primary/10 text-primary group-hover:rotate-12 group-hover:scale-110",
      ].join(" ")}
    >
      {icon}
    </span>

    <span className="relative z-10 block max-w-full truncate whitespace-nowrap leading-none">
      {label}
    </span>
  </button>
);

/** A before/after-food timing option. */
export const TimingOptionButton: React.FC<{
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  label: string;
}> = ({ active, disabled, onClick, label }) => (
  <button
    type="button"
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    className={[
      pillBase,
      "h-8 px-1 text-[10px] min-[390px]:px-1.5 min-[390px]:text-[11px]",
      "sm:h-9 sm:w-auto sm:min-w-[92px] sm:px-2 sm:text-[12px]",
      "lg:min-w-[96px] xl:min-w-[102px]",
      disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5",
      pillTone(active),
    ].join(" ")}
    title={label}
  >
    <span className="relative z-10 block max-w-full truncate whitespace-nowrap leading-none">
      {label}
    </span>
  </button>
);
