import {
  addToast,
  Button,
  Card,
  CardBody,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Tab,
  Tabs,
} from "@heroui/react";
import Tooltip from "../../components/shared/Tooltip";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  FiCheck,
  FiEye,
  FiFileText,
  FiRefreshCw,
  FiSave,
  FiEdit,
} from "react-icons/fi";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
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
} from "../../redux/api/prescriptionApi";
import { useFeatureGate } from "../../hooks/useFeatureGate";

const PrescriptionNotepadScannerPage = lazy(
  () => import("../prescription_notepad_scanner/scanner"),
);

type DoctorPrescriptionType = "Digital" | "Manual";

const fontOptions = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Open Sans", value: "Open Sans, sans-serif" },
  { label: "Lato", value: "Lato, sans-serif" },
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Poppins", value: "Poppins, sans-serif" },
  { label: "Ubuntu", value: "Ubuntu, sans-serif" },
  { label: "Nunito", value: "Nunito, sans-serif" },
  { label: "Graphik", value: "Graphik, sans-serif" },
  { label: "Rubik", value: "Rubik, sans-serif" },
];

const defaultColors = {
  color1: "#0A6C74",
  color2: "#EBFCF4",
  color3: "#333333",
  color4: "#666666",
  color5: "#e0e0e0",
  color6: "#b22222",
  color7: "#f9f9f9",
  color8: "#ffffff",
  color9: "#000000",
  color10: "#856404",
};

const colorLabels = [
  {
    key: "color1" as const,
    label: "Primary Brand Color - (Headers, Main Titles)",
  },
  {
    key: "color2" as const,
    label: "Secondary Accent Color- (Sub-Headers, Logo Strips)",
  },
  { key: "color3" as const, label: "Primary Text Color - (Main Body Text)" },
  { key: "color4" as const, label: "Secondary Text - (Labels)" },
  {
    key: "color5" as const,
    label: "Borders and Dividers - (Cards, Tables, Section Separators)",
  },
  {
    key: "color6" as const,
    label: "Warning or Alert Text - (Surgery Suggested, Important Notes)",
  },
  {
    key: "color7" as const,
    label: "Background Light - (Meta Rows, Patient Grids, Sidebars)",
  },
  { key: "color8" as const, label: "Main Background - (Container Background)" },
  { key: "color9" as const, label: "Emphasis Text (Doctor Name)" },
  {
    key: "color10" as const,
    label: "Advice and Dietary Suggestion Header - (Special Section Titles)",
  },
];

