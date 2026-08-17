import React from "react";
import { FiChevronDown, FiFileText, FiMinus, FiPlus, FiStar, FiX } from "react-icons/fi";
import SchedulePicker from "./SchedulePicker";
import InstructionSuggestionChips from "../editor/InstructionSuggestionChips";
import {
  applyQuickDose,
  calcTotalDoses,
  countOccurrenceDays,
} from "../../helpers/doseHelpers";
import { syncDetailsWithDose } from "../../helpers/medicineMappers";
import {
  FOOD_TIMING_OPTIONS,
} from "../../helpers/schedulePattern";
import {
  COMPACT_APPLICATION_FORMS,
  INJECTION_FORM,
  INJECTION_ROUTE_OPTIONS,
} from "../editor/constants";
import type { Dose, SelectedMed } from "../../types";

/**
 * Which controls a row shows depends on the medicine's form, matching the
 * per-medicine editor (`PrescriptionEditorCard`/`editor/constants.ts`):
 * oral solids/liquids get Schedule + food Timing, external/topical forms drop
 * both (Frequency/Duration/Instruction only), and Injection swaps Timing for
 * a Route picker. Frequency, Duration and Doses stay identical across all
 * three — only Schedule/Timing vary. An unrecognised or blank form falls
 * back to the oral mode, the same default `PrescriptionEditorCard` uses.
 */
const getFormMode = (form: string): "oral" | "application" | "injection" => {
  const formKey = form.trim().toLowerCase();
  if (formKey === INJECTION_FORM) return "injection";
  if (COMPACT_APPLICATION_FORMS.includes(formKey)) return "application";
  return "oral";
};
/**
 * Forms where a written instruction is normally part of the dose — a syrup
 * needs "5 ml", a cream needs "apply thinly". A tablet's dose is already fully
 * expressed by schedule + duration, so the column is dead weight for a
 * tablet-only prescription.
 */
const FORMS_NEEDING_INSTRUCTION = [
  "syrup",
  "suspension",
  "liquid",
  "drops",
  "solution",
  "cream",
  "ointment",
  "gel",
  "lotion",
  "paste",
  "oil",
  "spray",
  "foam",
  "inhaler",
  "injection",
  "powder",
  "granules",
  "sachet",
  "mouthwash",
  "oral rinse",
  "shampoo",
  "soap",
  "suppository",
  "patch",
];
const formNeedsInstruction = (form: string) =>
  FORMS_NEEDING_INSTRUCTION.includes(form.trim().toLowerCase());
/**
 * The handful of patterns that cover almost every prescription, surfaced above
 *
 * The table wrapper needs `overflow-x-auto` for narrow screens, and per CSS
 * spec a non-`visible` overflow on one axis forces the other to `auto` — which
 * makes the wrapper a scroll container that clips any absolutely-positioned
 * menu inside it. A native select's popup is drawn by the OS outside the
 * document flow, so it cannot be clipped, and it brings keyboard type-ahead.
 */
const TableSelect: React.FC<{
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}> = ({ value, options, onChange, disabled, ariaLabel, className = "" }) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-full appearance-none rounded-lg border border-line bg-surface pl-2 pr-6 text-[12px] font-semibold text-text transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
    <FiChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-subtle" />
  </div>
);
/**
 * Dense, fully inline-editable prescription table.
 *
 * Every field a doctor sets — schedule, timing, frequency, duration and
 * instruction — is editable directly in the row and tab-navigable across the
 * whole prescription. There is deliberately no expand/edit action: the card it
 * used to open showed these same five controls a second time, so a doctor was
 * choosing between two identical editors for the same medicine.
 */
