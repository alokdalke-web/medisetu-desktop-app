import { addToast, Select, SelectItem } from "@heroui/react";
import React from "react";
import { Controller, useForm, type Control, type FieldValues } from "react-hook-form";
import { FiUserPlus } from "react-icons/fi";

import AppButton from "../../components/shared/AppButton";
import CitySelector from "../../components/shared/CitySelector";
import InputField from "../../components/shared/InputField";
import FamilyRelationSection, { type FamilyRelationSectionRef } from "./components/FamilyRelationSection";
import { useCreatePatientMutation } from "../../redux/api/patientApi";

/* ─────────────────────── Types ─────────────────────── */

type GenderOpt = "Male" | "Female" | "Other" | "";

type AddPatientFormValues = {
  name: string;
  gender: GenderOpt;
  age?: number | string;
  mobile: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  // family linking
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
  address: string;
  city: string;
  state: string;
};

type Props = {
  queryText?: string;
  onCreated: (p: { id: string; name: string; mobile: string }) => void;
  onCancel: () => void;
};

const mobileValidation = {
  required: "Mobile number is required",
  validate: (value: string) => {
    const mobile = String(value ?? "").trim();
    if (!mobile) return "Mobile number is required";
    return /^[6-9]\d{9}$/.test(mobile) || "Invalid number.";
  },
};

/* ─────────────────────── Voice helpers (shared with QuickAddPatientModal) ─── */

let CITIES_MAP: Record<string, string> = {};
let STATES_MAP: Record<string, string> = {};
let CITY_TO_STATE_MAP: Record<string, string> = {};

const NON_NAME_WORDS = new Set([
  "name","patient","age","years","year","old","phone","number","address",
  "city","state","gender","male","female","mail","femail","other","alternate",
  "mobile","save","add","enter","his","her","their","the","and","or","is",
  "my","your","our","call","tell","ask","what","who","from","lives","yrs",
  "a","an","in","at","on","of","for","to","with",
]);

const SPOKEN_DIGIT_MAP: Record<string, string> = {
  zero:"0",oh:"0",o:"0",one:"1",two:"2",three:"3",four:"4",five:"5",
  six:"6",seven:"7",eight:"8",ate:"8",nine:"9",
};

const MAX_ADDRESS_WORDS = 25;
const MAX_ADDRESS_CHARS = 250;

const onlyLetters = (s: any) =>
  String(s ?? "").replace(/[^A-Za-z ]/g, "").replace(/\s+/g, " ").replace(/^\s+/g, "");

const guessFromQuery = (q: string) => {
  const raw = String(q || "").trim();
  const digits = raw.replace(/\D/g, "");
  const mobile = digits.length >= 10 ? digits.slice(-10) : "";
  const name = /^[A-Za-z ]+$/.test(raw) && raw.length >= 2 ? raw : "";
  return { name, mobile };
};

const limitAddressText = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  let limited = value;
  if (words.length > MAX_ADDRESS_WORDS) limited = words.slice(0, MAX_ADDRESS_WORDS).join(" ");
  if (limited.length > MAX_ADDRESS_CHARS) limited = limited.slice(0, MAX_ADDRESS_CHARS);
  return limited;
};

function toTitleCase(str: string) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizePhoneSpeech(text: string) {
  let normalized = text.toLowerCase()
    .replace(/\bplus\s*91\b/g, " 91 ")
    .replace(/[.,/:-]/g, " ")
    .replace(/\b(zero|oh|o|one|two|three|four|five|six|seven|eight|ate|nine)\b/g,
      (match) => SPOKEN_DIGIT_MAP[match] ?? match);
  let changed = true;
  while (changed) {
    changed = false;
    normalized = normalized.replace(/\b(double|triple)\s+(\d)\b/g,
      (_, repeatWord: string, digit: string) => {
        changed = true;
        return Array(repeatWord === "triple" ? 3 : 2).fill(digit).join(" ");
      });
  }
  return normalized.replace(/\s+/g, " ").trim();
}

