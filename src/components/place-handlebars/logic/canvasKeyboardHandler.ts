import { KeyboardEvent } from "react";

import {
  KEYBOARD_NUDGE_FAST_STEP,
  KEYBOARD_NUDGE_STEP,
  MARKER_FONT_SCALE_STEP,
  MARKER_SIZE_SCALE_FAST_STEP,
  MARKER_SIZE_SCALE_STEP,
} from "../constants";

type CanvasKeyboardHandlerOptions = {
  event: KeyboardEvent<HTMLDivElement>;
  activePointId: number | null;
  isSelectingAutoAlignArea: boolean;
  cancelSelectionMode: () => void;
  toggleActivePointKeyName: (pointId: number) => void;
  removePoint: (pointId: number) => void;
  adjustPointSizeScale: (
    pointId: number,
    widthDelta: number,
    heightDelta: number,
  ) => void;
  nudgePointPosition: (pointId: number, deltaX: number, deltaY: number) => void;
  adjustPointFontScale: (pointId: number, delta: number) => void;
};

export const handleCanvasKeyboard = ({
  event,
  activePointId,
  isSelectingAutoAlignArea,
  cancelSelectionMode,
  toggleActivePointKeyName,
  removePoint,
  adjustPointSizeScale,
  nudgePointPosition,
  adjustPointFontScale,
}: CanvasKeyboardHandlerOptions) => {
  if (event.key === "Escape" && isSelectingAutoAlignArea) {
    event.preventDefault();
    cancelSelectionMode();

    return;
  }

  if (activePointId === null) return;
  if (isSelectingAutoAlignArea) return;

  if (event.ctrlKey && event.key === "/") {
    event.preventDefault();
    toggleActivePointKeyName(activePointId);

    return;
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    removePoint(activePointId);

    return;
  }

  if (event.altKey) {
    const sizeStep = event.shiftKey
      ? MARKER_SIZE_SCALE_FAST_STEP
      : MARKER_SIZE_SCALE_STEP;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      adjustPointSizeScale(activePointId, -sizeStep, 0);

      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      adjustPointSizeScale(activePointId, sizeStep, 0);

      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      adjustPointSizeScale(activePointId, 0, -sizeStep);

      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      adjustPointSizeScale(activePointId, 0, sizeStep);

      return;
    }
  }

  const nudgeStep = event.shiftKey
    ? KEYBOARD_NUDGE_FAST_STEP
    : KEYBOARD_NUDGE_STEP;

  if (event.key === "ArrowUp") {
    event.preventDefault();
    nudgePointPosition(activePointId, 0, -nudgeStep);

    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    nudgePointPosition(activePointId, 0, nudgeStep);

    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    nudgePointPosition(activePointId, -nudgeStep, 0);

    return;
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    nudgePointPosition(activePointId, nudgeStep, 0);

    return;
  }

  const shouldIncreaseFont =
    event.key === "+" || event.key === "=" || event.code === "NumpadAdd";
  const shouldDecreaseFont =
    event.key === "-" || event.key === "_" || event.code === "NumpadSubtract";

  if (shouldIncreaseFont) {
    event.preventDefault();
    adjustPointFontScale(activePointId, MARKER_FONT_SCALE_STEP);

    return;
  }

  if (shouldDecreaseFont) {
    event.preventDefault();
    adjustPointFontScale(activePointId, -MARKER_FONT_SCALE_STEP);
  }
};
