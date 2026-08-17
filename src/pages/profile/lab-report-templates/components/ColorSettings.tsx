import { FiCheck, FiChevronDown, FiRotateCcw } from "react-icons/fi";
import Tooltip from "../../../../components/shared/Tooltip";
import { areColorsEqual, colorRoleGroups } from "../helpers/designerOptions";
import type {
  ColorSettingsProps,
  TemplateColorKey,
} from "../../../../types/lab-report";

/**
 * The swatch is the colour input itself — clicking it opens the native picker.
 * Styling `input[type=color]` as a plain circle needs the vendor swatch
 * pseudo-elements flattened, otherwise browsers draw their own bevelled chrome.
 */
const SWATCH_INPUT =
  "h-10 w-10 shrink-0 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 lg:h-7 lg:w-7 " +
  "[&::-webkit-color-swatch-wrapper]:p-0 " +
  "[&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-black/15 " +
  "[&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border [&::-moz-color-swatch]:border-black/15";

const ColorSettings: React.FC<ColorSettingsProps> = ({
  colors,
  presets,
  isAdvancedOpen,
  onToggleAdvanced,
  onSelectPreset,
  onColorChange,
  onResetColors,
}) => (
  <div className="space-y-3">
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="grid grid-cols-3 gap-1.5"
    >
      {presets.map((preset) => {
        const isActive = areColorsEqual(colors, preset.colors);

        return (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onSelectPreset(preset)}
            className={`relative rounded-lg border px-2 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isActive
                ? "border-primary bg-primary/5"
                : "border-line hover:border-primary/40"
            }`}
          >
            <span aria-hidden="true" className="mb-1 flex justify-center gap-1">
              <span
                className="h-4 w-4 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: preset.colors.color1 }}
              />
              <span
                className="h-4 w-4 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: preset.colors.color10 }}
              />
              <span
                className="h-4 w-4 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: preset.colors.color2 }}
              />
            </span>
            <span className="block truncate text-center text-[10px] font-medium text-text">
              {preset.label}
            </span>
            {isActive && (
              <FiCheck
                size={10}
                className="absolute right-1 top-1 text-primary"
              />
            )}
          </button>
        );
      })}
    </div>

    <div className="rounded-lg border border-line">
      <button
        type="button"
        onClick={onToggleAdvanced}
        aria-expanded={isAdvancedOpen}
        aria-controls="lab-report-advanced-colors"
        className="flex w-full items-center justify-between px-2.5 py-2 text-left transition-colors hover:bg-surface-muted"
      >
        <span className="text-[11px] font-medium text-text-muted">
          Fine-tune individual colours
        </span>
        <FiChevronDown
          size={14}
          className={`text-text-subtle transition-transform ${
            isAdvancedOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isAdvancedOpen && (
        <div
          id="lab-report-advanced-colors"
          className="border-t border-line px-2.5 pb-2.5 pt-2"
        >
          {colorRoleGroups.map((group) => (
            <div key={group.title} className="mb-2.5 last:mb-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                {group.title}
              </p>
              <p className="mb-1 text-[10px] leading-snug text-text-subtle">
                {group.caption}
              </p>

              <div className="space-y-0.5">
                {group.roles.map(({ key, label, hint }) => {
                  const role = key as TemplateColorKey;

                  return (
                    <div
                      key={role}
                      className="flex items-center gap-2 rounded-md py-0.5"
                    >
                      <Tooltip content={hint} placement="right" delay={400}>
                        <input
                          type="color"
                          aria-label={`${label} — ${hint}`}
                          value={colors[role]}
                          onChange={(event) =>
                            onColorChange(role, event.target.value)
                          }
                          className={SWATCH_INPUT}
                        />
                      </Tooltip>

                      <label
                        className="min-w-0 flex-1 cursor-default truncate text-[11px] font-medium text-text"
                        title={hint}
                      >
                        {label}
                      </label>

                      <input
                        type="text"
                        aria-label={`${label} colour hex value`}
                        value={colors[role]}
                        onChange={(event) =>
                          onColorChange(role, event.target.value)
                        }
                        spellCheck={false}
                        className="w-[72px] shrink-0 rounded border border-line bg-surface-muted px-1.5 py-1 text-center font-mono text-[10px] uppercase text-text-muted focus:border-primary focus:text-text focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onResetColors}
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-line py-1.5 text-[11px] text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
          >
            <FiRotateCcw size={11} />
            Reset colours to default
          </button>
        </div>
      )}
    </div>
  </div>
);

export default ColorSettings;
