import { useEffect, useState } from "react";

/**
 * Custom hook for debouncing values
 * Delays updating the value until after the specified delay has passed since the last change
 * Useful for search inputs, form validation, API calls, etc.
 * 
 * @template T The type of value being debounced
 * @param value The value to debounce
 * @param delay Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 * 
 * @example
 * // For search functionality
 * const [searchInput, setSearchInput] = useState("");
 * const debouncedSearch = useDebounce(searchInput, 300);
 * 
 * // Use debouncedSearch for API calls
 * const { data } = useGetDataQuery(debouncedSearch);
 */
const useDebounce = <T,>(value: T, delay: number = 500): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;