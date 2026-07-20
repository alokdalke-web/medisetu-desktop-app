interface Window {
  cv?: {
    Mat?: unknown;
  } & Record<string, unknown>;
}

declare module 'jscanify/client' {
  export interface Point {
    x: number;
    y: number;
  }

  export interface CornerPoints {
    topLeftCorner: Point;
    topRightCorner: Point;
    bottomLeftCorner: Point;
    bottomRightCorner: Point;
  }

  export default class JScanify {
    highlightPaper(
      image: CanvasImageSource,
      options?: {
        color?: string;
        thickness?: number;
      },
    ): HTMLCanvasElement;
    extractPaper(
      image: CanvasImageSource,
      resultWidth: number,
      resultHeight: number,
      cornerPoints?: CornerPoints,
    ): HTMLCanvasElement | null;
    findPaperContour(image: unknown): unknown | null;
    getCornerPoints(contour: unknown, image?: unknown): Partial<CornerPoints>;
  }
}
