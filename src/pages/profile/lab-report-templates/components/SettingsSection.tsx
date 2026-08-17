import { FiChevronDown } from "react-icons/fi";
import type { SettingsSectionProps } from "../../../../types/lab-report";

/**
 * Collapsible settings row. The header carries a live summary of what is
 * currently chosen, so a collapsed panel still answers "what is this set to?"
 * without being expanded.
 */
const SettingsSection: React.FC<SettingsSectionProps> = ({
  id,
  title,
  icon,
  summary,
  isOpen,
  onToggle,
  children,
}) => {
  const panelId = `lab-report-designer-section-${id}`;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold text-text">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-text-muted">
            {summary}
          </span>
        </span>
        <FiChevronDown
          size={16}
          className={`shrink-0 text-text-subtle transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div id={panelId} className="border-t border-line px-3 pb-3 pt-3">
          {children}
        </div>
      )}
    </div>
  );
};

export default SettingsSection;
