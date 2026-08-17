import { Button, Tooltip } from "@heroui/react";
import React from "react";
import { FiEdit2, FiFileText } from "react-icons/fi";
import type { PrescriptionPreviewSummaryProps } from "../../../../types/prescription";
import { toArray } from "../helpers/reportPayloadHelpers";

/**
 * One clinical fact: a small uppercase label with its value on the same line.
 *
 * Inline rather than stacked — stacking doubled the band's height, and with most
 * values being a few words the label column was mostly whitespace. The uppercase
 * label still gives the eye something to scan down.
 */
const Item: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex min-w-0 items-baseline gap-2">
    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-text-subtle">
      {label}
    </span>
    <span className="min-w-0 break-words text-[13px] leading-5 text-text">
      {value}
    </span>
  </div>
);

/**
 * A value only earns a full-width row once it is long enough to wrap inside a
 * half-width one. Measured from the text rather than hard-coded per field: the
 * same "Diagnosis" row is two words for one patient and six comorbidities for
 * the next.
 */
const WIDE_VALUE_CHARS = 48;

const PrescriptionPreviewSummary: React.FC<PrescriptionPreviewSummaryProps> = ({
  reportCard,
  patient,
  adviceText,
  onEdit,
  isEditDisabled,
  bare = false,
}) => {
  const text = (value?: unknown) =>
    value === null || value === undefined ? "" : String(value).trim();
  const same = (a?: unknown, b?: unknown) =>
    text(a).toLowerCase() === text(b).toLowerCase();

  /**
   * Two different shapes reach this component: the editor's draft
   * (`PrescriptionDetailsValue` — `diagnosis`, `systemExamNotes`, vitals as
   * `bpSys`/`bpDia`/`temperatureC`) and the saved report card from the API
   * (`finalDiagnosis`, `systemExamination`, vitals as `bp`/`temperature`).
   *
   * Reading only the API names is what limited this band to a couple of rows —
   * a filled-in BP, temperature and SpO₂ all resolved to `undefined` and only
   * `pulse`, whose name happens to match in both shapes, came through. Each
   * field is now read through its aliases.
   */
  // Missing entirely is just the empty case — the band still renders its header
  // so the bar it shares with the action buttons never collapses to a bare
  // button row with no idea what it belongs to.
  const card = (reportCard ?? {}) as Record<string, any>;
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const found = text(card[key]);
      if (found) return found;
    }
    return "";
  };
  const list = (...keys: string[]) => {
    for (const key of keys) {
      const found = toArray(card[key]).map(text).filter(Boolean);
      if (found.length > 0) return found;
    }
    return [] as string[];
  };

  const vitals = (card.vitals ?? {}) as Record<string, any>;
  const vital = (...keys: string[]) => {
    for (const key of keys) {
      const found = text(vitals[key]);
      if (found) return found;
    }
    return "";
  };

  const provisionalDiagnosis = pick("provisionalDiagnosis");
  const differentialDiagnosis = pick("differentialDiagnosis");
  const finalDiagnosis = pick("finalDiagnosis", "diagnosis");
  const systemExamination = pick("systemExamination", "systemExamNotes");
  const investigations = pick("investigations");
  const clinicalNotes = pick("clinicalNotes");
  const followUpDate = pick("followUpDate", "followUpOn");
  const followUpInDays = pick("followUpInDays", "followUpDays");

  const comorbidities = list("comorbidities");
  const habits = list("habits");
  const allergies = list("allergies");
  const generalExamination = list("generalExamination", "generalFindings");
  const visitingDays = list("visitingDays");

  // The editor stores systolic and diastolic separately; the saved card stores
  // the "120/80" string it was rendered into.
  const bp =
    pick("bp") ||
    [vital("bp"), [vital("bpSys"), vital("bpDia")].filter(Boolean).join("/")]
      .filter(Boolean)
      .join("") ||
    "";
  const vitalsText = [
    bp ? `BP ${bp}` : "",
    vital("pulse") ? `Pulse ${vital("pulse")}` : "",
    vital("spo2") ? `SpO₂ ${vital("spo2")}%` : "",
    vital("temperature", "temperatureC")
      ? `Temp ${vital("temperature", "temperatureC")}°`
      : "",
    vital("heightCm") ? `Ht ${vital("heightCm")}cm` : "",
    vital("weightKg") ? `Wt ${vital("weightKg")}kg` : "",
    vital("bmi") ? `BMI ${vital("bmi")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  /**
   * Advice and follow-up used to be withheld here and given their own closing
   * note bar, which sat below the whole medicine table — so the two most
   * patient-facing fields were the ones a doctor was least likely to see. They
   * live in this band with everything else now.
   */
  const advice = text(adviceText) || pick("advice");
  const hasFollowUp = Boolean(followUpInDays || followUpDate);

  const formatFollowUp = () => {
    if (followUpDate) {
      const d = new Date(followUpDate);
      if (!Number.isNaN(d.getTime()))
        return d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      return followUpDate;
    }
    if (followUpInDays) return `After ${followUpInDays} days`;
    return null;
  };

  /**
   * Every field the doctor filled in gets its own entry.
   *
   * This used to collapse pairs of fields into one slot — investigations and
   * clinical notes shared one (`investigations || clinicalNotes`), as did
   * provisional and final diagnosis — so filling in both showed only one. The
   * examination fields were not rendered at all.
   *
   * `text` is the plain-text form of the value, used only to decide whether the
   * item needs a full-width row — the rendered `value` may be styled markup.
   */
  const items: Array<{
    label: string;
    value: React.ReactNode;
    text: string;
  }> = [];
  const add = (label: string, plain: string, value?: React.ReactNode) => {
    if (!plain) return;
    items.push({ label, value: value ?? plain, text: plain });
  };

  // Ordered the way a consultation is read: what was measured, what the patient
  // reported, what was found, what it is, then what to do about it.
  add("Vitals", vitalsText);

  const complaintDuration = pick("chiefComplaintDuration");
  const complaint = pick("chiefComplaint");
  add(
    "Complaint",
    complaint && complaintDuration
      ? `${complaint} (${complaintDuration})`
      : complaint,
  );
  add("Other complaints", pick("otherComplaints"));

  add(
    "Allergies",
    allergies.join(", "),
    <span className="font-semibold text-warning">{allergies.join(", ")}</span>,
  );
  add("History", [pick("history"), ...comorbidities, ...habits].filter(Boolean).join(", "));

  const pregnancy = pick("pregnancyStatus");
  add("Pregnancy", pregnancy && pregnancy.toUpperCase() !== "NA" ? pregnancy : "");

  add("Gen. exam", generalExamination.join(", "));
  add("Sys. exam", systemExamination);

  add("Diagnosis", finalDiagnosis);
  // A provisional diagnosis only earns its own row once a *different* final one
  // has superseded it. Carrying both unconditionally printed the same long list
  // twice, which is what made this band look padded with duplicate text.
  if (!same(provisionalDiagnosis, finalDiagnosis))
    add(
      finalDiagnosis ? "Provisional" : "Diagnosis",
      provisionalDiagnosis,
    );
  if (
    !same(differentialDiagnosis, finalDiagnosis) &&
    !same(differentialDiagnosis, provisionalDiagnosis)
  )
    add("Differential", differentialDiagnosis);

  add("Investigations", investigations);
  add("Surgery", pick("surgerySuggested"));
  add("Diet", clinicalNotes);
  add("Notes", pick("notes"));
  add("Advice", advice);

  if (hasFollowUp) {
    const followUp = formatFollowUp() ?? "";
    add(
      "Next visit",
      followUp,
      <span className="font-semibold text-primary">{followUp}</span>,
    );
  }
  // Visiting days arrive as ISO strings from the API and as already-formatted
  // labels from the editor's chips, so format only what parses as a date.
  add(
    "Visits",
    visitingDays
      .map((day) => {
        const parsed = new Date(day);
        return Number.isNaN(parsed.getTime())
          ? day
          : parsed.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            });
      })
      .join(", "),
  );
  add("Visit notes", pick("visitingNotes"));

  return (
    <div
      className={
        bare
          ? ""
          : "rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-sm"
      }
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/10">
          <FiFileText className="h-3 w-3 text-primary" />
        </span>
        <span className="text-[13px] font-bold text-text">Clinical Summary</span>

        {patient?.name && (
          <span className="ml-auto truncate text-[11px] text-text-muted">
            {patient.name}
            {patient.age ? `, ${patient.age}y` : ""}
            {patient.gender ? ` / ${patient.gender}` : ""}
          </span>
        )}

        {onEdit && (
          <Tooltip content="Edit clinical details" placement="top">
            <Button
              isIconOnly
              radius="sm"
              variant="bordered"
              className={`${patient?.name ? "" : "ml-auto "}h-10 w-10 min-w-10 shrink-0 rounded-lg border-line text-text-muted hover:text-primary lg:h-8 lg:w-8 lg:min-w-8`}
              onPress={onEdit}
              isDisabled={isEditDisabled}
              aria-label="Edit clinical details"
            >
              <FiEdit2 className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Nothing recorded is a state worth showing, not a reason to disappear:
          a doctor looking at this bar needs to be able to tell "no clinical
          details were entered" apart from "the summary failed to load". */}
      {items.length === 0 && (
        <p className="text-[13px] leading-5 text-text-muted">
          No clinical details recorded yet.
        </p>
      )}

      {/* Short facts sit two-per-row so each row carries two of them instead of
          one and a strip of whitespace; only values long enough to wrap claim
          the full width. */}
      <div className="grid gap-x-6 gap-y-1 lg:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={
              item.text.length > WIDE_VALUE_CHARS
                ? "min-w-0 lg:col-span-2"
                : "min-w-0"
            }
          >
            <Item label={item.label} value={item.value} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrescriptionPreviewSummary;
