import React from "react";
import { FiCheck } from "react-icons/fi";
import { getInstructionSuggestions } from "./instructionSuggestions";

type InstructionSuggestionChipsProps = {
  /** Medicine form — decides which suggestion set applies. */
  form?: string | null;
  /** Current instruction text, so the matching chip can read as selected. */
  value: string;
  onSelect: (instruction: string) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Tap-to-fill instruction suggestions for the medicine currently being edited.
 *
 * Renders nothing when the form has no suggestion set, so an unrecognised form
 * shows a plain field rather than irrelevant prompts. Selecting the active chip
 * clears it again, which makes the row a toggle instead of a one-way action the
 * doctor has to undo by hand.
 */
const InstructionSuggestionChips: React.FC<InstructionSuggestionChipsProps> = ({
  form,
  value,
  onSelect,
  disabled = false,
  className = "",
}) => {
  const suggestions = getInstructionSuggestions(form);

  if (suggestions.length === 0) return null;

  const current = value.trim().toLowerCase();

  return (
    <div
      role="group"
      aria-label="Instruction suggestions"
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
    >
      {/* Naming the row matters: unlabelled pills read as filter chips or as
          the current value, when they are one-tap fills for the field above. */}
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
        Quick fill
      </span>
      {suggestions.map((suggestion) => {
        const isActive = current === suggestion.toLowerCase();

        return (
          <button
            key={suggestion}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            title={isActive ? "Tap to clear this instruction" : `Use "${suggestion}"`}
            onClick={() => onSelect(isActive ? "" : suggestion)}
            className={`inline-flex min-h-[26px] items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isActive
              ? "border-primary bg-primary font-semibold text-white"
              : "border-line/70 bg-transparent text-text-muted hover:border-primary hover:bg-primary/5 hover:text-primary"
              }`}
          >
            {isActive && <FiCheck className="h-3 w-3 shrink-0" aria-hidden="true" />}
            {suggestion}
          </button>
        );
      })}
    </div>
  );
};

export default InstructionSuggestionChips;
