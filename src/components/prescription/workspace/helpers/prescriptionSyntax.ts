/**
 * One-line prescription syntax.
 *
 * Lets a doctor write a whole line — `DOLO 650 1-1-1 5d af` — and press Enter,
 * instead of picking a medicine and then filling five separate dose controls.
 * The medicine name is whatever precedes the first recognised modifier, so
 * strengths that look numeric ("DOLO 650", "TELMA 40") stay part of the name:
 * a duration must carry a d/w unit, and a schedule must be three 0-2 digits.
 *
 * Everything is optional. Typing only a name behaves exactly as before.
 */

import type { QuickDoseArg } from "../../../../types/prescription";

const TIMING_ALIASES: Record<string, string> = {
  af: "After Food",
  pc: "After Food",
  bf: "Before Food",
  ac: "Before Food",
  es: "Empty stomach",
  empty: "Empty stomach",
};

const SCHEDULE_DASHED = /^[0-2]-[0-2]-[0-2]$/;
const SCHEDULE_DIGITS = /^[0-2]{3}$/;
const DURATION_DAYS = /^(\d{1,3})\s*(?:d|day|days)$/i;
const DURATION_WEEKS = /^(\d{1,2})\s*(?:w|wk|wks|week|weeks)$/i;

export type ParsedToken =
  | { kind: "schedule"; label: string; value: string }
  | { kind: "duration"; label: string; days: number; weekly: boolean }
  | { kind: "timing"; label: string; value: string }
  | { kind: "instruction"; label: string; value: string };

export type ParsedPrescriptionInput = {
  /** The part to search medicines with — never includes dose modifiers. */
  medicineTerm: string;
  /** Dose overrides to hand to `addMedicineDirect`; empty when none typed. */
  quick: QuickDoseArg;
  /** Recognised modifiers, for the live interpretation bar. */
  tokens: ParsedToken[];
  /** True when at least one modifier was recognised. */
  hasModifiers: boolean;
};

const classify = (raw: string): ParsedToken | null => {
  const token = raw.trim();
  if (!token) return null;

  if (SCHEDULE_DASHED.test(token)) {
    return { kind: "schedule", label: token, value: token };
  }

  if (SCHEDULE_DIGITS.test(token)) {
    const value = `${token[0]}-${token[1]}-${token[2]}`;
    return { kind: "schedule", label: value, value };
  }

  const weeks = token.match(DURATION_WEEKS);
  if (weeks) {
    const n = Math.max(1, Math.min(52, Number(weeks[1])));
    return {
      kind: "duration",
      label: `${n} week${n > 1 ? "s" : ""}`,
      days: n,
      weekly: true,
    };
  }

  const days = token.match(DURATION_DAYS);
  if (days) {
    const n = Math.max(1, Math.min(365, Number(days[1])));
    return {
      kind: "duration",
      label: `${n} day${n > 1 ? "s" : ""}`,
      days: n,
      weekly: false,
    };
  }

  const timing = TIMING_ALIASES[token.toLowerCase()];
  if (timing) return { kind: "timing", label: timing, value: timing };

  return null;
};

export const parsePrescriptionInput = (
  input: string,
): ParsedPrescriptionInput => {
  const source = String(input ?? "");

  // Everything after "//" is a free-text instruction and is never tokenised.
  const noteSplit = source.indexOf("//");
  const instruction =
    noteSplit >= 0 ? source.slice(noteSplit + 2).trim() : "";
  const head = noteSplit >= 0 ? source.slice(0, noteSplit) : source;

  const words = head.split(/\s+/).filter(Boolean);
  const tokens: ParsedToken[] = [];

  // Walk from the end: modifiers always trail the medicine name, so the first
  // word (from the right) that isn't a modifier ends the name.
  let cut = words.length;
  for (let i = words.length - 1; i >= 0; i -= 1) {
    const parsed = classify(words[i]);
    if (!parsed) break;
    tokens.unshift(parsed);
    cut = i;
  }

  const medicineTerm = words.slice(0, cut).join(" ");
  const quick: QuickDoseArg = {};

  for (const token of tokens) {
    if (token.kind === "schedule") quick.pattern = token.value;
    if (token.kind === "timing") quick.timing = token.value;
    if (token.kind === "duration") {
      quick.days = token.days;
      quick.frequency = token.weekly ? "weekly" : "daily";
    }
  }

  if (instruction) {
    quick.instruction = instruction;
    tokens.push({
      kind: "instruction",
      label: instruction,
      value: instruction,
    });
  }

  return {
    medicineTerm,
    quick,
    tokens,
    hasModifiers: tokens.length > 0,
  };
};
