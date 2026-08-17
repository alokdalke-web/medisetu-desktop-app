import { FiCheck } from "react-icons/fi";
import type { FontPickerProps } from "../../../../types/lab-report";

const FontPicker: React.FC<FontPickerProps> = ({
  options,
  selectedFont,
  onSelect,
}) => (
  <div
    role="radiogroup"
    aria-label="Lab report font"
    className="grid grid-cols-2 gap-1.5"
  >
    {options.map((font) => {
      const isActive = selectedFont === font.value;

      return (
        <button
          key={font.value}
          type="button"
          role="radio"
          aria-checked={isActive}
          onClick={() => onSelect(font.value)}
          className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            isActive
              ? "border-primary bg-primary/5"
              : "border-line hover:border-primary/40"
          }`}
        >
          <span
            aria-hidden="true"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface-muted text-[14px] leading-none text-text"
            style={{ fontFamily: font.value }}
          >
            Aa
          </span>
          <span
            className="min-w-0 flex-1 truncate text-[11px] text-text"
            style={{ fontFamily: font.value }}
          >
            {font.preview}
          </span>
          {isActive && <FiCheck size={12} className="shrink-0 text-primary" />}
        </button>
      );
    })}
  </div>
);

export default FontPicker;
