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
          className="text-text-subtle flex-shrink-0 pointer-events-none"
          size={18}
          aria-hidden="true"
        />
      }
      classNames={{
        input:
          "text-[14px] text-text placeholder:text-[14px] placeholder:text-text-subtle",
        // `!rounded-lg` forces HeroUI's own `radius="lg"` token (visibly
        // rounder than plain Tailwind `rounded-lg`, closer to a pill at this
        // height) down to the same 8px corner radius every sibling
        // button/dropdown in a toolbar row uses — otherwise the search field
        // reads as a different shape than everything next to it.
        inputWrapper:
          "h-10 !rounded-lg border border-line bg-surface px-3 shadow-sm " +
          "data-[hover=true]:border-primary/40 data-[focus=true]:border-primary " +
          "data-[focus=true]:shadow-md transition-all",
        clearButton:
          "text-text-subtle hover:text-text-muted transition-colors",
        ...(classNames || {}),
      }}
    />
  );
};

export default SearchField;
