import React from "react";
import { FiEdit3, FiLock, FiMonitor } from "react-icons/fi";
import Tooltip from "../../../../components/shared/Tooltip";
import type { PrescriptionTabActionsProps } from "../../../../types/appointment";

const MODES = [
  { value: true, label: "Digital", icon: FiMonitor },
  { value: false, label: "Handwritten", icon: FiEdit3 },
] as const;

/**
 * Prescription controls for the appointment section tab bar.
 *
 * The mode picker is a segmented control rather than a switch because a switch
 * labelled "Digital Prescription" never names its own off-state — a doctor
 * turning it off had no way to know they were choosing *handwritten* until the
 * form changed under them. Both modes are now always visible and named.
 *
 * It is built on two real radio inputs (visually hidden, styled through their
 * labels) so arrow-key navigation, focus handling and screen-reader semantics
 * come from the platform instead of hand-rolled `role="radio"` bookkeeping.
 *
 * Layout note: this is a normal grid cell beside the tab strip, not the
 * absolutely-positioned overlay it replaced — that version needed a guessed
 * reserve gutter on the tab list and was hidden entirely below 1280px, so the
 * control was unreachable on every laptop and phone.
 */
const PrescriptionTabActions: React.FC<PrescriptionTabActionsProps> = ({
  showDigitalToggle,
  isDigitalPrescription,
  isToggleDisabled,
  disabledMessage,
  isToggleBusy,
  onDigitalPrescriptionChange,
}) => {
  const groupName = React.useId();

  if (!showDigitalToggle) return null;

  const isLocked = isToggleDisabled || isToggleBusy;

  /**
   * A tooltip restating what a control already says is noise on every hover.
   * Both modes are named on screen, so the only thing left worth explaining is
   * why the choice is locked.
   */
  const lockReason = isToggleDisabled ? disabledMessage : undefined;

  const modePicker = (
    <div
      role="radiogroup"
      aria-label="Prescription mode"
      className={[
        "inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-muted p-0.5",
        isLocked ? "opacity-70" : "",
      ].join(" ")}
    >
      {isToggleDisabled && (
        <FiLock className="ml-1.5 h-3 w-3 shrink-0 text-text-muted" />
      )}

      {MODES.map(({ value, label, icon: Icon }) => {
        const isActive = isDigitalPrescription === value;

        return (
          <label
            key={label}
            className={[
              "relative flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5",
              "text-[12px] font-semibold transition-colors lg:h-7",
              "focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-primary",
              isLocked ? "cursor-not-allowed" : "",
              isActive
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-text",
            ].join(" ")}
          >
            <input
              type="radio"
              name={groupName}
              className="sr-only"
              checked={isActive}
              disabled={isLocked}
              // Clicking the segment that is already active would otherwise
              // fire a pointless save round-trip against the server.
              onChange={() => {
                if (!isActive) onDigitalPrescriptionChange(value);
              }}
            />
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </label>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col items-stretch gap-1.5 lg:items-end">
      {lockReason ? (
        <Tooltip content={lockReason} placement="bottom" showArrow delay={200}>
          {/* Disabled inputs fire no pointer events of their own, which is
              exactly when the reason matters most. */}
          <span className="inline-flex">{modePicker}</span>
        </Tooltip>
      ) : (
        modePicker
      )}

      {/* Tooltips never open on touch, so on a phone the lock reason would
          otherwise be unreachable — exactly the devices that cannot hover. */}
      {lockReason && (
        <p className="text-[11px] leading-4 text-text-muted lg:hidden">
          {lockReason}
        </p>
      )}
    </div>
  );
};

export default PrescriptionTabActions;
