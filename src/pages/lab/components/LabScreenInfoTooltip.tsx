import { useEffect, useRef, useState } from "react";
import { FiArrowRight, FiInfo, FiX } from "react-icons/fi";

type LabScreenInfoTooltipProps = {
  title: string;
  description: string;
  items?: string[];
  placement?: "top" | "right" | "bottom" | "left";
  guideSection?: string;
  linkLabel?: string;
};

export function LabScreenInfoTooltip({
  title,
  description,
  items = [],
  placement = "bottom",
  guideSection = "lab",
  linkLabel = "Read full lab guide",
}: LabScreenInfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const popoverPlacement: Record<NonNullable<LabScreenInfoTooltipProps["placement"]>, string> = {
    top: "bottom-full left-0 mb-2",
    right: "left-full top-0 ml-2",
    bottom: "left-0 top-full mt-2",
    left: "right-full top-0 mr-2",
  };

  const handleNavigateToGuide = () => {
    window.open(`/app/guidelines?section=${guideSection}`, "_blank");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={`Info: ${title}`}
        aria-expanded={isOpen}
        title="Click for tips & info"
        className={[
          "group inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200",
          isOpen
            ? "bg-primary/15 text-primary ring-2 ring-primary/20"
            : "bg-slate-100 text-slate-400 hover:bg-primary/10 hover:text-primary dark:bg-[#1e293b] dark:text-slate-400 dark:hover:bg-primary/15 dark:hover:text-primary",
        ].join(" ")}
      >
        <FiInfo size={14} />
      </button>

      {isOpen && (
        <div
          className={[
            "absolute z-50 w-[300px] sm:w-[340px]",
            popoverPlacement[placement],
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-200",
            "rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50",
            "dark:border-white/[0.06] dark:bg-[#1a2332] dark:shadow-black/40",
          ].join(" ")}
          role="dialog"
          aria-label={title}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 dark:bg-primary/20">
                <FiInfo size={12} className="text-primary" />
              </div>
              <h4 className="truncate text-[13px] font-semibold text-slate-800 dark:text-white">
                {title}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-300 dark:hover:bg-[#2d3b4e] dark:hover:text-white"
              aria-label="Close"
            >
              <FiX size={14} />
            </button>
          </div>

          <div className="max-h-[240px] overflow-y-auto px-4 py-3 [scrollbar-width:thin] dark:[scrollbar-color:#475569_transparent]">
            <ul className="space-y-2.5">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary dark:bg-primary/20">
                  1
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-snug text-slate-700 dark:text-white">
                    Overview
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-300">
                    {description}
                  </p>
                </div>
              </li>
              {items.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary dark:bg-primary/20">
                    {index + 2}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-snug text-slate-700 dark:text-white">
                      Tip {index + 1}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-300">
                      {item}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

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
}
