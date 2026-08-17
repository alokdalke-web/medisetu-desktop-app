import React, { useEffect, useRef } from "react";
import { Select, SelectItem } from "@heroui/react";
import { FiCalendar, FiClock } from "react-icons/fi";

import type { TimeSlot, TokenSlot } from "../types";
import type { AppointmentSlotSectionProps } from "../../../../types/appointment";

// Helper function to get current IST time
const getCurrentISTTime = (): Date => {
  const now = new Date();
  // IST is UTC +5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  return new Date(utcTime + istOffset);
};

// Helper function to parse time string (HH:MM) to minutes since midnight
const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

// Helper function to determine which shift the current time falls into
const getCurrentShiftIndex = (shifts: TimeSlot[][]): number => {
  if (shifts.length === 0) return 0;

  const currentIST = getCurrentISTTime();
  const currentMinutes = currentIST.getHours() * 60 + currentIST.getMinutes();

  // First, try to find a shift that contains the current time
  for (let i = 0; i < shifts.length; i++) {
    const shiftSlots = shifts[i];
    if (shiftSlots.length === 0) continue;

    // Get the first and last slot times of the shift
    const firstSlot = shiftSlots[0];
    const lastSlot = shiftSlots[shiftSlots.length - 1];

    const startMinutes = parseTimeToMinutes(firstSlot.startTime);
    const endMinutes = parseTimeToMinutes(lastSlot.endTime);

    // Check if current time falls within this shift
    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return i;
    }
  }

  // If current time doesn't fall in any shift, find the closest upcoming shift
  let closestShiftIndex = 0;
  let minDiff = Infinity;

  for (let i = 0; i < shifts.length; i++) {
    const shiftSlots = shifts[i];
    if (shiftSlots.length === 0) continue;

    const firstSlot = shiftSlots[0];
    const startMinutes = parseTimeToMinutes(firstSlot.startTime);

    // If current time is before shift start
    if (currentMinutes < startMinutes) {
      const diff = startMinutes - currentMinutes;
      if (diff < minDiff) {
        minDiff = diff;
        closestShiftIndex = i;
      }
    }
  }

  // If we found an upcoming shift, return it
  if (minDiff !== Infinity) {
    return closestShiftIndex;
  }

  // If no upcoming shift found (all shifts are in the past), return 0
  return 0;
};

