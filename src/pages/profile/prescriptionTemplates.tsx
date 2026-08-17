import {
  addToast,
  Card,
  CardBody,
  Chip,
  Skeleton,
  Spinner,
  Switch,
  Tab,
  Tabs,
} from "@heroui/react";
import Tooltip from "../../components/shared/Tooltip";
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { FiFileText, FiPlus } from "react-icons/fi";
import { useConnectivityState } from "../../hooks/useConnectivityState";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import {
  TemplateDesignerPanel,
  colorPresets,
  defaultColors,
  fontOptions,
  getTemplateDefaultColors,
  isUntouchedPalette,
  templateOptions,
} from "./prescription-templates";
import type {
  ColorPreset,
  TemplateColorKey,
  TemplateColors,
} from "../../types/prescription";
import ManualPrescription from "../manual-prescription/page";
import { QuickPrintTemplates } from "./quick-print-templates";
import {
  useGetCurrentTemplateInfoQuery,
  useGetDoctorTemplateQuery,
  useGetTemplatePreviewMutation,
  useSaveDoctorTemplateMutation,
} from "../../redux/api/prescriptionTemplateApi";
import {
  useGetDoctorPrescriptionTypeQuery,
  useSetDoctorPrescriptionTypeMutation,
  type DoctorPrescriptionType,
} from "../../redux/api/prescriptionApi";
import { useFeatureGate } from "../../hooks/useFeatureGate";

const PrescriptionNotepadScannerPage = lazy(
  () => import("../prescription_notepad_scanner/scanner"),
);

/**
 * Which tab owns each `templateType` returned by `reports/template-info/current`.
 * The backend picks the most recently saved template across all four sources, so
 * this is also what makes the "Active for printing" badge move between tabs.
 */
const TAB_BY_TEMPLATE_TYPE: Record<string, string> = {
  manual: "manualScanner",
  doctor_html: "scanner",
  "quick-print": "quickPrint",
  quick_print: "quickPrint",
  quickPrint: "quickPrint",
  prescription: "templates",
  default: "templates",
};

