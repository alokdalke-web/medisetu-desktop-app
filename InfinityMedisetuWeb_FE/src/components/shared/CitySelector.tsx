import { Autocomplete, AutocompleteItem, AutocompleteSection } from "@heroui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useController, type Control, type FieldValues } from "react-hook-form";
import { useDebounce } from "use-debounce";
import { useGetCitiesBySearchQuery } from "../../redux/api/cityApi";
import InputLabel from "./InputLabel";

interface CitySelectorProps {
  control: Control<FieldValues>;
  onCityStateChange: (city: string, state: string, shouldValidate?: boolean) => void;
  label?: string;
  size?: "sm" | "md" | "lg";
  isRequired?: boolean;
  error?: string;
}

type CityItem = {
  id: string;
  city: string;
  state: string;
  district?: string;
  usage: number;
};

const RECENT_CITIES_KEY = "medisetu_recent_cities_v1";

const loadRecentCities = (): CityItem[] => {
  if (typeof window === "undefined") return [];
  try {
    let usageMap: Record<string, number> = {};
    try {
      const rawUsage = window.localStorage.getItem("cityUsage");
      if (rawUsage) {
        const parsedUsage = JSON.parse(rawUsage);
        if (parsedUsage && typeof parsedUsage === "object") {
          usageMap = parsedUsage as Record<string, number>;
        }
      }
    } catch {
      usageMap = {};
    }

    const raw = window.localStorage.getItem(RECENT_CITIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items = parsed
      .map((x, idx) => {
        const city = String(x?.city ?? "").trim();
        const state = String(x?.state ?? "").trim();
        const district = String(x?.district ?? "").trim();
        if (!city || !state) return null;
        const fromMap = Number(usageMap[city]);
        const usageRaw = Number(x?.usage);
        const usage =
          Number.isFinite(fromMap) && fromMap > 0
            ? fromMap
            : Number.isFinite(usageRaw) && usageRaw > 0
              ? usageRaw
              : 1;
        return {
          id:
            typeof x?.id === "string" && x.id
              ? x.id
              : `recent-${idx}-${city}-${district}-${state}`,
          city,
          state,
          district,
          usage,
        } as CityItem;
      })
      .filter(Boolean) as CityItem[];

    return items.sort((a, b) => b.usage - a.usage).slice(0, 5);
  } catch {
    return [];
  }
};

const saveRecentCities = (items: CityItem[]) => {
  if (typeof window === "undefined") return;
  const payload = items.map((x) => ({
    city: x.city,
    state: x.state,
    district: x.district || "",
    usage: x.usage,
  }));
  window.localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(payload));
};

