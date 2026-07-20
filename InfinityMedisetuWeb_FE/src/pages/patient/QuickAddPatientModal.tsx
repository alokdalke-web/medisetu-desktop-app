import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
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
import {
  optionalPhoneValidation,
  phoneValidation,
} from "../../utils/validation";

type GenderOpt = "Male" | "Female" | "Other" | "";

type AddPatientFormValues = {
  name: string;
  gender: GenderOpt;
  age?: number | string;
  mobile: string;
  alternateMobile?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  // Family-relation fields
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

type Props = {
  isOpen: boolean;
  onClose: () => void;
  queryText?: string;
  onCreated: (p: { id: string; name: string; mobile: string }) => void;
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

const compactCityStateFieldBase = `
  min-w-0

  [&_[data-slot='label']]:!mb-2
  [&_[data-slot='label']]:!block
  [&_[data-slot='label']]:!h-4
  [&_[data-slot='label']]:!min-h-4
  [&_[data-slot='label']]:!leading-4
  [&_[data-slot='label']]:!text-[12px]
  [&_[data-slot='label']]:!font-semibold
  [&_[data-slot='label']]:!text-[#100E1C]

  [&_[data-slot='input-wrapper']]:!box-border
  [&_[data-slot='input-wrapper']]:!flex
  [&_[data-slot='input-wrapper']]:!items-center
 [&_[data-slot='input-wrapper']]:!h-10
[&_[data-slot='input-wrapper']]:!min-h-10
  [&_[data-slot='input-wrapper']]:!max-h-11
  [&_[data-slot='input-wrapper']]:!rounded-lg
  [&_[data-slot='input-wrapper']]:!border
  [&_[data-slot='input-wrapper']]:!border-slate-200
  [&_[data-slot='input-wrapper']]:!bg-white
  [&_[data-slot='input-wrapper']]:!px-4
  [&_[data-slot='input-wrapper']]:!py-0
  [&_[data-slot='input-wrapper']]:!shadow-none
  [&_[data-slot='input-wrapper']]:after:!hidden

  [&_[data-slot='trigger']]:!box-border
  [&_[data-slot='trigger']]:!flex
  [&_[data-slot='trigger']]:!items-center
  [&_[data-slot='trigger']]:!h-11
  [&_[data-slot='trigger']]:!min-h-11
  [&_[data-slot='trigger']]:!max-h-11
  [&_[data-slot='trigger']]:!rounded-lg
  [&_[data-slot='trigger']]:!border
  [&_[data-slot='trigger']]:!border-slate-200
  [&_[data-slot='trigger']]:!bg-white
  [&_[data-slot='trigger']]:!px-4
  [&_[data-slot='trigger']]:!py-0
  [&_[data-slot='trigger']]:!shadow-none

  [&_[data-slot='inner-wrapper']]:!flex
  [&_[data-slot='inner-wrapper']]:!h-full
  [&_[data-slot='inner-wrapper']]:!items-center

  [&_[data-slot='mainWrapper']]:!gap-0
  [&_[data-slot='base']]:!gap-0

  [&_input]:!h-full
  [&_input]:!leading-none
  [&_input]:!text-[13px]
  [&_input]:!font-semibold
  [&_input]:!text-[#100E1C]
  [&_input::placeholder]:!text-slate-400

  [&_[data-slot='value']]:!leading-none
  [&_[data-slot='value']]:!text-[13px]
  [&_[data-slot='value']]:!font-semibold
  [&_[data-slot='value']]:!text-slate-500

  [&_[data-slot='selectorIcon']]:!shrink-0

  [&_[data-slot='error-message']]:!mt-1
  [&_[data-slot='error-message']]:!block
  [&_[data-slot='error-message']]:!min-h-[16px]
  [&_[data-slot='error-message']]:!text-[11px]
  [&_[data-slot='error-message']]:!leading-4
  [&_[data-slot='error-message']]:!font-medium
`;

const fieldBase = `
  min-w-0

  [&_[data-slot='label']]:!mb-2
  [&_[data-slot='label']]:!block
  [&_[data-slot='label']]:!h-4
  [&_[data-slot='label']]:!min-h-4
  [&_[data-slot='label']]:!truncate
  [&_[data-slot='label']]:!whitespace-nowrap
  [&_[data-slot='label']]:!leading-4
  [&_[data-slot='label']]:!text-[12px]
  [&_[data-slot='label']]:!font-semibold
  [&_[data-slot='label']]:!text-[#100E1C]

  [&_[data-slot='input-wrapper']]:!h-11
  [&_[data-slot='input-wrapper']]:!min-h-11
  [&_[data-slot='input-wrapper']]:!rounded-lg
  [&_[data-slot='input-wrapper']]:!bg-white
  [&_[data-slot='input-wrapper']]:!border
  [&_[data-slot='input-wrapper']]:!border-slate-200
  [&_[data-slot='input-wrapper']]:!shadow-none
  [&_[data-slot='input-wrapper']]:!transition
  [&_[data-slot='input-wrapper']]:after:!hidden
  [&_[data-slot='input-wrapper']]:focus-within:!border-primary
  [&_[data-slot='input-wrapper']]:focus-within:!ring-2
  [&_[data-slot='input-wrapper']]:focus-within:!ring-primary/10
  [&_[data-slot='input-wrapper']]:data-[invalid=true]:!border-danger

  [&_[data-slot='trigger']]:!h-11
  [&_[data-slot='trigger']]:!min-h-11
  [&_[data-slot='trigger']]:!rounded-lg
  [&_[data-slot='trigger']]:!bg-white
  [&_[data-slot='trigger']]:!border
  [&_[data-slot='trigger']]:!border-slate-200
  [&_[data-slot='trigger']]:!shadow-none
  [&_[data-slot='trigger']]:!transition
  [&_[data-slot='trigger']]:focus-within:!border-primary
  [&_[data-slot='trigger']]:focus-within:!ring-2
  [&_[data-slot='trigger']]:focus-within:!ring-primary/10
  [&_[data-slot='trigger']]:data-[invalid=true]:!border-danger

  [&_[data-slot='inner-wrapper']]:!h-full
  [&_[data-slot='inner-wrapper']]:!items-center

  [&_input]:!h-full
  [&_input]:!text-[13px]
  [&_input]:!font-semibold
  [&_input]:!text-[#100E1C]
  [&_input::placeholder]:!text-slate-400

  [&_[data-slot='value']]:!text-[13px]
  [&_[data-slot='value']]:!font-semibold
  [&_[data-slot='value']]:!text-slate-500

  [&_[data-slot='error-message']]:!mt-1
  [&_[data-slot='error-message']]:!min-h-[16px]
  [&_[data-slot='error-message']]:!text-[11px]
  [&_[data-slot='error-message']]:!leading-4
  [&_[data-slot='error-message']]:!font-medium
`;

const requiredMark = `
  [&_[data-slot='label']]:after:content-['*']
  [&_[data-slot='label']]:after:ml-1
  [&_[data-slot='label']]:after:text-red-500
`;

const fieldShell = "min-w-0 min-h-[70px]";
const fullFieldShell = "min-w-0 min-h-[70px] col-span-2 sm:col-span-1";
const guessFromQuery = (q: string) => {
  const raw = String(q || "").trim();
  const digits = raw.replace(/\D/g, "");
  const mobile = digits.length >= 10 ? digits.slice(-10) : "";
  const name = /^[A-Za-z ]+$/.test(raw) && raw.length >= 2 ? raw : "";
  return { name, mobile };
};

const onlyLetters = (s: any) =>
  String(s ?? "")
    .replace(/[^A-Za-z ]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\s+/g, "");

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

function toTitleCase(str: string) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizePhoneSpeech(text: string) {
  let normalized = text
    .toLowerCase()
    .replace(/\bplus\s*91\b/g, " 91 ")
    .replace(/[.,/:-]/g, " ")
    .replace(
      /\b(zero|oh|o|one|two|three|four|five|six|seven|eight|ate|nine)\b/g,
      (match) => SPOKEN_DIGIT_MAP[match] ?? match,
    );

  let changed = true;
  while (changed) {
    changed = false;
    normalized = normalized.replace(
      /\b(double|triple)\s+(\d)\b/g,
      (_, repeatWord: string, digit: string) => {
        changed = true;
        const count = repeatWord === "triple" ? 3 : 2;
        return Array(count).fill(digit).join(" ");
      },
    );
  }

  return normalized.replace(/\s+/g, " ").trim();
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

function extractPhoneSegment(
  text: string,
  type: "primary" | "alternate",
): string {
  const normalized = normalizePhoneSpeech(text);

  const startPattern =
    type === "alternate"
      ? /\b(?:alternate|alt|secondary)\s*(?:phone|mobile|contact)?\s*(?:number|no|num)?\s*(?:is|:)?\s*/i
      : /\b(?:phone|mobile|contact)\s*(?:number|no|num)?\s*(?:is|:)?\s*/i;

  const startMatch = normalized.match(startPattern);
  if (!startMatch || startMatch.index == null) return "";

  const startIndex = startMatch.index + startMatch[0].length;
  const rest = normalized.slice(startIndex);

  const stopPattern =
    type === "alternate"
      ? /\b(?:full\s+name|name|gender|male|female|other|age|address|city|state)\b/i
      : /\b(?:alternate|alt|secondary|full\s+name|name|gender|male|female|other|age|address|city|state)\b/i;

  const stopMatch = rest.match(stopPattern);

  return (stopMatch ? rest.slice(0, stopMatch.index) : rest).trim();
}

function extractPhonesFromText(text: string): string[] {
  const normalized = normalizePhoneSpeech(text);
  const chunks = normalized.match(/(?:\+?\d[\d\s]{8,40}\d)/g) ?? [];
  const phones = chunks.flatMap((chunk) => extractIndianPhones(chunk));
  return [...new Set(phones)];
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

  if (/\bfemale\b|\bfemail\b|\bwoman\b|\bgirl\b/.test(lower)) {
    return "Female";
  }

  if (/\bmale\b|\bmail\b|\bman\b|\bboy\b/.test(lower)) {
    return "Male";
  }

  if (/\bother\b|\btransgender\b|\bnon.?binary\b/.test(lower)) {
    return "Other";
  }

  return undefined;
}

function cleanVoiceNameCandidate(value: string): string {
  const cleaned = onlyLetters(value)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !NON_NAME_WORDS.has(part.toLowerCase()))
    .filter((part) => part.length > 1)
    .slice(0, 3)
    .join(" ")
    .trim();

  const lettersOnly = cleaned.replace(/\s/g, "");
  if (lettersOnly.length < 3) return "";

  return toTitleCase(cleaned);
}

function parsePatientData(text: string): Partial<VoicePatientForm> {
  const result: Partial<VoicePatientForm> = {};
  const normalizedText = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const lower = normalizedText.toLowerCase();

  const startsWithLabel =
    /^(?:gender|sex|age|phone|mobile|contact|alternate|alt|secondary|address|city|state)\b/i.test(
      normalizedText,
    );

  const nameCommandMatch = normalizedText.match(
    /\b(?:name\s+is|full\s+name\s+is|full\s+name|name\s*[:=]?|patient(?:'s)?\s+name(?:\s+is)?)\s+([a-z]+(?:\s+[a-z]+){0,2})/i,
  );

  if (nameCommandMatch?.[1]) {
    const cleaned = cleanVoiceNameCandidate(nameCommandMatch[1]);
    if (cleaned) result.name = cleaned;
  }

  if (!result.name && !startsWithLabel) {
    const leadingNameMatch = normalizedText.match(
      /^\s*([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=\s*(?:,|;|:|-|\b(?:male|mail|female|femail|other|man|woman|boy|girl|age|\d{1,3}|phone|mobile|contact|address|city|state)\b|$))/i,
    );

    if (leadingNameMatch?.[1]) {
      const cleaned = cleanVoiceNameCandidate(leadingNameMatch[1]);
      if (cleaned) result.name = cleaned;
    }
  }

  const parsedGender = parseGender(lower);
  if (parsedGender) result.gender = parsedGender;

  const agePatterns = [
    /\bage\s+(?:is\s+)?(\d{1,3})\b/i,
    /\b(\d{1,3})\s*(?:years?|yrs?)\s*(?:old)?\b/i,
    /\b(\d{1,3})\s*(?:y\/o|yo)\b/i,
  ];

  for (const pat of agePatterns) {
    const m = normalizedText.match(pat);

    if (m?.[1]) {
      const age = parseInt(m[1], 10);

      if (age > 0 && age <= 100) {
        result.age = String(age);
        break;
      }
    }
  }

  if (!result.age) {
    const beforeGender = normalizedText.match(
      /\b(\d{1,3})\b(?=\s*[,;:-]?\s*(?:gender\s+)?(?:male|mail|female|femail|other|man|woman|boy|girl|transgender|non.?binary)\b)/i,
    );

    if (beforeGender?.[1]) {
      const age = parseInt(beforeGender[1], 10);

      if (age > 0 && age <= 100) {
        result.age = String(age);
      }
    }
  }

  const primarySegment = extractPhoneSegment(normalizedText, "primary");
  const alternateSegment = extractPhoneSegment(normalizedText, "alternate");

  const primaryPhones = extractPhonesFromText(primarySegment);
  const alternatePhones = extractPhonesFromText(alternateSegment);

  if (primaryPhones[0]) result.mobile = primaryPhones[0];
  if (alternatePhones[0]) result.alternateMobile = alternatePhones[0];

  if (!result.mobile || !result.alternateMobile) {
    const allPhones = extractPhonesFromText(normalizedText);

    if (!result.mobile && allPhones[0]) result.mobile = allPhones[0];

    if (!result.alternateMobile) {
      const altCandidate = allPhones.find((item) => item !== result.mobile);
      if (altCandidate) result.alternateMobile = altCandidate;
    }
  }

  const cityLabelMatch = normalizedText.match(
    /\bcity\s*(?:is|:)?\s*([A-Za-z ]{2,40}?)(?=\s*(?:,|;|\.|\bstate\b|\baddress\b|\bphone\b|\bmobile\b|\bcontact\b|\bage\b|\bgender\b|$))/i,
  );

  if (cityLabelMatch?.[1]) {
    const cleanedCity = toTitleCase(onlyLetters(cityLabelMatch[1]).trim());
    if (cleanedCity) result.city = cleanedCity;
  } else {
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

  const stateLabelMatch = normalizedText.match(
    /\bstate\s*(?:is|:)?\s*([A-Za-z ]{2,40}?)(?=\s*(?:,|;|\.|\bcity\b|\baddress\b|\bphone\b|\bmobile\b|\bcontact\b|\bage\b|\bgender\b|$))/i,
  );

  if (stateLabelMatch?.[1]) {
    const cleanedState = toTitleCase(onlyLetters(stateLabelMatch[1]).trim());
    if (cleanedState) result.state = cleanedState;
  } else {
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

  const addrMatch = normalizedText.match(
    /\b(?:address|lives?\s+at|residing\s+at|flat|house|plot|sector|near|behind|opposite)\b.{5,}/i,
  );

  if (addrMatch?.[0]) {
    result.address = limitAddressText(
      addrMatch[0].replace(/^address\s*(is\s*)?/i, "").trim(),
    );
  }

  return result;
}

const QuickAddPatientModal: React.FC<Props> = ({
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

              <ModalHeader className="shrink-0 border-b border-slate-100 bg-white px-4 pb-3 pt-4 sm:px-6 sm:pb-4">
                <div className="w-full pr-10 sm:pr-12">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[18px] font-bold leading-6 text-[#100E1C] sm:text-xl">
                        Add New Patient
                      </span>
                      <span className="mt-1 block text-[11px] font-medium leading-4 text-slate-500 sm:text-[12px]">
                        Quick add patient from appointment screen
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleDictation}
                      aria-label={
                        listening ? "Stop Voice Fill" : "Start Voice Fill"
                      }
                      title={listening ? "Stop Voice Fill" : "Start Voice Fill"}
                      className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition active:scale-[0.98] sm:h-11 sm:w-auto sm:px-4 ${listening
                        ? "border-red-200 bg-red-50 text-red-600"
                        : "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
                        }`}
                    >
                      {listening && (
                        <span className="absolute left-1/2 top-1/2 flex h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 sm:left-3 sm:-translate-x-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                        </span>
                      )}

                      <svg
                        className={`h-4 w-4 shrink-0 ${listening ? "sm:ml-2" : ""
                          }`}
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

                      <span className="ml-2 hidden whitespace-nowrap text-sm font-bold sm:inline">
                        {listening ? "Stop Voice Fill" : "Start Voice Fill"}
                      </span>
                    </button>
                  </div>
                </div>
              </ModalHeader>

              <ModalBody className="min-h-0 gap-3 overflow-y-auto overscroll-contain bg-slate-50/50 px-3 py-3 sm:px-5 sm:py-4">                {" "}
                {(listening || transcript) && (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {listening && (
                        <span className="mt-1 flex h-2.5 w-2.5 shrink-0">
                          <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-red-400 opacity-70" />
                          <span className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
                        </span>
                      )}

                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Voice Transcript
                        </p>
                        <p className="mt-1 break-words text-sm font-medium text-slate-700">
                          {transcript || "Listening..."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
                  {" "}
                  <div className="mb-3">

                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      Enter patient personal information
                    </p>
                  </div>
                  <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[minmax(0,1.7fr)_minmax(150px,1fr)_minmax(120px,0.9fr)] sm:gap-4">
                    {" "}
                    <div
                      className={`${fieldBase} ${requiredMark} ${fullFieldShell}`}
                    >
                      <InputField
                        control={rhfControl}
                        name="name"
                        label="Full Name"
                        placeholder="Enter name"
                        rules={{
                          required: "Name is required",
                          pattern: {
                            value: /^[A-Za-z ]+$/,
                            message: "Only alphabets and spaces are allowed",
                          },
                        }}
                        onInput={(e) => {
                          const t = e.target as HTMLInputElement;
                          let v2 = (t.value || "").replace(/[^A-Za-z ]/g, "");
                          v2 = v2.replace(/\s+/g, " ");
                          v2 = v2.replace(/^\s+/g, "");
                          t.value = v2;
                        }}
                      />
                    </div>
                    <div
                      className={`${fieldBase} ${requiredMark} ${fieldShell}`}
                    >
                      <SelectField
                        control={rhfControl}
                        name="gender"
                        label="Gender"
                        placeholder="Gender"
                        rules={{ required: "Gender is required" }}
                        options={[
                          { label: "Male", value: "Male" },
                          { label: "Female", value: "Female" },
                          { label: "Other", value: "Other" },
                        ]}
                      />
                    </div>
                    <div
                      className={`${fieldBase} ${requiredMark} ${fieldShell}`}
                    >
                      <InputField
                        control={rhfControl}
                        type="number"
                        name="age"
                        label="Age"
                        placeholder="Age"
                        rules={{
                          required: "Age is required",
                          min: {
                            value: 1,
                            message: "Age must be between 1 and 100",
                          },
                          max: {
                            value: 100,
                            message: "Age must be between 1 and 100",
                          },
                        }}
                        onInput={(e) => {
                          const t = e.target as HTMLInputElement;

                          let digits = (t.value || "").replace(/\D/g, "");
                          digits = digits.replace(/^0+/, "");

                          if (!digits) {
                            t.value = "";
                            return;
                          }

                          if (digits.length <= 2) {
                            t.value = digits;
                            return;
                          }

                          if (digits.startsWith("100")) {
                            t.value = "100";
                            return;
                          }

                          t.value = digits.slice(0, 2);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
                  {" "}
                  <div className="mb-3">

                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      Add phone number and address information
                    </p>
                  </div>
                  <div className="grid grid-cols-2 items-start gap-3 sm:gap-4">
                    <div
                      className={`${fieldBase} ${requiredMark} ${fieldShell}`}
                    >
                      <InputField
                        control={rhfControl}
                        name="mobile"
                        label="Phone No"
                        type="tel"
                        placeholder="10-digit"
                        rules={phoneValidation}
                        onInput={(e) => {
                          const t = e.target as HTMLInputElement;
                          t.value = t.value.replace(/[^0-9]/g, "").slice(0, 10);
                        }}
                      />
                    </div>

                    <div className={`${fieldBase} ${fieldShell}`}>
                      <InputField
                        control={rhfControl}
                        name="alternateMobile"
                        label="Alt. Phone No"
                        type="tel"
                        placeholder="Optional"
                        isOptional
                        rules={optionalPhoneValidation}
                        onInput={(e) => {
                          const t = e.target as HTMLInputElement;
                          t.value = t.value.replace(/[^0-9]/g, "").slice(0, 10);
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-2 w-full">
                    <Controller
                      control={control}
                      name="address"
                      render={({ field }) => {
                        const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
                          if (!textarea) return;

                          textarea.style.height = "auto";
                          textarea.style.height = `${textarea.scrollHeight}px`;
                        };

                        return (
                          <div className="w-full">
                            <label className="mb-2 block text-[12px] font-semibold text-[#100E1C]">
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
                              autoComplete="new-password"
                              wrap="soft"
                              rows={1}
                              onKeyDown={() => {
                                addressEditedRef.current = true;
                              }}
                              onPaste={() => {
                                addressEditedRef.current = true;
                              }}
                              onChange={(e) => {
                                addressEditedRef.current = true;

                                const limitedValue = limitAddressText(e.target.value);
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
              border-slate-200
              bg-white
              px-4
              py-3
              text-[14px]
              font-medium
              leading-5
              text-[#100E1C]
              outline-none
              transition
              placeholder:text-slate-400
              focus:border-primary
              focus:ring-2
              focus:ring-primary/10
              whitespace-pre-wrap
              [overflow-wrap:anywhere]
            "
                            />
                          </div>
                        );
                      }}
                    />


                  </div>
                  <div className="mt-3">
                    <div
                      className={`${compactCityStateFieldBase} ${requiredMark} min-h-[70px] min-w-0`}
                    >
                      <CitySelector
                        control={rhfControl}
                        onCityStateChange={handleCityStateChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Family-relation section (only visible when mobile resolves to an existing patient) */}
                <FamilyRelationSection
                  ref={familySectionRef}
                  control={control}
                  setValue={setValue}
                  mobileValue={mobileVal}
                />
              </ModalBody>

              <ModalFooter className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] sm:px-6 sm:py-4">
                <div className="grid w-full grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="light"
                    onPress={handleModalClose}
                    isDisabled={isCreating}
                    className="h-11 w-full rounded-full border border-slate-200 bg-white font-semibold text-slate-700"
                  >
                    Cancel
                  </Button>

                  <Button
                    color="primary"
                    type="submit"
                    isLoading={isCreating}
                    className="h-11 w-full rounded-full font-bold shadow-md shadow-primary/20"
                  >
                    Add Patient
                  </Button>
                </div>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={showConfirm}
        onOpenChange={setShowConfirm}
        hideCloseButton
        size="md"
        className="rounded-3xl p-6"
        classNames={{
          wrapper: "z-[1101]",
          backdrop: "z-[1100]",
        }}
      >
        <ModalContent>
          {(onCloseConfirm) => (
            <>
              <ModalHeader className="flex flex-col items-center gap-2 pb-2 text-center">
                <div className="rounded-full bg-warning-50 p-3">
                  <FiAlertCircle className="h-8 w-8 text-warning" />
                </div>
                <h3 className="text-xl font-bold">Discard Changes?</h3>
              </ModalHeader>

              <ModalBody className="pb-6 text-center text-slate-600">
                You have unsaved changes. Are you sure you want to discard them
                and close the window?
              </ModalBody>

              <ModalFooter className="flex justify-center gap-3 pt-0">
                <AppButton
                  text="No, Stay"
                  buttonVariant="outlined"
                  className="h-11 w-32"
                  onPress={onCloseConfirm}
                />
                <AppButton
                  text="Yes, Discard"
                  buttonVariant="danger"
                  className="h-11 w-32"
                  onPress={forceClose}
                />
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default QuickAddPatientModal;
