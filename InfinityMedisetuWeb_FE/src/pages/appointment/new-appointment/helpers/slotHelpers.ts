import type {
  Slot,
  SlotStatus,
  TimeSlot,
  TokenMeta,
  TokenSlot,
} from "../types";
import { calcDurationMinutes, extractTimeLabel } from "./dateTimeHelpers";

export const normalizeStatus = (raw: any): SlotStatus => {
  const s = String(raw ?? "available").toLowerCase();
  if (s.includes("book")) return "booked";
  if (s.includes("reserv")) return "reserved";
  if (s.includes("break")) return "break";
  return "available";
};

export const normalizeSlotsFromApi = (resp: any, filterDate?: string): Slot[] => {
  if (!resp) return [];

  let src: any = resp;
  if (!Array.isArray(src)) {
    src = resp.result ?? resp.slots ?? resp.data ?? resp.availableSlots ?? [];
  }
  if (!Array.isArray(src)) return [];

  const isTokenResponse = src.some((x: any) => Array.isArray(x?.tokens));

  if (isTokenResponse) {
    const out: Slot[] = [];

    src.forEach((dayItem: any, dayIdx: number) => {
      const rawStart = dayItem?.start ?? dayItem?.startTime ?? dayItem?.from;
      if (!rawStart) return;

      const dayDateIso = String(rawStart).slice(0, 10).replace(/\//g, "-");
      if (filterDate && dayDateIso !== filterDate) return;

      const weekday = (() => {
        const d = new Date(`${dayDateIso}T00:00:00`);
        return isNaN(d.getTime())
          ? ""
          : d.toLocaleDateString("en-US", { weekday: "short" });
      })();

      const caid = String(dayItem?.clinicAvailabilityId ?? "");

      const tokens: any[] = Array.isArray(dayItem?.tokens)
        ? dayItem.tokens
        : [];
      tokens.forEach((t: any, idx: number) => {
        const tokenNo = Number(t?.tokenNo ?? t?.token ?? idx + 1);
        if (!Number.isFinite(tokenNo)) return;

        const st = normalizeStatus(t?.status ?? dayItem?.status ?? "available");

        out.push({
          kind: "token",
          id: `${caid || "ca"}-token-${tokenNo}-${dayIdx}-${idx}`,
          tokenNo,
          status: st,
          dateIso: dayDateIso,
          weekday,
          clinicAvailabilityId: caid || undefined,
        } as TokenSlot);
      });
    });

    return out;
  }

  return src
    .map((x: any, idx: number) => {
      const rawStart =
        x.startTime ?? x.start ?? x.fromTime ?? x.from ?? x.slotStart;
      const rawEnd = x.endTime ?? x.end ?? x.toTime ?? x.to ?? x.slotEnd;

      if (!rawStart || !rawEnd) return null;

      const startStr = String(rawStart);
      const slotDateIso = startStr.slice(0, 10).replace(/\//g, "-");

      if (filterDate && slotDateIso && slotDateIso !== filterDate) return null;

      const weekday = (() => {
        const d = new Date(startStr);
        return isNaN(d.getTime())
          ? ""
          : d.toLocaleDateString("en-US", { weekday: "short" });
      })();

      const startLabel = extractTimeLabel(rawStart);
      const endLabel = extractTimeLabel(rawEnd);
      if (!startLabel || !endLabel) return null;

      const durationMinutes = calcDurationMinutes(rawStart, rawEnd);

      const keyBase = String(
        x.id ??
          x.slotId ??
          x.breakId ??
          x.appointmentId ??
          x.clinicAvailabilityId ??
          "slot",
      );

      const uniqueId = `${keyBase}-${String(rawStart)}-${String(rawEnd)}-${idx}`;

      return {
        kind: "time",
        id: uniqueId,
        startTime: startLabel,
        endTime: endLabel,
        status: normalizeStatus(x.status ?? x.source),
        durationMinutes,
        dateIso: slotDateIso,
        weekday,
      } as TimeSlot;
    })
    .filter(Boolean) as Slot[];
};

export const groupSlotsIntoMultipleShifts = (
  slots: Slot[],
  shiftLabelsFromApi: string[] = [],
): { shifts: TimeSlot[][]; shiftLabels: string[] } => {
  if (slots.length === 0 || slots[0].kind === "token") {
    return { shifts: [], shiftLabels: [] };
  }

  const timeSlots = slots.filter((s): s is TimeSlot => s.kind === "time");

  const breakIndices: number[] = [];
  timeSlots.forEach((slot, idx) => {
    if (slot.status === "break") {
      breakIndices.push(idx);
    }
  });

  const resultShifts: TimeSlot[][] = [];
  let startIdx = 0;

  for (const breakIdx of breakIndices) {
    let breakEndIdx = breakIdx;
    while (
      breakEndIdx < timeSlots.length &&
      timeSlots[breakEndIdx].status === "break"
    ) {
      breakEndIdx++;
    }

    if (startIdx < breakIdx) {
      const shiftSlots = timeSlots.slice(startIdx, breakIdx);
      if (shiftSlots.length > 0) {
        resultShifts.push(shiftSlots);
      }
    }

    startIdx = breakEndIdx;
  }

  if (startIdx < timeSlots.length) {
    const remainingSlots = timeSlots.slice(startIdx);
    if (remainingSlots.length > 0) {
      resultShifts.push(remainingSlots);
    }
  }

  const shiftLabels =
    shiftLabelsFromApi.length === resultShifts.length
      ? shiftLabelsFromApi
      : resultShifts.map((shift, idx) => {
          const firstSlot = shift[0];
          const lastSlot = shift[shift.length - 1];
          if (firstSlot && lastSlot) {
            const formatTimeWithAMPM = (time: string): string => {
              const [hour, minute] = time.split(":").map(Number);
              const ampm = hour >= 12 ? "PM" : "AM";
              const hour12 = hour % 12 || 12;
              return `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;
            };
            return `${formatTimeWithAMPM(firstSlot.startTime)} - ${formatTimeWithAMPM(lastSlot.endTime)}`;
          }
          return `Shift ${idx + 1}`;
        });

  return {
    shifts: resultShifts,
    shiftLabels: shiftLabels,
  };
};

export const extractTokenMetaFromApi = (
  resp: any,
  filterDate?: string,
): TokenMeta | null => {
  if (!resp) return null;

  let src: any = resp;
  if (!Array.isArray(src)) src = resp.result ?? resp.data ?? [];
  if (!Array.isArray(src)) return null;

  const day = src.find((dayItem: any) => {
    const rawStart = dayItem?.start ?? dayItem?.startTime ?? dayItem?.from;
    if (!rawStart) return false;
    const dayDateIso = String(rawStart).slice(0, 10).replace(/\//g, "-");
    return filterDate ? dayDateIso === filterDate : true;
  });

  if (!day) return null;

  const rawAuto = day?.autoToken;

  let autoToken: number | undefined = undefined;
  if (rawAuto != null && rawAuto !== "-" && rawAuto !== "") {
    const n = Number(rawAuto);
    if (Number.isFinite(n)) autoToken = n;
  }

  const totalTokens =
    day?.totalTokens != null ? Number(day.totalTokens) : undefined;
  const availableTokens =
    day?.availableTokens != null ? Number(day.availableTokens) : undefined;

  return { autoToken, totalTokens, availableTokens };
};
