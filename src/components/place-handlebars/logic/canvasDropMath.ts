import { CanvasImageFitMode } from "../types";
import { clampPercent } from "../utils";

type CanvasContentBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const getCanvasContentBounds = (
  container: HTMLDivElement | null,
): CanvasContentBounds | null => {
  if (!container) return null;

  const bounds = container.getBoundingClientRect();
  const width = container.clientWidth || bounds.width;
  const height = container.clientHeight || bounds.height;

  if (width <= 0 || height <= 0) return null;

  return {
    left: bounds.left + container.clientLeft,
    top: bounds.top + container.clientTop,
    width,
    height,
  };
};

export const getPercentPositionFromClient = (
  container: HTMLDivElement | null,
  clientX: number,
  clientY: number,
) => {
  const bounds = getCanvasContentBounds(container);

  if (!bounds) return null;

  return {
    x: clampPercent(((clientX - bounds.left) / bounds.width) * 100),
    y: clampPercent(((clientY - bounds.top) / bounds.height) * 100),
  };
};

export const isClientPointOverImage = (
  container: HTMLDivElement | null,
  canvasImageFitMode: CanvasImageFitMode,
  clientX: number,
  clientY: number,
) => {
  if (!container) return false;

  const img = container.querySelector("img");

  if (!img) return false;

  const contentBounds = getCanvasContentBounds(container);

  if (!contentBounds) return false;

  const localX = clientX - contentBounds.left;
  const localY = clientY - contentBounds.top;

  if (
    canvasImageFitMode === "cover" ||
    canvasImageFitMode === "stretch" ||
    canvasImageFitMode === "original"
  ) {
    return (
      localX >= 0 &&
      localX <= contentBounds.width &&
      localY >= 0 &&
      localY <= contentBounds.height
    );
  }

  const naturalWidth = img.naturalWidth || 1;
  const naturalHeight = img.naturalHeight || 1;
  const containerWidth = contentBounds.width;
  const containerHeight = contentBounds.height;
  let renderWidth = containerWidth;
  let renderHeight = containerHeight;

  const imgRatio = naturalWidth / naturalHeight;
  const containerRatio = containerWidth / containerHeight;

  if (canvasImageFitMode === "contain") {
    if (imgRatio > containerRatio) {
      renderHeight = containerWidth / imgRatio;
    } else {
      renderWidth = containerHeight * imgRatio;
    }
  } else if (canvasImageFitMode === "width-fit") {
    renderHeight = containerWidth / imgRatio;
  } else if (canvasImageFitMode === "height-fit") {
    renderWidth = containerHeight * imgRatio;
  }

  const renderLeft = (containerWidth - renderWidth) / 2;
  const renderTop = (containerHeight - renderHeight) / 2;

  return (
    localX >= renderLeft &&
    localX <= renderLeft + renderWidth &&
    localY >= renderTop &&
    localY <= renderTop + renderHeight
  );
};
