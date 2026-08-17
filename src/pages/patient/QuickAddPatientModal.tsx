import {
  Modal,
  ModalBody,
  ModalContent,
  addToast,
} from "@heroui/react";
import React from "react";
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldValues,
} from "react-hook-form";

import { FiAlertCircle } from "react-icons/fi";
import AppButton from "../../components/shared/AppButton";
import CitySelector from "../../components/shared/CitySelector";
import InputField from "../../components/shared/InputField";
import SelectField from "../../components/shared/SelectField";
import FamilyRelationSection from "./components/FamilyRelationSection";

import { useCreatePatientMutation } from "../../redux/api/patientApi";
import type { FamilyRelationSectionRef } from "./components/FamilyRelationSection";
import type {
  AddPatientFormValues,
  GenderOpt,
  QuickAddPatientModalProps,
  VoicePatientForm,
} from "./quick-add/types";
import {
  guessFromQuery,
  limitAddressText,
  loadCityStateMaps,
  onlyLetters,
  parsePatientData,
} from "./quick-add/voicePatientParsing";
import DiscardChangesModal from "./quick-add/DiscardChangesModal";
import QuickAddPatientFooter from "./quick-add/QuickAddPatientFooter";
import QuickAddPatientFormSections from "./quick-add/QuickAddPatientFormSections";
import QuickAddPatientHeader from "./quick-add/QuickAddPatientHeader";
import VoiceTranscriptPanel from "./quick-add/VoiceTranscriptPanel";

