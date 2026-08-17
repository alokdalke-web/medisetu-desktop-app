// import React from "react";

// import {
//   CanvasImageFitMode,
//   CanvasOrientation,
//   CanvasPaperSize,
//   DateDisplayFormat,
//   TimeDisplayFormat,
//   VitalsTableOrientation,
// } from "./types";
// import {
//   CANVAS_IMAGE_FIT_OPTIONS,
//   CANVAS_PAPER_SIZE_OPTIONS,
//   DATE_FORMAT_OPTIONS,
//   TIME_FORMAT_OPTIONS,
// } from "./constants";

// interface SettingsSidebarProps {
//   canvasPaperSize: CanvasPaperSize;
//   setCanvasPaperSize: (val: CanvasPaperSize) => void;
//   canvasOrientation: CanvasOrientation;
//   setCanvasOrientation: (val: CanvasOrientation) => void;
//   canvasImageFitMode: CanvasImageFitMode;
//   setCanvasImageFitMode: (val: CanvasImageFitMode) => void;
//   dateFormat: DateDisplayFormat;
//   setDateFormat: (val: DateDisplayFormat) => void;
//   timeFormat: TimeDisplayFormat;
//   setTimeFormat: (val: TimeDisplayFormat) => void;
//   vitalsTableOrientation: VitalsTableOrientation;
//   setVitalsTableOrientation: (val: VitalsTableOrientation) => void;
// }

// export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
//   canvasPaperSize,
//   setCanvasPaperSize,
//   canvasOrientation,
//   setCanvasOrientation,
//   canvasImageFitMode,
//   setCanvasImageFitMode,
//   dateFormat,
//   setDateFormat,
//   timeFormat,
//   setTimeFormat,
//   vitalsTableOrientation,
//   setVitalsTableOrientation,
// }) => {
//   return (
//     <aside className="hidden min-h-0 w-64 shrink-0 flex-col gap-0 overflow-y-auto border-r border-default-200 bg-content1 lg:flex">
//       <div className="border-b border-default-100 p-4">
//         <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-default-400">
//           Canvas
//         </p>
//         <div className="space-y-3">
//           <div>
//             <label
//               className="mb-1 block text-[10px] font-medium text-default-500"
//               htmlFor="canvas-paper-size"
//             >
//               Paper Size
//             </label>
//             <select
//               className="w-full rounded-lg border border-default-200 bg-default-50 px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
//               id="canvas-paper-size"
//               value={canvasPaperSize}
//               onChange={(event) =>
//                 setCanvasPaperSize(event.target.value as CanvasPaperSize)
//               }
//             >
//               {CANVAS_PAPER_SIZE_OPTIONS.map((sizeOption) => (
//                 <option
//                   key={sizeOption}
//                   className="bg-white text-black"
//                   value={sizeOption}
//                 >
//                   {sizeOption}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <p className="mb-1 block text-[10px] font-medium text-default-500">
//               Orientation
//             </p>
//             <div className="grid grid-cols-2 gap-1.5">
//               {(["portrait", "landscape"] as CanvasOrientation[]).map((opt) => (
//                 <button
//                   key={opt}
//                   className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[10px] font-medium capitalize transition-all ${
//                     canvasOrientation === opt
//                       ? "border-primary bg-primary text-primary-foreground shadow-sm"
//                       : "border-default-200 bg-default-50 text-default-600 hover:border-default-300 hover:bg-default-100"
//                   }`}
//                   type="button"
//                   onClick={() => setCanvasOrientation(opt)}
//                 >
//                   {opt === "portrait" ? (
//                     <svg
//                       className="h-3 w-3"
//                       fill="currentColor"
//                       viewBox="0 0 24 24"
//                     >
//                       <rect height="20" rx="2" width="14" x="5" y="2" />
//                     </svg>
//                   ) : (
//                     <svg
//                       className="h-3 w-3"
//                       fill="currentColor"
//                       viewBox="0 0 24 24"
//                     >
//                       <rect height="14" rx="2" width="20" x="2" y="5" />
//                     </svg>
//                   )}
//                   {opt}
//                 </button>
//               ))}
//             </div>
//           </div>

//           <div>
//             <label
//               className="mb-1 block text-[10px] font-medium text-default-500"
//               htmlFor="canvas-image-fit"
//             >
//               Image Fit
//             </label>
//             <select
//               className="w-full rounded-lg border border-default-200 bg-default-50 px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
//               id="canvas-image-fit"
//               value={canvasImageFitMode}
//               onChange={(event) =>
//                 setCanvasImageFitMode(event.target.value as CanvasImageFitMode)
//               }
//             >
//               {CANVAS_IMAGE_FIT_OPTIONS.map((fitOption) => (
//                 <option
//                   key={fitOption.value}
//                   className="bg-white text-black"
//                   value={fitOption.value}
//                 >
//                   {fitOption.label}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>
//       </div>

