import React from "react";
import { FiGlobe, FiPlus } from "react-icons/fi";
import type { GlobalMedicineItem } from "../../../../../types/prescription";

export type GlobalMedicineResultsProps = {
  items: GlobalMedicineItem[];
  loading: boolean;
  error: boolean;
  showEmptyMessage: boolean;
  canEdit: boolean;
  isCreating: boolean;
  onAdd?: (item: GlobalMedicineItem) => Promise<void> | void;
  /** Rendered as the section title — differs when there are no clinic matches. */
  title: string;
  subtitle: string;
};

/**
 * Medicines found in the shared drug database but not yet saved to this clinic.
 *
 * Adding one goes through `createGlobalMedicineDirect`, which saves it to the
 * clinic first and then adds it to the prescription — a different code path
 * from clinic medicines, so these rows intentionally have no inline dose
 * editor.
 */
const GlobalMedicineResults: React.FC<GlobalMedicineResultsProps> = ({
  items,
  loading,
  error,
  showEmptyMessage,
  canEdit,
  isCreating,
  onAdd,
  title,
  subtitle,
}) => {
  const hasAnything =
    items.length > 0 || loading || error || showEmptyMessage;
  if (!hasAnything) return null;

  return (
    <section
      aria-label={title}
      className="rounded-xl border border-line bg-surface p-2"
    >
      {/* Single-line header: the icon tile plus stacked title/subtitle cost more
          vertical room than the results they label. */}
      <header className="mb-1.5 flex items-center gap-1.5 px-0.5">
        <FiGlobe className="h-3.5 w-3.5 shrink-0 text-text-subtle" />
        <h3 className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wide text-text-muted">
          {title}
          <span className="ml-1.5 font-semibold normal-case tracking-normal text-text-subtle">
            ({items.length}) · {subtitle}
          </span>
        </h3>
      </header>

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => {
            const composition = String(item.composition ?? "").trim();
            const name = item.medicine_name ?? "Medicine";
            const canAdd = canEdit && !!onAdd && !isCreating;

            return (
              <div
                key={`db-medicine-${name}-${index}`}
                className={[
                  "group flex h-full flex-col rounded-xl border border-line bg-surface px-2.5 py-2 text-left transition",
                  canEdit
                    ? "hover:border-primary/50 hover:bg-primary/5"
                    : "opacity-60",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4
                      className="truncate text-[13px] font-bold leading-5 text-text"
                      title={name}
                    >
                      {name}
                    </h4>
                    {item.manufacturer_name && (
                      <p className="truncate text-[11px] font-semibold text-text-muted">
                        {item.manufacturer_name}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      disabled={!canAdd}
                      onClick={(event) => {
                        event.stopPropagation();
                        void onAdd?.(item);
                      }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60 lg:h-8 lg:w-8"
                      aria-label={`Save ${name} to your clinic and add to prescription`}
                    >
                      <FiPlus
                        className={[
                          "h-4 w-4",
                          isCreating ? "animate-pulse" : "",
                        ].join(" ")}
                      />
                    </button>
                  )}
                </div>
                {composition && (
                  <div
                    className="mt-1.5 rounded-lg bg-surface-muted px-2 py-1 text-[11px] leading-4 text-text-muted"
                    title={`Composition: ${composition}`}
                  >
                    <span className="font-bold text-text">Composition:</span>{" "}
                    <span className="overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box]">
                      {composition}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-text-muted">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-primary" />
          <span>{items.length > 0 ? "Loading more…" : "Searching…"}</span>
        </div>
      )}

      {/* Only when the section is genuinely empty — previously this rendered
          underneath a populated grid, claiming "no matches" below five of them. */}
      {showEmptyMessage && !loading && items.length === 0 && (
        <p className="py-2 text-center text-xs font-semibold text-text-subtle">
          No matches in the drug database either.
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          Couldn’t reach the drug database.
        </p>
      )}
    </section>
  );
};

export default GlobalMedicineResults;
