import React from "react";
import { Input } from "@heroui/react";
import { FiActivity, FiX } from "react-icons/fi";

import type { ClinicSymptomItem, SymptomDraft } from "../types";

type SymptomsSectionProps = {
  hasActiveSubscription: boolean;
  symptomsBoxRef: React.RefObject<HTMLDivElement | null>;
  row: SymptomDraft | null;
  chips: SymptomDraft[];
  chipCount: number;
  maxSymptoms: number;
  limitReached: boolean;
  openSymptomId: string | null;
  setOpenSymptomId: React.Dispatch<React.SetStateAction<string | null>>;
  suggestionsById: Record<string, ClinicSymptomItem[]>;
  loadingById: Record<string, boolean>;
  activeSymptomIndex: number;
  setActiveSymptomIndex: React.Dispatch<React.SetStateAction<number>>;
  loadDefaultSymptoms: (symptomId: string) => void;
  handleSymptomSearch: (symptomId: string, raw: string) => void;
  selectSuggestion: (symptomId: string, item: ClinicSymptomItem) => void;
  updateSymptomName: (id: string, value: string) => void;
  removeSymptom: (id: string) => void;
  showLimitToast: () => void;
  commitInputToChip: () => void;
  moveFirstSymptomToChip: () => void;
};

const SymptomsSection: React.FC<SymptomsSectionProps> = ({
  hasActiveSubscription,
  symptomsBoxRef,
  row,
  chips,
  chipCount,
  maxSymptoms,
  limitReached,
  openSymptomId,
  setOpenSymptomId,
  suggestionsById,
  loadingById,
  activeSymptomIndex,
  setActiveSymptomIndex,
  loadDefaultSymptoms,
  handleSymptomSearch,
  selectSuggestion,
  updateSymptomName,
  removeSymptom,
  showLimitToast,
  commitInputToChip,
  moveFirstSymptomToChip,
}) => {
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectingRef = React.useRef(false);
  const inputWrapperRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!inputWrapperRef.current) return;
      if (!inputWrapperRef.current.contains(e.target as Node)) {
        setOpenSymptomId(null);
        setActiveSymptomIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [setOpenSymptomId, setActiveSymptomIndex]);

  if (!hasActiveSubscription || !row) return null;

  const list = suggestionsById[row.id] ?? [];
  const loading = !!loadingById[row.id];
  const isDropdownOpen = !limitReached && openSymptomId === row.id && (loading || list.length > 0);

  return (
    <section
      ref={symptomsBoxRef}
      className="mt-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4 dark:border-[#273244] dark:bg-[#111726] dark:shadow-none"
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
          <FiActivity className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Patient Symptoms</h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Enter symptoms shared by the patient (optional).
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-[#273244] dark:text-slate-400">
          {chipCount}/{maxSymptoms}
        </span>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          {/* ── Search input ── */}
          <div ref={inputWrapperRef} className="relative w-full sm:w-[260px]">
            <Input
              className="w-full"
              aria-label="Enter symptom"
              placeholder={limitReached ? "Max 10 symptoms added" : "Type a symptom…"}
              value={row.name}
              isDisabled={limitReached}
              onFocus={() => {
                if (limitReached) return;
                setOpenSymptomId(row.id);
                setActiveSymptomIndex(-1);
                const currentText = String(row.name ?? "").trim();
                if (!currentText) loadDefaultSymptoms(row.id);
              }}
              onKeyDown={(e) => {
                if (limitReached) return;
                const isOpen = openSymptomId === row.id;
                const currentList = suggestionsById[row.id] ?? [];
                if ((e.key === "ArrowDown" || e.key === "ArrowUp") && currentList.length > 0) {
                  e.preventDefault();
                  setActiveSymptomIndex((prev) => {
                    if (e.key === "ArrowDown") return prev < 0 ? 0 : Math.min(prev + 1, currentList.length - 1);
                    return prev < 0 ? currentList.length - 1 : Math.max(prev - 1, 0);
                  });
                  return;
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (isOpen && activeSymptomIndex >= 0 && currentList[activeSymptomIndex]) {
                    isSelectingRef.current = true;
                    selectSuggestion(row.id, currentList[activeSymptomIndex]);
                    moveFirstSymptomToChip();
                    return;
                  }
                  commitInputToChip();
                }
              }}
              onValueChange={(val) => {
                if (limitReached) return;
                if (isSelectingRef.current) { isSelectingRef.current = false; return; }
                updateSymptomName(row.id, val);
                setActiveSymptomIndex(-1);
                const trimmed = val.trim();
                if (!trimmed) {
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                  loadDefaultSymptoms(row.id);
                  return;
                }
                if (trimmed.length < 2) return;
                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                searchTimeoutRef.current = setTimeout(() => handleSymptomSearch(row.id, trimmed), 400);
              }}
              radius="lg"
              variant="bordered"
              classNames={{
                inputWrapper:
                  "h-10 rounded-lg border-slate-200 bg-white shadow-sm data-[hover=true]:border-slate-300 data-[focus=true]:border-primary dark:border-[#38445a] dark:bg-[#0f1728] dark:data-[hover=true]:border-[#46beae] dark:data-[focus=true]:border-[#46beae]",
                input: "h-full text-[13px] py-0 dark:text-white dark:placeholder:text-slate-500",
              }}
            />

            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-[100%] z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-[#273244] dark:bg-[#111726]">
                {loading && (
                  <div className="px-3 py-2 text-[12px] text-slate-500 dark:text-slate-400">Searching…</div>
                )}
                <div className="max-h-[260px] overflow-y-auto overscroll-contain">
                  {!loading && list.slice(0, 30).map((it, i) => {
                    const name = String(it?.name ?? "").trim();
                    const key = String(it?.id ?? it?._id ?? `${row.id}-${i}`);
                    return (
                      <button
                        key={key}
                        type="button"
                        onMouseEnter={() => setActiveSymptomIndex(i)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (limitReached) { showLimitToast(); setOpenSymptomId(null); setActiveSymptomIndex(-1); return; }
                          isSelectingRef.current = true;
                          selectSuggestion(row.id, it);
                          moveFirstSymptomToChip();
                        }}
                        className={[
                          "flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1a2535]",
                          activeSymptomIndex === i ? "bg-slate-100 dark:bg-[#1a2535]" : "",
                        ].join(" ")}
                      >
                        <span className="truncate">{name}</span>
                        {it?.status && (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-[#273244] dark:text-slate-400">
                            {String(it.status)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {chips.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-[12px] text-teal-800 dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-300"
            >
              <span className="max-w-[160px] truncate">{s.name}</span>
              <button
                type="button"
                onClick={() => removeSymptom(s.id)}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-teal-900/70 hover:bg-teal-100 dark:text-teal-400 dark:hover:bg-teal-900/40"
                title="Remove"
              >
                <FiX className="h-3 w-3" />
              </button>
            </span>
          ))}

          <button
            type="button"
            disabled={limitReached}
            onClick={() => { if (limitReached) return showLimitToast(); commitInputToChip(); }}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#38445a] dark:bg-[#0f1728] dark:text-slate-300 dark:hover:bg-[#1a2535]"
            title="Add symptom"
          >
            + Add
          </button>
        </div>

        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Type and press Enter or click + Add. Max {maxSymptoms} symptoms.
        </p>
      </div>
    </section>
  );
};

export default SymptomsSection;
