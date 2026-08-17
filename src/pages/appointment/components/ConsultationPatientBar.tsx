import { Button } from "@heroui/react";
import React from "react";
import { FiCheckCircle, FiChevronDown } from "react-icons/fi";
import type { ConsultationPatientBarProps } from "../../../types/appointment";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Internal UUIDs are never shown. A doctor can't read, quote or search one, so
 * a 36-character hex string is pure noise in a strip meant to be scanned in a
 * second — better to omit the field than fill it with an unusable value.
 */
const displayableId = (value?: string | null) => {
  const id = String(value ?? "").trim();
  if (!id || UUID_RE.test(id)) return "";
  return id;
};

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase() || "?";

/** One labelled field in the strip. Hidden entirely when it has no value. */
const Field: React.FC<{
  label: string;
  value?: React.ReactNode;
  tone?: "default" | "danger" | "success";
}> = ({ label, value, tone = "default" }) => {
  if (!value) return null;

  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
        {label}
      </div>
      <div
        className={[
          "truncate text-[13px] font-semibold",
          tone === "danger"
            ? "text-danger"
            : tone === "success"
              ? "text-success"
              : "text-text",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
};

/**
 * Compact patient header for consultation mode.
 *
 * The full Patient Summary / Appointment / Service cards take ~180px above the
 * fold — context a doctor wants on arriving at the appointment, but not while
 * choosing drugs. This keeps only what stays clinically relevant mid-
 * consultation on one line and moves the rest behind "View Full Details",
 * handing the reclaimed height to the medicine table.
 */
const ConsultationPatientBar: React.FC<ConsultationPatientBarProps> = ({
  name,
  avatar,
  age,
  gender,
  contact,
  visitId,
  service,
  doctorName,
  paymentStatus,
  paymentMode,
  amount,
  coveredUntil,
  onViewFullDetails,
  showMarkAsCompleted,
  onMarkAsCompleted,
  isMarkAsCompletedLoading,
  isMarkAsCompletedDisabled,
}) => {
  const ageGender = [age ? `${age} Y` : "", gender?.trim()?.[0]?.toUpperCase()]
    .filter(Boolean)
    .join("/");

  // Amount, status and mode read as one fact ("₹500 · Already Paid · Cash")
  // rather than three separate fields competing for width.
  const numericAmount = Number(amount);
  const formattedAmount = Number.isFinite(numericAmount) && numericAmount > 0
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(numericAmount)
    : "";

  /**
   * A "Covered" visit was paid for by an earlier appointment, so the useful
   * date is how long that payment still covers the patient — otherwise the
   * doctor sees "Covered" with no idea when it lapses.
   */
  const coverageNote =
    /cover/i.test(String(paymentMode ?? "")) && coveredUntil
      ? `covered till ${new Date(coveredUntil).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`
      : "";

  /**
   * Nothing is collected during a consultation, so the fee only matters when
   * it's still outstanding. Settled visits show the status alone — the amount
   * would just be a number the doctor has no action for.
   */
  const isSettled = /paid|covered|complete/i.test(
    `${paymentStatus ?? ""} ${paymentMode ?? ""}`,
  );

  /**
   * Settled visits read as "Covered" rather than "Already Paid". No money
   * changes hands during the consultation, so what the doctor needs to know is
   * simply that this visit is accounted for — with the expiry appended when the
   * cover comes from an earlier appointment.
   */
  const paymentSummary = (
    isSettled
      ? [coverageNote ? `Covered ${coverageNote.replace(/^covered /, "")}` : "Covered"]
      : [formattedAmount && `${formattedAmount} due`, paymentStatus, paymentMode]
  )
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" · ");

  return (
    /* Radius and shadow match the tabs card directly below it, so the two read
       as one piece of page chrome rather than two unrelated panels. */
    <div className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm dark:shadow-none">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">
              {initialsOf(name)}
            </span>
          )}

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[15px] font-bold leading-5 text-text">
                {name}
              </span>
              {ageGender && (
                <span className="shrink-0 text-[12px] font-medium text-text-muted">
                  {ageGender}
                </span>
              )}
            </div>
            {/* Contact rather than UHID: the internal id is a UUID a doctor
                can't read or use, while the phone number is what they actually
                need mid-consultation. */}
            {(contact || displayableId(visitId)) && (
              <div className="truncate text-[11px] font-medium text-text-subtle">
                {[contact, displayableId(visitId) && `Visit: ${displayableId(visitId)}`]
                  .filter(Boolean)
                  .join("  ·  ")}
              </div>
            )}
          </div>
        </div>

        {/* The visit facts are grouped behind a hairline rule so the patient
            (who this is) and the visit (what was booked) read as two blocks,
            instead of five equally-weighted columns strung across the strip. */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 sm:border-l sm:border-line sm:pl-5">
          <Field label="Service" value={service} />
          <Field label="Doctor" value={doctorName} />
          {/* Allergies and vitals are deliberately absent: both are carried by
              the clinical summary, and repeating them here made the strip read
              as two competing sources for the same fact. */}
          <Field label="Payment" value={paymentSummary} tone="success" />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {showMarkAsCompleted && (
            <Button
              radius="lg"
              onPress={onMarkAsCompleted}
              isDisabled={isMarkAsCompletedDisabled}
              isLoading={isMarkAsCompletedLoading}
              startContent={!isMarkAsCompletedLoading && <FiCheckCircle className="h-4 w-4 shrink-0" />}
              className="h-9 rounded-lg bg-primary px-3.5 text-[12px] font-semibold text-white shadow-sm shadow-primary/15 hover:bg-primary-hover"
            >
              Mark as Completed
            </Button>
          )}

          <button
            type="button"
            onClick={onViewFullDetails}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-[12px] font-semibold text-text shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:shadow-none"
          >
            View Full Details
            <FiChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationPatientBar;
