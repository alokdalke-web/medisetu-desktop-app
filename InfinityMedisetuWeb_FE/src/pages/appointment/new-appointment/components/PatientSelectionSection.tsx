import React from "react";
import { Controller, type Control, type FieldValues } from "react-hook-form";
import {
  FiSearch,
  FiX,
} from "react-icons/fi";

import { formatGender, getInitials } from "../helpers/optionMappers";
import type { PatientOption } from "../types";
import InputLabel from "../../../../components/shared/InputLabel";

const MAX_PATIENT_SEARCH_LENGTH = 60;
const MAX_PATIENT_PHONE_LENGTH = 10;

type PatientSelectionSectionProps = {
  rhfControl: Control<FieldValues, FieldValues>;
  patientFieldRef: React.RefObject<HTMLDivElement | null>;
  patientACKey: number;
  patientACOpen: boolean;
  setPatientACOpen: (open: boolean) => void;
  patientOptions: PatientOption[];
  isFetchingPatients: boolean;
  showInlineAddPatient: boolean;
  showAddPatientInEmpty: boolean;
  debouncedSearch: string;
  openAddPatient: () => void;
  handlePatientFieldKeyDownCapture: (
    e: React.KeyboardEvent<HTMLDivElement>,
  ) => void;
  onPatientInputChange: (value: unknown) => void;
  onPatientSelectionChange: (key: React.Key | null) => void;
  jiggleKey: string;
};

const capitalizeWords = (value: string) =>
  value.replace(
    /[A-Za-z]+/g,
    (word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
  );

const limitPatientInput = (value: string) => {
  const isOnlyNumber = /^\d+$/.test(value);
  if (isOnlyNumber) return value.slice(0, MAX_PATIENT_PHONE_LENGTH);
  return capitalizeWords(value).slice(0, MAX_PATIENT_SEARCH_LENGTH);
};

const getPatientDisplayName = (option: PatientOption | null) => {
  if (!option) return "";
  const dataName = String(option.data?.name ?? "").trim();
  if (dataName) return dataName;
  return String(option.label ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
};

const getPatientPhone = (option: PatientOption | null) => {
  if (!option) return "";
  const dataPhone = String(
    option.data?.mobile ?? option.data?.phoneNumber ?? "",
  ).trim();
  if (dataPhone) return dataPhone;
  const labelPhone = String(option.label ?? "").match(/\(([^)]*)\)/)?.[1];
  return String(labelPhone ?? "").trim();
};

const getPatientAge = (option: PatientOption | null) => {
  const age = option?.data?.age;
  if (age == null || String(age).trim() === "") return "";
  return `${age} Years`;
};

const getPatientLastVisit = (option: PatientOption | null) => {
  const raw =
    option?.data?.lastVisit ??
    option?.data?.lastVisitDate ??
    option?.data?.lastAppointmentDate;
  if (!raw) return "No visit";
  const value = String(raw).trim();
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return value.split("T")[0].split(" ")[0] || "No visit";
};

const avatarTones = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
];

