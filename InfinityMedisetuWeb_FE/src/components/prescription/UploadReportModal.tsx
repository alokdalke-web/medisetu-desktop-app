import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  Slider,
  Tabs,
  Tab,
} from "@heroui/react";
import {
  FiUpload,
  FiX,
  FiCamera,
  FiRotateCw,
  FiRotateCcw,
  FiCheck,
  FiCrop,
  FiRefreshCw,
  FiSun,
  FiMove,
  FiZoomIn,
  FiZoomOut,
  FiTrash2,
  FiArrowLeft,
  FiArrowRight,
  FiPlus,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiExternalLink,
} from "react-icons/fi";
import Webcam from "react-webcam";
import jsPDF from "jspdf";
import { ScannerSessionBridgeCard } from "../../components/prescription-scanner";
import {
  useCreateScanSessionMutation,
  useLazyGetScanStatusQuery,
} from "../../redux/api/prescriptionScannerApi";

declare const cv: any;

/* ─────────────── helpers ─────────────── */
const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k)),
  );
  return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`;
};

const POLL_INTERVAL_MS = 2500;

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const err = error as {
      message?: unknown;
      error?: unknown;
      data?: unknown;
      status?: unknown;
    };

    if (typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }

    if (typeof err.error === "string" && err.error.trim()) {
      return err.error;
    }

    if (typeof err.data === "string" && err.data.trim()) {
      return err.data;
    }

    if (err.data && typeof err.data === "object") {
      const data = err.data as Record<string, unknown>;

      if (typeof data.message === "string" && data.message.trim()) {
        return data.message;
      }

      if (typeof data.error === "string" && data.error.trim()) {
        return data.error;
      }
    }

    if (err.status !== undefined) {
      return `Request failed with status ${String(err.status)}`;
    }
  }

  return fallback;
}

/* ─────────────── ImageProcessor ─────────────── */
class ImageProcessor {
  static toGrayscale(imageData: ImageData): ImageData {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = g;
    }
    return imageData;
  }

  static adjustBrightnessContrast(
    imageData: ImageData,
    brightness: number,
    contrast: number,
  ): ImageData {
    const d = imageData.data;
    const f = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < d.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        d[i + j] = Math.min(
          255,
          Math.max(0, f * (d[i + j] - 128) + 128 + brightness),
        );
      }
    }
    return imageData;
  }

  static autoEnhance(imageData: ImageData): ImageData {
    const d = imageData.data;
    let min = 255,
      max = 0;
    for (let i = 0; i < d.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        min = Math.min(min, d[i + j]);
        max = Math.max(max, d[i + j]);
      }
    }
    const range = max - min;
    if (range > 0) {
      for (let i = 0; i < d.length; i += 4) {
        for (let j = 0; j < 3; j++) {
          d[i + j] = ((d[i + j] - min) / range) * 255;
        }
      }
    }
    return imageData;
  }

  static sharpen(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              sum +=
                data[((y + ky) * width + (x + kx)) * 4 + c] *
                kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          output[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
        }
        output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
          const idx = (y * width + x) * 4;
          for (let c = 0; c < 4; c++) output[idx + c] = data[idx + c];
        }
      }
    }

    return new ImageData(output, width, height);
  }
}

/* ─────────────── canvas helpers ─────────────── */
const rotateImage = (src: string, angle: number): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const rad = (angle * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));

      const c = document.createElement("canvas");
      c.width = img.width * cos + img.height * sin;
      c.height = img.width * sin + img.height * cos;

      const ctx = c.getContext("2d")!;
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(c.toDataURL("image/jpeg", 0.95));
    };
    img.src = src;
  });

const flipImage = (src: string, h: boolean, v: boolean): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;

      const ctx = c.getContext("2d")!;
      ctx.translate(h ? c.width : 0, v ? c.height : 0);
      ctx.scale(h ? -1 : 1, v ? -1 : 1);
      ctx.drawImage(img, 0, 0);

      resolve(c.toDataURL("image/jpeg", 0.95));
    };
    img.src = src;
  });

const cropImage = (
  src: string,
  area: { x: number; y: number; width: number; height: number },
): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = area.width;
      c.height = area.height;
      c.getContext("2d")!.drawImage(
        img,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        area.width,
        area.height,
      );
      resolve(c.toDataURL("image/jpeg", 0.95));
    };
    img.src = src;
  });

type FilterType = "grayscale" | "enhance" | "sharpen" | "bw";

const applyFilter = (src: string, filterType: FilterType): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, c.width, c.height);
      let processed: ImageData;

      switch (filterType) {
        case "grayscale":
          processed = ImageProcessor.toGrayscale(imageData);
          break;
        case "enhance":
          processed = ImageProcessor.autoEnhance(imageData);
          break;
        case "sharpen":
          processed = ImageProcessor.sharpen(imageData);
          break;
        case "bw":
          processed = ImageProcessor.toGrayscale(imageData);
          for (let i = 0; i < processed.data.length; i += 4) {
            const v = processed.data[i] > 150 ? 255 : 0;
            processed.data[i] =
              processed.data[i + 1] =
              processed.data[i + 2] =
                v;
          }
          break;
      }

      ctx.putImageData(processed, 0, 0);
      resolve(c.toDataURL("image/jpeg", 0.95));
    };
    img.src = src;
  });

const autoDetectDocument = (imageSrc: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      try {
        const src = cv.imread(canvas);
        const maxWidth = 1000;

        if (src.cols > maxWidth) {
          const scale = maxWidth / src.cols;
          cv.resize(src, src, new cv.Size(maxWidth, src.rows * scale));
        }

        const gray = new cv.Mat();
        const blur = new cv.Mat();
        const edges = new cv.Mat();

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
        cv.Canny(blur, edges, 50, 150);

        const kernel = cv.getStructuringElement(
          cv.MORPH_RECT,
          new cv.Size(5, 5),
        );
        cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);

        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(
          edges,
          contours,
          hierarchy,
          cv.RETR_EXTERNAL,
          cv.CHAIN_APPROX_SIMPLE,
        );

        let biggest = null;
        let maxArea = 0;

        for (let i = 0; i < contours.size(); i++) {
          const cnt = contours.get(i);
          const area = cv.contourArea(cnt);
          if (area < 80000) continue;

          const peri = cv.arcLength(cnt, true);
          const approx = new cv.Mat();
          cv.approxPolyDP(cnt, approx, 0.04 * peri, true);

          if (approx.rows >= 4) {
            const rect = cv.boundingRect(cnt);
            const ratio = rect.width / rect.height;
            if (ratio > 0.5 && ratio < 2 && area > maxArea) {
              biggest = approx;
              maxArea = area;
            }
          }
        }

        if (biggest) {
          const pts: { x: number; y: number }[] = [];
          for (let i = 0; i < 4; i++) {
            pts.push({
              x: biggest.intPtr(i, 0)[0],
              y: biggest.intPtr(i, 0)[1],
            });
          }

          pts.sort((a, b) => a.y - b.y);
          const top = pts.slice(0, 2).sort((a, b) => a.x - b.x);
          const bottom = pts.slice(2, 4).sort((a, b) => a.x - b.x);
          const ordered = [top[0], top[1], bottom[1], bottom[0]];

          const w = Math.max(
            Math.hypot(
              ordered[1].x - ordered[0].x,
              ordered[1].y - ordered[0].y,
            ),
            Math.hypot(
              ordered[2].x - ordered[3].x,
              ordered[2].y - ordered[3].y,
            ),
          );

          const h = Math.max(
            Math.hypot(
              ordered[3].x - ordered[0].x,
              ordered[3].y - ordered[0].y,
            ),
            Math.hypot(
              ordered[2].x - ordered[1].x,
              ordered[2].y - ordered[1].y,
            ),
          );

          const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
            ordered[0].x,
            ordered[0].y,
            ordered[1].x,
            ordered[1].y,
            ordered[2].x,
            ordered[2].y,
            ordered[3].x,
            ordered[3].y,
          ]);

          const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0,
            0,
            w,
            0,
            w,
            h,
            0,
            h,
          ]);

          const M = cv.getPerspectiveTransform(srcTri, dstTri);
          const dst = new cv.Mat();
          cv.warpPerspective(src, dst, M, new cv.Size(w, h));
          cv.imshow(canvas, dst);

          dst.delete();
          srcTri.delete();
          dstTri.delete();
          M.delete();
        }

        src.delete();
        gray.delete();
        blur.delete();
        edges.delete();
      } catch (e) {
        /* cv might not be loaded */
      }

      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };

    img.src = imageSrc;
  });

/* ─────────────── Multi-image to PDF ─────────────── */
const multiImagesToPdf = async (
  images: string[],
  fileName: string,
): Promise<{ file: File; dataUrl: string }> => {
  return new Promise(async (resolve) => {
    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((res) => {
        const i = new Image();
        i.onload = () => res(i);
        i.src = src;
      });

    const imgs = await Promise.all(images.map(loadImg));
    const first = imgs[0];

    const pdf = new jsPDF({
      orientation: first.width > first.height ? "landscape" : "portrait",
      unit: "px",
      format: [first.width, first.height],
    });

    for (let idx = 0; idx < imgs.length; idx++) {
      const img = imgs[idx];
      if (idx > 0) {
        pdf.addPage(
          [img.width, img.height],
          img.width > img.height ? "landscape" : "portrait",
        );
      }

      pdf.addImage(
        images[idx],
        "JPEG",
        0,
        0,
        img.width,
        img.height,
        undefined,
        "FAST",
      );
    }

    const pdfBlob = pdf.output("blob");
    const pdfDataUrl = pdf.output("datauristring");
    const pdfFile = new File([pdfBlob], `${fileName}.pdf`, {
      type: "application/pdf",
    });

    resolve({ file: pdfFile, dataUrl: pdfDataUrl });
  });
};

/* ─────────────── Types ─────────────── */
interface PageImage {
  id: string;
  original: string;
  current: string;
  width: number;
  height: number;
}

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pickedFiles: File[];
  setPickedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onSave: () => void;
  saveDisabled?: boolean;
  isSaving?: boolean;
  title?: string;
};

type Mode = "upload" | "camera" | "editor" | "preview";
type ScannerBridgeStatus = "idle" | "session_ready" | "uploaded" | "error";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const UploadReportModal: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  pickedFiles,
  setPickedFiles,
  onSave,
  saveDisabled,
  isSaving,
  title = "Upload Report",
}) => {
  const [mode, setMode] = useState<Mode>("upload");

  const [pages, setPages] = useState<PageImage[]>([]);
  const [activePageIdx, setActivePageIdx] = useState(0);

  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [activeTab, setActiveTab] = useState("crop");
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);

  const [showCropOverlay, setShowCropOverlay] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [movingCrop, setMovingCrop] = useState(false);
  const [resizingCorner, setResizingCorner] = useState<
    "tl" | "tr" | "bl" | "br" | null
  >(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [scannerError, setScannerError] = useState("");
  const [scannerStatus, setScannerStatus] =
    useState<ScannerBridgeStatus>("idle");

  const pollTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const scannerStatusRef = useRef<ScannerBridgeStatus>("idle");

  const webcamRef = useRef<Webcam>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const addMoreRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<number | null>(null);

  const [createScanSession] = useCreateScanSessionMutation();
  const [getScanStatus] = useLazyGetScanStatusQuery();

  const activePage = pages[activePageIdx] ?? null;

  const phoneLink = useMemo(() => {
    if (!otp || typeof window === "undefined") return "";
    return `${window.location.origin}/app/switch-to-phone?otp=${encodeURIComponent(otp)}`;
  }, [otp]);

  const qrCodeUrl = useMemo(() => {
    if (!phoneLink) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(phoneLink)}`;
  }, [phoneLink]);

  useEffect(() => {
    setBrightness(0);
    setContrast(0);
    setZoom(1);
    setActiveFilter(null);
    setShowCropOverlay(false);

    if (activePage) {
      setCropArea({
        x: 0,
        y: 0,
        width: activePage.width,
        height: activePage.height,
      });
    }
  }, [activePageIdx]);

  const updatePageCurrent = (idx: number, dataUrl: string) => {
    setPages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, current: dataUrl } : p)),
    );
  };

  const addPages = (dataUrls: string[], append = false) => {
    const newPages: PageImage[] = dataUrls.map((src) => {
      const img = new Image();
      img.src = src;
      return {
        id: `${Date.now()}_${Math.random()}`,
        original: src,
        current: src,
        width: img.naturalWidth || 1000,
        height: img.naturalHeight || 1000,
      };
    });

    dataUrls.forEach((src, di) => {
      const img = new Image();
      img.onload = () => {
        setPages((prev) => {
          const updated = [...prev];
          const targetIndex = append ? prev.length + di : di;
          const target = updated[targetIndex];
          if (target) {
            target.width = img.width;
            target.height = img.height;
          }
          return [...updated];
        });
      };
      img.src = src;
    });

    setPages((prev) => {
      const base = append ? prev : [];
      const next = [...base, ...newPages];
      setActivePageIdx(next.length - 1);
      return next;
    });

    setMode("editor");
  };

  const removePage = (idx: number) => {
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) {
        setMode("upload");
        return next;
      }
      setActivePageIdx(Math.min(idx, next.length - 1));
      return next;
    });
  };

  const clearScannerTimers = () => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const createScannerSession = async () => {
    setScannerError("");
    setScannerStatus("idle");

    try {
      const session = await createScanSession().unwrap();
      setOtp(session.otp);
      setCountdown(session.expiresIn);
      setScannerStatus("session_ready");
    } catch (error) {
      setScannerError(getErrorMessage(error, "Failed to create scan session."));
      setScannerStatus("error");
    }
  };

  const resetScanner = () => {
    clearScannerTimers();
    setOtp("");
    setCountdown(0);
    setScannerError("");
    setScannerStatus("idle");
    void createScannerSession();
  };

  const consumeScannedImage = async (imageSrc: string) =>
    new Promise<void>((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const nextPage: PageImage = {
          id: `scan_${Date.now()}`,
          original: imageSrc,
          current: imageSrc,
          width: img.width,
          height: img.height,
        };

        setPages([nextPage]);
        setActivePageIdx(0);
        setMode("editor");
        resolve();
      };

      img.onerror = () => reject(new Error("Failed to load scanned image."));
      img.src = imageSrc;
    });

  const pollScannerStatus = async (currentOtp: string) => {
    if (scannerStatusRef.current !== "session_ready") return;

    try {
      const statusResp = await getScanStatus(currentOtp).unwrap();

      if (!statusResp || typeof statusResp.status === "undefined") return;
      if (scannerStatusRef.current !== "session_ready") return;

      if (statusResp.status === "invalid") {
        clearScannerTimers();
        setScannerError(
          "Bridge session expired or is invalid. Create a new session.",
        );
        setScannerStatus("error");
        return;
      }

      if (statusResp.status === "uploaded") {
        clearScannerTimers();

        const imageSrc = statusResp.imageBase64
          ? `data:image/jpeg;base64,${statusResp.imageBase64}`
          : statusResp.imageUrl || "";

        if (!imageSrc) {
          setScannerError("Uploaded image not found.");
          setScannerStatus("error");
          return;
        }

        try {
          await consumeScannedImage(imageSrc);
          setScannerStatus("uploaded");
          setScannerError("");
        } catch (error) {
          setScannerError(
            getErrorMessage(error, "Failed to load scanned image."),
          );
          setScannerStatus("error");
        }
      }
    } catch (error) {
      if (scannerStatusRef.current !== "session_ready") return;
      setScannerError(getErrorMessage(error, "Poll error. Will retry..."));
    }
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    addPages([imageSrc], pages.length > 0);
    setMode("editor");
  }, [pages.length]);

  const readFile = (file: File): Promise<string> =>
    new Promise((res) => {
      const r = new FileReader();
      r.onload = (e) => res(e.target?.result as string);
      r.readAsDataURL(file);
    });

  const handleFiles = async (files: File[], append = false) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    const nonImage = files.filter((f) => !f.type.startsWith("image/"));

    if (nonImage.length > 0) {
      setPickedFiles(nonImage);
      return;
    }

    if (imageFiles.length === 0) return;

    const dataUrls = await Promise.all(imageFiles.map(readFile));
    addPages(dataUrls, append);
  };

  const onPicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) await handleFiles(files, false);
    e.target.value = "";
  };

  const onAddMore: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) await handleFiles(files, true);
    e.target.value = "";
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) await handleFiles(files, false);
  };

  useEffect(() => {
    scannerStatusRef.current = scannerStatus;
  }, [scannerStatus]);

  useEffect(() => {
    if (!isOpen) {
      clearScannerTimers();
      return;
    }

    if (mode !== "upload" || pickedFiles.length > 0 || pages.length > 0) {
      clearScannerTimers();
      setOtp("");
      setCountdown(0);
      setScannerError("");
      setScannerStatus("idle");
      return;
    }

    if (!otp) {
      void createScannerSession();
    }

    return () => {
      if (!isOpen) {
        clearScannerTimers();
      }
    };
  }, [isOpen, mode, pickedFiles.length, pages.length, otp]);

  useEffect(() => {
    if (
      !isOpen ||
      mode !== "upload" ||
      scannerStatus !== "session_ready" ||
      !otp ||
      pickedFiles.length > 0 ||
      pages.length > 0
    ) {
      clearScannerTimers();
      return;
    }

    void pollScannerStatus(otp);

    pollTimerRef.current = window.setInterval(() => {
      void pollScannerStatus(otp);
    }, POLL_INTERVAL_MS);

    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          clearScannerTimers();
          setScannerError("Session expired. Please create a new session.");
          setScannerStatus("error");
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearScannerTimers();
  }, [isOpen, mode, scannerStatus, otp, pickedFiles.length, pages.length]);

  useEffect(() => {
    return () => clearScannerTimers();
  }, []);

  const withProcessing = async (fn: () => Promise<string>) => {
    if (!activePage) return;

    setIsProcessing(true);
    try {
      const result = await fn();
      updatePageCurrent(activePageIdx, result);
      setActiveFilter(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRotate = (dir: "left" | "right") => {
    if (!activePage) return;
    return withProcessing(() =>
      rotateImage(activePage.current, dir === "right" ? 90 : -90),
    );
  };

  const handleFlip = (h: boolean, v: boolean) => {
    if (!activePage) return;
    return withProcessing(() => flipImage(activePage.current, h, v));
  };

  const handleApplyFilter = async (filter: FilterType) => {
    if (!activePage) return;

    setIsProcessing(true);
    try {
      const filtered = await applyFilter(activePage.current, filter);
      updatePageCurrent(activePageIdx, filtered);
      setActiveFilter(filter);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetPage = () => {
    if (!activePage) return;

    updatePageCurrent(activePageIdx, activePage.original);
    setBrightness(0);
    setContrast(0);
    setZoom(1);
    setActiveFilter(null);
    setShowCropOverlay(false);
    setCropArea({
      x: 0,
      y: 0,
      width: activePage.width,
      height: activePage.height,
    });
  };

  useEffect(() => {
    if (!activePage) return;
    if (brightness === 0 && contrast === 0) return;

    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current;
      if (!c) return;

      c.width = img.width;
      c.height = img.height;

      const ctx = c.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, c.width, c.height);
      ctx.putImageData(
        ImageProcessor.adjustBrightnessContrast(id, brightness, contrast),
        0,
        0,
      );
      updatePageCurrent(activePageIdx, c.toDataURL("image/jpeg", 0.95));
    };

    img.src = activePage.original;
  }, [brightness, contrast, activePage, activePageIdx]);

  const toNaturalCoords = (clientX: number, clientY: number) => {
    const el = imageRef.current;
    if (!el) return { x: 0, y: 0 };

    const rect = el.getBoundingClientRect();
    const scaleX = el.naturalWidth / rect.width;
    const scaleY = el.naturalHeight / rect.height;

    return {
      x: Math.max(0, Math.min((clientX - rect.left) * scaleX, el.naturalWidth)),
      y: Math.max(0, Math.min((clientY - rect.top) * scaleY, el.naturalHeight)),
    };
  };

  const cropDisplayArea = () => {
    if (!imageRef.current) return cropArea;

    const el = imageRef.current;
    const rect = el.getBoundingClientRect();
    const scaleX = rect.width / (el.naturalWidth || activePage?.width || 1);
    const scaleY = rect.height / (el.naturalHeight || activePage?.height || 1);

    return {
      x: cropArea.x * scaleX,
      y: cropArea.y * scaleY,
      width: cropArea.width * scaleX,
      height: cropArea.height * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showCropOverlay || !activePage) return;

    e.preventDefault();
    const nat = toNaturalCoords(e.clientX, e.clientY);

    const inside =
      nat.x >= cropArea.x &&
      nat.x <= cropArea.x + cropArea.width &&
      nat.y >= cropArea.y &&
      nat.y <= cropArea.y + cropArea.height;

    if (inside && cropArea.width > 0) {
      setMovingCrop(true);
      setDragStart(nat);
    } else {
      setIsDragging(true);
      setDragStart(nat);
      setCropArea({ x: nat.x, y: nat.y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showCropOverlay || !activePage) return;

    const nat = toNaturalCoords(e.clientX, e.clientY);
    const W = activePage.width;
    const H = activePage.height;

    if (movingCrop) {
      const dx = nat.x - dragStart.x;
      const dy = nat.y - dragStart.y;

      setCropArea((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(prev.x + dx, W - prev.width)),
        y: Math.max(0, Math.min(prev.y + dy, H - prev.height)),
      }));
      setDragStart(nat);
      return;
    }

    if (resizingCorner) {
      setCropArea((prev) => {
        let { x, y, width, height } = prev;

        if (resizingCorner === "br") {
          width = nat.x - x;
          height = nat.y - y;
        }
        if (resizingCorner === "tr") {
          height = prev.height + (y - nat.y);
          y = nat.y;
          width = nat.x - x;
        }
        if (resizingCorner === "bl") {
          width = prev.width + (x - nat.x);
          x = nat.x;
          height = nat.y - y;
        }
        if (resizingCorner === "tl") {
          width = prev.width + (x - nat.x);
          height = prev.height + (y - nat.y);
          x = nat.x;
          y = nat.y;
        }

        x = Math.max(0, x);
        y = Math.max(0, y);
        width = Math.max(10, Math.min(width, W - x));
        height = Math.max(10, Math.min(height, H - y));

        return { x, y, width, height };
      });
      return;
    }

    if (isDragging) {
      const x = Math.min(dragStart.x, nat.x);
      const y = Math.min(dragStart.y, nat.y);
      const width = Math.abs(nat.x - dragStart.x);
      const height = Math.abs(nat.y - dragStart.y);

      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() =>
        setCropArea({ x, y, width, height }),
      );
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setMovingCrop(false);
    setResizingCorner(null);
  };

  const handleApplyCrop = async () => {
    if (!activePage || cropArea.width < 10 || cropArea.height < 10) return;

    setIsProcessing(true);
    try {
      const cropped = await cropImage(activePage.current, cropArea);
      updatePageCurrent(activePageIdx, cropped);
      setShowCropOverlay(false);
      setActiveFilter(null);

      const img = new Image();
      img.onload = () => {
        setPages((prev) =>
          prev.map((p, i) =>
            i === activePageIdx
              ? { ...p, width: img.width, height: img.height }
              : p,
          ),
        );
        setCropArea({ x: 0, y: 0, width: img.width, height: img.height });
      };
      img.src = cropped;
    } finally {
      setIsProcessing(false);
    }
  };

  const buildPreview = async () => {
    if (pages.length === 0) return;

    setIsProcessing(true);
    try {
      const { dataUrl } = await multiImagesToPdf(
        pages.map((p) => p.current),
        `scan_${Date.now()}`,
      );
      setPdfPreviewUrl(dataUrl);
      setMode("preview");
    } finally {
      setIsProcessing(false);
    }
  };

  const processAndSave = async () => {
    if (pages.length === 0) return;

    setIsProcessing(true);
    try {
      const { file } = await multiImagesToPdf(
        pages.map((p) => p.current),
        `scan_${Date.now()}`,
      );
      setPickedFiles([file]);
      clearScannerTimers();
      setOtp("");
      setCountdown(0);
      setScannerError("");
      setScannerStatus("idle");
      setMode("upload");
      setPdfPreviewUrl(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    clearScannerTimers();
    setOtp("");
    setCountdown(0);
    setScannerError("");
    setScannerStatus("idle");
    setMode("upload");
    setPages([]);
    setActivePageIdx(0);
    setBrightness(0);
    setContrast(0);
    setZoom(1);
    setActiveFilter(null);
    setShowCropOverlay(false);
    setPdfPreviewUrl(null);
    onOpenChange(false);
  };

  const disp = cropDisplayArea();

  const modalBase = "rounded-[28px]";
  const closeBtn =
    "absolute right-4 top-4 sm:right-5 sm:top-5 grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100 text-slate-600 z-10";
  const topIconWrap =
    "mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  const titleCls = "mt-4 text-center text-[22px] font-semibold text-slate-900";
  const pillCancel =
    "h-12 px-10 rounded-full border border-emerald-700/60 text-emerald-800 bg-white";
  const pillPrimary =
    "h-12 rounded-full bg-emerald-700 text-white hover:bg-emerald-800";

  const modalSize: "xl" | "3xl" | "4xl" | "5xl" =
    mode === "editor"
      ? "5xl"
      : mode === "camera"
        ? "3xl"
        : mode === "preview"
          ? "4xl"
          : "xl";

  const activeModalSize: "sm" | "xl" | "3xl" | "4xl" | "5xl" =
    mode === "upload" ? "sm" : modalSize;

  const compactModalBase =
    mode === "upload"
      ? [
          modalBase,
          "!mx-3",
          "!my-2",
          "!w-[calc(100vw-24px)]",
          "!max-w-[360px]",
          "sm:!max-w-[390px]",
          "md:!max-w-[440px]",
          "lg:!max-w-[460px]",
          "!max-h-[94dvh]",
          "overflow-hidden",
        ].join(" ")
      : modalBase;

  const compactModalBody =
    mode === "upload" ? "p-0 max-h-[94dvh] overflow-y-auto" : "p-0";

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleClose}
      size={activeModalSize}
      placement="center"
      hideCloseButton
      scrollBehavior={mode === "upload" ? "inside" : "normal"}
      classNames={{ base: compactModalBase, body: compactModalBody }}
    >
      <ModalContent>
        {() => (
          <ModalBody>
            <div
              className={
                mode === "upload"
                  ? "relative px-3 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4"
                  : "relative px-8 pt-8 pb-8"
              }
            >
              <button
                type="button"
                className={closeBtn}
                onClick={handleClose}
                aria-label="Close"
              >
                <FiX className="text-xl" />
              </button>

              {mode === "upload" && (
                <>
                  <div className={`${topIconWrap} !h-9 !w-9`}>
                    <FiUpload className="text-[16px]" />
                  </div>

                  <div className={`${titleCls} !mt-2 !text-[20px]`}>
                    {title}
                  </div>

                  <div className="mt-3">
                    <div className="mb-1.5 text-xs font-semibold text-slate-900">
                      Report
                    </div>

                    <div
                      className="rounded-xl border border-dashed border-gray-300 bg-white px-3 py-4 text-center sm:px-4 sm:py-4"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                    >
                      <FiUpload className="mx-auto mb-2 text-[21px] opacity-60" />

                      <div className="text-[13px] leading-snug text-slate-800">
                        Drag your file(s) here, or{" "}
                        <button
                          type="button"
                          onClick={() => inputRef.current?.click()}
                          className="font-semibold text-slate-900 underline underline-offset-4"
                        >
                          browse
                        </button>
                      </div>

                      <div className="mt-1 text-[11px] leading-snug text-slate-500">
                        Support JPG, PNG, JPEG, PDF • Multiple images supported
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="text-[11px] text-gray-400">OR</span>
                        <div className="flex-1 border-t border-gray-200" />
                      </div>

                      <button
                        type="button"
                        onClick={() => setMode("camera")}
                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary hover:bg-primary/20"
                      >
                        <FiCamera className="text-base" />
                        <span className="text-xs font-semibold">
                          Take Photo with Camera
                        </span>
                      </button>

                      {!pickedFiles.length && (
                        <div className="mx-auto mt-3 w-full max-w-[276px] sm:max-w-[300px] [&>*]:!w-full [&>*]:!max-w-full [&>*]:!rounded-xl [&>*]:!p-3 [&_h3]:!text-base [&_p]:!text-xs [&_p]:!leading-snug [&_img]:!h-[145px] [&_img]:!w-[145px] sm:[&_img]:!h-[155px] sm:[&_img]:!w-[155px] [&_canvas]:!h-[145px] [&_canvas]:!w-[145px] sm:[&_canvas]:!h-[155px] sm:[&_canvas]:!w-[155px] [&_button]:!h-8 [&_button]:!text-xs">
                          <ScannerSessionBridgeCard
                            countdown={countdown}
                            otp={otp}
                            phoneLink={phoneLink}
                            qrCodeUrl={qrCodeUrl}
                            onNewSession={resetScanner}
                          />

                          {scannerError && (
                            <p className="mt-2 text-xs text-danger">
                              {scannerError}
                            </p>
                          )}
                        </div>
                      )}

                      <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,image/*"
                        multiple
                        className="hidden"
                        onChange={onPicked}
                      />

                      {pickedFiles.length > 0 && (
                        <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FiFileText className="shrink-0 text-base text-red-500" />
                            <div className="truncate">
                              <div className="truncate text-xs font-medium text-gray-800">
                                {pickedFiles[0].name}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {formatBytes(pickedFiles[0].size)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <FiExternalLink
                              onClick={() =>
                                window.open(
                                  URL.createObjectURL(pickedFiles[0]),
                                  "_blank",
                                )
                              }
                              className="cursor-pointer text-gray-600 hover:text-black"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-center sm:gap-4">
                    <Button
                      radius="full"
                      variant="bordered"
                      className={`${pillCancel} h-10 w-full sm:w-[120px]`}
                      onPress={handleClose}
                      isDisabled={!!isSaving}
                    >
                      Cancel
                    </Button>

                    <Button
                      radius="full"
                      className={`${pillPrimary} h-10 w-full sm:w-[180px]`}
                      onPress={onSave}
                      isDisabled={saveDisabled ?? !pickedFiles.length}
                      isLoading={!!isSaving}
                    >
                      Save Report
                    </Button>
                  </div>
                </>
              )}

              {mode === "camera" && (
                <>
                  <div className="mb-4 text-center">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Take a Photo
                    </h3>
                    <p className="text-sm text-slate-500">
                      Position the document within the frame
                    </p>
                  </div>

                  <div className="relative overflow-hidden rounded-lg bg-black">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        width: 1280,
                        height: 720,
                        facingMode,
                      }}
                      className="w-full"
                      mirrored={facingMode === "user"}
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-lg border-4 border-primary/50" />
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-4">
                    <Button
                      radius="full"
                      variant="bordered"
                      className={pillCancel}
                      onPress={() =>
                        setMode(pages.length > 0 ? "editor" : "upload")
                      }
                    >
                      Back
                    </Button>

                    <Button
                      isIconOnly
                      radius="full"
                      color="primary"
                      variant="flat"
                      onPress={() =>
                        setFacingMode((p) =>
                          p === "user" ? "environment" : "user",
                        )
                      }
                    >
                      <FiRotateCw />
                    </Button>

                    <Button
                      radius="full"
                      className={pillPrimary}
                      onPress={capture}
                      startContent={<FiCamera />}
                    >
                      Capture
                    </Button>
                  </div>
                </>
              )}

              {mode === "editor" && activePage && (
                <div className="flex min-h-0 gap-5">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="w-[72px] shrink-0 flex-col gap-2">
                      <div className="mb-1 text-center text-xs font-semibold text-slate-500">
                        Pages
                      </div>

                      <div className="flex max-h-[480px] flex-col gap-2 overflow-y-auto pr-1">
                        {pages.map((page, idx) => (
                          <div
                            key={page.id}
                            onClick={() => setActivePageIdx(idx)}
                            className={`relative shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 ${
                              idx === activePageIdx
                                ? "border-emerald-600"
                                : "border-transparent hover:border-gray-300"
                            }`}
                            style={{ width: 64, height: 80 }}
                          >
                            <img
                              src={page.current}
                              className="h-full w-full object-cover"
                            />

                            <div className="absolute left-0 right-0 top-0 bg-black/50 py-0.5 text-center text-[9px] text-white">
                              {idx + 1}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removePage(idx);
                              }}
                              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white"
                            >
                              <FiX />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => addMoreRef.current?.click()}
                        className="mt-1 flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-emerald-500 hover:text-emerald-600"
                      >
                        <FiPlus className="text-lg" />
                        <span className="text-[9px]">Add</span>
                      </button>

                      <input
                        ref={addMoreRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={onAddMore}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">
                            Edit Document
                          </h3>
                          <p className="text-xs text-slate-500">
                            Page {activePageIdx + 1} of {pages.length}
                          </p>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            isDisabled={activePageIdx === 0}
                            onPress={() => setActivePageIdx((p) => p - 1)}
                          >
                            <FiChevronLeft />
                          </Button>

                          <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            isDisabled={activePageIdx === pages.length - 1}
                            onPress={() => setActivePageIdx((p) => p + 1)}
                          >
                            <FiChevronRight />
                          </Button>
                        </div>
                      </div>

                      <div
                        className="relative overflow-auto rounded-lg border-2 border-gray-200 bg-gray-100 select-none"
                        style={{
                          maxHeight: 460,
                          maxWidth: "100%",
                          cursor: resizingCorner
                            ? "nwse-resize"
                            : movingCrop
                              ? "grabbing"
                              : isDragging
                                ? "crosshair"
                                : showCropOverlay
                                  ? "crosshair"
                                  : "default",
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                        <div
                          className="relative inline-block min-w-full"
                          style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: "top left",
                          }}
                        >
                          <img
                            ref={imageRef}
                            src={activePage.current}
                            draggable={false}
                            className="block h-auto w-full select-none object-contain"
                          />

                          {showCropOverlay &&
                            cropArea.width > 4 &&
                            cropArea.height > 4 && (
                              <div className="pointer-events-none absolute inset-0">
                                <svg
                                  className="absolute inset-0 h-full w-full"
                                  style={{ pointerEvents: "none" }}
                                >
                                  <defs>
                                    <mask id="cropMask">
                                      <rect
                                        width="100%"
                                        height="100%"
                                        fill="white"
                                      />
                                      <rect
                                        x={disp.x}
                                        y={disp.y}
                                        width={disp.width}
                                        height={disp.height}
                                        fill="black"
                                      />
                                    </mask>
                                  </defs>

                                  <rect
                                    width="100%"
                                    height="100%"
                                    fill="rgba(0,0,0,0.45)"
                                    mask="url(#cropMask)"
                                  />
                                </svg>

                                <div
                                  className="absolute border-2 border-blue-400"
                                  style={{
                                    left: disp.x,
                                    top: disp.y,
                                    width: disp.width,
                                    height: disp.height,
                                    pointerEvents: "all",
                                  }}
                                >
                                  <div className="pointer-events-none absolute inset-0">
                                    {[1, 2].map((i) => (
                                      <React.Fragment key={i}>
                                        <div
                                          className="absolute w-px bg-white/30"
                                          style={{
                                            left: `${(i / 3) * 100}%`,
                                            top: 0,
                                            height: "100%",
                                          }}
                                        />
                                        <div
                                          className="absolute h-px bg-white/30"
                                          style={{
                                            top: `${(i / 3) * 100}%`,
                                            left: 0,
                                            width: "100%",
                                          }}
                                        />
                                      </React.Fragment>
                                    ))}
                                  </div>

                                  {(["tl", "tr", "bl", "br"] as const).map(
                                    (corner) => (
                                      <div
                                        key={corner}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          setResizingCorner(corner);
                                        }}
                                        className="absolute z-10 h-3 w-3 rounded-sm border-2 border-blue-500 bg-white"
                                        style={{
                                          left: corner.includes("l")
                                            ? -6
                                            : undefined,
                                          right: corner.includes("r")
                                            ? -6
                                            : undefined,
                                          top: corner.includes("t")
                                            ? -6
                                            : undefined,
                                          bottom: corner.includes("b")
                                            ? -6
                                            : undefined,
                                          cursor:
                                            corner === "tl" || corner === "br"
                                              ? "nwse-resize"
                                              : "nesw-resize",
                                        }}
                                      />
                                    ),
                                  )}

                                  <div
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setMovingCrop(true);
                                      setDragStart(
                                        toNaturalCoords(e.clientX, e.clientY),
                                      );
                                    }}
                                    className="absolute z-10 flex h-7 w-7 cursor-grab items-center justify-center rounded-full bg-blue-500 text-xs text-white"
                                    style={{
                                      left: "50%",
                                      top: "50%",
                                      transform: "translate(-50%,-50%)",
                                    }}
                                  >
                                    <FiMove />
                                  </div>
                                </div>
                              </div>
                            )}

                          {isProcessing && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                              <div className="flex items-center gap-2 text-white">
                                <FiRefreshCw className="animate-spin" />
                                <span>Processing…</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-center gap-2">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          onPress={() => setZoom((z) => Math.max(0.3, z - 0.1))}
                        >
                          <FiZoomOut />
                        </Button>

                        <span className="w-14 text-center text-sm">
                          {Math.round(zoom * 100)}%
                        </span>

                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          onPress={() => setZoom((z) => Math.min(4, z + 0.1))}
                        >
                          <FiZoomIn />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="w-72 shrink-0 border-l border-gray-200 pl-5">
                    <Tabs
                      aria-label="Editor tools"
                      selectedKey={activeTab}
                      onSelectionChange={(k) => setActiveTab(k as string)}
                      className="mb-4"
                      size="sm"
                    >
                      <Tab key="crop" title="Crop" />
                      <Tab key="adjust" title="Adjust" />
                      <Tab key="filters" title="Filters" />
                      <Tab key="transform" title="Rotate" />
                    </Tabs>

                    {activeTab === "crop" && (
                      <div className="space-y-3">
                        <Button
                          className="w-full"
                          color="secondary"
                          variant="flat"
                          size="sm"
                          onPress={async () => {
                            setIsProcessing(true);
                            try {
                              const s = await autoDetectDocument(
                                activePage.current,
                              );
                              updatePageCurrent(activePageIdx, s);
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                        >
                          Auto Scan Document
                        </Button>

                        <Button
                          className="w-full"
                          size="sm"
                          color={showCropOverlay ? "primary" : "default"}
                          variant={showCropOverlay ? "solid" : "flat"}
                          onPress={() => {
                            if (!showCropOverlay) {
                              setCropArea({ x: 0, y: 0, width: 0, height: 0 });
                            }
                            setShowCropOverlay((v) => !v);
                          }}
                          startContent={<FiCrop />}
                        >
                          {showCropOverlay
                            ? "Cancel Selection"
                            : "Select Area to Crop"}
                        </Button>

                        {showCropOverlay && (
                          <Button
                            className="w-full"
                            color="primary"
                            size="sm"
                            onPress={handleApplyCrop}
                            isDisabled={
                              cropArea.width < 10 || cropArea.height < 10
                            }
                          >
                            Apply Crop
                          </Button>
                        )}

                        {showCropOverlay && cropArea.width > 0 && (
                          <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
                            {Math.round(cropArea.width)} ×{" "}
                            {Math.round(cropArea.height)} px
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "adjust" && (
                      <div className="space-y-5">
                        <div>
                          <div className="mb-1 flex justify-between">
                            <span className="text-sm">Brightness</span>
                            <span className="text-sm text-slate-500">
                              {brightness}
                            </span>
                          </div>

                          <Slider
                            aria-label="Brightness"
                            size="sm"
                            step={1}
                            minValue={-50}
                            maxValue={50}
                            value={brightness}
                            onChange={(v) => setBrightness(v as number)}
                          />
                        </div>

                        <div>
                          <div className="mb-1 flex justify-between">
                            <span className="text-sm">Contrast</span>
                            <span className="text-sm text-slate-500">
                              {contrast}
                            </span>
                          </div>

                          <Slider
                            aria-label="Contrast"
                            size="sm"
                            step={1}
                            minValue={-50}
                            maxValue={50}
                            value={contrast}
                            onChange={(v) => setContrast(v as number)}
                          />
                        </div>

                        <Button
                          className="w-full"
                          color="primary"
                          variant="flat"
                          size="sm"
                          onPress={() => handleApplyFilter("enhance")}
                          startContent={<FiSun />}
                        >
                          Auto Enhance
                        </Button>
                      </div>
                    )}

                    {activeTab === "filters" && (
                      <div className="space-y-2">
                        {([null, "grayscale", "bw", "sharpen"] as const).map(
                          (f) => (
                            <Button
                              key={String(f)}
                              className="w-full justify-start"
                              size="sm"
                              variant={activeFilter === f ? "solid" : "flat"}
                              color={activeFilter === f ? "primary" : "default"}
                              onPress={() => {
                                if (f === null) {
                                  updatePageCurrent(
                                    activePageIdx,
                                    activePage.original,
                                  );
                                  setActiveFilter(null);
                                } else {
                                  void handleApplyFilter(f);
                                }
                              }}
                            >
                              {f === null
                                ? "Original"
                                : f === "grayscale"
                                  ? "Grayscale"
                                  : f === "bw"
                                    ? "Black & White"
                                    : "Sharpen"}
                            </Button>
                          ),
                        )}
                      </div>
                    )}

                    {activeTab === "transform" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            className="w-full"
                            size="sm"
                            variant="flat"
                            onPress={() => handleRotate("left")}
                            startContent={<FiRotateCcw />}
                          >
                            Left
                          </Button>

                          <Button
                            className="w-full"
                            size="sm"
                            variant="flat"
                            onPress={() => handleRotate("right")}
                            startContent={<FiRotateCw />}
                          >
                            Right
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            className="w-full"
                            size="sm"
                            variant="flat"
                            onPress={() => handleFlip(true, false)}
                            startContent={<FiArrowLeft />}
                          >
                            Flip H
                          </Button>

                          <Button
                            className="w-full"
                            size="sm"
                            variant="flat"
                            onPress={() => handleFlip(false, true)}
                            startContent={
                              <FiArrowRight className="rotate-90" />
                            }
                          >
                            Flip V
                          </Button>
                        </div>

                        <Button
                          className="w-full"
                          size="sm"
                          color="danger"
                          variant="flat"
                          onPress={resetPage}
                          startContent={<FiTrash2 />}
                        >
                          Reset Page
                        </Button>
                      </div>
                    )}

                    <div className="mt-5 space-y-2 border-t border-gray-200 pt-5">
                      <Button
                        className="w-full"
                        size="sm"
                        variant="flat"
                        onPress={() => setMode("camera")}
                        startContent={<FiCamera />}
                      >
                        Add via Camera
                      </Button>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="bordered"
                          onPress={() => {
                            setPages([]);
                            setMode("upload");
                          }}
                        >
                          Discard
                        </Button>

                        <Button
                          size="sm"
                          color="primary"
                          onPress={buildPreview}
                          isLoading={isProcessing}
                          startContent={!isProcessing && <FiEye />}
                        >
                          Preview
                        </Button>
                      </div>

                      <Button
                        className="w-full"
                        size="sm"
                        color="success"
                        variant="flat"
                        onPress={processAndSave}
                        isLoading={isProcessing}
                        startContent={!isProcessing && <FiCheck />}
                      >
                        Save as PDF ({pages.length}{" "}
                        {pages.length === 1 ? "page" : "pages"})
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {mode === "preview" && pdfPreviewUrl && (
                <>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                      PDF Preview
                    </h3>
                    <p className="text-sm text-slate-500">
                      {pages.length} page{pages.length > 1 ? "s" : ""} • Review
                      before saving
                    </p>
                  </div>

                  <div
                    className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                    style={{ height: 520 }}
                  >
                    <iframe
                      src={pdfPreviewUrl}
                      className="h-full w-full"
                      title="PDF Preview"
                    />
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <Button
                      radius="full"
                      variant="bordered"
                      className={pillCancel}
                      onPress={() => {
                        setMode("editor");
                      }}
                    >
                      Back to Edit
                    </Button>

                    <div className="flex gap-3">
                      <Button
                        radius="full"
                        variant="flat"
                        color="danger"
                        onPress={() => {
                          setPages([]);
                          setMode("upload");
                          setPdfPreviewUrl(null);
                        }}
                      >
                        Discard All
                      </Button>

                      <Button
                        radius="full"
                        className={`${pillPrimary} px-10`}
                        onPress={processAndSave}
                        isLoading={isProcessing}
                        startContent={!isProcessing && <FiCheck />}
                      >
                        Confirm & Save PDF
                      </Button>
                    </div>
                  </div>
                </>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default UploadReportModal;