//       <div className="border-b border-default-100 p-4">
//         <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-default-400">
//           Date & Time
//         </p>
//         <div className="space-y-3">
//           <div>
//             <label
//               className="mb-1 block text-[10px] font-medium text-default-500"
//               htmlFor="date-format"
//             >
//               Date Format
//             </label>
//             <select
//               className="w-full rounded-lg border border-default-200 bg-default-50 px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
//               id="date-format"
//               value={dateFormat}
//               onChange={(event) =>
//                 setDateFormat(event.target.value as DateDisplayFormat)
//               }
//             >
//               {DATE_FORMAT_OPTIONS.map((formatOption) => (
//                 <option
//                   key={formatOption}
//                   className="bg-white text-black"
//                   value={formatOption}
//                 >
//                   {formatOption}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label
//               className="mb-1 block text-[10px] font-medium text-default-500"
//               htmlFor="time-format"
//             >
//               Time Format
//             </label>
//             <select
//               className="w-full rounded-lg border border-default-200 bg-default-50 px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
//               id="time-format"
//               value={timeFormat}
//               onChange={(event) =>
//                 setTimeFormat(event.target.value as TimeDisplayFormat)
//               }
//             >
//               {TIME_FORMAT_OPTIONS.map((formatOption) => (
//                 <option
//                   key={formatOption}
//                   className="bg-white text-black"
//                   value={formatOption}
//                 >
//                   {formatOption}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>
//       </div>

//       <div className="p-4">
//         <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-default-400">
//           Vitals Table
//         </p>
//         <div className="grid grid-cols-2 gap-1.5">
//           {(["horizontal", "vertical"] as VitalsTableOrientation[]).map(
//             (opt) => (
//               <button
//                 key={opt}
//                 className={`rounded-lg border py-2 text-[10px] font-medium capitalize transition-all ${
//                   vitalsTableOrientation === opt
//                     ? "border-primary bg-primary text-primary-foreground shadow-sm"
//                     : "border-default-200 bg-default-50 text-default-600 hover:border-default-300 hover:bg-default-100"
//                 }`}
//                 type="button"
//                 onClick={() => setVitalsTableOrientation(opt)}
//               >
//                 {opt}
//               </button>
//             ),
//           )}
//         </div>
//       </div>
//     </aside>
//   );
// };

import React from "react";

import {
  CanvasImageFitMode,
  CanvasOrientation,
  CanvasPaperSize,
  DateSeparator,
  DateDisplayFormat,
  TimeSeparator,
  TimeDisplayFormat,
} from "./types";
import {
  CANVAS_IMAGE_FIT_OPTIONS,
  CANVAS_PAPER_SIZE_OPTIONS,
  DATE_FORMAT_OPTIONS,
  DATE_SEPARATOR_OPTIONS,
  TIME_FORMAT_OPTIONS,
  TIME_SEPARATOR_OPTIONS,
} from "./constants";

interface SettingsSidebarProps {
  canvasPaperSize: CanvasPaperSize;
  setCanvasPaperSize: (val: CanvasPaperSize) => void;
  canvasOrientation: CanvasOrientation;
  setCanvasOrientation: (val: CanvasOrientation) => void;
  canvasImageFitMode: CanvasImageFitMode;
  setCanvasImageFitMode: (val: CanvasImageFitMode) => void;
  dateFormat: DateDisplayFormat;
  setDateFormat: (val: DateDisplayFormat) => void;
  dateSeparator: DateSeparator;
  setDateSeparator: (val: DateSeparator) => void;
  timeFormat: TimeDisplayFormat;
  setTimeFormat: (val: TimeDisplayFormat) => void;
  timeSeparator: TimeSeparator;
  setTimeSeparator: (val: TimeSeparator) => void;
}

// ── Reusable primitives ────────────────────────────────────────────────────────

const Divider = () => (
  <div className="mx-2 h-6 w-px shrink-0 bg-default-200" aria-hidden="true" />
);

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="shrink-0 text-[9px] font-semibold uppercase tracking-widest text-default-400">
    {children}
  </span>
);

const IconSelect = ({
  id,
  icon,
  value,
  onChange,
  children,
  "aria-label": ariaLabel,
}: {
  id?: string;
  icon: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  children: React.ReactNode;
  "aria-label"?: string;
}) => (
  <div className="relative flex shrink-0 items-center">
    <span className="pointer-events-none absolute left-2 flex items-center text-default-400">
      {icon}
    </span>
    <select
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 cursor-pointer appearance-none rounded-lg border border-default-200 bg-white py-0 pl-7 pr-6 text-xs text-foreground transition-colors hover:border-default-300 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
    >
      {children}
    </select>
    {/* chevron */}
    <span className="pointer-events-none absolute right-1.5 flex items-center text-default-400">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M2 3.5L5 6.5L8 3.5" />
      </svg>
    </span>
  </div>
);

