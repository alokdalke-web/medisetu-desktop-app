import type {
  ColorPreset,
  FontOption,
  TemplateColors,
  TemplateOption,
} from "../../../../types/prescription";

export const defaultColors: TemplateColors = {
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

/**
 * Short role names for the advanced colour list. The backend contract in
 * `docs/prescription-templates.md` is the source of truth for what each role
 * actually paints; `hint` paraphrases it for a non-technical reader.
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
      { key: "color1", label: "Brand", hint: "Headings, rules and the ℞ symbol" },
      { key: "color10", label: "Advice", hint: "Advice and investigation blocks" },
      { key: "color2", label: "Accent", hint: "Soft borders and logo strips" },
    ],
  },
  {
    title: "Text",
    caption: "Keep these dark enough to print",
    roles: [
      { key: "color9", label: "Emphasis", hint: "Doctor and medicine names" },
      { key: "color3", label: "Body", hint: "Main paragraph text" },
      { key: "color4", label: "Muted", hint: "Field labels and meta lines" },
    ],
  },
  {
    title: "Paper",
    caption: "Backgrounds and dividers",
    roles: [
      { key: "color8", label: "Page", hint: "Sheet background — keep this light" },
      { key: "color7", label: "Tint", hint: "Patient card and striped rows" },
      { key: "color5", label: "Lines", hint: "Table and row dividers" },
    ],
  },
  {
    title: "Alert",
    caption: "Reserved for warnings — leave red unless you have a reason",
    roles: [
      { key: "color6", label: "Alert", hint: "Warnings and important notes" },
    ],
  },
];

/**
 * Presets only vary the three roles a doctor actually perceives as "the theme"
 * (brand, accent tint, advice accent). Text/hairline/paper roles stay at the
 * legible defaults so no preset can produce an unreadable prescription — the
 * advanced list is where those become editable.
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
  makePreset("teal", "Teal", "#0A6C74", "#EBFCF4", "#856404"),
  makePreset("indigo", "Indigo", "#3730A3", "#EEF2FF", "#6D28D9"),
  makePreset("navy", "Navy", "#1E3A5F", "#EFF4FA", "#0F5C8C"),
  makePreset("emerald", "Emerald", "#047857", "#ECFDF5", "#7C6410"),
  makePreset("burgundy", "Burgundy", "#8C2F39", "#FDF2F3", "#8A5A16"),
  makePreset("graphite", "Graphite", "#374151", "#F3F4F6", "#5B4A1F"),
];

/**
 * Per-template starting palette. Most templates open on the house teal; Template 6
 * opens on navy so the two card-style layouts do not look like the same
 * prescription twice in the picker. Only brand/accent/advice differ — text and
 * paper roles stay at the legible defaults, same rule as `makePreset`.
 *
 * Applied on template switch only while the doctor is still on an untouched
 * palette (see `isUntouchedPalette`), so it can never discard custom colours.
 */
export const templateDefaultColors: Record<string, TemplateColors> = {
  template6: { ...defaultColors, color1: "#1E3A5F", color2: "#EFF4FA", color10: "#0F5C8C" },
};

export const getTemplateDefaultColors = (template: string): TemplateColors =>
  templateDefaultColors[template] ?? defaultColors;

const sameColors = (a: TemplateColors, b: TemplateColors) =>
  (Object.keys(a) as (keyof TemplateColors)[]).every(
    (key) => (a[key] || "").toLowerCase() === (b[key] || "").toLowerCase(),
  );

/** True while the palette still matches some template's out-of-the-box default. */
export const isUntouchedPalette = (colors: TemplateColors): boolean =>
  sameColors(colors, defaultColors) ||
  Object.values(templateDefaultColors).some((preset) => sameColors(colors, preset));

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
 * Picker order, not template numbering — the newest card layouts lead because
 * they are the ones we want doctors to land on. The `value` keys are what get
 * persisted, so reordering this list is display-only and never migrates a
 * doctor's saved template.
 */
export const templateOptions: TemplateOption[] = [
  {
    value: "template6",
    label: "Clinical Card",
    description: "Vitals strip, dose slots",
  },
  {
    value: "template5",
    label: "Clinical Rail",
    description: "Banner + side rail notes",
  },
  {
    value: "template1",
    label: "Classic Medical",
    description: "Minimal, ruled margin",
  },
  {
    value: "template2",
    label: "Modern Clinical",
    description: "Formal letterhead",
  },
  {
    value: "template3",
    label: "Medi Handwritten",
    description: "Cream pad, script values",
  },
  {
    value: "template4",
    label: "Elegant Health Care",
    description: "Colour banner header",
  },
];

/**
 * The app itself only loads Outfit, so a font tile rendered in its own typeface
 * would silently fall back and every option would look identical. Pull the
 * selectable families in on demand — this runs only while the designer is open.
 * Graphik is not a Google font and intentionally has no entry; its tile falls
 * back, matching what the PDF renderer does with it.
 */
const FONT_LINK_ID = "prescription-designer-fonts";

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
