import React from "react";
import { Input } from "@heroui/react";
import { FiActivity, FiX } from "react-icons/fi";

import type { SymptomsSectionProps } from "../../../../types/appointment";
import { SPECIALITY_SYMPTOMS } from "../../../../constants/specialitySymptoms";

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
  doctorSpeciality,
  toggleSymptomByName,
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

  const recommendedSymptoms = React.useMemo(() => {
    if (!doctorSpeciality) return [];
    return (
      SPECIALITY_SYMPTOMS[doctorSpeciality] ||
      SPECIALITY_SYMPTOMS[
      Object.keys(SPECIALITY_SYMPTOMS).find(
        (k) => k.toLowerCase() === doctorSpeciality.toLowerCase()
      ) || ""
      ] ||
      []
    );
  }, [doctorSpeciality]);

  const enteredChips = chips.filter(
    (s) =>
      !recommendedSymptoms.some(
        (symptom) => symptom.toLowerCase() === s.name.trim().toLowerCase()
      )
  );

  return (
    <section
      ref={symptomsBoxRef}
      className="mt-4 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4 dark:shadow-none"
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
          <FiActivity className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-text">Patient Symptoms</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">
            Enter symptoms shared by the patient (optional).
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-text-muted dark:bg-[#273244]">
          {chipCount}/{maxSymptoms}
        </span>
      </div>

      {(recommendedSymptoms.length > 0 || enteredChips.length > 0) && (
        <div className="mb-4 rounded-xl bg-slate-50/50 p-3 border border-slate-100 dark:bg-slate-900/10 dark:border-slate-800">
          {/* <div className="mb-2 text-[12px] font-semibold text-text-subtle dark:text-slate-400">
            Recommended Symptoms:
          </div> */}
          <div className="flex flex-wrap gap-2">
            {recommendedSymptoms.map((symptom) => {
              const isSelected =
                (row && row.name.trim().toLowerCase() === symptom.toLowerCase()) ||
                chips.some((c) => c.name.trim().toLowerCase() === symptom.toLowerCase());

              return (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => toggleSymptomByName?.(symptom)}
                  className={[
                    "rounded-full px-3 py-1.5 text-[11px] font-medium dark:text-white transition-all duration-200 border cursor-pointer select-none",
                    isSelected
                      ? "bg-teal-500 border-teal-500 text-white shadow-sm dark:bg-[#46beae] dark:border-[#46beae] hover:bg-teal-600 dark:hover:bg-[#3ca89b]"
                      : "bg-white border-slate-200 text-text-muted hover:border-slate-300 hover:bg-slate-50 dark:bg-[#1e293b] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  ].join(" ")}
                >
                  {isSelected ? `✓ ${symptom}` : symptom}
                </button>
              );
            })}

            {enteredChips.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => removeSymptom(s.id)}
                title="Click to remove"
                aria-label={`Remove symptom ${s.name}`}
                className="max-w-[200px] rounded-full border border-teal-500 bg-teal-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition-all duration-200 cursor-pointer select-none hover:bg-teal-600 dark:border-[#46beae] dark:bg-[#46beae] dark:hover:bg-[#3ca89b]"
              >
                <span className="truncate">{`✓ ${s.name}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-2">
          {/* ── Search input ── */}
          <div ref={inputWrapperRef} className="relative w-full sm:w-[260px]">
            <Input
              className="w-full"
              aria-label="Enter symptom"
              role="combobox"
              aria-expanded={isDropdownOpen}
              aria-autocomplete="list"
              aria-controls="symptom-suggestions-listbox"
              aria-activedescendant={
                activeSymptomIndex >= 0 ? `symptom-option-${activeSymptomIndex}` : undefined
              }
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
                  "h-10 rounded-lg border-slate-200 bg-surface shadow-sm data-[hover=true]:border-slate-300 data-[focus=true]:border-primary dark:border-[#38445a] dark:data-[hover=true]:border-[#46beae] dark:data-[focus=true]:border-[#46beae]",
                input: "h-full text-[13px] py-0 dark:text-white dark:placeholder:text-slate-500",
              }}
            />

            {isDropdownOpen && (
              <div
                id="symptom-suggestions-listbox"
                role="listbox"
                aria-label="Symptom suggestions"
                className="absolute left-0 right-0 top-[100%] z-50 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
              >
                {loading && (
                  <div className="px-3 py-2 text-[12px] text-text-muted">Searching…</div>
                )}
                <div className="max-h-[260px] overflow-y-auto overscroll-contain">
                  {!loading && list.slice(0, 30).map((it, i) => {
                    const name = String(it?.name ?? "").trim();
                    const key = String(it?.id ?? it?._id ?? `${row.id}-${i}`);
                    return (
                      <button
                        key={key}
                        id={`symptom-option-${i}`}
                        role="option"
                        aria-selected={activeSymptomIndex === i}
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
                          "flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-text hover:bg-slate-50 dark:hover:bg-[#1a2535]",
                          activeSymptomIndex === i ? "bg-slate-100 dark:bg-[#1a2535]" : "",
                        ].join(" ")}
                      >
                        <span className="truncate">{name}</span>
                        {it?.status && (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-text-muted dark:bg-[#273244]">
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
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface px-4 text-[13px] font-medium text-text shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#1a2535]"
            title="Add symptom"
          >
            + Add
          </button>
        </div>

        <p className="mt-2 text-[11px] text-text-muted">
          Type and press Enter or click + Add. Max {maxSymptoms} symptoms.
        </p>
      </div>
    </section>
  );
};

export default SymptomsSection;