export default function CitySelector({
  control,
  onCityStateChange,
  label = "City & State ",
  size = "lg",
  isRequired = false,
  error,
}: CitySelectorProps) {
  const { field, fieldState } = useController({
    name: "city",
    control,
    rules: isRequired ? { required: "City is required" } : undefined,
  });

  const isInvalid = Boolean(fieldState.error || error);
  const errorMessage = error ?? fieldState.error?.message;

  const [search, setSearch] = useState("");
  const [recentCities, setRecentCities] = useState<CityItem[]>(() =>
    loadRecentCities(),
  );
  const [debouncedSearch] = useDebounce(search, 500);

  // Forcefully override browser autocomplete on the actual DOM input
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const input = el.querySelector("input");
    if (input) {
      input.setAttribute("autocomplete", "one-time-code");
      input.setAttribute("data-lpignore", "true");
      input.setAttribute("data-form-type", "other");
    }
  });

  // Track when a selection just happened to avoid onInputChange race condition
  const justSelectedRef = useRef(false);
  const justSelectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Explicit clear handler for the × button
  const handleClear = useCallback(() => {
    justSelectedRef.current = false;
    if (justSelectedTimerRef.current) {
      clearTimeout(justSelectedTimerRef.current);
      justSelectedTimerRef.current = null;
    }
    field.onChange("");
    onCityStateChange("", "", false);
    setSearch("");
    lastSelectedStateRef.current = "";
  }, [field, onCityStateChange]);

  // ✅ only alphabets + space (no numbers/symbols)
  const cleanCityInput = (s: string) =>
    (s || "")
      .replace(/[^A-Za-z ]/g, "")
      .replace(/\s+/g, " ")
      .trimStart(); // keep typing smooth (doesn't kill end spaces instantly)

  const trimmedSearch = debouncedSearch.trim();

  const { data: cities = [], isFetching } = useGetCitiesBySearchQuery(
    trimmedSearch,
    { skip: trimmedSearch.length === 0 },
  );

  const apiCities: CityItem[] = useMemo(
    () =>
      (Array.isArray(cities) ? cities : [])

        .map((c: any, idx: number) => {
          const city = String(c?.city ?? "").trim();
          const state = String(c?.state ?? "").trim();
          const district = String(c?.district ?? "").trim();
          if (!city || !state) return null;
          return {
            id:
              typeof c?.id === "string" && c.id
                ? c.id
                : `api-${idx}-${city}-${district}-${state}`,
            city,
            state,
            district,
          } as CityItem;
        })
        .filter(Boolean) as CityItem[],
    [cities],
  );

  // Store the last selected state so we can restore it if HeroUI clears it
  const lastSelectedStateRef = useRef<string>("");

  const handleSelection = useCallback(
    (item: CityItem) => {
      justSelectedRef.current = true;
      // Keep the flag active for a short window to handle async HeroUI events
      if (justSelectedTimerRef.current) clearTimeout(justSelectedTimerRef.current);
      justSelectedTimerRef.current = setTimeout(() => {
        justSelectedRef.current = false;
      }, 500);

      field.onChange(item.city);
      onCityStateChange(item.city, item.state);
      lastSelectedStateRef.current = item.state;
      setSearch("");

      setRecentCities((prev) => {
        const key = `${item.city}|${item.district}|${item.state}`;
        const existing = prev.find(
          (x) => `${x.city}|${x.district}|${x.state}` === key,
        );
        const rest = existing ? prev.filter((x) => x !== existing) : prev;

        const updated: CityItem = existing
          ? {
            ...existing,
            usage: existing.usage + 1,
          }
          : {
            id: item.id,
            city: item.city,
            state: item.state,
            district: item.district || "",
            usage: 1,
          };

        const sorted = [updated, ...rest]
          .sort((a, b) => b.usage - a.usage)
          .slice(0, 5);
        saveRecentCities(sorted);
        return sorted;
      });
    },
    [field, onCityStateChange],
  );


  const allItems: CityItem[] = useMemo(() => {
    const seen = new Set<string>();
    const out: CityItem[] = [];

    recentCities.forEach((item) => {
      const key = `${item.city}|${item.district}|${item.state}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });

    apiCities.forEach((item) => {
      const key = `${item.city}|${item.district}|${item.state}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });

    return out;
  }, [recentCities, apiCities]);

  const sections = useMemo(() => {
    const s = [];

    // Build a set of keys from API results for deduplication
    const apiKeys = new Set(
      apiCities.map((item) => `${item.city}|${item.district}|${item.state}`),
    );

    // Filter recent cities to exclude items already in search results
    const filteredRecent = recentCities.filter(
      (item) => !apiKeys.has(`${item.city}|${item.district}|${item.state}`),
    );

    // When there's an active search with results, limit recent cities shown
    // so they don't push search results out of view
    const recentToShow =
      apiCities.length > 0 ? filteredRecent.slice(0, 2) : filteredRecent;

    if (recentToShow.length > 0) {
      s.push({ title: "Recent Cities", items: recentToShow });
    }
    if (apiCities.length > 0) {
      s.push({ title: "Search Results", items: apiCities });
    }
    return s;
  }, [recentCities, apiCities]);

  // ✅ Auto-select: when search results come back with an exact match for what
  // the user typed, automatically select it so state gets filled immediately.
  // This handles the case where user types a full city name and it exists in the dropdown.
  useEffect(() => {
    if (justSelectedRef.current) return; // don't interfere with manual selections
    if (!trimmedSearch || apiCities.length === 0) return;
    if (field.value === trimmedSearch) return; // already selected

    const exactMatch = apiCities.find(
      (c) => c.city.toLowerCase() === trimmedSearch.toLowerCase()
    );
    if (exactMatch) {
      handleSelection(exactMatch);
    }
  }, [apiCities, trimmedSearch, field.value, handleSelection]);

  return (
    <div
      ref={wrapperRef}
      onBlur={() => {
        // When focus leaves the city selector, if a city was selected but state
        // was lost due to HeroUI race conditions, restore it
        setTimeout(() => {
          if (field.value && lastSelectedStateRef.current) {
            onCityStateChange(field.value as string, lastSelectedStateRef.current);
          }
        }, 50);
      }}
    >
      <Autocomplete
        name={`notafield_${Math.random().toString(36).substring(7)}`}
        items={sections}
        label={<InputLabel label={label} isRequired={isRequired} />}
        isInvalid={isInvalid}
        errorMessage={errorMessage}
        placeholder="Type city name..."
        labelPlacement="outside-top"
        radius="lg"
        size={size}
        variant="bordered"
        isLoading={isFetching}
        isClearable
        autoComplete="one-time-code"
        inputProps={{
          autoComplete: "one-time-code",
          "aria-autocomplete": "list",
          classNames: {
            input:
              "!text-slate-900 placeholder:text-slate-400 dark:!text-slate-100 dark:placeholder:!text-slate-500 truncate",
            inputWrapper:
              "border-border-color bg-white data-[hover=true]:border-primary/60 data-[focus=true]:border-primary dark:!border-[#38445a] dark:!bg-[#0f1728] dark:data-[hover=true]:!border-[#46beae]/60 dark:data-[focus=true]:!border-[#46beae] overflow-hidden !h-[38px] !min-h-[38px]",
          },
        }}
        inputValue={search || (field.value && lastSelectedStateRef.current ? `${field.value}, ${lastSelectedStateRef.current}` : (field.value as string) || "")}
        selectedKey={allItems.find((c) => c.city === field.value)?.id}
        menuTrigger="focus"
        allowsEmptyCollection
        onClear={handleClear}
        classNames={{
          popoverContent:
            "border border-slate-200 bg-white text-slate-900 dark:border-[#273244] dark:bg-[#111726] dark:text-slate-100",
        }}
        onSelectionChange={(key) => {
          if (!key) {
            // Don't clear if a selection just happened (HeroUI may fire null key
            // during internal state reconciliation)
            if (justSelectedRef.current) return;
            // If search is already empty, the × button was clicked — allow clear
            if (!search.trim() || !field.value) {
              field.onChange("");
              onCityStateChange("", "", false);
              setSearch("");
              lastSelectedStateRef.current = "";
            }
            return;
          }

          const id = key.toString();
          const found = allItems.find((c) => c.id === id);

          if (found) {
            handleSelection(found);
          } else {
            field.onChange("");
            onCityStateChange("", "", false);
            setSearch("");
          }
        }}
        onInputChange={(value) => {
          const raw = typeof value === "string" ? value : "";
          const inputValue = cleanCityInput(raw);

          // If the input is being cleared (× button or manual delete-all),
          // always allow it regardless of justSelectedRef
          if (!inputValue.trim()) {
            justSelectedRef.current = false;
            if (justSelectedTimerRef.current) {
              clearTimeout(justSelectedTimerRef.current);
              justSelectedTimerRef.current = null;
            }
            setSearch("");
            if (field.value) field.onChange("");
            onCityStateChange("", "", false);
            lastSelectedStateRef.current = "";
            return;
          }

          // Skip if a selection just happened — HeroUI fires onInputChange
          // with the textValue ("City, State") after selection, which would
          // incorrectly clear the state.
          if (justSelectedRef.current) {
            return;
          }

          setSearch(inputValue);

          // if user typed something different than selected -> don't clear state yet,
          // just update the search. State will only be set when a selection is made.
          if (field.value && inputValue.toLowerCase() !== (field.value as string).toLowerCase()) {
            // User is typing something new, clear the previous city selection
            // but DON'T clear state via onCityStateChange — wait until new selection
            field.onChange("");
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // If there's a search result and it's not already selected, pick the first one
            if (apiCities.length > 0 && field.value !== apiCities[0].city) {
              handleSelection(apiCities[0]);
            }
          }
        }}
      >
        {(section) => (
          <AutocompleteSection
            key={section.title}
            title={section.title}
            items={section.items}
          >
            {(item: CityItem) => (
              <AutocompleteItem
                key={item.id}
                textValue={item.city}
              >
                {item.city}, {item.state}
              </AutocompleteItem>
            )}
          </AutocompleteSection>
        )}
      </Autocomplete>
    </div>
  );
}
