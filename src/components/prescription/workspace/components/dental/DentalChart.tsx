import React, { useState } from "react";
import type { DentalChartProps } from "../../../../../types/prescription";
import {
  LOWER_ARCH_TEETH,
  UPPER_ARCH_TEETH,
  toothKey,
} from "../../helpers/dentalChart";
import {
  LOWER_GEOMETRY,
  UPPER_GEOMETRY,
  getToothScale,
  getToothType,
} from "../../helpers/toothGeometry";
import ToothNoteModal from "./ToothNoteModal";

/**
 * Enamel is ivory in either theme — these are illustrations of a physical
 * object, like a photo, so they intentionally don't follow the surface tokens.
 * Defined once for the whole chart: 32 copies of the same gradient `id` would
 * be duplicate DOM ids.
 */
const ToothDefs: React.FC = () => (
  <svg width="0" height="0" className="absolute" aria-hidden="true">
    <defs>
      <linearGradient id="toothEnamel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#e8e1d2" />
        <stop offset="30%" stopColor="#f8f5ee" />
        <stop offset="70%" stopColor="#fffefb" />
        <stop offset="100%" stopColor="#efe8d8" />
      </linearGradient>

      <linearGradient id="toothEnamelActive" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#cdeaec" />
        <stop offset="40%" stopColor="#eefafb" />
        <stop offset="100%" stopColor="#d8f1f2" />
      </linearGradient>

      {/* Specular bulge, drawn with the tooth's own path so it self-clips. */}
      <radialGradient id="toothSheen" cx="38%" cy="26%" r="62%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="55%" stopColor="#ffffff" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>

      {/* Warm occlusion shadow toward the root/incisal end. */}
      <linearGradient id="toothDepth" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#b09b74" stopOpacity="0" />
        <stop offset="62%" stopColor="#b09b74" stopOpacity="0" />
        <stop offset="100%" stopColor="#b09b74" stopOpacity="0.3" />
      </linearGradient>

      <filter id="toothShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.4" floodColor="#0f172a" floodOpacity="0.1" />
      </filter>
    </defs>
  </svg>
);

const ToothSvg: React.FC<{
  n: number;
  isUpper: boolean;
  hasNote: boolean;
}> = ({ n, isUpper, hasNote }) => {
  const geom = (isUpper ? UPPER_GEOMETRY : LOWER_GEOMETRY)[getToothType(n)];

  return (
    <svg viewBox="0 0 100 120" className="h-24 w-16" aria-hidden="true">
      <path
        d={geom.path}
        fill={hasNote ? "url(#toothEnamelActive)" : "url(#toothEnamel)"}
        stroke={hasNote ? "#0a6c74" : "#d8cfba"}
        strokeWidth={hasNote ? 2 : 1.1}
        strokeLinejoin="round"
        filter="url(#toothShadow)"
      />

      {/* Same `d` reused so the shading is clipped to the silhouette. */}
      <path d={geom.path} fill="url(#toothDepth)" pointerEvents="none" />
      <path d={geom.path} fill="url(#toothSheen)" pointerEvents="none" />

      {geom.innerPaths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={hasNote ? "#0a6c74" : "#cdc2a9"}
          strokeWidth={1.1}
          strokeLinecap="round"
          opacity={hasNote ? 0.55 : 0.65}
          pointerEvents="none"
        />
      ))}
    </svg>
  );
};

const ToothColumn: React.FC<{
  n: number;
  isUpper: boolean;
  hasNote: boolean;
  onClick: () => void;
}> = ({ n, isUpper, hasNote, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`Tooth ${n}${hasNote ? ", note recorded" : ""}`}
    className={[
      "group flex shrink-0 items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      isUpper ? "flex-col-reverse" : "flex-col",
    ].join(" ")}
  >
    <span
      style={{ transform: `scale(${getToothScale(n)})` }}
      className="flex h-24 w-16 origin-bottom items-end justify-center transition-transform duration-200 group-hover:brightness-105 group-active:scale-95"
    >
      <ToothSvg n={n} isUpper={isUpper} hasNote={hasNote} />
    </span>

    <span
      className={[
        "flex h-7 w-11 items-center justify-center rounded-md border text-[11px] font-bold transition-colors",
        hasNote
          ? "border-primary bg-primary/10 text-primary dark:border-primary-hover dark:bg-primary-hover/15 dark:text-primary-hover"
          : "border-line bg-surface text-text-muted group-hover:border-primary/50 group-hover:bg-primary/5",
      ].join(" ")}
    >
      {n}
    </span>
  </button>
);

const ArchRow: React.FC<{
  teeth: number[];
  isUpper: boolean;
  value: Record<string, string>;
  onToothClick: (n: number) => void;
}> = ({ teeth, isUpper, value, onToothClick }) => (
  <div className="flex w-max items-end gap-1.5">
    {teeth.map((n, idx) => (
      <React.Fragment key={n}>
        {idx === 8 && (
          <span
            aria-hidden="true"
            className="mx-2 h-24 w-px shrink-0 self-center bg-line"
          />
        )}
        <ToothColumn
          n={n}
          isUpper={isUpper}
          hasNote={Boolean(value[toothKey(n)]?.trim())}
          onClick={() => onToothClick(n)}
        />
      </React.Fragment>
    ))}
  </div>
);

const DentalChart: React.FC<DentalChartProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [activeTooth, setActiveTooth] = useState<string | null>(null);

  const openTooth = (n: number) => setActiveTooth(toothKey(n));
  const closeModal = () => setActiveTooth(null);

  const handleSave = (key: string, note: string) => {
    onChange({ ...value, [key]: note });
  };

  const handleRemove = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <ToothDefs />

      <div className="flex items-center justify-center gap-3">
        <h3 className="text-sm font-bold text-text">Dental Chart</h3>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-subtle">
          <span className="inline-block h-3 w-3 rounded border border-primary bg-primary/15" />
          Note Recorded
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-6 overflow-x-auto pb-1 items-center justify-between">
        <ArchRow
          teeth={UPPER_ARCH_TEETH}
          isUpper
          value={value}
          onToothClick={openTooth}
        />
        <ArchRow
          teeth={LOWER_ARCH_TEETH}
          isUpper={false}
          value={value}
          onToothClick={openTooth}
        />
      </div>

      <ToothNoteModal
        isOpen={activeTooth !== null}
        toothKey={activeTooth}
        initialNote={activeTooth ? value[activeTooth] ?? "" : ""}
        disabled={disabled}
        onSave={handleSave}
        onRemove={handleRemove}
        onClose={closeModal}
      />
    </div>
  );
};

export default DentalChart;
