import { useDisclosure } from "@heroui/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetDoctorPreferencesQuery } from "../../redux/api/medicineApi";
import { useUpdateDoctorPreferencesMutation } from "../../redux/api/prescriptionPreferenceApi";
import ComplaintsSection from "./details/ComplaintsSection";
import {
  DEFAULT_ALLERGIES,
  DEFAULT_DIET_SUGGESTIONS_LIST,
  DEFAULT_HABITS,
  DEFAULT_PROVISIONAL_DIAG,
  DEFAULT_SURGERY_SUGGESTED,
  type VitalErrors,
} from "./details/constants";
import {
  calcBmi,
  addDaysFromTodayDateKey,
  buildSectionSummaries,
  extractDoctorPreferences,
  getValidHeaderOrder,
  getValidList,
  normalizeVitals,
  splitChips,
  uniq,
  validateVital,
  withDefaults,
} from "./details/helpers";
import PrescriptionDetailsForm from "./details/PrescriptionDetailsForm";
import PrescriptionDetailsPanel from "./details/PrescriptionDetailsPanel";
import VitalsDrawer from "./details/VitalsDrawer";
import {
  emptyPrescriptionDetails,
  type DoctorPreferencesApiShape,
  type DoctorPreferencesResult,
  type PrescriptionDetailsProps,
  type PrescriptionDetailsValue,
  type Vitals,
} from "./details/types";

// Public API kept here so existing imports do not need to move.
// eslint-disable-next-line react-refresh/only-export-components
export { emptyPrescriptionDetails } from "./details/types";
export type { PrescriptionDetailsValue, Vitals } from "./details/types";

const MAX_ALLERGIES = 5;
const MAX_SURGERIES = 2;

const createVitalErrors = (): VitalErrors => ({
  bpSys: null,
  bpDia: null,
  pulse: null,
  spo2: null,
  temperatureC: null,
  heightCm: null,
  weightKg: null,
});

const getValidatedVitals = (vitals: Vitals): VitalErrors => ({
  bpSys: validateVital("bpSys", vitals.bpSys),
  bpDia: validateVital("bpDia", vitals.bpDia),
  pulse: validateVital("pulse", vitals.pulse),
  spo2: validateVital("spo2", vitals.spo2),
  temperatureC: validateVital("temperatureC", vitals.temperatureC),
  heightCm: validateVital("heightCm", vitals.heightCm),
  weightKg: validateVital("weightKg", vitals.weightKg),
});

