import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Spinner, addToast } from "@heroui/react";
import { FiPlus, FiTrash2, FiCalendar } from "react-icons/fi";

/* ---------------- Types ---------------- */

export type DateTimeSlot = {
  id?: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  notes?: string | null;
};

export type DateAvailabilityItem = {
  id?: string;
  date: string; // YYYY-MM-DD
  isAvailable: boolean; // false => Full day leave, true => custom working hours
  notes?: string | null;
  slotMinutes?: number;
  stepMinutes?: number;
  timeSlots: DateTimeSlot[];
};

/** AvailabilitySlot only needed to keep payload shape correct */
export type Break = {
  breakType?: string | null;
  startTime: string;
  endTime: string;
  status?: boolean;
  notes?: string | null;
};

export type AvailabilitySlot = {
  id?: string;
  dayOfWeek: string;
  startTime: string | null;
  endTime: string | null;
  isAvailable: boolean;
  notes?: string | null;
  slotMinutes?: number;
  stepMinutes?: number;
  aivblityBreak?: Break[];
  availabilityBreak?: Break[];
  breaks?: Break[];
};

/* ---------------- Helpers ---------------- */

function ymdToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeDateOnly(v: any): string {
  if (!v) return "";
  const s = String(v);
  if (s.includes("T")) return s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function formatDatePretty(yyyyMmDd: string) {
  if (!yyyyMmDd) return "—";
  try {
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(dt);
  } catch {
    return yyyyMmDd;
  }
}

function makeTimeOptions(step = 30) {
  const out: string[] = [];
  for (let min = 0; min < 24 * 60; min += step) {
    const hh24 = Math.floor(min / 60);
    const mm = String(min % 60).padStart(2, "0");
    const ap = hh24 >= 12 ? "PM" : "AM";
    let hh = hh24 % 12;
    if (hh === 0) hh = 12;
    const hhStr = String(hh).padStart(2, "0");
    out.push(`${hhStr}:${mm} ${ap}`);
  }
  return out;
}

const TIME_OPTIONS = makeTimeOptions(30);

/* ---------------- Draft Model ---------------- */

type Draft = {
  key: string; // local key (id/date/tmp)
  id?: string;
  date: string; // YYYY-MM-DD
  exceptionType: "full" | "custom"; // full day leave OR custom working hours
  from: string; // for custom
  to: string; // for custom
};

function keyOfItem(d: DateAvailabilityItem) {
  return d.id || d.date;
}

function draftFromItem(d: DateAvailabilityItem, fallbackFrom: string, fallbackTo: string): Draft {
  const isFull = !d.isAvailable;
  const first = Array.isArray(d.timeSlots) && d.timeSlots.length ? d.timeSlots[0] : null;

  return {
    key: keyOfItem(d),
    id: d.id,
    date: normalizeDateOnly(d.date),
    exceptionType: isFull ? "full" : "custom",
    from: first?.startTime || fallbackFrom,
    to: first?.endTime || fallbackTo,
  };
}

/* ---------------- Component ---------------- */

type Props = {
  isLoading: boolean;

  /** Needed so we can save/delete by calling update payload */
  availability: AvailabilitySlot[];
  dateAvailability: DateAvailabilityItem[];

  /** call API in parent OR refetch in parent after save/delete */
  onSaveAll: (nextDateAvailability: DateAvailabilityItem[]) => Promise<void>;
};

const ClinicAvailabilityLeavesTab: React.FC<Props> = ({
  isLoading,
  availability,
  dateAvailability,
  onSaveAll,
}) => {
  // pick default daily window (first available day OR 09-05)
  const defaultWindow = useMemo(() => {
    const firstAvail = availability.find((a) => a.isAvailable && a.startTime && a.endTime);
    return {
      from: firstAvail?.startTime || "09:00 AM",
      to: firstAvail?.endTime || "05:00 PM",
    };
  }, [availability]);

  const sorted = useMemo(() => {
    const arr = [...dateAvailability].map((d) => ({
      ...d,
      date: normalizeDateOnly(d.date),
    }));
    // latest first (like screenshot)
    arr.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return arr;
  }, [dateAvailability]);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // keep drafts in sync (do not overwrite user edits if already changed)
  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const d of sorted) {
        const k = keyOfItem(d);
        if (!next[k]) next[k] = draftFromItem(d, defaultWindow.from, defaultWindow.to);
      }
      // remove drafts that no longer exist (except tmp)
      for (const k of Object.keys(next)) {
        const isTmp = k.startsWith("tmp:");
        if (isTmp) continue;
        const stillExists = sorted.some((x) => keyOfItem(x) === k);
        if (!stillExists) delete next[k];
      }
      return next;
    });
  }, [sorted, defaultWindow.from, defaultWindow.to]);

  const addLeave = () => {
    const tmpKey = `tmp:${Date.now()}`;
    setDrafts((p) => ({
      ...p,
      [tmpKey]: {
        key: tmpKey,
        date: ymdToday(),
        exceptionType: "full",
        from: defaultWindow.from,
        to: defaultWindow.to,
      },
    }));
  };

  const updateDraft = (k: string, patch: Partial<Draft>) => {
    setDrafts((p) => ({ ...p, [k]: { ...p[k], ...patch } }));
  };

  const cancelChanges = (k: string) => {
    // if tmp => remove
    if (k.startsWith("tmp:")) {
      setDrafts((p) => {
        const copy = { ...p };
        delete copy[k];
        return copy;
      });
      return;
    }

    // reset to server item
    const current = sorted.find((x) => keyOfItem(x) === k);
    if (!current) return;

    setDrafts((p) => ({
      ...p,
      [k]: draftFromItem(current, defaultWindow.from, defaultWindow.to),
    }));
  };

  const draftToItem = (d: Draft): DateAvailabilityItem => {
    const date = normalizeDateOnly(d.date);

    if (d.exceptionType === "full") {
      return {
        id: d.id,
        date,
        isAvailable: false,
        notes: "",
        timeSlots: [],
      };
    }

    // custom working hours
    return {
      id: d.id,
      date,
      isAvailable: true,
      notes: "",
      slotMinutes: 30,
      stepMinutes: 15,
      timeSlots: [
        {
          startTime: d.from,
          endTime: d.to,
          isAvailable: true,
          notes: "",
        },
      ],
    };
  };

  const saveOne = async (k: string) => {
    const d = drafts[k];
    if (!d?.date) {
      addToast({
        title: "Missing date",
        description: "Please select a date.",
        color: "warning",
      });
      return;
    }

    // basic validation for custom
    if (d.exceptionType === "custom" && (!d.from || !d.to)) {
      addToast({
        title: "Missing time",
        description: "Please select From and To time.",
        color: "warning",
      });
      return;
    }

    const nextItem = draftToItem(d);

    try {
      setSavingKey(k);

      // replace by id OR by date
      const nextList = [...dateAvailability]
        .map((x) => ({ ...x, date: normalizeDateOnly(x.date) }))
        .filter((x) => {
          const sameId = d.id && x.id === d.id;
          const sameDate = normalizeDateOnly(x.date) === nextItem.date;
          return !(sameId || sameDate);
        });

      nextList.unshift(nextItem); // newest top
      await onSaveAll(nextList);

      addToast({
        title: "Saved",
        description: "Leave updated successfully.",
        color: "success",
      });

      // if tmp, convert key will happen via refetch; for now keep it
    } catch (e) {
      console.error(e);
    //   addToast({
    //     title: "Save failed",
    //     description: "Unable to save leave. Please try again.",
    //     color: "danger",
    //   });
    } finally {
      setSavingKey(null);
    }
  };

  const deleteOne = async (k: string) => {
    // tmp draft => local remove
    if (k.startsWith("tmp:")) {
      cancelChanges(k);
      return;
    }

    const d = drafts[k];
    const item = sorted.find((x) => keyOfItem(x) === k);

    if (!d && !item) return;

    try {
      setDeletingKey(k);

      const nextList = [...dateAvailability]
        .map((x) => ({ ...x, date: normalizeDateOnly(x.date) }))
        .filter((x) => {
          const sameId = d?.id && x.id === d.id;
          const sameDate = normalizeDateOnly(x.date) === (item?.date || d?.date);
          return !(sameId || sameDate);
        });

      await onSaveAll(nextList);

      addToast({
        title: "Deleted",
        description: "Leave removed successfully.",
        color: "success",
      });
    } catch (e) {
      console.error(e);
      addToast({
        title: "Delete failed",
        description: "Unable to delete leave. Please try again.",
        color: "danger",
      });
    } finally {
      setDeletingKey(null);
    }
  };

  const allKeys = useMemo(() => {
    const keys: string[] = [];

    // tmp drafts first (newest)
    const tmp = Object.keys(drafts)
      .filter((k) => k.startsWith("tmp:"))
      .sort((a, b) => b.localeCompare(a));

    keys.push(...tmp);

    // server items
    for (const d of sorted) keys.push(keyOfItem(d));

    // make unique
    return Array.from(new Set(keys));
  }, [drafts, sorted]);

  const headerRange = (d: Draft) => {
    if (d.exceptionType === "custom") return `${d.from} - ${d.to}`;
    // Full day leave show default window (like figma)
    return `${defaultWindow.from} - ${defaultWindow.to}`;
  };

  return (
    <div className="space-y-4">
      {/* Add Leave Button */}
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          className="bg-emerald-700 text-white rounded-lg px-5"
          startContent={<FiPlus />}
          onPress={addLeave}
        >
          Add Leave
        </Button>

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Spinner size="sm" />
            Loading…
          </div>
        )}
      </div>

      {/* Empty state */}
      {!isLoading && allKeys.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No leaves added.
        </div>
      )}

      {/* Cards */}
      <div className="space-y-4">
        {allKeys.map((k) => {
          const d = drafts[k];
          if (!d) return null;

          const isSaving = savingKey === k;
          const isDeleting = deletingKey === k;

          const isFull = d.exceptionType === "full";

          return (
            <div
              key={k}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Top header row */}
              <div className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                    <FiCalendar className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-base font-semibold text-slate-900">
                      {formatDatePretty(d.date)}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-md px-2 py-0.5 font-semibold ${
                          isFull
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {isFull ? "FULL DAY LEAVE" : "PARTIAL LEAVE"}
                      </span>

                      <span className="text-emerald-700 font-medium">
                        {headerRange(d)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteOne(k)}
                  disabled={isDeleting || isSaving}
                  className="grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 transition disabled:opacity-60"
                  aria-label="Delete leave"
                  title="Delete"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-100" />

              {/* Body */}
              <div className="px-5 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Exception Type */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-800">
                      Exception Type
                    </label>
                    <select
                      value={d.exceptionType}
                      onChange={(e) =>
                        updateDraft(k, {
                          exceptionType: e.target.value as Draft["exceptionType"],
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-300"
                    >
                      <option value="full">Full Day Leave</option>
                      <option value="custom">Custom Working Hours</option>
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-800">
                      Date
                    </label>

                    {/* Using type="date" (value must be YYYY-MM-DD) */}
                    <Input
                      type="date"
                      variant="bordered"
                      value={d.date}
                      onValueChange={(v) => updateDraft(k, { date: v })}
                      classNames={{
                        inputWrapper:
                          "rounded-full border-slate-200 h-12 bg-white",
                      }}
                    />
                  </div>
                </div>

                {/* From / To only for Custom */}
                {!isFull && (
                  <div className="mt-4 grid gap-4 md:grid-cols-12 items-end">
                    <div className="md:col-span-5">
                      <label className="mb-2 block text-sm font-medium text-slate-800">
                        From
                      </label>
                      <select
                        value={d.from}
                        onChange={(e) => updateDraft(k, { from: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-300"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2 flex justify-center">
                      <div className="mt-7 grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-emerald-700">
                        →
                      </div>
                    </div>

                    <div className="md:col-span-5">
                      <label className="mb-2 block text-sm font-medium text-slate-800">
                        To
                      </label>
                      <select
                        value={d.to}
                        onChange={(e) => updateDraft(k, { to: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-300"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Footer buttons */}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    variant="bordered"
                    className="rounded-full border-emerald-700 text-emerald-700"
                    onPress={() => cancelChanges(k)}
                    isDisabled={isSaving || isDeleting}
                  >
                    Cancel Changes
                  </Button>

                  <Button
                    className="rounded-full bg-emerald-700 text-white"
                    onPress={() => saveOne(k)}
                    isLoading={isSaving}
                    isDisabled={isDeleting}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClinicAvailabilityLeavesTab;
