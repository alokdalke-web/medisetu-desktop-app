import React from "react";
import type {
  UseFormClearErrors,
  UseFormGetValues,
  UseFormSetValue,
} from "react-hook-form";
import type { NavigateFunction } from "react-router";

import {
  useGetAllUsersQuery,
  useSearchPatientsQuery,
} from "../../../../redux/api/usersApi";
import { useLazyCheckMobileQuery } from "../../../../redux/api/patientApi";
import {
  buildPatientDraftSnapshot,
  buildPatientSummary,
} from "../helpers/appointmentSummaryHelpers";
import { buildPatientOption, extractUsersArray } from "../helpers/optionMappers";
import type { NewAppointmentForm, PatientOption } from "../types";

type FocusField = (
  ref: React.RefObject<HTMLDivElement | null>,
  selector?: string,
  delay?: number,
) => void;

type CreatedPatient = {
  id: string;
  name: string;
  mobile: string;
};

type UsePatientSelectionParams = {
  patientSelect: string;
  prefillPatientId: string;
  stateLabel?: string;
  locationKey: string;
  isAddPatientOpen: boolean;
  setIsAddPatientOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setQuickAddQuery: React.Dispatch<React.SetStateAction<string>>;
  navigate: NavigateFunction;
  getValues: UseFormGetValues<NewAppointmentForm>;
  setValue: UseFormSetValue<NewAppointmentForm>;
  clearErrors: UseFormClearErrors<NewAppointmentForm>;
  focusField: FocusField;
  focusDoctorSelectField: () => void;
  patientFieldRef: React.RefObject<HTMLDivElement | null>;
};

