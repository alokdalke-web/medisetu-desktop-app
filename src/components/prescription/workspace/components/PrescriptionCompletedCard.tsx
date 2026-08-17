import React from "react";
import { FiCalendar, FiCheckCircle, FiClock, FiCoffee } from "react-icons/fi";
import {
  buildDosePattern,
  buildDurationBadgeLabel,
  buildFrequency,
  buildInstructionLine,
  calcTotalDoses,
} from "../helpers/doseHelpers";
import { formatStrength } from "../helpers/medicineMappers";
import type { SelectedMed } from "../types";

const PrescriptionCompletedCard: React.FC<{ med: SelectedMed }> = ({ med }) => {
  const d = med.details;

  const medName = (d?.medicineName || med?.name || "").trim() || "Medicine";
  const displayForm = String(
    d?.form ?? (med as any)?.form ?? (med as any)?.medicine?.form ?? "",
  ).trim();
  const strengthText = formatStrength(d?.strength ?? (med as any)?.strength);
  const strengthNumber = strengthText.match(/\d+(?:\.\d+)?/)?.[0] ?? "";
  const showStrengthText =
    strengthText &&
      !medName.toLowerCase().includes(strengthText.toLowerCase()) &&
      (!strengthNumber || !medName.toLowerCase().includes(strengthNumber))
      ? strengthText
      : "";

  const doses = Math.max(0, calcTotalDoses(med.dose));
  const badgeText =
    doses > 0 ? `${doses} doses` : buildDurationBadgeLabel(med.dose);

  // const subtitle =
  //   [d?.category, d?.form]
  //     .map((x) => (x || "").trim())
  //     .filter(Boolean)
  //     .join(" / ") || "Medicine";

  const freqText = `${buildDosePattern(med.dose)} (${buildFrequency(med.dose)})`;
  const durationText = buildDurationBadgeLabel(med.dose).toLowerCase();
  const foodText = (d?.notes || "").trim();

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-[#273244] dark:bg-[#0b1321]">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2 ">
              <div className="min-w-0 truncate text-md font-semibold text-slate-900 dark:text-white">
                {medName}
                {showStrengthText ? ` ${showStrengthText}` : ""}
              </div>

              {displayForm && (
                <div className="shrink-0 text-sm font-medium text-slate-600 dark:text-slate-400">
                  ({displayForm})
                </div>
              )}
            </div>

            {/* <div className="mt-0.5 text-[12px] text-slate-500 truncate">
              {subtitle}
            </div> */}
          </div>

          <span className="shrink-0 rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            {badgeText}
          </span>
        </div>

        <div className="mt-3 grid gap-2 text-[12px] text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <FiClock className="text-slate-400" />
            <span className="truncate">{freqText}</span>
          </div>
          <div className="flex items-center gap-2">
            <FiCalendar className="text-slate-400" />
            <span className="truncate">{durationText}</span>
          </div>
          <div className="flex items-center gap-2">
            {foodText && foodText !== "-" ? (
              <>
                <FiCoffee className="text-slate-400" />
                <span className="truncate">{foodText}</span>
              </>
            ) : (
              <span className="opacity-0">placeholder</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-primary px-4 py-3 text-[12px] text-white">
        <FiCheckCircle />
        <span className="truncate">{buildInstructionLine(med.dose)}</span>
      </div>
    </div>
  );
};

export default PrescriptionCompletedCard;
