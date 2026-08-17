import type { GenderOpt, VoicePatientForm } from "./types";

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

export const loadCityStateMaps = () => {
  return fetch(
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

      sMap["mp"] = "Madhya Pradesh";
      sMap["up"] = "Uttar Pradesh";
      sMap["ap"] = "Andhra Pradesh";
      sMap["hp"] = "Himachal Pradesh";
      sMap["jk"] = "Jammu and Kashmir";

      CITIES_MAP = cMap;
      STATES_MAP = sMap;
      CITY_TO_STATE_MAP = ctsMap;
    });
};

export const guessFromQuery = (q: string) => {
  const raw = String(q || "").trim();
  const digits = raw.replace(/\D/g, "");
  const mobile = digits.length >= 10 ? digits.slice(-10) : "";
  const name = /^[A-Za-z ]+$/.test(raw) && raw.length >= 2 ? raw : "";
  return { name, mobile };
};

export const onlyLetters = (s: any) =>
  String(s ?? "")
    .replace(/[^A-Za-z ]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\s+/g, "");

const getAddressWords = (value: string) => {
  return value.trim().split(/\s+/).filter(Boolean);
};

export const limitAddressText = (value: string) => {
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

export function parsePatientData(text: string): Partial<VoicePatientForm> {
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