const MedicineTable: React.FC<{
  meds: SelectedMed[];
  canEdit: boolean;
  isMedicineFavorite?: (m: SelectedMed) => boolean;
  onToggleFavorite?: (m: SelectedMed) => void;
  onRemove: (m: SelectedMed, index: number) => void;
  updateMedAt: (index: number, next: SelectedMed) => void;
  updateMedDosage: (index: number, dosage: string) => void;
}> = ({
  meds,
  canEdit,
  isMedicineFavorite,
  onToggleFavorite,
  onRemove,
  updateMedAt,
  updateMedDosage,
}) => {
  const applyDose = (index: number, med: SelectedMed, nextDose: Dose) => {
    updateMedAt(index, {
      ...med,
      dose: nextDose,
      details: syncDetailsWithDose(med, nextDose),
    });
  };
  const setTiming = (index: number, med: SelectedMed, timing: string) => {
    updateMedAt(index, {
      ...med,
      details: { ...(med.details || {}), notes: timing },
    });
  };
  /**
   * Instruction visibility per row, keyed by `${med.id}-${index}` (index is
   * part of the key since the same medicine can be added twice).
   *
   * A row whose form needs an instruction (`formNeedsInstruction`) starts
   * open automatically — a cream or injection has no schedule/timing to fall
   * back on, so hiding its only real dose detail behind a click was the
   * opposite of what those rows need. Other rows still start collapsed and
   * open on demand. Either way, a doctor can override the default by
   * toggling — `manuallyToggled` tracks only the rows that differ from their
   * form's default, not the open/closed state directly.
   */
  const [manuallyToggled, setManuallyToggled] = React.useState<Set<string>>(
    new Set(),
  );
  /** Key of the row a toggle click just opened, so only that input autofocuses. */
  const [justOpenedKey, setJustOpenedKey] = React.useState<string | null>(
    null,
  );

  const isInstructionOpen = (key: string, required: boolean) =>
    required ? !manuallyToggled.has(key) : manuallyToggled.has(key);

  const toggleInstruction = (key: string, required: boolean) => {
    const wasOpen = isInstructionOpen(key, required);
    setManuallyToggled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setJustOpenedKey(wasOpen ? null : key);
  };

  const columns = [
    "#",
    "Medicine",
    "Schedule",
    "Timing",
    "Frequency",
    "Duration",
    "Doses",
    "",
  ];
  return (
    <div className="space-y-2">
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr>
            {columns.map((heading, i) => (
              <th
                key={heading || `col-${i}`}
                scope="col"
                // Sticky so columns stay labelled once a long prescription
                // scrolls past the header.
                className="sticky top-0 z-10 whitespace-nowrap bg-surface-muted px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-subtle"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {meds.map((med, index) => {
            const details = med.details || {};
            const name = (details.medicineName || med.name || "Medicine").trim();
            const rawComposition = String(details.composition ?? "").trim();
            const composition =
              rawComposition && rawComposition.toLowerCase() !== "n/a"
                ? rawComposition
                : "";
            const form = String(details.form ?? "").trim();
            const formMode = getFormMode(form);
            const instructionRequired = formNeedsInstruction(form);
            const rowKey = `${med.id}-${index}`;
            const isInstructionRowOpen = isInstructionOpen(
              rowKey,
              instructionRequired,
            );
            // Schedule (times/day) is hidden for application/injection rows
            // (`formMode !== "oral"`), so its hidden morning/night flags must
            // not silently multiply the dose count any more — Duration alone
            // decides how many doses those rows show.
            const doses =
              formMode === "oral"
                ? Math.max(0, calcTotalDoses(med.dose))
                : Math.max(0, countOccurrenceDays(med.dose));
            const timing = String(details.notes ?? "").trim();
            const selectedRoute = (INJECTION_ROUTE_OPTIONS as readonly string[]).includes(
              timing,
            )
              ? timing
              : INJECTION_ROUTE_OPTIONS[0];
            const isWeekly = med.dose.frequency === "weekly";
            const durationValue = isWeekly
              ? Math.max(1, Number(med.dose.weeklyWeeks || 1))
              : Math.max(1, Number(med.dose.days || 1));
            const favorite = isMedicineFavorite?.(med) ?? false;
            const setDuration = (next: number) =>
              applyDose(
                index,
                med,
                applyQuickDose(med.dose, {
                  days: Math.max(1, Math.min(365, next)),
                  frequency: isWeekly ? "weekly" : "daily",
                }),
              );
            return (
              <React.Fragment key={`${med.id}-${index}`}>
              <tr className="border-t border-line transition hover:bg-primary/5">
                <td className="px-3 py-2 align-middle">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-[12px] font-bold text-primary">
                    {index + 1}
                  </span>
                </td>
                {/* Width is capped here rather than left to the content:
                    combination drugs ("BOTULINUM TOXINS: ONABOTULINUMTOXINA,
                    ABOBOTULINUMTOXINA, …") stretched this cell to their full
                    single-line length, which is what pushed the whole table
                    into a horizontal scroll. Wraps to two lines, then falls
                    back to the tooltip. */}
                <td className="w-[240px] max-w-[240px] px-3 py-2 align-middle">
                  <div className="min-w-0">
                    <div
                      className="line-clamp-2 break-words text-[13px] font-bold leading-snug text-text"
                      title={name}
                    >
                      {name}
                    </div>
                    {form && (
                      <div className="truncate text-[11px] font-medium text-text-subtle">
                        {form}
                      </div>
                    )}
                    {composition && (
                      <div
                        className="truncate text-[10px] text-text-subtle"
                        title={`Composition: ${composition}`}
                      >
                        {composition}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 align-middle">
                  {formMode === "oral" ? (
                    <SchedulePicker
                      ariaLabel={`Schedule for ${name}`}
                      dose={med.dose}
                      disabled={!canEdit}
                      onChange={(nextDose) => applyDose(index, med, nextDose)}
                    />
                  ) : (
                    <span className="text-[12px] font-medium text-text-subtle">
                      Not applicable
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 align-middle">
                  {formMode === "oral" && (
                    <TableSelect
                      className="w-[130px]"
                      ariaLabel={`Timing for ${name}`}
                      value={timing || "After Food"}
                      options={FOOD_TIMING_OPTIONS}
                      disabled={!canEdit}
                      onChange={(next) => setTiming(index, med, next)}
                    />
                  )}
                  {formMode === "injection" && (
                    <TableSelect
                      className="w-[92px]"
                      ariaLabel={`Route for ${name}`}
                      value={selectedRoute}
                      options={INJECTION_ROUTE_OPTIONS}
                      disabled={!canEdit}
                      onChange={(next) => setTiming(index, med, next)}
                    />
                  )}
                  {formMode === "application" && (
                    <span className="text-[12px] font-medium text-text-subtle">
                      Not applicable
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 align-middle">
                  <div
                    role="radiogroup"
                    aria-label={`Frequency for ${name}`}
                    className="flex h-8 w-[124px] items-center rounded-lg border border-line bg-surface p-0.5"
                  >
                    {(["daily", "weekly"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        role="radio"
                        aria-checked={
                          f === "weekly" ? isWeekly : !isWeekly
                        }
                        disabled={!canEdit}
                        onClick={() =>
                          applyDose(
                            index,
                            med,
                            applyQuickDose(med.dose, {
                              days: durationValue,
                              frequency: f,
                            }),
                          )
                        }
                        className={[
                          "h-full flex-1 rounded-md text-[11px] font-semibold capitalize transition disabled:opacity-60",
                          (f === "weekly") === isWeekly
                            ? "bg-primary text-white"
                            : "text-text-muted hover:text-primary",
                        ].join(" ")}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex h-8 w-[112px] items-center rounded-lg border border-line bg-surface px-1">
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setDuration(durationValue - 1)}
                      className="grid h-6 w-5 place-items-center rounded text-text-muted transition hover:text-primary disabled:opacity-50"
                      aria-label={`Decrease duration for ${name}`}
                    >
                      <FiMinus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={durationValue}
                      disabled={!canEdit}
                      onChange={(e) => setDuration(Number(e.target.value) || 1)}
                      aria-label={`Duration for ${name} in ${isWeekly ? "weeks" : "days"}`}
                      className="w-8 border-0 bg-transparent text-center text-[12px] font-bold text-text focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setDuration(durationValue + 1)}
                      className="grid h-6 w-5 place-items-center rounded text-text-muted transition hover:text-primary disabled:opacity-50"
                      aria-label={`Increase duration for ${name}`}
                    >
                      <FiPlus className="h-3 w-3" />
                    </button>
                    <span className="pr-1 text-[10px] font-medium text-text-subtle">
                      {isWeekly ? "wks" : "days"}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 align-middle text-[12px] font-bold text-primary">
                  {String(doses || 0).padStart(2, "0")}
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex items-center justify-end gap-1">
                    {/* Instruction, moved out of its own column: it was a
                        full-width field for something most tablets never use,
                        squeezing every other column. Opens a row beneath. */}
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() =>
                        toggleInstruction(rowKey, instructionRequired)
                      }
                      aria-expanded={isInstructionRowOpen}
                      title={String(details.dosage ?? "") || "Add instruction"}
                      aria-label={`Instruction for ${name}`}
                      className={[
                        "grid h-8 w-8 place-items-center rounded-full border transition disabled:opacity-50",
                        isInstructionRowOpen
                          ? "border-primary bg-primary text-white"
                          : String(details.dosage ?? "").trim()
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-line bg-surface text-text-subtle hover:border-primary/40 hover:text-primary",
                      ].join(" ")}
                    >
                      <FiFileText className="h-3.5 w-3.5" />
                    </button>
                    {onToggleFavorite && (
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => onToggleFavorite(med)}
                        className={[
                          "grid h-8 w-8 place-items-center rounded-full border transition disabled:opacity-50",
                          favorite
                            ? "border-warning/40 bg-warning/15 text-warning"
                            : "border-line bg-surface text-text-subtle hover:border-warning/40 hover:text-warning",
                        ].join(" ")}
                        aria-label={
                          favorite
                            ? `Remove ${name} from favourites`
                            : `Add ${name} to favourites`
                        }
                      >
                        <FiStar
                          className={
                            favorite ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"
                          }
                        />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => onRemove(med, index)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-danger/10 text-danger transition hover:bg-danger/20 disabled:opacity-50"
                      aria-label={`Remove ${name}`}
                    >
                      <FiX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>

              {/* No tint or divider of its own: a full-width coloured band read
                  as a separate blocking section rather than a detail hanging off
                  the medicine above it. It stays attached by sitting flush under
                  the row (`pt-0`), indenting past the index column, and marking
                  the relationship with a single hairline connector. */}
              {isInstructionRowOpen && (
                <tr>
                  <td colSpan={columns.length} className="px-3 pb-2 pt-0">
                    <div className="border-l-2 border-primary/25 pl-2.5 sm:ml-[44px]">
                    <label className="flex items-center gap-2">
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-text-subtle">
                        Instruction
                      </span>
                      <input
                        type="text"
                        autoFocus={rowKey === justOpenedKey}
                        value={String(details.dosage ?? "")}
                        disabled={!canEdit}
                        onChange={(e) => updateMedDosage(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Escape") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        placeholder={
                          instructionRequired
                            ? "e.g. 5 ml"
                            : "Optional note for the patient"
                        }
                        aria-label={`Instruction for ${name}`}
                        className="h-8 w-full rounded-lg border border-line bg-surface px-2 text-[12px] font-medium text-text transition placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                      />
                    </label>

                    {/* Form-specific starting points — a cream needs a site and
                        technique, a syrup an amount. Indented to line up with
                        the input, past the "Instruction" label. */}
                    <InstructionSuggestionChips
                      form={form}
                      value={String(details.dosage ?? "")}
                      disabled={!canEdit}
                      onSelect={(instruction) =>
                        updateMedDosage(index, instruction)
                      }
                      className="mt-1.5 sm:pl-[76px]"
                    />
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
    </div>
  );
};
export default MedicineTable;
