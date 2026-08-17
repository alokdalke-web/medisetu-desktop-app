import React from "react";
import { normalizeKey } from "../helpers/medicineMappers";
import { createQuickDoseDraft } from "../components/search/rowUtils";
import type { QuickDoseDraft } from "../../../../types/prescription";

const STORAGE_VERSION = "v1";
const MAX_REMEMBERED = 300;

type MemoryFile = {
  /** medicine key → the dose last prescribed for it. */
  byMedicine: Record<string, QuickDoseDraft>;
  /** The most recent dose overall, whatever the medicine. */
  last?: QuickDoseDraft;
  /** Insertion order, oldest first, for trimming. */
  order: string[];
};

const emptyFile = (): MemoryFile => ({ byMedicine: {}, order: [] });

const storageKey = (doctorId: string) =>
  `rx-dose-memory:${STORAGE_VERSION}:${doctorId || "anon"}`;

const medicineKey = (name: string, strength?: string) =>
  `${normalizeKey(name)}|${String(strength ?? "").trim().toLowerCase()}`;

const read = (doctorId: string): MemoryFile => {
  try {
    const raw = window.localStorage.getItem(storageKey(doctorId));
    if (!raw) return emptyFile();

    const parsed = JSON.parse(raw) as Partial<MemoryFile>;
    return {
      byMedicine: parsed.byMedicine ?? {},
      last: parsed.last,
      order: parsed.order ?? [],
    };
  } catch {
    // Corrupt or unavailable storage (private mode, quota) must never break
    // prescribing — fall back to "no memory".
    return emptyFile();
  }
};

const write = (doctorId: string, file: MemoryFile) => {
  try {
    window.localStorage.setItem(storageKey(doctorId), JSON.stringify(file));
  } catch {
    /* Storage full or blocked — memory is a convenience, not a requirement. */
  }
};

/**
 * Remembers the dose a doctor last chose for each medicine, so the picker can
 * pre-fill it next time instead of always defaulting to 1-1-1 for 5 days.
 *
 * Deliberately client-side: no endpoint exposes a doctor's previous dose for a
 * given medicine (`MedicineDto` carries no dose fields and the prescription
 * history API returns PDF metadata only), and this work is scoped to the UI.
 * The consequence is that memory is per-browser — a doctor moving to a
 * different machine sees the plain defaults again, which is why the picker
 * labels a recalled dose rather than applying it silently.
 */
export const useDoseMemory = (doctorId: string) => {
  const [file, setFile] = React.useState<MemoryFile>(() => read(doctorId));

  React.useEffect(() => {
    setFile(read(doctorId));
  }, [doctorId]);

  /**
   * Best known starting dose for a medicine:
   * its own remembered dose → the last dose used at all → the plain default.
   */
  const recall = React.useCallback(
    (
      name: string,
      strength?: string,
    ): { draft: QuickDoseDraft; source: "medicine" | "recent" | "default" } => {
      const remembered = file.byMedicine[medicineKey(name, strength)];
      if (remembered) return { draft: remembered, source: "medicine" };

      // Falling back to the previous medicine's duration/timing (but not its
      // schedule, which is far more medicine-specific) matches how a course is
      // usually written: same length, same food timing, different frequency.
      if (file.last) {
        return {
          draft: createQuickDoseDraft({
            days: file.last.days,
            timing: file.last.timing,
            frequency: file.last.frequency,
          }),
          source: "recent",
        };
      }

      return { draft: createQuickDoseDraft(), source: "default" };
    },
    [file],
  );

  const remember = React.useCallback(
    (name: string, strength: string | undefined, draft: QuickDoseDraft) => {
      const key = medicineKey(name, strength);
      if (!key.trim() || key === "|") return;

      setFile((prev) => {
        const order = [...prev.order.filter((k) => k !== key), key];
        const byMedicine = { ...prev.byMedicine, [key]: draft };

        // Bound the file so long-running clinics don't grow it forever.
        while (order.length > MAX_REMEMBERED) {
          const oldest = order.shift();
          if (oldest) delete byMedicine[oldest];
        }

        const next: MemoryFile = { byMedicine, last: draft, order };
        write(doctorId, next);
        return next;
      });
    },
    [doctorId],
  );

  return { recall, remember };
};
