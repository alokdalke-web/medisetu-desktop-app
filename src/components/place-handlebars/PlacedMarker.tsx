import React, { useMemo, useState } from "react";

import {
  HandlebarPoint,
  DateSeparator,
  DateDisplayFormat,
  TimeSeparator,
  TimeDisplayFormat,
  VitalsTableOrientation,
} from "./types";
import {
  CLINIC_LOGO_BASE_HEIGHT_PX,
  CLINIC_LOGO_BASE_WIDTH_PX,
  CLINIC_LOGO_FIELD_ID,
  HANDLEBAR_FIELDS_BY_ID,
  VITALS_TABLE_ID,
  MARKER_FONT_SCALE_STEP,
} from "./constants";
import { resolveFieldDisplayValue } from "./utils";
import { TablePreview } from "./TablePreview";

interface PlacedMarkerProps {
  point: HandlebarPoint;
  activePointId: number | null;
  draggingPointId: number | null;
  isSelectingAutoAlignArea: boolean;
  vitalsTableOrientation: VitalsTableOrientation;
  dateFormat: DateDisplayFormat;
  dateSeparator: DateSeparator;
  timeFormat: TimeDisplayFormat;
  timeSeparator: TimeSeparator;
  getPointFontSize: (point: HandlebarPoint) => number;
  onSetActivePointId: (id: number) => void;
  onPointDragStart: (
    event: React.DragEvent<HTMLButtonElement>,
    id: number,
  ) => void;
  onPointDragEnd: () => void;
  onAdjustPointFontScale: (id: number, step: number) => void;
  onRemovePoint: (id: number) => void;
  onFocusContainer: () => void;
}

