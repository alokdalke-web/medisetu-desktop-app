export type HandlebarPoint = {
  id: number;
  key: string;
  x: number;
  y: number;
  fontScale: number;
  widthScale: number;
  heightScale: number;
  alignDirection?: AutoAlignDirection;
  showKeyName?: boolean;
};

export type PlaceHandlebarsProps = {
  filters: string;
  imageUrl: string;
  onBack: () => void;
  onError: (error: string) => void;
  onImageReady: () => void;
};

export type HandlebarFieldOption = {
  id: string;
  alias: string;
  dummyValue: string | string[];
  tablePreview?: {
    headers: string[];
    row: string[];
  };
};

export type HandlebarFieldGroup = {
  label: string;
  fields: HandlebarFieldOption[];
};

export type RawSelectionArea = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export type NormalizedSelectionArea = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type VitalsTableOrientation = "horizontal" | "vertical";
export type DateDisplayFormat = "DD MM YYYY" | "MM DD YY" | "DD MM YY";
export type TimeDisplayFormat = "hh:mm A" | "HH:mm" | "HH:mm:ss" | "hh:mm:ss A";
export type DateSeparator = "space" | "slash" | "dash" | "none";
export type TimeSeparator = "colon" | "slash" | "dash" | "none";
export type CanvasPaperSize = "A5" | "A4" | "A3" | "A2" | "Letter" | "Legal";
export type CanvasOrientation = "portrait" | "landscape";
export type CanvasImageFitMode =
  | "contain"
  | "cover"
  | "stretch"
  | "width-fit"
  | "height-fit"
  | "original";

export type AutoAlignDirection = "left-to-right" | "center" | "right-to-left";
