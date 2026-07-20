import { Input, InputProps } from "@heroui/react";
import { FiSearch } from "react-icons/fi";

type SearchFieldProps = InputProps & {
  onClear?: () => void;
};

/**
 * SearchField Component
 * 
 * A reusable search input component with built-in search icon and clear functionality.
 * Uses react-icons for consistent icon rendering across the app.
 * 
 * Features:
 * - Search icon at the start
 * - Clear button appears when input has value
 * - Calls onChange with empty value when cleared
 * - Optional onClear callback for additional handling
 * 
 * @example
 * <SearchField 
 *   placeholder="Search..." 
 *   value={search}
 *   onChange={(e) => setSearch(e.target.value)}
 *   onClear={() => setPage(1)} // Optional: reset pagination on clear
 * />
 */
const SearchField = ({ classNames, onClear, onChange, ...props }: SearchFieldProps) => {
  const handleClear = () => {
    // Create a synthetic event to match onChange signature
    const event = {
      target: { value: "" }
    } as React.ChangeEvent<HTMLInputElement>;
    
    // Call the original onChange
    onChange?.(event);
    
    // Call custom onClear callback if provided
    onClear?.();
  };

  return (
    <Input
      {...props}
      variant="bordered"
      radius="lg"
      size="md"
      isClearable
      onClear={handleClear}
      onChange={onChange}
      startContent={
        <FiSearch 
          className="text-slate-400 flex-shrink-0 pointer-events-none"
          size={18}
          aria-hidden="true"
        />
      }
      classNames={{
        input:
          "text-[14px] text-slate-700 placeholder:text-[14px] placeholder:text-slate-400",
        inputWrapper:
          "h-10 border border-slate-200 bg-white px-3 shadow-sm " +
          "data-[hover=true]:border-slate-300 data-[focus=true]:border-primary " +
          "data-[focus=true]:shadow-md transition-all",
        clearButton:
          "text-slate-400 hover:text-slate-600 transition-colors",
        ...(classNames || {}),
      }}
    />
  );
};

export default SearchField;
