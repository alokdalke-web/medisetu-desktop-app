import { Button, Tooltip } from "@heroui/react";
import React from "react";
import { FiCalendar, FiCoffee, FiEdit2, FiUpload } from "react-icons/fi";
import { LuPill } from "react-icons/lu";
import type { PrescriptionCompletedListProps } from "../../../../types/prescription";
import {
  buildDosePattern,
  buildDurationBadgeLabel,
  buildDurationDateRange,
  buildFrequency,
  buildInstructionLine,
  calcTotalDoses,
} from "../helpers/doseHelpers";
import { formatStrength } from "../helpers/medicineMappers";
import {
  COMPACT_APPLICATION_FORMS,
  INJECTION_FORM,
} from "./editor/constants";

/**
 * Same form-based split used by `MedicineTable`/`PrescriptionEditorCard`:
 * a schedule pattern ("1-0-1") and food timing only mean something for an
 * oral dose. Showing them for a cream or injection here — reading a real
 * "1-0-1 (Twice a day)" and "After Food" on a Drops row — contradicted the
 * "Not applicable" this exact medicine gets everywhere else in the app.
 */
const isScheduledOralForm = (form: string): boolean => {
  const formKey = form.trim().toLowerCase();
  return formKey !== INJECTION_FORM && !COMPACT_APPLICATION_FORMS.includes(formKey);
};

const HEAD_CELL =
  "px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-text-muted";

const PrescriptionCompletedList: React.FC<PrescriptionCompletedListProps> = ({
  selectedMeds,
  hasManualPrescription,
  onViewManualPrescription,
  onReuploadManualPrescription,
  onEditPrescription,
  isEditDisabled,
  prescribedAt,
}) => {
  if (selectedMeds.length === 0) {
    return hasManualPrescription ? (
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            radius="sm"
            className="h-9 rounded-lg bg-primary px-5 text-[13px] font-semibold text-white"
            onPress={onViewManualPrescription}
          >
            View Prescription
          </Button>
          <Button
            radius="sm"
            variant="bordered"
            className="h-9 rounded-lg border-line px-5 text-[13px] font-semibold text-text"
            startContent={<FiUpload className="h-3.5 w-3.5" />}
            onPress={onReuploadManualPrescription}
          >
            Reupload
          </Button>
        </div>
      </div>
    ) : (
      <div className="rounded-2xl border border-dashed border-line bg-surface-muted p-6 text-center">
        <div className="text-sm font-semibold text-text">
          No prescription available
        </div>
        <div className="mt-1 text-xs text-text-muted">
          Appointment is completed but medicines are not loaded.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <LuPill className="h-4 w-4 text-primary" />
        <h3 className="text-[14px] font-bold text-text">Prescribed Medicines</h3>
        <span className="ml-auto rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
          {selectedMeds.length} medicine{selectedMeds.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Always-visible thin scrollbar: this is a wide data surface, so the
          "there's more to the right" cue should not depend on hover. */}
      <div className="overflow-x-auto [scrollbar-width:thin]">
        <table className="w-full min-w-[880px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface-muted">
              <th className={HEAD_CELL}>#</th>
              <th className={HEAD_CELL}>Medicine</th>
              <th className={HEAD_CELL}>Dosage</th>
              <th className={HEAD_CELL}>Duration</th>
              <th className={HEAD_CELL}>Timing</th>
              <th className={HEAD_CELL}>Qty</th>
              <th className={HEAD_CELL}>Instructions</th>
              {onEditPrescription && (
                <th className={`${HEAD_CELL} text-right`}>Actions</th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {selectedMeds.map((m, idx) => {
              const d = m.details;
              const medName =
                (d?.medicineName || m?.name || "").trim() || "Medicine";
              const displayForm = String(
                d?.form ??
                  (m as any)?.form ??
                  (m as any)?.medicine?.form ??
                  "",
              ).trim();
              const strengthText = formatStrength(
                d?.strength ?? (m as any)?.strength,
              );
              const strengthNumber = strengthText.match(/\d+(?:\.\d+)?/)?.[0] ?? "";
              const showStrength =
                strengthText &&
                !medName.toLowerCase().includes(strengthText.toLowerCase()) &&
                (!strengthNumber || !medName.toLowerCase().includes(strengthNumber))
                  ? strengthText
                  : "";

              // "N/A" is what the mappers write when the source row had no
              // composition, so it has to be filtered out rather than printed.
              const rawComposition = String(
                d?.composition ?? (m as any)?.composition ?? "",
              ).trim();
              const composition =
                rawComposition && rawComposition.toLowerCase() !== "n/a"
                  ? rawComposition
                  : "";
              const category = (d?.category || "").trim();
              const isOral = isScheduledOralForm(displayForm);
              const doses = Math.max(0, calcTotalDoses(m.dose));
              const doseBadge = doses > 0 ? `${doses}` : "—";
              const freqText = isOral
                ? `${buildDosePattern(m.dose)} (${buildFrequency(m.dose)})`
                : "";
              const durationText = buildDurationBadgeLabel(m.dose);
              const durationRange = buildDurationDateRange(m.dose, prescribedAt);
              const foodText = isOral ? (d?.notes || "").trim() : "";
              const instruction =
                d?.dosage != null
                  ? String(d.dosage)
                  : buildInstructionLine(m.dose);

              return (
                <tr key={`${m.id}-${idx}`} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 text-[12px] text-text-subtle">
                    {idx + 1}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-text">
                      {medName}
                      {showStrength ? ` ${showStrength}` : ""}
                    </div>
                    {displayForm && (
                      <div className="text-[11px] text-text-muted">
                        {displayForm}
                      </div>
                    )}
                    {composition && (
                      <div
                        className="text-[11px] leading-4 text-text-subtle"
                        title={`Composition: ${composition}`}
                      >
                        {composition}
                      </div>
                    )}
                    {category && (
                      <span className="mt-1 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {category}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-text">
                    {isOral ? freqText : (
                      <span className="text-text-subtle">Not applicable</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-text">
                      <FiCalendar className="h-3.5 w-3.5 shrink-0 text-text-subtle" />
                      <span>{durationText}</span>
                    </div>
                    {durationRange && (
                      <div className="mt-0.5 pl-5 text-[11px] text-text-muted">
                        {durationRange}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {!isOral ? (
                      <span className="text-text-subtle">Not applicable</span>
                    ) : foodText && foodText !== "-" ? (
                      <span className="flex items-center gap-1.5 text-text">
                        <FiCoffee className="h-3.5 w-3.5 shrink-0 text-warning" />
                        {foodText}
                      </span>
                    ) : (
                      <span className="text-text-subtle">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                      {doseBadge}
                    </span>
                  </td>

                  <td
                    className="max-w-[200px] truncate px-4 py-3 text-[12px] text-text"
                    title={instruction}
                  >
                    {instruction}
                  </td>

                  {onEditPrescription && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Tooltip content="Edit prescription" placement="top">
                          <Button
                            isIconOnly
                            radius="sm"
                            variant="bordered"
                            className="h-10 w-10 min-w-10 rounded-lg border-line text-text-muted hover:text-primary lg:h-8 lg:w-8 lg:min-w-8"
                            onPress={onEditPrescription}
                            isDisabled={isEditDisabled}
                            aria-label={`Edit prescription — ${medName}`}
                          >
                            <FiEdit2 className="h-3.5 w-3.5" />
                          </Button>
                        </Tooltip>
                      </div>
                    </td>
                  )}
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
