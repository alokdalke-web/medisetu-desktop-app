import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";

export interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File;
  onSave: (croppedFile: File, croppedUrl: string) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  file,
  onSave,
}) => {
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [cropShape, setCropShape] = useState<"circle" | "rect">("rect");

  // Asymmetrical resizable & draggable crop box coordinates
  const [cropLeft, setCropLeft] = useState<number>(50);
  const [cropTop, setCropTop] = useState<number>(80);
  const [cropWidth, setCropWidth] = useState<number>(240);
  const [cropHeight, setCropHeight] = useState<number>(180);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDragging = useRef<boolean>(false);
  const activeHandle = useRef<"tl" | "tr" | "bl" | "br" | "move" | null>(null);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const previewSize = 340;

  // Load image
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgElement(img);
      setScale(1);
      setFlipH(false);
      setFlipV(false);
      setCropShape("rect");
      setCropLeft(50);
      setCropTop(80);
      setCropWidth(240);
      setCropHeight(180);
    };
    img.src = url;
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  // Compute image bounds relative to canvas previewSize (since image is centered and fixed)
  const getImgBounds = useCallback(() => {
    if (!imgElement) return { left: 0, top: 0, right: previewSize, bottom: previewSize };
    const baseRatio = Math.min(previewSize / imgElement.width, previewSize / imgElement.height);
    const baseW = imgElement.width * baseRatio;
    const baseH = imgElement.height * baseRatio;
    const w = baseW * scale;
    const h = baseH * scale;
    return {
      left: previewSize / 2 - w / 2,
      right: previewSize / 2 + w / 2,
      top: previewSize / 2 - h / 2,
      bottom: previewSize / 2 + h / 2,
    };
  }, [imgElement, scale]);

  // Adjust crop box position and size when scale changes (prevent crop box from leaking outside image boundaries)
  useEffect(() => {
    const bounds = getImgBounds();
    const maxW = bounds.right - bounds.left;
    const maxH = bounds.bottom - bounds.top;
    const newW = clamp(cropWidth, 50, maxW);
    const newH = clamp(cropHeight, 50, maxH);
    setCropWidth(newW);
    setCropHeight(newH);

    const newL = clamp(cropLeft, bounds.left, bounds.right - newW);
    const newT = clamp(cropTop, bounds.top, bounds.bottom - newH);
    setCropLeft(newL);
    setCropTop(newT);
  }, [scale, getImgBounds]);

  // Center and square dimensions when shape becomes circle
  useEffect(() => {
    if (cropShape === "circle") {
      const size = Math.min(cropWidth, cropHeight);
      const newL = previewSize / 2 - size / 2;
      const newT = previewSize / 2 - size / 2;
      setCropLeft(newL);
      setCropTop(newT);
      setCropWidth(size);
      setCropHeight(size);
    }
  }, [cropShape]);

  // Redraw preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = previewSize * dpr;
    canvas.height = previewSize * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, previewSize, previewSize);

    // 1. Draw the image (fixed centered position, scaled and flipped)
    ctx.save();
    ctx.translate(previewSize / 2, previewSize / 2);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    const baseRatio = Math.min(previewSize / imgElement.width, previewSize / imgElement.height);
    const baseW = imgElement.width * baseRatio;
    const baseH = imgElement.height * baseRatio;
    const w = baseW * scale;
    const h = baseH * scale;

    ctx.drawImage(imgElement, -w / 2, -h / 2, w, h);
    ctx.restore();

    // 2. Draw overlay mask (light transparent area to keep image clearly visible)
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.25)"; // Dimmed overlay, keeping image highly visible
    ctx.fillRect(0, 0, previewSize, previewSize);

    // Cut out the crop box region
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    const left = cropLeft;
    const top = cropTop;

    if (cropShape === "circle") {
      ctx.arc(cropLeft + cropWidth / 2, cropTop + cropHeight / 2, cropWidth / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(left, top, cropWidth, cropHeight);
    }
    ctx.fill();
    ctx.restore();

    // 3. Draw crop box outline
    ctx.save();
    ctx.strokeStyle = "#0A6C74"; // Primary accent
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (cropShape === "circle") {
      ctx.arc(cropLeft + cropWidth / 2, cropTop + cropHeight / 2, cropWidth / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(left, top, cropWidth, cropHeight);
    }
    ctx.stroke();
    ctx.restore();

    // 4. Draw corner handles for resizing
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#0A6C74";
    ctx.lineWidth = 2;
    const handleSize = 8;

    const corners = [
      { x: left, y: top },
      { x: left + cropWidth, y: top },
      { x: left, y: top + cropHeight },
      { x: left + cropWidth, y: top + cropHeight },
    ];

    corners.forEach((corner) => {
      ctx.beginPath();
      ctx.rect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }, [imgElement, scale, flipH, flipV, cropShape, cropLeft, cropTop, cropWidth, cropHeight]);

  // Adjust cursor style dynamically on hover
  const handleCursorHover = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const left = cropLeft;
    const top = cropTop;
    const right = cropLeft + cropWidth;
    const bottom = cropTop + cropHeight;

    const handleRadius = 15;

    if (Math.hypot(x - left, y - top) < handleRadius) {
      canvas.style.cursor = "nwse-resize";
    } else if (Math.hypot(x - right, y - top) < handleRadius) {
      canvas.style.cursor = "nesw-resize";
    } else if (Math.hypot(x - left, y - bottom) < handleRadius) {
      canvas.style.cursor = "nesw-resize";
    } else if (Math.hypot(x - right, y - bottom) < handleRadius) {
      canvas.style.cursor = "nwse-resize";
    } else if (x >= left && x <= right && y >= top && y <= bottom) {
      canvas.style.cursor = "move";
    } else {
      canvas.style.cursor = "default";
    }
  };

  // Pointer event helpers to map mouse/touch coordinate to canvas space
  const handlePointerDown = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const left = cropLeft;
    const top = cropTop;
    const right = cropLeft + cropWidth;
    const bottom = top + cropHeight;

    const handleRadius = 20; // Hit target radius

    if (Math.hypot(x - left, y - top) < handleRadius) {
      activeHandle.current = "tl";
    } else if (Math.hypot(x - right, y - top) < handleRadius) {
      activeHandle.current = "tr";
    } else if (Math.hypot(x - left, y - bottom) < handleRadius) {
      activeHandle.current = "bl";
    } else if (Math.hypot(x - right, y - bottom) < handleRadius) {
      activeHandle.current = "br";
    } else if (x >= left && x <= right && y >= top && y <= bottom) {
      activeHandle.current = "move";
      dragStart.current = { x: clientX, y: clientY };
    }
    isDragging.current = true;
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging.current) {
      handleCursorHover(clientX, clientY);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const bounds = getImgBounds();
    const x = clamp(clientX - rect.left, bounds.left, bounds.right);
    const y = clamp(clientY - rect.top, bounds.top, bounds.bottom);

    const cropRight = cropLeft + cropWidth;
    const cropBottom = cropTop + cropHeight;

    if (activeHandle.current === "move") {
      const deltaX = clientX - dragStart.current.x;
      const deltaY = clientY - dragStart.current.y;
      dragStart.current = { x: clientX, y: clientY };

      const targetL = cropLeft + deltaX;
      const targetT = cropTop + deltaY;

      const boundedL = clamp(targetL, bounds.left, bounds.right - cropWidth);
      const boundedT = clamp(targetT, bounds.top, bounds.bottom - cropHeight);

      setCropLeft(boundedL);
      setCropTop(boundedT);
    } else {
      // Symmetrical or Asymmetrical resizing depending on the handle
      let newL = cropLeft;
      let newT = cropTop;
      let newW = cropWidth;
      let newH = cropHeight;

      if (activeHandle.current === "tl") {
        newL = clamp(x, bounds.left, cropRight - 50);
        newT = clamp(y, bounds.top, cropBottom - 50);
        newW = cropRight - newL;
        newH = cropBottom - newT;

        if (cropShape === "circle") {
          const size = Math.min(newW, newH);
          newL = cropRight - size;
          newT = cropBottom - size;
          newW = size;
          newH = size;
        }
      } else if (activeHandle.current === "tr") {
        newT = clamp(y, bounds.top, cropBottom - 50);
        const newR = clamp(x, cropLeft + 50, bounds.right);
        newW = newR - cropLeft;
        newH = cropBottom - newT;

        if (cropShape === "circle") {
          const size = Math.min(newW, newH);
          newT = cropBottom - size;
          newW = size;
          newH = size;
        }
      } else if (activeHandle.current === "bl") {
        newL = clamp(x, bounds.left, cropRight - 50);
        const newB = clamp(y, cropTop + 50, bounds.bottom);
        newW = cropRight - newL;
        newH = newB - cropTop;

        if (cropShape === "circle") {
          const size = Math.min(newW, newH);
          newL = cropRight - size;
          newW = size;
          newH = size;
        }
      } else if (activeHandle.current === "br") {
        const newR = clamp(x, cropLeft + 50, bounds.right);
        const newB = clamp(y, cropTop + 50, bounds.bottom);
        newW = newR - cropLeft;
        newH = newB - cropTop;

        if (cropShape === "circle") {
          const size = Math.min(newW, newH);
          newW = size;
          newH = size;
        }
      }

      setCropLeft(newL);
      setCropTop(newT);
      setCropWidth(newW);
      setCropHeight(newH);
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    handlePointerDown(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    activeHandle.current = null;
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handlePointerDown(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handlePointerMove(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    activeHandle.current = null;
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = 0.05;
    let newScale = scale + (e.deltaY < 0 ? factor : -factor);
    newScale = Math.min(3, Math.max(1, newScale));
    setScale(newScale);
  };

  // Save handler
  const handleSave = () => {
    if (!imgElement) return;

    const maxDim = 512;
    let outWidth = maxDim;
    let outHeight = maxDim;

    // Maintain aspect ratio of crop box for rectangle crops
    if (cropShape === "rect") {
      if (cropWidth > cropHeight) {
        outHeight = Math.round((cropHeight / cropWidth) * maxDim);
      } else {
        outWidth = Math.round((cropWidth / cropHeight) * maxDim);
      }
    }

    const outCanvas = document.createElement("canvas");
    outCanvas.width = outWidth;
    outCanvas.height = outHeight;
    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) return;

    const ratioX = outWidth / cropWidth;
    const ratioY = outHeight / cropHeight;

    const baseRatio = Math.min(previewSize / imgElement.width, previewSize / imgElement.height);
    const baseW = imgElement.width * baseRatio;
    const baseH = imgElement.height * baseRatio;

    // Fill entire output canvas with white to prevent black background
    outCtx.fillStyle = "#FFFFFF";
    outCtx.fillRect(0, 0, outWidth, outHeight);

    // Calculate relative distance between centered image and crop box
    const distX = (previewSize / 2) - (cropLeft + cropWidth / 2);
    const distY = (previewSize / 2) - (cropTop + cropHeight / 2);

    outCtx.save();
    outCtx.translate(outWidth / 2 + distX * ratioX, outHeight / 2 + distY * ratioY);
    outCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    const w = baseW * scale * ratioX;
    const h = baseH * scale * ratioY;

    outCtx.drawImage(imgElement, -w / 2, -h / 2, w, h);
    outCtx.restore();

    // If circular, mask the corners outside the circle with white
    if (cropShape === "circle") {
      outCtx.save();
      outCtx.beginPath();
      outCtx.rect(0, 0, outWidth, outHeight);
      outCtx.arc(outWidth / 2, outHeight / 2, outWidth / 2, 0, Math.PI * 2);
      outCtx.fillStyle = "#FFFFFF";
      outCtx.fill("evenodd");
      outCtx.restore();
    }

    outCanvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], file.name || "clinic-logo.png", {
          type: "image/png",
          lastModified: Date.now(),
        });
        const croppedUrl = URL.createObjectURL(croppedFile);
        onSave(croppedFile, croppedUrl);
      }
    }, "image/png");
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      className="font-outfit"
    >
      <ModalContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
        {(onCloseModal) => (
          <>
            <ModalHeader className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800 text-[#100E1C] dark:text-white font-semibold text-lg">
              Adjust & Crop Logo
            </ModalHeader>
            <ModalBody className="flex flex-col items-center gap-6 py-6">
              {/* Canvas Container with Checkerboard Background */}
              <div
                className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center select-none"
                style={{
                  width: previewSize,
                  height: previewSize,
                  backgroundColor: "#f1f5f9",
                  backgroundImage: `
                    linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
                    linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
                    linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)
                  `,
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
              >
                <canvas
                  ref={canvasRef}
                  style={{ width: previewSize, height: previewSize, display: "block" }}
                />
              </div>

              {/* Slider + Controls Panel */}
              <div className="w-full space-y-4 px-1">
                {/* Zoom Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>Zoom Level</span>
                    <span>{Math.round(scale * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setScale((s) => Math.max(1, s - 0.1))}
                      className="text-slate-500 hover:text-[#0A6C74] p-1 transition-colors"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.01"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#0A6C74]"
                    />
                    <button
                      type="button"
                      onClick={() => setScale((s) => Math.min(3, s + 0.1))}
                      className="text-slate-500 hover:text-[#0A6C74] p-1 transition-colors"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Operations Stack */}
                <div className="space-y-3.5 pt-1">
                  {/* Shape Selection */}
                  <div className="space-y-1.5">
                    <span className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Crop Style</span>
                    <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/60 p-1 border border-slate-200/50 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCropShape("rect")}
                        className={`flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                          cropShape === "rect"
                            ? "bg-white dark:bg-slate-700 text-[#0A6C74] dark:text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-[#0A6C74]"
                        }`}
                      >
                        Free Crop
                      </button>
                      <button
                        type="button"
                        onClick={() => setCropShape("circle")}
                        className={`flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                          cropShape === "circle"
                            ? "bg-white dark:bg-slate-700 text-[#0A6C74] dark:text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-[#0A6C74]"
                        }`}
                      >
                        Circular
                      </button>
                    </div>
                  </div>

                  {/* Mirror / Flip */}
                  <div className="space-y-1.5">
                    <span className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Mirror Image</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFlipH((prev) => !prev)}
                        className={`flex-1 py-2 rounded-xl text-[13px] font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          flipH
                            ? "border-[#0A6C74] bg-teal-50/50 dark:bg-teal-950/20 text-[#0A6C74] dark:text-teal-400"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 2v20M4 12h16M4 4l8 8-8 8" />
                        </svg>
                        Flip H
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlipV((prev) => !prev)}
                        className={`flex-1 py-2 rounded-xl text-[13px] font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          flipV
                            ? "border-[#0A6C74] bg-teal-50/50 dark:bg-teal-950/20 text-[#0A6C74] dark:text-teal-400"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 12h20M12 4v16M4 4l8 8 8-8" />
                        </svg>
                        Flip V
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter className="border-t border-slate-100 dark:border-slate-800 gap-2">
              <Button
                variant="flat"
                className="rounded-xl font-semibold text-slate-600 dark:text-slate-300"
                onPress={onCloseModal}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                className="rounded-xl font-semibold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20"
                onPress={handleSave}
              >
                Save Logo
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
