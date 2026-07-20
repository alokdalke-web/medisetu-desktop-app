import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tooltip,
} from "@heroui/react";
import React from "react";
import {
  FiCheck,
  FiChevronDown,
  FiClock,
  FiGlobe,
  FiMinus,
  FiPlus,
  FiSearch,
  FiStar,
  FiX,
} from "react-icons/fi";
import CompactSelectDropdown from "../../../shared/CompactSelectDropdown";
import PrescriptionsHistory from "../../../../pages/patient/PrescriptionsHistory";
import {
  extractAnyId,
  extractAnyForm,
  extractAnyName,
  extractAnyStrength,
  formatStrength,
  highlightHtml,
  normalizeKey,
} from "../helpers/medicineMappers";
import type { PrescriptionWorkspaceProps } from "../types";
import { useLazyGetMedicineDataQuery } from "../../../../redux/api/medicineApi";

const SCHEDULE_PATTERN_OPTIONS = [
  "1-1-1",
  "1-1-0",
  "1-0-1",
  "1-0-0",
  "0-1-1",
  "0-1-0",
  "0-0-1",
  "2-0-2",
  "0-0-2",
  "0-1-2",
  "0-2-0",
  "0-2-1",
  "0-2-2",
  "1-0-2",
  "1-1-2",
  "1-2-0",
  "1-2-1",
  "1-2-2",
  "2-0-0",
  "2-0-1",
  "2-1-0",
  "2-1-1",
  "2-1-2",
  "2-2-0",
  "2-2-1",
  "2-2-2",
];

const SCHEDULE_PATTERN_SUGGESTIONS = SCHEDULE_PATTERN_OPTIONS.map(
  (pattern) => ({
    pattern,
    digits: pattern.replace(/-/g, ""),
    label: pattern,
  }),
);

const DEFAULT_QUICK_SCHEDULE_PATTERN = "1-1-1";
const MIN_QUICK_SCHEDULE_DIGITS = "100";

const digitsToSchedulePattern = (digits: string) =>
  `${digits[0]}-${digits[1]}-${digits[2]}`;

const sanitizeScheduleDigits = (value: string) =>
  value.replace(/[^012]/g, "").slice(0, 3);

const isSupportedSchedulePattern = (pattern: string) =>
  SCHEDULE_PATTERN_OPTIONS.includes(pattern);

const getPreviousScheduleDigits = (value: string) => {
  const digits = sanitizeScheduleDigits(value).padEnd(3, "0").slice(0, 3);
  const parts = digits.split("").map((digit) => Number(digit));

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    if (parts[index] > 0) {
      parts[index] -= 1;
      const nextDigits = parts.join("");

      return nextDigits === "000" ? digits : nextDigits;
    }
  }

  return MIN_QUICK_SCHEDULE_DIGITS;
};

const MEDICINE_FORM_ALIASES_FOR_DEDUPE = [
  { form: "Tablet", aliases: ["tablet", "tablets", "tab", "tabs"] },
  { form: "Capsule", aliases: ["capsule", "capsules", "cap", "caps"] },
  { form: "Lozenge", aliases: ["lozenge", "lozenges"] },
  { form: "Sachet", aliases: ["sachet", "sachets"] },
  { form: "Granules", aliases: ["granules"] },
  { form: "Powder", aliases: ["powder", "powders"] },
  { form: "Syrup", aliases: ["syrup", "syrups"] },
  { form: "Suspension", aliases: ["suspension", "suspensions"] },
  { form: "Liquid", aliases: ["liquid", "liquids"] },
  { form: "Drops", aliases: ["drops", "drop"] },
  { form: "Cream", aliases: ["cream", "creams"] },
  { form: "Ointment", aliases: ["ointment", "ointments"] },
  { form: "Gel", aliases: ["gel", "gels"] },
  { form: "Lotion", aliases: ["lotion", "lotions"] },
  { form: "Paste", aliases: ["paste", "pastes"] },
  { form: "Spray", aliases: ["spray", "sprays"] },
  { form: "Foam", aliases: ["foam", "foams"] },
  { form: "Mouthwash", aliases: ["mouthwash", "mouth wash"] },
  { form: "Oral Rinse", aliases: ["oral rinse", "oral rinses"] },
  { form: "Dental Cement", aliases: ["dental cement", "dental cements"] },
  { form: "Dental Varnish", aliases: ["dental varnish", "dental varnishes"] },
  { form: "Injection", aliases: ["injection", "injections", "inj"] },
  { form: "Inhaler", aliases: ["inhaler", "inhalers"] },
  { form: "Patch", aliases: ["patch", "patches"] },
  { form: "Suppository", aliases: ["suppository", "suppositories"] },
  { form: "Shampoo", aliases: ["shampoo", "shampoos"] },
  { form: "Soap", aliases: ["soap", "soaps"] },
  { form: "Facewash", aliases: ["facewash", "face wash"] },
  { form: "Conditioner", aliases: ["conditioner", "conditioners"] },
  { form: "Toothpaste", aliases: ["toothpaste", "tooth paste"] },
  { form: "Mouth Gel", aliases: ["mouth gel", "mouth gels"] },
  { form: "Handwash", aliases: ["handwash", "hand wash"] },
  { form: "Sanitizer", aliases: ["sanitizer", "sanitizers"] },
  { form: "Oil", aliases: ["oil", "oils"] },
]
  .map(({ form, aliases }) => ({
    form,
    aliases: aliases.sort((a, b) => b.length - a.length),
  }))
  .sort((a, b) => b.aliases[0].length - a.aliases[0].length);

const normalizeDedupeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const inferMedicineFormForDedupe = (name: string) => {
  const normalizedName = ` ${normalizeDedupeText(name)} `;

  for (const { form, aliases } of MEDICINE_FORM_ALIASES_FOR_DEDUPE) {
    const hasMatch = aliases.some((alias) =>
      normalizedName.includes(` ${normalizeDedupeText(alias)} `),
    );

    if (hasMatch) return form;
  }

  return "-";
};

const getMedicineNameFormDedupeKey = (medicine: any) => {
  const name = extractAnyName(medicine);
  const nameKey = normalizeDedupeText(name);
  if (!nameKey) return "";

  const explicitForm = extractAnyForm(medicine);
  const form = explicitForm || inferMedicineFormForDedupe(name);
  const formKey = normalizeDedupeText(form) || "-";

  return `${nameKey}|${formKey}`;
};

