import { useEffect, useState } from "react";
import { FiDroplet, FiLayout, FiType } from "react-icons/fi";
import ColorSettings from "./components/ColorSettings";
import DesignerToolbar from "./components/DesignerToolbar";
import FontPicker from "./components/FontPicker";
import LivePreviewPanel from "./components/LivePreviewPanel";
import SettingsSection from "./components/SettingsSection";
import TemplatePicker from "./components/TemplatePicker";
import { areColorsEqual, loadDesignerFonts } from "./helpers/designerOptions";
import type {
  DesignerSectionId,
  TemplateDesignerPanelProps,
} from "../../../types/prescription";

/**
 * Presentational shell for the digital prescription designer. All state,
 * queries and persistence stay in `prescriptionTemplates.tsx`; this component
 * only lays them out.
 */
const TemplateDesignerPanel: React.FC<TemplateDesignerPanelProps> = ({
  templateOptions,
  fontOptions,
  colorPresets,
  selectedTemplate,
  selectedFont,
  colors,
  previewHtml,
  isPreviewLoading,
  isSaving,
  hasUnsavedChanges,
  isCustomTemplate,
  onSelectTemplate,
  onSelectFont,
  onSelectPreset,
  onColorChange,
  onResetColors,
  onSave,
  onReset,
}) => {
  const [openSection, setOpenSection] = useState<DesignerSectionId | null>(
    "template",
  );
  const [isAdvancedColorsOpen, setIsAdvancedColorsOpen] = useState(false);

  // Font tiles can only render in their own typeface once the families load.
  useEffect(() => {
    loadDesignerFonts();
  }, []);

  const toggleSection = (id: DesignerSectionId) =>
    setOpenSection((current) => (current === id ? null : id));

  const activeTemplate = templateOptions.find(
    (option) => option.value === selectedTemplate,
  );
  const activeFont = fontOptions.find((font) => font.value === selectedFont);
  const activePreset = colorPresets.find((preset) =>
    areColorsEqual(colors, preset.colors),
  );

  return (
    /* Mobile reads top-to-bottom: action bar, preview, then settings — so a
       change is never made without its result being one short scroll away.
       From `lg` the same three children become a settings column beside a
       full-height preview. */
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:items-start">
      <div className="lg:col-start-1 lg:row-start-1">
        <DesignerToolbar
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          isCustomTemplate={isCustomTemplate}
          onSave={onSave}
          onReset={onReset}
        />
      </div>

      <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-0">
        <LivePreviewPanel
          previewHtml={previewHtml}
          isLoading={isPreviewLoading}
          templateLabel={activeTemplate?.label ?? ""}
        />
      </div>

      <div className="lg:col-start-1 lg:row-start-2 lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:thin]">
        <div className="space-y-2">
          <SettingsSection
            id="template"
            title="Layout"
            icon={<FiLayout size={13} />}
            summary={activeTemplate?.label ?? "Choose a layout"}
            isOpen={openSection === "template"}
            onToggle={toggleSection}
          >
            <TemplatePicker
              options={templateOptions}
              selectedTemplate={selectedTemplate}
              colors={colors}
              fontFamily={selectedFont}
              onSelect={onSelectTemplate}
            />
          </SettingsSection>

          <SettingsSection
            id="colors"
            title="Colours"
            icon={<FiDroplet size={13} />}
            summary={
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: colors.color1 }}
                />
                {activePreset?.label ?? "Custom"}
              </span>
            }
            isOpen={openSection === "colors"}
            onToggle={toggleSection}
          >
            <ColorSettings
              colors={colors}
              presets={colorPresets}
              isAdvancedOpen={isAdvancedColorsOpen}
              onToggleAdvanced={() =>
                setIsAdvancedColorsOpen((current) => !current)
              }
              onSelectPreset={onSelectPreset}
              onColorChange={onColorChange}
              onResetColors={onResetColors}
            />
          </SettingsSection>

          <SettingsSection
            id="typography"
            title="Typography"
            icon={<FiType size={13} />}
            summary={activeFont?.label ?? "Choose a font"}
            isOpen={openSection === "typography"}
            onToggle={toggleSection}
          >
            <FontPicker
              options={fontOptions}
              selectedFont={selectedFont}
              onSelect={onSelectFont}
            />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
};

export default TemplateDesignerPanel;