const PrescriptionDetails: React.FC<PrescriptionDetailsProps> = ({
  value,
  defaultValue,
  onChange,
  className,
  variant = "all",
  layout,
  disabled = false,
  disabledTooltip,
  onAddTest,
  addedTests = [],
  doctorId,
  previewPreferences,
  hidePreferenceShortcut = false,
  allowParentScroll = false,
}) => {
  const isLocked = !!disabled;
  const lockMessage = disabledTooltip || "Please confirm appointment first";

  const initial = useMemo(
    () => withDefaults(value ?? defaultValue ?? emptyPrescriptionDetails),
    [value, defaultValue],
  );

  const [draft, setDraft] = useState<PrescriptionDetailsValue>(initial);
  const [showDietSuggestions, setShowDietSuggestions] = useState(false);
  const [vitalsTemp, setVitalsTemp] = useState<Vitals>(draft.vitals);
  const [vitalErrors, setVitalErrors] =
    useState<VitalErrors>(createVitalErrors);

  const vitalsModal = useDisclosure();
  const navigate = useNavigate();

  const showComplaints = variant === "all" || variant === "complaintsOnly";
  const showRest = variant === "all" || variant === "withoutComplaints";

  const resolvedLayout: "form" | "panel" =
    layout ?? (variant === "withoutComplaints" ? "panel" : "form");

  const showPreferenceShortcut =
    resolvedLayout === "panel" && !previewPreferences && !hidePreferenceShortcut;

  const normalizedDoctorId = String(doctorId ?? "").trim();

  const { data: doctorPreferencesData } = useGetDoctorPreferencesQuery(
    normalizedDoctorId,
    {
      skip: !normalizedDoctorId || !!previewPreferences,
      refetchOnMountOrArgChange: true,
    },
  );

  const doctorPreferences = useMemo(
    () =>
      extractDoctorPreferences(
        doctorPreferencesData as DoctorPreferencesApiShape,
      ),
    [doctorPreferencesData],
  );

  const effectiveDoctorPreferences = useMemo<
    DoctorPreferencesResult | undefined
  >(() => {
    if (!previewPreferences) return doctorPreferences;

    return {
      ...(doctorPreferences ?? {}),
      headerOrder:
        previewPreferences.headerOrder ?? doctorPreferences?.headerOrder,
      habitList: previewPreferences.habitList ?? doctorPreferences?.habitList,
      allergyList:
        previewPreferences.allergyList ?? doctorPreferences?.allergyList,
      diagnosisList:
        previewPreferences.diagnosisList ?? doctorPreferences?.diagnosisList,
      surgerySuggestedList:
        previewPreferences.surgerySuggestedList ??
        doctorPreferences?.surgerySuggestedList,
      dietarySuggestionsList:
        previewPreferences.dietarySuggestionsList ??
        doctorPreferences?.dietarySuggestionsList,
      followUpDays:
        previewPreferences.followUpDays ?? doctorPreferences?.followUpDays,
      followupDays:
        previewPreferences.followupDays ?? doctorPreferences?.followupDays,
    };
  }, [doctorPreferences, previewPreferences]);

  const habitsOptions = useMemo(
    () => getValidList(effectiveDoctorPreferences?.habitList, DEFAULT_HABITS),
    [effectiveDoctorPreferences],
  );

  const allergyOptions = useMemo(
    () =>
      getValidList(effectiveDoctorPreferences?.allergyList, DEFAULT_ALLERGIES),
    [effectiveDoctorPreferences],
  );

  const diagnosisOptions = useMemo(
    () =>
      getValidList(
        effectiveDoctorPreferences?.diagnosisList,
        DEFAULT_PROVISIONAL_DIAG,
      ),
    [effectiveDoctorPreferences],
  );

  const surgeryOptions = useMemo(
    () =>
      getValidList(
        effectiveDoctorPreferences?.surgerySuggestedList,
        DEFAULT_SURGERY_SUGGESTED,
      ),
    [effectiveDoctorPreferences],
  );

  const dietarySuggestionsOptions = useMemo(
    () =>
      getValidList(
        effectiveDoctorPreferences?.dietarySuggestionsList,
        DEFAULT_DIET_SUGGESTIONS_LIST,
      ),
    [effectiveDoctorPreferences],
  );


  const panelHeaderOrder = useMemo(
    () => getValidHeaderOrder(effectiveDoctorPreferences?.headerOrder),
    [effectiveDoctorPreferences],
  );

  /* ============ SAVE A CUSTOM SUGGESTION FOR NEXT TIME ============ */

  const [updateDoctorPreferences] = useUpdateDoctorPreferencesMutation();
  const { data: me } = useGetUserQuery();

  /**
   * The backend's preference route is doctor-only (`requireDoctor`), so a
   * receptionist or admin filling the form in on a doctor's behalf is not
   * offered the toggle at all rather than being shown one that 403s.
   */
  const canSaveSuggestions = useMemo(() => {
    if (!normalizedDoctorId || previewPreferences) return false;
    const raw = (me as any) ?? {};
    const doc = raw.result ?? raw.data ?? raw;
    const role = String(doc?.userType ?? raw?.userType ?? "").toLowerCase();
    return role === "doctor";
  }, [me, normalizedDoctorId, previewPreferences]);

  const currentLists = useMemo(
    () => ({
      habitList: habitsOptions,
      allergyList: allergyOptions,
      diagnosisList: diagnosisOptions,
      surgerySuggestedList: surgeryOptions,
      dietarySuggestionsList: dietarySuggestionsOptions,
    }),
    [
      habitsOptions,
      allergyOptions,
      diagnosisOptions,
      surgeryOptions,
      dietarySuggestionsOptions,
    ],
  );

  const saveSuggestions = useCallback(
    async (
      listKey: keyof typeof currentLists,
      values: string[],
    ): Promise<boolean> => {
      if (!canSaveSuggestions) return false;

      const existing = currentLists[listKey] ?? [];
      const additions = values
        .map((v) => v.trim())
        .filter(
          (v) =>
            v &&
            !existing.some((item) => item.toLowerCase() === v.toLowerCase()),
        );

      // Already on the list: the doctor's intent is satisfied, so report success
      // rather than firing a write that changes nothing.
      if (additions.length === 0) return true;

      try {
        // Only the one list is sent. The route upserts with a partial `set`, so
        // the doctor's other lists and their header order are left untouched.
        await updateDoctorPreferences({
          doctorId: normalizedDoctorId,
          data: { [listKey]: uniq([...existing, ...additions]) },
        }).unwrap();
        return true;
      } catch {
        return false;
      }
    },
    [
      canSaveSuggestions,
      currentLists,
      normalizedDoctorId,
      updateDoctorPreferences,
    ],
  );

  const filterHiddenSections = useCallback(
    (data: PrescriptionDetailsValue): PrescriptionDetailsValue => {
      if (
        resolvedLayout !== "panel" ||
        !panelHeaderOrder ||
        panelHeaderOrder.length === 0
      ) {
        return data;
      }

      const filtered = { ...data };
      const visibleSections = new Set(panelHeaderOrder);

      if (!visibleSections.has("Habits")) filtered.habits = [];
      if (!visibleSections.has("Allergy")) filtered.allergies = "";
      if (!visibleSections.has("Diagnosis")) filtered.provisionalDiagnosis = "";
      if (!visibleSections.has("Surgery Suggested")) {
        filtered.surgerySuggested = "";
      }
      if (!visibleSections.has("Advice")) filtered.advice = "";
      if (!visibleSections.has("Dietary Suggestions")) {
        filtered.clinicalNotes = "";
      }
      if (!visibleSections.has("Visiting Days")) {
        filtered.visitingDays = [];
        filtered.visitingNotes = "";
      }

      if (!visibleSections.has("Follow-Up (days)")) {
        filtered.followUpDays = null;
        filtered.followUpDate = "";
      }

      return filtered;
    },
    [resolvedLayout, panelHeaderOrder],
  );

  useEffect(() => { }, [
    normalizedDoctorId,
    doctorPreferencesData,
    doctorPreferences,
    habitsOptions,
    allergyOptions,
    diagnosisOptions,
    surgeryOptions,
  ]);
  const apiFollowUpDays = useMemo(() => {
    const raw =
      effectiveDoctorPreferences?.followUpDays ??
      effectiveDoctorPreferences?.followupDays ??
      null;

    if (raw == null) return null;

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [effectiveDoctorPreferences]);
  // useEffect(() => {
  //   setDraft(withDefaults(value ?? defaultValue ?? emptyPrescriptionDetails));
  // }, [value, defaultValue]);

  useEffect(() => {
    const newValue = withDefaults(
      value ?? defaultValue ?? emptyPrescriptionDetails,
    );
    const filtered = filterHiddenSections(newValue);

    setDraft((prev) => {
      if (JSON.stringify(filtered) === JSON.stringify(prev)) return prev;

      onChange?.(filtered);
      return filtered;
    });
  }, [value, defaultValue, filterHiddenSections, onChange]);

  useEffect(() => {
    if (isLocked) return;

    const bmi = calcBmi(draft.vitals.heightCm, draft.vitals.weightKg);
    if (bmi !== draft.vitals.bmi) {
      const next = { ...draft, vitals: { ...draft.vitals, bmi } };
      setDraft(next);
      onChange?.(next);
    }
  }, [draft, isLocked, onChange]);

  useEffect(() => {
    if (isLocked || !apiFollowUpDays) return;

    setDraft((prev) => {
      if (prev.followUpDays && prev.followUpDays > 0) return prev;
      const next = { ...prev, followUpDays: apiFollowUpDays };
      onChange?.(next);
      return next;
    });
  }, [apiFollowUpDays, isLocked, onChange]);

  useEffect(() => {
    if (isLocked) return;

    setDraft((prev) => {
      if (prev.followUpDays && prev.followUpDays > 0) {
        const yyyyMmDd = addDaysFromTodayDateKey(prev.followUpDays);

        if (prev.followUpDate === yyyyMmDd) return prev;

        const next = { ...prev, followUpDate: yyyyMmDd };
        onChange?.(next);
        return next;
      }

      if (prev.followUpDate === "") return prev;

      const next = { ...prev, followUpDate: "" };
      onChange?.(next);
      return next;
    });
  }, [draft.followUpDays, isLocked, onChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDietSuggestions) {
        const target = event.target as HTMLElement;
        if (!target.closest(".diet-suggestions-container")) {
          setShowDietSuggestions(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDietSuggestions]);

  useEffect(() => {
    if (resolvedLayout !== "panel" || panelHeaderOrder.length === 0) return;

    setDraft((prev) => {
      const filtered = filterHiddenSections(prev);
      if (JSON.stringify(filtered) === JSON.stringify(prev)) return prev;
      onChange?.(filtered);
      return filtered;
    });
  }, [panelHeaderOrder, resolvedLayout, filterHiddenSections, onChange]);

  const commit = useCallback(
    (next: PrescriptionDetailsValue) => {
      if (isLocked) return;

      const filteredNext = filterHiddenSections(next);
      setDraft(filteredNext);
      onChange?.(filteredNext);
    },
    [isLocked, filterHiddenSections, onChange],
  );

  // const upd = <K extends keyof PrescriptionDetailsValue>(
  //   key: K,
  //   val: PrescriptionDetailsValue[K]
  // ) => {
  //   commit({ ...draft, [key]: val });
  // };

  const [hasUserEdited, setHasUserEdited] = useState(false);
  const upd = useCallback(
    <K extends keyof PrescriptionDetailsValue>(
      key: K,
      val: PrescriptionDetailsValue[K],
    ) => {
      if (key === "followUpDays") {
        const days = Number(val);
        const followUpDate =
          Number.isFinite(days) && days > 0
            ? addDaysFromTodayDateKey(days)
            : "";

        commit({
          ...draft,
          followUpDays: (Number.isFinite(days) && days > 0
            ? days
            : null) as PrescriptionDetailsValue["followUpDays"],
          followUpDate,
        });
        return;
      }

      if (key === "provisionalDiagnosis") {
        // A loaded report card mirrors the provisional diagnosis into
        // `diagnosis` (saved as `finalDiagnosis`), which is what the summary
        // prints. The chip row lists both fields, so it owns both — prune the
        // mirror too, or a removed diagnosis keeps showing.
        const nextProvisional = splitChips(val as string);
        const keptFinal = splitChips(draft.diagnosis ?? "").filter((d) =>
          nextProvisional.some((p) => p.toLowerCase() === d.toLowerCase()),
        );

        commit({
          ...draft,
          provisionalDiagnosis: val as string,
          diagnosis: keptFinal.join(", "),
        });
        return;
      }

      commit({ ...draft, [key]: val });
    },
    [draft, commit],
  );

  // Only sync from props if user hasn't edited
  useEffect(() => {
    if (hasUserEdited) return; // Don't overwrite user changes

    const newValue = withDefaults(
      value ?? defaultValue ?? emptyPrescriptionDetails,
    );
    const filtered = filterHiddenSections(newValue);
    setDraft(filtered);
    if (JSON.stringify(filtered) !== JSON.stringify(draft)) {
      onChange?.(filtered);
    }
  }, [value, defaultValue, filterHiddenSections, onChange, hasUserEdited]);

  // const upd = useCallback(<K extends keyof PrescriptionDetailsValue>(
  //   key: K,
  //   val: PrescriptionDetailsValue[K]
  // ) => {
  //   const updated = { ...draft, [key]: val };
  //   commit(updated);
  // }, [draft, commit])

  const toggleStrIn = (arr: string[], item: string) => {
    const has = arr.some((x) => x.toLowerCase() === item.toLowerCase());
    return has
      ? arr.filter((x) => x.toLowerCase() !== item.toLowerCase())
      : [...arr, item];
  };

  useEffect(() => {
    // Clean up hidden section data when panel layout and header order changes
    if (resolvedLayout === "panel" && panelHeaderOrder.length > 0) {
      const filtered = filterHiddenSections(draft);
      if (JSON.stringify(filtered) !== JSON.stringify(draft)) {
        setDraft(filtered);
        onChange?.(filtered);
      }
    }
  }, [panelHeaderOrder, resolvedLayout, filterHiddenSections, draft, onChange]);

  const vitalsChips = useMemo(() => {
    const v = draft.vitals || {};
    const out: string[] = [];

    if (v.bpSys != null) {
      out.push(`BP: ${v.bpSys}${v.bpDia != null ? `/${v.bpDia}` : ""}`);
    }

    if (v.temperatureC != null) {
      const f = (Number(v.temperatureC) * 9) / 5 + 32;
      out.push(`Temperature: ${f.toFixed(1)} °F`);
    }

    if (v.spo2 != null) out.push(`SpO₂: ${v.spo2} %`);
    if (v.pulse != null) out.push(`Pulse: ${v.pulse}`);
    if (v.weightKg != null) out.push(`Weight: ${v.weightKg} kg`);

    return out;
  }, [draft.vitals]);

  const allergyChips = useMemo(
    () => uniq(splitChips(draft.allergies)).slice(0, MAX_ALLERGIES),
    [draft.allergies],
  );

  const setAllergyChips = useCallback(
    (chips: string[]) => {
      upd("allergies", chips.join(", "));
    },
    [upd],
  );

  const toggleAllergyChip = useCallback(
    (chip: string) => {
      if (isLocked) return;

      const has = allergyChips.some(
        (x) => x.toLowerCase() === chip.toLowerCase(),
      );

      if (has) {
        setAllergyChips(
          allergyChips.filter((x) => x.toLowerCase() !== chip.toLowerCase()),
        );
        return;
      }

      if (allergyChips.length >= MAX_ALLERGIES) return;

      const next = uniq([...allergyChips, chip]).slice(0, MAX_ALLERGIES);
      setAllergyChips(next);
    },
    [allergyChips, isLocked, setAllergyChips],
  );

  /**
   * Takes the values rather than reading a shared input's state, so the chip
   * sections can each own their own free-text field.
   */
  const addAllergyValues = useCallback(
    (values: string[]) => {
      if (isLocked || values.length === 0) return;
      setAllergyChips(uniq([...allergyChips, ...values]).slice(0, MAX_ALLERGIES));
    },
    [allergyChips, isLocked, setAllergyChips],
  );

  const removeAllergyChip = useCallback(
    (chip: string) => {
      const next = allergyChips.filter(
        (x) => x.toLowerCase() !== chip.toLowerCase(),
      );
      setAllergyChips(next);
    },
    [allergyChips, setAllergyChips],
  );

  const surgeryChips = useMemo(
    () => uniq(splitChips(draft.surgerySuggested ?? "")).slice(0, MAX_SURGERIES),
    [draft.surgerySuggested],
  );

  const setSurgeryChips = useCallback(
    (chips: string[]) => {
      upd("surgerySuggested", chips.join(", "));
    },
    [upd],
  );

  const toggleSurgeryChip = useCallback(
    (chip: string) => {
      if (isLocked) return;
      const has = surgeryChips.some(
        (x) => x.toLowerCase() === chip.toLowerCase(),
      );
      const next = has
        ? surgeryChips.filter((x) => x.toLowerCase() !== chip.toLowerCase())
        : surgeryChips.length < MAX_SURGERIES
          ? [...surgeryChips, chip]
          : surgeryChips;
      setSurgeryChips(next);
    },
    [isLocked, setSurgeryChips, surgeryChips],
  );

  const addSurgeryValues = useCallback(
    (values: string[]) => {
      if (isLocked || values.length === 0) return;
      if (surgeryChips.length >= MAX_SURGERIES) return;
      setSurgeryChips(uniq([...surgeryChips, ...values]).slice(0, MAX_SURGERIES));
    },
    [isLocked, setSurgeryChips, surgeryChips],
  );

  const removeSurgeryChip = useCallback(
    (chip: string) => {
      setSurgeryChips(
        surgeryChips.filter((x) => x.toLowerCase() !== chip.toLowerCase()),
      );
    },
    [setSurgeryChips, surgeryChips],
  );

  const addVisitingDay = useCallback(
    (rawDate: string) => {
      if (!rawDate) return;
      const pickedDate = new Date(rawDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (pickedDate < today) return;

      const next = uniq([...(draft.visitingDays ?? []), rawDate]);
      upd("visitingDays", next);
    },
    [draft.visitingDays, upd],
  );

  const removeVisitingDay = useCallback(
    (day: string) => {
      upd(
        "visitingDays",
        (draft.visitingDays ?? []).filter((d) => d !== day),
      );
    },
    [draft.visitingDays, upd],
  );

  const validateVitalsTemp = useCallback(() => {
    const errors = getValidatedVitals(vitalsTemp);
    setVitalErrors(errors);
    return !Object.values(errors).some((error) => error !== null);
  }, [vitalsTemp]);

  const openVitals = useCallback(() => {
    if (isLocked) return;
    const norm = normalizeVitals(draft.vitals);
    setVitalsTemp({ ...draft.vitals, ...norm, bmi: null });
    setVitalErrors(createVitalErrors());
    vitalsModal.onOpen();
  }, [draft.vitals, isLocked, vitalsModal]);

  const autoFillVitals = useCallback(() => {
    if (isLocked) return;
    const filled = {
      ...vitalsTemp,
      bpSys: vitalsTemp.bpSys ?? 120,
      bpDia: vitalsTemp.bpDia ?? 80,
      pulse: vitalsTemp.pulse ?? 78,
      spo2: vitalsTemp.spo2 ?? 98,
      temperatureC: vitalsTemp.temperatureC ?? 37,
    };
    setVitalsTemp(filled);

    setTimeout(() => {
      setVitalErrors(getValidatedVitals(filled));
    }, 0);
  }, [isLocked, vitalsTemp]);

  const saveVitals = useCallback(() => {
    if (isLocked) return;

    const isValid = validateVitalsTemp();
    if (!isValid) return;

    const norm = normalizeVitals(vitalsTemp);
    const bmi = calcBmi(norm.heightCm, norm.weightKg);

    commit({
      ...draft,
      vitals: {
        ...draft.vitals,
        ...norm,
        bmi,
      },
    });

    vitalsModal.onClose();
  }, [commit, draft, isLocked, validateVitalsTemp, vitalsModal, vitalsTemp]);

  const sectionFilled = useMemo<Record<string, boolean>>(() => {
    const hasText = (v?: string | null) => !!(v && String(v).trim());
    return {
      "Pathology Test Name": addedTests.length > 0,
      Advice: hasText(draft.advice),
      "Dietary Suggestions": hasText(draft.clinicalNotes),
      Habits: (draft.habits ?? []).length > 0,
      Vitals: vitalsChips.length > 0,
      Allergy: allergyChips.length > 0,
      Diagnosis:
        hasText(draft.provisionalDiagnosis) || hasText(draft.diagnosis),
      "Surgery Suggested": surgeryChips.length > 0,
      "Visiting Days": (draft.visitingDays ?? []).length > 0,
      "Follow-Up (days)":
        draft.followUpDays != null || hasText(draft.followUpDate),
    };
  }, [
    addedTests.length,
    allergyChips.length,
    draft.advice,
    draft.clinicalNotes,
    draft.diagnosis,
    draft.followUpDate,
    draft.followUpDays,
    draft.habits,
    draft.provisionalDiagnosis,
    draft.visitingDays,
    surgeryChips.length,
    vitalsChips.length,
  ]);

  /**
   * Collapsed rows show what the section actually contains rather than a
   * static prompt, so the drawer can be read in one pass instead of expanding
   * ten sections to find out what is already filled in.
   */
  const sectionSummary = useMemo(
    () =>
      buildSectionSummaries({
        draft,
        addedTests,
        vitalsChips,
        allergyChips,
        surgeryChips,
      }),
    [draft, addedTests, vitalsChips, allergyChips, surgeryChips],
  );

  const filledSectionCount = useMemo(
    () =>
      panelHeaderOrder.reduce(
        (count, header) => count + (sectionFilled[header] ? 1 : 0),
        0,
      ),
    [panelHeaderOrder, sectionFilled],
  );

  return (
    <div className={["w-full ", className || ""].join(" ")}>
      {showComplaints && (
        <ComplaintsSection draft={draft} isLocked={isLocked} upd={upd} />
      )}

      {showRest && resolvedLayout === "panel" && (
        <PrescriptionDetailsPanel
          draft={draft}
          isLocked={isLocked}
          lockMessage={lockMessage}
          allowParentScroll={allowParentScroll}
          showPreferenceShortcut={showPreferenceShortcut}
          onCustomizePreferences={() =>
            navigate("/profile/prescription-preference")
          }
          filledSectionCount={filledSectionCount}
          panelHeaderOrder={panelHeaderOrder}
          sectionFilled={sectionFilled}
          sectionSummary={sectionSummary}
          addedTests={addedTests}
          onAddTest={onAddTest}
          habitsOptions={habitsOptions}
          allergyOptions={allergyOptions}
          diagnosisOptions={diagnosisOptions}
          surgeryOptions={surgeryOptions}
          dietarySuggestionsOptions={dietarySuggestionsOptions}
          vitalsChips={vitalsChips}
          allergyChips={allergyChips}
          surgeryChips={surgeryChips}
          showDietSuggestions={showDietSuggestions}
          setShowDietSuggestions={setShowDietSuggestions}
          maxAllergies={MAX_ALLERGIES}
          maxSurgeries={MAX_SURGERIES}
          upd={upd}
          openVitals={openVitals}
          toggleAllergyChip={toggleAllergyChip}
          addAllergyValues={addAllergyValues}
          removeAllergyChip={removeAllergyChip}
          toggleSurgeryChip={toggleSurgeryChip}
          addSurgeryValues={addSurgeryValues}
          removeSurgeryChip={removeSurgeryChip}
          onSaveSuggestions={canSaveSuggestions ? saveSuggestions : undefined}
          addVisitingDay={addVisitingDay}
          removeVisitingDay={removeVisitingDay}
        />
      )}

      {showRest && resolvedLayout === "form" && (
        <PrescriptionDetailsForm
          draft={draft}
          isLocked={isLocked}
          habitsOptions={habitsOptions}
          allergyOptions={allergyOptions}
          diagnosisOptions={diagnosisOptions}
          surgeryOptions={surgeryOptions}
          allergyChips={allergyChips}
          surgeryChips={surgeryChips}
          upd={upd}
          commit={commit}
          toggleAllergyChip={toggleAllergyChip}
          removeAllergyChip={removeAllergyChip}
          toggleSurgeryChip={toggleSurgeryChip}
          removeSurgeryChip={removeSurgeryChip}
        />
      )}

      <VitalsDrawer
        isOpen={vitalsModal.isOpen}
        onClose={vitalsModal.onClose}
        isLocked={isLocked}
        vitalsTemp={vitalsTemp}
        setVitalsTemp={setVitalsTemp}
        vitalErrors={vitalErrors}
        setVitalErrors={setVitalErrors}
        autoFillVitals={autoFillVitals}
        saveVitals={saveVitals}
      />
    </div>
  );
};

export default PrescriptionDetails;
