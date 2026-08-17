import React from "react";
import {
  extractAnyId,
  extractAnyName,
  extractAnyStrength,
  normalizeKey,
} from "../helpers/medicineMappers";

type ToggleFavorite = (id: string) => { unwrap: () => Promise<unknown> };

/**
 * Favourite state for the picker.
 *
 * The server's "top used" list is the source of truth, but a just-toggled
 * medicine must flip instantly and survive until the refetch lands — hence the
 * local override map plus a local copy of medicines favourited this session
 * (which aren't in `topUsedMedicines` yet).
 */
export const useFavoriteMedicines = ({
  topUsedMedicines,
  canEdit,
  toggleFavorite,
  refetchTopUsed,
  showToast,
  canonicalizeMedicineId,
}: {
  topUsedMedicines: unknown[];
  canEdit: boolean;
  toggleFavorite: ToggleFavorite;
  refetchTopUsed: () => void;
  showToast: (msg: string) => void;
  canonicalizeMedicineId: (
    rawId: string,
    name?: string,
    strength?: string,
  ) => string;
}) => {
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>({});
  const [sessionFavorites, setSessionFavorites] = React.useState<
    Record<string, unknown>
  >({});

  const lookup = React.useMemo(() => {
    const byId = new Map<string, boolean>();
    const byNameStrength = new Map<string, boolean>();

    topUsedMedicines.forEach((m) => {
      const rawId = extractAnyId(m);
      const rawName = extractAnyName(m);
      const rawStrength = extractAnyStrength(m);
      const isFavorite = (m as { isFavorite?: boolean })?.isFavorite === true;

      if (rawId) byId.set(rawId, isFavorite);
      if (rawName) {
        byNameStrength.set(
          `${normalizeKey(rawName)}|${String(rawStrength ?? "").trim()}`,
          isFavorite,
        );
      }
    });

    return { byId, byNameStrength };
  }, [topUsedMedicines]);

  const keyFor = React.useCallback(
    (canonicalId: string, rawId: string, rawName: string, rawStrength: string) =>
      canonicalId ||
      rawId ||
      `${normalizeKey(rawName)}|${String(rawStrength ?? "").trim()}`,
    [],
  );

  const isFavorite = React.useCallback(
    (m: unknown) => {
      const rawId = extractAnyId(m);
      const rawName = extractAnyName(m);
      const rawStrength = extractAnyStrength(m);
      const cid = canonicalizeMedicineId(rawId, rawName, rawStrength);
      const override = overrides[keyFor(cid, rawId, rawName, rawStrength)];

      if (typeof override === "boolean") return override;

      const byId = lookup.byId.get(cid) ?? lookup.byId.get(rawId);
      if (typeof byId === "boolean") return byId;

      const byNameStrength = lookup.byNameStrength.get(
        `${normalizeKey(rawName)}|${String(rawStrength ?? "").trim()}`,
      );
      if (typeof byNameStrength === "boolean") return byNameStrength;

      return (m as { isFavorite?: boolean })?.isFavorite === true;
    },
    [canonicalizeMedicineId, keyFor, lookup, overrides],
  );

  const toggle = React.useCallback(
    async (m: unknown) => {
      if (!canEdit) {
        showToast("Please confirm the appointment first");
        return;
      }

      const rawId = extractAnyId(m);
      const rawName = extractAnyName(m);
      const rawStrength = extractAnyStrength(m);
      const cid = canonicalizeMedicineId(rawId, rawName, rawStrength);

      const record = m as { medicineId?: string; id?: string };
      const medicineId = String(
        record?.medicineId ?? record?.id ?? cid ?? rawId ?? "",
      ).trim();

      if (!medicineId) {
        showToast("Medicine id missing");
        return;
      }

      const key = keyFor(cid, rawId, rawName, rawStrength);
      const next = !isFavorite(m);

      try {
        await toggleFavorite(medicineId).unwrap();
        setOverrides((prev) => ({ ...prev, [key]: next }));
        setSessionFavorites((prev) => {
          if (!next) {
            const { [key]: _removed, ...rest } = prev;
            return rest;
          }
          return {
            ...prev,
            [key]: {
              ...(m as object),
              id: medicineId,
              medicineId,
              name: rawName,
              medicineName: rawName,
              strength: rawStrength,
              isFavorite: true,
            },
          };
        });
        refetchTopUsed();
      } catch {
        showToast("Failed to update favorite");
      }
    },
    [
      canEdit,
      canonicalizeMedicineId,
      isFavorite,
      keyFor,
      refetchTopUsed,
      showToast,
      toggleFavorite,
    ],
  );

  /**
   * Favourites first, then the rest of the recently-used list, de-duplicated —
   * this is what fills the picker before the doctor types anything.
   */
  const quickMedicines = React.useMemo(() => {
    const all = [...topUsedMedicines, ...Object.values(sessionFavorites)];
    const favorites = all.filter(isFavorite);
    const seen = new Set<string>();
    const out: unknown[] = [];

    for (const m of [...favorites, ...topUsedMedicines]) {
      const rawId = extractAnyId(m);
      const rawName = extractAnyName(m);
      const rawStrength = extractAnyStrength(m);
      const cid = canonicalizeMedicineId(rawId, rawName, rawStrength);
      const key = keyFor(cid, rawId, rawName, rawStrength);

      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }

    return out;
  }, [
    canonicalizeMedicineId,
    isFavorite,
    keyFor,
    sessionFavorites,
    topUsedMedicines,
  ]);

  return { isFavorite, toggle, quickMedicines };
};
