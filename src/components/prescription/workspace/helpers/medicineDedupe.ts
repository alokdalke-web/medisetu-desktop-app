/**
 * Name+form de-duplication for the global drug-database results.
 *
 * The shared database lists the same product under several spellings
 * ("Dolo 650 Tab" / "Dolo 650 Tablet"); this collapses them so the picker
 * shows each medicine once. Form is taken from the record when present and
 * otherwise inferred from the name.
 */

import { extractAnyForm, extractAnyName } from "./medicineMappers";

const FORM_ALIASES: { form: string; aliases: string[] }[] = [
  { form: "Tablet", aliases: ["tablet", "tablets", "tab", "tabs"] },
  { form: "Capsule", aliases: ["capsule", "capsules", "cap", "caps"] },
  { form: "Lozenge", aliases: ["lozenge", "lozenges"] },
  { form: "Sachet", aliases: ["sachet", "sachets"] },
  { form: "Granules", aliases: ["granules"] },
  { form: "Powder", aliases: ["powder", "powders"] },
  { form: "Syrup", aliases: ["syrup", "syrups"] },
  { form: "Suspension", aliases: ["suspension", "suspensions"] },
  { form: "Liquid", aliases: ["liquid", "liquids"] },
  { form: "Drops", aliases: ["drops", "drop"] },
  { form: "Cream", aliases: ["cream", "creams"] },
  { form: "Ointment", aliases: ["ointment", "ointments"] },
  { form: "Gel", aliases: ["gel", "gels"] },
  { form: "Lotion", aliases: ["lotion", "lotions"] },
  { form: "Paste", aliases: ["paste", "pastes"] },
  { form: "Spray", aliases: ["spray", "sprays"] },
  { form: "Foam", aliases: ["foam", "foams"] },
  { form: "Mouthwash", aliases: ["mouthwash", "mouth wash"] },
  { form: "Oral Rinse", aliases: ["oral rinse", "oral rinses"] },
  { form: "Dental Cement", aliases: ["dental cement", "dental cements"] },
  { form: "Dental Varnish", aliases: ["dental varnish", "dental varnishes"] },
  { form: "Injection", aliases: ["injection", "injections", "inj"] },
  { form: "Inhaler", aliases: ["inhaler", "inhalers"] },
  { form: "Patch", aliases: ["patch", "patches"] },
  { form: "Suppository", aliases: ["suppository", "suppositories"] },
  { form: "Shampoo", aliases: ["shampoo", "shampoos"] },
  { form: "Soap", aliases: ["soap", "soaps"] },
  { form: "Facewash", aliases: ["facewash", "face wash"] },
  { form: "Conditioner", aliases: ["conditioner", "conditioners"] },
  { form: "Toothpaste", aliases: ["toothpaste", "tooth paste"] },
  { form: "Mouth Gel", aliases: ["mouth gel", "mouth gels"] },
  { form: "Handwash", aliases: ["handwash", "hand wash"] },
  { form: "Sanitizer", aliases: ["sanitizer", "sanitizers"] },
  { form: "Oil", aliases: ["oil", "oils"] },
]
  // Longest alias first so "mouth wash" wins over a bare "wash"-style prefix.
  .map(({ form, aliases }) => ({
    form,
    aliases: [...aliases].sort((a, b) => b.length - a.length),
  }))
  .sort((a, b) => b.aliases[0].length - a.aliases[0].length);

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const inferForm = (name: string) => {
  const padded = ` ${normalize(name)} `;

  for (const { form, aliases } of FORM_ALIASES) {
    if (aliases.some((alias) => padded.includes(` ${normalize(alias)} `))) {
      return form;
    }
  }

  return "-";
};

/** `""` when the record has no usable name — callers should skip those. */
export const getMedicineNameFormKey = (medicine: unknown) => {
  const name = extractAnyName(medicine as never);
  const nameKey = normalize(name);
  if (!nameKey) return "";

  const form = extractAnyForm(medicine as never) || inferForm(name);
  return `${nameKey}|${normalize(form) || "-"}`;
};

/**
 * Drop global results that duplicate each other or a clinic medicine the
 * doctor can already pick from the section above.
 */
export const dedupeGlobalMedicines = <T,>(
  globalItems: T[],
  clinicItems: unknown[],
): T[] => {
  const clinicKeys = new Set(
    clinicItems.map(getMedicineNameFormKey).filter(Boolean),
  );
  const seen = new Set<string>();

  return globalItems.filter((item) => {
    const key = getMedicineNameFormKey(item);
    if (!key || clinicKeys.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
