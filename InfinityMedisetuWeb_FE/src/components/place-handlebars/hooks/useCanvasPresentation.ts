import { useMemo, type CSSProperties, type RefObject } from "react";

import {
  CANVAS_HEIGHT_FILL_RATIO,
  PAPER_SIZE_DIMENSIONS_MM,
} from "../constants";
import {
  CanvasImageFitMode,
  CanvasOrientation,
  CanvasPaperSize,
} from "../types";

import { useElementContentSize } from "./useElementContentSize";

const CSS_PIXELS_PER_MM = 96 / 25.4;

type UseCanvasPresentationOptions = {
  canvasPaperSize: CanvasPaperSize;
  canvasOrientation: CanvasOrientation;
  canvasImageFitMode: CanvasImageFitMode;
  filters: string;
  canvasViewportRef: RefObject<HTMLDivElement | null>;
  imageContainerRef: RefObject<HTMLDivElement | null>;
};

export const useCanvasPresentation = ({
  canvasPaperSize,
  canvasOrientation,
  canvasImageFitMode,
  filters,
  canvasViewportRef,
  imageContainerRef,
}: UseCanvasPresentationOptions) => {
  const canvasDimensions = useMemo(() => {
    const baseDimensions = PAPER_SIZE_DIMENSIONS_MM[canvasPaperSize];

    if (canvasOrientation === "landscape") {
      return {
        widthMm: baseDimensions.heightMm,
        heightMm: baseDimensions.widthMm,
      };
    }

    return baseDimensions;
  }, [canvasPaperSize, canvasOrientation]);

  const canvasViewportSize = useElementContentSize(canvasViewportRef);
  const canvasRenderedSize = useElementContentSize(imageContainerRef, [
    canvasDimensions.heightMm,
    canvasDimensions.widthMm,
  ]);

  const canvasToPrintScale = useMemo(() => {
    const printWidthPx = canvasDimensions.widthMm * CSS_PIXELS_PER_MM;

    if (canvasRenderedSize.width <= 0 || printWidthPx <= 0) {
      return 1;
    }

    return canvasRenderedSize.width / printWidthPx;
  }, [canvasDimensions.widthMm, canvasRenderedSize.width]);

  const canvasAspectRatio =
    canvasDimensions.widthMm / canvasDimensions.heightMm;

  const adaptiveCanvasBounds = useMemo(() => {
    if (canvasViewportSize.width <= 0 || canvasViewportSize.height <= 0) {
      return { maxWidth: "100%", maxHeight: "100%" };
    }

    const boundedHeight = canvasViewportSize.height * CANVAS_HEIGHT_FILL_RATIO;
    const maxWidthFromHeight = boundedHeight * canvasAspectRatio;
    const boundedWidth = Math.min(canvasViewportSize.width, maxWidthFromHeight);

    return {
      maxWidth: `${Math.max(0, boundedWidth).toFixed(2)}px`,
      maxHeight: `${Math.max(0, boundedHeight).toFixed(2)}px`,
    };
  }, [canvasViewportSize.height, canvasViewportSize.width, canvasAspectRatio]);

  const canvasContainerStyle = useMemo<CSSProperties>(
    () => ({
      aspectRatio: `${canvasDimensions.widthMm} / ${canvasDimensions.heightMm}`,
      width: "100%",
      maxWidth: adaptiveCanvasBounds.maxWidth,
      maxHeight: adaptiveCanvasBounds.maxHeight,
      margin: "0 auto",
    }),
    [canvasDimensions, adaptiveCanvasBounds],
  );

  const canvasImageStyle = useMemo<CSSProperties>(() => {
    const sharedBase: CSSProperties = {
      position: "absolute",
      pointerEvents: "none",
      userSelect: "none",
      filter: filters,
    };

    if (canvasImageFitMode === "cover") {
      return {
        ...sharedBase,
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      };
    }

    if (canvasImageFitMode === "stretch") {
      return {
        ...sharedBase,
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        objectFit: "fill",
      };
    }

    if (canvasImageFitMode === "width-fit") {
      return {
        ...sharedBase,
        left: 0,
        top: "50%",
        width: "100%",
        height: "auto",
        objectFit: "contain",
        transform: "translateY(-50%)",
      };
    }

    if (canvasImageFitMode === "height-fit") {
      return {
        ...sharedBase,
        left: "50%",
        top: 0,
        width: "auto",
        height: "100%",
        objectFit: "contain",
        transform: "translateX(-50%)",
      };
    }

    if (canvasImageFitMode === "original") {
      return {
        ...sharedBase,
        left: "50%",
        top: "50%",
        width: "auto",
        height: "auto",
        maxWidth: "none",
        maxHeight: "none",
        objectFit: "none",
        transform: "translate(-50%, -50%)",
      };
    }

    return {
      ...sharedBase,
      left: 0,
      top: 0,
      width: "100%",
      height: "100%",
      objectFit: "contain",
    };
  }, [canvasImageFitMode, filters]);

  return {
    canvasDimensions,
    canvasContainerStyle,
    canvasImageStyle,
    canvasToPrintScale,
  };
};