const AppointmentSlotSection: React.FC<AppointmentSlotSectionProps> = ({
  slotFieldRef,
  selectedSlot,
  customSlot = null,
  customDurationMinutes,
  setCustomDurationMinutes,
  activeShiftTab: _activeShiftTab,
  setActiveShiftTab: _setActiveShiftTab,
  isSlotsLoading,
  isSlotsError,
  isExpired,
  isTokenMode,
  showAllTokens,
  setShowAllTokens,
  tokenSlotsToRender,
  shouldManualPickToken,
  shiftUiData,
  slots,
  dateParam,
  doctorId,
  patientName,
  doctorName,
  formErrors,
  handleSelectSlot,
  shouldLockSlotsForToday,
  formatDurationLabel,
  addMinutesToTime,
  formatIsoForUi,
  formatTimeTo12Hour,
  pad2,
  jiggleKey,
}) => {
  // Track if user has manually interacted with shift tabs
  const hasUserInteractedRef = useRef(false);
  // Track previous shifts length to detect when shifts data changes
  const prevShiftsLengthRef = useRef(0);

  // Set initial active shift based on IST time only on mount or when shifts data changes
  useEffect(() => {
    // Only run this if we have shifts and not in token mode
    if (!isTokenMode && shiftUiData.shifts.length > 0 && !isSlotsLoading) {
      // Check if shifts data has changed (new data loaded)
      const shiftsChanged = prevShiftsLengthRef.current !== shiftUiData.shifts.length;
      
      // Reset user interaction flag if shifts data has changed
      if (shiftsChanged) {
        hasUserInteractedRef.current = false;
        prevShiftsLengthRef.current = shiftUiData.shifts.length;
      }

      // Only auto-select if user hasn't manually interacted
      if (!hasUserInteractedRef.current) {
        const currentShiftIndex = getCurrentShiftIndex(shiftUiData.shifts);
        
        // Only update if the determined shift is different from current
        if (currentShiftIndex !== _activeShiftTab) {
          _setActiveShiftTab(currentShiftIndex);
        }
      }
    }
  }, [shiftUiData.shifts, isTokenMode, isSlotsLoading, _activeShiftTab, _setActiveShiftTab]);

  // Handler for shift tab clicks
  const handleShiftTabClick = (index: number) => {
    // Mark that user has manually interacted
    hasUserInteractedRef.current = true;
    _setActiveShiftTab(index);
  };

  // `customSlot` only ever holds a pick with no match in `slots` (the parent already
  // resolves matches to the real slot instead) — so it's always safe to tack on after the
  // last real card, never a duplicate.
  const customTokenSlot = customSlot?.kind === "token" ? customSlot : null;
  const customTimeSlot = customSlot?.kind === "time" ? customSlot : null;
  const hasAnySlotToShow = slots.length > 0 || !!customSlot;

  const tokensToDisplay = customTokenSlot
    ? [...tokenSlotsToRender, customTokenSlot]
    : tokenSlotsToRender;

  return (
    <div
      ref={slotFieldRef}
      className={[
        "flex h-full min-h-[216px] w-full flex-col overflow-hidden rounded-2xl border bg-surface p-3 shadow-sm sm:p-4 lg:p-5 lg:min-h-[360px] lg:max-h-[calc(100dvh-250px)]",
        formErrors?.appointmentTime?.message
          ? "border-rose-300 ring-1 ring-rose-200"
          : "border-line",
        jiggleKey === "appointmentTime" ? "jiggle-anim" : "",
      ].join(" ")}
    >
      {isTokenMode && showAllTokens && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[18px] font-semibold text-text">
              Select Appointment Availability
            </h3>
          </div>
        </div>
      )}

      {!!formErrors?.appointmentTime?.message && (
        <p className="mt-2 text-[12px] text-rose-600 dark:text-rose-400">
          {String(formErrors.appointmentTime.message)}
        </p>
      )}

      {(!dateParam || !doctorId) && (
        <div className="text-[12px] text-text-muted">
          Select doctor and date to load available slots.
        </div>
      )}

      {dateParam && doctorId && isSlotsLoading && (
        <div className="animate-pulse">
          {isTokenMode ? (
            <div className={showAllTokens ? "h-full overflow-y-auto overflow-x-hidden pr-1" : ""}>
              <div className={showAllTokens ? "max-h-[430px] overflow-y-auto overflow-x-hidden pr-1 no-scrollbar" : ""}>
                <div className="grid w-full content-start grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 min-[1600px]:grid-cols-8">
                  {Array.from({ length: showAllTokens ? 24 : 1 }).map((_, i) => (
                    <div key={i} className="h-[74px] w-full rounded-xl border border-line bg-slate-100 sm:h-[78px] min-[1600px]:h-[82px] dark:bg-[#111726]">
                      <div className="h-full w-full flex flex-col items-center justify-center gap-2">
                        <div className="h-3 w-10 rounded bg-slate-200 dark:bg-[#273244]" />
                        <div className="h-6 w-12 rounded bg-slate-200 dark:bg-[#273244]" />
                        <div className="h-3 w-16 rounded bg-slate-200 dark:bg-[#273244]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))" }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-[54px] w-full rounded-xl border border-line bg-slate-100 px-3 py-2 dark:bg-[#111726]">
                  <div className="flex h-full flex-col items-center justify-center gap-2">
                    <div className="h-3 w-24 rounded bg-slate-200 dark:bg-[#273244]" />
                    <div className="h-3 w-28 rounded bg-slate-200 dark:bg-[#273244]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {dateParam && doctorId && !isSlotsLoading && !isSlotsError && !hasAnySlotToShow && (
        <div className="flex min-h-[150px] w-full flex-1 items-center rounded-2xl border border-amber-100 bg-amber-50/80 p-4 shadow-sm sm:p-5 lg:min-h-[170px] lg:p-6 dark:border-amber-900/40 dark:bg-amber-900/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface text-amber-600 shadow-sm ring-1 ring-amber-100 dark:ring-[#273244]">
              <span className="absolute inline-flex h-full w-full rounded-2xl bg-amber-300 opacity-20 motion-safe:animate-ping dark:opacity-10" />
              <FiCalendar className="relative h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100 dark:text-amber-500 dark:ring-[#273244]">
                  Doctor on leave
                </span>
                {dateParam && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-text-muted">
                    <FiClock className="h-3.5 w-3.5" />
                    {formatIsoForUi(dateParam)}
                  </span>
                )}
              </div>
              <h4 className="mt-3 text-[16px] font-semibold text-text sm:text-[17px]">
                No appointment slots are available for this date.
              </h4>
              <p className="mt-1 max-w-[760px] text-[13px] leading-5 text-text-muted sm:text-[14px]">
                The doctor is on leave. Please select another date to book the appointment.
              </p>
            </div>
          </div>
        </div>
      )}

      {dateParam && doctorId && hasAnySlotToShow && (
        <>
          {shouldLockSlotsForToday && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
              Patient already has an appointment with this doctor on this date.
            </div>
          )}

          {isTokenMode ? (
            <>
              {isExpired ? (
                <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
                  Token booking window has ended for the selected date and doctor.
                </div>
              ) : tokensToDisplay.length === 0 ? (
                <div className="text-[12px] text-rose-500 dark:text-rose-400">
                  No available token found for selected date.
                </div>
              ) : shouldManualPickToken ? (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                  Auto token not available. Please select token manually.
                </div>
              ) : showAllTokens ? (
                <div className="max-h-[430px] overflow-y-auto overflow-x-hidden pr-1 scrollbar-on-hover">
                  <div className="grid w-full content-start grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 min-[1600px]:grid-cols-8">
                    {tokensToDisplay.map((slot) => {
                      const s = slot as TokenSlot;
                      const isCustom = s.id === customTokenSlot?.id;
                      const isSelected = selectedSlot?.kind === "token" && (selectedSlot as TokenSlot).tokenNo === s.tokenNo;
                      const canPick = s.status === "available" && !shouldLockSlotsForToday;
                      const tokenText = pad2(s.tokenNo);
                      const statusLabel = isCustom
                        ? "Custom"
                        : s.status === "reserved" ? "Reserved"
                          : s.status === "booked" ? "Booked"
                            : s.status === "break" ? "Break"
                              : "Available";

                      let card = "relative flex min-h-[74px] w-full flex-col items-center justify-center rounded-xl border px-1.5 py-1.5 text-center transition-all duration-200 select-none sm:min-h-[78px] min-[1600px]:min-h-[82px] ";
                      let topCls = "text-[9px] font-bold uppercase tracking-tight leading-none ";
                      let numCls = "my-0.5 text-[22px] font-black leading-none sm:text-[24px] ";
                      let statusCls = "text-[9px] font-bold uppercase tracking-wide leading-none ";

                      if (isSelected) {
                        card += "bg-teal-600 border-teal-600 text-white shadow-md z-10 dark:bg-[#46beae] dark:border-[#46beae] ";
                        topCls += "text-white/80 dark:text-slate-900/80";
                        numCls += "text-white dark:text-slate-900";
                        statusCls += "text-white dark:text-slate-900";
                      } else if (s.status === "reserved") {
                        card += "bg-surface border-amber-200 text-amber-600 dark:border-amber-700/50 dark:text-amber-500 ";
                        topCls += "text-text-muted";
                        numCls += "text-text";
                        statusCls += "text-amber-500";
                      } else if (s.status === "booked") {
                        card += "bg-slate-50 border-line text-text-muted opacity-60 dark:bg-[#0f1728] dark:text-slate-500 ";
                        topCls += "text-text-muted";
                        numCls += "text-text-muted";
                        statusCls += "text-text-muted";
                      } else if (s.status === "break") {
                        card += "bg-slate-50 border-line text-slate-400 dark:bg-[#0f1728] dark:text-slate-500 ";
                        topCls += "text-text-muted";
                        numCls += "text-text-muted";
                        statusCls += "text-text-muted";
                      } else {
                        card += "bg-surface border-slate-200 text-slate-900 hover:border-teal-400 hover:bg-teal-50/30 cursor-pointer dark:border-[#38445a] dark:text-white dark:hover:border-[#46beae] dark:hover:bg-[#1a3a35]/40 ";
                        topCls += "text-text-muted";
                        numCls += "text-text";
                        statusCls += "text-teal-600 dark:text-[#9be7dc]";
                      }
                      if (!canPick) card += "cursor-not-allowed";

                      return (
                        <button key={s.id} type="button" disabled={!canPick} className={card} onClick={() => canPick && handleSelectSlot(s)} title={statusLabel} aria-pressed={isSelected} aria-label={`Token ${tokenText}, ${statusLabel}`}>
                          <div className={topCls}>No.</div>
                          <div className={numCls}>{tokenText}</div>
                          <div className={statusCls}>{statusLabel}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="min-h-[260px] w-full flex-1">
                  <div className="relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                    <div className="border-b border-line p-3 bg-slate-50/50 dark:bg-[#111726]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                          <span className="text-[12px] font-bold text-text uppercase tracking-wide">
                            Assigned Token
                          </span>
                        </div>
                        <button type="button" onClick={() => setShowAllTokens(true)} className="shrink-0 text-[11px] font-bold text-teal-600 hover:text-teal-700 transition-colors dark:text-[#46beae] dark:hover:text-[#9be7dc]">
                          Change Token
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-text-muted">Patient:</span>
                          <span className="text-text font-semibold truncate max-w-[120px]">{patientName}</span>
                        </div>
                        <span className="text-slate-300 dark:text-[#273244]">|</span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-text-muted">Dr.</span>
                          <span className="text-text font-semibold truncate max-w-[120px]">{doctorName}</span>
                        </div>
                        <span className="text-slate-300 dark:text-[#273244]">|</span>
                        <div className="flex items-center gap-1">
                          <span className="text-text font-semibold">{formatIsoForUi(dateParam)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-surface relative">
                      {tokenSlotsToRender.slice(0, 1).map((slot) => {
                        const s = slot as TokenSlot;
                        const tokenText = pad2(s.tokenNo);
                        return (
                          <div key={s.id} className="relative">
                            <button
                              type="button"
                              onClick={() => handleSelectSlot(s)}
                              aria-label={`Token ${tokenText}, Available`}
                              className={[
                                "relative h-[128px] w-[128px] rounded-full sm:h-[140px] sm:w-[140px]",
                                "flex flex-col items-center justify-center text-center select-none",
                                "shadow-sm border-2 transition-all duration-300 transform hover:scale-105",
                                "bg-teal-600 border-teal-500 ring-4 ring-teal-50 dark:bg-[#46beae] dark:border-[#46beae] dark:ring-[#1a3a35]",
                              ].join(" ")}
                              title="Available"
                            >
                              <div className="text-[10px] font-bold uppercase tracking-widest text-white/80 dark:text-slate-900/80">No.</div>
                              <div className="text-[50px] font-black leading-none text-white sm:text-[56px] dark:text-slate-900">{tokenText}</div>
                              <div className="mt-1 text-[9px] font-bold uppercase text-white/90 dark:text-slate-900/90">Available</div>
                            </button>
                          </div>
                        );
                      })}
                      <p className="mt-3 text-[10px] text-text-muted font-medium">Show this at the reception</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {(() => {
                const { shifts, shiftLabels, hasMultipleShifts } = shiftUiData;

                if (shifts.length === 0 && !customTimeSlot) {
                  return (
                    <div className="text-[12px] text-text-muted">
                      No time slots available.
                    </div>
                  );
                }

                return (
                  <div className="flex min-h-0 w-full flex-1 flex-col gap-2 sm:gap-3">
                    {/* Shift selector + duration stepper — one compact row */}
                    {(hasMultipleShifts || selectedSlot?.kind === "time") && (
                      <div className="flex flex-wrap items-center gap-2">
                        {hasMultipleShifts && (
                          <Select
                            aria-label="Select shift"
                            size="sm"
                            variant="flat"
                            radius="lg"
                            selectedKeys={new Set([String(_activeShiftTab)])}
                            onSelectionChange={(keys) => {
                              const val = Array.from(keys)[0];
                              if (val !== undefined) handleShiftTabClick(Number(val));
                            }}
                            disallowEmptySelection
                            classNames={{
                              base: "w-full sm:w-[240px]",
                              trigger:
                                "!h-9 !min-h-9 !rounded-lg border border-line bg-surface px-3 shadow-sm " +
                                "data-[hover=true]:border-primary/40 data-[focus=true]:border-primary",
                              value: "text-[12px] font-semibold text-text",
                              listboxWrapper: "max-h-64",
                              popoverContent: "rounded-xl border border-line shadow-xl dark:bg-[#111726]",
                              selectorIcon: "text-text-muted",
                            }}
                          >
                            {shifts.map((shiftSlots, index) => {
                              const availableInShift = shiftSlots.filter((s) => s.status === "available").length;
                              const label = shiftLabels[index] || `Shift ${index + 1}`;
                              return (
                                <SelectItem
                                  key={String(index)}
                                  textValue={label}
                                >
                                  <div className="flex w-full items-center justify-between gap-2">
                                    <span className="text-[13px] font-medium text-text">
                                      {label}
                                    </span>
                                    <span className={[
                                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                      availableInShift > 0
                                        ? "bg-primary/10 text-primary dark:bg-[#1a3a35] dark:text-[#9be7dc]"
                                        : "bg-slate-100 text-text-subtle dark:bg-[#0f1728]",
                                    ].join(" ")}>
                                      {availableInShift} free
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </Select>
                        )}

                        {selectedSlot?.kind === "time" && (
                          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-slate-100 px-1 py-1 dark:bg-[#0f1728]">
                            <span className="pl-1.5 text-[11px] font-medium text-text-muted">Duration</span>
                            <button
                              type="button"
                              aria-label="Decrease duration"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-text transition hover:bg-slate-50 dark:hover:bg-[#1a2535]"
                              onClick={() => setCustomDurationMinutes((v) => Math.max(5, (v ?? (selectedSlot as TimeSlot).durationMinutes) - 5))}
                            >−</button>
                            <span className="min-w-[52px] text-center text-[12px] font-semibold text-text">
                              {formatDurationLabel(customDurationMinutes ?? (selectedSlot as TimeSlot).durationMinutes)}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase duration"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-text transition hover:bg-slate-50 dark:hover:bg-[#1a2535]"
                              onClick={() => setCustomDurationMinutes((v) => (v ?? (selectedSlot as TimeSlot).durationMinutes) + 5)}
                            >+</button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Slots for the active shift */}
                    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-line p-2 sm:rounded-2xl sm:border-line sm:p-3">
                      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                          Available Time Slots
                        </p>
                        {(() => {
                          const safeIdx = _activeShiftTab >= 0 && _activeShiftTab < shifts.length ? _activeShiftTab : 0;
                          const count = (shifts[safeIdx] ?? []).filter((s) => s.status === "available").length;
                          return count > 0 ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-[#1a3a35] dark:text-[#9be7dc]">
                              {count} available
                            </span>
                          ) : null;
                        })()}
                      </div>

                      {/* snap-start on every card snaps scroll to row boundaries — no half-cut row at rest.
                          Padding (not just pr-1) is load-bearing: cards scale/translate on hover and
                          when selected, and that overflow is clipped by overflow-y/x without room to
                          grow into. scroll-py keeps snap landing on the row, not the padding edge. */}
                      <div className="min-h-0 flex-1 snap-y snap-mandatory scroll-py-2 overflow-y-auto overflow-x-hidden py-2 pl-1 pr-2 scrollbar-thin-visible">
                        {(() => {
                          const safeIndex = _activeShiftTab >= 0 && _activeShiftTab < shifts.length ? _activeShiftTab : 0;
                          const activeSlots = (shifts[safeIndex] ?? []).filter((s) => s.status !== "break");
                          const slotsToDisplay = customTimeSlot
                            ? [...activeSlots, customTimeSlot]
                            : activeSlots;

                          return (
                            <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                              {slotsToDisplay.map((slot) => {
                                const s = slot as TimeSlot;
                                const isCustom = s.id === customTimeSlot?.id;
                                const isSelected =
                                  selectedSlot?.kind === "time" &&
                                  (selectedSlot as TimeSlot).startTime === s.startTime &&
                                  (selectedSlot as TimeSlot).endTime === s.endTime;
                                const canPick = s.status === "available" && !shouldLockSlotsForToday;
                                const statusLabel = isCustom
                                  ? "Custom"
                                  : s.status === "booked" ? "Booked"
                                    : s.status === "reserved" ? "Reserved"
                                      : "Available";
                                const effectiveDuration =
                                  isSelected && customDurationMinutes != null
                                    ? customDurationMinutes
                                    : s.durationMinutes || 0;
                                const effectiveEndTime =
                                  effectiveDuration > 0
                                    ? addMinutesToTime(s.startTime, effectiveDuration)
                                    : s.endTime;
                                const statusLine = `${statusLabel} · ${formatDurationLabel(effectiveDuration)}`;

                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    disabled={!canPick}
                                    onClick={() => handleSelectSlot(s)}
                                    aria-pressed={isSelected}
                                    aria-label={`${formatTimeTo12Hour(s.startTime)} to ${formatTimeTo12Hour(effectiveEndTime)}, ${statusLabel} · ${formatDurationLabel(effectiveDuration)}`}
                                    className={[
                                      "group relative z-0 min-h-[52px] min-w-0 w-full snap-start rounded-lg border px-2 py-1.5 text-center transition-all duration-150 hover:z-20 focus-visible:z-20 sm:min-h-[56px] sm:rounded-xl",
                                      "flex flex-col items-center justify-center gap-0.5 cursor-pointer",
                                      isSelected
                                        ? "border-primary bg-primary text-white shadow-md scale-[1.02]"
                                        : canPick
                                          ? "border-line bg-surface text-text hover:border-primary/40 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.03] dark:hover:border-[#46beae]/50 dark:hover:bg-[#162536]"
                                          : "cursor-not-allowed border-line bg-slate-50 text-text-subtle hover:shadow-sm dark:bg-[#0f1728]",
                                    ].join(" ")}
                                  >
                                    {isSelected && (
                                      <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/25">
                                        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                      </span>
                                    )}
                                    {!isSelected && s.status !== "available" && (
                                      <span
                                        className={[
                                          "absolute right-1.5 top-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                                          s.status === "booked" ? "bg-rose-500" : "bg-amber-500",
                                        ].join(" ")}
                                      />
                                    )}
                                    <span className="w-full truncate text-[12px] font-bold leading-tight">
                                      {formatTimeTo12Hour(s.startTime)}
                                    </span>
                                    <span className={[
                                      "w-full truncate text-[10px] leading-tight",
                                      isSelected ? "text-white/85" : "text-text-muted",
                                    ].join(" ")}>
                                      – {formatTimeTo12Hour(effectiveEndTime)}
                                    </span>

                                    {/* Status reads inline, not from a hover popup: this grid sits
                                        inside an `overflow-y-auto` container, so an absolutely
                                        positioned tooltip is clipped at the scroll edges and covers
                                        the row beneath it — and never appears at all on touch.
                                        See UI_REMEDIATION_LOG.md #65. */}
                                    {!isSelected && s.status !== "available" && (
                                      <span
                                        className={[
                                          "w-full truncate text-[9px] font-semibold uppercase leading-tight tracking-[0.4px]",
                                          s.status === "booked" ? "text-rose-500" : "text-amber-500",
                                        ].join(" ")}
                                      >
                                        {statusLabel}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AppointmentSlotSection;
