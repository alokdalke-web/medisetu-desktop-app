import {
  Button,
  DatePicker,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  TimeInput,
} from "@heroui/react";
import { getLocalTimeZone, parseDate, Time, today } from "@internationalized/date";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiDroplet,
  FiShield,
  FiUser,
} from "react-icons/fi";

import type { NextAction } from "../../../../redux/api/labAssistantApi";

type ActionValidationAppointmentTest = {
  uniqueTestId?: string | null;
  patientName: string | null;
  testName: string | null;
};

function ValidationDetail({
  icon,
  label,
  value,
  isCode,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  isCode?: boolean;
}) {
  return (
    <div className="flex min-h-[58px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-[17px] text-primary ring-1 ring-teal-100">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p
          className={[
            "mt-0.5 truncate text-[13px] font-semibold leading-5 text-slate-950",
            isCode ? "font-mono" : "",
          ].join(" ")}
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export function ActionValidationModal({
  isOpen,
  action,
  appointmentTest,
  isLoading,
  onOpenChange,
  onCancel,
  onConfirm,
  expectedReportReadyAt,
  onExpectedReportReadyAtChange,
  reportNote,
  onReportNoteChange,
}: {
  isOpen: boolean;
  action: NextAction | null;
  appointmentTest: ActionValidationAppointmentTest;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  expectedReportReadyAt?: string;
  onExpectedReportReadyAtChange?: (value: string) => void;
  reportNote?: string;
  onReportNoteChange?: (value: string) => void;
}) {
  const isReportTimeAction = action?.key === "SET_EXPECTED_REPORT_READY_AT";

  const datePart = expectedReportReadyAt ? expectedReportReadyAt.split("T")[0] : "";
  const timePart = expectedReportReadyAt && expectedReportReadyAt.includes("T") ? expectedReportReadyAt.split("T")[1].slice(0, 5) : "";

  const isPastDateTime = useMemo(() => {
    if (!expectedReportReadyAt) return false;
    const selected = new Date(expectedReportReadyAt);
    return selected.getTime() < Date.now();
  }, [expectedReportReadyAt]);

  const isConfirmDisabled = isReportTimeAction && (!expectedReportReadyAt || isPastDateTime);

  const isSelectedDateToday = useMemo(() => {
    if (!datePart) return false;
    const todayObj = today(getLocalTimeZone());
    const pad = (num: number) => String(num).padStart(2, "0");
    const todayStr = `${todayObj.year}-${pad(todayObj.month)}-${pad(todayObj.day)}`;
    return datePart === todayStr;
  }, [datePart]);

  const minTimeValue = useMemo(() => {
    if (isSelectedDateToday) {
      const nowTime = new Date();
      return new Time(nowTime.getHours(), nowTime.getMinutes());
    }
    return undefined;
  }, [isSelectedDateToday]);

  const [selectedPresetHours, setSelectedPresetHours] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPresetHours(null);
    }
  }, [isOpen]);

  const setPresetTime = (hours: number) => {
    setSelectedPresetHours(hours);
    const targetDate = new Date(Date.now() + hours * 60 * 60 * 1000);
    const pad = (num: number) => String(num).padStart(2, "0");
    const year = targetDate.getFullYear();
    const month = pad(targetDate.getMonth() + 1);
    const day = pad(targetDate.getDate());
    const hh = pad(targetDate.getHours());
    const mm = pad(targetDate.getMinutes());
    const formatted = `${year}-${month}-${day}T${hh}:${mm}`;
    onExpectedReportReadyAtChange?.(formatted);
  };

  const formatLivePreview = (val?: string) => {
    if (!val) return "";
    const date = new Date(val);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(undefined, {
      weekday: "long",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDateChange = (newDate: string) => {
    setSelectedPresetHours(null);
    const time = timePart || "09:00";
    onExpectedReportReadyAtChange?.(newDate ? `${newDate}T${time}` : "");
  };

  const handleTimeChange = (newTime: string) => {
    setSelectedPresetHours(null);
    let date = datePart;
    if (!date) {
      const today = new Date();
      const pad = (num: number) => String(num).padStart(2, "0");
      date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    }
    onExpectedReportReadyAtChange?.(newTime ? `${date}T${newTime}` : "");
  };

  const safeParseDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return parseDate(dateStr);
    } catch {
      return null;
    }
  };

  const safeParseTime = (timeStr?: string) => {
    if (!timeStr) return null;
    try {
      const parts = timeStr.split(":");
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        return new Time(h, m);
      }
    } catch { }
    return null;
  };

  const handleDatePickerChange = (val: any) => {
    if (val) {
      const formattedDate = `${val.year}-${String(val.month).padStart(2, "0")}-${String(val.day).padStart(2, "0")}`;
      handleDateChange(formattedDate);
    } else {
      handleDateChange("");
    }
  };

  const handleTimePickerChange = (val: any) => {
    if (val) {
      const formattedTime = `${String(val.hour).padStart(2, "0")}:${String(val.minute).padStart(2, "0")}`;
      handleTimeChange(formattedTime);
    } else {
      handleTimeChange("");
    }
  };



  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      size="md"
      backdrop="opaque"
      isDismissable={!isLoading}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut",
            },
          },
          exit: {
            y: 20,
            opacity: 0,
            transition: {
              duration: 0.25,
              ease: "easeIn",
            },
          },
        },
      }}
      classNames={{
        backdrop: "bg-slate-950/45 backdrop-blur-[2px]",
        base: "w-[calc(100%-2rem)] max-w-[420px] rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]",
        closeButton:
          "right-4 top-4 h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all",
      }}
    >
      <ModalContent>
        <ModalHeader className="px-5 pb-2 pt-5">
          <div className="flex min-w-0 items-start gap-3 pr-8">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-primary to-teal-500 text-xl text-white shadow-[0_10px_24px_rgba(10,108,116,0.22)] ring-4 ring-primary/5">
              {isReportTimeAction ? <FiClock /> : <FiShield />}
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-6 text-slate-950">
                {isReportTimeAction
                  ? "Set Expected Report Time"
                  : "Validate Test Details"}
              </h2>
              <p className="mt-0.5 text-xs font-medium leading-4 text-slate-500">
                {isReportTimeAction
                  ? "Pick when the report is expected to be ready."
                  : "Confirm these details before moving the tracker forward."}
              </p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="gap-2.5 px-5 py-2">
          {action && !isReportTimeAction && (
            <div className="flex min-h-[58px] items-center gap-3 rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 px-3.5 py-2.5 shadow-[0_8px_22px_rgba(10,108,116,0.06)]">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[17px] text-primary ring-1 ring-teal-100">
                <FiCheckCircle />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-primary">
                  Action
                </p>
                <p className="mt-0.5 truncate text-[13px] font-semibold leading-5 text-slate-950">
                  {action.label}
                </p>
              </div>
            </div>
          )}

          {isReportTimeAction ? (
            <div className="grid gap-3.5">
              {/* Presets Grid */}
              <div className="grid gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Quick Presets
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "4 Hours (Urgent)", hours: 4 },
                    { label: "12 Hours (Same Day)", hours: 12 },
                    { label: "24 Hours (Next Day)", hours: 24 },
                    { label: "48 Hours (Standard)", hours: 48 },
                  ].map((preset) => {
                    const isActive = selectedPresetHours === preset.hours;
                    return (
                      <motion.button
                        key={preset.label}
                        type="button"
                        onClick={() => setPresetTime(preset.hours)}
                        whileHover={{ scale: 1.02, y: -0.5 }}
                        whileTap={{ scale: 0.97 }}
                        className={`flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl border transition-all cursor-pointer focus:outline-none text-xs font-semibold
                          ${isActive
                            ? "border-primary bg-primary/5 text-primary shadow-[0_2px_10px_rgba(10,108,116,0.08)] ring-1 ring-primary/30"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-xs"
                          }`}
                      >
                        <FiClock className={`text-[13px] transition-colors ${isActive ? "text-primary" : "text-slate-400"}`} />
                        <span>{preset.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time Picker */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="grid gap-1.5">
                  <label
                    htmlFor="expected-report-date"
                    className="text-[11px] font-bold uppercase tracking-wide text-slate-600"
                  >
                    Select Custom Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    id="expected-report-date"
                    aria-label="Select Custom Date"
                    value={safeParseDate(datePart)}
                    onChange={handleDatePickerChange}
                    minValue={today(getLocalTimeZone())}
                    showMonthAndYearPickers
                    variant="bordered"
                    radius="lg"
                    size="sm"
                    classNames={{
                      base: "w-full",
                      inputWrapper: "h-10 min-h-10 border-slate-200 bg-white hover:border-slate-300 focus-within:border-primary transition-colors shadow-xs",
                      input: "text-xs font-semibold text-slate-800",
                    }}
                  />
                </div>

                <div className="grid gap-1.5">
                  <label
                    htmlFor="expected-report-time"
                    className="text-[11px] font-bold uppercase tracking-wide text-slate-600"
                  >
                    Select Custom Time <span className="text-red-500">*</span>
                  </label>
                  <TimeInput
                    id="expected-report-time"
                    aria-label="Select Custom Time"
                    value={safeParseTime(timePart)}
                    onChange={handleTimePickerChange}
                    minValue={minTimeValue}
                    variant="bordered"
                    radius="lg"
                    size="sm"
                    classNames={{
                      base: "w-full",
                      inputWrapper: "h-10 min-h-10 border-slate-200 bg-white hover:border-slate-300 focus-within:border-primary transition-colors shadow-xs",
                      input: "text-xs font-semibold text-slate-800",
                    }}
                  />
                </div>
              </div>

              {expectedReportReadyAt && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex items-center gap-3.5 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50/70 to-cyan-50/70 p-3 shadow-xs"
                >
                  <div className="grid h-8.5 w-8.5 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-xs border border-teal-100/50">
                    <FiCheckCircle className="text-emerald-500 text-[15px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-primary/80">
                      Expected Report Time Set
                    </p>
                    <p className="mt-0.5 text-[12.5px] font-bold text-slate-850 leading-tight">
                      {formatLivePreview(expectedReportReadyAt)}
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="grid gap-1.5">
                <label
                  htmlFor="report-note"
                  className="text-[11px] font-bold uppercase tracking-wide text-slate-600"
                >
                  Note / Remarks{" "}
                  <span className="text-[10px] font-medium normal-case text-slate-400">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="report-note"
                  rows={2}
                  value={reportNote ?? ""}
                  onChange={(e) => onReportNoteChange?.(e.target.value)}
                  placeholder="e.g. Results expected by tomorrow morning"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-850 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-2.5">
              <ValidationDetail
                icon={<FiClipboard />}
                label="Test ID"
                value={appointmentTest.uniqueTestId?.trim() || "--"}
                isCode
              />
              <ValidationDetail
                icon={<FiUser />}
                label="Patient Name"
                value={appointmentTest.patientName?.trim() || "-"}
              />
              <ValidationDetail
                icon={<FiDroplet />}
                label="Test Name"
                value={appointmentTest.testName?.trim() || "-"}
              />
            </div>
          )}
        </ModalBody>

        <ModalFooter className="justify-end gap-3 px-5 pb-5 pt-3">
          <Button
            variant="bordered"
            radius="full"
            onPress={onCancel}
            isDisabled={isLoading}
            className="h-9 min-w-[86px] border-slate-300 bg-white px-5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-all"
          >
            {isReportTimeAction ? "Cancel" : "No"}
          </Button>
          <Button
            color="primary"
            radius="full"
            onPress={onConfirm}
            isLoading={isLoading}
            isDisabled={isConfirmDisabled}
            className="h-9 min-w-[130px] bg-primary px-5 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(10,108,116,0.22)] hover:bg-opacity-90 active:scale-[0.98] transition-all"
          >
            {isReportTimeAction ? "Set Time" : "Yes, Continue"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
