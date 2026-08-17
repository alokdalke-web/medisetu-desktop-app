import { FiCheck } from "react-icons/fi";
import TemplateThumbnail from "./TemplateThumbnail";
import type { TemplatePickerProps } from "../../../../types/prescription";

const TemplatePicker: React.FC<TemplatePickerProps> = ({
  options,
  selectedTemplate,
  colors,
  fontFamily,
  onSelect,
}) => (
  <div
    role="radiogroup"
    aria-label="Prescription layout"
    className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2"
  >
    {options.map((template) => {
      const isActive = selectedTemplate === template.value;

      return (
        <button
          key={template.value}
          type="button"
          role="radio"
          aria-checked={isActive}
          onClick={() => onSelect(template.value)}
          className={`group relative rounded-xl border p-1.5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            isActive
              ? "border-primary ring-1 ring-primary"
              : "border-line hover:border-primary/40"
          }`}
        >
          {/* Capped so a full-width mobile rail doesn't blow the A4 tiles up
              to half a screen each. */}
          <div className="mx-auto aspect-[210/297] w-full max-w-[124px] overflow-hidden rounded-md border border-line bg-surface">
            <TemplateThumbnail
              templateValue={template.value}
              colors={colors}
              fontFamily={fontFamily}
            />
          </div>

          <p className="mt-1.5 truncate text-[11px] font-semibold text-text">
            {template.label}
          </p>
          <p className="truncate text-[10px] text-text-subtle">
            {template.description}
          </p>

          {isActive && (
            <span className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-primary text-white">
              <FiCheck size={10} />
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default TemplatePicker;