function extractIndianPhones(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return [];
  const matches: string[] = [];
  const seen = new Set<string>();
  const pushIfValid = (v: string) => { if (/^[6-9]\d{9}$/.test(v) && !seen.has(v)) { seen.add(v); matches.push(v); } };
  const collectWindows = (src: string) => {
    if (src.length < 10) return;
    if (src.length === 10) { pushIfValid(src); return; }
    for (let i = 0; i <= src.length - 10; i++) pushIfValid(src.slice(i, i + 10));
  };
  if (digits.startsWith("91") && digits.length >= 12) collectWindows(digits.slice(2));
  if (digits.startsWith("0") && digits.length >= 11) collectWindows(digits.slice(1));
  collectWindows(digits);
  return matches;
}

function extractPhonesFromText(text: string): string[] {
  const normalized = normalizePhoneSpeech(text);
  const chunks = normalized.match(/(?:\+?\d[\d\s]{8,40}\d)/g) ?? [];
  const phones = chunks.flatMap((chunk) => extractIndianPhones(chunk));
  return [...new Set(phones)];
}

function parseGender(lower: string): GenderOpt | undefined {
  const m = lower.match(/\b(?:gender|sex)\s*(?:is|:)?\s*(male|mail|female|femail|other|transgender|non.?binary)\b/i);
  if (m?.[1]) {
    const v = m[1].toLowerCase();
    if (v === "male" || v === "mail") return "Male";
    if (v === "female" || v === "femail") return "Female";
    return "Other";
  }
  if (/\bfemale\b|\bfemail\b|\bwoman\b|\bgirl\b/.test(lower)) return "Female";
  if (/\bmale\b|\bmail\b|\bman\b|\bboy\b/.test(lower)) return "Male";
  if (/\bother\b|\btransgender\b|\bnon.?binary\b/.test(lower)) return "Other";
  return undefined;
}

function cleanVoiceNameCandidate(value: string): string {
  const cleaned = onlyLetters(value).split(" ").map(p => p.trim()).filter(Boolean)
    .filter(p => !NON_NAME_WORDS.has(p.toLowerCase())).filter(p => p.length > 1)
    .slice(0, 3).join(" ").trim();
  if (cleaned.replace(/\s/g, "").length < 3) return "";
  return toTitleCase(cleaned);
}

