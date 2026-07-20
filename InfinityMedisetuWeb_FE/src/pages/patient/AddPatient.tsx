import { addToast } from "@heroui/react";
import React, { useEffect, useRef, useState } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldValues,
} from "react-hook-form";
import { FiChevronRight } from "react-icons/fi";
import { useNavigate } from "react-router";

import PatientFormSections from "./components/PatientFormSections";
import PatientFormSidebar from "./components/PatientFormSidebar";
import FamilyRelationSection from "./components/FamilyRelationSection";
import AppButton from "../../components/shared/AppButton";
import { useCreatePatientMutation } from "../../redux/api/patientApi";
import type { FamilyRelationSectionRef } from "./components/FamilyRelationSection";

type GenderOpt = "Male" | "Female" | "Other" | "";

type FormValues = {
  name: string;
  email?: string;
  gender: GenderOpt;
  age?: number | string;
  dob?: string | Date | null | { year: number; month: number; day: number };
  countryCallingCode?: string;
  countryCode?: string;
  mobile: string;
  alternateMobile?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  profileImageUrl?: string;
  notesMedicalHistory?: string;
  bloodGroup?: string;
  height?: string;
  weight?: string;
  allergies?: string[];
  chronicConditions?: string[];

  // Family-relation linking (UI-only control fields)
  linkFamily?: boolean;
  relationship?: string;
  primaryPatientId?: string;
  primaryPatientName?: string;
};

type VoicePatientForm = {
  name: string;
  gender: GenderOpt;
  age: string;
  mobile: string;
  alternateMobile: string;
  address: string;
  city: string;
  state: string;
};

// Dynamic city/state maps will be populated on mount
let CITIES_MAP: Record<string, string> = {};
let STATES_MAP: Record<string, string> = {};
let CITY_TO_STATE_MAP: Record<string, string> = {};

const NON_NAME_WORDS = new Set([
  "name",
  "patient",
  "age",
  "years",
  "year",
  "old",
  "phone",
  "number",
  "address",
  "city",
  "state",
  "gender",
  "male",
  "female",
  "mail",
  "femail",
  "other",
  "alternate",
  "mobile",
  "save",
  "add",
  "enter",
  "his",
  "her",
  "their",
  "the",
  "and",
  "or",
  "is",
  "my",
  "your",
  "our",
  "call",
  "tell",
  "ask",
  "what",
  "who",
  "from",
  "lives",
  "yrs",
  "a",
  "an",
  "in",
  "at",
  "on",
  "of",
  "for",
  "to",
  "with",
]);

const SPOKEN_DIGIT_MAP: Record<string, string> = {
  zero: "0",
  oh: "0",
  o: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  ate: "8",
  nine: "9",
};

const MAX_ADDRESS_WORDS = 25;
const MAX_ADDRESS_CHARS = 250;

const getAddressWords = (value: string) => {
  return value.trim().split(/\s+/).filter(Boolean);
};

const limitAddressText = (value: string) => {
  const words = getAddressWords(value);

  let limitedValue = value;

  if (words.length > MAX_ADDRESS_WORDS) {
    limitedValue = words.slice(0, MAX_ADDRESS_WORDS).join(" ");
  }

  if (limitedValue.length > MAX_ADDRESS_CHARS) {
    limitedValue = limitedValue.slice(0, MAX_ADDRESS_CHARS);
  }

  return limitedValue;
};

