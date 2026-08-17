import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal, ModalBody, ModalContent } from "@heroui/react";
import { FiX } from "react-icons/fi";
import Webcam from "react-webcam";
import UploadReportCameraView from "./upload-report/UploadReportCameraView";
import UploadReportEditorView from "./upload-report/UploadReportEditorView";
import UploadReportPreviewView from "./upload-report/UploadReportPreviewView";
import UploadReportUploadView from "./upload-report/UploadReportUploadView";
import {
  applyFilter,
  autoDetectDocument,
  cropImage,
  flipImage,
  ImageProcessor,
  multiImagesToPdf,
  rotateImage,
} from "./upload-report/helpers";
import { useUploadScannerBridge } from "./upload-report/useUploadScannerBridge";
import type {
  CropArea,
  FilterType,
  PageImage,
  ResizeCorner,
  UploadReportModalProps,
  UploadReportMode,
} from "./upload-report/types";

const UploadReportModal: React.FC<UploadReportModalProps> = ({
  isOpen,
  onOpenChange,
  pickedFiles,
  setPickedFiles,
  onSave,
  saveDisabled,
  isSaving,
  title = "Upload Report",
}) => {
  const [mode, setMode] = useState<UploadReportMode>("upload");
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
  const [resizingCorner, setResizingCorner] =
    useState<ResizeCorner | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const webcamRef = useRef<Webcam | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const addMoreRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<number | null>(null);
  const pagesRef = useRef<PageImage[]>([]);

  const activePage = pages[activePageIdx] ?? null;

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const updatePageCurrent = useCallback((idx: number, dataUrl: string) => {
    setPages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, current: dataUrl } : p)),
    );
  }, []);

  const addPages = useCallback((dataUrls: string[], append = false) => {
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
  }, []);

  const removePage = useCallback((idx: number) => {
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) {
        setMode("upload");
        return next;
      }
      setActivePageIdx(Math.min(idx, next.length - 1));
      return next;
    });
  }, []);

  const consumeScannedImage = useCallback(
    async (imageSrc: string) =>
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
      }),
    [],
  );

  const {
    countdown,
    otp,
    scannerError,
    resetScanner,
    resetScannerState,
  } = useUploadScannerBridge({
    isOpen,
    mode,
    pickedFileCount: pickedFiles.length,
    pageCount: pages.length,
    consumeScannedImage,
  });

  const phoneLink = useMemo(() => {
    if (!otp || typeof window === "undefined") return "";
    return `${window.location.origin}/app/switch-to-phone?otp=${encodeURIComponent(otp)}`;
  }, [otp]);

  const qrCodeUrl = useMemo(() => {
    if (!phoneLink) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(phoneLink)}`;
  }, [phoneLink]);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    addPages([imageSrc], pages.length > 0);
    setMode("editor");
  }, [addPages, pages.length]);

  const readFile = (file: File): Promise<string> =>
    new Promise((res) => {
      const r = new FileReader();
      r.onload = (e) => res(e.target?.result as string);
      r.readAsDataURL(file);
    });

  const handleFiles = useCallback(
    async (files: File[], append = false) => {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      const nonImage = files.filter((f) => !f.type.startsWith("image/"));

      if (nonImage.length > 0) {
        setPickedFiles(nonImage);
        return;
      }

      if (imageFiles.length === 0) return;

      const dataUrls = await Promise.all(imageFiles.map(readFile));
      addPages(dataUrls, append);
    },
    [addPages, setPickedFiles],
  );

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
    const selectedPage = pagesRef.current[activePageIdx] ?? null;

    if (selectedPage) {
      setCropArea({
        x: 0,
        y: 0,
        width: selectedPage.width,
        height: selectedPage.height,
      });
    }

    setBrightness(0);
    setContrast(0);
    setZoom(1);
    setActiveFilter(null);
    setShowCropOverlay(false);
  }, [activePageIdx]);

  const withProcessing = useCallback(
    async (fn: () => Promise<string>) => {
      if (!activePage) return;

      setIsProcessing(true);
      try {
        const result = await fn();
        updatePageCurrent(activePageIdx, result);
        setActiveFilter(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [activePage, activePageIdx, updatePageCurrent],
  );

  const handleRotate = useCallback(
    (dir: "left" | "right") => {
      if (!activePage) return;
      void withProcessing(() =>
        rotateImage(activePage.current, dir === "right" ? 90 : -90),
      );
    },
    [activePage, withProcessing],
  );

  const handleFlip = useCallback(
    (h: boolean, v: boolean) => {
      if (!activePage) return;
      void withProcessing(() => flipImage(activePage.current, h, v));
    },
    [activePage, withProcessing],
  );

  const handleApplyFilter = useCallback(
    async (filter: FilterType) => {
      if (!activePage) return;

      setIsProcessing(true);
      try {
        const filtered = await applyFilter(activePage.current, filter);
        updatePageCurrent(activePageIdx, filtered);
        setActiveFilter(filter);
      } finally {
        setIsProcessing(false);
      }
    },
    [activePage, activePageIdx, updatePageCurrent],
  );

  const restoreOriginal = useCallback(() => {
    if (!activePage) return;
    updatePageCurrent(activePageIdx, activePage.original);
    setActiveFilter(null);
  }, [activePage, activePageIdx, updatePageCurrent]);

  const resetPage = useCallback(() => {
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
  }, [activePage, activePageIdx, updatePageCurrent]);

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
  }, [activePage, activePageIdx, brightness, contrast, updatePageCurrent]);

  const toNaturalCoords = useCallback(
    (clientX: number, clientY: number) => {
      const el = imageRef.current;
      if (!el) return { x: 0, y: 0 };

      const rect = el.getBoundingClientRect();
      const scaleX = el.naturalWidth / rect.width;
      const scaleY = el.naturalHeight / rect.height;

      return {
        x: Math.max(
          0,
          Math.min((clientX - rect.left) * scaleX, el.naturalWidth),
        ),
        y: Math.max(
          0,
          Math.min((clientY - rect.top) * scaleY, el.naturalHeight),
        ),
      };
    },
    [],
  );

  const displayCropArea = (() => {
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
  })();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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
    },
    [activePage, cropArea, showCropOverlay, toNaturalCoords],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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
    },
    [
      activePage,
      dragStart,
      isDragging,
      movingCrop,
      resizingCorner,
      showCropOverlay,
      toNaturalCoords,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setMovingCrop(false);
    setResizingCorner(null);
  }, []);

  const handleApplyCrop = useCallback(async () => {
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
  }, [activePage, activePageIdx, cropArea, updatePageCurrent]);

  const autoScanActivePage = useCallback(async () => {
    if (!activePage) return;
    setIsProcessing(true);
    try {
      const scanned = await autoDetectDocument(activePage.current);
      updatePageCurrent(activePageIdx, scanned);
    } finally {
      setIsProcessing(false);
    }
  }, [activePage, activePageIdx, updatePageCurrent]);

  const buildPreview = useCallback(async () => {
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
  }, [pages]);

  const processAndSave = useCallback(async () => {
    if (pages.length === 0) return;

    setIsProcessing(true);
    try {
      const { file } = await multiImagesToPdf(
        pages.map((p) => p.current),
        `scan_${Date.now()}`,
      );
      setPickedFiles([file]);
      resetScannerState();
      setMode("upload");
      setPdfPreviewUrl(null);
    } finally {
      setIsProcessing(false);
    }
  }, [pages, resetScannerState, setPickedFiles]);

  const discardPages = useCallback(() => {
    setPages([]);
    setMode("upload");
    setPdfPreviewUrl(null);
  }, []);

  const handleClose = useCallback(() => {
    resetScannerState();
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
  }, [onOpenChange, resetScannerState]);

  const modalBase = "rounded-[28px]";
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
                className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-gray-100 sm:right-5 sm:top-5"
                onClick={handleClose}
                aria-label="Close"
              >
                <FiX className="text-xl" />
              </button>

              {mode === "upload" && (
                <UploadReportUploadView
                  title={title}
                  pickedFiles={pickedFiles}
                  countdown={countdown}
                  otp={otp}
                  phoneLink={phoneLink}
                  qrCodeUrl={qrCodeUrl}
                  scannerError={scannerError}
                  inputRef={inputRef}
                  onPicked={onPicked}
                  handleDrop={handleDrop}
                  resetScanner={resetScanner}
                  setCameraMode={() => setMode("camera")}
                  handleClose={handleClose}
                  onSave={onSave}
                  saveDisabled={saveDisabled}
                  isSaving={isSaving}
                />
              )}

              {mode === "camera" && (
                <UploadReportCameraView
                  webcamRef={webcamRef}
                  facingMode={facingMode}
                  setFacingMode={setFacingMode}
                  goBack={() => setMode(pages.length > 0 ? "editor" : "upload")}
                  capture={capture}
                />
              )}

              {mode === "editor" && activePage && (
                <UploadReportEditorView
                  pages={pages}
                  activePage={activePage}
                  activePageIdx={activePageIdx}
                  setActivePageIdx={setActivePageIdx}
                  addMoreRef={addMoreRef}
                  onAddMore={onAddMore}
                  imageRef={imageRef}
                  zoom={zoom}
                  setZoom={setZoom}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  brightness={brightness}
                  setBrightness={setBrightness}
                  contrast={contrast}
                  setContrast={setContrast}
                  activeFilter={activeFilter}
                  showCropOverlay={showCropOverlay}
                  setShowCropOverlay={setShowCropOverlay}
                  cropArea={cropArea}
                  setCropArea={setCropArea}
                  displayCropArea={displayCropArea}
                  isProcessing={isProcessing}
                  isDragging={isDragging}
                  movingCrop={movingCrop}
                  resizingCorner={resizingCorner}
                  setResizingCorner={setResizingCorner}
                  setMovingCrop={setMovingCrop}
                  setDragStart={setDragStart}
                  toNaturalCoords={toNaturalCoords}
                  handleMouseDown={handleMouseDown}
                  handleMouseMove={handleMouseMove}
                  handleMouseUp={handleMouseUp}
                  removePage={removePage}
                  autoScanActivePage={autoScanActivePage}
                  handleApplyCrop={handleApplyCrop}
                  handleApplyFilter={(filter) => void handleApplyFilter(filter)}
                  restoreOriginal={restoreOriginal}
                  handleRotate={handleRotate}
                  handleFlip={handleFlip}
                  resetPage={resetPage}
                  addViaCamera={() => setMode("camera")}
                  discardPages={discardPages}
                  buildPreview={() => void buildPreview()}
                  processAndSave={() => void processAndSave()}
                />
              )}

              {mode === "preview" && pdfPreviewUrl && (
                <UploadReportPreviewView
                  pdfPreviewUrl={pdfPreviewUrl}
                  pageCount={pages.length}
                  isProcessing={isProcessing}
                  backToEdit={() => setMode("editor")}
                  discardAll={discardPages}
                  processAndSave={() => void processAndSave()}
                />
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