function parsePatientData(text: string): Partial<VoicePatientForm> {
  const result: Partial<VoicePatientForm> = {};
  const normalizedText = String(text ?? "").replace(/\s+/g, " ").trim();
  const lower = normalizedText.toLowerCase();

  const startsWithLabel = /^(?:gender|sex|age|phone|mobile|contact|alternate|alt|secondary|address|city|state)\b/i.test(normalizedText);
  const nameCommandMatch = normalizedText.match(/\b(?:name\s+is|full\s+name\s+is|full\s+name|name\s*[:=]?|patient(?:'s)?\s+name(?:\s+is)?)\s+([a-z]+(?:\s+[a-z]+){0,2})/i);
  if (nameCommandMatch?.[1]) { const c = cleanVoiceNameCandidate(nameCommandMatch[1]); if (c) result.name = c; }

  if (!result.name && !startsWithLabel) {
    const leadingMatch = normalizedText.match(/^\s*([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=\s*(?:,|;|:|-|\b(?:male|mail|female|femail|other|man|woman|boy|girl|age|\d{1,3}|phone|mobile|contact|address|city|state)\b|$))/i);
    if (leadingMatch?.[1]) { const c = cleanVoiceNameCandidate(leadingMatch[1]); if (c) result.name = c; }
  }

  const parsedGender = parseGender(lower);
  if (parsedGender) result.gender = parsedGender;

  for (const pat of [/\bage\s+(?:is\s+)?(\d{1,3})\b/i, /\b(\d{1,3})\s*(?:years?|yrs?)\s*(?:old)?\b/i, /\b(\d{1,3})\s*(?:y\/o|yo)\b/i]) {
    const m = normalizedText.match(pat);
    if (m?.[1]) { const age = parseInt(m[1], 10); if (age > 0 && age <= 100) { result.age = String(age); break; } }
  }
  if (!result.age) {
    const bg = normalizedText.match(/\b(\d{1,3})\b(?=\s*[,;:-]?\s*(?:gender\s+)?(?:male|mail|female|femail|other|man|woman|boy|girl|transgender|non.?binary)\b)/i);
    if (bg?.[1]) { const age = parseInt(bg[1], 10); if (age > 0 && age <= 100) result.age = String(age); }
  }

  const allPhones = extractPhonesFromText(normalizedText);
  if (allPhones[0]) result.mobile = allPhones[0];

  const cityMatch = normalizedText.match(/\bcity\s*(?:is|:)?\s*([A-Za-z ]{2,40}?)(?=\s*(?:,|;|\.|\bstate\b|\baddress\b|\bphone\b|\bmobile\b|\bcontact\b|\bage\b|\bgender\b|$))/i);
  if (cityMatch?.[1]) { const c = toTitleCase(onlyLetters(cityMatch[1]).trim()); if (c) result.city = c; }
  else {
    const sorted = Object.keys(CITIES_MAP).sort((a, b) => b.length - a.length);
    for (const city of sorted) { if (lower.includes(city)) { result.city = CITIES_MAP[city]; if (CITY_TO_STATE_MAP[CITIES_MAP[city]]) result.state = CITY_TO_STATE_MAP[CITIES_MAP[city]]; break; } }
  }

  const stateMatch = normalizedText.match(/\bstate\s*(?:is|:)?\s*([A-Za-z ]{2,40}?)(?=\s*(?:,|;|\.|\bcity\b|\baddress\b|\bphone\b|\bmobile\b|\bcontact\b|\bage\b|\bgender\b|$))/i);
  if (stateMatch?.[1]) { const s = toTitleCase(onlyLetters(stateMatch[1]).trim()); if (s) result.state = s; }
  else if (!result.state) {
    const sorted = Object.keys(STATES_MAP).sort((a, b) => b.length - a.length);
    for (const state of sorted) { if (lower.includes(state)) { result.state = STATES_MAP[state]; break; } }
  }

  const addrMatch = normalizedText.match(/\b(?:address|lives?\s+at|residing\s+at|flat|house|plot|sector|near|behind|opposite)\b.{5,}/i);
  if (addrMatch?.[0]) result.address = limitAddressText(addrMatch[0].replace(/^address\s*(is\s*)?/i, "").trim());

  return result;
}

/* ─────────────────────── Component ─────────────────────── */

const InlineAddPatientForm: React.FC<Props> = ({ queryText, onCreated, onCancel }) => {
  const [createPatient, { isLoading: isCreating }] = useCreatePatientMutation();

  // Voice state
  const [listening, setListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const recognitionRef = React.useRef<any>(null);
  const finalTranscriptRef = React.useRef("");
  const shouldAutoRestartRef = React.useRef(false);

  const getInitialValues = React.useCallback((): AddPatientFormValues => {
    const g = guessFromQuery(queryText || "");
    return { name: g.name, gender: "" as GenderOpt, age: "", mobile: g.mobile, address: "", city: "", state: "", country: "India" };
  }, [queryText]);

  const { control, handleSubmit, setValue, setError, watch, reset, formState: { errors } } = useForm<AddPatientFormValues>({
    defaultValues: { ...getInitialValues(), linkFamily: false, relationship: "", primaryPatientId: "", primaryPatientName: "" },
    mode: "onChange",
  });

  React.useEffect(() => {
    reset({ ...getInitialValues(), linkFamily: false, relationship: "", primaryPatientId: "", primaryPatientName: "" });
  }, [getInitialValues, reset]);

  // Auto-focus the Name input when the form opens
  const formContainerRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const nameInput = formContainerRef.current?.querySelector<HTMLInputElement>(
        'input[name="name"]'
      );
      nameInput?.focus();
    }, 150);
    return () => window.clearTimeout(timer);
  }, []);

  const rhfControl = control as unknown as Control<FieldValues, FieldValues>;
  const familySectionRef = React.useRef<FamilyRelationSectionRef>(null);
  const mobileValue = watch("mobile") ?? "";

  // Fire check-mobile as soon as the user has typed a complete valid number.
  // Runs on every change so it also re-checks if the number is edited.
  const lastTriggeredMobile = React.useRef("");
  React.useEffect(() => {
    const trimmed = String(mobileValue).trim();
    if (!/^[6-9]\d{9}$/.test(trimmed)) return;          // not a full 10-digit number yet
    if (trimmed === lastTriggeredMobile.current) return; // already triggered for this number
    lastTriggeredMobile.current = trimmed;
    familySectionRef.current?.checkMobile(trimmed);
  }, [mobileValue]);

  // Load cities/states for voice parsing
  React.useEffect(() => {
    if (Object.keys(CITIES_MAP).length > 0) return; // already loaded
    fetch("https://cdn.jsdelivr.net/gh/fayazara/Indian-Cities-API@master/cities.json")
      .then((r) => r.json())
      .then((data: any) => {
        const cMap: Record<string, string> = {};
        const sMap: Record<string, string> = {};
        const ctsMap: Record<string, string> = {};
        if (Array.isArray(data?.cities)) {
          for (const item of data.cities) {
            const city = String(item.City || "").trim();
            const state = String(item.State || "").trim();
            if (city && state) { cMap[city.toLowerCase()] = city; sMap[state.toLowerCase()] = state; ctsMap[city] = state; }
          }
        }
        sMap["mp"] = "Madhya Pradesh"; sMap["up"] = "Uttar Pradesh";
        sMap["ap"] = "Andhra Pradesh"; sMap["hp"] = "Himachal Pradesh"; sMap["jk"] = "Jammu and Kashmir";
        CITIES_MAP = cMap; STATES_MAP = sMap; CITY_TO_STATE_MAP = ctsMap;
      })
      .catch(() => {});
  }, []);

  const applyParsedDataToForm = React.useCallback((parsed: Partial<VoicePatientForm>) => {
    if (parsed.name) setValue("name", onlyLetters(parsed.name), { shouldDirty: true, shouldValidate: true });
    if (parsed.gender) setValue("gender", parsed.gender, { shouldDirty: true, shouldValidate: true });
    if (parsed.age) { const n = Number(parsed.age); if (!Number.isNaN(n) && n >= 1 && n <= 100) setValue("age", n, { shouldDirty: true, shouldValidate: true }); }
    if (parsed.mobile) setValue("mobile", parsed.mobile, { shouldDirty: true, shouldValidate: true });
    if (parsed.address) setValue("address", limitAddressText(parsed.address), { shouldDirty: true, shouldValidate: true });
    if (parsed.city) setValue("city", onlyLetters(parsed.city), { shouldDirty: true, shouldValidate: true });
    if (parsed.state) setValue("state", onlyLetters(parsed.state), { shouldDirty: true, shouldValidate: true });
  }, [setValue]);

  const stopVoice = React.useCallback(() => {
    shouldAutoRestartRef.current = false;
    recognitionRef.current?.stop();
    finalTranscriptRef.current = "";
    setTranscript("");
    setListening(false);
  }, []);

  // Speech recognition setup
  React.useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscriptRef.current += `${chunk} `;
        else interim += chunk;
      }
      const combined = `${finalTranscriptRef.current}${interim}`.trim();
      setTranscript(combined);
      const stable = finalTranscriptRef.current.trim();
      if (stable) applyParsedDataToForm(parsePatientData(stable));
    };

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      if (shouldAutoRestartRef.current) {
        window.setTimeout(() => { try { recognitionRef.current?.start(); } catch { /* ignore */ } }, 100);
      } else {
        setListening(false);
      }
    };
    recognition.onerror = (e: any) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") { shouldAutoRestartRef.current = false; setListening(false); return; }
      if (e?.error === "aborted") { setListening(false); return; }
      if (e?.error === "no-speech") { addToast({ title: "No speech detected", description: "Please speak clearly and try again.", color: "warning", variant: "flat" }); return; }
      setListening(false);
    };

    recognitionRef.current = recognition;
    return () => { shouldAutoRestartRef.current = false; recognition.stop(); recognitionRef.current = null; };
  }, [applyParsedDataToForm]);

  const handleDictation = React.useCallback(async () => {
    if (!recognitionRef.current) {
      addToast({ title: "Speech not supported", description: "Your browser does not support speech recognition.", color: "warning", variant: "flat" });
      return;
    }
    if (listening) { shouldAutoRestartRef.current = false; recognitionRef.current.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      shouldAutoRestartRef.current = true;
      finalTranscriptRef.current = "";
      setTranscript("");
      recognitionRef.current.start();
    } catch {
      addToast({ title: "Microphone permission needed", description: "Please allow microphone access and try again.", color: "danger", variant: "flat" });
    }
  }, [listening]);

  const handleCityStateChange = (city: string, state: string, shouldValidate = true) => {
    setValue("city", onlyLetters(city), { shouldDirty: true, shouldValidate });
    setValue("state", onlyLetters(state), { shouldDirty: true, shouldValidate });
  };

  /* ─── Submit — matches QuickAddPatientModal exactly ─── */
  const onSubmit = handleSubmit(async (v) => {
    try {
      const payload: any = {
        name: onlyLetters(v.name).trim(),
        gender: (v.gender || "").toString(),
        age: v.age === undefined || v.age === null || v.age === "" ? undefined : Number(v.age),
        mobile: String(v.mobile ?? "").trim(),
        address: v.address ? limitAddressText(String(v.address)).trim() : undefined,
        city: onlyLetters(v.city).trim() || undefined,
        state: onlyLetters(v.state).trim() || undefined,
        country: v.country?.trim() || undefined,
      };

      let hasMissing = false;
      if (!payload.name) {
        setError("name", { type: "manual", message: "Name is required" });
        hasMissing = true;
      }
      if (!payload.mobile) {
        setError("mobile", { type: "manual", message: "Mobile number is required" });
        hasMissing = true;
      }
      if (!payload.gender) {
        setError("gender", { type: "manual", message: "Gender is required" });
        hasMissing = true;
      }
      if (payload.age === undefined || payload.age === null || payload.age === "") {
        setError("age", { type: "manual", message: "Age is required" });
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

      if (hasMissing) {
        addToast({ title: "Missing required", description: "Please fill all mandatory fields.", color: "danger", variant: "flat" });
        return;
      }
      if (payload.age != null && Number(payload.age) > 100) {
        addToast({ title: "Invalid age", description: "Age must be 100 or below.", color: "danger", variant: "flat" }); return;
      }

      if (v.linkFamily && v.relationship) {
        payload.relationship = v.relationship;
        payload.primaryPatientId = (v.primaryPatientId ?? "").trim();
      } else if (v.linkFamily && !v.relationship) {
        addToast({ title: "Missing required", description: "Please select a relationship to the existing patient.", color: "danger", variant: "flat" }); return;
      }

      const data: any = await createPatient(payload).unwrap();
      const id = String(data?.result?.id ?? data?.result?._id ?? "");
      if (!id) { addToast({ title: "Add patient failed ❌", description: "Patient ID not returned from API.", color: "danger", variant: "flat" }); return; }

      addToast({ title: "Patient added ✅", description: "New patient has been created successfully.", color: "success", variant: "flat" });
      stopVoice();
      onCreated({ id, name: payload.name, mobile: payload.mobile });
    } catch (err: any) {
      const backendErrors = err?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        backendErrors.forEach((e: any) => { if (e?.path && e?.message) setError(e.path, { type: "server", message: e.message }); });
        addToast({ title: "Validation failed ❌", description: "Please correct the highlighted fields.", color: "danger", variant: "flat" }); return;
      }
      const msg = err?.data?.message || err?.data?.error || err?.error || err?.message || "Failed to add patient";
      addToast({ title: "Add patient failed ❌", description: msg, color: "danger", variant: "flat" });
    }
  });

  /* ─── Render ─── */
  return (
    <div ref={formContainerRef} className="mt-3 overflow-hidden rounded-xl border border-teal-100 bg-white shadow-sm dark:border-[#273244] dark:bg-[#0f1728]">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 border-b border-teal-100 bg-teal-50/60 px-4 py-3 dark:border-[#273244] dark:bg-[#0f1728]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400">
          <FiUserPlus className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">
            No patient found{queryText ? <> for <span className="text-teal-700 dark:text-teal-400">&ldquo;{queryText}&rdquo;</span></> : null}
          </p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Fill in the details below to add a new patient and continue.
          </p>
        </div>

        {/* Voice Fill button */}
        <button
          type="button"
          onClick={handleDictation}
          aria-label={listening ? "Stop Voice Fill" : "Start Voice Fill"}
          title={listening ? "Stop Voice Fill" : "Start Voice Fill"}
          className={`relative inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-bold transition active:scale-[0.97] ${
            listening
              ? "border-red-200 bg-red-50 text-red-600 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400"
              : "border-teal-200 bg-white text-teal-700 hover:bg-teal-50 dark:border-[#38445a] dark:bg-[#1a2236] dark:text-teal-400 dark:hover:bg-[#1a3a35]"
          }`}
        >
          {listening && (
            <span className="flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
          )}
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">{listening ? "Stop" : "Voice Fill"}</span>
        </button>
      </div>

      {/* ── Voice transcript ── */}
      {(listening || transcript) && (
        <div className="flex items-start gap-2.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-[#273244] dark:bg-[#1a2236]">
          {listening && (
            <span className="mt-1 flex h-2 w-2 shrink-0">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-red-400 opacity-70" />
              <span className="relative h-2 w-2 rounded-full bg-red-500" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Voice Transcript</p>
            <p className="mt-0.5 break-words text-[12px] font-medium text-slate-700 dark:text-slate-200">{transcript || "Listening..."}</p>
          </div>
        </div>
      )}

      {/* ── Form body ── */}
      <div className="px-4 pb-4 pt-4 [&_[data-slot='input-wrapper']]:!rounded-lg [&_[data-slot='trigger']]:!rounded-lg">

        {/* Personal info section */}
        <div className="mb-4">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Personal Information
          </p>
          <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
            <InputField
              control={rhfControl}
              name="name"
              label="Full Name"
              isRequired
              placeholder="Patient name"
              rules={{ required: "Name is required", pattern: { value: /^[A-Za-z ]+$/, message: "Only alphabets allowed" } }}
              onInput={(e) => {
                const t = e.target as HTMLInputElement;
                t.value = (t.value || "").replace(/[^A-Za-z ]/g, "").replace(/\s+/g, " ").replace(/^\s+/g, "");
              }}
            />
            <InputField
              control={rhfControl}
              name="mobile"
              label="Phone Number"
              isRequired
              type="tel"
              placeholder="10-digit number"
              rules={mobileValidation}
              onInput={(e) => { const t = e.target as HTMLInputElement; t.value = t.value.replace(/[^0-9]/g, "").slice(0, 10); }}
            />
            <Controller
              control={control}
              name="gender"
              rules={{ required: "Gender is required" }}
              render={({ field, fieldState }) => (
                <div className="flex flex-col">
                  <label
                    htmlFor="gender"
                    className="pb-1 text-[14px] font-semibold text-[#100E1C] dark:text-slate-100"
                  >
                    Gender <span className="ml-1 text-danger">*</span>
                  </label>
                  <Select
                    id="gender"
                    aria-label="Gender"
                    radius="lg"
                    variant="bordered"
                    placeholder="Select gender"
                    selectedKeys={field.value ? new Set([field.value]) : new Set()}
                    isInvalid={!!fieldState.error}
                    errorMessage={fieldState.error?.message}
                    onSelectionChange={(keys) => {
                      const key = Array.from(keys as Set<string>)[0];
                      field.onChange(key ?? "");
                    }}
                    onOpenChange={(open) => { if (!open) field.onBlur(); }}
                    classNames={{
                      base: "gap-0",
                      trigger:
                        "!h-10 !min-h-10 !rounded-lg border-1 border-border-color bg-white data-[hover=true]:border-primary/60 data-[open=true]:border-primary dark:!border-[#38445a] dark:!bg-[#0f1728] dark:data-[hover=true]:!border-[#46beae]/60 dark:data-[open=true]:!border-[#46beae]",
                    }}
                  >
                    <SelectItem key="Male">Male</SelectItem>
                    <SelectItem key="Female">Female</SelectItem>
                    <SelectItem key="Other">Other</SelectItem>
                  </Select>
                </div>
              )}
            />
            <InputField
              control={rhfControl}
              type="number"
              name="age"
              label="Age"
              isRequired
              placeholder="Years"
              rules={{ required: "Age is required", min: { value: 1, message: "Age must be between 1 and 100" }, max: { value: 100, message: "Age must be between 1 and 100" } }}
              onInput={(e) => {
                const t = e.target as HTMLInputElement;
                const digits = (t.value || "").replace(/\D/g, "").replace(/^0+/, "");
                if (!digits) { t.value = ""; return; }
                if (digits.length <= 2) { t.value = digits; return; }
                if (digits.startsWith("100")) { t.value = "100"; return; }
                t.value = digits.slice(0, 2);
              }}
            />
          </div>
        </div>

        {/* Address section */}
        <div className="mb-4">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Address Details
          </p>
          <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
            <InputField
              control={rhfControl}
              name="address"
              label="Address"
              placeholder="House no., street, locality"
              onInput={(e) => { const t = e.target as HTMLInputElement; t.value = limitAddressText(t.value); }}
            />
            {/* Scoped style override — only affects THIS CitySelector instance,
                matches height of the other inputs. Does not change
                the shared component used in other forms. */}
            <div className="[&_[data-slot='input-wrapper']]:!h-10 [&_[data-slot='input-wrapper']]:!min-h-10">
              <CitySelector
                control={rhfControl}
                onCityStateChange={handleCityStateChange}
                size="md"
                isRequired
                error={
                  errors.city?.message
                    ? String(errors.city.message)
                    : errors.state?.message
                    ? String(errors.state.message)
                    : undefined
                }
              />
            </div>
          </div>
        </div>

        {/* Family linking — appears when mobile matches an existing patient */}
        <div className="mt-4">
          <FamilyRelationSection
            ref={familySectionRef}
            control={control}
            setValue={setValue}
            mobileValue={mobileValue}
          />
        </div>

        {/* ── Footer ── */}
        <div className="mt-5 flex items-center justify-end gap-3">
          <AppButton
            text="Cancel"
            buttonVariant="outlined"
            type="button"
            className="h-10 min-w-[120px] rounded-lg px-6 font-semibold"
            isDisabled={isCreating}
            onPress={() => { stopVoice(); onCancel(); }}
          />
          <AppButton
            text="Save & Continue"
            buttonVariant="primary"
            type="button"
            className="h-10 min-w-[120px] rounded-lg px-6 font-semibold"
            isLoading={isCreating}
            onPress={() => onSubmit()}
          />
        </div>
      </div>
    </div>
  );
};

export default InlineAddPatientForm;
