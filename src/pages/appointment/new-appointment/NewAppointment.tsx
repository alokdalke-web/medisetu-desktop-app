import { parseDate } from "@internationalized/date";
import React from "react";
import {
  useForm,
  useWatch,
  Controller,
  type Control,
  type FieldValues,
} from "react-hook-form";
import { FiActivity, FiArrowRight, FiCreditCard, FiUser } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router";
import { Select, SelectItem } from "@heroui/react";
import {
  useCreateAppointmentMutation,
  useGetDoctorAvailableSlotsQuery,
} from "../../../redux/api/appointmentApi";
import { useGetUserQuery } from "../../../redux/api/authApi";
import AllPlains from "../AllPlains";
import AppointmentSummaryPanel from "./components/AppointmentSummaryPanel";
import AppointmentDateSection from "./components/AppointmentDateSection";
import AppointmentSlotSection from "./components/AppointmentSlotSection";
import CustomSlotModal from "./components/CustomSlotModal";
import DoctorSelectionSection from "./components/DoctorSelectionSection";
import NewAppointmentHeader from "./components/NewAppointmentHeader";
import NewAppointmentModals from "./components/NewAppointmentModals";
import PatientSelectionSection from "./components/PatientSelectionSection";
import UPIQRCodeModal from "./components/UPIQRCodeModal";
import PaymentSection from "./components/PaymentSection";
import ServiceSelectionSection from "./components/ServiceSelectionSection";
import SymptomsSection from "./components/SymptomsSection";
import InlineAddPatientForm from "../../patient/InlineAddPatientForm";
import InputLabel from "../../../components/shared/InputLabel";
import {
  buildConfirmationData,
  formatTimeTo12Hour,
} from "./helpers/appointmentSummaryHelpers";
import {
  addMinutesToTime,
  formatDurationLabel,
  formatIsoForUi,
  getLocalDateISO,
  pad2,
  safeParseCalendarDate,
  toApiDate,
} from "./helpers/dateTimeHelpers";
import {
  clearAppointmentDraft,
  readAppointmentDraft,
  writeAppointmentDraft,
} from "./helpers/draftStorageHelpers";
import { getInitials } from "./helpers/optionMappers";
import {
  extractTokenMetaFromApi,
  getWorkingWindowsFromSlots,
  groupSlotsIntoMultipleShifts,
  normalizeSlotsFromApi,
} from "./helpers/slotHelpers";
import { mkSymptom } from "./helpers/symptomHelpers";
import {
  toastError,
  toastInfo,
  toastSuccess,
} from "./helpers/toastHelpers";
import useAppointmentDateRange from "./hooks/useAppointmentDateRange";
import useAppointmentServicePayment from "./hooks/useAppointmentServicePayment";
import useAppointmentSymptoms from "./hooks/useAppointmentSymptoms";
import useDoctorSelection from "./hooks/useDoctorSelection";
import useNewAppointmentShortcuts from "./hooks/useNewAppointmentShortcuts";
import usePatientSelection from "./hooks/usePatientSelection";
import type {
  ApiSuccess,
  NewAppointmentForm,
  Slot,
  TimeSlot,
  TokenSlot,
} from "./types";

const getKolkataTimeHHmm = () =>
  new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });

