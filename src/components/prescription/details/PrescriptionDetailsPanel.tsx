import {
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
} from "@heroui/react";
import type React from "react";
import { FaLightbulb } from "react-icons/fa";
import {
  FiActivity,
  FiAlertTriangle,
  FiCalendar,
  FiClipboard,
  FiCoffee,
  FiEdit3,
  FiFlag,
  FiMapPin,
  FiScissors,
  FiTarget,
  FiX,
} from "react-icons/fi";
import { FIELD_CN } from "./constants";
import CustomChipInput from "./CustomChipInput";
import { clamp, formatPathologyTestName, formatVisitingDay, splitChips, toggleStrIn, uniq } from "./helpers";
import Tooltip from "../../shared/Tooltip";
import { ActionRow, MiniChip, SectionCard } from "./shared-ui";
import VisitingDayCalendar from "./VisitingDayCalendar";
import type {
  PrescriptionDetailsValue,
  UpdatePrescriptionDetails,
} from "./types";

type PrescriptionDetailsPanelProps = {
  draft: PrescriptionDetailsValue;
  isLocked: boolean;
  lockMessage: string;
  allowParentScroll: boolean;
  showPreferenceShortcut: boolean;
  onCustomizePreferences: () => void;
  filledSectionCount: number;
  panelHeaderOrder: string[];
  sectionFilled: Record<string, boolean>;
  /** One-line preview of each section's own content, for the collapsed row. */
  sectionSummary: Record<string, string>;
  addedTests: string[];
  onAddTest?: () => void;
  habitsOptions: string[];
  allergyOptions: string[];
  diagnosisOptions: string[];
  surgeryOptions: string[];
  dietarySuggestionsOptions: string[];
  vitalsChips: string[];
  allergyChips: string[];
  surgeryChips: string[];
  showDietSuggestions: boolean;
  setShowDietSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  maxAllergies: number;
  maxSurgeries: number;
  upd: UpdatePrescriptionDetails;
  openVitals: () => void;
  toggleAllergyChip: (chip: string) => void;
  addAllergyValues: (values: string[]) => void;
  removeAllergyChip: (chip: string) => void;
  toggleSurgeryChip: (chip: string) => void;
  addSurgeryValues: (values: string[]) => void;
  removeSurgeryChip: (chip: string) => void;
  /**
   * Persists a custom entry to the doctor's own suggestion list. Absent when the
   * signed-in user is not the doctor who owns the list, which is what hides the
   * "save for next time" toggle rather than letting it fail on the server.
   */
  onSaveSuggestions?: (
    listKey:
      | "habitList"
      | "allergyList"
      | "diagnosisList"
      | "surgerySuggestedList"
      | "dietarySuggestionsList",
    values: string[],
  ) => Promise<boolean>;
  addVisitingDay: (day: string) => void;
  removeVisitingDay: (day: string) => void;
};

const chipClassName = (active: boolean, isLocked: boolean) =>
  [
    "rounded-full border px-3 py-1 text-xs font-medium transition",
    isLocked ? "cursor-not-allowed" : "cursor-pointer",
    // Alpha-based tints composite correctly on either theme, so no `dark:`
    // override is needed (a raw `bg-blue-50` reads as a bright patch on dark).
    active
      ? "border-primary/30 bg-primary/10 text-primary dark:text-primary-hover"
      : "border-line bg-surface text-text hover:bg-surface-muted",
  ].join(" ");

