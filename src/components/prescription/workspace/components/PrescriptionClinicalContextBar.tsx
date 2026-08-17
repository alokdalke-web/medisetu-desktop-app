import React from "react";
import { FiActivity, FiAlertTriangle, FiTarget } from "react-icons/fi";
import type {
  ClinicalContextItemProps,
  PrescriptionClinicalContextBarProps,
} from "../../../../types/prescription";
import { splitChips } from "../../details/helpers";

/**
 * Declared at module scope, not inside the bar's render body: a component
 * defined during render is a brand-new type on every pass, so React unmounts
 * and remounts the whole subtree instead of updating it.
 */
const Item: React.FC<ClinicalContextItemProps> = ({
  icon,
  label,
  value,
  tone = "default",
}) => (
  <span
    className={[
      "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg border px-2 py-1",
      tone === "danger"
        ? "border-danger/25 bg-danger/10 text-danger"
        : tone === "warning"
          ? "border-warning/30 bg-warning/10 text-text"
          : "border-line bg-surface text-text",
    ].join(" ")}
  >
    <span className="shrink-0">{icon}</span>
    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide opacity-70">
      {label}
    </span>
    <span className="truncate text-[12px] font-semibold" title={value}>
      {value}
    </span>
  </span>
);

/**
 * Always-visible clinical context above the medicine table.
 *
 * The clinical details live in an overlay drawer, so while a doctor is
 * actually choosing drugs — the moment allergies and dosing weight matter most
 * — none of it was on screen. This strip keeps the three facts that change
 * what is safe to prescribe permanently visible, reading from the same live
 * draft the drawer edits, and acts as the shortcut back into it.
 *
 * Allergies are treated differently from the rest on purpose: an *absent*
 * allergy record is itself worth flagging before prescribing, so the strip
 * shows "Allergies not recorded" rather than staying silent. Diagnosis and
 * vitals simply disappear when empty — a missing one is not a safety event.
 */
const PrescriptionClinicalContextBar: React.FC<
  PrescriptionClinicalContextBarProps
> = ({
  details,
  onOpenClinical,
  isLocked,
}) => {
  const allergies = splitChips(details.allergies ?? "");

  const diagnosis = React.useMemo(() => {
    const provisional = splitChips(details.provisionalDiagnosis ?? "");
    return provisional.length ? provisional : splitChips(details.diagnosis ?? "");
  }, [details.provisionalDiagnosis, details.diagnosis]);

  const vitals = React.useMemo(() => {
    const v = details.vitals || {};
    const out: string[] = [];

    if (v.bpSys != null) {
      out.push(`BP ${v.bpSys}${v.bpDia != null ? `/${v.bpDia}` : ""}`);
    }
    if (v.pulse != null) out.push(`Pulse ${v.pulse}`);
    if (v.spo2 != null) out.push(`SpO₂ ${v.spo2}%`);
    if (v.temperatureC != null) {
      const f = (Number(v.temperatureC) * 9) / 5 + 32;
      out.push(`Temp ${f.toFixed(1)}°F`);
    }
    // Weight earns its place here rather than only in the drawer: it is the
    // input for paediatric and renal dosing, which is decided at exactly this
    // point in the flow.
    if (v.weightKg != null) out.push(`${v.weightKg} kg`);

    return out;
  }, [details.vitals]);

  return (
    <button
      type="button"
      onClick={onOpenClinical}
      aria-label="Open clinical details"
      className="mb-2 flex w-full flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface-muted px-2 py-1.5 text-left transition hover:border-primary/40"
    >
      {allergies.length > 0 ? (
        <Item
          icon={<FiAlertTriangle className="h-3.5 w-3.5" />}
          label="Allergies"
          value={allergies.join(", ")}
          tone="danger"
        />
      ) : (
        <Item
          icon={<FiAlertTriangle className="h-3.5 w-3.5 text-warning" />}
          label="Allergies"
          value="Not recorded"
          tone="warning"
        />
      )}

      {diagnosis.length > 0 && (
        <Item
          icon={<FiTarget className="h-3.5 w-3.5 text-primary dark:text-primary-hover" />}
          label="Dx"
          value={diagnosis.join(", ")}
        />
      )}

      {vitals.length > 0 && (
        <Item
          icon={<FiActivity className="h-3.5 w-3.5 text-primary dark:text-primary-hover" />}
          label="Vitals"
          value={vitals.join(" · ")}
        />
      )}

      {!isLocked && (
        <span className="ml-auto shrink-0 pr-1 text-[11px] font-semibold text-primary dark:text-primary-hover">
          {allergies.length || diagnosis.length || vitals.length
            ? "Edit"
            : "Add clinical details"}
        </span>
      )}
    </button>
  );
};

export default PrescriptionClinicalContextBar;
