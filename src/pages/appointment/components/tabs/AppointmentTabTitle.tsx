import React from "react";
import type { AppointmentTabTitleProps } from "../../../../types/appointment";

/**
 * A single tab label in the appointment section strip.
 *
 * Each of the five tabs used to inline its own title markup, which is how they
 * drifted: the icons kept a hardcoded `text-teal-600 dark:text-[#46beae]` while
 * the label slot had moved to the `primary` token, one icon carried a stray
 * `text-[13px]` the others didn't, and two tabs declared a "short" label
 * identical to the full one. Building every title from here keeps the selected
 * colour, sizing and responsive behaviour in one place.
 *
 * `--color-primary` is not remapped under `.dark` (it stays #0a6c74), so the
 * dark pair below is load-bearing rather than a redundant override —
 * `primary-hover` is the light-on-dark teal from the same token set.
 */
const AppointmentTabTitle: React.FC<AppointmentTabTitleProps> = ({
  icon,
  label,
  shortLabel,
}) => (
  <div className="flex items-center gap-2">
    <span className="text-text-muted transition-colors group-data-[selected=true]:text-primary group-data-[selected=true]:dark:text-primary-hover">
      {icon}
    </span>

    {shortLabel && shortLabel !== label ? (
      <>
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </>
    ) : (
      <span>{label}</span>
    )}
  </div>
);

export default AppointmentTabTitle;