function capitalizeWords(value: string) {
  return value.replace(
    /[A-Za-z]+/g,
    (word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
  );
}

function toTitleCase(str: string) {
  return capitalizeWords(str).trim();
}

function normalizePhoneSpeech(text: string) {
  return text
    .toLowerCase()
    .replace(/\bplus\s*91\b/g, "+91")
    .replace(/[.,/]/g, " ")
    .replace(
      /\b(zero|oh|o|one|two|three|four|five|six|seven|eight|ate|nine)\b/g,
      (match) => SPOKEN_DIGIT_MAP[match] ?? match,
    )
    .replace(/\s+/g, " ")
    .trim();
}

function extractIndianPhones(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return [];

  const matches: string[] = [];
  const seen = new Set<string>();

  const pushIfValid = (value: string) => {
    if (/^[6-9]\d{9}$/.test(value) && !seen.has(value)) {
      seen.add(value);
      matches.push(value);
    }
  };

  const collectWindows = (source: string) => {
    if (source.length < 10) return;

    if (source.length === 10) {
      pushIfValid(source);
      return;
    }

    for (let i = 0; i <= source.length - 10; i++) {
      pushIfValid(source.slice(i, i + 10));
    }
  };

  if (digits.startsWith("91") && digits.length >= 12) {
    collectWindows(digits.slice(2));
  }

  if (digits.startsWith("0") && digits.length >= 11) {
    collectWindows(digits.slice(1));
  }

  collectWindows(digits);

  return matches;
}

function parseGender(lower: string): GenderOpt | undefined {
  const explicitMatch = lower.match(
    /\b(?:gender|sex)\s*(?:is|:)?\s*(male|mail|female|femail|other|transgender|non.?binary)\b/i,
  );

  if (explicitMatch?.[1]) {
    const val = explicitMatch[1].toLowerCase();

    if (val === "male" || val === "mail") return "Male";
    if (val === "female" || val === "femail") return "Female";
    return "Other";
  }

  if (/\bfemale\b|\bfemail\b|\bwoman\b|\bgirl\b/.test(lower)) return "Female";
  if (/\bmale\b|\bmail\b|\bman\b|\bboy\b/.test(lower)) return "Male";
  if (/\bother\b|\btransgender\b|\bnon.?binary\b/.test(lower)) return "Other";

  return undefined;
}

function parseExplicitCity(text: string): string | undefined {
  const patterns = [
    /\bcity\s*(?:is|=|:)?\s*([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})\b/i,
    /\bmy\s+city\s+is\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})\b/i,
    /\blive\s+in\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})\b/i,
    /\bfrom\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const cleaned = match[1]
        .trim()
        .replace(
          /\b(state|country|india|address|mobile|phone|number|gender|age)\b.*$/i,
          "",
        )
        .trim();

      if (cleaned) {
        return toTitleCase(cleaned);
      }
    }
  }

  return undefined;
}