const ToggleGroup = <T extends string>({
  options,
  value,
  onChange,
  renderOption,
}: {
  options: T[];
  value: T;
  onChange: (val: T) => void;
  renderOption: (opt: T) => React.ReactNode;
}) => (
  <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-default-200 bg-default-50 p-0.5">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(opt)}
        className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-medium capitalize transition-all ${
          value === opt
            ? "bg-teal-700 text-white shadow-sm"
            : "text-default-600 hover:bg-default-100"
        }`}
        aria-pressed={value === opt}
      >
        {renderOption(opt)}
      </button>
    ))}
  </div>
);

// ── Icons ──────────────────────────────────────────────────────────────────────

const PageIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="1" width="8" height="11" rx="1.2" />
    <path d="M10 3.5l1.5 1.5-1.5 1.5" />
  </svg>
);

const FitIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <rect x="1" y="1" width="12" height="12" rx="1.5" />
    <path d="M4 4h6v6H4z" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="2" width="12" height="11" rx="1.5" />
    <path d="M1 6h12M4.5 1v2M9.5 1v2" />
  </svg>
);

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <circle cx="7" cy="7" r="5.5" />
    <path d="M7 4.5V7l2 1.2" />
  </svg>
);

const PortraitIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <rect x="1.5" y="0.5" width="7" height="9" rx="1.2" />
  </svg>
);

const LandscapeIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <rect x="0.5" y="1.5" width="9" height="7" rx="1.2" />
  </svg>
);

// ── Main component ─────────────────────────────────────────────────────────────

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  canvasPaperSize,
  setCanvasPaperSize,
  canvasOrientation,
  setCanvasOrientation,
  canvasImageFitMode,
  setCanvasImageFitMode,
  dateFormat,
  setDateFormat,
  dateSeparator,
  setDateSeparator,
  timeFormat,
  setTimeFormat,
  timeSeparator,
  setTimeSeparator,
}) => {
  return (
<header
  role="toolbar"
  aria-label="Canvas settings"
  className="
    flex w-full flex-wrap items-center justify-between
    gap-x-1 gap-y-1
    border-b border-default-200 bg-content1
    px-2 py-1
  "
>
  {/* LEFT SECTION */}
  <div className="flex flex-wrap items-center gap-1 min-w-0 justify-between">
    <GroupLabel>Canvas</GroupLabel>

    <IconSelect
      id="canvas-paper-size"
      aria-label="Paper size"
      icon={<PageIcon />}
      value={canvasPaperSize}
      onChange={(v) => setCanvasPaperSize(v as CanvasPaperSize)}
    >
      {CANVAS_PAPER_SIZE_OPTIONS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </IconSelect>

    <ToggleGroup
      options={["portrait", "landscape"] as CanvasOrientation[]}
      value={canvasOrientation}
      onChange={setCanvasOrientation}
      renderOption={(opt) => (
        <>
          {opt === "portrait" ? <PortraitIcon /> : <LandscapeIcon />}
          <span className="hidden sm:inline">{opt}</span>
        </>
      )}
    />

    <IconSelect
      id="canvas-image-fit"
      aria-label="Image fit"
      icon={<FitIcon />}
      value={canvasImageFitMode}
      onChange={(v) => setCanvasImageFitMode(v as CanvasImageFitMode)}
    >
      {CANVAS_IMAGE_FIT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </IconSelect>
  </div>

  {/* RIGHT SECTION */}
  <div className="flex flex-wrap items-center gap-1 min-w-0 justify-between">
    <Divider/>

    <GroupLabel>Date &amp; Time</GroupLabel>

    <IconSelect
      id="date-format"
      aria-label="Date format"
      icon={<CalendarIcon />}
      value={dateFormat}
      onChange={(v) => setDateFormat(v as DateDisplayFormat)}
    >
      {DATE_FORMAT_OPTIONS.map((f) => (
        <option key={f} value={f}>{f}</option>
      ))}
    </IconSelect>

    <IconSelect
      id="date-separator"
      aria-label="Date separator"
      icon={<CalendarIcon />}
      value={dateSeparator}
      onChange={(v) => setDateSeparator(v as DateSeparator)}
    >
      {DATE_SEPARATOR_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </IconSelect>

    <IconSelect
      id="time-format"
      aria-label="Time format"
      icon={<ClockIcon />}
      value={timeFormat}
      onChange={(v) => setTimeFormat(v as TimeDisplayFormat)}
    >
      {TIME_FORMAT_OPTIONS.map((f) => (
        <option key={f} value={f}>{f}</option>
      ))}
    </IconSelect>

    <IconSelect
      id="time-separator"
      aria-label="Time separator"
      icon={<ClockIcon />}
      value={timeSeparator}
      onChange={(v) => setTimeSeparator(v as TimeSeparator)}
    >
      {TIME_SEPARATOR_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </IconSelect>
  </div>
</header>
  );
};
