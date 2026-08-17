import { Button } from "@heroui/react";
import { FiX } from "react-icons/fi";
import {
  splitChips,
  toggleStrIn,
  uniq,
} from "./helpers";
import type {
  PrescriptionDetailsValue,
  UpdatePrescriptionDetails,
} from "./types";

type PrescriptionDetailsFormProps = {
  draft: PrescriptionDetailsValue;
  isLocked: boolean;
  habitsOptions: string[];
  allergyOptions: string[];
  diagnosisOptions: string[];
  surgeryOptions: string[];
  allergyChips: string[];
  surgeryChips: string[];
  upd: UpdatePrescriptionDetails;
  commit: (next: PrescriptionDetailsValue) => void;
  toggleAllergyChip: (chip: string) => void;
  removeAllergyChip: (chip: string) => void;
  toggleSurgeryChip: (chip: string) => void;
  removeSurgeryChip: (chip: string) => void;
};

/**
 * The chips the Diagnosis section owns. A saved card mirrors the provisional
 * diagnosis into `diagnosis`, so both fields have to be listed — otherwise the
 * mirrored copy shows in the summary with no chip to remove it.
 */
const diagnosisChipsOf = (draft: PrescriptionDetailsValue) =>
  uniq([
    ...splitChips(draft.provisionalDiagnosis ?? ""),
    ...splitChips(draft.diagnosis ?? ""),
  ]);

const PrescriptionDetailsForm = ({
  draft,
  isLocked,
  habitsOptions,
  allergyOptions,
  diagnosisOptions,
  surgeryOptions,
  allergyChips,
  surgeryChips,
  upd,
  commit,
  toggleAllergyChip,
  removeAllergyChip,
  toggleSurgeryChip,
  removeSurgeryChip,
}: PrescriptionDetailsFormProps) => (
  <>
    <div className="mb-5 rounded-2xl border border-slate-200 p-4">
      <div className="mb-3 text-sm font-semibold text-slate-800">Habits</div>
      <div className="flex flex-wrap gap-2">
        {habitsOptions.map((h) => {
          const active = (draft.habits ?? []).some(
            (item) => item.toLowerCase() === h.toLowerCase(),
          );
          return (
            <button
              key={h}
              type="button"
              disabled={isLocked}
              onClick={() => {
                if (isLocked) return;
                const newHabits = toggleStrIn(draft.habits ?? [], h);
                upd("habits", newHabits);
              }}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                isLocked ? "cursor-not-allowed" : "",
                active
                  ? "border-blue-200 bg-blue-50 text-primary dark:border-[#46beae]/45 dark:bg-[#123730] dark:text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151c2d]",
              ].join(" ")}
            >
              {h}
            </button>
          );
        })}
      </div>
      {(draft.habits ?? []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(draft.habits ?? []).map((habit) => (
            <span
              key={habit}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-[#123730] dark:text-white"
            >
              {habit}
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => {
                    const newHabits = (draft.habits ?? []).filter(
                      (h) => h.toLowerCase() !== habit.toLowerCase(),
                    );
                    upd("habits", newHabits);
                  }}
                  className="grid h-4 w-4 place-items-center rounded-full hover:bg-slate-200 dark:hover:bg-[#46beae]/20"
                >
                  <FiX size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>

    <div className="mb-5 rounded-2xl border border-slate-200 p-4">
      <div className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">
        Allergy
      </div>
      <div className="flex flex-wrap gap-2">
        {allergyOptions.map((a) => {
          const active = allergyChips.some(
            (x) => x.toLowerCase() === a.toLowerCase(),
          );
          return (
            <button
              key={a}
              type="button"
              disabled={isLocked}
              onClick={() => toggleAllergyChip(a)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                isLocked ? "cursor-not-allowed" : "",
                active
                  ? "border-blue-200 bg-blue-50 text-primary dark:border-[#46beae]/45 dark:bg-[#123730] dark:text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151c2d]",
              ].join(" ")}
            >
              {a}
            </button>
          );
        })}
      </div>
      {allergyChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {allergyChips.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 dark:border-[#46beae]/35 dark:bg-[#123730] dark:text-[#d8fff8]"
            >
              {a}
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => removeAllergyChip(a)}
                  className="grid h-4 w-4 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-[#46beae]/20"
                >
                  <FiX size={12} className="text-current" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>

    <div className="mb-5 rounded-2xl border border-slate-200 p-4">
      <div className="mb-3 text-sm font-semibold text-slate-800">
        Diagnosis
      </div>
      <div className="flex flex-wrap gap-2">
        {diagnosisOptions.map((d) => {
          const active = diagnosisChipsOf(draft).some(
            (x) => x.toLowerCase() === d.toLowerCase(),
          );

          return (
            <button
              key={d}
              type="button"
              disabled={isLocked}
              onClick={() => {
                if (isLocked) return;

                const current = diagnosisChipsOf(draft);
                const has = current.some(
                  (x) => x.toLowerCase() === d.toLowerCase(),
                );
                const next = has
                  ? current.filter((x) => x.toLowerCase() !== d.toLowerCase())
                  : [...current, d];
                upd("provisionalDiagnosis", next.join(", "));
              }}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                isLocked ? "cursor-not-allowed opacity-60" : "",
                active
                  ? "border-blue-200 bg-blue-50 text-primary"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {d}
            </button>
          );
        })}
      </div>
      {diagnosisChipsOf(draft).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {diagnosisChipsOf(draft).map((diag) => (
            <span
              key={diag}
              className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
            >
              {diag}
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => {
                    const next = diagnosisChipsOf(draft).filter(
                      (x) => x.toLowerCase() !== diag.toLowerCase(),
                    );
                    upd("provisionalDiagnosis", next.join(", "));
                  }}
                  className="grid h-4 w-4 place-items-center rounded-full hover:bg-blue-100"
                >
                  <FiX size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>

    <div className="mb-5 rounded-2xl border border-slate-200 p-4 ">
      <div className="mb-3 text-sm font-semibold text-slate-800">
        Surgery Suggested
      </div>
      <div className="flex flex-wrap gap-2">
        {surgeryOptions.map((h) => {
          const active = surgeryChips.some(
            (item) => item.toLowerCase() === h.toLowerCase(),
          );
          return (
            <button
              key={h}
              type="button"
              disabled={isLocked}
              onClick={() => toggleSurgeryChip(h)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                isLocked ? "cursor-not-allowed opacity-60" : "",
                active
                  ? "border-blue-200 bg-blue-50 text-primary"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {h}
            </button>
          );
        })}
      </div>
      {surgeryChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {surgeryChips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
            >
              {chip}
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => removeSurgeryChip(chip)}
                  className="grid h-4 w-4 place-items-center rounded-full hover:bg-slate-100"
                >
                  <FiX size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>

    <div className="mb-5 rounded-2xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">Vitals</div>
        <Button
          size="sm"
          radius="full"
          isDisabled={isLocked}
          onPress={() =>
            commit({
              ...draft,
              vitals: {
                ...draft.vitals,
                bpSys: draft.vitals.bpSys ?? 120,
                bpDia: draft.vitals.bpDia ?? 80,
                pulse: draft.vitals.pulse ?? 78,
                spo2: draft.vitals.spo2 ?? 98,
                temperatureC: draft.vitals.temperatureC ?? 36.8,
              },
            })
          }
          className="bg-emerald-600 text-white hover:opacity-95"
        >
          Auto-Fill
        </Button>
      </div>
    </div>
  </>
);

export default PrescriptionDetailsForm;
