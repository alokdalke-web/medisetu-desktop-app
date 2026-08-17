import type React from "react";

export interface PageImage {
  id: string;
  original: string;
  current: string;
  width: number;
  height: number;
}

export type UploadReportModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pickedFiles: File[];
  setPickedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onSave: () => void;
  saveDisabled?: boolean;
  isSaving?: boolean;
  title?: string;
};

export type UploadReportMode = "upload" | "camera" | "editor" | "preview";
export type ScannerBridgeStatus =
  | "idle"
  | "session_ready"
  | "uploaded"
  | "error";

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FilterType = "grayscale" | "enhance" | "sharpen" | "bw";
export type ResizeCorner = "tl" | "tr" | "bl" | "br";