const templateOptions = [
  { value: "template1", label: "Classic Medical", accent: "#0A6C74", description: "Traditional & clean" },
  { value: "template2", label: "Modern Clinical", accent: "#2563EB", description: "Sleek & professional" },
  { value: "template3", label: "Medi Handwritten", accent: "#7C3AED", description: "Refined & elegant" },
  { value: "template4", label: "Elegant Health Care", accent: "#D97706", description: "Personal & warm" },
];

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
      const { templateType } = templateInfo.data;

      switch (templateType) {
        case "manual":
          setSelectedTab("manualScanner");
          break;

        case "doctor_html":
          setSelectedTab("scanner");
          break;

        case "quick-print":
        case "quick_print":
        case "quickPrint":
          setSelectedTab("quickPrint");
          break;

        case "prescription":
        case "default":
          setSelectedTab("templates");
          break;

        default:
          setSelectedTab("templates");
      }

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

    const timeoutId = setTimeout(fetchPreview, 500);

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

  const handleColorChange = (
    color: { hex: string },
    colorKey: keyof typeof defaultColors,
  ) => {
    setColors((prev) => ({
      ...prev,
      [colorKey]: color.hex,
    }));
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
                      <Tab key="templates" title="Prescription Templates" />
                      <Tab key="quickPrint" title="Quick Print Templates" />
                      <Tab
                        key="scanner"
                        title={
                          isScannerBlocked
                            ? "🔒 Prescription Scanner"
                            : "Prescription Scanner"
                        }
                      />
                      <Tab
                        key="manualScanner"
                        title={
                          isScannerBlocked ? "🔒 Manual Scanner" : "Manual Scanner"
                        }
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
              <div className="space-y-3">
                {/* Toolbar — matches Quick Print exactly */}
                <Card className="shadow-none rounded-2xl border border-default-100">
                  <CardBody className="p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FiEdit size={14} className="text-primary" />
                        <h3 className="text-[13px] font-semibold text-default-800">Template Designer</h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select size="sm" selectedKeys={["a4"]} onSelectionChange={() => { }} className="w-[160px]" classNames={{ trigger: "text-[11px] h-8 min-h-8 rounded-lg" }}>
                          <SelectItem key="a4" textValue="A4 (210×297mm)"><span className="text-[11px]">A4 (210×297mm)</span></SelectItem>
                          <SelectItem key="a5" textValue="A5 (148×210mm)"><span className="text-[11px]">A5 (148×210mm)</span></SelectItem>
                          <SelectItem key="letter" textValue="Letter"><span className="text-[11px]">Letter (8.5×11in)</span></SelectItem>
                        </Select>
                        <Button size="sm" variant="bordered" className="text-[11px] h-8 border-default-200" startContent={<FiRefreshCw size={11} />} onPress={handleResetToDefault}>Reset</Button>
                        <Button size="sm" className="text-[11px] font-semibold h-8 bg-[#0a6c74] text-white hover:bg-[#095a61]" startContent={<FiSave size={11} />} onPress={handleSaveTemplate} isLoading={isSaving} isDisabled={!hasUnsavedChanges}>Save</Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Grid — matches Quick Print's [220px_1fr] */}
                <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3">
                  {/* Sidebar */}
                  <div className="space-y-3">
                    <Card className="shadow-none rounded-2xl border border-default-100">
                      <CardBody className="p-3">
                        <p className="text-[11px] font-semibold text-default-800 mb-2">Select Template</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {templateOptions.map((tmpl) => {
                            const isActive = selectedTemplate === tmpl.value;
                            return (
                              <button key={tmpl.value} type="button" onClick={() => setSelectedTemplate(tmpl.value)} className={`relative rounded-lg border-2 p-2 text-left transition-all focus:outline-none ${isActive ? "border-primary bg-primary/5" : "border-default-200 hover:border-default-300 bg-white"}`}>
                                <div className="h-1 w-8 rounded-full mb-1" style={{ backgroundColor: tmpl.accent }} />
                                <p className="text-[10px] font-semibold text-default-800 leading-tight">{tmpl.label}</p>
                                <p className="text-[8px] text-default-400">{tmpl.description}</p>
                                {isActive && <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-white"><FiCheck size={8} /></span>}
                              </button>
                            );
                          })}
                        </div>
                      </CardBody>
                    </Card>

                    <Card className="shadow-none rounded-2xl border border-default-100">
                      <CardBody className="p-3">
                        <p className="text-[11px] font-semibold text-default-800 mb-1.5">Font</p>
                        <Select size="sm" selectedKeys={selectedFont ? [selectedFont] : []} onSelectionChange={(keys) => { const v = Array.from(keys)[0] as string; if (v) setSelectedFont(v); }} classNames={{ trigger: "text-[11px] h-8 min-h-8 rounded-lg" }}>
                          {fontOptions.map((font) => (<SelectItem key={font.value} textValue={font.label}><span style={{ fontFamily: font.value.split(",")[0] }} className="text-[11px]">{font.label}</span></SelectItem>))}
                        </Select>
                      </CardBody>
                    </Card>

                    <Card className="shadow-none rounded-2xl border border-default-100 overflow-hidden">
                      <button type="button" onClick={() => setActiveColorPicker(activeColorPicker ? null : "color1")} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-default-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">{["color1", "color2", "color3", "color6", "color10"].map((k) => (<div key={k} className="w-4 h-4 rounded-full ring-2 ring-white" style={{ backgroundColor: colors[k as keyof typeof defaultColors] }} />))}</div>
                          <span className="text-[11px] font-semibold text-default-700">Customize Colors</span>
                        </div>
                        <svg className={`w-4 h-4 text-default-400 transition-transform ${activeColorPicker ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {activeColorPicker && (
                        <div className="border-t border-default-100 px-3 py-2 space-y-1 max-h-[280px] overflow-y-auto" data-color-picker="true">
                          {colorLabels.map(({ key, label }) => {
                            const isEditing = activeColorPicker === key;
                            return (
                              <div key={key}>
                                <button type="button" data-color-trigger="true" onClick={() => setActiveColorPicker(key)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${isEditing ? "bg-primary/5" : "hover:bg-default-50"}`}>
                                  <div className="w-4 h-4 rounded-full shrink-0 ring-1 ring-black/10" style={{ backgroundColor: colors[key] }} />
                                  <span className="text-[10px] text-default-600 truncate flex-1 text-left">{label.split(" - ")[0]}</span>
                                  <span className="text-[9px] font-mono text-default-400">{colors[key]}</span>
                                </button>
                                {isEditing && (
                                  <div className="flex items-center gap-1.5 ml-6 mt-1 mb-1">
                                    <input type="color" value={colors[key]} onChange={(e) => handleColorChange({ hex: e.target.value }, key)} className="w-6 h-6 rounded cursor-pointer border-0 p-0 shrink-0" />
                                    <input type="text" value={colors[key]} onChange={(e) => setColors((prev) => ({ ...prev, [key]: e.target.value }))} className="flex-1 text-[10px] font-mono bg-default-50 border border-default-200 rounded px-2 py-1 focus:border-primary focus:outline-none" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>

                    <p className="text-[9px] text-default-400 px-1">
                      {isCustomTemplate ? <span className="text-green-600">✓ Custom template</span> : <span className="text-blue-500">ℹ Default template</span>}
                      {hasUnsavedChanges && <span className="text-amber-500 ml-1">• Unsaved</span>}
                    </p>
                  </div>

                  {/* Preview — same Card as Quick Print canvas */}
                  <Card className="shadow-none rounded-2xl border border-default-100 overflow-auto">
                    <CardBody className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FiEye size={12} className="text-primary" />
                        <span className="text-[11px] font-semibold text-default-800">Live Preview</span>
                        {isPreviewLoading && <Spinner size="sm" />}
                      </div>
                      <div className="bg-white rounded-lg border border-default-200 overflow-hidden shadow-sm" style={{ height: "560px" }}>
                        {previewHtml && (
                          <iframe srcDoc={previewHtml.replace("</head>", `<style>::-webkit-scrollbar{display:none}*{scrollbar-width:none;-ms-overflow-style:none}</style></head>`)} className="w-full h-full border-0" title="Template Preview" style={{ backgroundColor: "white", transform: "scale(0.62)", transformOrigin: "top left", width: "161%", height: "161%" }} />
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </div>
            )}

            {selectedTab === "quickPrint" && (
              <QuickPrintTemplates />
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
