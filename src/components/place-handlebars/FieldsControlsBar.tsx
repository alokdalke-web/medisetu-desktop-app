import React from "react";
import { Button } from "@heroui/react";

import { AutoAlignDirection, VitalsTableOrientation } from "./types";

export interface FieldsControlsBarProps {
  showKeyNames: boolean;
  toggleShowKeyNames: () => void;
  activePointId: number | null;
  activePointFontSize: number | null;
  setActivePointFontSize: (fontSize: number) => void;
  increaseActivePointFontSize: () => void;
  decreaseActivePointFontSize: () => void;
  activePointAlignDirection: AutoAlignDirection;
  setActivePointAlignDirection: (direction: AutoAlignDirection) => void;
  vitalsTableOrientation: VitalsTableOrientation;
  setVitalsTableOrientation: (orientation: VitalsTableOrientation) => void;
  isAutoAlignRevertable: boolean;
  isAutoAlignRunning: boolean;
  revertAutoAlign: () => void;
  beginPrecisionSelectForAutoAlign: () => void;
  autoAlignCandidates: string[];
}

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="shrink-0 text-[9px] font-semibold uppercase tracking-widest text-default-400">
    {children}
  </span>
);

const Divider = () => (
  <div className="mx-1 h-6 w-px shrink-0 bg-default-200" aria-hidden="true" />
);

const AlignLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <path d="M2 3h8M2 6h10M2 9h8M2 12h10" />
  </svg>
);

const AlignCenterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <path d="M3 3h8M2 6h10M3 9h8M2 12h10" />
  </svg>
);

const AlignRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <path d="M4 3h8M2 6h10M4 9h8M2 12h10" />
  </svg>
);

const HorizontalTableIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <rect x="0.5" y="2" width="11" height="8" rx="1.2" />
    <path d="M0.5 5.5h11M4 2v8" />
  </svg>
);

const VerticalTableIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <rect x="2" y="0.5" width="8" height="11" rx="1.2" />
    <path d="M5.5 0.5v11M2 4h8" />
  </svg>
);

export const FieldsControlsBar: React.FC<FieldsControlsBarProps> = ({
  showKeyNames,
  toggleShowKeyNames,
  activePointId,
  activePointFontSize,
  setActivePointFontSize,
  increaseActivePointFontSize,
  decreaseActivePointFontSize,
  activePointAlignDirection,
  setActivePointAlignDirection,
  vitalsTableOrientation,
  setVitalsTableOrientation,
  isAutoAlignRevertable,
  isAutoAlignRunning,
  revertAutoAlign,
  beginPrecisionSelectForAutoAlign,
  autoAlignCandidates,
}) => {
  const presetFontSizes = [9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32];
  const fontSizeOptions =
    activePointFontSize !== null && !presetFontSizes.includes(activePointFontSize)
      ? [...presetFontSizes, activePointFontSize].sort((a, b) => a - b)
      : presetFontSizes;

  return (
    <header
      role="toolbar"
      aria-label="Field controls"
      className="flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-default-200 bg-content1 px-3 scrollbar-hide justify-between"
    >
      <Button
        className="h-8"
        color={showKeyNames ? "primary" : "default"}
        size="sm"
        variant={showKeyNames ? "solid" : "bordered"}
        onPress={toggleShowKeyNames}
      >
        {/* {showKeyNames ? "Key Names: ON" : "Key Names: OFF"} */}
        Show Keys
      </Button>

      <Divider />
      <GroupLabel>Font</GroupLabel>

      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-default-200 bg-default-50 p-1">
        <Button
          aria-label="Decrease font size"
          className="h-7 min-w-0 px-2 font-mono"
          isDisabled={activePointId === null}
          size="sm"
          title="Decrease font size"
          variant="bordered"
          onClick={decreaseActivePointFontSize}
        >
          v
        </Button>

        <select
          aria-label="Font size"
          className="h-7 min-w-[62px] rounded-md border border-default-200 bg-white px-2 text-xs text-foreground focus:border-primary focus:outline-none"
          disabled={activePointId === null || activePointFontSize === null}
          value={String(activePointFontSize ?? "")}
          onChange={(event) => setActivePointFontSize(Number(event.target.value))}
        >
          {fontSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        <Button
          aria-label="Increase font size"
          className="h-7 min-w-0 px-2 font-mono"
          isDisabled={activePointId === null}
          size="sm"
          title="Increase font size"
          variant="bordered"
          onClick={increaseActivePointFontSize}
        >
          ^
        </Button>
      </div>

      <Divider />
      <GroupLabel>Direction</GroupLabel>

      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-default-200 bg-default-50 p-0.5">
        <Button
          aria-label="Align left"
          className="h-7 min-w-0 px-2"
          color={activePointAlignDirection === "left-to-right" ? "primary" : "default"}
          isDisabled={activePointId === null}
          size="sm"
          variant={activePointAlignDirection === "left-to-right" ? "solid" : "bordered"}
          title="Align left"
          onClick={() => setActivePointAlignDirection("left-to-right")}
        >
          <AlignLeftIcon />
        </Button>
        <Button
          aria-label="Align center"
          className="h-7 min-w-0 px-2"
          color={activePointAlignDirection === "center" ? "primary" : "default"}
          isDisabled={activePointId === null}
          size="sm"
          variant={activePointAlignDirection === "center" ? "solid" : "bordered"}
          title="Align center"
          onClick={() => setActivePointAlignDirection("center")}
        >
          <AlignCenterIcon />
        </Button>
        <Button
          aria-label="Align right"
          className="h-7 min-w-0 px-2"
          color={activePointAlignDirection === "right-to-left" ? "primary" : "default"}
          isDisabled={activePointId === null}
          size="sm"
          variant={activePointAlignDirection === "right-to-left" ? "solid" : "bordered"}
          title="Align right"
          onClick={() => setActivePointAlignDirection("right-to-left")}
        >
          <AlignRightIcon />
        </Button>
      </div>

      <Divider />
      <GroupLabel>Vitals</GroupLabel>

      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-default-200 bg-default-50 p-0.5">
        {(["horizontal", "vertical"] as VitalsTableOrientation[]).map(
          (orientation) => (
            <Button
              key={orientation}
              aria-label={`Set vitals table ${orientation}`}
              className="h-7 min-w-0 px-2 capitalize"
              color={
                vitalsTableOrientation === orientation ? "primary" : "default"
              }
              size="sm"
              title={`Vitals table ${orientation}`}
              variant={
                vitalsTableOrientation === orientation ? "solid" : "bordered"
              }
              onPress={() => setVitalsTableOrientation(orientation)}
            >
              {orientation === "horizontal" ? (
                <HorizontalTableIcon />
              ) : (
                <VerticalTableIcon />
              )}
              <span className="ml-1">{orientation}</span>
            </Button>
          ),
        )}
      </div>

      <Divider />

      {isAutoAlignRevertable ? (
        <Button
          className="h-8 border border-warning bg-warning/20 text-warning hover:bg-warning hover:text-white"
          isDisabled={isAutoAlignRunning}
          size="sm"
          variant="bordered"
          onPress={revertAutoAlign}
        >
          Undo Auto Align
        </Button>
      ) : (
        <Button
          className="h-8"
          color="primary"
          isDisabled={autoAlignCandidates.length === 0 || isAutoAlignRunning}
          size="sm"
          onPress={beginPrecisionSelectForAutoAlign}
        >
          {isAutoAlignRunning
            ? "Aligning with AI..."
            : `Auto Align Remaining (${autoAlignCandidates.length})`}
        </Button>
      )}
    </header>
  );
};
