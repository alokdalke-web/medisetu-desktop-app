import React from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import type { ClinicalDrawerProps } from "../../../../types/prescription";

/**
 * Overlay drawer for the clinical detail sections.
 *
 * Previously these sections held a permanent 3-of-12 column, so the medicine
 * table was squeezed into ~70% of the width and needed a horizontal scroll even
 * on a laptop. As an overlay the table keeps the full width at all times and
 * the drawer never reflows it — closing it is a no-op for the workspace layout.
 *
 * Closes on Escape, on backdrop click, and via the close button. Content stays
 * mounted while closed so nothing a doctor has typed is lost.
 */
const ClinicalDrawer: React.FC<ClinicalDrawerProps> = ({ open, onOpenChange, footer, headerAction, children }) => {
  React.useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <>
      {/* No floating trigger: it hovered over the workspace and sat on top of
          the medicine table's row actions. The drawer is opened from the
          toolbar button beside the history and favourite icons instead. */}

      {/* Portalled to <body> and viewport-fixed. Anchored inside the workspace
          it inherited the grid's `h-[calc(100vh-250px)]` and `overflow-hidden`,
          which cropped the drawer and pushed the sticky footer off-screen. */}
      {createPortal(
        <>
          <div
            onClick={() => onOpenChange(false)}
            aria-hidden={!open}
            className={[
              "fixed inset-0 z-[100] bg-black/25 transition-opacity duration-250",
              open ? "opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
          />

          <aside
            id="clinical-drawer"
            role="dialog"
            aria-modal="false"
            aria-label="Clinical details"
            className={[
              "fixed inset-y-0 right-0 z-[101] flex w-full flex-col bg-surface shadow-2xl",
              "transition-transform duration-250 ease-out",
              "sm:w-[420px] lg:w-[38%] lg:min-w-[420px] lg:max-w-[480px]",
              open ? "translate-x-0" : "pointer-events-none translate-x-full",
            ].join(" ")}
          >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-[14px] font-bold text-text">Clinical details</h2>

          <div className="flex shrink-0 items-center gap-1">
            {headerAction}

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close clinical details"
              className="grid h-9 w-9 place-items-center rounded-lg text-text-muted transition hover:bg-surface-muted hover:text-text lg:h-8 lg:w-8"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* min-h-0 so this scrolls inside the drawer rather than pushing the
            sticky footer past the bottom edge. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-2 [scrollbar-width:thin]">
          {children}
        </div>

            {footer && (
              <footer className="shrink-0 border-t border-line bg-surface px-4 py-3">
                {footer}
              </footer>
            )}
          </aside>
        </>,
        document.body,
      )}
    </>
  );
};

export default ClinicalDrawer;
