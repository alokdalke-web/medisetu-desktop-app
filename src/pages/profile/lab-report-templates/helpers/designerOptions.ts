import type {
  ColorPreset,
  FontOption,
  TemplateColors,
} from "../../../../types/lab-report";

export const defaultColors: TemplateColors = {
  color1: "#0F766E",
  color2: "#ECFDF5",
  color3: "#172033",
  color4: "#526078",
  color5: "#DBE3EA",
  color6: "#B22222",
  color7: "#F9F9F9",
  color8: "#FFFFFF",
  color9: "#000000",
  color10: "#856404",
};

/**
 * Short role names for the advanced colour list. `hint` paraphrases what each
 * role paints in the compiled lab report HTML (see `helpers/templateHtml.ts`)
 * for a non-technical reader.
 */
export const colorRoleGroups: {
  title: string;
  caption: string;
  roles: { key: keyof TemplateColors; label: string; hint: string }[];
}[] = [
  {
    title: "Brand",
    caption: "What a patient notices first",
    roles: [
      { key: "color1", label: "Brand", hint: "Headers and main titles" },
      {
        key: "color10",
        label: "Section Header",
        hint: "Remarks / interpretation titles",
      },
      { key: "color2", label: "Accent", hint: "Sub-headers and logo strips" },
    ],
  },
  {
    title: "Text",
    caption: "Keep these dark enough to print",
    roles: [
      { key: "color9", label: "Emphasis", hint: "Lab name and key values" },
      { key: "color3", label: "Body", hint: "Main body text" },
      { key: "color4", label: "Muted", hint: "Field labels" },
    ],
  },
  {
    title: "Paper",
    caption: "Backgrounds and dividers",
    roles: [
      {
        key: "color8",
        label: "Page",
        hint: "Container background — keep this light",
      },
      {
        key: "color7",
        label: "Tint",
        hint: "Meta rows, patient grids and sidebars",
      },
      {
        key: "color5",
        label: "Lines",
        hint: "Cards, tables and section separators",
      },
    ],
  },
  {
    title: "Alert",
    caption: "Reserved for warnings — leave red unless you have a reason",
    roles: [
      {
        key: "color6",
        label: "Alert",
        hint: "Abnormal values and important notes",
      },
    ],
  },
];

/**
 * Presets only vary the three roles a lab assistant actually perceives as
 * "the theme" (brand, accent tint, section-header accent). Text/hairline/paper
 * roles stay at the legible defaults so no preset can produce an unreadable
 * report — the advanced list is where those become editable.
 */
const makePreset = (
  id: string,
  label: string,
  color1: string,
  color2: string,
  color10: string,
): ColorPreset => ({
  id,
  label,
  colors: { ...defaultColors, color1, color2, color10 },
});

export const colorPresets: ColorPreset[] = [
  makePreset("teal", "Teal", "#0F766E", "#ECFDF5", "#856404"),
  makePreset("indigo", "Indigo", "#3730A3", "#EEF2FF", "#6D28D9"),
  makePreset("navy", "Navy", "#1E3A5F", "#EFF4FA", "#0F5C8C"),
  makePreset("emerald", "Emerald", "#047857", "#ECFDF5", "#7C6410"),
  makePreset("burgundy", "Burgundy", "#8C2F39", "#FDF2F3", "#8A5A16"),
  makePreset("graphite", "Graphite", "#374151", "#F3F4F6", "#5B4A1F"),
];

export const fontOptions: FontOption[] = [
  { label: "Inter", value: "Inter, sans-serif", preview: "Inter" },
  { label: "Roboto", value: "Roboto, sans-serif", preview: "Roboto" },
  { label: "Open Sans", value: "Open Sans, sans-serif", preview: "Open Sans" },
  { label: "Lato", value: "Lato, sans-serif", preview: "Lato" },
  { label: "Montserrat", value: "Montserrat, sans-serif", preview: "Montserrat" },
  { label: "Poppins", value: "Poppins, sans-serif", preview: "Poppins" },
  { label: "Ubuntu", value: "Ubuntu, sans-serif", preview: "Ubuntu" },
  { label: "Nunito", value: "Nunito, sans-serif", preview: "Nunito" },
  { label: "Graphik", value: "Graphik, sans-serif", preview: "Graphik" },
  { label: "Rubik", value: "Rubik, sans-serif", preview: "Rubik" },
];

/**
 * The app itself only loads Outfit, so a font tile rendered in its own typeface
 * would silently fall back and every option would look identical. Pull the
 * selectable families in on demand — this runs only while the designer is open.
 * Graphik is not a Google font and intentionally has no entry; its tile falls
 * back, matching what the PDF renderer does with it.
 */
const FONT_LINK_ID = "lab-report-designer-fonts";

export const loadDesignerFonts = (): void => {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_LINK_ID)) return;

  const families = [
    "Inter:wght@400;600;700",
    "Roboto:wght@400;500;700",
    "Open+Sans:wght@400;600;700",
    "Lato:wght@400;700",
    "Montserrat:wght@400;600;700",
    "Poppins:wght@400;600;700",
    "Ubuntu:wght@400;500;700",
    "Nunito:wght@400;600;700",
    "Rubik:wght@400;500;700",
  ];

  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families
    .map((family) => `family=${family}`)
    .join("&")}&display=swap`;

  document.head.appendChild(link);
};

export const areColorsEqual = (a: TemplateColors, b: TemplateColors): boolean =>
  (Object.keys(a) as (keyof TemplateColors)[]).every(
    (key) => a[key].toLowerCase() === b[key].toLowerCase(),
  );