export const PlacedMarker: React.FC<PlacedMarkerProps> = ({
  point,
  activePointId,
  draggingPointId,
  isSelectingAutoAlignArea,
  vitalsTableOrientation,
  dateFormat,
  dateSeparator,
  timeFormat,
  timeSeparator,
  getPointFontSize,
  onSetActivePointId,
  onPointDragStart,
  onPointDragEnd,
  onAdjustPointFontScale,
  onRemovePoint,
  onFocusContainer,
}) => {
  const isActivePoint = activePointId === point.id;
  const pointFieldMeta = HANDLEBAR_FIELDS_BY_ID.get(point.key);
  const isTableMarker = Boolean(pointFieldMeta?.tablePreview);
  const isLogoMarker = point.key === CLINIC_LOGO_FIELD_ID;
  const [isLogoLoadFailed, setIsLogoLoadFailed] = useState(false);
  const pointAlignDirection = point.alignDirection ?? "left-to-right";
  const markerTranslateX =
    pointAlignDirection === "center"
      ? "-50%"
      : pointAlignDirection === "right-to-left"
        ? "-100%"
        : "0";
  const markerTransformOriginX =
    pointAlignDirection === "center"
      ? "center"
      : pointAlignDirection === "right-to-left"
        ? "right"
        : "left";
  const markerFontSize = getPointFontSize(point);
  const markerOrientation: VitalsTableOrientation =
    point.key === VITALS_TABLE_ID ? vitalsTableOrientation : "horizontal";
  const markerValue = useMemo(
    () =>
      resolveFieldDisplayValue(
        point.key,
        pointFieldMeta?.dummyValue ?? "Sample value",
        dateFormat,
        dateSeparator,
        timeFormat,
        timeSeparator,
      ),
    [point.key, pointFieldMeta?.dummyValue, dateFormat, dateSeparator, timeFormat, timeSeparator],
  );
  const logoSource = markerValue.trim();
  const shouldRenderLogo = isLogoMarker && logoSource.length > 0 && !isLogoLoadFailed;

  return (
    <div
      className={`group absolute ${isSelectingAutoAlignArea ? "pointer-events-none" : ""}`}
      style={{
        left: `${point.x}%`,
        top: `${point.y}%`,
        transform: `translate(${markerTranslateX}, -50%)`,
      }}
    >
      <button
        className={`rounded-md font-semibold leading-[1.2] transition-all duration-100 text-black ${
          isTableMarker || isLogoMarker
            ? isActivePoint
              ? "bg-white/20 shadow-lg shadow-primary/30 ring-2 ring-primary/50 ring-offset-1 border border-primary/40 text-xs"
              : "bg-transparent shadow-sm hover:shadow-md border border-black/20 hover:border-black/40 text-xs"
            : isActivePoint
              ? "bg-white/85 shadow-[0_1px_2px_rgba(0,0,0,0.2)] ring-2 ring-primary/60 ring-offset-1"
              : "bg-white/80 shadow-[0_1px_2px_rgba(0,0,0,0.18)] ring-1 ring-black/35 hover:ring-black/50"
        } ${draggingPointId === point.id ? "opacity-60 scale-95" : ""} ${
          isTableMarker
            ? "w-[300px] p-1"
            : isLogoMarker
              ? "max-w-none p-0.5"
              : "max-w-[320px] truncate p-0"
        }`}
        data-handlebar-id={point.key}
        draggable={!isSelectingAutoAlignArea}
        style={{
          fontSize: `${markerFontSize}px`,
          transform: `scale(${point.widthScale}, ${point.heightScale})`,
          transformOrigin: `${markerTransformOriginX} center`,
          textAlign:
            pointAlignDirection === "center"
              ? "center"
              : pointAlignDirection === "right-to-left"
                ? "right"
                : "left",
        }}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSetActivePointId(point.id);
          onFocusContainer();
        }}
        onDragEnd={onPointDragEnd}
        onDragStart={(event) => onPointDragStart(event, point.id)}
      >
        {pointFieldMeta?.tablePreview ? (
          <TablePreview
            compact={true}
            fontSizePx={markerFontSize}
            forceLight={true}
            orientation={markerOrientation}
            tablePreview={pointFieldMeta.tablePreview}
          />
        ) : shouldRenderLogo ? (
          <img
            alt={pointFieldMeta?.alias ?? "Clinic logo"}
            className="pointer-events-none block select-none"
            draggable={false}
            src={logoSource}
            style={{
              width: `${CLINIC_LOGO_BASE_WIDTH_PX}px`,
              height: `${CLINIC_LOGO_BASE_HEIGHT_PX}px`,
              objectFit: "contain",
            }}
            onError={() => {
              setIsLogoLoadFailed(true);
            }}
          />
        ) : (
          <>
            {point.showKeyName && (
              <span className="opacity-60 mr-1 font-medium">
                {pointFieldMeta?.alias ?? point.key}:
              </span>
            )}
            {markerValue}
          </>
        )}
      </button>

      <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          aria-label={`Increase font size for ${pointFieldMeta?.alias ?? point.key}`}
          className="flex h-5 w-5 items-center justify-center rounded-md border border-zinc-300 bg-white text-[10px] font-bold text-black shadow-sm hover:bg-zinc-100"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAdjustPointFontScale(point.id, MARKER_FONT_SCALE_STEP);
          }}
        >
          +
        </button>
        <button
          aria-label={`Decrease font size for ${pointFieldMeta?.alias ?? point.key}`}
          className="flex h-5 w-5 items-center justify-center rounded-md border border-zinc-300 bg-white text-[10px] font-bold text-black shadow-sm hover:bg-zinc-100"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAdjustPointFontScale(point.id, -MARKER_FONT_SCALE_STEP);
          }}
        >
          −
        </button>
      </div>

      <button
        aria-label={`Delete ${pointFieldMeta?.alias ?? point.key}`}
        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white shadow-md opacity-0 transition-all group-hover:opacity-100 group-focus-within:opacity-100 hover:scale-110"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemovePoint(point.id);
        }}
      >
        <svg
          aria-hidden="true"
          className="h-2.5 w-2.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
