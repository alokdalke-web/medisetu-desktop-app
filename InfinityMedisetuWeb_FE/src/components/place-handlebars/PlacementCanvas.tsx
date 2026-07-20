import {
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";

import {
  HandlebarPoint,
  NormalizedSelectionArea,
  VitalsTableOrientation,
  DateSeparator,
  DateDisplayFormat,
  TimeSeparator,
  TimeDisplayFormat,
} from "./types";
import { PlacedMarker } from "./PlacedMarker";

export interface PlacementCanvasProps {
  activePointId: number | null;
  adjustPointFontScale: (pointId: number, delta: number) => void;
  canvasContainerStyle: CSSProperties;
  canvasImageStyle: CSSProperties;
  canvasViewportRef: RefObject<HTMLDivElement | null>;
  dateFormat: DateDisplayFormat;
  dateSeparator: DateSeparator;
  draggingPointId: number | null;
  getPointFontSize: (point: HandlebarPoint) => number;
  handleCanvasKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  handleImageDragLeave: () => void;
  handleImageDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleImageDrop: (event: DragEvent<HTMLDivElement>) => void;
  handlePointDragEnd: () => void;
  handlePointDragStart: (
    event: DragEvent<HTMLButtonElement>,
    pointId: number,
  ) => void;
  handleSelectionMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  handleSelectionMouseLeave: () => void;
  handleSelectionMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
  handleSelectionMouseUp: (event: MouseEvent<HTMLDivElement>) => void;
  imageContainerRef: RefObject<HTMLDivElement | null>;
  imageUrl: string;
  isDragOverImage: boolean;
  isSelectingAutoAlignArea: boolean;
  onError: (message: string) => void;
  onImageReady: () => void;
  points: HandlebarPoint[];
  removePoint: (pointId: number) => void;
  selectionOverlayArea: NormalizedSelectionArea | null;
  setActivePointId: (pointId: number | null) => void;
  timeFormat: TimeDisplayFormat;
  timeSeparator: TimeSeparator;
  vitalsTableOrientation: VitalsTableOrientation;
}

export const PlacementCanvas = ({
  activePointId,
  adjustPointFontScale,
  canvasContainerStyle,
  canvasImageStyle,
  canvasViewportRef,
  dateFormat,
  dateSeparator,
  draggingPointId,
  getPointFontSize,
  handleCanvasKeyDown,
  handleImageDragLeave,
  handleImageDragOver,
  handleImageDrop,
  handlePointDragEnd,
  handlePointDragStart,
  handleSelectionMouseDown,
  handleSelectionMouseLeave,
  handleSelectionMouseMove,
  handleSelectionMouseUp,
  imageContainerRef,
  imageUrl,
  isDragOverImage,
  isSelectingAutoAlignArea,
  onError,
  onImageReady,
  points,
  removePoint,
  selectionOverlayArea,
  setActivePointId,
  timeFormat,
  timeSeparator,
  vitalsTableOrientation,
}: PlacementCanvasProps) => {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.015)_10px,rgba(0,0,0,0.015)_11px)]">
      {/* Canvas status banner */}
      {isSelectingAutoAlignArea && (
        <div className="mb-4 flex w-full max-w-2xl items-center gap-2 rounded-xl border border-primary/30 bg-primary/8 px-4 py-2.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <p className="text-xs font-medium text-primary">
            Precision select active — drag on the canvas to mark the auto-align
            region, or press Escape to cancel
          </p>
        </div>
      )}

      <div
        ref={canvasViewportRef}
        className="flex min-h-0 w-full flex-1 items-center justify-center"
      >
        <div
          ref={imageContainerRef}
          aria-label="Image placement canvas"
          className={`relative w-full overflow-hidden rounded-2xl shadow-xl ring-1 transition-all duration-150 ${
            isSelectingAutoAlignArea
              ? "cursor-crosshair ring-primary ring-offset-2"
              : isDragOverImage
                ? "ring-primary/60 ring-offset-2 scale-[1.002]"
                : "ring-default-200"
          }`}
          role="button"
          style={canvasContainerStyle}
          tabIndex={0}
          onDragLeave={handleImageDragLeave}
          onDragOver={handleImageDragOver}
          onDrop={handleImageDrop}
          onKeyDown={handleCanvasKeyDown}
          onMouseDown={handleSelectionMouseDown}
          onMouseLeave={handleSelectionMouseLeave}
          onMouseMove={handleSelectionMouseMove}
          onMouseUp={handleSelectionMouseUp}
        >
          <img
            alt="Template placement preview"
            className="pointer-events-none absolute select-none"
            draggable={false}
            src={imageUrl}
            style={canvasImageStyle}
            onDragStart={(event) => {
              event.preventDefault();
            }}
            onError={() => {
              onError(
                "Could not load the preview image in Place Handlebars. Please go back and choose another image.",
              );
            }}
            onLoad={onImageReady}
          />

          {/* Drop hint — only when no points yet */}
          {points.length === 0 && !isSelectingAutoAlignArea && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="rounded-xl border-2 border-dashed border-zinc-400/60 bg-white/60 px-6 py-4 text-center backdrop-blur-sm shadow-sm">
                <svg
                  className="mx-auto mb-1.5 h-7 w-7 text-zinc-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 4v16m0-16l-4 4m4-4 4 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect height="3" rx="1" width="16" x="4" y="17" />
                </svg>
                <p className="text-xs font-semibold text-black">
                  Drag a field here to place it
                </p>
              </div>
            </div>
          )}

          {/* Selection overlay */}
          {selectionOverlayArea ? (
            <div
              className="pointer-events-none absolute border-2 border-primary bg-primary/10 backdrop-blur-[1px]"
              style={{
                left: `${selectionOverlayArea.minX}%`,
                top: `${selectionOverlayArea.minY}%`,
                width: `${selectionOverlayArea.maxX - selectionOverlayArea.minX}%`,
                height: `${selectionOverlayArea.maxY - selectionOverlayArea.minY}%`,
              }}
            >
              {/* <div className="absolute -top-5 left-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-medium text-white">
                Auto-align region
              </div> */}
            </div>
          ) : null}

          {/* Placed handlebar points */}
          {points.map((point) => {
            return (
              <PlacedMarker
                key={point.id}
                activePointId={activePointId}
                dateFormat={dateFormat}
                dateSeparator={dateSeparator}
                draggingPointId={draggingPointId}
                getPointFontSize={getPointFontSize}
                isSelectingAutoAlignArea={isSelectingAutoAlignArea}
                point={point}
                timeFormat={timeFormat}
                timeSeparator={timeSeparator}
                vitalsTableOrientation={vitalsTableOrientation}
                onAdjustPointFontScale={adjustPointFontScale}
                onFocusContainer={() => imageContainerRef.current?.focus()}
                onPointDragEnd={handlePointDragEnd}
                onPointDragStart={handlePointDragStart}
                onRemovePoint={removePoint}
                onSetActivePointId={setActivePointId}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