const PatientSelectionSection: React.FC<PatientSelectionSectionProps> = ({
  rhfControl,
  patientFieldRef,
  patientACOpen,
  setPatientACOpen,
  patientOptions,
  isFetchingPatients,
  debouncedSearch,
  openAddPatient,
  handlePatientFieldKeyDownCapture,
  onPatientInputChange,
  onPatientSelectionChange,
  jiggleKey,
}) => {
  const [inputValue, setInputValue] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  // Reset highlight whenever the option set changes
  React.useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedSearch, patientOptions.length]);

  // Keep highlighted item scrolled into view
  React.useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!patientACOpen) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setPatientACOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [patientACOpen, setPatientACOpen]);

  return (
    <Controller
      control={rhfControl}
      name="patientSelect"
      render={({ field, fieldState }) => {
        const selectedKey = field.value ? String(field.value) : null;
        const selectedOption = selectedKey
          ? patientOptions.find((o) => String(o.value) === selectedKey) ?? null
          : null;

        const commitSelect = (option: PatientOption) => {
          const id = String(option.value);
          field.onChange(id);
          onPatientSelectionChange(id);
          setInputValue("");
          setActiveIndex(-1);
          setPatientACOpen(false);
        };

        const clearSelection = () => {
          field.onChange("");
          onPatientSelectionChange(null);
          onPatientInputChange("");
          setInputValue("");
          setActiveIndex(-1);
          setPatientACOpen(true);
          window.setTimeout(() => inputRef.current?.focus(), 60);
        };

        const handleInput = (raw: string) => {
          const next = limitPatientInput(raw);
          setInputValue(next);
          onPatientInputChange(next);
          setActiveIndex(-1);
          if (next.trim()) setPatientACOpen(true);
          else setPatientACOpen(false);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          // Alt+N etc. handled by parent capture handler
          if (e.altKey || e.ctrlKey || e.metaKey) return;

          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!patientACOpen) setPatientACOpen(true);
            setActiveIndex((i) =>
              patientOptions.length === 0
                ? -1
                : Math.min(i + 1, patientOptions.length - 1),
            );
            return;
          }

          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
            return;
          }

          if (e.key === "Enter") {
            e.preventDefault();
            // Explicitly highlighted item → select it
            if (activeIndex >= 0 && patientOptions[activeIndex]) {
              commitSelect(patientOptions[activeIndex]);
              return;
            }
            // No highlight + no results → quick add
            if (patientOptions.length === 0 && debouncedSearch.trim()) {
              openAddPatient();
              return;
            }
            // No highlight but results exist → keep dropdown open, do nothing
            return;
          }

          if (e.key === "Escape") {
            setPatientACOpen(false);
            setActiveIndex(-1);
          }
        };

        const isOpen = patientACOpen && !selectedOption;
        const showResults = patientOptions.length > 0;
        const showEmpty =
          !isFetchingPatients &&
          !showResults &&
          !!debouncedSearch.trim();

        /* ---------------- Selected patient card ---------------- */
        if (selectedOption) {
          const name = getPatientDisplayName(selectedOption);
          const phone = getPatientPhone(selectedOption);
          const gender = formatGender(selectedOption.data?.gender);
          const age = getPatientAge(selectedOption);
          const relationship = selectedOption.data?.relationship as string | undefined;
          const metaString = [phone, gender, age].filter(Boolean).join(" • ");

          return (
            <div ref={patientFieldRef} className="min-w-0">
              <div className="mb-1.5 flex h-5 items-center">
                <InputLabel label="Select Patient" />
              </div>

              <div className="h-10 rounded-lg border border-slate-200 bg-white px-3 flex items-center justify-between shadow-sm dark:border-[#273244] dark:bg-[#111726]">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-emerald-50 text-[10px] font-bold text-teal-700 dark:from-teal-900/50 dark:to-emerald-900/30 dark:text-teal-300">
                    {getInitials(name)}
                  </div>
                  <div className="min-w-0 flex-1 flex items-baseline gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">
                      {name}
                    </span>
                    {relationship && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-violet-50 px-1 text-[9px] font-medium capitalize text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                        {relationship}
                      </span>
                    )}
                    <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      ({metaString})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearSelection}
                  className="shrink-0 text-[12px] font-semibold text-primary hover:text-teal-800 dark:text-[#46beae]"
                >
                  Change
                </button>
              </div>

              {fieldState.error?.message && (
                <p className="mt-1 text-[12px] text-rose-600 dark:text-rose-400">
                  {String(fieldState.error.message)}
                </p>
              )}
            </div>
          );
        }

        /* ---------------- Search combobox ---------------- */
        return (
          <div
            ref={(node) => {
              rootRef.current = node;
              patientFieldRef.current = node;
            }}
            onKeyDownCapture={handlePatientFieldKeyDownCapture}
            className={[
              "relative min-w-0",
              jiggleKey === "patientSelect" ? "jiggle-anim" : "",
            ].join(" ")}
          >
            <div className="mb-1.5 flex h-5 items-center">
              <InputLabel label="Select Patient" />
            </div>

            {/* Search input */}
            <div
              className={[
                "flex h-10 items-center gap-2 rounded-lg border bg-white px-3 shadow-sm transition-colors dark:bg-[#0f1728]",
                fieldState.error
                  ? "border-rose-300 ring-1 ring-rose-200 dark:border-rose-500/60"
                  : isOpen
                    ? "border-primary dark:border-[#46beae]"
                    : "border-slate-200 hover:border-slate-300 dark:border-[#38445a] dark:hover:border-[#46beae]/50",
              ].join(" ")}
              onClick={() => {
                inputRef.current?.focus();
                if (inputValue.trim() || patientOptions.length > 0) {
                  setPatientACOpen(true);
                }
              }}
            >
              <FiSearch className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={isOpen}
                aria-autocomplete="list"
                value={inputValue}
                onChange={(e) => handleInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (inputValue.trim() || patientOptions.length > 0) {
                    setPatientACOpen(true);
                  }
                }}
                placeholder={
                  isFetchingPatients && patientOptions.length === 0
                    ? "Loading patients..."
                    : "Search by patient name or phone..."
                }
                className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-400"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => handleInput("")}
                  className="shrink-0 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#1a2535]"
                  aria-label="Clear search"
                >
                  <FiX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[#273244] dark:bg-[#111726]">
                {/* Loading */}
                {isFetchingPatients && patientOptions.length === 0 && (
                  <div className="p-3 text-[12px] text-slate-500 dark:text-slate-400">
                    Loading patients...
                  </div>
                )}

                {/* Results */}
                {showResults && (
                  <div
                    ref={listRef}
                    className="max-h-[320px] overflow-y-auto p-2 [scrollbar-width:thin]"
                  >
                    <div className="px-1 pb-1.5 pt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Search Results ({patientOptions.length})
                    </div>
                    <div className="space-y-1.5">
                      {patientOptions.map((option, index) => {
                        const key = String(option.value);
                        const isActive = index === activeIndex;
                        const name = getPatientDisplayName(option);
                        const phone = getPatientPhone(option);
                        const gender = formatGender(option.data?.gender);
                        const age = getPatientAge(option);
                        const lastVisit = getPatientLastVisit(option);
                        const relationship = option.data?.relationship as
                          | string
                          | undefined;
                        const meta = [phone, gender, age].filter(Boolean);

                        return (
                          <button
                            key={key}
                            type="button"
                            data-option-index={index}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => commitSelect(option)}
                            className={[
                              "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                              isActive
                                ? "border-teal-300 bg-teal-50/80 shadow-sm dark:border-[#46beae]/60 dark:bg-[#1a3a35]"
                                : "border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/40 dark:border-[#38445a] dark:bg-[#0f1728] dark:hover:border-[#46beae]/40 dark:hover:bg-[#1a3a35]/40",
                            ].join(" ")}
                          >
                            <div
                              className={[
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                                avatarTones[index % avatarTones.length],
                              ].join(" ")}
                            >
                              {getInitials(name)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 truncate">
                                <span className="truncate text-[13px] font-bold text-slate-900 dark:text-white">
                                  {name}
                                </span>
                                {relationship && (
                                  <span className="inline-flex shrink-0 items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-700/40">
                                    {relationship}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {meta.map((item) => (
                                  <span key={item}>{item}</span>
                                ))}
                              </div>
                            </div>

                            <div className="ml-auto hidden shrink-0 text-right sm:block">
                              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                Last Visit
                              </div>
                              <div className="mt-0.5 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                {lastVisit}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {showEmpty && (
                  <div className="p-3">
                    <div className="mb-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                      No patient found
                      {debouncedSearch ? ` for "${debouncedSearch}"` : ""}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Press Enter or use the button below to add a new patient.
                    </div>
                  </div>
                )}

                {/* Hint when no search yet */}
                {!isFetchingPatients &&
                  !showResults &&
                  !debouncedSearch.trim() && (
                    <div className="p-3 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      Type a name or phone number to search…
                    </div>
                  )}

                {/* Add Patient / Add Family Member in dropdown footer */}
                <div className="border-t border-slate-100 px-3 py-2.5 dark:border-[#273244]">
                  <button
                    type="button"
                    onClick={openAddPatient}
                    className="rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-white hover:opacity-95"
                  >
                    {showResults && /^[6-9]\d{9}$/.test(debouncedSearch.trim())
                      ? "+ Add Family Member"
                      : "+ Add Patient"}
                  </button>
                </div>
              </div>
            )}

            {fieldState.error?.message && (
              <p className="mt-1 text-[12px] text-rose-600 dark:text-rose-400">
                {String(fieldState.error.message)}
              </p>
            )}
          </div>
        );
      }}
    />
  );
};

export default PatientSelectionSection;
