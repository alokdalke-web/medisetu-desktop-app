import { Tooltip } from "@heroui/react";
import React from "react";
import { FiCheck, FiPlus, FiStar } from "react-icons/fi";
import {
  extractAnyComposition,
  extractAnyForm,
  formatStrength,
} from "../../helpers/medicineMappers";

export type MedicineResultRowProps = {
  medicine: unknown;
  rowId: string;
  name: string;
  strength?: string;
  highlightedNameHtml?: string;
  /** Keyboard cursor is on this row. */
  isActive: boolean;
  alreadyAdded: boolean;
  isFavorite: boolean;
  canEdit: boolean;
  lockMessage: string;
  onActivate: () => void;
  onRemove: () => void;
  onToggleFavorite: () => void;
  onHover: () => void;
  showStock?: boolean;
  stockQuantity?: number;
  stockKnown?: boolean;
  stockLoading?: boolean;
};

/**
 * The API fills absent text with a dash or a literal "N/A" rather than leaving
 * it empty, and rendering either one costs a whole line to say nothing.
 */
const isMeaningful = (value?: string | null) => {
  const text = (value ?? "").trim();
  if (!text) return false;
  return !/^(-+|n\/?a|na|null|undefined)$/i.test(text);
};

/**
 * One medicine in the picker.
 *
 * There is exactly one action: add. The dose comes from the one-line syntax or
 * the doctor's remembered dose, and stays editable on the medicine's own card
 * afterwards — so the row carries no dose editor of its own.
 */
const MedicineResultRow: React.FC<MedicineResultRowProps> = ({
  medicine,
  rowId,
  name,
  strength,
  highlightedNameHtml,
  isActive,
  alreadyAdded,
  isFavorite,
  canEdit,
  lockMessage,
  onActivate,
  onRemove,
  onToggleFavorite,
  onHover,
  showStock = false,
  stockQuantity,
  stockKnown = false,
  stockLoading = false,
}) => {
  const strengthText = formatStrength(strength);
  // A dash/blank form is noise, not information — it used to render as a second
  // line reading "-", doubling the row height for nothing.
  const rawForm = extractAnyForm(medicine);
  const form = isMeaningful(rawForm) ? rawForm.trim() : "";
  const composition = extractAnyComposition(medicine);
  const compositionText = isMeaningful(composition) ? composition.trim() : "";
  const isClickable = canEdit && !alreadyAdded;

  const stockLabel = stockLoading
    ? "Checking pharmacy stock"
    : stockKnown
      ? `In pharmacy stock${typeof stockQuantity === "number" ? `: ${stockQuantity}` : ""}`
      : "Not in pharmacy stock";

  const stockTone = stockLoading
    ? "bg-text-subtle/20 text-text-subtle"
    : stockKnown
      ? "bg-success/15 text-success"
      : "bg-danger/15 text-danger";

  return (
    <div className="min-w-0">
      <div
        id={rowId}
        role="option"
        aria-selected={isActive}
        aria-disabled={!isClickable}
        tabIndex={-1}
        onMouseEnter={onHover}
        onClick={isClickable ? onActivate : undefined}
        className={[
          "flex min-h-[48px] items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 transition lg:min-h-[42px]",
          isClickable ? "cursor-pointer" : "",
          alreadyAdded
            ? "border-success/40 bg-success/10"
            : isActive
              ? "border-primary bg-primary/5 ring-2 ring-primary/30"
              : "border-line bg-surface hover:border-primary/40 hover:bg-primary/5",
        ].join(" ")}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            disabled={!canEdit}
            className={[
              "grid h-10 w-10 shrink-0 place-items-center rounded-full border text-xs transition lg:h-8 lg:w-8",
              isFavorite
                ? "border-warning/40 bg-warning/15 text-warning"
                : "border-line bg-surface text-text-subtle hover:border-warning/40 hover:text-warning",
              !canEdit ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
            aria-label={
              isFavorite
                ? `Remove ${name} from favourites`
                : `Add ${name} to favourites`
            }
          >
            <FiStar className={isFavorite ? "fill-current" : ""} />
          </button>

          {showStock && (
            <Tooltip content={stockLabel} placement="top">
              <span
                className={[
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full",
                  stockTone,
                ].join(" ")}
                aria-label={stockLabel}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              </span>
            </Tooltip>
          )}

          {/* Name and form share the first line, so composition below adds one
              small line rather than a third. The name never yields width: the
              form shrinks first, then drops out once the row is narrow. */}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline gap-1.5">
              <span
                className="min-w-0 flex-1 truncate text-[13px] font-bold leading-5 text-text"
                title={`${name}${strengthText ? ` ${strengthText}` : ""}`}
              >
                {highlightedNameHtml ? (
                  <span
                    dangerouslySetInnerHTML={{ __html: highlightedNameHtml }}
                  />
                ) : (
                  name
                )}
                {strengthText ? ` ${strengthText}` : ""}
              </span>
              {form && (
                <span className="hidden max-w-[38%] truncate text-[11px] font-medium text-text-muted lg:inline">
                  {form}
                </span>
              )}
            </div>
            {compositionText && (
              <div
                className="truncate text-[11px] leading-4 text-text-muted"
                title={`Composition: ${compositionText}`}
              >
                {compositionText}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          {alreadyAdded ? (
            <Tooltip content="Added — click to remove" placement="top">
              <button
                type="button"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className={[
                  "inline-flex h-10 w-10 items-center justify-center rounded-full border text-white transition lg:h-8 lg:w-8",
                  canEdit
                    ? "border-success bg-success hover:border-danger hover:bg-danger"
                    : "cursor-not-allowed border-success/50 bg-success/60 opacity-60",
                ].join(" ")}
                aria-label={`Remove ${name} from prescription`}
              >
                <FiCheck className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          ) : (
            <Tooltip
              content={
                canEdit
                  ? `Add ${name} — dose is editable on its card afterwards`
                  : lockMessage
              }
              placement="top"
            >
              <span className="inline-flex">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={(e) => {
                    e.stopPropagation();
                    onActivate();
                  }}
                  className={[
                    "grid h-10 w-10 place-items-center rounded-full border transition lg:h-8 lg:w-8",
                    canEdit
                      ? "border-primary bg-primary text-white hover:bg-primary-active"
                      : "cursor-not-allowed border-line text-text-subtle",
                  ].join(" ")}
                  aria-label={`Add ${name} to prescription`}
                >
                  <FiPlus className="h-3.5 w-3.5" />
                </button>
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicineResultRow;