const PrescriptionDetailsPanel = ({
  draft,
  isLocked,
  lockMessage,
  allowParentScroll,
  panelHeaderOrder,
  filledSectionCount,
  sectionFilled,
  sectionSummary,
  addedTests,
  onAddTest,
  habitsOptions,
  allergyOptions,
  diagnosisOptions,
  surgeryOptions,
  dietarySuggestionsOptions,
  vitalsChips,
  allergyChips,
  surgeryChips,
  showDietSuggestions,
  setShowDietSuggestions,
  maxAllergies,
  maxSurgeries,
  upd,
  openVitals,
  toggleAllergyChip,
  addAllergyValues,
  removeAllergyChip,
  toggleSurgeryChip,
  addSurgeryValues,
  removeSurgeryChip,
  addVisitingDay,
  removeVisitingDay,
  onSaveSuggestions,
}: PrescriptionDetailsPanelProps) => {
  // Both fields: a saved card mirrors the provisional diagnosis into
  // `diagnosis`, so listing only `provisionalDiagnosis` left the mirrored copy
  // showing in the summary with no chip to remove it.
  const diagnosisChips = uniq([
    ...splitChips(draft.provisionalDiagnosis ?? ""),
    ...splitChips(draft.diagnosis ?? ""),
  ]);
  const habitChips = draft.habits ?? [];

  /** Adds custom values to a comma-joined field, de-duplicated case-insensitively. */
  const appendChips = (existing: string[], values: string[]) => {
    const next = [...existing];
    for (const value of values) {
      if (!next.some((x) => x.toLowerCase() === value.toLowerCase())) {
        next.push(value);
      }
    }
    return next;
  };
  const sectionMap: Record<string, React.ReactNode> = {
    "Pathology Test Name": (
      <div
        key="Pathology Test Name"
        className="rounded-xl border border-line bg-surface px-2.5 py-1.5"
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              className={[
                "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                addedTests.length > 0
                  ? "bg-primary/10 text-primary dark:text-primary-hover"
                  : "bg-surface-muted text-text-muted",
              ].join(" ")}
            >
              <FiClipboard className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="min-w-0 truncate text-[13px] font-semibold leading-5 text-text">
                  Pathology Tests
                </span>
                {addedTests.length > 0 && (
                  <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-semibold text-primary dark:text-primary-hover">
                    {addedTests.length}
                  </span>
                )}
              </div>

              <div
                className={[
                  "truncate text-[11px] leading-4",
                  addedTests.length > 0 ? "text-text" : "text-text-muted",
                ].join(" ")}
                title={sectionSummary["Pathology Test Name"] || undefined}
              >
                {sectionSummary["Pathology Test Name"] || "Add pathology tests"}
              </div>
            </div>
          </div>

          {onAddTest && (
            <Tooltip content={lockMessage} isDisabled={!isLocked} placement="top">
              <div className="shrink-0">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    if (!isLocked) onAddTest();
                  }}
                  className={[
                    "rounded-full px-3 py-1.5 text-center text-[11px] font-semibold text-white transition",
                    "cursor-pointer whitespace-nowrap",
                    isLocked
                      ? "cursor-not-allowed bg-muted opacity-60"
                      : "bg-primary hover:bg-primary-active",
                  ].join(" ")}
                >
                  + Add
                </button>
              </div>
            </Tooltip>
          )}
        </div>

        {addedTests.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {addedTests.map((name, idx) => (
              <span
                key={`${name}-${idx}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-2xl border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-text"
              >
                <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary dark:text-primary-hover">
                  {idx + 1}
                </span>

                <span className="break-words whitespace-normal leading-4">
                  {formatPathologyTestName(name)}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    ),
    Advice: (
      <SectionCard
        key="Advice"
        filled={sectionFilled.Advice}
        title="Advice"
        icon={<FiEdit3 className="h-4 w-4" />}
        iconTooltip="Advice / notes"
        summary={sectionSummary["Advice"]}
        subtitle="Write advice for the patient"
        showTooltip={isLocked}
        tooltipText={lockMessage}
        defaultOpen={Boolean(draft.advice?.trim())}
        openStateKey={`advice-${draft.advice ?? ""}`}
      >
        <Textarea
          placeholder="Write advice, recommendations, or instructions for the patient..."
          value={draft.advice}
          onValueChange={(v) => upd("advice", v)}
          minRows={3}
          variant="bordered"
          classNames={FIELD_CN}
          isDisabled={isLocked}
        />
      </SectionCard>
    ),
    "Dietary Suggestions": (
      <SectionCard
        key="Dietary Suggestions"
        filled={sectionFilled["Dietary Suggestions"]}
        title="Dietary Suggestions"
        headerAction={
          <div className="diet-suggestions-container relative">
            <Popover
              isOpen={showDietSuggestions}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setShowDietSuggestions(false);
                }
              }}
              placement="bottom-end"
              offset={10}
              isNonModal
              backdrop="transparent"
            >
              <PopoverTrigger>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDietSuggestions((prev) => !prev);
                  }}
                  className={[
                    "inline-flex h-6 w-6 items-center justify-center rounded-full bg-warning text-white transition hover:opacity-90",
                    isLocked ? "cursor-not-allowed" : "cursor-pointer",
                  ].join(" ")}
                  disabled={isLocked}
                  aria-label="Show diet suggestions"
                >
                  <Tooltip
                    content="Click to view diet suggestions"
                    placement="top"
                    isDisabled={showDietSuggestions}
                  >
                    <span className="flex h-full w-full items-center justify-center">
                      <FaLightbulb size={12} />
                    </span>
                  </Tooltip>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="z-[10000] w-80 max-w-[90vw] rounded-xl border border-line bg-surface p-3 shadow-xl"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {!isLocked && (
                  <div className="w-full">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-semibold text-text">
                        Suggestions
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowDietSuggestions(false);
                        }}
                        className="cursor-pointer text-text-muted hover:text-text"
                        aria-label="Close diet suggestions"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                    <div className="max-h-52 overflow-y-auto overflow-x-hidden">
                      {dietarySuggestionsOptions.map((suggestion, idx) => {
                        const currentText = draft.clinicalNotes || "";
                        const isDuplicate = currentText
                          .toLowerCase()
                          .includes(suggestion.toLowerCase());

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              if (isDuplicate) {
                                setShowDietSuggestions(false);
                                return;
                              }

                              const newText = currentText
                                ? `${currentText} ${suggestion}`
                                : `${suggestion}`;
                              upd("clinicalNotes", newText);
                              setShowDietSuggestions(false);
                            }}
                            className={`mb-1 w-full rounded-lg px-2 py-1.5 text-left text-xs transition ${
                              isDuplicate
                                ? "cursor-not-allowed text-text-subtle opacity-60"
                                : "cursor-pointer text-text hover:bg-surface-muted hover:text-primary"
                            }`}
                            disabled={isDuplicate}
                            title={
                              isDuplicate ? "Already added" : "Add suggestion"
                            }
                          >
                            {suggestion}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        }
        icon={<FiCoffee className="h-4 w-4" />}
        iconTooltip="Dietary suggestions"
        summary={sectionSummary["Dietary Suggestions"]}
        subtitle="Write dietary suggestions"
        showTooltip={isLocked}
        tooltipText={lockMessage}
        defaultOpen={Boolean(draft.clinicalNotes?.trim())}
        openStateKey={`diet-${draft.clinicalNotes ?? ""}`}
      >
        <Textarea
          placeholder="Write dietary suggestions for the patient..."
          value={draft.clinicalNotes}
          onValueChange={(v) => upd("clinicalNotes", v)}
          minRows={3}
          variant="bordered"
          classNames={FIELD_CN}
          isDisabled={isLocked}
        />
      </SectionCard>
    ),
    Habits: (
      <SectionCard
        key="Habits"
        filled={sectionFilled.Habits}
        title="Habits"
        icon={<FiFlag className="h-4 w-4" />}
        iconTooltip="Habits"
        summary={sectionSummary["Habits"]}
        subtitle="Smoking, Alcohol, Lifestyle, etc."
        showTooltip={isLocked}
        tooltipText={lockMessage}
        defaultOpen={(draft.habits ?? []).length > 0}
        openStateKey={`habits-${(draft.habits ?? []).join("|")}`}
      >
        {/* Unpicked suggestions only — the picked ones are listed below with a
            remove button, and carrying them in both rows showed each twice. */}
        <div className="flex flex-wrap gap-2">
          {habitsOptions
            .filter(
              (h) =>
                !habitChips.some((item) => item.toLowerCase() === h.toLowerCase()),
            )
            .map((h) => (
              <button
                key={h}
                type="button"
                disabled={isLocked}
                onClick={() => {
                  if (isLocked) return;
                  upd("habits", toggleStrIn(habitChips, h));
                }}
                className={chipClassName(false, isLocked)}
              >
                {h}
              </button>
            ))}
        </div>
        {habitChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {habitChips.map((habit) => (
              <span
                key={habit}
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:text-primary-hover"
              >
                {habit}
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      upd(
                        "habits",
                        habitChips.filter(
                          (h) => h.toLowerCase() !== habit.toLowerCase(),
                        ),
                      );
                    }}
                    className="grid h-4 w-4 cursor-pointer place-items-center rounded-full hover:bg-primary/20"
                  >
                    <FiX size={12} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        <CustomChipInput
          noun="habit"
          disabled={isLocked}
          onAdd={(values) => upd("habits", appendChips(habitChips, values))}
          onSaveToList={
            onSaveSuggestions
              ? (values) => onSaveSuggestions("habitList", values)
              : undefined
          }
        />
      </SectionCard>
    ),
    Vitals: (
      <span key="Vitals" className="block">
        <ActionRow
          title="Vitals"
          filled={sectionFilled.Vitals}
          icon={<FiActivity className="h-4 w-4" />}
          iconTooltip="Vitals"
          summary={sectionSummary["Vitals"]}
          subtitle="Current health measurements"
          onClick={openVitals}
          disabled={isLocked}
        >
          {vitalsChips.map((t) => (
            <MiniChip key={t}>{t}</MiniChip>
          ))}
        </ActionRow>
      </span>
    ),
    Allergy: (
      <SectionCard
        key="Allergy"
        filled={sectionFilled.Allergy}
        title="Allergy"
        icon={<FiAlertTriangle className="h-4 w-4" />}
        iconTooltip="Patient allergies"
        tone="danger"
        summary={sectionSummary["Allergy"]}
        subtitle="Add patient allergies"
        showTooltip={isLocked}
        tooltipText={lockMessage}
        defaultOpen={allergyChips.length > 0}
        openStateKey={`allergy-${allergyChips.join("|")}`}
      >
        {/* Presets already selected move to the chip row below (with a
            remove button) instead of also staying here — otherwise a
            selected allergy like "Latex allergy" printed twice: once as an
            unremovable "active" preset button, once as a removable chip. */}
        <div className="mb-3 flex flex-wrap gap-2">
          {allergyOptions
            .filter(
              (a) =>
                !allergyChips.some((x) => x.toLowerCase() === a.toLowerCase()),
            )
            .map((a) => (
              <button
                key={a}
                type="button"
                disabled={isLocked}
                onClick={() => toggleAllergyChip(a)}
                className={chipClassName(false, isLocked)}
              >
                {a}
              </button>
            ))}
        </div>

        {allergyChips.length > 0 ? (
          <div className="mb-2 mt-3 flex flex-wrap gap-2">
            {allergyChips.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:text-primary-hover"
              >
                {a}
                {!isLocked ? (
                  <button
                    type="button"
                    onClick={() => removeAllergyChip(a)}
                    className="grid h-4 w-4 cursor-pointer place-items-center rounded-full hover:bg-primary/20"
                    aria-label={`Remove ${a}`}
                  >
                    <FiX
                      size={12}
                      className="text-primary dark:text-[#d8fff8]"
                    />
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}

        <CustomChipInput
          noun="allergy"
          disabled={isLocked}
          atLimit={allergyChips.length >= maxAllergies}
          limitMessage={`Max ${maxAllergies} allergies added`}
          onAdd={addAllergyValues}
          onSaveToList={
            onSaveSuggestions
              ? (values) => onSaveSuggestions("allergyList", values)
              : undefined
          }
        />
      </SectionCard>
    ),
    Diagnosis: (
      <SectionCard
        key="Diagnosis"
        filled={sectionFilled.Diagnosis}
        title="Diagnosis"
        icon={<FiTarget className="h-4 w-4" />}
        iconTooltip="Diagnosis"
        summary={sectionSummary["Diagnosis"]}
        subtitle="Add diagnosis details"
        showTooltip={isLocked}
        tooltipText={lockMessage}
        defaultOpen={diagnosisChips.length > 0}
        openStateKey={`diagnosis-${diagnosisChips.join(", ")}`}
      >
        {/* Suggestions the doctor has not picked yet. A selected one drops out
            of this row because it is already listed below with a remove button —
            showing it in both places printed every diagnosis twice. */}
        <div className="mb-3 flex flex-wrap gap-2">
          {diagnosisOptions
            .filter(
              (d) =>
                !diagnosisChips.some(
                  (x) => x.toLowerCase() === d.toLowerCase(),
                ),
            )
            .map((d) => (
              <button
                key={d}
                type="button"
                disabled={isLocked}
                onClick={() => {
                  if (isLocked) return;
                  upd(
                    "provisionalDiagnosis",
                    appendChips(diagnosisChips, [d]).join(", "),
                  );
                }}
                className={chipClassName(false, isLocked)}
              >
                {d}
              </button>
            ))}
        </div>
        {diagnosisChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {diagnosisChips.map((diag) => (
              <span
                key={diag}
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:text-primary-hover"
              >
                {diag}
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = diagnosisChips.filter(
                        (x) => x.toLowerCase() !== diag.toLowerCase(),
                      );
                      upd("provisionalDiagnosis", next.join(", "));
                    }}
                    className="grid h-4 w-4 cursor-pointer place-items-center rounded-full hover:bg-primary/15"
                  >
                    <FiX size={12} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        <CustomChipInput
          noun="diagnosis"
          disabled={isLocked}
          onAdd={(values) =>
            upd(
              "provisionalDiagnosis",
              appendChips(diagnosisChips, values).join(", "),
            )
          }
          onSaveToList={
            onSaveSuggestions
              ? (values) => onSaveSuggestions("diagnosisList", values)
              : undefined
          }
        />
      </SectionCard>
    ),
    "Surgery Suggested": (
      <SectionCard
        key="Surgery Suggested"
        filled={sectionFilled["Surgery Suggested"]}
        title="Surgery Suggested"
        icon={<FiScissors className="h-4 w-4" />}
        iconTooltip="Surgery suggested"
        summary={sectionSummary["Surgery Suggested"]}
        subtitle="Add suggested surgery details"
        showTooltip={isLocked}
        tooltipText={lockMessage}
        defaultOpen={surgeryChips.length > 0}
        openStateKey={`surgery-${surgeryChips.join("|")}`}
      >
        {/* Unpicked suggestions only, matching Allergy and Diagnosis. */}
        <div className="mb-3 flex flex-wrap gap-2 ">
          {surgeryOptions
            .filter(
              (opt) =>
                !surgeryChips.some((x) => x.toLowerCase() === opt.toLowerCase()),
            )
            .map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={isLocked}
                onClick={() => toggleSurgeryChip(opt)}
                className={chipClassName(false, isLocked)}
              >
                {opt}
              </button>
            ))}
        </div>

        <div className="mb-3 mt-3 flex flex-wrap gap-2">
          {surgeryChips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:text-primary-hover"
            >
              {chip}
              {!isLocked ? (
                <button
                  type="button"
                  onClick={() => removeSurgeryChip(chip)}
                  className="grid h-4 w-4 cursor-pointer place-items-center rounded-full hover:bg-primary/20"
                  aria-label={`Remove ${chip}`}
                >
                  <FiX size={12} className="text-primary" />
                </button>
              ) : null}
            </span>
          ))}
        </div>

        <CustomChipInput
          noun="surgery"
          disabled={isLocked}
          atLimit={surgeryChips.length >= maxSurgeries}
          limitMessage={`Max ${maxSurgeries} surgeries added`}
          onAdd={addSurgeryValues}
          onSaveToList={
            onSaveSuggestions
              ? (values) => onSaveSuggestions("surgerySuggestedList", values)
              : undefined
          }
        />
        <div className="mt-1 text-xs text-text-muted">
          {surgeryChips.length}/{maxSurgeries} selected
        </div>
      </SectionCard>
    ),
    "Visiting Days": (
      <SectionCard
        key="Visiting Days"
        filled={sectionFilled["Visiting Days"]}
        title="Visiting Days"
        subtitle="Pick follow-up visit dates"
        icon={<FiMapPin className="h-4 w-4" />}
        iconTooltip="Visiting days"
        summary={sectionSummary["Visiting Days"]}
        showTooltip={isLocked}
        tooltipText={lockMessage}
        defaultOpen={
          (draft.visitingDays ?? []).length > 0 ||
          Boolean(draft.visitingNotes?.trim())
        }
        openStateKey={`visiting-${(draft.visitingDays ?? []).join("|")}-${
          draft.visitingNotes ?? ""
        }`}
      >
        <div className="grid gap-2.5">
          <VisitingDayCalendar
            isLocked={isLocked}
            visitingDays={draft.visitingDays ?? []}
            addVisitingDay={addVisitingDay}
            removeVisitingDay={removeVisitingDay}
          />

          {(draft.visitingDays ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(draft.visitingDays ?? []).map((day) => (
                <span
                  key={day}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-text"
                >
                  <span className="text-primary dark:text-primary-hover">
                    {formatVisitingDay(day)}
                  </span>
                  {!isLocked ? (
                    <button
                      type="button"
                      onClick={() => removeVisitingDay(day)}
                      className="grid h-4 w-4 cursor-pointer place-items-center rounded-full bg-primary/10 transition hover:bg-primary/20"
                      aria-label={`Remove ${formatVisitingDay(day)}`}
                    >
                      <FiX size={11} className="text-primary dark:text-primary-hover" />
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[11px] font-medium text-text-muted">
              Visiting notes
            </p>

            <Textarea
              placeholder="Write visiting notes..."
              value={draft.visitingNotes ?? ""}
              onValueChange={(v) => upd("visitingNotes", v)}
              minRows={2}
              maxRows={4}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
            />
          </div>
        </div>
      </SectionCard>
    ),
    "Follow-Up (days)": (
      <SectionCard
        key="Follow-Up (days)"
        filled={sectionFilled["Follow-Up (days)"]}
        title="Follow-Up (days)"
        subtitle="When to see the patient next"
        icon={<FiCalendar className="h-4 w-4" />}
        iconTooltip="Follow-up"
        summary={sectionSummary["Follow-Up (days)"]}
        showTooltip={isLocked}
        tooltipText={lockMessage}
        defaultOpen={Boolean(draft.followUpDays || draft.followUpDate)}
        openStateKey={`followup-${draft.followUpDays ?? ""}-${
          draft.followUpDate ?? ""
        }`}
      >
        <div className="grid gap-3">
          <Input
            type="number"
            label="Follow-up in days"
            placeholder="Enter days"
            value={draft.followUpDays?.toString() ?? ""}
            onValueChange={(v) => {
              const n = v ? clamp(Number(v), 1, 365) : null;
              upd("followUpDays", Number.isFinite(n as number) ? n : null);
            }}
            variant="bordered"
            classNames={FIELD_CN}
            isDisabled={isLocked}
          />
          <Input
            type="date"
            readOnly
            label="Follow-up date"
            value={draft.followUpDate}
            onChange={(e) => upd("followUpDate", e.target.value)}
            variant="bordered"
            classNames={FIELD_CN}
            isDisabled={isLocked}
          />
        </div>
      </SectionCard>
    ),
  };

  const sectionsToRender = panelHeaderOrder
    .filter((header) => sectionMap[header] != null)
    .map((header) => sectionMap[header]);

  return (
    <div
      className={[
        "w-full min-h-0 space-y-1.5 pr-1 pt-1 pb-20 lg:pb-18",
        allowParentScroll
          ? "h-auto overflow-visible"
          : [
              "h-[calc(100dvh-190px)]",
              "sm:h-[calc(100dvh-210px)]",
              "lg:h-[calc(100dvh-220px)]",
              "xl:h-[calc(100dvh-230px)]",
              "overflow-y-auto overflow-x-hidden overscroll-y-contain",
              "[scrollbar-gutter:stable] [scrollbar-width:thin]",
            ].join(" "),
      ].join(" ")}
    >
      {/* Progress at a glance: without it, the only way to know how much of the
          prescription is done is to read all ten rows. */}
      <div className="flex items-center gap-2 px-0.5 pb-0.5">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{
              width: `${panelHeaderOrder.length ? (filledSectionCount / panelHeaderOrder.length) * 100 : 0}%`,
            }}
          />
        </div>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          {filledSectionCount}/{panelHeaderOrder.length} filled
        </span>
      </div>

      {sectionsToRender}
    </div>
  );
};

export default PrescriptionDetailsPanel;
