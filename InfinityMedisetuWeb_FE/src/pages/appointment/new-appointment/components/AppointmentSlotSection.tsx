import React from "react";
import { FiCalendar, FiClock } from "react-icons/fi";

import type { Slot, TimeSlot, TokenSlot } from "../types";

type ShiftUiData = {
  shifts: TimeSlot[][];
  shiftLabels: string[];
  hasMultipleShifts: boolean;
  activeShiftSlots: TimeSlot[];
};

type AppointmentSlotSectionProps = {
  slotFieldRef: React.RefObject<HTMLDivElement | null>;
  selectedSlot: Slot | null;
  customDurationMinutes: number | null;
  setCustomDurationMinutes: React.Dispatch<React.SetStateAction<number | null>>;
  activeShiftTab: number;
  setActiveShiftTab: React.Dispatch<React.SetStateAction<number>>;
  isSlotsLoading: boolean;
  isSlotsError: boolean;
  isExpired: boolean;
  isTokenMode: boolean;
  showAllTokens: boolean;
  setShowAllTokens: React.Dispatch<React.SetStateAction<boolean>>;
  tokenSlotsToRender: TokenSlot[];
  shouldManualPickToken: boolean;
  shiftUiData: ShiftUiData;
  slots: Slot[];
  dateParam: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  formErrors: any;
  handleSelectSlot: (slot: Slot) => void;
  shouldLockSlotsForToday: boolean;
  formatDurationLabel: (minutes: number) => string;
  addMinutesToTime: (time: string, minutesToAdd: number) => string;
  formatIsoForUi: (iso: string) => string;
  formatTimeTo12Hour: (time: string) => string;
  pad2: (n: number) => string;
  jiggleKey: string;
};

