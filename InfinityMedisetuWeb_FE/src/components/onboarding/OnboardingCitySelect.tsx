import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Controller, Control } from "react-hook-form";
import { useDebounce } from "use-debounce";
import { useGetCitiesBySearchQuery } from "../../redux/api/cityApi";

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

interface OnboardingCitySelectProps {
  control: Control<any>;
  onCityStateChange: (city: string, state: string, shouldValidate?: boolean) => void;
  className?: string;
}

export const OnboardingCitySelect: React.FC<OnboardingCitySelectProps> = ({
  control,
  onCityStateChange,
  className = "",
}) => {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [recentCities, setRecentCities] = useState<CityItem[]>(() => loadRecentCities());
  const [debouncedSearch] = useDebounce(search, 500);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSelectedStateRef = useRef<string>("");
  const justSelectedRef = useRef(false);

  // Clean city input to allow only alphabets and spaces
  const cleanCityInput = useCallback((s: string) =>
    (s || "")
      .replace(/[^A-Za-z ]/g, "")
      .replace(/\s+/g, " ")
      .trimStart()
  , []);

  const trimmedSearch = debouncedSearch.trim();

  const updateDropdownPlacement = useCallback(() => {
    const input = inputRef.current;
    if (!input || typeof window === "undefined") return;

    const rect = input.getBoundingClientRect();
    const preferredHeight = 260;
    const bottomSpace = window.innerHeight - rect.bottom;
    const topSpace = rect.top;

    setOpenUp(bottomSpace < preferredHeight && topSpace > bottomSpace);
  }, []);

  // Fetch cities from API
  const { data: cities = [], isFetching } = useGetCitiesBySearchQuery(
    trimmedSearch,
    { skip: trimmedSearch.length === 0 }
  );

  // Convert API response to CityItem[]
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
            usage: 0,
          } as CityItem;
        })
        .filter(Boolean) as CityItem[],
    [cities]
  );

  // Organize cities into sections
  const sections = useMemo(() => {
    const s: Array<{ title: string; items: CityItem[] }> = [];
    
    const apiKeys = new Set(
      apiCities.map((item) => `${item.city}|${item.district}|${item.state}`)
    );
    
    const filteredRecent = recentCities.filter(
      (item) => !apiKeys.has(`${item.city}|${item.district}|${item.state}`)
    );
    
    const recentToShow = apiCities.length > 0 ? filteredRecent.slice(0, 2) : filteredRecent;
    
    if (recentToShow.length > 0) {
      s.push({ title: "Recent Cities", items: recentToShow });
    }
    if (apiCities.length > 0) {
      s.push({ title: "Search Results", items: apiCities });
    }
    return s;
  }, [recentCities, apiCities]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showDropdown) return;

    updateDropdownPlacement();

    const handlePlacementUpdate = () => {
      updateDropdownPlacement();
    };

    window.addEventListener("resize", handlePlacementUpdate);
    window.addEventListener("scroll", handlePlacementUpdate, true);

    return () => {
      window.removeEventListener("resize", handlePlacementUpdate);
      window.removeEventListener("scroll", handlePlacementUpdate, true);
    };
  }, [showDropdown, updateDropdownPlacement]);

  // Handle city selection
  const handleSelection = useCallback(
    (item: CityItem, onChange: (value: string) => void) => {
      justSelectedRef.current = true;
      setTimeout(() => {
        justSelectedRef.current = false;
      }, 500);

      const displayValue = `${item.city}, ${item.state}`;
      onChange(displayValue);
      onCityStateChange(item.city, item.state, true);
      lastSelectedStateRef.current = item.state;
      setSearch("");
      setShowDropdown(false);

      // Update recent cities
      setRecentCities((prev) => {
        const key = `${item.city}|${item.district}|${item.state}`;
        const existing = prev.find(
          (x) => `${x.city}|${x.district}|${x.state}` === key
        );
        const rest = existing ? prev.filter((x) => x !== existing) : prev;

        const updated: CityItem = existing
          ? { ...existing, usage: existing.usage + 1 }
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
    [onCityStateChange]
  );

  return (
    <Controller
      name="city"
      control={control}
      rules={{ required: "City & State is required" }}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const displayValue = (value as string) || "";

        return (
          <div className={`flex flex-col gap-1 sm:gap-1.5  ${className}`} ref={dropdownRef}>
            {/* Label */}
            <label className="flex items-center gap-1 text-[13px] font-semibold text-slate-700 dark:text-white sm:text-[14px]">
              City & State
              <span className="text-red-500">*</span>
            </label>

            {/* Input Container */}
            <div className="relative">
              {/* Icon */}
              <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="sm:w-[18px] sm:h-[18px]">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>

              {/* Input Field */}
              <input
                ref={inputRef}
                type="text"
                autoComplete="one-time-code"
                placeholder="Type city name..."
                value={showDropdown ? search : displayValue}
                onChange={(e) => {
                  const inputValue = cleanCityInput(e.target.value);
                  
                  if (!inputValue.trim()) {
                    setSearch("");
                    onChange("");
                    onCityStateChange("", "", false);
                    lastSelectedStateRef.current = "";
                    setShowDropdown(true);
                    return;
                  }

                  if (justSelectedRef.current) return;

                  setSearch(inputValue);
                  setShowDropdown(true);

                  if (displayValue && inputValue.toLowerCase() !== displayValue.toLowerCase()) {
                    onChange("");
                  }
                }}
                onFocus={() => {
                  setShowDropdown(true);
                  requestAnimationFrame(updateDropdownPlacement);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && displayValue && !showDropdown) {
                    onChange("");
                    onCityStateChange("", "", false);
                    lastSelectedStateRef.current = "";
                    setSearch("");
                    setShowDropdown(true);
                  } else if (e.key === "Enter" && apiCities.length > 0) {
                    handleSelection(apiCities[0], onChange);
                  }
                }}
                className={[
                  "w-full h-11 rounded-lg border transition-all duration-200",
                  "pl-10 sm:pl-12 pr-10 sm:pr-12",
                  "text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400",
                  "bg-white dark:bg-slate-800",
                  error
                    ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : "border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20",
                  "outline-none",
                ].join(" ")}
              />

              {/* Clear Button */}
              {displayValue && !showDropdown && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    onCityStateChange("", "", false);
                    lastSelectedStateRef.current = "";
                    setSearch("");
                    setShowDropdown(true);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-8 sm:right-9 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}

              {/* Loading Indicator */}
              {isFetching && (
                <div className="absolute right-8 sm:right-9 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                </div>
              )}

              {/* Dropdown Arrow */}
              {!isFetching && (
                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="sm:w-4 sm:h-4">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}

              {/* Dropdown Menu */}
              {showDropdown && sections.length > 0 && (
                <div
                  className={[
                    "absolute left-0 right-0 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 sm:max-h-60",
                    "z-[80]",
                    openUp ? "bottom-full mb-2" : "top-full mt-2",
                  ].join(" ")}
                >
                  {sections.map((section) => (
                    <div key={section.title}>
                      {/* Section Title */}
                      <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide bg-slate-50 dark:bg-slate-900">
                        {section.title}
                      </div>
                      {/* Section Items */}
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelection(item, onChange)}
                          className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex flex-col gap-0.5"
                        >
                          <span className="text-[13px] sm:text-[14px] font-medium text-slate-900 dark:text-white">
                            {item.city}
                          </span>
                          <span className="text-[11px] sm:text-[12px] text-slate-500 dark:text-slate-400">
                            {item.state}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* No Results */}
              {showDropdown && trimmedSearch && !isFetching && apiCities.length === 0 && (
                <div
                  className={[
                    "absolute left-0 right-0 rounded-lg border border-slate-200 bg-white px-4 py-6 text-center shadow-lg dark:border-slate-700 dark:bg-slate-800",
                    "z-[80]",
                    openUp ? "bottom-full mb-2" : "top-full mt-2",
                  ].join(" ")}
                >
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">
                    No cities found matching "{trimmedSearch}"
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Try a different search term
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <span className="text-[11px] sm:text-[12px] text-red-500 ml-1">{error.message}</span>
            )}
          </div>
        );
      }}
    />
  );
};