function parsePatientData(text: string): Partial<VoicePatientForm> {
  const result: Partial<VoicePatientForm> = {};
  const lower = text.toLowerCase().trim();

  const nameCommandMatch = text.match(
    /\b(?:name\s+is|full\s+name\s+is|full\s+name|name\s*[:=]?|patient(?:'s)?\s+name(?:\s+is)?)\s+([a-z]+(?:\s+[a-z]+){0,2})/i,
  );

  if (nameCommandMatch?.[1]) {
    result.name = toTitleCase(nameCommandMatch[1].trim());
  }

  if (!result.name) {
    const leadingNameMatch = text.match(
      /^\s*([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=\s*(?:,|;|:|-|\b(?:male|mail|female|femail|other|man|woman|boy|girl|age|\d{1,3})\b))/i,
    );

    if (leadingNameMatch?.[1]) {
      const cleaned = leadingNameMatch[1]
        .split(" ")
        .filter((part) => !NON_NAME_WORDS.has(part.toLowerCase()))
        .join(" ")
        .trim();

      if (cleaned) {
        result.name = toTitleCase(cleaned);
      }
    }
  }

  if (!result.name) {
    const titleCaseRun = text.match(
      /\b([A-Z][a-z]{1,14})(?:\s+([A-Z][a-z]{1,14})(?:\s+([A-Z][a-z]{1,14}))?)?\b/g,
    );

    if (titleCaseRun) {
      for (const candidate of titleCaseRun) {
        const parts = candidate.split(" ");
        const valid = parts.every((p) => !NON_NAME_WORDS.has(p.toLowerCase()));

        if (valid && parts.length >= 1) {
          result.name = candidate;
          break;
        }
      }
    }
  }

  const parsedGender = parseGender(lower);
  if (parsedGender) {
    result.gender = parsedGender;
  }

  const agePatterns = [
    /\bage\s+(?:is\s+)?(\d{1,3})\b/i,
    /\b(\d{1,3})\s*(?:years?|yrs?)\s*(?:old)?\b/i,
    /\b(\d{1,3})\s*(?:y\/o|yo)\b/i,
  ];

  for (const pat of agePatterns) {
    const m = text.match(pat);

    if (m?.[1]) {
      const age = parseInt(m[1], 10);

      if (age > 0 && age <= 100) {
        result.age = String(age);
        break;
      }
    }
  }

  if (!result.age) {
    const beforeGender = text.match(
      /\b(\d{1,3})\b(?=\s*[,;:-]?\s*(?:gender\s+)?(?:male|mail|female|femail|other|man|woman|boy|girl|transgender|non.?binary)\b)/i,
    );

    if (beforeGender?.[1]) {
      const age = parseInt(beforeGender[1], 10);

      if (age > 0 && age <= 100) {
        result.age = String(age);
      }
    }
  }

  const phoneSource = normalizePhoneSpeech(text);

  const alternateMatch = phoneSource.match(
    /\b(?:alternate|alt|secondary)\s*(?:phone|mobile|contact)?\s*(?:number)?\s*(?:is|:)?\s*([+\d\s-]{10,40})/i,
  );

  if (alternateMatch?.[1]) {
    const alternatePhones = extractIndianPhones(alternateMatch[1]);
    if (alternatePhones[0]) {
      result.alternateMobile = alternatePhones[0];
    }
  }

  const primaryMatch = phoneSource.match(
    /\b(?:phone|mobile|contact)\s*(?:number)?\s*(?:is|:)?\s*([+\d\s-]{10,40})/i,
  );

  if (primaryMatch?.[1]) {
    const primaryPhones = extractIndianPhones(primaryMatch[1]);
    if (primaryPhones[0]) {
      result.mobile = primaryPhones[0];
    }
  }

  if (!result.mobile || !result.alternateMobile) {
    const genericPhoneMatches =
      phoneSource.match(/(?:\+?\d[\d\s-]{8,40}\d)/g) ?? [];

    const parsedPhones = genericPhoneMatches.flatMap((item) =>
      extractIndianPhones(item),
    );

    const uniquePhones = [...new Set(parsedPhones)];

    if (!result.mobile && uniquePhones[0]) {
      result.mobile = uniquePhones[0];
    }

    if (!result.alternateMobile) {
      const altCandidate = uniquePhones.find((item) => item !== result.mobile);
      if (altCandidate) {
        result.alternateMobile = altCandidate;
      }
    }
  }

  const explicitCity = parseExplicitCity(text);
  if (explicitCity) {
    result.city = explicitCity;
    if (CITY_TO_STATE_MAP[explicitCity]) {
      result.state = CITY_TO_STATE_MAP[explicitCity];
    }
  }

  if (!result.city) {
    const sortedCities = Object.keys(CITIES_MAP).sort(
      (a, b) => b.length - a.length,
    );
    for (const city of sortedCities) {
      if (lower.includes(city)) {
        result.city = CITIES_MAP[city];
        if (CITY_TO_STATE_MAP[CITIES_MAP[city]]) {
          result.state = CITY_TO_STATE_MAP[CITIES_MAP[city]];
        }
        break;
      }
    }
  }

  if (!result.state) {
    const sortedStates = Object.keys(STATES_MAP).sort(
      (a, b) => b.length - a.length,
    );
    for (const state of sortedStates) {
      if (lower.includes(state)) {
        result.state = STATES_MAP[state];
        break;
      }
    }
  }

  const addrMatch = text.match(
    /\b(?:address|lives?\s+at|residing\s+at|flat|house|plot|sector|near|behind|opposite)\b.{5,}/i,
  );

  if (addrMatch?.[0]) {
    result.address = limitAddressText(
      addrMatch[0].replace(/^address\s*(is\s*)?/i, "").trim(),
    );
  }

  return result;
}

const AddPatient: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const shouldAutoRestartRef = useRef(false);

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [, setPhoto] = useState<File | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      email: "",
      gender: "" as GenderOpt,
      age: undefined,
      dob: undefined,
      countryCallingCode: "+91",
      countryCode: "IN",
      mobile: "",
      alternateMobile: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      profileImageUrl: "",
      notesMedicalHistory: "",
      bloodGroup: "",
      height: "",
      weight: "",
      allergies: [],
      chronicConditions: [],
      linkFamily: false,
      relationship: "",
      primaryPatientId: "",
      primaryPatientName: "",
    },
  });

  const rhfControl = control as unknown as Control<FieldValues, FieldValues>;

  const genderValue = useWatch({ control, name: "gender" });
  const cityValue = useWatch({ control, name: "city" });
  const addressValue = useWatch({ control, name: "address" });

  // Watched values for the sidebar live preview
  const watchedName = useWatch({ control, name: "name" }) as string ?? "";
  const watchedAge = useWatch({ control, name: "age" }) as string ?? "";
  const watchedMobile = useWatch({ control, name: "mobile" }) as string ?? "";
  const watchedState = useWatch({ control, name: "state" }) as string ?? "";

  const nameFieldRef = useRef<HTMLDivElement | null>(null);
  const genderFieldRef = useRef<HTMLDivElement | null>(null);
  const ageFieldRef = useRef<HTMLDivElement | null>(null);
  const mobileFieldRef = useRef<HTMLDivElement | null>(null);
  const cityFieldRef = useRef<HTMLDivElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  const lastGenderRef = useRef<GenderOpt | "">("");
  const lastCityRef = useRef("");

  const focusField = React.useCallback(
    (
      ref: React.RefObject<HTMLDivElement | null>,
      selector?: string,
      delay = 80,
    ) => {
      window.setTimeout(() => {
        const node = ref.current;
        if (!node) return;

        const focusEl = node.querySelector(
          selector ??
          [
            "input:not([disabled])",
            "button:not([disabled])",
            '[role="combobox"]',
            '[data-slot="trigger"]',
            '[tabindex]:not([tabindex="-1"])',
          ].join(","),
        ) as HTMLElement | null;

        focusEl?.focus?.();
      }, delay);
    },
    [],
  );

  const moveOnEnter = React.useCallback(
    (
      e: React.KeyboardEvent<HTMLDivElement>,
      nextRef: React.RefObject<HTMLDivElement | null>,
      selector?: string,
    ) => {
      if (e.key !== "Enter") return;
      if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();

      if (tag === "textarea") return;

      e.preventDefault();
      focusField(nextRef, selector);
    },
    [focusField],
  );

  const focusNameField = React.useCallback(() => {
    lastGenderRef.current = "";
    lastCityRef.current = "";
    focusField(nameFieldRef, "input:not([disabled])", 0);
  }, [focusField]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      focusNameField();
    }, 200);

    return () => window.clearTimeout(timer);
  }, [focusNameField]);

  useEffect(() => {
    const next = String(genderValue ?? "") as GenderOpt | "";
    if (!next || next === lastGenderRef.current) return;

    lastGenderRef.current = next;
    focusField(ageFieldRef, "input:not([disabled])");
  }, [genderValue, focusField]);

  useEffect(() => {
    const next = String(cityValue ?? "").trim();
    if (!next || next === lastCityRef.current) return;

    lastCityRef.current = next;

    window.setTimeout(() => {
      submitButtonRef.current?.focus();
    }, 120);
  }, [cityValue]);

  useEffect(() => {
    const currentAddress = String(addressValue ?? "");
    const limitedAddress = limitAddressText(currentAddress);

    if (currentAddress !== limitedAddress) {
      setValue("address", limitedAddress, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [addressValue, setValue]);

  const [createPatient, { isLoading: isCreating }] = useCreatePatientMutation();

  // Ref to the FamilyRelationSection so we can trigger the check-mobile call
  const familySectionRef = useRef<FamilyRelationSectionRef>(null);

  // Watch mobile so FamilyRelationSection can react to changes
  const mobileValue = useWatch({ control, name: "mobile" }) as string ?? "";

  // Fire check-mobile the instant the field reaches a valid 10-digit number.
  const lastTriggeredMobile = useRef("");
  useEffect(() => {
    const trimmed = String(mobileValue).trim();
    if (!/^[6-9]\d{9}$/.test(trimmed)) return;
    if (trimmed === lastTriggeredMobile.current) return;
    lastTriggeredMobile.current = trimmed;
    familySectionRef.current?.checkMobile(trimmed);
  }, [mobileValue]);

  const fmtDOB = (val: FormValues["dob"]) => {
    if (!val) return null;
    if (typeof val === "object" && !(val instanceof Date) && "year" in val) {
      const y = (val as any).year;
      const m = String((val as any).month).padStart(2, "0");
      const d = String((val as any).day).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    if (typeof val === "string") {
      return val.includes("/") ? val.replaceAll("/", "-") : val;
    }
    return null;
  };

  const bumpCityUsage = (city: string) => {
    if (!city) return;
    const stored = localStorage.getItem("cityUsage");
    const cityUsage: Record<string, number> = stored ? JSON.parse(stored) : {};
    cityUsage[city] = (cityUsage[city] || 0) + 1;
    localStorage.setItem("cityUsage", JSON.stringify(cityUsage));
  };

  const applyParsedDataToForm = React.useCallback((parsed: Partial<VoicePatientForm>) => {
    if (parsed.name) {
      setValue("name", parsed.name, {
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
      setValue("address", limitAddressText(parsed.address), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (parsed.city) {
      setValue("city", parsed.city, {
        shouldDirty: true,
        shouldValidate: true,
      });
      bumpCityUsage(parsed.city);
    }

    if (parsed.state) {
      setValue("state", parsed.state, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else if (parsed.city && CITY_TO_STATE_MAP[parsed.city]) {
      setValue("state", CITY_TO_STATE_MAP[parsed.city], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [setValue]);

  const handleCityStateChange = (city: string, state: string, shouldValidate = true) => {
    setValue("city", city, { shouldDirty: true, shouldValidate });
    setValue("state", state, { shouldDirty: true, shouldValidate });
    bumpCityUsage(city);
  };

  // Fetch all cities/states on mount for voice parsing
  useEffect(() => {
    fetch(
      "https://cdn.jsdelivr.net/gh/fayazara/Indian-Cities-API@master/cities.json",
    )
      .then((r) => r.json())
      .then((data: any) => {
        const cMap: Record<string, string> = {};
        const sMap: Record<string, string> = {};
        const ctsMap: Record<string, string> = {};

        const citiesArray = data?.cities;
        if (Array.isArray(citiesArray)) {
          for (const item of citiesArray) {
            const cityName = String(item.City || "").trim();
            const stateName = String(item.State || "").trim();

            if (cityName && stateName) {
              cMap[cityName.toLowerCase()] = cityName;
              sMap[stateName.toLowerCase()] = stateName;
              ctsMap[cityName] = stateName;
            }
          }
        }

        // Add some common abbreviations
        sMap["mp"] = "Madhya Pradesh";
        sMap["up"] = "Uttar Pradesh";
        sMap["ap"] = "Andhra Pradesh";
        sMap["hp"] = "Himachal Pradesh";
        sMap["jk"] = "Jammu and Kashmir";

        CITIES_MAP = cMap;
        STATES_MAP = sMap;
        CITY_TO_STATE_MAP = ctsMap;
      })
      .catch((err) =>
        console.error("Failed to fetch cities for voice parsing:", err),
      );
  }, []);

  useEffect(() => {
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

      const parsed = parsePatientData(combined);
      applyParsedDataToForm(parsed);
    };

    recognition.onstart = () => setListening(true);

    recognition.onend = () => {
      if (shouldAutoRestartRef.current) {
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

        addToast({
          title: "Microphone access denied",
          description:
            "Please allow microphone permission in browser settings.",
          color: "danger",
          variant: "flat",
        });
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
    };
  }, [setValue, applyParsedDataToForm]);

  const handleDictation = async () => {
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
  };

  const stopVoiceAndClearTranscript = () => {
    shouldAutoRestartRef.current = false;
    recognitionRef.current?.stop();
    finalTranscriptRef.current = "";
    setTranscript("");
    setListening(false);
  };

  // Scroll & focus the first field with a validation error
  const scrollToFirstError = React.useCallback(
    (fieldNames?: string[]) => {
      // Map field names to their refs
      const fieldRefMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
        name: nameFieldRef,
        gender: genderFieldRef,
        age: ageFieldRef,
        mobile: mobileFieldRef,
        city: cityFieldRef,
      };

      const order = fieldNames ?? ["name", "gender", "age", "mobile", "city"];

      for (const fieldName of order) {
        const ref = fieldRefMap[fieldName];
        if (ref?.current) {
          ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
          // Focus the input inside the ref after scroll completes
          setTimeout(() => {
            const focusEl = ref.current?.querySelector(
              'input:not([disabled]), button:not([disabled]), [role="combobox"], [data-slot="trigger"]',
            ) as HTMLElement | null;
            focusEl?.focus?.();
          }, 400);
          return;
        }
      }
    },
    [],
  );

  const onSubmit = handleSubmit(async (v) => {
    try {
      const payload = {
        name: (v.name ?? "").trim(),
        email: v.email?.trim() || undefined,
        gender: (v.gender || "").toString(),
        age:
          v.age === undefined || v.age === null || v.age === ""
            ? undefined
            : Number(v.age),
        dob: fmtDOB(v.dob) ?? undefined,
        countryCallingCode: v.countryCallingCode?.trim() || undefined,
        countryCode: v.countryCode?.trim() || undefined,
        mobile: (v.mobile ?? "").trim(),
        alternateMobile: v.alternateMobile?.trim() || undefined,
        address: v.address ? limitAddressText(v.address).trim() : undefined,
        city: v.city?.trim() || undefined,
        state: v.state?.trim() || undefined,
        country: v.country?.trim() || undefined,
        profileImage: v.profileImageUrl?.trim() || undefined,
        notesMedicalHistory: v.notesMedicalHistory?.trim() || undefined,
        bloodGroup: v.bloodGroup?.trim() || undefined,
        height: v.height ? String(v.height) : undefined,
        weight: v.weight ? String(v.weight) : undefined,
        allergies: v.allergies?.length ? v.allergies : undefined,
        chronicConditions: v.chronicConditions?.length ? v.chronicConditions : undefined,
      } as any;

      let hasMissing = false;
      if (!payload.name) {
        setError("name", { type: "manual", message: "Name is required" });
        hasMissing = true;
      }

      if (!payload.gender) {
        setError("gender", { type: "manual", message: "Gender is required" });
        hasMissing = true;
      }

      if (
        payload.age === undefined ||
        payload.age === null ||
        payload.age === ""
      ) {
        setError("age", { type: "manual", message: "Age is required" });
        hasMissing = true;
      }

      if (!payload.mobile) {
        setError("mobile", {
          type: "manual",
          message: "Mobile number is required",
        });
        hasMissing = true;
      }

      if (!payload.city) {
        setError("city", { type: "manual", message: "City is required" });
        hasMissing = true;
      }

      if (!payload.state) {
        setError("state", { type: "manual", message: "State is required" });
        hasMissing = true;
      }

      // Family-relation linking validation
      if (v.linkFamily) {
        if (!(v.relationship ?? "").trim()) {
          setError("relationship", {
            type: "manual",
            message: "Please select a relationship.",
          });
          hasMissing = true;
        }
        if (!(v.primaryPatientId ?? "").trim()) {
          // Shouldn't happen — the section is only shown when primary exists
          hasMissing = true;
        }
      }
      if (hasMissing) {
        // Scroll to first missing mandatory field
        const missingFields: string[] = [];
        if (!payload.name) missingFields.push("name");
        if (!payload.gender) missingFields.push("gender");
        if (payload.age === undefined || payload.age === null || payload.age === "") missingFields.push("age");
        if (!payload.mobile) missingFields.push("mobile");
        if (!payload.city || !payload.state) missingFields.push("city");
        scrollToFirstError(missingFields);

        addToast({
          title: "Missing required",
          description: "Please fill all mandatory fields.",
          color: "danger",
          variant: "flat",
        });
        return;
      }

      // Attach family-relation fields only when the toggle is on.
      if (v.linkFamily && v.relationship) {
        payload.relationship = v.relationship;
        payload.primaryPatientId = (v.primaryPatientId ?? "").trim();
      }

      const data = await createPatient(payload).unwrap();

      addToast({
        title: "Patient added ✅",
        description: data?.result?.primaryPatientId
          ? "New patient created and linked to the family member."
          : "New patient has been created successfully.",
        color: "success",
        variant: "flat",
      });

      navigate(`/appointment/new?patientId=${data.result.id}`, {
        state: {
          prefillPatientLabel: `${payload.name}${payload.mobile ? ` (${payload.mobile})` : ""
            }`,
        },
      });
    } catch (err: any) {
      const backendErrors = err?.data?.errors;

      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        backendErrors.forEach((e: any) => {
          if (e?.path && e?.message) {
            setError(e.path, { type: "server", message: e.message });
          }
        });

        addToast({
          title: "Validation failed",
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
        title: "Add patient failed",
        description: msg,
        color: "danger",
        variant: "flat",
      });
    }
  }, (fieldErrors) => {
    // RHF validation failed — scroll to the first errored field
    const errorFieldNames = Object.keys(fieldErrors);
    scrollToFirstError(errorFieldNames);

    addToast({
      title: "Missing required",
      description: "Please fill all mandatory fields.",
      color: "danger",
      variant: "flat",
    });
  });

  const resetForm = React.useCallback(() => {
    stopVoiceAndClearTranscript();
    lastTriggeredMobile.current = "";
    setPhoto(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    reset({
      name: "",
      email: "",
      gender: "" as GenderOpt,
      age: undefined,
      dob: undefined,
      countryCallingCode: "+91",
      countryCode: "IN",
      mobile: "",
      alternateMobile: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      profileImageUrl: "",
      notesMedicalHistory: "",
      linkFamily: false,
      relationship: "",
      primaryPatientId: "",
      primaryPatientName: "",
    });

    window.setTimeout(() => {
      focusNameField();
    }, 0);
  }, [reset, focusNameField]);

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-slate-50/70 dark:bg-transparent">
      <div className="mx-auto w-full">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900 dark:text-white sm:text-2xl">
              New Patient
            </h1>

            <div className="mt-1 flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400">
              <button
                type="button"
                onClick={() => navigate("/patients")}
                className="font-medium text-slate-500 transition hover:text-primary"
              >
                Patients
              </button>
              <FiChevronRight className="text-[14px] opacity-70" />
              <span className="font-medium text-primary">New Patient</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDictation}
            className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${listening
              ? "border border-red-200 bg-red-50 text-red-600"
              : "border border-primary/20 bg-primary/10 text-primary"
              }`}
          >
            {listening && (
              <span className="absolute left-3 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            )}

            <svg
              className={`h-4 w-4 ${listening ? "ml-2" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {listening ? "Stop Voice Fill" : "Start Voice Fill"}
          </button>
        </div>

        {(listening || transcript) && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-start gap-3">
              {listening && (
                <span className="mt-1 flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-red-400 opacity-70" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
              )}

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Voice Transcript
                </p>
                <p className="mt-1 break-words text-sm text-slate-700">
                  {transcript || "Listening..."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main layout: Form + Sidebar */}
        <div className="flex gap-5 items-start">
          <form
            onSubmit={onSubmit}
            noValidate
            className="
            flex-1 min-w-0 flex flex-col

            [&_[data-slot='label']]:text-[12px]
            [&_[data-slot='label']]:font-semibold
            [&_[data-slot='label']]:!text-slate-900
            dark:[&_[data-slot='label']]:!text-slate-200
            dark:[&_label]:!text-slate-200

            [&_[data-slot='input-wrapper']]:!rounded-lg
            [&_[data-slot='input-wrapper']]:!border
            [&_[data-slot='input-wrapper']]:!border-gray-200
            [&_[data-slot='input-wrapper']]:!bg-white
            [&_[data-slot='input-wrapper']]:!shadow-none
            [&_[data-slot='input-wrapper']]:!h-11
            [&_[data-slot='input-wrapper']]:!px-4
            sm:[&_[data-slot='input-wrapper']]:!h-12
            dark:[&_[data-slot='input-wrapper']]:!bg-[#0f1728]
            dark:[&_[data-slot='input-wrapper']]:!border-[#38445a]

            [&_[data-slot='trigger']]:!rounded-lg
            [&_[data-slot='trigger']]:!border
            [&_[data-slot='trigger']]:!border-gray-200
            [&_[data-slot='trigger']]:!bg-white
            [&_[data-slot='trigger']]:!shadow-none
            [&_[data-slot='trigger']]:!h-11
            [&_[data-slot='trigger']]:!px-4
            sm:[&_[data-slot='trigger']]:!h-12
            dark:[&_[data-slot='trigger']]:!bg-[#0f1728]
            dark:[&_[data-slot='trigger']]:!border-[#38445a]

            [&_[data-slot='input']]:!text-[13px]
            [&_[data-slot='helper-wrapper']]:min-h-[18px]
            dark:[&_[data-slot='input']]:!text-slate-100
          "
          >
            <PatientFormSections
              control={rhfControl}
              onCityStateChange={handleCityStateChange}
              nameFieldRef={nameFieldRef}
              genderFieldRef={genderFieldRef}
              ageFieldRef={ageFieldRef}
              mobileFieldRef={mobileFieldRef}
              cityFieldRef={cityFieldRef}
              moveOnEnter={moveOnEnter}
              cityError={
                errors.city?.message
                  ? String(errors.city.message)
                  : errors.state?.message
                    ? String(errors.state.message)
                    : undefined
              }
              renderAddressField={() => (
                <Controller
                  control={control}
                  name="address"
                  render={({ field }) => {
                    const resizeTextarea = (
                      textarea: HTMLTextAreaElement | null,
                    ) => {
                      if (!textarea) return;

                      textarea.style.height = "auto";
                      textarea.style.height = `${textarea.scrollHeight}px`;
                    };

                    return (
                      <div className="w-full">
                        <label className="mb-2 block text-[12px] font-semibold text-slate-900 dark:text-slate-200">
                          Address
                        </label>

                        <textarea
                          {...field}
                          ref={(el) => {
                            field.ref(el);

                            if (el) {
                              requestAnimationFrame(() => resizeTextarea(el));
                            }
                          }}
                          value={field.value ?? ""}
                          placeholder="Enter address"
                          wrap="soft"
                          rows={1}
                          onChange={(e) => {
                            const limitedValue = limitAddressText(
                              capitalizeWords(e.target.value),
                            );

                            field.onChange(limitedValue);

                            requestAnimationFrame(() => {
                              resizeTextarea(e.target);
                            });
                          }}
                          onInput={(e) => {
                            resizeTextarea(e.currentTarget);
                          }}
                          className="
                          block
                          min-h-[48px]
                          w-full
                          resize-none
                          overflow-hidden
                          rounded-lg
                          border
                          border-gray-200
                          bg-white
                          px-4
                          py-3
                          text-[13px]
                          leading-5
                          text-slate-900
                          outline-none
                          transition
                          placeholder:text-slate-400
                          focus:border-primary
                          whitespace-pre-wrap
                          [overflow-wrap:anywhere]
                          dark:bg-[#0f1728]
                          dark:border-[#38445a]
                          dark:text-slate-100
                          dark:placeholder:text-slate-500
                        "
                        />
                      </div>
                    );
                  }}
                />
              )}
            />

            <div className="mt-5">
              <FamilyRelationSection
                ref={familySectionRef}
                control={control}
                setValue={setValue}
                mobileValue={mobileValue}
                relationshipError={
                  errors.relationship?.message
                    ? String(errors.relationship.message)
                    : undefined
                }
              />
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 px-2 py-4">
              <button
                type="button"
                onClick={resetForm}
                disabled={isCreating}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Clear All
              </button>

              <AppButton
                text={isCreating ? "Adding…" : "Add Patient"}
                type="submit"
                isDisabled={isCreating}
                className="rounded-xl px-6 h-11"
              />
            </div>
          </form>

          {/* Sidebar — Tips & Live Preview */}
          <PatientFormSidebar
            watchedName={watchedName}
            watchedAge={watchedAge}
            watchedGender={genderValue as string}
            watchedMobile={watchedMobile}
            watchedCity={cityValue as string}
            watchedState={watchedState}
            completionPercent={
              [
                Boolean((watchedName ?? "").trim()),
                Boolean(genderValue),
                Boolean(watchedAge),
                Boolean(watchedMobile && String(watchedMobile).length === 10),
                Boolean(cityValue),
              ].filter(Boolean).length * 20
            }
            mode="add"
          />
        </div>
      </div>
    </div>
  );
};

export default AddPatient;
