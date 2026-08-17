import type React from "react";

/** The ten template colour roles the backend lab report templates read (`color1`…`color10`). */
export type TemplateColors = {
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  color6: string;
  color7: string;
  color8: string;
  color9: string;
  color10: string;
};

export type TemplateColorKey = keyof TemplateColors;

/** One selectable lab report layout (`template1`…`template4`), sourced from the backend list. */
export type TemplateOption = {
  value: string;
  label: string;
  description: string;
};

/** A named palette that fills every colour role at once. */
export type ColorPreset = {
  id: string;
  label: string;
  colors: TemplateColors;
};

export type FontOption = {
  label: string;
  value: string;
  /** Family name alone, for rendering the tile in its own typeface. */
  preview: string;
};

/** Which settings panel is expanded. `null` collapses all of them. */
export type DesignerSectionId = "template" | "typography" | "colors";

export type SettingsSectionProps = {
  id: DesignerSectionId;
  title: string;
  icon: React.ReactNode;
  /**
   * Rendered in the collapsed header so the row shows its current value rather
   * than restating its title.
   */
  summary: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: DesignerSectionId) => void;
  children: React.ReactNode;
};

export type TemplateThumbnailProps = {
  templateValue: string;
  colors: TemplateColors;
  fontFamily: string;
};

export type TemplatePickerProps = {
  options: TemplateOption[];
  selectedTemplate: string;
  colors: TemplateColors;
  fontFamily: string;
  onSelect: (value: string) => void;
};

export type FontPickerProps = {
  options: FontOption[];
  selectedFont: string;
  onSelect: (value: string) => void;
};

export type ColorSettingsProps = {
  colors: TemplateColors;
  presets: ColorPreset[];
  isAdvancedOpen: boolean;
  onToggleAdvanced: () => void;
  onSelectPreset: (preset: ColorPreset) => void;
  onColorChange: (role: TemplateColorKey, hex: string) => void;
  onResetColors: () => void;
};

export type LivePreviewPanelProps = {
  previewHtml: string | null;
  isLoading: boolean;
  templateLabel: string;
};

/** `null` zoom means "fit the sheet to the stage"; a number is an explicit scale. */
export type PreviewZoom = number | null;

export type DesignerToolbarProps = {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isCustomTemplate: boolean;
  onSave: () => void;
  onReset: () => void;
};

export type TemplateDesignerPanelProps = {
  templateOptions: TemplateOption[];
  fontOptions: FontOption[];
  colorPresets: ColorPreset[];
  selectedTemplate: string;
  selectedFont: string;
  colors: TemplateColors;
  previewHtml: string | null;
  isPreviewLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  isCustomTemplate: boolean;
  onSelectTemplate: (value: string) => void;
  onSelectFont: (value: string) => void;
  onSelectPreset: (preset: ColorPreset) => void;
  onColorChange: (role: TemplateColorKey, hex: string) => void;
  onResetColors: () => void;
  onSave: () => void;
  onReset: () => void;
};