const formatTemplateUpdatedAt = (updatedAt?: string): string => {
  if (!updatedAt) return "";

  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getPrescriptionTypeFromResponse = (
  response: any,
): DoctorPrescriptionType | "" => {
  const prescriptionType =
    response?.data?.prescriptionType ??
    response?.result?.prescriptionType ??
    response?.prescriptionType ??
    "";

  if (prescriptionType === "Digital" || prescriptionType === "Manual") {
    return prescriptionType;
  }

  return "";
};

export default function PrescriptionTemplates() {
  const [selectedTab, setSelectedTab] = useState("templates");
  const [selectedTemplate, setSelectedTemplate] = useState("template1");
  const [selectedFont, setSelectedFont] = useState("Inter, sans-serif");
  const [colors, setColors] =
    useState<Record<keyof typeof defaultColors, string>>(defaultColors);
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(
    null,
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isTabInitialized, setIsTabInitialized] = useState(false);
  const [isDigitalPrescription, setIsDigitalPrescription] = useState(false);

  const {
    data: templateInfo,
    isLoading: isTemplateInfoLoading,
    refetch: refetchTemplateInfo,
  } = useGetCurrentTemplateInfoQuery();

  const {
    data: templateResponse,
    isLoading: isTemplateLoading,
    refetch,
  } = useGetDoctorTemplateQuery(undefined, {
    skip: selectedTab !== "templates",
  });

  const [saveTemplate, { isLoading: isSaving }] =
    useSaveDoctorTemplateMutation();

  const [getTemplatePreview] = useGetTemplatePreviewMutation();

  const [setDoctorPrescriptionType, { isLoading: isPrescriptionTypeSaving }] =
    useSetDoctorPrescriptionTypeMutation();

  const connectivityState = useConnectivityState();
  const isOffline = connectivityState !== 'online';

  const {
    data: doctorPrescriptionTypeData,
    isFetching: isDoctorPrescriptionTypeFetching,
    refetch: refetchDoctorPrescriptionType,
  } = useGetDoctorPrescriptionTypeQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const doctorPrescriptionType = getPrescriptionTypeFromResponse(
    doctorPrescriptionTypeData,
  );

  const { status: smartPrescriptionsStatus } = useFeatureGate("smart_prescriptions");

  useEffect(() => {
    if (templateInfo?.data && !isTabInitialized) {
      setSelectedTab(
        TAB_BY_TEMPLATE_TYPE[templateInfo.data.templateType] ?? "templates",
      );
      setIsTabInitialized(true);
    }
  }, [templateInfo, isTabInitialized]);

  useEffect(() => {
    if (isDoctorPrescriptionTypeFetching) return;
    if (!doctorPrescriptionType) return;

    setIsDigitalPrescription(doctorPrescriptionType === "Digital");
  }, [doctorPrescriptionType, isDoctorPrescriptionTypeFetching]);

  useEffect(() => {
    if (templateResponse?.data && selectedTab === "templates") {
      const data = templateResponse.data;

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
      } else if (
        data.defaultTemplate &&
        data.defaultColors &&
        data.defaultFontFamily
      ) {
        setSelectedTemplate(data.defaultTemplate);
        setSelectedFont(data.defaultFontFamily);
        setColors(
          data.defaultColors as Record<keyof typeof defaultColors, string>,
        );
      }
    }
  }, [templateResponse, selectedTab]);

  useEffect(() => {
    if (selectedTab !== "templates") return;

    const fetchPreview = async () => {
      setIsPreviewLoading(true);

      try {
        const result = await getTemplatePreview({
          templateName: selectedTemplate,
          fontFamily: selectedFont,
          colors,
        }).unwrap();

        setPreviewHtml(result.html);
      } catch (error) {
        console.error("Failed to load preview:", error);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    // Short enough to feel live while dragging a colour picker, long enough
    // that a drag doesn't fire a request per pixel.
    const timeoutId = setTimeout(fetchPreview, 250);

    return () => clearTimeout(timeoutId);
  }, [selectedTemplate, selectedFont, colors, getTemplatePreview, selectedTab]);

  useEffect(() => {
    if (templateResponse?.data && selectedTab === "templates") {
      const data = templateResponse.data;

      if (data.templateName && data.fontFamily && data.color1) {
        const hasChanges =
          selectedTemplate !== data.templateName ||
          selectedFont !== data.fontFamily ||
          Object.keys(colors).some(
            (key) =>
              colors[key as keyof typeof colors] !==
              data[key as keyof typeof data],
          );

        setHasUnsavedChanges(hasChanges);
      } else if (
        data.defaultTemplate &&
        data.defaultColors &&
        data.defaultFontFamily
      ) {
        const hasChanges =
          selectedTemplate !== data.defaultTemplate ||
          selectedFont !== data.defaultFontFamily ||
          Object.keys(colors).some(
            (key) =>
              colors[key as keyof typeof colors] !==
              data.defaultColors?.[key as keyof typeof defaultColors],
          );

        setHasUnsavedChanges(hasChanges);
      }
    }
  }, [selectedTemplate, selectedFont, colors, templateResponse, selectedTab]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      const clickedInsidePicker = target.closest("[data-color-picker='true']");
      const clickedOnTrigger = target.closest("[data-color-trigger='true']");

      if (!clickedInsidePicker && !clickedOnTrigger) {
        setActiveColorPicker(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleDigitalPrescriptionChange = async (checked: boolean) => {
    const previousValue = isDigitalPrescription;

    setIsDigitalPrescription(checked);

    try {
      const updateResponse = await setDoctorPrescriptionType().unwrap();

      let latestPrescriptionType =
        getPrescriptionTypeFromResponse(updateResponse);

      if (!latestPrescriptionType) {
        const latestResponse = await refetchDoctorPrescriptionType().unwrap();
        latestPrescriptionType =
          getPrescriptionTypeFromResponse(latestResponse);
      } else {
        refetchDoctorPrescriptionType();
      }

      if (latestPrescriptionType) {
        setIsDigitalPrescription(latestPrescriptionType === "Digital");
      } else {
        setIsDigitalPrescription(checked);
      }

      addToast({
        title: "Success",
        description: "Prescription type updated successfully.",
        color: "success",
      });

      refetchTemplateInfo();
    } catch (error) {
      console.error("Failed to update prescription type:", error);

      setIsDigitalPrescription(previousValue);

      addToast({
        title: "Error",
        description: "Failed to update prescription type.",
        color: "danger",
      });
    }
  };

  const handleSaveTemplate = async () => {
    try {
      await saveTemplate({
        templateName: selectedTemplate,
        fontFamily: selectedFont,
        ...colors,
      }).unwrap();

      addToast({
        title: "Success",
        description: "Prescription template saved successfully!",
        color: "success",
      });

      refetch();
      refetchTemplateInfo();
    } catch {
      addToast({
        title: "Error",
        description: "Failed to save prescription template.",
        color: "danger",
      });
    }
  };

  const handleResetToDefault = () => {
    if (
      templateResponse?.data?.defaultTemplate &&
      templateResponse.data.defaultColors &&
      templateResponse.data.defaultFontFamily
    ) {
      setSelectedTemplate(templateResponse.data.defaultTemplate);
      setSelectedFont(templateResponse.data.defaultFontFamily);
      setColors(
        templateResponse.data.defaultColors as Record<
          keyof typeof defaultColors,
          string
        >,
      );
    } else {
      setSelectedTemplate("template1");
      setSelectedFont("Inter, sans-serif");
      setColors(defaultColors);
    }
  };

  const handleColorChange = (colorKey: TemplateColorKey, hex: string) => {
    setColors((prev) => ({
      ...prev,
      [colorKey]: hex,
    }));
  };

  const handleSelectPreset = (preset: ColorPreset) => {
    setColors(preset.colors);
  };

  /**
   * Templates can ship their own starting palette (Template 6 opens on navy).
   * Only swap while the doctor is still on an untouched default — otherwise
   * picking a different layout would silently discard their custom colours.
   */
  const handleSelectTemplate = (template: string) => {
    setSelectedTemplate(template);
    setColors((current) =>
      isUntouchedPalette(current as TemplateColors)
        ? getTemplateDefaultColors(template)
        : current,
    );
  };

  const handleResetColors = () => {
    setColors(
      (templateResponse?.data?.defaultColors as Record<
        keyof typeof defaultColors,
        string
      >) || defaultColors,
    );
  };

  const isLoading =
    isTemplateInfoLoading || (selectedTab === "templates" && isTemplateLoading);

  if (isLoading) {
    return (
      <Card className="shadow-none rounded-2xl overflow-hidden">
        <div className="flex justify-center items-center min-h-[520px]">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  const isCustomTemplate = !!templateResponse?.data?.templateName;

  // Which tab's template is actually used when a prescription is printed.
  const activeTabKey = templateInfo?.data
    ? (TAB_BY_TEMPLATE_TYPE[templateInfo.data.templateType] ?? "templates")
    : "templates";
  const activeTemplateLabel =
    templateInfo?.data?.usingTemplate ?? "Default Template";
  // Show the design's own name ("Clinical Card"), not the storage key
  // ("template6") — the key is an implementation detail a doctor never chose.
  // Quick-print/custom templates have no entry here, so fall back to the key.
  const activeTemplateKey = templateInfo?.data?.templateName;
  const activeTemplateName = activeTemplateKey
    ? (templateOptions.find((option) => option.value === activeTemplateKey)
        ?.label ?? activeTemplateKey)
    : undefined;
  const activeTemplateUpdatedAt = formatTemplateUpdatedAt(
    templateInfo?.data?.updatedAt,
  );

  const tabTitle = (key: string, label: string) => (
    <span className="flex items-center gap-1.5">
      {label}
      {activeTabKey === key && (
        <Chip
          size="sm"
          color="success"
          variant="flat"
          className="h-4 px-1 text-[9px]"
        >
          Active
        </Chip>
      )}
    </span>
  );

  // Digital ON means template/scanner section is disabled as per your existing UI.
  const isPageDisabled =
    !isDoctorPrescriptionTypeFetching && !isDigitalPrescription;
  const disabledPageMessage =
    "Please turn on Digital Prescription toggle to access Prescription Templates page.";

  // Smart prescriptions feature gate — only scanner tabs are blocked
  const isScannerBlocked = smartPrescriptionsStatus !== "enabled";
  const scannerBlockedMessage =
    "Smart Prescriptions is not available on your current plan. Please upgrade to access this feature.";

  return (
    <>
      <ProfilePageHeader
        icon={<FiFileText className="h-4 w-4" />}
        title="Prescription Templates"
        description="Design professional prescriptions that reflect your clinic's identity."
      />

      <div className="p-3 sm:p-4 lg:p-6">
        {/* ── Active-template banner: which design actually prints ── */}
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-success-200 bg-success-50/60 px-3 py-2">
          <span className="text-[11px] font-semibold text-default-700">
            Currently printing with:
          </span>
          <Chip size="sm" color="success" variant="flat" className="h-5 text-[10px]">
            {activeTemplateLabel}
            {activeTemplateName ? ` · ${activeTemplateName}` : ""}
          </Chip>
          {activeTemplateUpdatedAt && (
            <span className="text-[10px] text-default-500">
              saved {activeTemplateUpdatedAt}
            </span>
          )}
          <span className="text-[10px] text-default-500">
            — the template you saved most recently is the one used on
            prescriptions. Save in another tab to switch.
          </span>
        </div>

        {/* ── Tabs + Digital Toggle row ── */}
        <div className="relative mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Tabs — wrapped in its own relative container so the overlay only covers tabs, not the toggle */}
            <div className="relative">
              <div
                aria-disabled={isPageDisabled}
                className={
                  isPageDisabled
                    ? "pointer-events-none select-none opacity-50 transition-opacity"
                    : "transition-opacity"
                }
              >
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="min-w-max">
                    <Tabs
                      selectedKey={selectedTab}
                      onSelectionChange={(key) => setSelectedTab(String(key))}
                      color="primary"
                      variant="underlined"
                      classNames={{ tabList: "gap-4", tab: "text-[12px] px-0 h-8" }}
                    >
                      <Tab
                        key="templates"
                        title={tabTitle("templates", "Prescription Templates")}
                      />
                      <Tab
                        key="quickPrint"
                        title={tabTitle("quickPrint", "Quick Print Templates")}
                      />
                      <Tab
                        key="scanner"
                        title={tabTitle(
                          "scanner",
                          isScannerBlocked
                            ? "🔒 Prescription Scanner"
                            : "Prescription Scanner",
                        )}
                      />
                      <Tab
                        key="manualScanner"
                        title={tabTitle(
                          "manualScanner",
                          isScannerBlocked ? "🔒 Manual Scanner" : "Manual Scanner",
                        )}
                      />
                    </Tabs>
                  </div>
                </div>
              </div>

              {isPageDisabled && (
                <Tooltip
                  content={disabledPageMessage}
                  placement="top"
                  color="foreground"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={disabledPageMessage}
                    className="absolute inset-0 z-10 cursor-not-allowed rounded-2xl bg-transparent"
                  />
                </Tooltip>
              )}
            </div>

            {/* Digital Prescription toggle — always interactive, outside the overlay */}
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-default-200 bg-default-50 px-3 py-1.5">
              <span className="text-[12px] font-medium text-default-600 whitespace-nowrap">
                Digital Prescription
              </span>
              <Switch
                size="sm"
                color="primary"
                aria-label="Digital Prescription"
                isSelected={isDigitalPrescription}
                isDisabled={
                  isPrescriptionTypeSaving || isDoctorPrescriptionTypeFetching
                }
                onValueChange={handleDigitalPrescriptionChange}
              />
            </div>
          </div>
        </div>

        <div className="relative">
          <div
            aria-disabled={isPageDisabled}
            className={
              isPageDisabled
                ? "pointer-events-none select-none opacity-50 transition-opacity"
                : "transition-opacity"
            }
          >
            {selectedTab === "templates" && (
              <TemplateDesignerPanel
                templateOptions={templateOptions}
                fontOptions={fontOptions}
                colorPresets={colorPresets}
                selectedTemplate={selectedTemplate}
                selectedFont={selectedFont}
                colors={colors}
                previewHtml={previewHtml}
                isPreviewLoading={isPreviewLoading}
                isSaving={isSaving}
                hasUnsavedChanges={hasUnsavedChanges}
                isCustomTemplate={isCustomTemplate}
                onSelectTemplate={handleSelectTemplate}
                onSelectFont={setSelectedFont}
                onSelectPreset={handleSelectPreset}
                onColorChange={handleColorChange}
                onResetColors={handleResetColors}
                onSave={handleSaveTemplate}
                onReset={handleResetToDefault}
              />
            )}

            {selectedTab === "quickPrint" && (
              <QuickPrintTemplates
                isActiveTemplate={activeTabKey === "quickPrint"}
                onSaved={refetchTemplateInfo}
              />
            )}

            {selectedTab === "scanner" && (
              <Card className="shadow-none rounded-2xl overflow-hidden">
                <CardBody className="px-0 py-2">
                  {isScannerBlocked ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center px-4">
                      <p className="text-default-500 text-sm">{scannerBlockedMessage}</p>
                    </div>
                  ) : (
                    <Suspense
                      fallback={
                        <div className="flex min-h-[300px] items-center justify-center">
                          <Spinner size="lg" />
                        </div>
                      }
                    >
                      <PrescriptionNotepadScannerPage />
                    </Suspense>
                  )}
                </CardBody>
              </Card>
            )}

            {selectedTab === "manualScanner" && (
              <Card className="shadow-none rounded-2xl overflow-hidden">
                <CardBody className="px-0 py-2">
                  {isScannerBlocked ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center px-4">
                      <p className="text-default-500 text-sm">{scannerBlockedMessage}</p>
                    </div>
                  ) : (
                    <ManualPrescription />
                  )}
                </CardBody>
              </Card>
            )}
          </div>

          {isPageDisabled && (
            <Tooltip
              content={disabledPageMessage}
              placement="top"
              color="foreground"
            >
              <div
                role="button"
                tabIndex={0}
                aria-label={disabledPageMessage}
                className="absolute inset-0 z-10 cursor-not-allowed rounded-2xl bg-transparent"
              />
            </Tooltip>
          )}
        </div>
      </div >
    </>
  );
}
