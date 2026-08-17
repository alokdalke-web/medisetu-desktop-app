import { Input } from "@heroui/react";
import React from "react";
import { FiCheck, FiPlus } from "react-icons/fi";
import { FIELD_CN } from "./constants";
import { splitChips } from "./helpers";

type CustomChipInputProps = {
  /** What the doctor is adding, e.g. "diagnosis" — used in the placeholder. */
  noun: string;
  disabled?: boolean;
  /** Adds the typed values to this prescription. */
  onAdd: (values: string[]) => void;
  /**
   * Persists the typed values to the doctor's own suggestion list so they turn
   * up as a chip in future consultations. Absent when the signed-in user is not
   * the doctor who owns the list, in which case no toggle is offered.
   */
  onSaveToList?: (values: string[]) => Promise<boolean>;
  /** Blocks further additions once the section's own cap is reached. */
  atLimit?: boolean;
  limitMessage?: string;
};

/**
 * Free-text entry for the chip sections.
 *
 * Diagnosis and Habits previously offered only the preset chips, so anything the
 * doctor's own list did not already contain could not be recorded at all. This
 * adds the value to the prescription and — when the doctor asks — to their saved
 * list, which is the difference between typing it once and typing it at every
 * consultation.
 */
const CustomChipInput: React.FC<CustomChipInputProps> = ({
  noun,
  disabled = false,
  onAdd,
  onSaveToList,
  atLimit = false,
  limitMessage,
}) => {
  const [value, setValue] = React.useState("");
  const [remember, setRemember] = React.useState(false);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">(
    "idle",
  );

  const isBlocked = disabled || atLimit;

  const commit = async () => {
    if (isBlocked) return;

    // Comma-separated entry is how the other sections already behave, so one
    // paste of "Anaemia, Vitamin D deficiency" adds two chips rather than one.
    const values = splitChips(value);
    if (values.length === 0) return;

    onAdd(values);
    setValue("");

    if (!remember || !onSaveToList) return;

    setSaveState("saving");
    const ok = await onSaveToList(values);
    setSaveState(ok ? "saved" : "idle");
  };

  return (
    <div className="mt-2 grid gap-1.5">
      <div className="flex items-center gap-2">
        <Input
          placeholder={
            atLimit
              ? (limitMessage ?? `Maximum ${noun} entries added`)
              : `Add other ${noun} and press Enter`
          }
          value={value}
          onValueChange={setValue}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            void commit();
          }}
          variant="bordered"
          classNames={FIELD_CN}
          isDisabled={isBlocked}
        />

        <button
          type="button"
          onClick={() => void commit()}
          disabled={isBlocked || !value.trim()}
          aria-label={`Add ${noun}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50 lg:h-9 lg:w-9"
        >
          <FiPlus className="h-4 w-4" />
        </button>
      </div>

      {onSaveToList && (
        <label
          className={[
            "inline-flex w-fit items-center gap-2 text-[11px] font-medium",
            isBlocked
              ? "cursor-not-allowed text-text-subtle"
              : "cursor-pointer text-text-muted",
          ].join(" ")}
        >
          <input
            type="checkbox"
            checked={remember}
            disabled={isBlocked}
            onChange={(e) => {
              setRemember(e.target.checked);
              setSaveState("idle");
            }}
            className="h-3.5 w-3.5 accent-[var(--color-primary)]"
          />
          Save to my list for next time
          {saveState === "saving" && <span>· saving…</span>}
          {saveState === "saved" && (
            <span className="inline-flex items-center gap-1 text-success">
              <FiCheck className="h-3 w-3" />
              saved
            </span>
          )}
        </label>
      )}
    </div>
  );
};

export default CustomChipInput;
