import { addToast, Card, Spinner } from "@heroui/react";
import { useEffect, useState } from "react";
import { FiFileText } from "react-icons/fi";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import {
  useGetLabReportTemplateQuery,
  useListLabReportTemplatesQuery,
  useSaveLabReportTemplateMutation,
} from "../../redux/api/labReportTemplateApi";
import {
  TemplateDesignerPanel,
  colorPresets,
  defaultColors,
  fontOptions,
} from "./lab-report-templates";
import {
  compileLabReportTemplate,
  getLabReportTemplateHtml,
  mockLabReportData,
} from "./lab-report-templates/helpers/templateHtml";
import type {
  ColorPreset,
  TemplateColorKey,
  TemplateOption,
} from "../../types/lab-report";

const fallbackTemplateOptions: TemplateOption[] = [
  { value: "template1", label: "Classic Lab", description: "Traditional & clean" },
  { value: "template2", label: "Modern Clinical", description: "Sleek & professional" },
  { value: "template3", label: "Medi Handwritten", description: "Refined & elegant" },
  { value: "template4", label: "Elegant Healthcare", description: "Personal & warm" },
];

export default function LabReportTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState("template1");
  const [selectedFont, setSelectedFont] = useState("Inter, sans-serif");
  const [colors, setColors] =
    useState<Record<keyof typeof defaultColors, string>>(defaultColors);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const { data: currentConfig, isLoading: isConfigLoading, refetch } = useGetLabReportTemplateQuery();
  const { data: templatesList, isLoading: isTemplatesListLoading } = useListLabReportTemplatesQuery();
  const [saveTemplate, { isLoading: isSaving }] = useSaveLabReportTemplateMutation();

  // Load backend configuration (either a saved custom template, or the
  // lab's default template/colours/font when nothing has been saved yet).
  useEffect(() => {
    const data = currentConfig?.data;
    if (!data) return;

    if (data.templateName && data.fontFamily && data.color1) {
      setSelectedTemplate(data.templateName);
      setSelectedFont(data.fontFamily);
      setColors({
        color1: data.color1 || defaultColors.color1,
        color2: data.color2 || defaultColors.color2,
        color3: data.color3 || defaultColors.color3,
        color4: data.color4 || defaultColors.color4,
        color5: data.color5 || defaultColors.color5,
        color6: data.color6 || defaultColors.color6,
        color7: data.color7 || defaultColors.color7,
        color8: data.color8 || defaultColors.color8,
        color9: data.color9 || defaultColors.color9,
        color10: data.color10 || defaultColors.color10,
      });
    } else if (data.defaultTemplate && data.defaultColors && data.defaultFontFamily) {
      setSelectedTemplate(data.defaultTemplate);
      setSelectedFont(data.defaultFontFamily);
      setColors(data.defaultColors as Record<keyof typeof defaultColors, string>);
    }
  }, [currentConfig]);

  // Track unsaved status against whatever the backend currently considers
  // "active" (a saved custom template, or the lab's defaults).
  useEffect(() => {
    const data = currentConfig?.data;

    if (!data) {
      setHasUnsavedChanges(
        selectedTemplate !== "template1" ||
          selectedFont !== "Inter, sans-serif" ||
          Object.keys(colors).some(
            (key) =>
              (colors[key as keyof typeof colors] || "").toLowerCase() !==
              (defaultColors[key as keyof typeof defaultColors] || "").toLowerCase(),
          ),
      );
      return;
    }

    if (data.templateName && data.fontFamily && data.color1) {
      setHasUnsavedChanges(
        selectedTemplate !== data.templateName ||
          selectedFont !== data.fontFamily ||
          Object.keys(colors).some(
            (key) =>
              (colors[key as keyof typeof colors] || "").toLowerCase() !==
              ((data as any)[key] || "").toLowerCase(),
          ),
      );
    } else if (data.defaultTemplate && data.defaultColors && data.defaultFontFamily) {
      setHasUnsavedChanges(
        selectedTemplate !== data.defaultTemplate ||
          selectedFont !== data.defaultFontFamily ||
          Object.keys(colors).some(
            (key) =>
              (colors[key as keyof typeof colors] || "").toLowerCase() !==
              ((data.defaultColors as any)?.[key] || "").toLowerCase(),
          ),
      );
    } else {
      setHasUnsavedChanges(true);
    }
  }, [selectedTemplate, selectedFont, colors, currentConfig]);

  // Re-compile the HTML preview client-side — instant, no network round-trip.
  useEffect(() => {
    const compiled = compileLabReportTemplate(getLabReportTemplateHtml(selectedTemplate), {
      ...mockLabReportData,
      templateConfig: { fontFamily: selectedFont, colors },
    });

    setPreviewHtml(compiled);
  }, [selectedTemplate, selectedFont, colors]);

  const handleSaveTemplate = async () => {
    try {
      const res = await saveTemplate({
        templateName: selectedTemplate,
        fontFamily: selectedFont,
        ...colors,
      }).unwrap();

      if (res.success) {
        addToast({
          title: "Template Saved",
          description: "Lab report template configuration updated successfully.",
          color: "success",
        });
        refetch();
      }
    } catch (err) {
      console.error("Save failed:", err);
      addToast({
        title: "Save Failed",
        description: "Failed to save lab report template config.",
        color: "danger",
      });
    }
  };

  const handleResetToDefault = () => {
    const data = currentConfig?.data;

    if (data?.templateName && data.fontFamily && data.color1) {
      setSelectedTemplate(data.templateName);
      setSelectedFont(data.fontFamily);
      setColors({
        color1: data.color1 || defaultColors.color1,
        color2: data.color2 || defaultColors.color2,
        color3: data.color3 || defaultColors.color3,
        color4: data.color4 || defaultColors.color4,
        color5: data.color5 || defaultColors.color5,
        color6: data.color6 || defaultColors.color6,
        color7: data.color7 || defaultColors.color7,
        color8: data.color8 || defaultColors.color8,
        color9: data.color9 || defaultColors.color9,
        color10: data.color10 || defaultColors.color10,
      });
    } else if (data?.defaultTemplate && data.defaultColors && data.defaultFontFamily) {
      setSelectedTemplate(data.defaultTemplate);
      setSelectedFont(data.defaultFontFamily);
      setColors(data.defaultColors as Record<keyof typeof defaultColors, string>);
    } else {
      setSelectedTemplate("template1");
      setSelectedFont("Inter, sans-serif");
      setColors(defaultColors);
    }
  };

  const handleColorChange = (role: TemplateColorKey, hex: string) => {
    setColors((prev) => ({ ...prev, [role]: hex }));
  };

  const handleSelectPreset = (preset: ColorPreset) => {
    setColors(preset.colors);
  };

  const handleResetColors = () => {
    const data = currentConfig?.data;
    setColors(
      (data?.templateName && data.color1
        ? {
            color1: data.color1,
            color2: data.color2,
            color3: data.color3,
            color4: data.color4,
            color5: data.color5,
            color6: data.color6,
            color7: data.color7,
            color8: data.color8,
            color9: data.color9,
            color10: data.color10,
          }
        : data?.defaultColors) as Record<keyof typeof defaultColors, string> | undefined ??
        defaultColors,
    );
  };

  const isLoading = isConfigLoading || isTemplatesListLoading;

  if (isLoading) {
    return (
      <Card className="shadow-none rounded-2xl overflow-hidden">
        <div className="flex justify-center items-center min-h-[520px]">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  const isCustomTemplate = !!currentConfig?.data?.templateName;

  const templateOptions: TemplateOption[] =
    templatesList?.data && templatesList.data.length > 0
      ? templatesList.data.map((tmpl) => ({
          value: tmpl.id,
          label: tmpl.displayName,
          description: tmpl.description,
        }))
      : fallbackTemplateOptions;

  return (
    <>
      <ProfilePageHeader
        icon={<FiFileText className="h-4 w-4" />}
        title="Report Template"
        description="Design professional lab reports that reflect your lab's identity."
      />

      <div className="p-3 sm:p-4 lg:p-6">
        <TemplateDesignerPanel
          templateOptions={templateOptions}
          fontOptions={fontOptions}
          colorPresets={colorPresets}
          selectedTemplate={selectedTemplate}
          selectedFont={selectedFont}
          colors={colors}
          previewHtml={previewHtml}
          isPreviewLoading={false}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          isCustomTemplate={isCustomTemplate}
          onSelectTemplate={setSelectedTemplate}
          onSelectFont={setSelectedFont}
          onSelectPreset={handleSelectPreset}
          onColorChange={handleColorChange}
          onResetColors={handleResetColors}
          onSave={handleSaveTemplate}
          onReset={handleResetToDefault}
        />
      </div>
    </>
  );
}
