import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader
} from "@heroui/react";
import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { DateRangePicker, createStaticRanges } from "react-date-range";
import bxCalendar from "../../../public/assets/icons/bx_calendar.png";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

type Props = {
  startYmd: string;
  endYmd: string;
  isFetching?: boolean;
  onApply: (startYmd: string, endYmd: string) => void;
};

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMDLocal(ymd: string) {
  const [y, m, d] = (ymd || "").split("-").map((x) => Number(x));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function fmtRangeLabel(ymd: string) {
  const d = parseYMDLocal(ymd);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).format(d);
}

function useMediaQuery(query: string) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const onChange = () => setOk(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [query]);
  return ok;
}

function clampDate(d: Date, minDate: Date, maxDate: Date) {
  const time = d.getTime();
  if (time < minDate.getTime()) return minDate;
  if (time > maxDate.getTime()) return maxDate;
  return d;
}

export default function DashboardDateRangePicker({
  startYmd,
  endYmd,
  isFetching,
  onApply,
}: Props) {
  const [open, setOpen] = useState(false);

  const isMobile = useMediaQuery("(max-width: 639px)");
  const isCompact = useMediaQuery("(max-width: 1023px)");

  const pickerBounds = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return {
      minDate: new Date(currentYear - 2, 0, 1),
      maxDate: new Date(currentYear + 5, 11, 31),
    };
  }, []);

  const [draft, setDraft] = useState<any>({
    startDate: clampDate(
      parseYMDLocal(startYmd),
      pickerBounds.minDate,
      pickerBounds.maxDate,
    ),
    endDate: clampDate(
      parseYMDLocal(endYmd),
      pickerBounds.minDate,
      pickerBounds.maxDate,
    ),
    key: "selection",
  });

  useEffect(() => {
    if (!open) return;
    setDraft({
      startDate: clampDate(
        parseYMDLocal(startYmd),
        pickerBounds.minDate,
        pickerBounds.maxDate,
      ),
      endDate: clampDate(
        parseYMDLocal(endYmd),
        pickerBounds.minDate,
        pickerBounds.maxDate,
      ),
      key: "selection",
    });
  }, [open, startYmd, endYmd, pickerBounds]);

  const quickRanges = useMemo(() => {
    const today = new Date();
    return [
      {
        label: "This Week",
        range: () => ({
          startDate: startOfWeek(today, { weekStartsOn: 0 }),
          endDate: endOfWeek(today, { weekStartsOn: 0 }),
        }),
      },
      {
        label: "Last Week",
        range: () => ({
          startDate: startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 }),
          endDate: endOfWeek(subWeeks(today, 1), { weekStartsOn: 0 }),
        }),
      },
      {
        label: "Last 7 Days",
        range: () => ({
          startDate: subDays(today, 6),
          endDate: today,
        }),
      },
      {
        label: "Current Month",
        range: () => ({
          startDate: startOfMonth(today),
          endDate: today,
        }),
      },
      {
        label: "Previous Month",
        range: () => {
          const prev = subMonths(today, 1);
          return {
            startDate: startOfMonth(prev),
            endDate: endOfMonth(prev),
          };
        },
      },
    ];
  }, []);

  const staticRanges = useMemo(
    () => createStaticRanges(quickRanges),
    [quickRanges],
  );

  const handleChange = (item: any) => {
    setDraft(item.selection);
  };

  const apply = () => {
    const s = toYMD(draft.startDate);
    const e = toYMD(draft.endDate);
    onApply(s, e);
    setOpen(false);
  };

  return (
    <div className="relative w-full sm:w-auto">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!!isFetching}
        className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        <span className="text-[13px] sm:text-sm leading-tight">
          {fmtRangeLabel(startYmd)} — {fmtRangeLabel(endYmd)}
        </span>
        <img
          src={bxCalendar}
          alt="Calendar"
          className="h-[18px] w-[18px] shrink-0 object-contain"
          draggable={false}
        />
      </button>

      <Modal
        isOpen={open}
        onOpenChange={setOpen}
        placement="center"
        scrollBehavior="inside"
        // backdrop="blur"
        size={isMobile ? "lg" : "4xl"}
        classNames={{
          base: isMobile
            ? "w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] max-h-[92vh] overflow-hidden rounded-2xl"
            : "w-[min(900px,90vw)] max-w-none rounded-3xl",
          header: "px-6 pt-5 pb-0",
          body: "overflow-x-hidden px-0 py-0",
          footer: "px-6 pb-5 pt-3 border-t border-slate-50 dark:border-slate-800",
          closeButton: "top-4 right-4",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between">
                <div className="text-base sm:text-lg font-semibold text-slate-800 dark:text-white">
                  Select Date Range
                </div>
              </ModalHeader>

              <ModalBody>
                <div className="dash-rdr">
                  <style>{`
                    .dash-rdr {
                      width: 100%;
                      overflow-x: hidden;
                    }

                    .dash-rdr .rdrDateRangePickerWrapper {
                      width: 100%;
                    }

                    .dash-rdr .rdrDefinedRangesWrapper { display: none !important; }

                    .dash-rdr .rdrMonths {
                      justify-content: center !important;
                      gap: 24px !important;
                      padding: 0 10px !important;
                    }

                    .dash-rdr .rdrMonthAndYearWrapper {
                      padding: 10px 8px !important;
                    }

                    .dash-rdr .rdrCalendarWrapper {
                      background: transparent !important;
                    }

                    @media (max-width: 1023px) {
                      .dash-rdr .rdrCalendarWrapper { width: 100% !important; }
                      .dash-rdr .rdrMonth { width: 100% !important; }
                      .dash-rdr .rdrMonths { gap: 14px !important; padding: 0 6px !important; }
                    }

                    @media (max-width: 639px) {
                      .dash-rdr .rdrMonthAndYearWrapper {
                        height: 48px !important;
                        padding: 6px 2px !important;
                      }

                      .dash-rdr .rdrMonth {
                        padding: 0 6px 8px !important;
                      }

                      .dash-rdr .rdrDay {
                        height: 36px !important;
                      }
                    }

                    /* Night mode support */
                    .dark .dash-rdr .rdrMonthName {
                      color: #f8fafc !important;
                    }

                    .dark .dash-rdr .rdrWeekDay {
                      color: #94a3b8 !important;
                    }

                    .dark .dash-rdr .rdrDayNumber span {
                      color: #cbd5e1 !important;
                    }

                    /* Selected and in-range day text colors */
                    .dark .dash-rdr .rdrDaySelected .rdrDayNumber span,
                    .dark .dash-rdr .rdrDayStartEdge .rdrDayNumber span,
                    .dark .dash-rdr .rdrDayEndEdge .rdrDayNumber span {
                      color: #ffffff !important;
                    }

                    .dark .dash-rdr .rdrDayInRange .rdrDayNumber span {
                      color: #ffffff !important;
                    }

                    /* Background for day selection */
                    .dark .dash-rdr .rdrInRange {
                      background: rgba(20, 184, 166, 0.2) !important;
                    }

                    /* Next/Prev buttons in dark mode */
                    .dark .dash-rdr .rdrNextPrevButton {
                      background: #1e293b !important;
                    }

                    .dark .dash-rdr .rdrNextPrevButton:hover {
                      background: #334155 !important;
                    }

                    /* Next/Prev arrows in dark mode */
                    .dark .dash-rdr .rdrPprevButton i {
                      border-color: transparent #cbd5e1 transparent transparent !important;
                    }

                    .dark .dash-rdr .rdrNextButton i {
                      border-color: transparent transparent transparent #cbd5e1 !important;
                    }

                    /* Month/Year select dropdowns in dark mode */
                    .dark .dash-rdr .rdrMonthAndYearPickers select {
                      color: #f8fafc !important;
                      background-image: url("data:image/svg+xml;utf8,<svg width='9px' height='6px' viewBox='0 0 9 6' version='1.1' xmlns='http://www.w3.org/2000/svg' fill-opacity='0.8'><g id='Artboard' stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' transform='translate(-636.000000, -171.000000)'><g id='input' transform='translate(172.000000, 37.000000)' fill='%23FFFFFF' fill-rule='nonzero'><g id='Group-9' transform='translate(323.000000, 127.000000)'><path d='M142.280245,7.23952813 C141.987305,6.92353472 141.512432,6.92361662 141.219585,7.23971106 C140.926739,7.5558055 140.926815,8.06821394 141.219755,8.38420735 L145.498801,13 L149.780245,8.38162071 C150.073185,8.0656273 150.073261,7.55321886 149.780415,7.23712442 C149.487568,6.92102998 149.012695,6.92094808 148.719755,7.23694149 L145.498801,10.7113732 L142.280245,7.23952813 Z' id='arrow'></path></g></g></g></svg>") !important;
                    }

                    .dark .dash-rdr .rdrMonthAndYearPickers select:hover {
                      background-color: rgba(255, 255, 255, 0.07) !important;
                    }

                    .dark .dash-rdr .rdrMonthAndYearPickers select option {
                      background-color: #111726 !important;
                      color: #f8fafc !important;
                    }

                    /* Passive (non-current month) and disabled days in dark mode */
                    .dark .dash-rdr .rdrDayPassive .rdrDayNumber span {
                      color: #475569 !important;
                    }

                    .dark .dash-rdr .rdrDayDisabled {
                      background-color: transparent !important;
                    }

                    .dark .dash-rdr .rdrDayDisabled .rdrDayNumber span {
                      color: #334155 !important;
                    }
                  `}</style>

                  <div className="flex flex-col sm:flex-row h-full">
                    {/* Left Sidebar - Quick Ranges */}
                    <div className="flex w-full flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 p-4 sm:w-[180px] sm:flex-col sm:flex-nowrap sm:border-b-0 sm:border-r sm:border-slate-100 dark:sm:border-slate-800 sm:p-5">
                      {quickRanges.map((q) => {
                        const r = q.range();
                        const active =
                          toYMD(draft.startDate) === toYMD(r.startDate) &&
                          toYMD(draft.endDate) === toYMD(r.endDate);

                        return (
                          <button
                            key={q.label}
                            type="button"
                            className={[
                              "shrink-0 rounded-xl px-3 py-2 text-left text-[12px] font-medium transition-all sm:w-full sm:py-2.5 sm:text-[13px]",
                              active
                                ? "bg-teal-50 text-teal-700 shadow-sm dark:bg-teal-950/40 dark:text-teal-400"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#151e31] dark:hover:text-slate-200",
                            ].join(" ")}
                            onClick={() =>
                              setDraft({
                                startDate: r.startDate,
                                endDate: r.endDate,
                                key: "selection",
                              })
                            }
                          >
                            {q.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Side - Calendar */}
                    <div className="flex-1 overflow-hidden px-3 py-4 sm:p-6">
                      <div className="flex justify-center items-center">
                        <DateRangePicker
                          ranges={[draft]}
                          onChange={handleChange}
                          dragSelectionEnabled={false}
                          months={isCompact ? 1 : 2}
                          direction={isCompact ? "vertical" : "horizontal"}
                          showDateDisplay={false}
                          showPreview={true}
                          moveRangeOnFirstSelection={false}
                          inputRanges={[]}
                          minDate={pickerBounds.minDate}
                          maxDate={pickerBounds.maxDate}
                          staticRanges={staticRanges}
                          rangeColors={["#14b8a6"]}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className="flex items-center justify-end gap-3">
                <Button
                  variant="flat"
                  onPress={onClose}
                  isDisabled={!!isFetching}
                  className="h-11 w-[120px] rounded-full bg-gray-100 text-primary font-medium dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </Button>

                <Button
                  onPress={apply}
                  isDisabled={!!isFetching}
                  startContent={
                    isFetching ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    ) : undefined
                  }
                  className="h-11 w-[120px] rounded-full bg-primary font-medium text-white hover:opacity-90"
                >
                  {isFetching ? "Applying..." : "Apply"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
