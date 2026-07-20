import { Button } from "@heroui/react";
import React from "react";
import { FiUpload } from "react-icons/fi";
import { LuPill } from "react-icons/lu";
import {
  buildDosePattern,
  buildDurationBadgeLabel,
  buildFrequency,
  buildInstructionLine,
  calcTotalDoses,
} from "../helpers/doseHelpers";
import { formatStrength } from "../helpers/medicineMappers";
import type { SelectedMed } from "../types";

const PrescriptionCompletedList: React.FC<{
  selectedMeds: SelectedMed[];
  hasManualPrescription: boolean;
  onViewManualPrescription?: () => void;
  onReuploadManualPrescription?: () => void;
}> = ({
  selectedMeds,
  hasManualPrescription,
  onViewManualPrescription,
  onReuploadManualPrescription,
}) => {
    if (selectedMeds.length === 0) {
      return hasManualPrescription ? (
        <div className="mx-4 mb-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-[#273244] dark:bg-[#111726]">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              radius="sm"
              className="h-9 rounded-lg bg-primary text-white px-5 text-[13px] font-semibold"
              onPress={onViewManualPrescription}
            >
              View Prescription
            </Button>
            <Button
              radius="sm"
              variant="bordered"
              className="h-9 rounded-lg border-slate-200 text-slate-700 px-5 text-[13px] font-semibold dark:border-[#38445a] dark:text-white"
              startContent={<FiUpload className="h-3.5 w-3.5" />}
              onPress={onReuploadManualPrescription}
            >
              Reupload
            </Button>
          </div>
        </div>
      ) : (
        <div className="mx-4 mb-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-[#273244] dark:bg-[#0b1321]/30">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            No prescription available
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Appointment is completed but medicines are not loaded.
          </div>
        </div>
      );
    }

    return (
      <div className="mx-4 mb-4 rounded-xl border border-slate-200 bg-white dark:border-[#273244] dark:bg-[#111726] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-[#273244]">
          <LuPill className="h-4 w-4 text-primary dark:text-[#9be7dc]" />
          <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">Prescribed Medicines</h3>
          <span className="ml-auto rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary dark:bg-[#1a3a35] dark:text-[#9be7dc]">
            {selectedMeds.length} medicine{selectedMeds.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-[#273244] dark:bg-[#0b1321]/50">
                <th className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">#</th>
                <th className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Medicine</th>
                <th className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dosage</th>
                <th className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Duration</th>
                <th className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Timing</th>
                <th className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Qty</th>
                <th className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
              {selectedMeds.map((m, idx) => {
                const d = m.details;
                const medName = (d?.medicineName || m?.name || "").trim() || "Medicine";
                const displayForm = String(d?.form ?? (m as any)?.form ?? (m as any)?.medicine?.form ?? "").trim();
                const strengthText = formatStrength(d?.strength ?? (m as any)?.strength);
                const strengthNumber = strengthText.match(/\d+(?:\.\d+)?/)?.[0] ?? "";
                const showStrength =
                  strengthText &&
                    !medName.toLowerCase().includes(strengthText.toLowerCase()) &&
                    (!strengthNumber || !medName.toLowerCase().includes(strengthNumber))
                    ? strengthText
                    : "";

                const doses = Math.max(0, calcTotalDoses(m.dose));
                const doseBadge = doses > 0 ? `${doses}` : "—";
                const freqText = `${buildDosePattern(m.dose)} (${buildFrequency(m.dose)})`;
                const durationText = buildDurationBadgeLabel(m.dose);
                const foodText = (d?.notes || "").trim();
                const instruction = buildInstructionLine(m.dose);

                return (
                  <tr key={`${m.id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-[#151e31]">
                    <td className="px-4 py-2.5 text-[12px] text-slate-400 dark:text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {medName}{showStrength ? ` ${showStrength}` : ""}
                      </div>
                      {displayForm && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{displayForm}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{freqText}</td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{durationText}</td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{foodText || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                        {doseBadge}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px] truncate text-[12px] text-primary dark:text-[#9be7dc]" title={instruction}>
                      {instruction}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

export default PrescriptionCompletedList;
