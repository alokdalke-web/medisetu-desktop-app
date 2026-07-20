import React, { useState, useRef, useEffect } from "react";
import { FiInfo, FiArrowRight, FiX } from "react-icons/fi";

export interface InfoTipItem {
  title: string;
  description: string;
}

interface FeatureInfoTipProps {
  /** Short title shown in the popover header */
  title: string;
  /** List of tips/details to show */
  tips: InfoTipItem[];
  /** Section ID to navigate to in guidelines (e.g., "appointments-guide") */
  guideSection?: string;
  /** Custom link label */
  linkLabel?: string;
}

/**
 * A floating info icon that shows a rich popover with contextual tips
 * and a "Read full guide" link that navigates to the guidelines page.
 *
 * Uses a click-to-open popover (not hover) for better mobile UX.
 */
const FeatureInfoTip: React.FC<FeatureInfoTipProps> = ({
  title,
  tips,
  guideSection = "overview",
  linkLabel = "Read full guide",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleNavigateToGuide = () => {
    window.open(`/app/guidelines?section=${guideSection}`, "_blank");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-flex">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={[
          "group inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
          isOpen
            ? "bg-primary/15 text-primary ring-2 ring-primary/20"
            : "bg-slate-100 text-slate-400 hover:bg-primary/10 hover:text-primary dark:bg-[#1e293b] dark:text-slate-400 dark:hover:bg-primary/15 dark:hover:text-primary",
        ].join(" ")}
        aria-label={`Info: ${title}`}
        aria-expanded={isOpen}
        title="Click for tips & info"
      >
        <FiInfo size={14} />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className={[
            "absolute left-0 top-full z-50 mt-2 w-[300px] sm:w-[340px]",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-200",
            "rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50",
            "dark:border-white/[0.06] dark:bg-[#1a2332] dark:shadow-black/40",
          ].join(" ")}
          role="dialog"
          aria-label={title}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 dark:bg-primary/20">
                <FiInfo size={12} className="text-primary" />
              </div>
              <h4 className="text-[13px] font-semibold text-slate-800 dark:text-white">
                {title}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-300 dark:hover:bg-[#2d3b4e] dark:hover:text-white"
              aria-label="Close"
            >
              <FiX size={14} />
            </button>
          </div>

          {/* Tips list */}
          <div className="max-h-[240px] overflow-y-auto px-4 py-3 [scrollbar-width:thin] dark:[scrollbar-color:#475569_transparent]">
            <ul className="space-y-2.5">
              {tips.map((tip, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary dark:bg-primary/20">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-snug text-slate-700 dark:text-white">
                      {tip.title}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-300">
                      {tip.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer with guide link */}
          <div className="border-t border-slate-100 px-4 py-2.5 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={handleNavigateToGuide}
              className="group/link flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[12px] font-semibold text-primary transition hover:bg-primary/5 dark:hover:bg-primary/10"
            >
              <span>{linkLabel}</span>
              <FiArrowRight
                size={13}
                className="transition-transform group-hover/link:translate-x-0.5"
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureInfoTip;
