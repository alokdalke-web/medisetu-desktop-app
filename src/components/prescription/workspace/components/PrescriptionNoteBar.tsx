import React from "react";
import { FiCalendar, FiClipboard } from "react-icons/fi";
import type { PrescriptionNoteBarProps } from "../../../../types/prescription";

/**
 * Closing band of the completed prescription: the doctor's free-text advice on
 * the left, the follow-up commitment on the right.
 *
 * These two are the only parts of the prescription addressed to the patient
 * rather than the pharmacist, which is why they sit together below the medicine
 * table instead of being buried among the clinical fields above it.
 */
const PrescriptionNoteBar: React.FC<PrescriptionNoteBarProps> = ({
  note,
  followUpDate,
  followUpInDays,
}) => {
  const noteText = (note || "").trim();

  const followUpText = (() => {
    if (followUpDate) {
      const d = new Date(followUpDate);
      if (!Number.isNaN(d.getTime()))
        return `Follow up on ${d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`;
      return `Follow up on ${followUpDate}`;
    }
    if (followUpInDays) return `Follow up after ${followUpInDays} days`;
    return "";
  })();

  if (!noteText && !followUpText) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5">
      {noteText && (
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10">
            <FiClipboard className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-text">
              Prescription Note
            </div>
            <p className="mt-0.5 text-[13px] text-text-muted">{noteText}</p>
          </div>
        </div>
      )}

      {followUpText && (
        <div className="flex shrink-0 items-center gap-2 text-[13px] font-semibold text-primary">
          <FiCalendar className="h-4 w-4" />
          {followUpText}
        </div>
      )}
    </div>
  );
};

export default PrescriptionNoteBar;