const PrescriptionMedicineSidebar: React.FC<{
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  canEditPrescription: boolean;
  lockMessage: string;
  isSearchActive: boolean;
  onSearchFocus: () => void;
  onSearchClose: () => void;
  onKeyDownSearch: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  queryReady: boolean;
  medicinesLoading: boolean;
  medicinesError: any;
  filteredMedicines: any[];
  debouncedQuery: string;
  openAddNew: (
    nameForPrefill?: string,
    compositionForPrefill?: string,
    manufacturerForPrefill?: string,
  ) => void;
  createGlobalMedicineDirect?: (item: {
    medicine_name?: string;
    composition?: string;
    manufacturer_name?: string;
  }) => Promise<void> | void;
  isCreatingGlobalMedicine?: boolean;
  autoConfigureMedicineName?: string | null;
  onAutoConfigureMedicineHandled?: () => void;
  refetchMedicines: () => void;
  topUsedLoading: boolean;
  topUsedIsError: boolean;
  refetchTopUsed: () => void;
  topUsedMedicines: any[];
  isAlreadySelected: (m: { id?: any; name?: any; medicineId?: any }) => boolean;
  canonicalizeMedicineId: (
    rawId: string,
    name?: string,
    strength?: string,
  ) => string;
  addMedicineDirect: (
    m: any,
    quick?: {
      pattern?: string;
      days?: number;
      timing?: string;
      frequency?: "daily" | "weekly";
      instruction?: string;
    },
  ) => void;
  removeMedicineDirect: (m: any) => void;
  toggleFavorite: any;
  showToast: (msg: string) => void;
  isPrescriptionHistoryOpen: boolean;
  setIsPrescriptionHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rxHistory: any[];
  isRxHistoryLoading: boolean;
  patient?: PrescriptionWorkspaceProps["patient"];
  doctor?: PrescriptionWorkspaceProps["doctor"];
  clinic?: PrescriptionWorkspaceProps["clinic"];
  showStockAvailability?: boolean;
  stockAvailabilityByName?: Map<string, number>;
  stockCacheLoading?: boolean;
}> = ({
  query,
  setQuery,
  canEditPrescription,
  lockMessage,
  isSearchActive,
  onSearchFocus,
  onSearchClose,
  onKeyDownSearch,
  queryReady,
  medicinesLoading,
  medicinesError,
  filteredMedicines,
  debouncedQuery,
  openAddNew,
  createGlobalMedicineDirect,
  isCreatingGlobalMedicine = false,
  autoConfigureMedicineName,
  onAutoConfigureMedicineHandled,
  refetchMedicines,
  topUsedLoading,
  topUsedIsError,
  refetchTopUsed,
  topUsedMedicines,
  isAlreadySelected,
  canonicalizeMedicineId,
  addMedicineDirect,
  removeMedicineDirect,
  toggleFavorite,
  showToast,
  isPrescriptionHistoryOpen,
  setIsPrescriptionHistoryOpen,
  rxHistory,
  isRxHistoryLoading,
  patient,
  doctor,
  clinic,
  showStockAvailability = false,
  stockAvailabilityByName,
  stockCacheLoading = false,
}) => {
  const [favoriteOverrides, setFavoriteOverrides] = React.useState<
    Record<string, boolean>
  >({});
  const [localFavoriteMedicines, setLocalFavoriteMedicines] = React.useState<
    Record<string, any>
  >({});
  const pickerRef = React.useRef<HTMLDivElement | null>(null);

  const [triggerGetMedicineData, { isFetching }] =
    useLazyGetMedicineDataQuery();
  const [dbMeds, setDbMeds] = React.useState<any[]>([]);
  const [dbPage, setDbPage] = React.useState(1);
  const [dbHasMore, setDbHasMore] = React.useState(true);
  const [dbLoading, setDbLoading] = React.useState(false);
  const [dbError, setDbError] = React.useState(false);

  // Fetch global database options for every valid search, even when local results exist.
  React.useEffect(() => {
    const searchTerm = debouncedQuery.trim();

    if (!queryReady || searchTerm.length < 2) {
      setDbMeds([]);
      setDbPage(1);
      setDbHasMore(false);
      return;
    }

    let isCurrentSearch = true;

    const fetchInitial = async () => {
      setDbMeds([]);
      setDbLoading(true);
      setDbError(false);
      setDbPage(1);
      setDbHasMore(true);

      try {
        const res = await triggerGetMedicineData({
          medicine_name: searchTerm,
          page: 1,
          limit: 5,
        }).unwrap();

        if (!isCurrentSearch) return;

        if (res?.success) {
          const items = res?.data || [];
          setDbMeds(items);
          const pagination = res?.pagination;
          if (pagination) {
            setDbHasMore(pagination.currentPage < pagination.totalPages);
          } else {
            setDbHasMore(items.length === 5);
          }
        } else {
          setDbMeds([]);
          setDbHasMore(false);
        }
      } catch (err) {
        if (!isCurrentSearch) return;
        console.error("Error fetching db medicines:", err);
        setDbError(true);
        setDbMeds([]);
        setDbHasMore(false);
      } finally {
        if (isCurrentSearch) setDbLoading(false);
      }
    };

    fetchInitial();

    return () => {
      isCurrentSearch = false;
    };
  }, [debouncedQuery, queryReady, triggerGetMedicineData]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    if (!dbHasMore || dbLoading || isFetching) return;
    const target = e.currentTarget;
    // Scroll to bottom detection
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 20) {
      const nextPage = dbPage + 1;
      setDbLoading(true);
      try {
        const res = await triggerGetMedicineData({
          medicine_name: debouncedQuery.trim(),
          page: nextPage,
          limit: 5,
        }).unwrap();

        if (res?.success) {
          const items = res?.data || [];
          setDbMeds((prev) => [...prev, ...items]);
          setDbPage(nextPage);
          const pagination = res?.pagination;
          if (pagination) {
            setDbHasMore(pagination.currentPage < pagination.totalPages);
          } else {
            setDbHasMore(items.length === 5);
          }
        }
      } catch (err) {
        console.error("Error fetching more db medicines:", err);
      } finally {
        setDbLoading(false);
      }
    }
  };

  // Quick dose config shown inline in a medicine row while selecting.
  const [configKey, setConfigKey] = React.useState<string | null>(null);
  const [qcPattern, setQcPattern] = React.useState(
    DEFAULT_QUICK_SCHEDULE_PATTERN,
  );
  const [qcScheduleInput, setQcScheduleInput] = React.useState(
    DEFAULT_QUICK_SCHEDULE_PATTERN,
  );
  const [showQcScheduleSuggestions, setShowQcScheduleSuggestions] =
    React.useState(false);
  const [isQcScheduleJustOpened, setIsQcScheduleJustOpened] =
    React.useState(false);
  const [qcDays, setQcDays] = React.useState(5);
  const [qcTiming, setQcTiming] = React.useState("After Food");
  const [qcFrequency, setQcFrequency] = React.useState<"daily" | "weekly">(
    "daily",
  );
  const [qcInstruction, setQcInstruction] = React.useState("");
  const qcScheduleRef = React.useRef<HTMLDivElement | null>(null);

  const TIMING_OPTIONS = ["After Food", "Before Food", "Empty stomach"].map(
    (t) => ({ label: t, value: t }),
  );

  const openQuickConfig = React.useCallback((rowKey: string) => {
    setConfigKey(rowKey);
    setQcPattern(DEFAULT_QUICK_SCHEDULE_PATTERN);
    setQcScheduleInput(DEFAULT_QUICK_SCHEDULE_PATTERN);
    setShowQcScheduleSuggestions(false);
    setIsQcScheduleJustOpened(false);
    setQcDays(5);
    setQcTiming("After Food");
    setQcFrequency("daily");
    setQcInstruction("");
  }, []);

  const qcScheduleSearchDigits = qcScheduleInput.replace(/[^012]/g, "");
  const qcScheduleSuggestions = isQcScheduleJustOpened
    ? SCHEDULE_PATTERN_SUGGESTIONS
    : SCHEDULE_PATTERN_SUGGESTIONS.filter(
        ({ digits }) =>
          !qcScheduleSearchDigits || digits.startsWith(qcScheduleSearchDigits),
      );

  const getSchedulePatternFromInput = (value: string) => {
    const trimmedValue = value.trim();
    const digitValue = trimmedValue.replace(/-/g, "");

    if (/^[0-2]-[0-2]-[0-2]$/.test(trimmedValue)) return trimmedValue;
    if (/^[0-2]{3}$/.test(digitValue)) {
      return digitsToSchedulePattern(digitValue);
    }

    return "";
  };

  const selectSchedulePattern = (pattern: string) => {
    if (!isSupportedSchedulePattern(pattern)) return;

    setQcPattern(pattern);
    setQcScheduleInput(pattern);
    setShowQcScheduleSuggestions(false);
    setIsQcScheduleJustOpened(false);
  };

  const handleScheduleInputChange = (value: string) => {
    const digits = sanitizeScheduleDigits(value);
    const nextPattern = getSchedulePatternFromInput(digits);

    setShowQcScheduleSuggestions(true);
    setIsQcScheduleJustOpened(false);

    if (digits === "000") {
      const fallbackPattern = digitsToSchedulePattern(
        MIN_QUICK_SCHEDULE_DIGITS,
      );

      setQcPattern(fallbackPattern);
      setQcScheduleInput(fallbackPattern);
      return;
    }

    if (!nextPattern || !isSupportedSchedulePattern(nextPattern)) {
      setQcScheduleInput(digits);
      return;
    }

    setQcPattern(nextPattern);
    setQcScheduleInput(nextPattern);
  };

  const handleScheduleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextPattern = getSchedulePatternFromInput(qcScheduleInput);

      if (nextPattern && isSupportedSchedulePattern(nextPattern)) {
        selectSchedulePattern(nextPattern);
      }

      return;
    }

    if (e.key === "Escape") {
      setShowQcScheduleSuggestions(false);
      setQcScheduleInput(qcPattern);
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      const nextDigits = getPreviousScheduleDigits(qcScheduleInput);
      const nextPattern = digitsToSchedulePattern(nextDigits);

      setQcScheduleInput(nextPattern);
      if (isSupportedSchedulePattern(nextPattern)) {
        setQcPattern(nextPattern);
      }
      setShowQcScheduleSuggestions(true);
      setIsQcScheduleJustOpened(false);
      return;
    }

    const allowedControlKeys = [
      "Delete",
      "Tab",
      "Enter",
      "Escape",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ];

    if (allowedControlKeys.includes(e.key)) return;
    if (/^[0-2]$/.test(e.key)) return;
    if (e.key === "-") return;

    e.preventDefault();
  };

  const handleScheduleInputBlur = () => {
    const nextPattern = getSchedulePatternFromInput(qcScheduleInput);

    if (nextPattern && isSupportedSchedulePattern(nextPattern)) {
      selectSchedulePattern(nextPattern);
      return;
    }

    setQcScheduleInput(qcPattern);
    setShowQcScheduleSuggestions(false);
    setIsQcScheduleJustOpened(false);
  };

  const favoriteLookup = React.useMemo(() => {
    const byId = new Map<string, boolean>();
    const byNameStrength = new Map<string, boolean>();

    topUsedMedicines.forEach((m) => {
      const rawId = extractAnyId(m);
      const rawName = extractAnyName(m);
      const rawStrength = extractAnyStrength(m);
      const isFavorite = (m as any)?.isFavorite === true;

      if (rawId) byId.set(rawId, isFavorite);
      if (rawName) {
        byNameStrength.set(
          `${normalizeKey(rawName)}|${String(rawStrength ?? "").trim()}`,
          isFavorite,
        );
      }
    });

    return { byId, byNameStrength };
  }, [topUsedMedicines]);

  const getFavoriteKey = (
    canonicalId: string,
    rawId: string,
    rawName: string,
    rawStrength: string,
  ) =>
    canonicalId ||
    rawId ||
    `${normalizeKey(rawName)}|${String(rawStrength ?? "").trim()}`;

  const isMedicineFavorite = (
    m: any,
    canonicalId: string,
    rawId: string,
    rawName: string,
    rawStrength: string,
  ) => {
    const key = getFavoriteKey(canonicalId, rawId, rawName, rawStrength);
    const override = favoriteOverrides[key];

    if (typeof override === "boolean") return override;

    const byId =
      favoriteLookup.byId.get(canonicalId) ?? favoriteLookup.byId.get(rawId);

    if (typeof byId === "boolean") return byId;

    const byNameStrength = favoriteLookup.byNameStrength.get(
      `${normalizeKey(rawName)}|${String(rawStrength ?? "").trim()}`,
    );

    if (typeof byNameStrength === "boolean") return byNameStrength;

    return (m as any)?.isFavorite === true;
  };

  const handleFavoriteToggle = async (
    m: any,
    canonicalId: string,
    rawId: string,
    rawName: string,
    rawStrength: string,
  ) => {
    if (!canEditPrescription) {
      showToast("Please confirm the appointment first");
      return;
    }

    const medicineId = String(
      (m as any)?.medicineId ?? (m as any)?.id ?? canonicalId ?? rawId ?? "",
    ).trim();

    if (!medicineId) {
      showToast("Medicine id missing");
      return;
    }

    const key = getFavoriteKey(canonicalId, rawId, rawName, rawStrength);
    const nextFavorite = !isMedicineFavorite(
      m,
      canonicalId,
      rawId,
      rawName,
      rawStrength,
    );

    try {
      await toggleFavorite(medicineId).unwrap();
      setFavoriteOverrides((prev) => ({ ...prev, [key]: nextFavorite }));

      setLocalFavoriteMedicines((prev) => {
        if (!nextFavorite) {
          const { [key]: _removed, ...rest } = prev;
          return rest;
        }

        return {
          ...prev,
          [key]: {
            ...m,
            id: medicineId,
            medicineId,
            name: rawName,
            medicineName: rawName,
            strength: rawStrength,
            isFavorite: true,
          },
        };
      });

      refetchTopUsed();
    } catch (_error) {
      showToast("Failed to update favorite");
    }
  };

  const favoriteMedicines = [
    ...topUsedMedicines,
    ...Object.values(localFavoriteMedicines),
  ].reduce<any[]>((acc, m) => {
    const rawId = extractAnyId(m);
    const rawName = extractAnyName(m);
    const rawStrength = extractAnyStrength(m);
    const cid = canonicalizeMedicineId(rawId, rawName, rawStrength);

    if (!isMedicineFavorite(m, cid, rawId, rawName, rawStrength)) return acc;

    const key = getFavoriteKey(cid, rawId, rawName, rawStrength);
    const alreadyAdded = acc.some((item) => {
      const itemRawId = extractAnyId(item);
      const itemRawName = extractAnyName(item);
      const itemRawStrength = extractAnyStrength(item);
      const itemCid = canonicalizeMedicineId(
        itemRawId,
        itemRawName,
        itemRawStrength,
      );

      return (
        key === getFavoriteKey(itemCid, itemRawId, itemRawName, itemRawStrength)
      );
    });

    if (!alreadyAdded) acc.push(m);
    return acc;
  }, []);

  const quickMedicines = [...favoriteMedicines, ...topUsedMedicines].reduce<
    any[]
  >((acc, m) => {
    const rawId = extractAnyId(m);
    const rawName = extractAnyName(m);
    const rawStrength = extractAnyStrength(m);
    const cid = canonicalizeMedicineId(rawId, rawName, rawStrength);
    const key = getFavoriteKey(cid, rawId, rawName, rawStrength);
    const alreadyAdded = acc.some((item) => {
      const itemRawId = extractAnyId(item);
      const itemRawName = extractAnyName(item);
      const itemRawStrength = extractAnyStrength(item);
      const itemCid = canonicalizeMedicineId(
        itemRawId,
        itemRawName,
        itemRawStrength,
      );

      return (
        key === getFavoriteKey(itemCid, itemRawId, itemRawName, itemRawStrength)
      );
    });

    if (!alreadyAdded) acc.push(m);
    return acc;
  }, []);

  const showPicker = isSearchActive;
  const showQuickMedicines = showPicker && !queryReady;
  const hasVisibleQuickConfig = React.useMemo(() => {
    if (!configKey) return false;

    const visibleMedicines = queryReady ? filteredMedicines : quickMedicines;
    const rowPrefix = queryReady ? "search" : "quick";

    return visibleMedicines.some((m) => {
      const rawId = extractAnyId(m);
      const rawName = extractAnyName(m);

      return `${rowPrefix}-${String(rawId || rawName)}` === configKey;
    });
  }, [configKey, filteredMedicines, queryReady, quickMedicines]);

  const visibleDbMeds = React.useMemo(() => {
    const existingSearchKeys = new Set(
      filteredMedicines.map(getMedicineNameFormDedupeKey).filter(Boolean),
    );
    const visibleGlobalKeys = new Set<string>();

    return dbMeds.filter((item) => {
      const key = getMedicineNameFormDedupeKey(item);
      if (!key) return false;
      if (existingSearchKeys.has(key)) return false;
      if (visibleGlobalKeys.has(key)) return false;

      visibleGlobalKeys.add(key);
      return true;
    });
  }, [dbMeds, filteredMedicines]);

  const getMedicineRowKey = React.useCallback(
    (m: any, rowKeyPrefix = "medicine") => {
      const rawId = extractAnyId(m);
      const rawName = extractAnyName(m);

      return `${rowKeyPrefix}-${String(rawId || rawName)}`;
    },
    [],
  );

  const moveConfiguringMedicineFirst = React.useCallback(
    (items: any[], rowKeyPrefix: string) => {
      if (!configKey) return items;

      const configuringIndex = items.findIndex(
        (m) => getMedicineRowKey(m, rowKeyPrefix) === configKey,
      );

      if (configuringIndex <= 0) return items;

      const configuringMedicine = items[configuringIndex];

      return [
        configuringMedicine,
        ...items.slice(0, configuringIndex),
        ...items.slice(configuringIndex + 1),
      ];
    },
    [configKey, getMedicineRowKey],
  );

  const orderedFilteredMedicines = React.useMemo(
    () => moveConfiguringMedicineFirst(filteredMedicines, "search"),
    [filteredMedicines, moveConfiguringMedicineFirst],
  );

  const orderedQuickMedicines = React.useMemo(
    () => moveConfiguringMedicineFirst(quickMedicines, "quick"),
    [moveConfiguringMedicineFirst, quickMedicines],
  );

  React.useEffect(() => {
    if (!showPicker) return;

    const handleOutsidePress = (event: MouseEvent | TouchEvent) => {
      if (!pickerRef.current) return;
      if (!(event.target instanceof Node)) return;
      if (!pickerRef.current.contains(event.target)) onSearchClose();
    };

    document.addEventListener("mousedown", handleOutsidePress);
    document.addEventListener("touchstart", handleOutsidePress);

    return () => {
      document.removeEventListener("mousedown", handleOutsidePress);
      document.removeEventListener("touchstart", handleOutsidePress);
    };
  }, [onSearchClose, showPicker]);

  React.useEffect(() => {
    const targetName = normalizeKey(autoConfigureMedicineName || "");
    if (!targetName || !queryReady || filteredMedicines.length === 0) return;

    const exactMatch = filteredMedicines.find(
      (m) => normalizeKey(extractAnyName(m)) === targetName,
    );
    const looseMatch =
      exactMatch ||
      filteredMedicines.find((m) => {
        const nameKey = normalizeKey(extractAnyName(m));
        return nameKey.includes(targetName) || targetName.includes(nameKey);
      });

    if (!looseMatch) return;

    const rawId = extractAnyId(looseMatch);
    const rawName = extractAnyName(looseMatch);
    const rawStrength = extractAnyStrength(looseMatch);
    const cid = canonicalizeMedicineId(rawId, rawName, rawStrength);

    if (!isAlreadySelected({ id: cid, name: rawName, medicineId: rawId })) {
      openQuickConfig(`search-${String(rawId || rawName)}`);
    }

    onAutoConfigureMedicineHandled?.();
  }, [
    autoConfigureMedicineName,
    canonicalizeMedicineId,
    filteredMedicines,
    isAlreadySelected,
    onAutoConfigureMedicineHandled,
    openQuickConfig,
    queryReady,
  ]);

  const renderMedicineRow = (
    m: any,
    options?: { highlightedNameHtml?: string; rowKeyPrefix?: string },
  ) => {
    const rawId = extractAnyId(m);
    const rawName = extractAnyName(m);
    const rawStrength = extractAnyStrength(m);
    const cid = canonicalizeMedicineId(rawId, rawName, rawStrength);
    const alreadyAdded = isAlreadySelected({ id: cid, name: rawName });
    const rowKey = getMedicineRowKey(
      m,
      options?.rowKeyPrefix ?? "medicine",
    );
    const isConfiguring = configKey === rowKey && !alreadyAdded;
    const isFavorite = isMedicineFavorite(m, cid, rawId, rawName, rawStrength);
    const strengthText = formatStrength(rawStrength);
    const stockQuantity = stockAvailabilityByName?.get(normalizeKey(rawName));
    const isInStockCache =
      !stockCacheLoading && stockAvailabilityByName?.has(normalizeKey(rawName));
    const stockDotClass = stockCacheLoading
      ? "bg-slate-300"
      : isInStockCache
        ? "bg-emerald-500 ring-emerald-200"
        : "bg-rose-500 ring-rose-200";

    const stockDotWrapperClass = stockCacheLoading
      ? "bg-slate-100"
      : isInStockCache
        ? "bg-emerald-100"
        : "bg-rose-100";
    const stockStatusText = stockCacheLoading
      ? "Checking pharmacy stock"
      : isInStockCache
        ? `Available in pharmacy stock${typeof stockQuantity === "number" ? `: ${stockQuantity}` : ""}`
        : "Not available in pharmacy stock";

    return (
      <div
        key={rowKey}
        className={["min-w-0", isConfiguring ? "col-span-full" : ""].join(" ")}
      >
        <div
          className={[
            "flex min-h-[64px] items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition",
            isConfiguring
              ? "border-teal-300 bg-teal-50/60 rounded-b-none dark:border-[#46beae]/40 dark:bg-[#0f2925]/25"
              : alreadyAdded
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/30 hover:shadow-sm dark:border-[#273244] dark:bg-[#111726] dark:hover:bg-[#151c2d]",
          ].join(" ")}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                await handleFavoriteToggle(m, cid, rawId, rawName, rawStrength);
              }}
              disabled={!canEditPrescription}
              className={[
                "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition",
                isFavorite
                  ? "border-amber-200 bg-amber-50 text-amber-500"
                  : "border-slate-200 bg-white text-slate-300 hover:border-amber-200 hover:text-amber-500",
                !canEditPrescription ? "cursor-not-allowed opacity-60" : "",
              ].join(" ")}
              aria-label={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <FiStar className={isFavorite ? "fill-current" : ""} />
            </button>

            {showStockAvailability && (
              <Tooltip content={stockStatusText} placement="top">
                <span
                  className={[
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                    stockDotWrapperClass,
                  ].join(" ")}
                  aria-label={stockStatusText}
                  title={stockStatusText}
                >
                  <span
                    className={["h-1.5 w-1.5 rounded-full", stockDotClass].join(
                      " ",
                    )}
                  />
                </span>
              </Tooltip>
            )}

            <div className="min-w-0">
              {options?.highlightedNameHtml ? (
                <div className="truncate text-sm font-bold leading-5 text-slate-900 dark:text-white">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: options.highlightedNameHtml,
                    }}
                  />
                  {strengthText ? ` ${strengthText}` : ""}
                </div>
              ) : (
                <div className="truncate text-sm font-bold leading-5 text-slate-900 dark:text-white">
                  {rawName}
                  {strengthText ? ` ${strengthText}` : ""}
                </div>
              )}

              {(m as any)?.form && (
                <div className="truncate text-xs font-medium text-slate-500 dark:text-white">
                  {(m as any).form}
                </div>
              )}
            </div>
          </div>

          {alreadyAdded ? (
            <Tooltip content="Already added. Click to remove" placement="top">
              <button
                type="button"
                disabled={!canEditPrescription}
                onClick={() => removeMedicineDirect(m)}
                className={[
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-white shadow-sm transition",
                  canEditPrescription
                    ? "border-emerald-500 bg-emerald-600 hover:border-rose-400 hover:bg-rose-500"
                    : "cursor-not-allowed border-emerald-300 bg-emerald-500 opacity-60",
                ].join(" ")}
                aria-label={`Remove ${rawName}`}
                title={`Already added. Remove ${rawName}`}
              >
                <FiCheck className="h-4 w-4" />
              </button>
            </Tooltip>
          ) : (
            <Tooltip
              content={lockMessage}
              isDisabled={canEditPrescription}
              placement="top"
            >
              <span className="inline-flex">
                <button
                  type="button"
                  disabled={!canEditPrescription}
                  onClick={() =>
                    isConfiguring ? setConfigKey(null) : openQuickConfig(rowKey)
                  }
                  className={[
                    "grid h-9 w-9 shrink-0 place-items-center rounded-full border transition",
                    canEditPrescription
                      ? isConfiguring
                        ? "border-teal-500 bg-teal-600 text-white"
                        : "border-teal-200 bg-teal-50 text-teal-700 shadow-sm shadow-teal-50 hover:border-teal-400 hover:bg-teal-100 dark:border-[#46beae]/40 dark:bg-[#123730]/50 dark:text-[#9be7dc] dark:shadow-none"
                      : "cursor-not-allowed border-slate-200 text-slate-400",
                  ].join(" ")}
                  aria-label={`Add ${rawName}`}
                  title={`Configure & add ${rawName}`}
                >
                  <FiPlus
                    className={[
                      "h-4 w-4 transition-transform",
                      isConfiguring ? "rotate-45" : "",
                    ].join(" ")}
                  />
                </button>
              </span>
            </Tooltip>
          )}
        </div>

        {/* Inline quick dose config — mirrors the medicine editor's control row */}
        {isConfiguring && (
          <div className="rounded-b-xl border border-t-0 border-teal-300 bg-teal-50/40 p-3 dark:border-[#46beae]/40 dark:bg-[#0f2925]/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
              {/* Schedule */}
              <div className="min-w-0 w-full sm:w-[110px] shrink-0">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Schedule
                </label>
                <div ref={qcScheduleRef} className="relative">
                  <input
                    type="text"
                    value={qcScheduleInput}
                    onFocus={(e) => {
                      e.currentTarget.select();
                      setIsQcScheduleJustOpened(true);
                      setShowQcScheduleSuggestions(true);
                    }}
                    onChange={(e) => handleScheduleInputChange(e.target.value)}
                    onKeyDown={handleScheduleInputKeyDown}
                    onBlur={handleScheduleInputBlur}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="1-1-1"
                    aria-label="Schedule"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 pr-8 text-[13px] font-bold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-[#273244] dark:bg-[#0f1728] dark:text-white dark:focus:border-[#46beae]/60 dark:focus:ring-[#46beae]/20"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsQcScheduleJustOpened(true);
                      setShowQcScheduleSuggestions((prev) => !prev);
                    }}
                    className="absolute right-2.5 top-1/2 grid -translate-y-1/2 place-items-center text-slate-500 transition hover:text-teal-700 dark:text-slate-400"
                    aria-label="Show schedule options"
                  >
                    <FiChevronDown
                      className={[
                        "h-4 w-4 transition-transform",
                        showQcScheduleSuggestions
                          ? "rotate-180 text-teal-700"
                          : "",
                      ].join(" ")}
                    />
                  </button>

                  {showQcScheduleSuggestions && (
                    <div
                      className="absolute left-0 top-[calc(100%+6px)] z-[80] w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div className="max-h-[104px] overflow-y-auto overflow-x-hidden [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/70 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:[scrollbar-color:#334155_transparent] dark:[&::-webkit-scrollbar-thumb]:bg-[#334155]">
                        {qcScheduleSuggestions.length > 0 ? (
                          qcScheduleSuggestions.map(({ pattern, label }) => {
                            const isSelected = pattern === qcPattern;

                            return (
                              <button
                                key={pattern}
                                type="button"
                                onClick={() => selectSchedulePattern(pattern)}
                                className={[
                                  "flex h-8 w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[13px] font-semibold transition",
                                  isSelected
                                    ? "bg-teal-50 text-teal-700 dark:bg-[#123730] dark:text-[#9be7dc]"
                                    : "text-slate-800 hover:bg-slate-50 hover:text-primary dark:text-white dark:hover:bg-[#151c2d]",
                                ].join(" ")}
                              >
                                <span className="min-w-0 truncate">
                                  {label}
                                </span>
                                {isSelected && (
                                  <FiCheck className="h-3.5 w-3.5 shrink-0" />
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-2.5 py-2 text-xs text-slate-500 dark:text-slate-400">
                            No match
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Timing */}
              <div className="min-w-0 w-full sm:w-[130px] shrink-0">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Timing
                </label>
                <CompactSelectDropdown
                  ariaLabel="Timing"
                  value={qcTiming}
                  options={TIMING_OPTIONS}
                  onChange={setQcTiming}
                  triggerClassName="h-9 text-[13px] font-medium dark:border-[#273244] dark:bg-[#0f1728] dark:text-white"
                  menuClassName="dark:border-[#273244] dark:bg-[#111726]"
                  optionClassName="text-[13px]"
                  selectedClassName="bg-teal-50 text-teal-700 dark:bg-[#123730] dark:text-[#9be7dc]"
                  unselectedClassName="text-slate-800 hover:bg-slate-50 hover:text-primary dark:text-white dark:hover:bg-[#151c2d]"
                />
              </div>

              {/* Frequency */}
              <div className="min-w-0 w-full sm:w-[125px] shrink-0">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Frequency
                </label>
                <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-[#273244] dark:bg-[#0f1728]">
                  {(["daily", "weekly"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setQcFrequency(f)}
                      className={[
                        "h-full flex-1 rounded-md text-[12px] font-semibold capitalize transition",
                        qcFrequency === f
                          ? "bg-teal-600 text-white"
                          : "text-slate-600 hover:text-teal-700 dark:text-slate-300",
                      ].join(" ")}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="min-w-0 w-full sm:w-[105px] shrink-0">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Duration
                </label>
                <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-white px-1 dark:border-[#273244] dark:bg-[#0f1728]">
                  <button
                    type="button"
                    onClick={() => setQcDays((d) => Math.max(1, d - 1))}
                    className="grid h-7 w-6 place-items-center rounded-md text-slate-500 transition hover:text-teal-700 dark:text-slate-400"
                    aria-label="Decrease"
                  >
                    <FiMinus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={qcDays}
                    onChange={(e) =>
                      setQcDays(
                        Math.max(1, Math.min(365, Number(e.target.value) || 1)),
                      )
                    }
                    className="w-8 border-0 bg-transparent text-center text-[13px] font-bold text-slate-800 focus:outline-none dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQcDays((d) => Math.min(365, d + 1))}
                    className="grid h-7 w-6 place-items-center rounded-md text-slate-500 transition hover:text-teal-700 dark:text-slate-400"
                    aria-label="Increase"
                  >
                    <FiPlus className="h-3.5 w-3.5" />
                  </button>
                  <span className="pr-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    {qcFrequency === "weekly" ? "wks" : "days"}
                  </span>
                </div>
              </div>

              {/* Instruction */}
              <div className="min-w-0 w-full sm:min-w-[240px] sm:flex-[1_1_260px]">
                <label className="mb-1 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Instruction
                </label>
                <input
                  type="text"
                  value={qcInstruction}
                  onChange={(e) => setQcInstruction(e.target.value)}
                  placeholder="Enter Instruction"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:border-[#273244] dark:bg-[#0f1728] dark:text-white dark:focus:border-[#46beae]/60"
                />
              </div>

              <div className="w-full shrink-0 sm:w-auto sm:self-end">
                <button
                  type="button"
                  onClick={() => {
                    addMedicineDirect(m, {
                      pattern: qcPattern,
                      days: qcDays,
                      timing: qcTiming,
                      frequency: qcFrequency,
                      instruction: qcInstruction,
                    });
                    setConfigKey(null);
                  }}
                  className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 text-[12px] font-bold text-white transition hover:bg-teal-800 dark:bg-[#46beae] dark:text-[#04231f] dark:hover:bg-[#3aa898] sm:w-auto sm:min-w-[170px]"
                >
                  <FiPlus className="h-3.5 w-3.5" />
                  Add to prescription
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGlobalDatabaseResults = ({
    showEmptyMessage = false,
  }: { showEmptyMessage?: boolean } = {}) => {
    const shouldShowEmpty =
      showEmptyMessage &&
      !dbLoading &&
      !dbError &&
      visibleDbMeds.length === 0 &&
      debouncedQuery.trim().length >= 2;
    const shouldShowSection =
      visibleDbMeds.length > 0 || dbLoading || dbError || shouldShowEmpty;

    if (!shouldShowSection) return null;

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-[#273244] dark:bg-[#111726]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 dark:bg-[#123730] dark:text-[#9be7dc]">
              <FiGlobe className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold leading-5 text-slate-900 dark:text-white">
                Other Available Medicines
              </div>
              <div className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                More medicines matching your search
              </div>
            </div>
          </div>
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700 dark:bg-[#123730] dark:text-[#9be7dc]">
            {visibleDbMeds.length}
          </span>
        </div>

        {visibleDbMeds.length > 0 && (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {visibleDbMeds.map((item, idx) => {
              const canCreateFromGlobal =
                canEditPrescription &&
                !!createGlobalMedicineDirect &&
                !isCreatingGlobalMedicine;
              const composition = String(item.composition ?? "").trim();

              const handleCreateFromGlobal = async () => {
                if (!canCreateFromGlobal) return;
                await createGlobalMedicineDirect(item);
              };

              return (
                <div
                  key={`db-medicine-${idx}`}
                  className={[
                    "group flex h-full min-h-[98px] flex-col rounded-xl border border-slate-200 bg-white p-3 text-left transition",
                    canEditPrescription
                      ? "hover:border-primary/50 hover:bg-slate-50 hover:shadow-sm dark:hover:bg-[#151c2d]"
                      : "opacity-60",
                    "dark:border-[#273244] dark:bg-[#111726]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-[13px] font-bold leading-5 text-slate-900 dark:text-white">
                        {item.medicine_name}
                      </h4>
                      {item.manufacturer_name && (
                        <p className="truncate text-[11px] font-semibold text-slate-400 dark:text-slate-300">
                          {item.manufacturer_name}
                        </p>
                      )}
                    </div>
                    {canEditPrescription && (
                      <button
                        type="button"
                        disabled={!canCreateFromGlobal}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleCreateFromGlobal();
                        }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/15 group-hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Add ${item.medicine_name}`}
                      >
                        <FiPlus
                          className={[
                            "h-4 w-4",
                            isCreatingGlobalMedicine ? "animate-pulse" : "",
                          ].join(" ")}
                        />
                      </button>
                    )}
                  </div>
                  {composition && (
                    <div
                      className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] leading-4 text-slate-500 dark:bg-[#0b1321] dark:text-slate-400"
                      title={`Composition: ${composition}`}
                    >
                      <span className="font-bold text-slate-600 dark:text-slate-300">
                        Composition:
                      </span>{" "}
                      <span className="overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                        {composition}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {dbLoading && visibleDbMeds.length > 0 && (
          <div className="py-2 text-center text-xs text-slate-400">
            Loading more...
          </div>
        )}

        {dbLoading && visibleDbMeds.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-slate-500">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
            <span>Searching ...</span>
          </div>
        )}

        {shouldShowEmpty && (
          <div className="py-2 text-center text-xs font-semibold text-slate-400">
            Not Found
          </div>
        )}

        {dbError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            Failed to fetch global database records.
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="relative z-30 shrink-0 border-b border-slate-100 px-3 py-2.5 dark:border-[#273244] sm:px-4">
        <div className="flex items-center gap-2">
          <div ref={pickerRef} className="relative min-w-0 flex-1">
            <Tooltip
              content={lockMessage}
              isDisabled={canEditPrescription}
              placement="top"
            >
              <div className={!canEditPrescription ? "cursor-not-allowed" : ""}>
                <Input
                  startContent={
                    <FiSearch className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  }
                  isDisabled={!canEditPrescription}
                  endContent={
                    query ? (
                      <button
                        type="button"
                        aria-label="Clear"
                        onClick={() => setQuery("")}
                        className="rounded-full p-0.5 hover:bg-slate-100 dark:hover:bg-[#273244]"
                      >
                        <FiX className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    ) : null
                  }
                  placeholder="Search medicine (e.g. Telma 40, Dolo 650...)"
                  value={query}
                  onValueChange={(v) => setQuery((v ?? "").toUpperCase())}
                  onFocus={() => {
                    onSearchFocus();
                  }}
                  onKeyDown={onKeyDownSearch}
                  radius="lg"
                  size="sm"
                  classNames={{
                    inputWrapper:
                      "h-10 border border-slate-200 bg-white shadow-none hover:border-slate-300 dark:border-[#273244] dark:bg-[#151c2d] dark:hover:border-[#334155] transition-colors",
                    input:
                      "text-[13px] text-slate-900 placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500",
                  }}
                />
              </div>
            </Tooltip>

            {showPicker && (
              <div
                onScroll={handleScroll}
                className={[
                  "absolute left-0 -right-12 top-full z-50 mt-2 h-fit rounded-2xl bg-white px-3 py-3 shadow-xl shadow-slate-200/70 dark:bg-[#0f1728] dark:shadow-black/30 sm:-right-16",
                  "overflow-y-auto overscroll-contain [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] dark:[scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/70 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:[&::-webkit-scrollbar-thumb]:bg-[#334155]",
                  "max-h-[calc(100vh-140px)] sm:max-h-[420px]",
                  hasVisibleQuickConfig ? "min-h-[250px] sm:min-h-[280px]" : "",
                ].join(" ")}
              >
                {queryReady ? (
                  <div className="space-y-3">
                    {medicinesLoading && (
                      <div className="px-2 py-3 text-sm text-slate-500 dark:text-white">
                        Loading medicines...
                      </div>
                    )}

                    {!medicinesLoading && medicinesError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        Failed to load medicines.
                        <button
                          type="button"
                          className="ml-2 underline"
                          onClick={() => refetchMedicines()}
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {!medicinesLoading &&
                      !medicinesError &&
                      filteredMedicines.length > 0 && (
                        <>
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-[#273244] dark:bg-[#111726]">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 dark:bg-[#123730] dark:text-[#9be7dc]">
                                  <FiSearch className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold leading-5 text-slate-900 dark:text-white">
                                    Clinic Medicines
                                  </div>
                                  <div className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    Medicines already saved in your clinic
                                  </div>
                                </div>
                              </div>
                              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700 dark:bg-[#123730] dark:text-[#9be7dc]">
                                {filteredMedicines.length}
                              </span>
                            </div>

                            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                                {orderedFilteredMedicines.map((m: any) => {
                                const rawName = extractAnyName(m);

                                return renderMedicineRow(m, {
                                  highlightedNameHtml: highlightHtml(
                                    rawName,
                                    query,
                                  ),
                                  rowKeyPrefix: "search",
                                });
                              })}
                            </div>
                          </div>

                          {renderGlobalDatabaseResults()}
                        </>
                      )}

                    {!medicinesLoading &&
                      !medicinesError &&
                      filteredMedicines.length === 0 && (
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-[#273244] dark:bg-[#111726]">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-[#1e293b] dark:text-slate-300">
                                  <FiSearch className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold leading-5 text-slate-900 dark:text-white">
                                    Saved matches
                                  </div>
                                  <div className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    No saved medicine matched
                                  </div>
                                </div>
                              </div>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-[#1e293b] dark:text-slate-300">
                                0
                              </span>
                            </div>

                            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-xs text-slate-600 dark:border-[#273244] dark:bg-[#0b1321]/50 dark:text-white sm:flex-row sm:items-center sm:justify-between">
                              <span className="min-w-0">
                                No medicine found for{" "}
                                <b className="text-slate-800 dark:text-white">
                                  {debouncedQuery.trim()}
                                </b>
                              </span>
                              <Tooltip
                                content={lockMessage}
                                isDisabled={canEditPrescription}
                                placement="top"
                              >
                                <span className="inline-flex shrink-0">
                                  <Button
                                    size="sm"
                                    radius="sm"
                                    color="primary"
                                    className="rounded-lg"
                                    startContent={
                                      <FiPlus className="h-3.5 w-3.5" />
                                    }
                                    onPress={() => {
                                      if (!canEditPrescription) return;
                                      openAddNew(debouncedQuery.trim());
                                    }}
                                    isDisabled={!canEditPrescription}
                                  >
                                    Add new medicine
                                  </Button>
                                </span>
                              </Tooltip>
                            </div>
                          </div>

                          {renderGlobalDatabaseResults({
                            showEmptyMessage: true,
                          })}
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-bold tracking-wide text-slate-500 dark:text-white">
                        Favorite / Recent medicines
                      </div>
                    </div>

                    {topUsedLoading && (
                      <div className="px-2 py-3 text-sm text-slate-500 dark:text-white">
                        Loading medicines...
                      </div>
                    )}

                    {!topUsedLoading && topUsedIsError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        Failed to load medicines.
                        <button
                          type="button"
                          className="ml-2 underline"
                          onClick={() => refetchTopUsed()}
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {showQuickMedicines &&
                      !topUsedLoading &&
                      !topUsedIsError &&
                      quickMedicines.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {orderedQuickMedicines.map((m) =>
                            renderMedicineRow(m, { rowKeyPrefix: "quick" }),
                          )}
                        </div>
                      )}

                    {showQuickMedicines &&
                      !topUsedLoading &&
                      !topUsedIsError &&
                      quickMedicines.length === 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-500 dark:border-[#273244] dark:bg-[#111726] dark:text-white">
                          No favorite or recent medicines found.
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Tooltip
            content={
              rxHistory.length > 0 ? "Prescription history" : "No history yet"
            }
            placement="top"
          >
            <span className="inline-flex">
              <Button
                isIconOnly
                radius="sm"
                variant="flat"
                size="sm"
                className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-white shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#151c2d] disabled:opacity-40 disabled:cursor-not-allowed"
                onPress={() => setIsPrescriptionHistoryOpen(true)}
                isDisabled={rxHistory.length === 0}
              >
                <FiClock className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>

      <Modal
        isOpen={isPrescriptionHistoryOpen}
        onOpenChange={setIsPrescriptionHistoryOpen}
        size="5xl"
        scrollBehavior="inside"
        classNames={{
          base: "rounded-2xl border border-transparent bg-white text-slate-900 dark:border-[#273244] dark:bg-[#111726] dark:text-white",
          body: "p-0 bg-white dark:bg-[#111726]",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-slate-200 px-5 py-4 dark:border-[#273244]">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Prescription History
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-white">
                    View all previous prescriptions
                  </p>
                </div>
              </ModalHeader>

              <ModalBody className="bg-white px-5 py-4 dark:bg-[#111726]">
                <PrescriptionsHistory
                  items={rxHistory}
                  loading={isRxHistoryLoading}
                  patient={patient}
                  doctor={doctor}
                  clinic={clinic}
                />
              </ModalBody>

              <ModalFooter className="border-t border-slate-200 px-5 py-3 dark:border-[#273244]">
                <Button
                  radius="sm"
                  variant="bordered"
                  size="sm"
                  className="h-9 rounded-lg border-slate-200 text-[13px] font-semibold text-slate-700 dark:border-[#38445a] dark:text-white"
                  onPress={onClose}
                >
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default PrescriptionMedicineSidebar;