const usePatientSelection = ({
  patientSelect,
  prefillPatientId,
  stateLabel,
  locationKey,
  isAddPatientOpen,
  setIsAddPatientOpen,
  setQuickAddQuery,
  navigate,
  getValues,
  setValue,
  clearErrors,
  focusField,
  focusDoctorSelectField,
  patientFieldRef,
}: UsePatientSelectionParams) => {
  const [patientACKey, setPatientACKey] = React.useState(0);
  const patientHydratedRef = React.useRef(false);
  const [patientACOpen, setPatientACOpen] = React.useState(false);
  const [patientSearch, setPatientSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const lastSelectedPatientIdRef = React.useRef<string | null>(null);
  const lastSelectedPatientOptionRef = React.useRef<PatientOption | null>(
    null,
  );

  React.useEffect(() => {
    if (!isAddPatientOpen) return;

    setPatientACOpen(false);
    setPatientACKey((k) => k + 1);
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [isAddPatientOpen]);

  // Debounce search input → only set debouncedSearch after delay.
  // Name search: fires after 2+ characters. Phone search: fires after 3+ digits.
  // Complete 10-digit phone numbers trigger almost instantly.
  React.useEffect(() => {
    const trimmed = patientSearch.trim();
    const isNumeric = /^\d+$/.test(trimmed);

    // Minimum characters: 2 for names, 3 for numbers
    const minChars = isNumeric ? 3 : 2;

    if (trimmed.length < minChars) {
      setDebouncedSearch("");
      return;
    }

    const isComplete10Digit = /^[6-9]\d{9}$/.test(trimmed);
    const delay = isComplete10Digit ? 100 : isNumeric ? 250 : 400;

    const timer = setTimeout(() => setDebouncedSearch(patientSearch), delay);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const {
    data: allPatientsResp,
    isFetching: isFetchingAllPatients,
    isError: isAllPatientsError,
    error: allPatientsError,
    refetch: refetchAllPatients,
  } = useGetAllUsersQuery(
    { page: 1, pageSize: 50, userType: "Patient" },
    {
      // Only fetch all patients when we have a prefillPatientId to resolve
      skip: !!debouncedSearch || !prefillPatientId,
    },
  );

  React.useEffect(() => {
    if (prefillPatientId && !debouncedSearch) refetchAllPatients();
  }, [prefillPatientId, debouncedSearch, refetchAllPatients]);

  const {
    data: searchPatientsResp,
    isFetching: isFetchingSearchPatients,
    isError: isSearchPatientsError,
    error: searchPatientsError,
  } = useSearchPatientsQuery(
    { pageNumber: 1, pageSize: 30, search: debouncedSearch },
    { skip: !debouncedSearch || debouncedSearch.trim().length < 2 },
  );

  const isFetchingPatients = isFetchingAllPatients || isFetchingSearchPatients;
  const isPatientsError = debouncedSearch
    ? isSearchPatientsError
    : isAllPatientsError;
  const patientsError = debouncedSearch
    ? searchPatientsError
    : allPatientsError;

  const [stablePatients, setStablePatients] = React.useState<any[]>([]);

  React.useEffect(() => {
    // When debouncedSearch is empty, show fallback (all patients if available) or clear.
    if (!debouncedSearch) {
      const fallback = extractUsersArray(allPatientsResp);
      setStablePatients(Array.isArray(fallback) ? fallback : []);
      return;
    }
    // While fetching new results for a changed search term, keep current
    // stablePatients (which may include check-mobile injected results).
    if (isFetchingSearchPatients) return;
    const current = extractUsersArray(searchPatientsResp);
    if (Array.isArray(current)) {
      // Merge: if check-mobile already injected a patient that isn't in
      // the search response, preserve it so it stays visible.
      setStablePatients((prev) => {
        if (current.length > 0) return current;
        // Search returned empty — keep any patients injected by check-mobile
        if (prev.length > 0 && /^\d{10}$/.test(debouncedSearch.trim())) return prev;
        return current;
      });
    }
  }, [searchPatientsResp, allPatientsResp, debouncedSearch, isFetchingSearchPatients]);

  const patients = stablePatients;

  // show inline add patient only when searching by name (not phone number) — alongside results
  const isSearchByName = !!debouncedSearch && !/^\d+$/.test(debouncedSearch.trim());
  const showInlineAddPatient =
    isSearchByName &&
    !isFetchingPatients &&
    !isPatientsError;

  // show add patient in empty state (no results) regardless of search type
  const showAddPatientInEmpty =
    !!debouncedSearch &&
    !isFetchingPatients &&
    !isPatientsError &&
    patients.length === 0;



  /* ---------- Check-mobile: auto-verify when 10 digits are entered ---------- */
  const [triggerCheckMobile] = useLazyCheckMobileQuery();
  const lastCheckedMobileRef = React.useRef("");
  const [_mobileCheckResult, setMobileCheckResult] = React.useState<{
    exists: boolean;
    patient?: { id: string; name: string; mobile: string; gender?: string | null; age?: number | null; city?: string | null; state?: string | null };
  } | null>(null);

  React.useEffect(() => {
    const trimmed = String(debouncedSearch ?? "").trim();
    const isValidMobile = /^[6-9]\d{9}$/.test(trimmed);

    if (!isValidMobile) {
      // Reset check result when input is not a valid 10-digit number
      if (lastCheckedMobileRef.current) {
        lastCheckedMobileRef.current = "";
        setMobileCheckResult(null);
      }
      return;
    }

    // Don't re-check the same number
    if (trimmed === lastCheckedMobileRef.current) return;
    lastCheckedMobileRef.current = trimmed;

    triggerCheckMobile(trimmed, false)
      .unwrap()
      .then((resp) => {
        // Guard against race conditions: ignore this response if the user
        // has since changed the search text (late/out-of-order response).
        if (lastCheckedMobileRef.current !== trimmed) return;

        if (resp?.data?.exists && resp.data.patient) {
          setMobileCheckResult({ exists: true, patient: resp.data.patient });

          // Inject patient into stable list so it appears in the dropdown
          const patient = resp.data.patient;
          setStablePatients((prev) => {
            const alreadyInList = prev.some((p) => p.id === patient.id);
            if (alreadyInList) return prev;
            return [
              { id: patient.id, name: patient.name, mobile: patient.mobile, gender: patient.gender, age: patient.age, city: patient.city, state: patient.state },
              ...prev,
            ];
          });
        } else {
          setMobileCheckResult({ exists: false });
        }
      })
      .catch(() => {
        // Only clear if this is still the active search
        if (lastCheckedMobileRef.current === trimmed) {
          setMobileCheckResult(null);
        }
      });
  }, [debouncedSearch, triggerCheckMobile]);

  const patientOptions: PatientOption[] = React.useMemo(() => {
    const base: PatientOption[] = [];

    patients
      .filter((p) => p && (p.id || p._id))
      .forEach((p: any, idx: number) => {
        // Add the patient itself
        base.push(buildPatientOption(p, idx));

        // Also add their family members as selectable options
        const familyMembers = p?.familyMembers;
        if (Array.isArray(familyMembers)) {
          familyMembers.forEach((fm: any) => {
            if (!fm || !(fm.id || fm._id)) return;
            // Avoid duplicates — don't add if already in the list
            const fmId = String(fm.id ?? fm._id);
            if (base.some((o) => o.value === fmId)) return;
            base.push(buildPatientOption(
              { ...fm, mobile: fm.mobile ?? p.mobile },
              base.length,
            ));
          });
        }
      });

    if (prefillPatientId && stateLabel) {
      const exists = base.some((o) => o.value === prefillPatientId);
      if (!exists) {
        base.unshift({
          value: prefillPatientId,
          label: stateLabel,
          data: {},
          badgeText: undefined,
          badgeTone: "muted",
        });
      }
    }

    const selectedId = String(
      patientSelect || lastSelectedPatientIdRef.current || "",
    );
    const cachedSelected = lastSelectedPatientOptionRef.current;

    if (
      selectedId &&
      cachedSelected &&
      String(cachedSelected.value) === selectedId
    ) {
      const exists = base.some((o) => String(o.value) === selectedId);
      if (!exists) {
        base.unshift(cachedSelected);
      }
    }

    return base;
  }, [patients, prefillPatientId, stateLabel, patientSelect]);

  React.useEffect(() => {
    if (patientSelect) return;

    lastSelectedPatientIdRef.current = null;
    lastSelectedPatientOptionRef.current = null;
  }, [patientSelect]);

  React.useEffect(() => {
    if (isAddPatientOpen) return;
    if (patientSelect) return;

    const timer = window.setTimeout(() => {
      focusField(
        patientFieldRef,
        'input:not([type="hidden"]):not([disabled]), [role="combobox"], button:not([disabled])',
        0,
      );

      if (patientOptions.length > 0) {
        setPatientACOpen(true);
      }
    }, 200);

    return () => window.clearTimeout(timer);
  }, [
    focusField,
    isAddPatientOpen,
    patientFieldRef,
    patientSelect,
    patientOptions.length,
  ]);

  const openAddPatient = () => {
    const q = String(debouncedSearch || patientSearch || "").trim();
    setQuickAddQuery(q);

    setPatientACOpen(false);
    setPatientACKey((k) => k + 1);
    (document.activeElement as HTMLElement | null)?.blur?.();

    window.setTimeout(() => {
      setIsAddPatientOpen(true);
    }, 0);
  };

  const handlePatientFieldKeyDownCapture = (
    e: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    const key = String(e.key).toLowerCase();

    // Alt + N navigates to the full new-patient page. Arrow/Enter/Escape
    // navigation is handled directly inside the custom combobox component.
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && key === "n") {
      e.preventDefault();
      e.stopPropagation();
      navigate("/patient/new");
    }
  };

  React.useEffect(() => {
    if (patientHydratedRef.current) return;

    const id = String(patientSelect || "");
    if (!id) return;

    const exists = patientOptions.some((p) => String(p.value) === id);
    if (!exists) return;

    lastSelectedPatientOptionRef.current =
      patientOptions.find((p) => String(p.value) === id) ?? null;
    patientHydratedRef.current = true;
    lastSelectedPatientIdRef.current = id;
    setPatientACKey((k) => k + 1);
  }, [patientSelect, patientOptions]);

  React.useEffect(() => {
    const next = patientSelect ? String(patientSelect) : "";
    const curr = String(getValues("patientId") ?? "");
    if (curr === next) return;
    setValue("patientId", next, { shouldValidate: true, shouldDirty: true });
    if (next) clearErrors("patientSelect");
  }, [patientSelect, getValues, setValue, clearErrors]);

  React.useEffect(() => {
    if (!debouncedSearch && prefillPatientId) refetchAllPatients();
  }, [locationKey, debouncedSearch, prefillPatientId, refetchAllPatients]);

  const selectedPatientOption = React.useMemo(() => {
    const id = String(patientSelect || "");
    if (!id) return null;
    return patientOptions.find((p) => String(p.value) === id) ?? null;
  }, [patientSelect, patientOptions]);

  const selectedPatientData = selectedPatientOption?.data ?? null;
  const showPatientSummary = !!selectedPatientOption;

  const {
    patientName,
    patientAgeGender,
    patientPhone,
    patientLastVisit,
    rawNoShowStatus,
    noShowDisplay,
  } = React.useMemo(
    () =>
      buildPatientSummary({
        selectedPatientOption,
        selectedPatientData,
      }),
    [selectedPatientOption, selectedPatientData],
  );

  const patientDraftSnapshot = React.useMemo(
    () =>
      buildPatientDraftSnapshot({
        patientSelect,
        selectedPatientData,
        selectedPatientOption,
      }),
    [patientSelect, selectedPatientData, selectedPatientOption],
  );

  const handlePatientInputChange = (val: unknown) => {
    const nextVal = String(val ?? "");

    if (!nextVal.trim()) {
      // Full reset — user cleared the search
      setPatientSearch("");
      setDebouncedSearch("");
      lastSelectedPatientIdRef.current = null;
      lastSelectedPatientOptionRef.current = null;
      setPatientACOpen(false);

      // Clear form selection so user can search again
      if (patientSelect) {
        setValue("patientSelect", "", { shouldDirty: true, shouldValidate: false });
        setValue("patientId", "", { shouldDirty: true, shouldValidate: false });
      }
      return;
    }

    setPatientACOpen(true);

    const currentId =
      lastSelectedPatientIdRef.current || String(patientSelect || "");
    const selected = patientOptions.find((p) => String(p.value) === currentId);

    if (selected && selected.label === nextVal) return;

    // User is typing new text — if a patient was selected, clear it so they can re-search
    if (currentId && selected) {
      setValue("patientSelect", "", { shouldDirty: true, shouldValidate: false });
      setValue("patientId", "", { shouldDirty: true, shouldValidate: false });
    }

    lastSelectedPatientIdRef.current = null;
    lastSelectedPatientOptionRef.current = null;
    setPatientSearch(nextVal);

    // Immediately trigger search for complete 10-digit phone numbers
    // without waiting for the debounce timer — this handles the case
    // where the user clears a name search and types/pastes a full phone number.
    const trimmedNext = nextVal.trim();
    if (/^[6-9]\d{9}$/.test(trimmedNext)) {
      setDebouncedSearch(trimmedNext);
    }
  };

  const handlePatientSelectionChange = (key: React.Key | null) => {
    const val = key ? String(key) : null;
    lastSelectedPatientIdRef.current = val;

    setPatientACOpen(false);

    if (val) {
      lastSelectedPatientOptionRef.current =
        patientOptions.find((p) => String(p.value) === val) ?? null;
      setPatientSearch("");
      setDebouncedSearch("");
      clearErrors("patientSelect");

      // ✅ Close inline add-patient form if a patient is selected from the dropdown
      setIsAddPatientOpen(false);

      // ✅ Only open the doctor dropdown if no doctor is already selected.
      // When doctor is pre-selected (e.g. Doctor/Admin role auto-select),
      // focusing the autocomplete input triggers the dropdown to open — skip it.
      const currentDoctor = String(getValues("doctorId") ?? "").trim();
      if (!currentDoctor) {
        focusDoctorSelectField();
      }
      return;
    }

    lastSelectedPatientOptionRef.current = null;
  };

  const handleQuickPatientCreated = (p: CreatedPatient) => {
    setStablePatients((prev) => [
      { id: p.id, name: p.name, mobile: p.mobile },
      ...prev,
    ]);

    lastSelectedPatientOptionRef.current = buildPatientOption({
      id: p.id,
      name: p.name,
      mobile: p.mobile,
    });

    setValue("patientSelect", p.id, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setValue("patientId", p.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    clearErrors("patientSelect");

    setPatientSearch("");
    setDebouncedSearch("");
    setPatientACOpen(false);

    patientHydratedRef.current = true;
    lastSelectedPatientIdRef.current = p.id;
    setPatientACKey((k) => k + 1);
    setIsAddPatientOpen(false);

    // ✅ Only open doctor dropdown if no doctor is already selected
    const currentDoctor = String(getValues("doctorId") ?? "").trim();
    if (!currentDoctor) {
      focusDoctorSelectField();
    }
  };

  return {
    patientSearch,
    setPatientSearch,
    debouncedSearch,
    setDebouncedSearch,
    lastSelectedPatientIdRef,
    isFetchingPatients,
    isPatientsError,
    patientsError,
    stablePatients,
    setStablePatients,
    patients,
    showInlineAddPatient,
    showAddPatientInEmpty,
    patientOptions,
    patientACOpen,
    setPatientACOpen,
    patientACKey,
    setPatientACKey,
    patientHydratedRef,
    openAddPatient,
    handlePatientFieldKeyDownCapture,
    selectedPatientOption,
    selectedPatientData,
    showPatientSummary,
    patientName,
    patientAgeGender,
    patientPhone,
    patientLastVisit,
    rawNoShowStatus,
    noShowDisplay,
    patientDraftSnapshot,
    handlePatientInputChange,
    handlePatientSelectionChange,
    handleQuickPatientCreated,
  };
};

export default usePatientSelection;
