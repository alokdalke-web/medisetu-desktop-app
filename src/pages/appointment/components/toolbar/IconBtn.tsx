import React from "react";

/** Square icon-only button (view toggles, etc). 40px touch target base,
 * see UI_CONVENTIONS.md §9 for the size scale this follows. */
const IconBtn: React.FC<{
  active?: boolean;
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
}> = ({ active, onClick, label, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-pressed={active}
    title={label}
    className={[
      "grid h-10 w-10 place-items-center rounded-lg border text-[17px] shadow-sm transition",
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-line bg-surface text-text-muted hover:bg-surface-muted",
    ].join(" ")}
  >
    {children}
  </button>
);

export default IconBtn;
