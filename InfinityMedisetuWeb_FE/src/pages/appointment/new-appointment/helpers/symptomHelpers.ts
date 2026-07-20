import type { ClinicSymptomItem, SymptomDraft } from "../types";

export const makeId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random()
    .toString(16)
    .slice(2)}`;

export const mkSymptom = (name = ""): SymptomDraft => ({ id: makeId(), name });

export const normalizeSymptomText = (value: string) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const isDuplicateSymptomName = (
  list: SymptomDraft[],
  name: string,
  currentId?: string,
) => {
  const normalized = normalizeSymptomText(name);
  if (!normalized) return false;

  return list.some(
    (item) =>
      item.id !== currentId && normalizeSymptomText(item.name) === normalized,
  );
};

export const normalizeClinicSymptoms = (resp: any): ClinicSymptomItem[] => {
  if (!resp) return [];
  const src =
    resp?.result?.data ??
    resp?.result?.symptoms ??
    resp?.result ??
    resp?.data ??
    resp?.symptoms ??
    [];
  if (!Array.isArray(src)) return [];
  return src
    .map((x: any) => ({
      id: x?.id,
      _id: x?._id,
      name: x?.name,
      status: x?.status,
    }))
    .filter((x: any) => String(x?.name ?? "").trim());
};