/* ---------------- Component ---------------- */
const NewAppointment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const stateLabel = (location as any)?.state?.prefillPatientLabel as
    | string
    | undefined;

  const queryParams = new URLSearchParams(location.search);
  const prefillPatientId = queryParams.get("patientId") ?? "";
  const prefillDoctorId = queryParams.get("doctorId") ?? "";

  const prefillDate = queryParams.get("date") ?? "";
  const prefillTime = queryParams.get("time") ?? "";
  const restoredDraft = React.useMemo(() => readAppointmentDraft(), []);
  const draftValues = restoredDraft?.values ?? null;
  const draftDoctorSnapshot = restoredDraft?.doctorSnapshot ?? null;
  const dateFieldRef = React.useRef<HTMLDivElement | null>(null);
  const saveButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const skipDraftPersistRef = React.useRef(false);
  const skipInitialSlotResetRef = React.useRef(true);

  const { data: meResp } = useGetUserQuery();

  // ✅ Confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [pendingAppointmentData, setPendingAppointmentData] =
    React.useState<any>(null);

  // UPI QR Code modal state
  const [isUPIQRModalOpen, setIsUPIQRModalOpen] = React.useState(false);

  const todayIso = getLocalDateISO();
  const todayDateValue = parseDate(todayIso);

  const initialAppointmentDateIso =
    draftValues?.appointmentDate || prefillDate || todayIso;

  const {
    control,
    setValue,
    handleSubmit,
    reset,
    formState,
    getValues,
    setError,
    clearErrors,
  } = useForm<NewAppointmentForm>({
    defaultValues: {
      patientSelect: prefillPatientId || "",
      patientId: prefillPatientId || "",
      doctorSelect: draftValues?.doctorSelect || prefillDoctorId || "",
      doctorId: draftValues?.doctorId || prefillDoctorId || "",
      appointmentDate: safeParseCalendarDate(
        initialAppointmentDateIso,
        todayIso,
      ),
      appointmentTime: draftValues?.appointmentTime ?? prefillTime ?? null,
      clinicServiceId: draftValues?.clinicServiceId ?? "",
      paymentMode: draftValues?.paymentMode ?? "",
      notes: draftValues?.notes ?? "",
      price: draftValues?.price ?? "",
      paymentNotes: draftValues?.paymentNotes ?? "",
      bookingSource: draftValues?.bookingSource ?? "walk_in",
    },
  });

  const rhfControl = control as unknown as Control<FieldValues, FieldValues>;

  const patientSelect = useWatch({ control, name: "patientSelect" });
  const doctorSelect = useWatch({ control, name: "doctorSelect" });
  const doctorId = useWatch({ control, name: "doctorId" });
  const appointmentDate = useWatch({ control, name: "appointmentDate" });
  const patientId = useWatch({ control, name: "patientId" });
  const paymentMode = useWatch({ control, name: "paymentMode" });
  const appointmentTimeValue = useWatch({
    control,
    name: "appointmentTime",
  });
  const notes = useWatch({ control, name: "notes" });

  const paymentNotes = useWatch({ control, name: "paymentNotes" });
  const watchedPrice = useWatch({ control, name: "price" });
  const bookingSource = useWatch({ control, name: "bookingSource" });

  const selectedServiceFlow = useWatch({ control, name: "clinicServiceId" });
  const isServiceSelected = !!selectedServiceFlow;

  const [isAddPatientOpen, setIsAddPatientOpen] = React.useState(false);

  useNewAppointmentShortcuts({
    navigate,
    isAddPatientOpen,
    isConfirmModalOpen,
  });

  const patientFieldRef = React.useRef<HTMLDivElement | null>(null);
  const doctorFieldRef = React.useRef<HTMLDivElement | null>(null);
  const serviceFieldRef = React.useRef<HTMLDivElement | null>(null);
  const paymentFieldRef = React.useRef<HTMLDivElement | null>(null);
  const slotFieldRef = React.useRef<HTMLDivElement | null>(null);

  const [jiggleKey, setJiggleKey] = React.useState<string>("");

  const jiggle = React.useCallback((key: string) => {
    setJiggleKey(key);
    window.setTimeout(() => setJiggleKey((k) => (k === key ? "" : k)), 450);
  }, []);

  const scrollToField = React.useCallback(
    (ref: React.RefObject<HTMLDivElement | null>, key: string) => {
      const node = ref.current;
      if (!node) return;

      node.scrollIntoView({ behavior: "smooth", block: "center" });
      jiggle(key);

      window.setTimeout(() => {
        const focusEl = node.querySelector(
          "input,button,[tabindex]",
        ) as HTMLElement | null;
        focusEl?.focus?.();
      }, 250);
    },
    [jiggle],
  );

  const focusField = React.useCallback(
    (
      ref: React.RefObject<HTMLDivElement | null>,
      selector?: string,
      delay = 120,
    ) => {
      window.setTimeout(() => {
        const node = ref.current;
        if (!node) return;

        const focusEl = node.querySelector(
          selector ??
          [
            'input:not([type="hidden"]):not([disabled])',
            "button:not([disabled])",
            "textarea:not([disabled])",
            '[role="combobox"]',
            '[data-slot="trigger"]',
            '[tabindex]:not([tabindex="-1"])',
          ].join(","),
        ) as HTMLElement | null;

        focusEl?.focus?.({ preventScroll: true });
      }, delay);
    },
    [],
  );

  const focusSlotSelection = React.useCallback(() => {
    focusField(slotFieldRef, "button:not([disabled])");
  }, [focusField]);

  const {
    dayRange,
    setDayRange,
    rangeEndLabel,
    dateParam,
    calendarMonthSections,
    handlePickPill,
  } = useAppointmentDateRange({
    appointmentDate,
    restoredDayRange: restoredDraft?.dayRange,
    todayIso,
    setValue,
    clearErrors,
    focusField,
    slotFieldRef,
  });

  const focusSaveAction = React.useCallback(() => {
    window.setTimeout(() => {
      saveButtonRef.current?.focus();
    }, 100);
  }, []);

  const focusDoctorSelectField = React.useCallback(() => {
    window.setTimeout(() => {
      const node = doctorFieldRef.current;
      if (!node) return;

      const target = node.querySelector(
        '[role="combobox"], [data-slot="trigger"], input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) as HTMLElement | null;

      if (!target) return;

      target.focus({ preventScroll: true });
      target.click();
    }, 280);
  }, []);

  const prevDoctorSelectRef = React.useRef<string | null>(null);
  const prevPatientSelectRef = React.useRef<string | null>(null);
  const prevServiceIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const currentDoctor = String(doctorSelect || "");

    if (prevDoctorSelectRef.current === null) {
      prevDoctorSelectRef.current = currentDoctor;
      return;
    }

    if (prevDoctorSelectRef.current === currentDoctor) return;

    prevDoctorSelectRef.current = currentDoctor;

    setValue("clinicServiceId", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("paymentMode", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
    clearErrors("clinicServiceId");
    clearErrors("paymentMode");
  }, [doctorSelect, setValue, clearErrors]);

  React.useEffect(() => {
    const currentPatient = String(patientSelect || "");

    if (prevPatientSelectRef.current === null) {
      prevPatientSelectRef.current = currentPatient;
      return;
    }

    if (prevPatientSelectRef.current === currentPatient) return;

    prevPatientSelectRef.current = currentPatient;

    setValue("clinicServiceId", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("paymentMode", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
    clearErrors("clinicServiceId");
    clearErrors("paymentMode");
  }, [patientSelect, setValue, clearErrors]);

  React.useEffect(() => {
    const currentService = String(selectedServiceFlow || "");

    if (prevServiceIdRef.current === null) {
      prevServiceIdRef.current = currentService;
      return;
    }

    if (prevServiceIdRef.current === currentService) return;

    prevServiceIdRef.current = currentService;

    setValue("paymentMode", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
    clearErrors("paymentMode");
  }, [selectedServiceFlow, setValue, clearErrors]);

  const {
    symptoms,
    setSymptoms,
    activeSymptomIndex,
    setActiveSymptomIndex,
    updateSymptomName,
    openSymptomId,
    setOpenSymptomId,
    suggestionsById,
    setSuggestionsById,
    loadingById,
    setLoadingById,
    removeSymptom,
    syncClinicSymptoms,
    symptomsBoxRef,
    loadDefaultSymptoms,
    handleSymptomSearch,
    selectSuggestion,
    MAX_SYMPTOMS,
    symptomRow,
    symptomChips,
    symptomChipCount,
    symptomLimitReached,
    showSymptomLimitToast,
    moveFirstSymptomToChip,
    commitSymptomInputToChip,
    toggleSymptomByName,
  } = useAppointmentSymptoms({
    restoredDraft,
    toastInfo,
  });

  const [hasActiveSubscription, setHasActiveSubscription] =
    React.useState<boolean>(true);
  const [selectedSlot, setSelectedSlot] = React.useState<Slot | null>(null);
  const [customSlot, setCustomSlot] = React.useState<Slot | null>(null);
  const [isCustomSlotModalOpen, setIsCustomSlotModalOpen] =
    React.useState(false);
  const [customDurationMinutes, setCustomDurationMinutes] = React.useState<
    number | null
  >(null);
  const [activeShiftTab, setActiveShiftTab] = React.useState(0);

  const [quickAddQuery, setQuickAddQuery] = React.useState("");

  const {
    shouldLockSlotsForToday,
    canPickService,
    isFetchingServices,
    clinicServiceOptions,
    selectedServiceData,
    isFreeConsultationService,
    isServiceCoveredForSelectedDate,
    paymentModeOptions,
    focusAfterServiceSelection,
  } = useAppointmentServicePayment({
    patientId: String(patientId || ""),
    doctorId: String(doctorId || ""),
    dateParam,
    todayIso,
    selectedServiceFlow: String(selectedServiceFlow || ""),
    setValue,
    getValues,
    clearErrors,
    focusSlotSelection,
    focusField,
    paymentFieldRef,
    toastError,
    setHasActiveSubscription,
  });

  /* ---------- Patients ---------- */
  const {
    debouncedSearch,
    isFetchingPatients,
    isPatientsError,
    patientsError,
    showInlineAddPatient,
    showAddPatientInEmpty,
    patientOptions,
    patientACOpen,
    setPatientACOpen,
    patientACKey,
    openAddPatient,
    handlePatientFieldKeyDownCapture,
    showPatientSummary,
    patientName,
    patientAgeGender,
    patientPhone,
    selectedPatientData,
    handlePatientInputChange,
    handlePatientSelectionChange,
    handleQuickPatientCreated,
  } = usePatientSelection({
    patientSelect: String(patientSelect || ""),
    prefillPatientId,
    stateLabel,
    locationKey: location.key,
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
  });

  /* ---------- Doctors ---------- */
  const {
    isFetchingDoctors,
    isDoctorsError,
    doctorsError,
    doctorOptions,
    doctorName,
    doctorRole,
    doctorDraftSnapshot,
    selectedDoctorData,
  } = useDoctorSelection({
    doctorSelect: String(doctorSelect || ""),
    prefillDoctorId,
    draftDoctorSnapshot,
    meResp,
    getValues,
    setValue,
    clearErrors,
  });
  /* ---------- Slots from API ---------- */
  React.useEffect(() => {
    if (skipInitialSlotResetRef.current) {
      skipInitialSlotResetRef.current = false;
      return;
    }

    setSelectedSlot(null);
    setCustomSlot(null);
    setCustomDurationMinutes(null);
    setValue("appointmentTime", null, {
      shouldDirty: true,
      shouldValidate: false,
    });
    clearErrors("appointmentTime");
  }, [dateParam, doctorId, setValue, clearErrors]);

  const slotsQueryArgs = React.useMemo(
    () => ({
      date: dateParam,
      doctorId: doctorId || "",
      time: getKolkataTimeHHmm(),
    }),
    [dateParam, doctorId],
  );

  const {
    currentData: slotsResp,
    isFetching: isSlotsLoading,
    isError: isSlotsError,
    error: slotsError,
    refetch: refetchSlots,
  } = useGetDoctorAvailableSlotsQuery(
    slotsQueryArgs,
    { skip: !dateParam || !doctorId || !hasActiveSubscription },
  );

  React.useEffect(() => {
    setActiveShiftTab(0);
  }, [dateParam, doctorId]);

  const isSlotExpired = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);

    return now > end;
  };

  const availability = slotsResp?.result?.[0];
  const isExpired = availability ? isSlotExpired(availability.end) : false;

  const slots: Slot[] = React.useMemo(
    () => normalizeSlotsFromApi(slotsResp, dateParam),
    [slotsResp, dateParam],
  );

  // A manually-entered custom slot/token isn't part of the API-fetched grid, so it's
  // appended here purely for the "does appointmentTime still match a known slot" sync
  // effect below — it's never rendered in the slot grid itself.
  const slotsForSync: Slot[] = React.useMemo(
    () => (customSlot ? [...slots, customSlot] : slots),
    [slots, customSlot],
  );

  const defaultCustomDurationMinutes = React.useMemo(() => {
    const firstTimeSlot = slots.find((s): s is TimeSlot => s.kind === "time");
    return firstTimeSlot?.durationMinutes || 15;
  }, [slots]);

  const isTokenMode = React.useMemo(
    () => slots.some((s) => s.kind === "token"),
    [slots],
  );

  // Feeds the custom-slot modal's out-of-hours warning.
  const workingWindows = React.useMemo(
    () => getWorkingWindowsFromSlots(slots),
    [slots],
  );

  const [showAllTokens, setShowAllTokens] = React.useState<boolean>(
    () => restoredDraft?.showAllTokens ?? true,
  );
  const tokenMeta = React.useMemo(
    () => extractTokenMetaFromApi(slotsResp, dateParam),
    [slotsResp, dateParam],
  );
  const autoTokenNo = tokenMeta?.autoToken;

  const tokenSlots = React.useMemo(
    () =>
      (
        slots.filter((s): s is TokenSlot => s.kind === "token") as TokenSlot[]
      ).sort((a, b) => a.tokenNo - b.tokenNo),
    [slots],
  );

  const availableTokenSlots = React.useMemo(
    () => tokenSlots.filter((t) => t.status === "available"),
    [tokenSlots],
  );

  const tokenSlotsToRender = React.useMemo(() => {
    if (!isTokenMode) return [];
    if (showAllTokens) return tokenSlots;
    if (autoTokenNo == null) return tokenSlots;

    const auto = tokenSlots.find(
      (t) => t.tokenNo === autoTokenNo && t.status === "available",
    );
    if (auto) return [auto];

    return availableTokenSlots.length ? [availableTokenSlots[0]] : [];
  }, [
    isTokenMode,
    showAllTokens,
    tokenSlots,
    availableTokenSlots,
    autoTokenNo,
  ]);

  const shiftUiData = React.useMemo(() => {
    const timeSlots = slots
      .filter((s): s is TimeSlot => s.kind === "time")
      .filter((s) => s.source !== "break");

    if (timeSlots.length === 0) {
      return {
        shifts: [] as TimeSlot[][],
        shiftLabels: [] as string[],
        hasMultipleShifts: false,
        activeShiftSlots: [] as TimeSlot[],
      };
    }

    const apiResponse = slotsResp?.result?.[0];
    const shiftLabelsFromApi = apiResponse?.shifts || [];

    const { shifts, shiftLabels } = groupSlotsIntoMultipleShifts(
      slots,
      shiftLabelsFromApi,
    );

    const safeActiveIndex =
      activeShiftTab >= 0 && activeShiftTab < shifts.length
        ? activeShiftTab
        : 0;

    return {
      shifts,
      shiftLabels,
      hasMultipleShifts: shifts.length > 1,
      activeShiftSlots: shifts[safeActiveIndex] || [],
    };
  }, [slots, slotsResp, activeShiftTab]);

  React.useEffect(() => {
    if (!dateParam || !doctorId || isSlotsLoading) return;

    const desired = String(appointmentTimeValue ?? "").trim();
    if (!desired) return;

    const matchedSlot = slotsForSync.find((s) => {
      if (s.kind === "token") {
        return String((s as TokenSlot).tokenNo) === desired;
      }
      return (s as TimeSlot).startTime === desired;
    });

    if (!matchedSlot || matchedSlot.status !== "available") {
      setSelectedSlot(null);
      setValue("appointmentTime", null, {
        shouldDirty: true,
        shouldValidate: false,
      });
      clearErrors("appointmentTime");
      return;
    }

    const alreadySelected =
      selectedSlot?.kind === matchedSlot.kind &&
      (matchedSlot.kind === "token"
        ? (selectedSlot as TokenSlot | null)?.tokenNo ===
        (matchedSlot as TokenSlot).tokenNo
        : (selectedSlot as TimeSlot | null)?.startTime ===
        (matchedSlot as TimeSlot).startTime &&
        (selectedSlot as TimeSlot | null)?.endTime ===
        (matchedSlot as TimeSlot).endTime);

    if (!alreadySelected) {
      setSelectedSlot(matchedSlot);
    }
  }, [
    dateParam,
    doctorId,
    isSlotsLoading,
    appointmentTimeValue,
    slotsForSync,
    selectedSlot,
    setValue,
    clearErrors,
  ]);

  const handleSelectSlot = (slot: Slot) => {
    if (shouldLockSlotsForToday) {
      toastError("Cannot book on this date", {
        message:
          "Patient already has an appointment with this doctor on this date.",
      });
      return;
    }

    if (slot.status !== "available") return;

    setCustomSlot(null);
    setSelectedSlot(slot);
    setCustomDurationMinutes(null);

    setValue(
      "appointmentTime",
      slot.kind === "token"
        ? String((slot as TokenSlot).tokenNo)
        : (slot as TimeSlot).startTime,
      { shouldDirty: true, shouldValidate: true },
    );
    clearErrors("appointmentTime");

    // Auto-scroll to payment section after selecting a slot
    window.setTimeout(() => {
      paymentFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);

    // Skip optional symptom field and move directly to Save
    focusSaveAction();
  };

  const getSelectedDateWeekday = () => {
    if (!dateParam) return "";
    const d = new Date(`${dateParam}T00:00:00`);
    return isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString("en-US", { weekday: "short" });
  };

  // Manually-entered time/token. `customSlot` (see `slotsForSync` above) is only ever set
  // when the pick has NO match in the API-fetched `slots` — if it matches an existing slot,
  // we just select that real slot instead of creating a duplicate. Rendering appends
  // `customSlot` after the last real slot/token (see AppointmentSlotSection).
  const handleCustomTimeSlot = (time24: string) => {
    if (shouldLockSlotsForToday) {
      toastError("Cannot book on this date", {
        message:
          "Patient already has an appointment with this doctor on this date.",
      });
      return;
    }

    const existing = slots.find(
      (s): s is TimeSlot => s.kind === "time" && s.startTime === time24,
    );

    if (existing) {
      if (existing.status !== "available") {
        toastError("Slot unavailable", {
          message: `The ${formatTimeTo12Hour(time24)} slot is already ${existing.status}. Please choose another time.`,
        });
        return;
      }
      handleSelectSlot(existing);
      return;
    }

    const duration = defaultCustomDurationMinutes;
    const custom: TimeSlot = {
      kind: "time",
      id: `custom-time-${time24}`,
      startTime: time24,
      endTime: addMinutesToTime(time24, duration),
      status: "available",
      durationMinutes: duration,
      dateIso: dateParam,
      weekday: getSelectedDateWeekday(),
      source: "custom",
    };

    setCustomSlot(custom);
    setSelectedSlot(custom);
    setCustomDurationMinutes(null);

    setValue("appointmentTime", time24, {
      shouldDirty: true,
      shouldValidate: true,
    });
    clearErrors("appointmentTime");

    window.setTimeout(() => {
      paymentFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);

    focusSaveAction();
  };

  const handleCustomToken = (tokenNo: number) => {
    if (shouldLockSlotsForToday) {
      toastError("Cannot book on this date", {
        message:
          "Patient already has an appointment with this doctor on this date.",
      });
      return;
    }

    const existing = tokenSlots.find((t) => t.tokenNo === tokenNo);

    if (existing) {
      if (existing.status !== "available") {
        toastError("Token unavailable", {
          message: `Token ${pad2(tokenNo)} is already ${existing.status}. Please choose another token.`,
        });
        return;
      }
      setShowAllTokens(true);
      handleSelectSlot(existing);
      return;
    }

    const custom: TokenSlot = {
      kind: "token",
      id: `custom-token-${tokenNo}`,
      tokenNo,
      status: "available",
      dateIso: dateParam,
      weekday: getSelectedDateWeekday(),
    };

    setShowAllTokens(true);
    setCustomSlot(custom);
    setSelectedSlot(custom);

    setValue("appointmentTime", String(tokenNo), {
      shouldDirty: true,
      shouldValidate: true,
    });
    clearErrors("appointmentTime");

    window.setTimeout(() => {
      paymentFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);

    focusSaveAction();
  };

  React.useEffect(() => {
    if (!isTokenMode) return;
    if (showAllTokens) return;

    // ✅ FIX: Auto token nahi mila, to selection reset MAT karo.
    // User ko manual token select karne do.
    if (autoTokenNo == null) return;

    const only = tokenSlotsToRender[0];
    if (!only) return;

    const alreadySelected =
      selectedSlot?.kind === "token" &&
      (selectedSlot as TokenSlot).tokenNo === (only as TokenSlot).tokenNo;

    if (alreadySelected) return;

    setSelectedSlot(only);
    setValue("appointmentTime", String((only as TokenSlot).tokenNo), {
      shouldDirty: true,
      shouldValidate: true,
    });
    clearErrors("appointmentTime");
  }, [
    isTokenMode,
    showAllTokens,
    autoTokenNo,
    tokenSlotsToRender,
    selectedSlot,
    setValue,
    clearErrors,
  ]);

  const shouldManualPickToken = React.useMemo(() => {
    if (!isTokenMode) return false;
    if (showAllTokens) return false;
    return autoTokenNo == null;
  }, [isTokenMode, showAllTokens, autoTokenNo]);

  /* ---------- Confirmation Helpers ---------- */

  // Helper function to prepare appointment data for confirmation
  const prepareAppointmentPayload = async (values: NewAppointmentForm) => {
    const sync = await syncClinicSymptoms(symptoms);
    const symptomIds = sync.ids;

    const isTokenBooking = isTokenMode && selectedSlot?.kind === "token";

    const selectedServicePrice = Number(
      selectedServiceData?.price ??
      selectedServiceData?.amount ??
      selectedServiceData?.fees ??
      0,
    );

    const finalPaymentNotes = values.paymentNotes?.trim() || "";

    const payload: any = {
      patientId: values.patientId,
      doctorId: values.doctorId,
      clinicServiceId: values.clinicServiceId,
      appointmentType: "Consultation",
      appointmentDate: toApiDate(values.appointmentDate),
      appointmentStatus: "Pending",
      bookingSource: values.bookingSource || "walk_in",
      commonSymptoms: [],
      clinicSymptomIds: symptomIds,
      price: String(selectedServicePrice),
      paymentNotes: finalPaymentNotes,
    };

    if (isFreeConsultationService) {
      payload.paymentMode = "Not Required";
      payload.paymentStatus = "Free Consultation";
    } else if (!isServiceCoveredForSelectedDate) {
      payload.paymentMode = values.paymentMode;
      payload.paymentStatus = values.paymentMode === "Pay Later" ? "Pending" : "Paid";
    } else {
      payload.paymentStatus = "Covered";
    }

    if (isTokenBooking) {
      payload.tokenNo = (selectedSlot as TokenSlot).tokenNo;
      payload.appointmentTime = "23:59";

      const tokenBaseNotes = `Token ${(selectedSlot as TokenSlot).tokenNo} requested`;
      payload.appointmentNotes = values.notes?.trim()
        ? `${tokenBaseNotes} - ${values.notes.trim()}`
        : tokenBaseNotes;
    } else {
      const timeSlot =
        selectedSlot?.kind === "time" ? (selectedSlot as TimeSlot) : null;

      payload.appointmentTime = timeSlot
        ? timeSlot.startTime
        : values.appointmentTime;

      const effectiveDuration =
        customDurationMinutes ?? Math.round(timeSlot?.durationMinutes || 0);

      payload.appointmentDurationMinutes = String(effectiveDuration);

      const effectiveEndTime =
        timeSlot && effectiveDuration > 0
          ? addMinutesToTime(timeSlot.startTime, effectiveDuration)
          : (timeSlot?.endTime ?? "");

      const slotBaseNotes = timeSlot
        ? `Slot ${timeSlot.startTime} - ${effectiveEndTime} requested`
        : "Slot requested";

      payload.appointmentNotes = values.notes?.trim()
        ? `${slotBaseNotes} - ${values.notes.trim()}`
        : slotBaseNotes;
    }

    return payload;
  };

  // Helper function to format data for display in confirmation modal
  const getConfirmationData = React.useMemo(
    () =>
      buildConfirmationData({
        pendingAppointmentData,
        clinicServiceOptions,
        patientName,
        doctorName,
        formatIsoForUi,
      }),
    [pendingAppointmentData, clinicServiceOptions, patientName, doctorName],
  );
  /** Chargeable service → a payment mode must exist before creation. */
  const requiresPaymentMode =
    isServiceSelected &&
    !isFreeConsultationService &&
    !isServiceCoveredForSelectedDate;

  /**
   * Late payment capture from the confirmation modal. Writes back to the form
   * too, so the Payment section and the draft stay in sync with what was
   * actually booked (and a cancelled modal keeps the choice).
   *
   * UPI and Card can't be finished here: UPI needs the QR modal so the patient
   * can actually scan, and both need the `paymentNotes` field for a transaction
   * ID — neither of which exists inside the confirmation modal. Rather than
   * silently record a mode with none of its follow-up, those two close the
   * modal and hand back to the form's Payment section, which already runs that
   * whole flow via `handleSelectPayment`.
   */
  const handleSelectPaymentModeInModal = (value: string) => {
    const needsFormFollowUp = value === "UPI" || value === "Card";

    setPendingAppointmentData((prev: any) =>
      prev ? { ...prev, paymentMode: value } : prev,
    );

    if (!needsFormFollowUp) {
      setValue("paymentMode", value, {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors("paymentMode");
      return;
    }

    setIsConfirmModalOpen(false);
    // Deferred so the modal has unmounted before the form scrolls and steals
    // focus — otherwise the QR modal opens behind a closing dialog.
    window.setTimeout(() => {
      scrollToField(paymentFieldRef, "paymentMode");
      handleSelectPayment(
        (next: string) =>
          setValue("paymentMode", next, {
            shouldDirty: true,
            shouldValidate: true,
          }),
        value,
      );
    }, 150);
  };

  // Function to actually create the appointment after confirmation
  const createAppointmentConfirmed = async () => {
    if (!pendingAppointmentData) return;

    setIsConfirmModalOpen(false);

    try {
      const resp: ApiSuccess = await createAppointment(
        pendingAppointmentData,
      ).unwrap();
      if (resp?.success === false) {
        toastError(
          "Appointment not created",
          resp,
          "Server rejected the request.",
        );
        return;
      }

      toastSuccess(
        "Appointment created",
        resp,
        "Your appointment has been saved successfully.",
      );

      // Reset form and state
      skipDraftPersistRef.current = true;
      clearAppointmentDraft();
      setDayRange(30);
      setShowAllTokens(true);
      setIsConfirmModalOpen(false);
      setPendingAppointmentData(null);

      reset({
        patientSelect: "",
        patientId: "",
        doctorSelect: getValues("doctorSelect"),
        doctorId: getValues("doctorId"),
        appointmentDate: todayDateValue,
        appointmentTime: null,
        clinicServiceId: "",
        paymentMode: "",
        notes: "",
        price: "",
        paymentNotes: "",
        bookingSource: "walk_in",
      });

      setSelectedSlot(null);
      setSymptoms([mkSymptom("")]);
      setOpenSymptomId(null);
      setSuggestionsById({});
      setLoadingById({});
      navigate("/appointment");
    } catch (err: any) {
      toastError("Create failed", err, "Failed to create appointment.");
    }
  };

  /* ---------- Create Appointment ---------- */
  const [createAppointment, { isLoading: isCreating }] =
    useCreateAppointmentMutation();

  const onSubmit = handleSubmit(async (values: NewAppointmentForm) => {
    try {
      if (!values.patientId) {
        setError("patientSelect", {
          type: "manual",
          message: "Please choose a patient.",
        });
        scrollToField(patientFieldRef, "patientSelect");
        return;
      }

      if (!values.doctorId) {
        setError("doctorSelect", {
          type: "manual",
          message: "Please choose a doctor.",
        });
        scrollToField(doctorFieldRef, "doctorSelect");
        return;
      }

      if (!hasActiveSubscription) {
        toastError("No active subscription", {
          message:
            "This doctor and patient do not have an active subscription. Please choose a plan first.",
        });
        return;
      }

      if (!values.clinicServiceId) {
        setError("clinicServiceId", {
          type: "manual",
          message: "Please choose a clinic service.",
        });
        scrollToField(serviceFieldRef, "clinicServiceId");
        return;
      }

      // Payment mode is deliberately NOT a blocker here — the confirmation
      // modal captures it late when the section was skipped, so the user is
      // never bounced back down the page. `requiresPaymentMode` keeps the
      // modal's Confirm button disabled until a mode exists.

      if (!values.appointmentDate) {
        toastError("Select a date", { message: "Please pick a date." });
        return;
      }

      if (!selectedSlot) {
        setError("appointmentTime", {
          type: "manual",
          message: "Please select an available token/slot.",
        });
        scrollToField(slotFieldRef, "appointmentTime");
        return;
      }

      // Instead of directly creating appointment, prepare data and show modal
      const appointmentPayload = await prepareAppointmentPayload(values);
      setPendingAppointmentData(appointmentPayload);
      setIsConfirmModalOpen(true);
    } catch (err: any) {
      toastError("Validation failed", err, "Please check all required fields.");
    }
  });

  const patientsErrorShownRef = React.useRef(false);
  const doctorsErrorShownRef = React.useRef(false);
  const slotsErrorShownRef = React.useRef(false);

  React.useEffect(() => {
    if (isPatientsError && !patientsErrorShownRef.current) {
      patientsErrorShownRef.current = true;
      toastError(
        "Load patients failed",
        patientsError,
        "Failed to fetch patients.",
      );
    }
    if (!isPatientsError) patientsErrorShownRef.current = false;
  }, [isPatientsError, patientsError]);

  React.useEffect(() => {
    if (isDoctorsError && !doctorsErrorShownRef.current) {
      doctorsErrorShownRef.current = true;
      toastError(
        "Load doctors failed",
        doctorsError,
        "Failed to fetch doctors.",
      );
    }
    if (!isDoctorsError) doctorsErrorShownRef.current = false;
  }, [isDoctorsError, doctorsError]);

  React.useEffect(() => {
    if (isSlotsError && !slotsErrorShownRef.current) {
      slotsErrorShownRef.current = true;
      toastError(
        "Load slots failed",
        slotsError,
        "Failed to fetch available slots.",
      );
    }
    if (!isSlotsError) slotsErrorShownRef.current = false;
  }, [isSlotsError, slotsError]);

  /* ---------------- Draft persistence (debounced) ---------------- */
  const draftTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (skipDraftPersistRef.current) return;

    // Debounce localStorage writes — 500ms after last change
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);

    draftTimerRef.current = setTimeout(() => {
      const hasSymptomData = symptoms.some((s) => String(s?.name ?? "").trim());

      const hasDraftData =
        !!patientSelect ||
        !!patientId ||
        !!doctorSelect ||
        !!doctorId ||
        toApiDate(appointmentDate) !== todayIso ||
        !!appointmentTimeValue ||
        !!selectedServiceFlow ||
        !!paymentMode ||
        !!String(notes ?? "").trim() ||
        hasSymptomData;

      if (!hasDraftData) {
        clearAppointmentDraft();
        return;
      }

      writeAppointmentDraft({
        values: {
          patientSelect: "",
          patientId: "",
          doctorSelect: String(doctorSelect ?? ""),
          doctorId: String(doctorId ?? ""),
          appointmentDate: toApiDate(appointmentDate),
          appointmentTime: appointmentTimeValue
            ? String(appointmentTimeValue)
            : null,
          clinicServiceId: String(selectedServiceFlow ?? ""),
          paymentMode: String(paymentMode ?? ""),
          notes: String(notes ?? ""),
          price: String(watchedPrice ?? ""),
          paymentNotes: String(paymentNotes ?? ""),
          bookingSource: bookingSource,
        },
        patientSnapshot: null,
        dayRange,
        symptoms:
          Array.isArray(symptoms) && symptoms.length > 0
            ? symptoms
            : [mkSymptom("")],
        showAllTokens,
        doctorSnapshot: doctorDraftSnapshot,
      });
    }, 500);

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [
    patientSelect,
    patientId,
    doctorSelect,
    doctorId,
    appointmentDate,
    appointmentTimeValue,
    selectedServiceFlow,
    paymentMode,
    watchedPrice,
    paymentNotes,
    notes,
    bookingSource,
    dayRange,
    symptoms,
    showAllTokens,
    doctorDraftSnapshot,
    todayIso,
  ]);

  const handleDoctorSelectionChange = (key: React.Key | null) => {
    const val = key ? String(key) : null;

    if (val) {
      clearErrors("doctorSelect");
      focusField(
        serviceFieldRef,
        '[data-slot="trigger"],button,input,[tabindex]',
      );
      // Auto-scroll to service selection after picking a doctor
      window.setTimeout(() => {
        serviceFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  };

  const handleServiceSelectionChange = (
    keys: unknown,
    onChange: (value: string) => void,
  ) => {
    const k = Array.from(keys as Set<React.Key>)[0];
    const next = k ? String(k) : "";

    onChange(next);

    if (next) {
      clearErrors("clinicServiceId");
      focusAfterServiceSelection(next);
      // Auto-scroll to date & time section after picking a service
      window.setTimeout(() => {
        dateFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  };

  const focusPaymentByIndex = (idx: number) => {
    const buttons = Array.from(
      paymentFieldRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-payment-option="true"]:not(:disabled)',
      ) ?? [],
    );

    if (!buttons.length) return;

    const safeIndex =
      ((idx % buttons.length) + buttons.length) % buttons.length;
    buttons[safeIndex]?.focus();
  };

  const getInitialPaymentTabIndex = (
    value: string,
    idx: number,
    disablePayment: boolean,
    selectedValue: string,
  ) => {
    if (disablePayment) return -1;
    if (selectedValue) return selectedValue === value ? 0 : -1;
    return idx === 0 ? 0 : -1;
  };

  const handleSelectPayment = (
    onChange: (value: string) => void,
    value: string,
  ) => {
    onChange(value);
    clearErrors("paymentMode");

    if (value === "UPI") {
      const price = Number(
        selectedServiceData?.price ??
        selectedServiceData?.amount ??
        selectedServiceData?.fees ??
        0
      );
      const doctorUpiIds: string[] =
        selectedDoctorData?.upiIds ||
        selectedDoctorData?.doctorProfile?.upiIds ||
        selectedDoctorData?.profile?.upiIds ||
        [];

      if (doctorUpiIds.length > 0 && price > 0) {
        setIsUPIQRModalOpen(true);
      }
    }

    window.setTimeout(() => {
      // Only UPI/Card need extra note input
      if (value === "UPI" || value === "Card") {
        const noteInput = paymentFieldRef.current?.querySelector(
          'input[name="paymentNotes"]',
        ) as HTMLInputElement | null;

        noteInput?.focus();
        return;
      }

      // Cash / Pay Later should directly move to slot selection
      focusSlotSelection();
    }, 120);
  };

  const handlePaymentKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
    value: string,
    disablePayment: boolean,
    onChange: (value: string) => void,
  ) => {
    if (disablePayment) return;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      focusPaymentByIndex(idx + 1);
      return;
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      focusPaymentByIndex(idx - 1);
      return;
    }

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleSelectPayment(onChange, value);
    }
  };

  const handlePaymentNotesKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      focusSlotSelection();
    }
  };

  const selectedServiceOption = React.useMemo(
    () =>
      clinicServiceOptions.find(
        (option) => String(option.value) === String(selectedServiceFlow || ""),
      ) ?? null,
    [clinicServiceOptions, selectedServiceFlow],
  );

  const selectedServiceName =
    selectedServiceOption?.name ||
    String(
      selectedServiceData?.serviceName ?? selectedServiceData?.name ?? "",
    ).trim();

  const selectedServiceAmountText = React.useMemo(() => {
    if (selectedServiceOption?.priceText) return selectedServiceOption.priceText;

    const raw =
      selectedServiceData?.price ??
      selectedServiceData?.amount ??
      selectedServiceData?.fees;
    const amount = Number(raw);

    if (Number.isFinite(amount)) return `₹${amount}`;
    return "";
  }, [selectedServiceData, selectedServiceOption]);

  const patientAddressText = React.useMemo(() => {
    const address = String(selectedPatientData?.address ?? "").trim();
    const city = String(selectedPatientData?.city ?? "").trim();
    const state = String(selectedPatientData?.state ?? "").trim();
    const addressLower = address.toLowerCase();

    const extraParts = [city, state].filter((part) => {
      if (!part) return false;
      return !addressLower.includes(part.toLowerCase());
    });

    return [address, ...extraParts].filter(Boolean).join(", ");
  }, [selectedPatientData]);

  const patientBadgeText = React.useMemo(() => {
    const status = String(selectedPatientData?.status ?? "").trim();
    if (!status) return "";
    return status.toLowerCase() === "new" ? "New Patient" : status;
  }, [selectedPatientData]);

  const summaryDateLabel = React.useMemo(() => {
    if (!dateParam) return "";

    const date = new Date(`${dateParam}T00:00:00`);
    if (Number.isNaN(date.getTime())) return formatIsoForUi(dateParam);

    const dateText = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });

    return `${dateText}, ${weekday}`;
  }, [dateParam]);

  const summaryTimeLabel = React.useMemo(() => {
    if (!selectedSlot) return "";

    if (selectedSlot.kind === "token") {
      return `Token ${(selectedSlot as TokenSlot).tokenNo}`;
    }

    const timeSlot = selectedSlot as TimeSlot;
    const duration =
      customDurationMinutes ?? Math.round(timeSlot.durationMinutes || 0);
    const endTime =
      duration > 0
        ? addMinutesToTime(timeSlot.startTime, duration)
        : timeSlot.endTime;

    return `${formatTimeTo12Hour(timeSlot.startTime)} - ${formatTimeTo12Hour(endTime)}`;
  }, [customDurationMinutes, selectedSlot]);

  const summaryPaymentMode =
    isFreeConsultationService || isServiceCoveredForSelectedDate
      ? "Not required"
      : String(paymentMode || "");

  /* ---------------- JSX ---------------- */
  return (
    <div className="flex flex-col">
      <NewAppointmentHeader />

      <form
        onSubmit={onSubmit}
        className="px-0 py-3 pb-24 md:px-4 lg:pb-3"
      >
        <div
          id="tour-reception-new-appointment-form"
          className="grid scroll-mt-6 gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px] lg:items-start"
        >
          <div className="min-w-0 space-y-4">
            <section className="rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4 dark:shadow-none">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-primary dark:bg-[#1a3a35] dark:text-[#9be7dc]">
                  <FiUser className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-[15px] font-bold text-text">
                    Patient Details
                  </h2>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    Search by name or phone number
                  </p>
                </div>
              </div>

              <div className="mt-2.5 grid gap-3 md:grid-cols-2 md:items-start">
                <PatientSelectionSection
                  rhfControl={rhfControl}
                  patientFieldRef={patientFieldRef}
                  patientACKey={patientACKey}
                  patientACOpen={patientACOpen}
                  setPatientACOpen={setPatientACOpen}
                  patientOptions={patientOptions}
                  isFetchingPatients={isFetchingPatients}
                  showInlineAddPatient={showInlineAddPatient}
                  showAddPatientInEmpty={showAddPatientInEmpty}
                  debouncedSearch={debouncedSearch}
                  openAddPatient={openAddPatient}
                  handlePatientFieldKeyDownCapture={
                    handlePatientFieldKeyDownCapture
                  }
                  onPatientInputChange={handlePatientInputChange}
                  onPatientSelectionChange={handlePatientSelectionChange}
                  jiggleKey={jiggleKey}
                />

                <div className="min-w-0">
                  <div className="mb-1.5 flex h-5 items-center justify-between gap-2">
                    <InputLabel label="Booking Source" />
                  </div>
                  <Controller
                    control={rhfControl}
                    name="bookingSource"
                    render={({ field }) => {
                      const selectedValue = String(field.value || "walk_in");
                      const selectedLabel =
                        selectedValue === "walk_in"
                          ? "Walk-in"
                          : selectedValue === "phone_call"
                            ? "Phone Call"
                            : "Web Portal";

                      return (
                        <Select
                          aria-label="Booking Source"
                          size="md"
                          variant="flat"
                          selectedKeys={new Set([selectedValue])}
                          onSelectionChange={(keys) => {
                            const val = Array.from(keys)[0] as string;
                            if (val) field.onChange(val);
                          }}
                          classNames={{
                            base: "w-full",
                            trigger:
                              "!h-10 !min-h-10 !rounded-lg border border-slate-200 bg-surface px-3 shadow-sm " +
                              "data-[focus=true]:border-primary data-[hover=true]:border-slate-300 " +
                              "dark:border-[#38445a] dark:bg-[#0f1728] dark:text-white " +
                              "dark:data-[focus=true]:border-[#46beae] dark:data-[hover=true]:border-[#46beae]",
                            innerWrapper: "px-0",
                            value: "w-full text-[13px] text-text font-semibold",
                            listboxWrapper: "max-h-64",
                            popoverContent: "rounded-xl border border-line shadow-xl dark:bg-[#111726]",
                            selectorIcon: "text-text-muted",
                          }}
                          renderValue={() => (
                            <span className="text-[13px] font-semibold text-text">
                              {selectedLabel}
                            </span>
                          )}
                        >
                          <SelectItem key="walk_in" textValue="Walk-in">
                            <span className="text-[13px] font-medium text-text">Walk-in</span>
                          </SelectItem>
                          <SelectItem key="phone_call" textValue="Phone Call">
                            <span className="text-[13px] font-medium text-text">Phone Call</span>
                          </SelectItem>
                          <SelectItem key="web_portal" textValue="Web Portal">
                            <span className="text-[13px] font-medium text-text">Web Portal</span>
                          </SelectItem>
                        </Select>
                      );
                    }}
                  />
                </div>
              </div>

              {isAddPatientOpen && (
                <div className="mt-3">
                  <InlineAddPatientForm
                    queryText={quickAddQuery}
                    onCreated={handleQuickPatientCreated}
                    onCancel={() => setIsAddPatientOpen(false)}
                  />
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4 dark:shadow-none">
              <div className="mb-2.5 flex items-start gap-3 ">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-primary dark:bg-[#1a2a3a] dark:text-[#9be7dc]">
                  <FiActivity className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-[15px] font-bold text-text">
                    Doctor &amp; Service
                  </h2>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    Choose the doctor and service for this appointment.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:items-start">
                <DoctorSelectionSection
                  rhfControl={rhfControl}
                  doctorFieldRef={doctorFieldRef}
                  doctorOptions={doctorOptions}
                  isFetchingDoctors={isFetchingDoctors}
                  onDoctorSelectionChange={handleDoctorSelectionChange}
                  jiggleKey={jiggleKey}
                />

                <ServiceSelectionSection
                  rhfControl={rhfControl}
                  serviceFieldRef={serviceFieldRef}
                  clinicServiceOptions={clinicServiceOptions}
                  canPickService={canPickService}
                  isFetchingServices={isFetchingServices}
                  formErrors={formState.errors as any}
                  onServiceSelectionChange={handleServiceSelectionChange}
                  jiggleKey={jiggleKey}
                />
              </div>
            </section>

            {!hasActiveSubscription && doctorId && patientId ? (
              <AllPlains
                doctorId={doctorId}
                patientId={patientId}
                onPlanActivated={() => {
                  setHasActiveSubscription(true);
                  refetchSlots();
                }}
              />
            ) : (
              <AppointmentDateSection
                dateFieldRef={dateFieldRef}
                isTokenMode={isTokenMode}
                showAllTokens={showAllTokens}
                setShowAllTokens={setShowAllTokens}
                dayRange={dayRange}
                setDayRange={setDayRange}
                rangeEndLabel={rangeEndLabel}
                calendarMonthSections={calendarMonthSections}
                dateParam={dateParam}
                handlePickPill={handlePickPill}
                onOpenCustomSlot={() => {
                  if (!dateParam || !doctorId) {
                    toastError("Select doctor and date first", {
                      message:
                        "Please choose a doctor and date before adding a custom slot.",
                    });
                    return;
                  }
                  setIsCustomSlotModalOpen(true);
                }}
              >
                <AppointmentSlotSection
                  slotFieldRef={slotFieldRef}
                  selectedSlot={selectedSlot}
                  customSlot={customSlot}
                  customDurationMinutes={customDurationMinutes}
                  setCustomDurationMinutes={setCustomDurationMinutes}
                  activeShiftTab={activeShiftTab}
                  setActiveShiftTab={setActiveShiftTab}
                  isSlotsLoading={isSlotsLoading}
                  isSlotsError={isSlotsError}
                  isExpired={isExpired}
                  isTokenMode={isTokenMode}
                  showAllTokens={showAllTokens}
                  setShowAllTokens={setShowAllTokens}
                  tokenSlotsToRender={tokenSlotsToRender}
                  shouldManualPickToken={shouldManualPickToken}
                  shiftUiData={shiftUiData}
                  slots={slots}
                  dateParam={dateParam}
                  doctorId={doctorId}
                  patientName={patientName}
                  doctorName={doctorName}
                  formErrors={formState.errors as any}
                  handleSelectSlot={handleSelectSlot}
                  shouldLockSlotsForToday={shouldLockSlotsForToday}
                  formatDurationLabel={formatDurationLabel}
                  addMinutesToTime={addMinutesToTime}
                  formatIsoForUi={formatIsoForUi}
                  formatTimeTo12Hour={formatTimeTo12Hour}
                  pad2={pad2}
                  jiggleKey={jiggleKey}
                />
              </AppointmentDateSection>
            )}

            <section className="rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4 dark:shadow-none">
              <div className="mb-3 flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-primary dark:bg-[#1a3a35] dark:text-[#9be7dc]">
                  <FiCreditCard className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-[15px] font-bold text-text">
                    Payment
                  </h2>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    Select payment mode for the selected service.
                  </p>
                </div>
              </div>

              <PaymentSection
                rhfControl={rhfControl}
                paymentFieldRef={paymentFieldRef}
                paymentModeOptions={paymentModeOptions}
                isServiceSelected={isServiceSelected}
                isServiceCoveredForSelectedDate={
                  isServiceCoveredForSelectedDate
                }
                isFreeConsultationService={isFreeConsultationService}
                formErrors={formState.errors as any}
                getInitialPaymentTabIndex={getInitialPaymentTabIndex}
                onPaymentSelect={handleSelectPayment}
                onPaymentKeyDown={handlePaymentKeyDown}
                onPaymentNotesKeyDown={handlePaymentNotesKeyDown}
                jiggleKey={jiggleKey}
                amountText={selectedServiceAmountText}
              />
            </section>

            <SymptomsSection
              hasActiveSubscription={hasActiveSubscription}
              symptomsBoxRef={symptomsBoxRef}
              row={symptomRow}
              chips={symptomChips}
              chipCount={symptomChipCount}
              maxSymptoms={MAX_SYMPTOMS}
              limitReached={symptomLimitReached}
              openSymptomId={openSymptomId}
              setOpenSymptomId={setOpenSymptomId}
              suggestionsById={suggestionsById}
              loadingById={loadingById}
              activeSymptomIndex={activeSymptomIndex}
              setActiveSymptomIndex={setActiveSymptomIndex}
              loadDefaultSymptoms={loadDefaultSymptoms}
              handleSymptomSearch={handleSymptomSearch}
              selectSuggestion={selectSuggestion}
              updateSymptomName={updateSymptomName}
              removeSymptom={removeSymptom}
              showLimitToast={showSymptomLimitToast}
              commitInputToChip={commitSymptomInputToChip}
              moveFirstSymptomToChip={moveFirstSymptomToChip}
              doctorSpeciality={selectedDoctorData?.speciality}
              toggleSymptomByName={toggleSymptomByName}
            />
          </div>

          <div
            className="hidden lg:block lg:sticky lg:top-4 lg:self-start"
            style={{ overflowAnchor: 'none', willChange: 'transform' }}
          >
            <AppointmentSummaryPanel
              showPatientSummary={showPatientSummary}
              patientName={patientName}
              patientAgeGender={patientAgeGender}
              patientPhone={patientPhone}
              patientAddress={patientAddressText}
              patientBadgeText={patientBadgeText}
              doctorName={doctorName}
              doctorRole={doctorRole}
              serviceName={selectedServiceName}
              dateLabel={summaryDateLabel}
              timeLabel={summaryTimeLabel}
              paymentMode={summaryPaymentMode}
              amountText={selectedServiceAmountText}
              isCreating={isCreating}
              isSubmitting={formState.isSubmitting}
              saveButtonRef={saveButtonRef}
              onSubmit={onSubmit}
              getInitials={getInitials}
            />
          </div>
        </div>

        {/* Mobile/Tablet sticky bottom bar — visible only below lg */}
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] lg:hidden">
          <div className="flex items-center justify-between gap-3">
            {selectedServiceAmountText && (
              <div className="min-w-0">
                <p className="text-[11px] text-text-muted">Total</p>
                <p className="text-[18px] font-bold leading-none text-primary">
                  {selectedServiceAmountText}
                </p>
              </div>
            )}
            <button
              ref={!saveButtonRef?.current ? saveButtonRef : undefined}
              type="button"
              onClick={onSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
              disabled={isCreating || formState.isSubmitting}
              className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[14px] font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreating || formState.isSubmitting ? "Confirming…" : "Confirm Appointment"}
              {!(isCreating || formState.isSubmitting) && <FiArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ✅ jiggle animation */}
        <style>{`
          @keyframes jiggle {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-6px); }
            40% { transform: translateX(6px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
          }
          .jiggle-anim {
            animation: jiggle 0.35s ease-in-out;
          }
          .appointment-scrollbar-hidden {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .appointment-scrollbar-hidden::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </form>
      <NewAppointmentModals
        isAddPatientOpen={false}
        onCloseAddPatient={() => setIsAddPatientOpen(false)}
        quickAddQuery={quickAddQuery}
        onPatientCreated={handleQuickPatientCreated}
        isConfirmModalOpen={isConfirmModalOpen}
        onConfirmModalOpenChange={setIsConfirmModalOpen}
        appointmentData={getConfirmationData}
        onConfirmAppointment={createAppointmentConfirmed}
        requiresPaymentMode={requiresPaymentMode}
        paymentModeOptions={paymentModeOptions}
        onSelectPaymentMode={handleSelectPaymentModeInModal}
      />
      <UPIQRCodeModal
        isOpen={isUPIQRModalOpen}
        onOpenChange={setIsUPIQRModalOpen}
        serviceName={selectedServiceName}
        amountText={selectedServiceAmountText}
        amountNumber={
          Number(
            selectedServiceData?.price ??
            selectedServiceData?.amount ??
            selectedServiceData?.fees
          ) || undefined
        }
        upiIds={
          selectedDoctorData?.upiIds ||
          selectedDoctorData?.doctorProfile?.upiIds ||
          selectedDoctorData?.profile?.upiIds ||
          []
        }
      />
      <CustomSlotModal
        isOpen={isCustomSlotModalOpen}
        onOpenChange={setIsCustomSlotModalOpen}
        isTokenMode={isTokenMode}
        onConfirmTime={handleCustomTimeSlot}
        onConfirmToken={handleCustomToken}
        workingWindows={workingWindows}
      />
    </div>
  );
};

export default NewAppointment;