const QuickAddPatientModal: React.FC<QuickAddPatientModalProps> = ({
  isOpen,
  onClose,
  queryText,
  onCreated,
}) => {
  const [createPatient, { isLoading: isCreating }] = useCreatePatientMutation();
  const familySectionRef = React.useRef<FamilyRelationSectionRef>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const [duplicateConfirmation, setDuplicateConfirmation] = React.useState<any>({ isOpen: false, existingPatient: null, payload: null });

  const recognitionRef = React.useRef<any>(null);
  const finalTranscriptRef = React.useRef("");
  const shouldAutoRestartRef = React.useRef(false);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const addressEditedRef = React.useRef(false);
  const isSuccessClosingRef = React.useRef(false);

  const getInitialValues = React.useCallback((): AddPatientFormValues => {
    const g = guessFromQuery(queryText || "");

    return {
      name: g.name,
      gender: "" as GenderOpt,
      age: "",
      mobile: "",
      alternateMobile: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      linkFamily: false,
      relationship: "",
      primaryPatientId: "",
      primaryPatientName: "",
    };
  }, [queryText]);

  // Fetch all cities/states on mount for voice parsing
  React.useEffect(() => {
    loadCityStateMaps().catch((err) =>
      console.error("Failed to fetch cities for voice parsing:", err),
    );
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { isDirty },
  } = useForm<AddPatientFormValues>({
    defaultValues: getInitialValues(),
  });

  const rhfControl = control as unknown as Control<FieldValues, FieldValues>;

  const stopVoiceAndClearTranscript = React.useCallback(() => {
    shouldAutoRestartRef.current = false;
    recognitionRef.current?.stop();
    finalTranscriptRef.current = "";
    setTranscript("");
    setListening(false);
  }, []);

  const getKeyboardFocusableFields = React.useCallback((): HTMLElement[] => {
    const form = formRef.current;
    if (!form) return [];

    const selector = [
      'input:not([type="hidden"]):not([disabled]):not([readonly])',
      "textarea:not([disabled]):not([readonly])",
      '[role="combobox"]:not([aria-disabled="true"])',
      '[data-slot="trigger"]:not([aria-disabled="true"])',
    ].join(",");

    const nodes = Array.from(form.querySelectorAll<HTMLElement>(selector));
    const unique: HTMLElement[] = [];
    const seen = new Set<HTMLElement>();

    nodes.forEach((el) => {
      if (seen.has(el)) return;
      if (!el.offsetParent && el !== document.activeElement) return;
      if (el.getAttribute("aria-hidden") === "true") return;

      seen.add(el);
      unique.push(el);
    });

    return unique;
  }, []);

  const focusNextField = React.useCallback(
    (currentEl: HTMLElement) => {
      const fields = getKeyboardFocusableFields();
      if (!fields.length) return false;

      const currentIndex = fields.findIndex(
        (field) => field === currentEl || field.contains(currentEl),
      );

      if (currentIndex === -1) return false;

      const nextField = fields[currentIndex + 1];
      if (!nextField) return false;

      nextField.focus();

      if (nextField instanceof HTMLInputElement) {
        nextField.select?.();
      }

      return true;
    },
    [getKeyboardFocusableFields],
  );

  const handleFormKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLFormElement>) => {
      if (e.key !== "Enter") return;
      if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const tagName = target.tagName.toLowerCase();
      const inputType = target.getAttribute("type")?.toLowerCase() ?? "";

      const isTextarea = tagName === "textarea";
      const isButtonLike =
        tagName === "button" ||
        inputType === "button" ||
        inputType === "submit" ||
        inputType === "reset";
      const isCheckboxLike = inputType === "checkbox" || inputType === "radio";

      const isComboLike =
        target.getAttribute("role") === "combobox" ||
        !!target.closest('[role="combobox"]') ||
        target.getAttribute("data-slot") === "trigger" ||
        !!target.closest('[data-slot="trigger"]') ||
        target.getAttribute("aria-autocomplete") != null ||
        !!target.closest("[aria-autocomplete]");

      const isExpanded =
        target.getAttribute("aria-expanded") === "true" ||
        !!target.closest('[aria-expanded="true"]');

      if (isTextarea || isButtonLike || isCheckboxLike) return;
      if (isComboLike || isExpanded) return;

      e.preventDefault();

      const moved = focusNextField(target);
      if (!moved) {
        e.currentTarget.requestSubmit();
      }
    },
    [focusNextField],
  );

  const applyParsedDataToForm = React.useCallback(
    (parsed: Partial<VoicePatientForm>) => {
      if (parsed.name) {
        setValue("name", onlyLetters(parsed.name), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      if (parsed.gender) {
        setValue("gender", parsed.gender, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      if (parsed.age) {
        const ageNumber = Number(parsed.age);
        if (!Number.isNaN(ageNumber) && ageNumber >= 1 && ageNumber <= 100) {
          setValue("age", ageNumber, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }

      if (parsed.mobile) {
        setValue("mobile", parsed.mobile, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      if (parsed.alternateMobile) {
        setValue("alternateMobile", parsed.alternateMobile, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      if (parsed.address) {
        addressEditedRef.current = true;
        setValue("address", limitAddressText(parsed.address), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      if (parsed.city) {
        setValue("city", onlyLetters(parsed.city), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      if (parsed.state) {
        setValue("state", onlyLetters(parsed.state), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    },
    [setValue],
  );

  React.useEffect(() => {
    if (!isOpen) {
      stopVoiceAndClearTranscript();
      return;
    }

    addressEditedRef.current = false;
    isSuccessClosingRef.current = false;
    stopVoiceAndClearTranscript();
    reset(getInitialValues());
  }, [isOpen, reset, getInitialValues, stopVoiceAndClearTranscript]);

  React.useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      const firstField = getKeyboardFocusableFields()[0];
      firstField?.focus();

      if (firstField instanceof HTMLInputElement) {
        firstField.select?.();
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [isOpen, getKeyboardFocusableFields]);

  const handleModalClose = React.useCallback(() => {
    if (isSuccessClosingRef.current) {
      isSuccessClosingRef.current = false;
      return;
    }

    if (isDirty) {
      setShowConfirm(true);
      return;
    }

    addressEditedRef.current = false;
    stopVoiceAndClearTranscript();
    reset(getInitialValues());
    onClose();
  }, [isDirty, reset, getInitialValues, onClose, stopVoiceAndClearTranscript]);

  const forceClose = React.useCallback(() => {
    setShowConfirm(false);
    addressEditedRef.current = false;
    isSuccessClosingRef.current = true;
    lastTriggeredMobile.current = "";
    stopVoiceAndClearTranscript();
    reset(getInitialValues());
    onClose();
  }, [reset, getInitialValues, onClose, stopVoiceAndClearTranscript]);

  const addressVal = useWatch({ control, name: "address" });
  const cityVal = useWatch({ control, name: "city" });
  const stateVal = useWatch({ control, name: "state" });
  const mobileVal = useWatch({ control, name: "mobile" }) as string ?? "";

  // Fire check-mobile the instant the field reaches a valid 10-digit number.
  const lastTriggeredMobile = React.useRef("");
  React.useEffect(() => {
    if (!isOpen) return;
    const trimmed = String(mobileVal).trim();
    if (!/^[6-9]\d{9}$/.test(trimmed)) return;
    if (trimmed === lastTriggeredMobile.current) return;
    lastTriggeredMobile.current = trimmed;
    familySectionRef.current?.checkMobile(trimmed);
  }, [mobileVal, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    if (addressEditedRef.current) return;

    const v = String(addressVal ?? "").trim();
    if (v) {
      setValue("address", "", { shouldDirty: false, shouldValidate: false });
    }
  }, [isOpen, addressVal, setValue]);

  React.useEffect(() => {
    if (!isOpen) return;
    const clean = onlyLetters(cityVal);
    if ((cityVal ?? "") !== clean) {
      setValue("city", clean, { shouldDirty: true, shouldValidate: false });
    }
  }, [isOpen, cityVal, setValue]);

  React.useEffect(() => {
    if (!isOpen) return;
    const clean = onlyLetters(stateVal);
    if ((stateVal ?? "") !== clean) {
      setValue("state", clean, { shouldDirty: true, shouldValidate: false });
    }
  }, [isOpen, stateVal, setValue]);

  const handleCityStateChange = (city: string, state: string, shouldValidate = true) => {
    const cleanCity = onlyLetters(city);
    const cleanState = onlyLetters(state);

    setValue("city", cleanCity, { shouldDirty: true, shouldValidate });
    setValue("state", cleanState, { shouldDirty: true, shouldValidate });

    if (!addressEditedRef.current) {
      setValue("address", "", { shouldDirty: false, shouldValidate: false });
    }
  };

  React.useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscriptRef.current += `${chunk} `;
        } else {
          interim += chunk;
        }
      }

      const combined = `${finalTranscriptRef.current}${interim}`.trim();
      setTranscript(combined);

      const stableTranscript = finalTranscriptRef.current.trim();

      if (stableTranscript) {
        const parsed = parsePatientData(stableTranscript);
        applyParsedDataToForm(parsed);
      }
    };

    recognition.onstart = () => setListening(true);

    recognition.onend = () => {
      if (shouldAutoRestartRef.current && isOpen) {
        window.setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch {
            //
          }
        }, 100);
      } else {
        setListening(false);
      }
    };

    recognition.onerror = (e: any) => {
      console.log("Speech recognition error =>", e);

      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        shouldAutoRestartRef.current = false;
        setListening(false);
        return;
      }

      if (e?.error === "aborted") {
        setListening(false);
        return;
      }

      if (e?.error === "no-speech") {
        addToast({
          title: "No speech detected",
          description: "Please speak clearly and try again.",
          color: "warning",
          variant: "flat",
        });
        return;
      }

      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldAutoRestartRef.current = false;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [applyParsedDataToForm, isOpen]);

  const handleDictation = React.useCallback(async () => {
    if (!recognitionRef.current) {
      addToast({
        title: "Speech not supported",
        description: "Your browser does not support speech recognition.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    if (listening) {
      shouldAutoRestartRef.current = false;
      recognitionRef.current.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      shouldAutoRestartRef.current = true;
      finalTranscriptRef.current = "";
      setTranscript("");
      recognitionRef.current.start();
    } catch (error) {
      console.log("Microphone permission error =>", error);

      addToast({
        title: "Microphone permission needed",
        description: "Please allow microphone access and try again.",
        color: "danger",
        variant: "flat",
      });
    }
  }, [listening]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      const payload: any = {
        name: onlyLetters(v.name).trim(),
        gender: (v.gender || "").toString(),
        age:
          v.age === undefined || v.age === null || v.age === ""
            ? undefined
            : Number(v.age),
        mobile: String(v.mobile ?? "").trim(),
        alternateMobile: v.alternateMobile?.trim() || undefined,
        address: v.address
          ? limitAddressText(String(v.address)).trim()
          : undefined,
        city: onlyLetters(v.city).trim() || undefined,
        state: onlyLetters(v.state).trim() || undefined,
        country: v.country?.trim() || undefined,
      };

      if (!payload.name || !payload.mobile || !payload.gender) {
        addToast({
          title: "Missing required",
          description: "Full Name, Gender, and Phone No are required.",
          color: "danger",
          variant: "flat",
        });
        return;
      }

      if (
        payload.age === undefined ||
        payload.age === null ||
        payload.age === ""
      ) {
        addToast({
          title: "Missing required",
          description: "Age is required.",
          color: "danger",
          variant: "flat",
        });
        return;
      }

      if (!payload.city || !payload.state) {
        addToast({
          title: "Missing required",
          description: "City and State are required.",
          color: "danger",
          variant: "flat",
        });
        return;
      }

      if (payload.age != null && Number(payload.age) > 100) {
        addToast({
          title: "Invalid age",
          description: "Age must be 100 or below.",
          color: "danger",
          variant: "flat",
        });
        return;
      }

      // Family-relation validation
      if (v.linkFamily) {
        if (!(v.relationship ?? "").trim()) {
          addToast({
            title: "Missing required",
            description: "Please select a relationship.",
            color: "danger",
            variant: "flat",
          });
          return;
        }

        const duplicateFamilyMember =
          familySectionRef.current?.getDuplicateFamilyMember({
            name: payload.name,
            gender: payload.gender,
            age: payload.age,
            relationship: v.relationship,
          });

        if (duplicateFamilyMember) {
          setError("relationship", {
            type: "manual",
            message: duplicateFamilyMember.message,
          });
          addToast({
            title: "Patient already exists",
            description: duplicateFamilyMember.message,
            color: "warning",
            variant: "flat",
          });
          return;
        }

        payload.relationship = v.relationship;
        payload.primaryPatientId = (v.primaryPatientId ?? "").trim();
      }

      const data: any = await createPatient(payload).unwrap();
      const id = String(data?.result?.id ?? data?.result?._id ?? "");

      if (!id) {
        addToast({
          title: "Add patient failed ❌",
          description: "Patient ID not returned from API.",
          color: "danger",
          variant: "flat",
        });
        return;
      }

      addToast({
        title: "Patient added ✅",
        description: "New patient has been created successfully.",
        color: "success",
        variant: "flat",
      });

      onCreated({ id, name: payload.name, mobile: payload.mobile });
      isSuccessClosingRef.current = true;
      stopVoiceAndClearTranscript();
      reset(getInitialValues());
      onClose();
    } catch (err: any) {
      const backendErrors = err?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        backendErrors.forEach((e: any) => {
          if (e?.path && e?.message) {
            setError(e.path, { type: "server", message: e.message });
          }
        });

        addToast({
          title: "Validation failed ❌",
          description: "Please correct the highlighted fields.",
          color: "danger",
          variant: "flat",
        });
        return;
      }

      const msg =
        err?.data?.message ||
        err?.data?.error ||
        err?.error ||
        err?.message ||
        "Failed to add patient";

      addToast({
        title: "Add patient failed ❌",
        description: msg,
        color: "danger",
        variant: "flat",
      });
    }
  });

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) handleModalClose();
        }}
        size="3xl"
        scrollBehavior="inside"
        placement="center"
        isDismissable={false}
        isKeyboardDismissDisabled={false}
        classNames={{
          wrapper:
            "z-[1001] items-end px-0 py-0 sm:items-center sm:px-4 sm:py-6",
          backdrop: "z-[1000] bg-black/45",
          base: [
            "m-0",
            "w-full",
            "max-w-full",
            "rounded-b-none",
            "rounded-t-[28px]",
            "overflow-hidden",
            "shadow-2xl",
            "max-h-[94dvh]",
            "sm:m-4",
            "sm:max-w-3xl",
            "sm:rounded-[28px]",
            "sm:max-h-[90vh]",
          ].join(" "),
          closeButton:
            "top-4 right-4 z-30 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700",
        }}
      >
        <ModalContent className="max-h-[94dvh] sm:h-auto sm:max-h-[90vh]">
          {() => (
            <form
              ref={formRef}
              onSubmit={onSubmit}
              onKeyDown={handleFormKeyDown}
              autoComplete="off"
              noValidate
              className="flex max-h-[94dvh] min-h-0 flex-col bg-white sm:max-h-[90vh]"
            >
              <input
                className="hidden"
                autoComplete="username"
                value=""
                readOnly
              />
              <input
                className="hidden"
                type="password"
                autoComplete="new-password"
                value=""
                readOnly
              />

              <QuickAddPatientHeader
                listening={listening}
                onDictation={handleDictation}
              />

              <ModalBody className="min-h-0 gap-3 overflow-y-auto overscroll-contain bg-slate-50/50 px-3 py-3 sm:px-5 sm:py-4">
                <VoiceTranscriptPanel
                  listening={listening}
                  transcript={transcript}
                />
                <QuickAddPatientFormSections
                  control={control}
                  rhfControl={rhfControl}
                  addressEditedRef={addressEditedRef}
                  onCityStateChange={handleCityStateChange}
                />

                {/* Family-relation section (only visible when mobile resolves to an existing patient) */}
                <FamilyRelationSection
                  ref={familySectionRef}
                  control={control}
                  setValue={setValue}
                  mobileValue={mobileVal}
                />
              </ModalBody>

              <QuickAddPatientFooter
                isCreating={isCreating}
                onCancel={handleModalClose}
              />
            </form>
          )}
        </ModalContent>
      </Modal>

      <DiscardChangesModal
        isOpen={showConfirm}
        onOpenChange={setShowConfirm}
        onDiscard={forceClose}
      />
    </>
  );
};

export default QuickAddPatientModal;