const AppointmentSlotSection: React.FC<AppointmentSlotSectionProps> = ({
  slotFieldRef,
  selectedSlot,
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
  return (
    <div
      ref={slotFieldRef}
      className={[
        "flex h-full min-h-[216px] w-full flex-col overflow-hidden rounded-2xl border bg-white p-3 shadow-sm sm:p-4 lg:p-5 lg:min-h-[360px] lg:max-h-[calc(100dvh-250px)] dark:bg-[#0f1728]",
        formErrors?.appointmentTime?.message
          ? "border-rose-300 ring-1 ring-rose-200"
          : "border-slate-100 dark:border-[#273244]",
        jiggleKey === "appointmentTime" ? "jiggle-anim" : "",
      ].join(" ")}
    >
      {isTokenMode && showAllTokens && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[18px] font-semibold text-slate-900 dark:text-white">
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
        <div className="text-[12px] text-slate-400">
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
                    <div key={i} className="h-[74px] w-full rounded-xl border border-slate-200 bg-slate-100 sm:h-[78px] min-[1600px]:h-[82px] dark:border-[#273244] dark:bg-[#111726]">
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
                <div key={i} className="h-[54px] w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 dark:border-[#273244] dark:bg-[#111726]">
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

      {dateParam && doctorId && !isSlotsLoading && !isSlotsError && slots.length === 0 && (
        <div className="flex min-h-[150px] w-full flex-1 items-center rounded-2xl border border-amber-100 bg-amber-50/80 p-4 shadow-sm sm:p-5 lg:min-h-[170px] lg:p-6 dark:border-amber-900/40 dark:bg-amber-900/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm ring-1 ring-amber-100 dark:bg-[#111726] dark:ring-[#273244]">
              <span className="absolute inline-flex h-full w-full rounded-2xl bg-amber-300 opacity-20 motion-safe:animate-ping dark:opacity-10" />
              <FiCalendar className="relative h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100 dark:bg-[#111726] dark:text-amber-500 dark:ring-[#273244]">
                  Doctor on leave
                </span>
                {dateParam && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    <FiClock className="h-3.5 w-3.5" />
                    {formatIsoForUi(dateParam)}
                  </span>
                )}
              </div>
              <h4 className="mt-3 text-[16px] font-semibold text-slate-900 sm:text-[17px] dark:text-white">
                No appointment slots are available for this date.
              </h4>
              <p className="mt-1 max-w-[760px] text-[13px] leading-5 text-slate-600 sm:text-[14px] dark:text-slate-400">
                The doctor is on leave. Please select another date to book the appointment.
              </p>
            </div>
          </div>
        </div>
      )}

      {dateParam && doctorId && slots.length > 0 && (
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
              ) : tokenSlotsToRender.length === 0 ? (
                <div className="text-[12px] text-rose-500 dark:text-rose-400">
                  No available token found for selected date.
                </div>
              ) : shouldManualPickToken ? (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                  Auto token not available. Please select token manually.
                </div>
              ) : showAllTokens ? (
                <div className="max-h-[430px] overflow-y-auto overflow-x-hidden pr-1 no-scrollbar">
                  <div className="grid w-full content-start grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 min-[1600px]:grid-cols-8">
                    {tokenSlotsToRender.map((slot) => {
                      const s = slot as TokenSlot;
                      const isSelected = selectedSlot?.kind === "token" && (selectedSlot as TokenSlot).tokenNo === s.tokenNo;
                      const canPick = s.status === "available" && !shouldLockSlotsForToday;
                      const tokenText = pad2(s.tokenNo);
                      const statusLabel =
                        s.status === "reserved" ? "Reserved"
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
                        card += "bg-white border-amber-200 text-amber-600 dark:bg-[#111726] dark:border-amber-700/50 dark:text-amber-500 ";
                        topCls += "text-slate-400 dark:text-slate-500";
                        numCls += "text-slate-900 dark:text-white";
                        statusCls += "text-amber-500";
                      } else if (s.status === "booked") {
                        card += "bg-slate-50 border-slate-200 text-slate-400 opacity-60 dark:bg-[#0f1728] dark:border-[#273244] dark:text-slate-500 ";
                        topCls += "text-slate-400 dark:text-slate-500";
                        numCls += "text-slate-400 dark:text-slate-500";
                        statusCls += "text-slate-400 dark:text-slate-500";
                      } else if (s.status === "break") {
                        card += "bg-slate-50 border-slate-100 text-slate-400 dark:bg-[#0f1728] dark:border-[#273244] dark:text-slate-500 ";
                        topCls += "text-slate-400 dark:text-slate-500";
                        numCls += "text-slate-500 dark:text-slate-400";
                        statusCls += "text-slate-500 dark:text-slate-400";
                      } else {
                        card += "bg-white border-slate-200 text-slate-900 hover:border-teal-400 hover:bg-teal-50/30 cursor-pointer dark:bg-[#111726] dark:border-[#38445a] dark:text-white dark:hover:border-[#46beae] dark:hover:bg-[#1a3a35]/40 ";
                        topCls += "text-slate-400 dark:text-slate-400";
                        numCls += "text-slate-800 dark:text-slate-200";
                        statusCls += "text-teal-600 dark:text-[#9be7dc]";
                      }
                      if (!canPick) card += "cursor-not-allowed";

                      return (
                        <button key={s.id} type="button" disabled={!canPick} className={card} onClick={() => canPick && handleSelectSlot(s)} title={statusLabel}>
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
                  <div className="relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726]">
                    <div className="border-b border-slate-100 p-3 bg-slate-50/50 dark:border-[#273244] dark:bg-[#111726]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                          <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wide dark:text-slate-300">
                            Assigned Token
                          </span>
                        </div>
                        <button type="button" onClick={() => setShowAllTokens(true)} className="shrink-0 text-[11px] font-bold text-teal-600 hover:text-teal-700 transition-colors dark:text-[#46beae] dark:hover:text-[#9be7dc]">
                          Change Token
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-400">Patient:</span>
                          <span className="text-slate-800 font-semibold truncate max-w-[120px] dark:text-white">{patientName}</span>
                        </div>
                        <span className="text-slate-300 dark:text-[#273244]">|</span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-400">Dr.</span>
                          <span className="text-slate-800 font-semibold truncate max-w-[120px] dark:text-white">{doctorName}</span>
                        </div>
                        <span className="text-slate-300 dark:text-[#273244]">|</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-800 font-semibold dark:text-white">{formatIsoForUi(dateParam)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-white relative dark:bg-[#0f1728]">
                      {tokenSlotsToRender.slice(0, 1).map((slot) => {
                        const s = slot as TokenSlot;
                        const tokenText = pad2(s.tokenNo);
                        return (
                          <div key={s.id} className="relative">
                            <button
                              type="button"
                              onClick={() => handleSelectSlot(s)}
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
                      <p className="mt-3 text-[10px] text-slate-400 font-medium">Show this at the reception</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {(() => {
                const { shifts, shiftLabels, hasMultipleShifts } = shiftUiData;

                if (shifts.length === 0) {
                  return (
                    <div className="text-[12px] text-slate-500 dark:text-slate-400">
                      No time slots available.
                    </div>
                  );
                }

                return (
                  <div className="flex min-h-0 w-full flex-1 flex-col gap-3 sm:gap-4">
                    {/* Duration control — shown after a slot is selected */}
                    {selectedSlot?.kind === "time" && (
                      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3 dark:border-[#273244] dark:bg-[#111726]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-[14px] font-semibold leading-5 text-slate-900 sm:text-[15px] dark:text-white">
                            Appointment Duration
                          </p>
                          <div className="inline-flex w-full shrink-0 items-center justify-between gap-2 rounded-full bg-slate-100 px-2 py-1 sm:w-auto dark:bg-[#0f1728]">
                            <button
                              type="button"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-[#38445a] dark:bg-[#111726] dark:text-slate-300 dark:hover:bg-[#1a2535]"
                              onClick={() => setCustomDurationMinutes((v) => Math.max(5, (v ?? (selectedSlot as TimeSlot).durationMinutes) - 5))}
                            >-</button>
                            <span className="min-w-[80px] flex-1 text-center text-[14px] font-semibold text-slate-900 sm:min-w-[90px] sm:flex-none dark:text-white">
                              {formatDurationLabel(customDurationMinutes ?? (selectedSlot as TimeSlot).durationMinutes)}
                            </span>
                            <button
                              type="button"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-[#38445a] dark:bg-[#111726] dark:text-slate-300 dark:hover:bg-[#1a2535]"
                              onClick={() => setCustomDurationMinutes((v) => (v ?? (selectedSlot as TimeSlot).durationMinutes) + 5)}
                            >+</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Shift pills — shown only when multiple shifts exist */}
                    {hasMultipleShifts && (
                      <div className="flex flex-wrap gap-2">
                        {shifts.map((_, index) => {
                          const isActive = _activeShiftTab === index;
                          const label = shiftLabels[index] || `Shift ${index + 1}`;
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => _setActiveShiftTab(index)}
                              className={[
                                "rounded-full border px-3 py-1 text-[12px] font-semibold transition cursor-pointer",
                                isActive
                                  ? "border-primary bg-primary text-white shadow-sm"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-primary/5 dark:border-[#38445a] dark:bg-[#111726] dark:text-slate-300 dark:hover:border-[#46beae]/40",
                              ].join(" ")}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Slots for the active shift */}
                    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-100 p-2 sm:rounded-2xl sm:border-slate-200 sm:p-3 dark:border-[#273244]">
                      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
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

                      {/* Selected slot indicator */}
                      {selectedSlot?.kind === "time" && (
                        <div className="mb-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 sm:mb-3 dark:border-[#46beae]/30 dark:bg-[#1a3a35]/50">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white dark:bg-[#46beae] dark:text-slate-900">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <span className="text-[12px] font-semibold text-primary dark:text-[#9be7dc]">
                            {formatTimeTo12Hour((selectedSlot as TimeSlot).startTime)} – {formatTimeTo12Hour(
                              customDurationMinutes != null
                                ? addMinutesToTime((selectedSlot as TimeSlot).startTime, customDurationMinutes)
                                : (selectedSlot as TimeSlot).endTime
                            )}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">selected</span>
                        </div>
                      )}

                      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 no-scrollbar">
                        {(() => {
                          const safeIndex = _activeShiftTab >= 0 && _activeShiftTab < shifts.length ? _activeShiftTab : 0;
                          const activeSlots = (shifts[safeIndex] ?? []).filter((s) => s.status !== "break");

                          return (
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                              {activeSlots.map((slot) => {
                                const s = slot as TimeSlot;
                                const isSelected =
                                  selectedSlot?.kind === "time" &&
                                  (selectedSlot as TimeSlot).startTime === s.startTime &&
                                  (selectedSlot as TimeSlot).endTime === s.endTime;
                                const canPick = s.status === "available" && !shouldLockSlotsForToday;
                                const statusLabel =
                                  s.status === "booked" ? "Booked"
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
                                    className={[
                                      "min-h-[48px] rounded-lg border px-1 py-1.5 text-center transition sm:min-h-[58px] sm:rounded-xl sm:px-2 sm:py-2",
                                      "flex flex-col items-center justify-center cursor-pointer",
                                      isSelected
                                        ? "border-primary bg-primary text-white shadow-sm"
                                        : canPick
                                          ? "border-slate-200 bg-white text-slate-800 hover:border-primary/30 hover:bg-primary/5 dark:border-[#38445a] dark:bg-[#111726] dark:text-slate-200 dark:hover:border-[#46beae]/50 dark:hover:bg-[#162536]"
                                          : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-[#273244] dark:bg-[#0f1728] dark:text-slate-600",
                                    ].join(" ")}
                                  >
                                    <div className={[
                                      "whitespace-nowrap text-[11px] font-semibold leading-tight sm:text-[12px]",
                                      isSelected ? "text-white" : "text-slate-900 dark:text-slate-200",
                                    ].join(" ")}>
                                      {formatTimeTo12Hour(s.startTime)} – {formatTimeTo12Hour(effectiveEndTime)}
                                    </div>
                                    <div className={[
                                      "mt-1 text-[10px] font-medium leading-tight 2xl:text-[11px]",
                                      isSelected ? "text-white/85"
                                        : s.status === "booked" ? "text-rose-600 dark:text-rose-400"
                                          : s.status === "reserved" ? "text-amber-600 dark:text-amber-500"
                                            : "text-primary dark:text-[#46beae]",
                                    ].join(" ")}>
                                      {statusLine}
                                    </div>
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
